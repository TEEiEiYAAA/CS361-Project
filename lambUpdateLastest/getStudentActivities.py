import json
import boto3
import decimal
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
    GET /students/{studentId}/activities
    ดึงรายการกิจกรรมที่นักศึกษาเข้าร่วม
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
        # ดึง studentId จาก path parameters
        student_id = event.get('pathParameters', {}).get('studentId')
        
        if not student_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'ต้องระบุรหัสนักศึกษา'})
            }
        
        # เชื่อมต่อ DynamoDB tables
        participations_table = dynamodb.Table('ActivityParticipations')
        activities_table = dynamodb.Table('Activities')
        
        # ค้นหา participations ของนักศึกษา โดยใช้ scan เนื่องจากยังไม่มี GSI
        print(f"Searching for participations with studentId: {student_id} (as string)")
        
        participations_response = participations_table.scan(
            FilterExpression='studentId = :studentId',
            ExpressionAttributeValues={
                ':studentId': student_id  # ใช้เป็น string ตามที่ตั้งค่าใน DynamoDB
            }
        )
        
        participations = participations_response.get('Items', [])
        print(f"Found {len(participations)} participations")
        
        # Debug: แสดง participations ที่พบ
        for i, p in enumerate(participations[:3]):  # แสดง 3 รายการแรก
            print(f"Participation {i+1}: {json.dumps(p, cls=DecimalEncoder)}")
        
        if not participations:
            # Debug: ลองดู participations ทั้งหมดในตาราง
            print("No participations found, checking all participations in table...")
            all_participations = participations_table.scan(Limit=10)
            print(f"Total participations in table: {all_participations.get('Count', 0)}")
            
            for i, p in enumerate(all_participations.get('Items', [])[:3]):
                print(f"Sample participation {i+1}: {json.dumps(p, cls=DecimalEncoder)}")
            
            return {
                'statusCode': 200,
                'headers': headers,  
                'body': json.dumps([], cls=DecimalEncoder)
            }
        
        # รวมข้อมูล activities กับ participations
        result = []
        
        for participation in participations:
            activity_id = participation.get('activityId')
            print(f"Fetching activity: {activity_id}")
            
            # ดึงข้อมูล activity
            activity_response = activities_table.get_item(
                Key={'activityId': activity_id}
            )
            
            activity = activity_response.get('Item')
            if activity:
                print(f"Found activity: {activity.get('name', 'No name')}")
                # รวมข้อมูล
                combined_data = {
                    # ข้อมูลจาก Activities table
                    'activityId': activity.get('activityId'),
                    'name': activity.get('name'),
                    'description': activity.get('description'),
                    'location': activity.get('location'),
                    'startDateTime': activity.get('startDateTime'),
                    'endDateTime': activity.get('endDateTime'),
                    'organizerId': activity.get('organizerId'),
                    'skillId': activity.get('skillId'),
                    'qrCode': activity.get('qrCode'),
                    
                    # ข้อมูลจาก ActivityParticipations table
                    'participationId': participation.get('participationId'),
                    'isConfirmed': participation.get('isConfirmed', False),
                    'surveyCompleted': participation.get('surveyCompleted', False),
                    'registeredAt': participation.get('registeredAt'),
                    'confirmedAt': participation.get('confirmedAt'),
                    'surveyCompletedAt': participation.get('surveyCompletedAt')
                }
                
                result.append(combined_data)
            else:
                print(f"Activity {activity_id} not found in Activities table")
        
        # เรียงตามวันที่เริ่มกิจกรรม (ใหม่ก่อน)
        result.sort(key=lambda x: x.get('startDateTime', ''), reverse=True)
        
        print(f"Returning {len(result)} activities to client")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result, cls=DecimalEncoder)
        }
        
    except ClientError as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล',
                'details': str(e)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
                'details': str(e)
            })
        }