import json
import boto3
import decimal
from datetime import datetime, timedelta, timezone
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Helper class to convert a DynamoDB item to JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    """
    POST /activities/verify-qr
    ยืนยันการเข้าร่วมกิจกรรมด้วย QR Code
    """
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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
                'body': json.dumps({
                    'success': False,
                    'message': 'ข้อมูลไม่ครบถ้วน'
                })
            }
        
        request_body = json.loads(event.get('body'))
        qr_code = request_body.get('qrCode')
        student_id = request_body.get('studentId')
        
        if not qr_code or not student_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'ต้องระบุ QR Code และรหัสนักศึกษา'
                })
            }
        
        print(f"Verifying QR Code: {qr_code} for student: {student_id}")
        
        # Connect to DynamoDB tables
        activities_table = dynamodb.Table('Activities')
        participations_table = dynamodb.Table('ActivityParticipations')
        
        # Step 1: Find activity by QR code
        print("Step 1: Finding activity by QR code...")
        activities_response = activities_table.scan(
            FilterExpression='qrCode = :qrCode',
            ExpressionAttributeValues={
                ':qrCode': qr_code
            }
        )
        
        activities = activities_response.get('Items', [])
        
        if not activities:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'ไม่พบกิจกรรมที่ตรงกับ QR Code นี้'
                })
            }
        
        activity = activities[0]  # เอากิจกรรมแรกที่เจอ
        activity_id = activity['activityId']
        
        print(f"Found activity: {activity.get('name')} (ID: {activity_id})")
        
        # Step 2: Check if student is registered for this activity
        print("Step 2: Checking student registration...")
        participations_response = participations_table.scan(
            FilterExpression='studentId = :studentId AND activityId = :activityId',
            ExpressionAttributeValues={
                ':studentId': student_id,
                ':activityId': activity_id
            }
        )
        
        participations = participations_response.get('Items', [])
        
        if not participations:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้'
                })
            }
        
        participation = participations[0]
        participation_id = participation['participationId']
        
        print(f"Found participation: {participation_id}")
        
        # Step 3: Check if already confirmed
        if participation.get('isConfirmed', False):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'คุณได้ยืนยันการเข้าร่วมกิจกรรมนี้แล้ว'
                })
            }
        
        # Step 4: Check timing - can confirm from 30 minutes before start until 30 minutes after start
        print("Step 4: Checking timing...")
        
        # ใช้เวลาไทย (UTC+7)
        thai_tz = timezone(timedelta(hours=7))
        current_time = datetime.now(thai_tz)
        
        # Parse activity start time
        activity_start_str = activity.get('startDateTime')
        if activity_start_str:
            # ถ้าข้อมูลใน database เป็นเวลาไทยอยู่แล้ว
            try:
                if activity_start_str.endswith('Z'):
                    # ถ้ามี Z แสดงว่าเป็น UTC ให้แปลงเป็นไทย
                    activity_start_str_clean = activity_start_str[:-1]
                    activity_start_utc = datetime.fromisoformat(activity_start_str_clean)
                    activity_start = activity_start_utc.replace(tzinfo=timezone.utc).astimezone(thai_tz)
                elif '+07:00' in activity_start_str or '+0700' in activity_start_str:
                    # ถ้าเป็นเวลาไทยอยู่แล้ว
                    activity_start = datetime.fromisoformat(activity_start_str)
                else:
                    # ถ้าไม่มี timezone แสดงว่าเป็นเวลาไทยอยู่แล้ว
                    activity_start = datetime.fromisoformat(activity_start_str)
                    activity_start = activity_start.replace(tzinfo=thai_tz)
                
                # Allow confirmation from 30 minutes before start until 30 minutes after start
                confirm_start = activity_start - timedelta(minutes=30)
                confirm_end = activity_start + timedelta(minutes=30)
                
                print(f"Current time (Thai): {current_time}")
                print(f"Activity start (Thai): {activity_start}")
                print(f"Confirm window: {confirm_start} to {confirm_end}")
                
                if current_time < confirm_start:
                    minutes_until = int((confirm_start - current_time).total_seconds() / 60)
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({
                            'success': False,
                            'message': f'ยังไม่ถึงเวลายืนยันการเข้าร่วม สามารถยืนยันได้ใน {minutes_until} นาที'
                        })
                    }
                
                if current_time > confirm_end:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({
                            'success': False,
                            'message': 'หมดเวลายืนยันการเข้าร่วมแล้ว (สามารถยืนยันได้ภายใน 30 นาทีหลังเริ่มกิจกรรม)'
                        })
                    }
            except Exception as e:
                print(f"Error parsing activity time: {e}")
        
        # Step 5: Update participation record
        print("Step 5: Updating participation record...")
        
        # บันทึกเป็นเวลาไทย - เลือกรูปแบบที่ตรงกับ database
        # ตัวเลือก 1: ถ้า database ใช้รูปแบบ +07:00
        current_time_str = current_time.isoformat()
        
        # ตัวเลือก 2: ถ้า database ยังใช้รูปแบบ Z แต่เป็นเวลาไทย (ไม่แนะนำ)
        # current_time_str = current_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        try:
            # ตาราง ActivityParticipations ใช้ Composite Key: participationId + activityId
            participations_table.update_item(
                Key={
                    'participationId': participation_id,
                    'activityId': activity_id
                },
                UpdateExpression='SET isConfirmed = :confirmed, confirmedAt = :confirmedAt, updatedAt = :updatedAt',
                ExpressionAttributeValues={
                    ':confirmed': True,
                    ':confirmedAt': current_time_str,
                    ':updatedAt': current_time_str
                }
            )
            
            print(f"Successfully updated participation {participation_id}")
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': f'ยืนยันการเข้าร่วมกิจกรรม "{activity.get("name")}" สำเร็จ!',
                    'activityId': activity_id,
                    'activityName': activity.get('name'),
                    'confirmedAt': current_time_str
                })
            }
            
        except ClientError as e:
            print(f"Error updating participation: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
                })
            }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': 'รูปแบบข้อมูลไม่ถูกต้อง'
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
            })
        }