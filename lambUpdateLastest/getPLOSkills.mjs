// api -> /plo-skills/{studentId}
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  // รับ studentId จาก Path Parameters หรือ Query String
  const studentId = event.pathParameters?.studentId || event.queryStringParameters?.studentId;

  if (!studentId) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing studentId" }) };
  }

  try {
    // 1. ดึงข้อมูล PLO ทั้งหมด (จากตาราง PLOs ที่คุณเพิ่งสร้าง)
    // ⚠️ หมายเหตุ: ในโค้ดนี้ผมใช้ชื่อ field ตามภาพที่คุณส่งมาคือ "plo", "ploFullName"
    const plosData = await docClient.send(new ScanCommand({ TableName: "PLOs" }));
    
    // 2. ดึงข้อมูล Skills ทั้งหมด (ตาราง Skills ที่คุณแก้แล้ว)
    const skillsData = await docClient.send(new ScanCommand({ TableName: "Skills" }));

    // 3. ดึงข้อมูลทักษะที่นักศึกษาทำผ่านแล้ว (CompletedSkills)
    const completedData = await docClient.send(new QueryCommand({
      TableName: "CompletedSkills",
      KeyConditionExpression: "studentId = :sid",
      ExpressionAttributeValues: { ":sid": studentId }
    }));

    // --- เริ่มกระบวนการ "จับคู่" ข้อมูล (Data Transformation) ---

    // สร้าง Set ของ skillId ที่นักศึกษาผ่านแล้ว เพื่อให้เช็คง่ายๆ
    const completedSkillIds = new Set(completedData.Items.map(item => item.skillId));

    // แปลงข้อมูล PLO ให้อยู่ในรูปแบบที่เราใช้ง่ายๆ
    // เรียงตามชื่อ PLO (PLO1, PLO2...)
    const sortedPLOs = plosData.Items.sort((a, b) => a.plo.localeCompare(b.plo));

    const result = sortedPLOs.map(ploItem => {
      const currentPloId = ploItem.plo; // เช่น "PLO1"

      // กรองเอาเฉพาะ Skill ที่อยู่ใน PLO นี้
      const skillsInThisPLO = skillsData.Items.filter(s => s.PLO === currentPloId);

      // จัดกลุ่ม Skill ตาม skillGroupId (เช่น รวม Java ง่าย/กลาง/ยาก ไว้ก้อนเดียวกัน)
      const groupsMap = {};

      skillsInThisPLO.forEach(skill => {
        const groupId = skill.skillGroupId;
        
        if (!groupsMap[groupId]) {
          groupsMap[groupId] = {
            skillGroupId: groupId,
            skillGroupName: skill.skillGroupName, // ชื่อกลุ่ม เช่น "Java Programming"
            totalLevels: 0,
            passedLevels: 0,
            levels: [] // เก็บรายละเอียดแต่ละระดับ (Easy/Medium/Hard)
          };
        }

        // เช็คว่าระดับนี้ผ่านหรือยัง?
        const isPassed = completedSkillIds.has(skill.skillId);
        
        // เพิ่มข้อมูลระดับย่อย
        groupsMap[groupId].levels.push({
          skillId: skill.skillId,
          skillLevel: skill.skillLevel, // Easy, Medium, Hard
          name: skill.name,
          isPassed: isPassed
        });

        groupsMap[groupId].totalLevels++;
        if (isPassed) groupsMap[groupId].passedLevels++;
      });

      // แปลง Map กลับเป็น Array เพื่อส่งให้ Frontend
      const skillGroups = Object.values(groupsMap);

      // แยกกลุ่มว่า "ได้รับแล้ว" (Passed) หรือ "ยังไม่ได้รับ" (Pending)
      // เงื่อนไข: ต้องผ่านครบทุกระดับในกลุ่มนั้น ถึงจะนับว่า "ได้รับทักษะกลุ่มนั้นแล้ว"
      const receivedGroups = skillGroups.filter(g => g.passedLevels === g.totalLevels);
      const pendingGroups = skillGroups.filter(g => g.passedLevels < g.totalLevels);

      return {
        ploId: currentPloId,
        ploName: ploItem.ploFullName,
        category: ploItem.skillCategory,
        received: receivedGroups,
        pending: pendingGroups
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        data: result
      })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message })
    };
  }
};