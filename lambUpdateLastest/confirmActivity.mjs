import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "ActivityParticipations";

export const handler = async (event) => {
    // 1. Headers สำหรับ CORS (สำคัญมาก!)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
    };

    // 2. Handle Preflight (OPTIONS)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // 3. รับค่าจาก Frontend
        const body = JSON.parse(event.body || '{}');
        const { studentId, activityId, latitude, longitude, currentTime } = body;

        if (!studentId || !activityId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: "Missing required fields" })
            };
        }

        console.log(`Confirming: Student ${studentId} -> Activity ${activityId}`);

        // 4. อัปเดตสถานะใน DynamoDB (Update Item)
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                studentId: studentId,
                activityId: activityId
            },
            // อัปเดตค่า: isConfirmed = true, เวลาที่ยืนยัน, และพิกัด
            UpdateExpression: "set isConfirmed = :confirmed, confirmedAt = :time, latitude = :lat, longitude = :lon, updatedAt = :time",
            ExpressionAttributeValues: {
                ":confirmed": true,
                ":time": currentTime || new Date().toISOString(),
                ":lat": latitude,
                ":lon": longitude
            },
            ReturnValues: "UPDATED_NEW"
        });

        await docClient.send(command);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: "ยืนยันการเข้าร่วมสำเร็จ" })
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
                error: error.message 
            })
        };
    }
};