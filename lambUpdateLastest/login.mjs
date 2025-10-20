// AchieveHub Lambda Function with TU API Authentication
// Runtime: Node.js 22.x or later
// File: index.mjs

import https from 'https';

// TU API Configuration
const TU_API_URL = 'restapi.tu.ac.th';
const TU_API_PATH = '/api/v1/auth/Ad/verify';
const TU_API_TOKEN = 'TUbf394748e92b3983cf17dd0af6bc927a425587398f97145a7da80f4aa2d4ce46df8fbd3baa2fca6989c2096028268233';

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

        // Call TU API
        const tuResponse = await callTuApi(userId, password);

        console.log('TU API Response:', JSON.stringify(tuResponse));

        // Check if authentication was successful
        if (tuResponse.status === true) {
            // Determine role based on user type
            let role;
            if (tuResponse.type === 'student') {
                role = 'student';
            } else if (tuResponse.type === 'employee') {
                // You can customize this logic
                // For example, check if user is in specific department to make them advisor
                role = 'advisor';
            } else {
                role = 'student'; // default
            }

            // Generate a simple token (in production, use JWT)
            const token = generateToken(tuResponse);

            // Prepare user data
            const userData = {
                userId: tuResponse.username,
                name: tuResponse.displayname_th || tuResponse.displayname_en || tuResponse.username,
                email: tuResponse.email,
                role: role,
                type: tuResponse.type,
                faculty: tuResponse.faculty || tuResponse.organization,
                department: tuResponse.department,
                status: tuResponse.tu_status || tuResponse.StatusEmp,
                // Include all TU data for reference
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

            res.on('data', (chunk) => {
                data += chunk;
            });

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
    // Simple token generation (in production, use proper JWT)
    const tokenData = {
        username: userData.username,
        type: userData.type,
        timestamp: Date.now()
    };
    
    // Encode to base64
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}