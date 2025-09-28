import json
import boto3
import decimal
from botocore.exceptions import ClientError
from datetime import datetime

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
        # ดึง query parameters
        query_params = event.get('queryStringParameters') or {}
        skill_type = query_params.get('skillType')  # 'soft skill', 'hard skill', หรือ None (ทั้งหมด)
        
        print(f'Getting activities with skill type filter: {skill_type}')
        
        # เชื่อมต่อ DynamoDB tables
        activities_table = dynamodb.Table('Activities')
        skills_table = dynamodb.Table('Skills')
        
        # ดึงกิจกรรมทั้งหมด
        activities_response = activities_table.scan()
        activities = activities_response.get('Items', [])
        
        print(f'Found {len(activities)} total activities')
        
        # ดึงข้อมูล skills เพื่อกรองตาม category
        skills_response = skills_table.scan()
        skills = skills_response.get('Items', [])
        
        # สร้าง mapping จาก skillId ไป category
        skill_category_map = {skill['skillId']: skill.get('category', '') for skill in skills}
        
        # กรองกิจกรรมตาม skill type ถ้ามีการระบุ
        filtered_activities = []
        for activity in activities:
            skill_id = activity.get('skillId')
            if skill_id and skill_id in skill_category_map:
                skill_category = skill_category_map[skill_id]
                
                # ถ้าไม่ระบุ skill_type หรือ skill_type ตรงกับ category
                if not skill_type or skill_category == skill_type:
                    # เพิ่มข้อมูล skill ลงในกิจกรรม
                    skill_info = next((s for s in skills if s['skillId'] == skill_id), {})
                    activity['skillCategory'] = skill_category
                    activity['skillName'] = skill_info.get('name', '')
                    activity['skillSubcategory'] = skill_info.get('subcategory', '')
                    
                    # ตรวจสอบว่ากิจกรรมยังไม่ผ่านมาหรือกำลังจะมาถึง
                    if is_upcoming_activity(activity.get('startDateTime')):
                        filtered_activities.append(activity)
        
        # เรียงตามวันเวลาเริ่มกิจกรรม (ใกล้ที่สุดก่อน)
        filtered_activities.sort(key=lambda x: x.get('startDateTime', ''))
        
        print(f'Returning {len(filtered_activities)} filtered activities')
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(filtered_activities, cls=DecimalEncoder)
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

def is_upcoming_activity(start_date_time):
    """ตรวจสอบว่ากิจกรรมยังไม่ผ่านมาหรือไม่"""
    if not start_date_time:
        return True
    
    try:
        # แปลง string เป็น datetime object
        activity_date = datetime.fromisoformat(start_date_time.replace('Z', '+00:00'))
        current_date = datetime.now(activity_date.tzinfo)
        
        # ถ้ากิจกรรมยังไม่ผ่านมา หรือเป็นกิจกรรมในวันนี้
        return activity_date >= current_date
    except:
        # ถ้าไม่สามารถแปลงวันที่ได้ ให้แสดงกิจกรรมนั้น
        return True