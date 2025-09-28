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
    GET /activities/{activityId}/participants
    ดึงรายชื่อและสถิติผู้เข้าร่วมกิจกรรม
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
        # ดึง activityId จาก path parameters
        activity_id = event.get('pathParameters', {}).get('activityId')
        
        if not activity_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'ต้องระบุรหัสกิจกรรม'})
            }
        
        print(f"Fetching participants for activity: {activity_id}")
        
        # เชื่อมต่อ DynamoDB tables
        participations_table = dynamodb.Table('ActivityParticipations')
        students_table = dynamodb.Table('Students')
        
        # ค้นหา participations ของกิจกรรมนี้
        participations_response = participations_table.scan(
            FilterExpression='activityId = :activityId',
            ExpressionAttributeValues={
                ':activityId': activity_id
            }
        )
        
        participations = participations_response.get('Items', [])
        print(f"Found {len(participations)} participations")
        
        # สร้างรายการผู้เข้าร่วมพร้อมข้อมูลนักศึกษา
        participants = []
        total_registered = len(participations)
        total_confirmed = 0
        total_survey_completed = 0
        
        for participation in participations:
            student_id = participation.get('studentId')
            
            # ดึงข้อมูลนักศึกษา
            try:
                student_response = students_table.get_item(
                    Key={'studentId': student_id}
                )
                
                student_data = student_response.get('Item', {})
                
                # รวมข้อมูล participation และ student
                participant_info = {
                    'participationId': participation.get('participationId'),
                    'studentId': student_id,
                    'studentName': student_data.get('name', 'ไม่ระบุชื่อ'),
                    'studentYear': student_data.get('yearLevel', 0),
                    'studentDepartment': student_data.get('department', 'ไม่ระบุแผนก'),
                    'isConfirmed': participation.get('isConfirmed', False),
                    'surveyCompleted': participation.get('surveyCompleted', False),
                    'registeredAt': participation.get('registeredAt'),
                    'confirmedAt': participation.get('confirmedAt'),
                    'surveyCompletedAt': participation.get('surveyCompletedAt')
                }
                
                # นับสถิติ
                if participant_info['isConfirmed']:
                    total_confirmed += 1
                
                if participant_info['surveyCompleted']:
                    total_survey_completed += 1
                
                participants.append(participant_info)
                
            except Exception as e:
                print(f"Error fetching student {student_id}: {str(e)}")
                # เพิ่มข้อมูลแม้ไม่มีข้อมูลนักศึกษา
                participant_info = {
                    'participationId': participation.get('participationId'),
                    'studentId': student_id,
                    'studentName': 'ไม่พบข้อมูลนักศึกษา',
                    'studentYear': 0,
                    'studentDepartment': 'ไม่ระบุ',
                    'isConfirmed': participation.get('isConfirmed', False),
                    'surveyCompleted': participation.get('surveyCompleted', False),
                    'registeredAt': participation.get('registeredAt'),
                    'confirmedAt': participation.get('confirmedAt'),
                    'surveyCompletedAt': participation.get('surveyCompletedAt')
                }
                
                participants.append(participant_info)
        
        # เรียงตาม registeredAt (ล่าสุดก่อน)
        participants.sort(key=lambda x: x.get('registeredAt', ''), reverse=True)
        
        # สร้างผลลัพธ์
        result = {
            'activityId': activity_id,
            'statistics': {
                'totalRegistered': total_registered,
                'totalConfirmed': total_confirmed,
                'totalPending': total_registered - total_confirmed,
                'totalSurveyCompleted': total_survey_completed
            },
            'participants': participants
        }
        
        print(f"Stats - Registered: {total_registered}, Confirmed: {total_confirmed}, Survey: {total_survey_completed}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result, cls=DecimalEncoder)
        }
        
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล',
                'details': str(e)
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
                'details': str(e)
            })
        }