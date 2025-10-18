import json
import boto3
import decimal
from botocore.exceptions import ClientError

# สร้าง DynamoDB client
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
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
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
        
        print(f'Getting activity detail for: {activity_id}')
        
        # เชื่อมต่อ DynamoDB tables
        activities_table = dynamodb.Table('Activities')
        skills_table = dynamodb.Table('Skills')
        
        # ดึงข้อมูลกิจกรรม
        activity_response = activities_table.get_item(
            Key={'activityId': activity_id}
        )
        
        if 'Item' not in activity_response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'ไม่พบกิจกรรมที่ระบุ'})
            }
        
        activity = activity_response['Item']
        
        # ดึงข้อมูลทักษะที่เกี่ยวข้อง
        skill_id = activity.get('skillId')
        skill_info = {}
        
        if skill_id:
            try:
                skill_response = skills_table.get_item(
                    Key={'skillId': skill_id}
                )
                if 'Item' in skill_response:
                    skill_info = skill_response['Item']
            except Exception as e:
                print(f'Error fetching skill info: {str(e)}')
        
        # รวมข้อมูลกิจกรรมกับทักษะ
        detailed_activity = {
            # ข้อมูลกิจกรรม
            'activityId': activity.get('activityId'),
            'name': activity.get('name'),
            'description': activity.get('description'),
            'location': activity.get('location'),
            'startDateTime': activity.get('startDateTime'),
            'endDateTime': activity.get('endDateTime'),
            'organizerId': activity.get('organizerId'),
            'qrCode': activity.get('qrCode'),
            'imageUrl': activity.get('imageUrl'),
            'createdAt': activity.get('createdAt'),
            'updatedAt': activity.get('updatedAt'),

            
            # ✅ ฟิลด์สำหรับ UI
            'skillCategory': activity.get('skillCategory', ''),      # hard/soft/multi-skill
            'activityGroup': activity.get('activityGroup', ''),      # = subcategory
            'level': activity.get('level', ''),                      # พื้นฐาน/กลาง/ขั้นสูง
            'suitableYearLevel': activity.get('suitableYearLevel', 0),
            'requiredActivities': activity.get('requiredActivities', 0),
            'prerequisiteActivities': activity.get('prerequisiteActivities', []),

            # ✅ PLO (โค้ด + คำอธิบาย)
            'plo': activity.get('plo', []),
            'ploDescriptions': activity.get('ploDescriptions', []),
            
            # ข้อมูลทักษะที่เกี่ยวข้อง
            'skill': {
                'skillId': skill_info.get('skillId', skill_id),
                'name': skill_info.get('name', 'ไม่ระบุทักษะ'),
                'description': skill_info.get('description', ''),
                'category': skill_info.get('category', ''),
                'subcategory': skill_info.get('subcategory', ''),
                'yearLevel': skill_info.get('yearLevel', 0),
                'isRequired': skill_info.get('isRequired', False),
                'passingScore': skill_info.get('passingScore', 0),
                'requiredActivities': skill_info.get('requiredActivities', 0)
            }
        }
        
        print(f'Successfully retrieved activity: {activity.get("name")}')
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(detailed_activity, cls=DecimalEncoder)
        }
        
    except ClientError as e:
        print('DynamoDB Error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล',
                'details': str(e)
            })
        }
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
                'details': str(e)
            })
        }