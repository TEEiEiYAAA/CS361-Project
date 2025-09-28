import json
import boto3
import uuid
from datetime import datetime
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Parse request body
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Missing request body'})
            }
        
        request_body = json.loads(event.get('body'))
        
        # ดึงข้อมูลจาก request
        activity_id = request_body.get('activityId')
        student_id = request_body.get('studentId')
        
        if not activity_id or not student_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'activityId และ studentId จำเป็นต้องระบุ'})
            }
        
        # เชื่อมต่อ DynamoDB tables
        activities_table = dynamodb.Table('Activities')
        participations_table = dynamodb.Table('ActivityParticipations')
        students_table = dynamodb.Table('Students')
        
        # ตรวจสอบว่ามีกิจกรรมนี้อยู่จริง
        activity_response = activities_table.get_item(Key={'activityId': activity_id})
        if 'Item' not in activity_response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'ไม่พบกิจกรรมที่ระบุ'})
            }
        
        activity = activity_response['Item']
        
        # ตรวจสอบว่ามีนักศึกษานี้อยู่จริง
        student_response = students_table.get_item(Key={'studentId': student_id})
        if 'Item' not in student_response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'ไม่พบข้อมูลนักศึกษา'})
            }
        
        # ตรวจสอบว่าได้ลงทะเบียนกิจกรรมนี้แล้วหรือไม่
        existing_participation = participations_table.scan(
            FilterExpression='activityId = :activityId AND studentId = :studentId',
            ExpressionAttributeValues={
                ':activityId': activity_id,
                ':studentId': student_id
            }
        )
        
        if existing_participation.get('Items'):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'คุณได้ลงทะเบียนกิจกรรมนี้แล้ว'})
            }
        
        # ตรวจสอบว่ากิจกรรมยังไม่ผ่านมา
        if not is_future_activity(activity.get('startDateTime')):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'ไม่สามารถลงทะเบียนกิจกรรมที่ผ่านมาแล้วได้'})
            }
        
        # สร้าง participation record ใหม่
        participation_id = f"part{str(uuid.uuid4()).replace('-', '')[:8]}"
        current_time = datetime.now().isoformat() + 'Z'
        
        participation_item = {
            'participationId': participation_id,
            'activityId': activity_id,
            'studentId': student_id,
            'registeredAt': current_time,
            'isConfirmed': False,  # ยังไม่ได้ยืนยันการเข้าร่วม
            'surveyCompleted': False,  # ยังไม่ได้ทำแบบประเมิน
            'createdAt': current_time,
            'updatedAt': current_time
        }
        
        # บันทึกลง DynamoDB
        participations_table.put_item(Item=participation_item)
        
        print(f'Successfully registered student {student_id} for activity {activity_id}')
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': 'ลงทะเบียนเข้าร่วมกิจกรรมสำเร็จ',
                'participationId': participation_id,
                'activityName': activity.get('name', ''),
                'note': 'กรุณาเข้าร่วมกิจกรรมและสแกน QR Code เพื่อยืนยันการเข้าร่วม'
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'รูปแบบ JSON ไม่ถูกต้อง'})
        }
    except ClientError as e:
        print('DynamoDB Error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'เกิดข้อผิดพลาดในฐานข้อมูล', 'details': str(e)})
        }
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'เกิดข้อผิดพลาดที่ไม่คาดคิด', 'details': str(e)})
        }

def is_future_activity(start_date_time):
    """ตรวจสอบว่ากิจกรรมยังไม่ผ่านมาหรือไม่"""
    if not start_date_time:
        return True
    
    try:
        # แปลง string เป็น datetime object
        activity_date = datetime.fromisoformat(start_date_time.replace('Z', '+00:00'))
        current_date = datetime.now(activity_date.tzinfo)
        
        # ถ้ากิจกรรมยังไม่ผ่านมา
        return activity_date > current_date
    except:
        # ถ้าไม่สามารถแปลงวันที่ได้ ให้อนุญาต
        return True