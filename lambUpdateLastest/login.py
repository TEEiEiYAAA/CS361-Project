import json
import boto3
from botocore.exceptions import ClientError

# สร้าง DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    # ตรวจสอบว่ามี body หรือไม่
    if not event.get('body'):
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'message': 'Missing request body'})
        }
    
    # แปลง body จาก JSON string เป็น object
    try:
        request_body = json.loads(event.get('body'))
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'message': 'Invalid JSON in request body'})
        }
    
    # ดึงข้อมูล userId และ password จากฟอร์ม
    user_id = request_body.get('userId')  # เปลี่ยนจาก studentId เป็น userId
    password = request_body.get('password')
    
    if not user_id or not password:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'message': 'userId and password are required'})  # เปลี่ยนข้อความแจ้งเตือน
        }
    
    try:
        # ค้นหาข้อมูลผู้ใช้จาก DynamoDB โดยใช้ userId
        users_table = dynamodb.Table('Users')
        response = users_table.get_item(
            Key={'userId': user_id}
        )
        
        # ตรวจสอบว่ามีผู้ใช้นี้หรือไม่ และรหัสผ่านถูกต้องหรือไม่
        if 'Item' in response and response['Item'].get('password') == password:
            # สร้าง token อย่างง่าย (ในงานจริงควรใช้ JWT)
            import base64
            import time
            token = base64.b64encode(f"{user_id}:{int(time.time())}".encode()).decode()
            
            user_data = {
                'userId': response['Item'].get('userId'),
                'name': response['Item'].get('name'),
                'role': response['Item'].get('role')
            }
            
            # เพิ่ม studentId ถ้ามีในฐานข้อมูล (สำหรับการเรียกใช้ API อื่นๆ ที่ยังใช้ studentId)
            if 'studentId' in response['Item']:
                user_data['studentId'] = response['Item'].get('studentId')
            else:
                # ถ้าไม่มี field studentId ในฐานข้อมูล ให้ใช้ userId แทน (ในกรณีที่ผู้ใช้เป็นนักศึกษา)
                if response['Item'].get('role') == 'student':
                    user_data['studentId'] = user_id
            
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'token': token,
                    'user': user_data
                })
            }
        else:
            return {
                'statusCode': 401,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'message': 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'})
            }
            
    except ClientError as e:
        print('Error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'message': 'เกิดข้อผิดพลาดในระบบ'})
        }
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'message': 'เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ'})
        }