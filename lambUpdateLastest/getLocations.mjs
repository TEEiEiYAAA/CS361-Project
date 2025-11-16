import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Locations"; // ตรวจสอบชื่อตารางให้ตรงกับของคุณ

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  try {
    // ดึงข้อมูลสถานที่ทั้งหมด
    const command = new ScanCommand({ TableName: TABLE_NAME });
    const response = await docClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.Items) // ส่ง Array ของสถานที่กลับไป
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message })
    };
  }
};