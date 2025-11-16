import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto"; // ใช้สร้าง ID ไม่ซ้ำ

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "ActivityParticipations";

export const handler = async (event) => {
  // ตั้งค่า Headers สำหรับ CORS (เพื่อให้หน้าเว็บเรียกใช้งานได้)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };

  // กรณีเป็น Preflight request (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { studentId, activityId } = body;

    // 1. ตรวจสอบข้อมูลที่ส่งมา
    if (!studentId || !activityId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: "Missing studentId or activityId" })
      };
    }

    // 2. (Optional) เช็คก่อนว่าเคยสมัครไปแล้วหรือยัง?
    // ป้องกันการกดซ้ำแล้วข้อมูลทับกัน
    const checkDuplicate = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      // ✅ แก้ไข: รวมเงื่อนไข activityId เข้ามาในนี้เลย
      KeyConditionExpression: "studentId = :sid AND activityId = :aid",
      // ลบ FilterExpression ทิ้งไปเลย
      ExpressionAttributeValues: {
        ":sid": studentId,
        ":aid": activityId
      }
    }));

    if (checkDuplicate.Items && checkDuplicate.Items.length > 0) {
      return {
        statusCode: 400, // หรือ 200 แล้วบอกว่าสมัครไปแล้วก็ได้
        headers,
        body: JSON.stringify({ success: false, message: "คุณได้สมัครกิจกรรมนี้ไปแล้ว" })
      };
    }

    // 3. เตรียมข้อมูลที่จะบันทึก (สร้างตาม Schema ที่คุณให้มา)
    const timestamp = new Date().toISOString();
    const participationId = "part" + randomUUID().split('-')[0]; // สร้าง ID สั้นๆ เช่น part41011ddf

    const newItem = {
      studentId: studentId,                // Partition Key
      activityId: activityId,              // Sort Key (แนะนำให้ตั้งเป็น Sort Key ถ้าตารางออกแบบไว้)
      participationId: participationId,
      
      // สถานะเริ่มต้นของการสมัคร
      isConfirmed: false,                  // เพิ่งสมัคร ยังไม่ได้เข้าร่วมจริง
      confirmedAt: null,                   // ยังไม่มีเวลาเข้าร่วม
      
      surveyCompleted: false,              // ยังไม่ได้ทำแบบประเมิน
      surveyCompletedAt: null,
      
      registeredAt: timestamp,             // เวลาที่กดปุ่มสมัคร
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // 4. บันทึกลง DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newItem
    }));

    // 5. ส่งค่าตอบกลับสำเร็จ
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Registration successful",
        data: newItem
      })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Internal Server Error",
        error: error.message
      })
    };
  }
};