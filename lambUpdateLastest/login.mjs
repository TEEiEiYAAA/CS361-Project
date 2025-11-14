// AchieveHub Lambda Function with TU API Authentication AND DynamoDB Local Fallback
// Runtime: Node.js 22.x or later
// File: index.mjs

import https from 'https';

// ⭐️ 1. IMPORT AWS SDK V3
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// TU API Configuration
const TU_API_URL = 'restapi.tu.ac.th';
const TU_API_PATH = '/api/v1/auth/Ad/verify';
const TU_API_TOKEN = 'TUbf394748e92b3983cf17dd0af6bc927a425587398f97145a7da80f4aa2d4ce46df8fbd3baa2fca6989c2096028268233';

// ⭐️ 2. INITIALIZE DYNAMODB CLIENT
const dbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dbClient);
const USERS_TABLE_NAME = 'Users'; // ตรวจสอบว่าชื่อตารางถูกต้อง (จากรูปคือ 'Users')

export const handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }

    try {
        // Parse request body
        let body;
        if (typeof event.body === 'string') {
            body = JSON.parse(event.body);
        } else {
            body = event.body;
        }

        const { userId, password } = body;

        // Validate input
        if (!userId || !password) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({
                    success: false,
                    message: 'กรุณากรอก Username และ Password'
                })
            };
        }

        console.log('Attempting to authenticate user:', userId);

        // ⭐️ 3. NEW LOGIC: CHECK FOR LOCAL ADVISOR FIRST
        // (คุณสามารถเพิ่มรายชื่อ advisor อื่นๆ ได้ใน array นี้)
        const localUserIds = ['advisor001']; 

        if (localUserIds.includes(userId)) {
            console.log('Local user login detected for:', userId);
            
            // --- Logic A: DynamoDB Authentication ---
            const getParams = {
                TableName: USERS_TABLE_NAME,
                Key: { userId: userId }
            };

            const { Item } = await ddbDocClient.send(new GetCommand(getParams));

            if (Item && Item.password === password) {
                // รหัสผ่านถูกต้อง!
                console.log('DynamoDB login successful for:', userId);
                
                // สร้าง UserData (จากข้อมูลใน DynamoDB)
                const userData = {
                    userId: Item.userId,
                    name: Item.name,
                    role: Item.role,
                };
                
                // สร้าง Token (ใช้ฟังก์ชันเดิม)
                const token = generateToken(userData); 

                return {
                    statusCode: 200,
                    headers: headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'เข้าสู่ระบบสำเร็จ (Advisor)',
                        token: token,
                        user: userData
                    })
                };
                
            } else {
                // ไม่พบ User หรือ รหัสผ่านผิด
                console.warn('DynamoDB login failed for:', userId);
                return {
                    statusCode: 401,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
                    })
                };
            }
            
        } else {
            // --- Logic B: Existing TU API Authentication (โค้ดเดิมทั้งหมด) ---
            console.log('Standard TU API login for:', userId);
            
            const tuResponse = await callTuApi(userId, password);
            console.log('TU API Response:', JSON.stringify(tuResponse));

            if (tuResponse.status === true) {
                let role;
                if (tuResponse.type === 'student') {
                    role = 'student';
                } else if (tuResponse.type === 'employee') {
                    role = 'advisor'; // Advisor ที่มาจาก TU API
                } else {
                    role = 'student';
                }

                const token = generateToken(tuResponse);

                const userData = {
                    userId: tuResponse.username,
                    name: tuResponse.displayname_th || tuResponse.displayname_en || tuResponse.username,
                    email: tuResponse.email,
                    role: role,
                    type: tuResponse.type,
                    faculty: tuResponse.faculty || tuResponse.organization,
                    department: tuResponse.department,
                    status: tuResponse.tu_status || tuResponse.StatusEmp,
                    tuData: tuResponse
                };

                return {
                    statusCode: 200,
                    headers: headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'เข้าสู่ระบบสำเร็จ',
                        token: token,
                        user: userData
                    })
                };
            } else {
                return {
                    statusCode: 401,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        message: tuResponse.message || 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
                    })
                };
            }
        }
        // ⭐️ END OF NEW LOGIC

    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
                error: error.message
            })
        };
    }
};

// (ฟังก์ชัน callTuApi และ generateToken ไม่ต้องแก้ไข)
// ... (คัดลอก 2 ฟังก์ชันนี้จากไฟล์เดิมมาได้เลย) ...

function callTuApi(username, password) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            UserName: username,
            PassWord: password
        });

        const options = {
            hostname: TU_API_URL,
            port: 443,
            path: TU_API_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Application-Key': TU_API_TOKEN,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log('Calling TU API:', TU_API_URL + TU_API_PATH);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    console.log('TU API Raw Response:', data);
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    console.error('Failed to parse TU API response:', data);
                    reject(new Error('Invalid JSON response from TU API'));
                }
            });
        });
        req.on('error', (error) => {
            console.error('HTTPS Request Error:', error);
            reject(error);
        });
        req.write(postData);
        req.end();
    });
}

function generateToken(userData) {
    const tokenData = {
        username: userData.username || userData.userId, // ⭐️ แก้ไขเล็กน้อยให้รองรับทั้ง 2 แบบ
        type: userData.type,
        role: userData.role,
        timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}