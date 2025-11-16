import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Skills"; 

export const handler = async (event) => {
  const additionalSkills = [
    // ============================================================
    // 🟡 PLO3: ความรับผิดชอบและจริยธรรม (Soft Skill - Mindset)
    // ============================================================

    // 1. Problem Solving (เชิง Soft Skill - Critical Thinking)
    { "skillId": "sk-probsol-easy", "skillGroupId": "grp-probsol", "skillGroupName": "Problem Solving", "skillLevel": "Easy", "name": "Problem Solving (ง่าย)", "description": "ระบุปัญหาได้ถูกต้อง และเสนอแนวทางแก้ไขเบื้องต้นได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Critical Thinking", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-probsol-med", "skillGroupId": "grp-probsol", "skillGroupName": "Problem Solving", "skillLevel": "Medium", "name": "Problem Solving (กลาง)", "description": "วิเคราะห์หาสาเหตุที่แท้จริง (Root Cause) และเปรียบเทียบทางเลือกได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Critical Thinking", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-probsol-hard", "skillGroupId": "grp-probsol", "skillGroupName": "Problem Solving", "skillLevel": "Hard", "name": "Problem Solving (ยาก)", "description": "แก้ปัญหาเชิงกลยุทธ์ที่ซับซ้อน และสร้างนวัตกรรมในการแก้ปัญหา", "PLO": "PLO3", "category": "soft skill", "subcategory": "Critical Thinking", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    // 2. Detail-Oriented (ความละเอียดรอบคอบ)
    { "skillId": "sk-detail-easy", "skillGroupId": "grp-detail", "skillGroupName": "Detail Oriented", "skillLevel": "Easy", "name": "Detail (ระดับง่าย)", "description": "ทำงานได้ถูกต้องตามคำสั่ง ตรวจทานงานของตนเองได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Professionalism", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-detail-med", "skillGroupId": "grp-detail", "skillGroupName": "Detail Oriented", "skillLevel": "Medium", "name": "Detail (ระดับกลาง)", "description": "ตรวจสอบคุณภาพงาน (QA) และหาข้อผิดพลาดเล็กๆ น้อยๆ ได้แม่นยำ", "PLO": "PLO3", "category": "soft skill", "subcategory": "Professionalism", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-detail-hard", "skillGroupId": "grp-detail", "skillGroupName": "Detail Oriented", "skillLevel": "Hard", "name": "Detail (ระดับยาก)", "description": "วางแผนป้องกันข้อผิดพลาด (Zero-defect mindset) และปรับปรุงกระบวนการ", "PLO": "PLO3", "category": "soft skill", "subcategory": "Professionalism", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    // 3. Growth Mindset (การพัฒนาตนเอง)
    { "skillId": "sk-growth-easy", "skillGroupId": "grp-growth", "skillGroupName": "Growth Mindset", "skillLevel": "Easy", "name": "Growth (ระดับง่าย)", "description": "เปิดใจรับฟังคำติชม (Feedback) และพร้อมเรียนรู้สิ่งใหม่", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-growth-med", "skillGroupId": "grp-growth", "skillGroupName": "Growth Mindset", "skillLevel": "Medium", "name": "Growth (ระดับกลาง)", "description": "พยายามพัฒนาทักษะใหม่ๆ (Reskill/Upskill) ด้วยตนเองอย่างสม่ำเสมอ", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-growth-hard", "skillGroupId": "grp-growth", "skillGroupName": "Growth Mindset", "skillLevel": "Hard", "name": "Growth (ระดับยาก)", "description": "มองความล้มเหลวเป็นบทเรียน มีความยืดหยุ่น (Resilience) และส่งต่อพลังบวก", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    // ============================================================
    // 🔴 PLO4: การทำงานร่วมกับผู้อื่นและภาวะผู้นำ (Soft Skill - Team)
    // ============================================================

    // 4. Leadership (ภาวะผู้นำ)
    { "skillId": "sk-leader-easy", "skillGroupId": "grp-leader", "skillGroupName": "Leadership", "skillLevel": "Easy", "name": "Leadership (ระดับง่าย)", "description": "กล้าแสดงความคิดเห็น และนำกิจกรรมกลุ่มย่อยได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Leadership", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-leader-med", "skillGroupId": "grp-leader", "skillGroupName": "Leadership", "skillLevel": "Medium", "name": "Leadership (ระดับกลาง)", "description": "สามารถจูงใจเพื่อนร่วมทีม และช่วยไกล่เกลี่ยความขัดแย้ง", "PLO": "PLO4", "category": "soft skill", "subcategory": "Leadership", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-leader-hard", "skillGroupId": "grp-leader", "skillGroupName": "Leadership", "skillLevel": "Hard", "name": "Leadership (ระดับยาก)", "description": "วางวิสัยทัศน์ ตัดสินใจเชิงกลยุทธ์ และเป็น Mentor ให้ผู้อื่นได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Leadership", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    // 5. Team Collaboration (การทำงานร่วมกัน - ทั่วไป)
    { "skillId": "sk-collab-easy", "skillGroupId": "grp-collab", "skillGroupName": "Team Collaboration", "skillLevel": "Easy", "name": "Collaboration (ง่าย)", "description": "ให้ความร่วมมือ สนับสนุน และเคารพความเห็นสมาชิกในทีม", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-collab-med", "skillGroupId": "grp-collab", "skillGroupName": "Team Collaboration", "skillLevel": "Medium", "name": "Collaboration (กลาง)", "description": "สื่อสารแลกเปลี่ยนข้อมูลในทีมได้อย่างลื่นไหล และช่วยแก้ปัญหาทีม", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-collab-hard", "skillGroupId": "grp-collab", "skillGroupName": "Team Collaboration", "skillLevel": "Hard", "name": "Collaboration (ยาก)", "description": "ทำงานร่วมกับฝ่ายอื่นๆ (Cross-functional) และสร้างวัฒนธรรมทีมที่ดี", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 3, "isRequired": true, "passingScore": 80 }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const item of additionalSkills) {
    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));
      successCount++;
      console.log(`✅ Inserted: ${item.skillId}`);
    } catch (err) {
      failCount++;
      console.error(`❌ Failed: ${item.skillId}`, err);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: "Additional Skills Import Complete!", 
      success: successCount, 
      failed: failCount 
    })
  };
};
