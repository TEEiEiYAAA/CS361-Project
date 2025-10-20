import json
import boto3
import decimal
from botocore.exceptions import ClientError
from datetime import datetime

dynamodb = boto3.resource('dynamodb')

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o) if o % 1 > 0 else int(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        query_params = event.get('queryStringParameters') or {}
        skill_type = query_params.get('skillType')     # soft/hard/multi-skill
        plo_filter = query_params.get('plo')           # PLO1–PLO4
        activity_group = query_params.get('activityGroup')  # Database / Programming / etc.
        
        print(f'Filters => skillType={skill_type}, plo={plo_filter}, activityGroup={activity_group}')
        
        activities_table = dynamodb.Table('Activities')
        skills_table = dynamodb.Table('Skills')
        
        activities = activities_table.scan().get('Items', [])
        skills = skills_table.scan().get('Items', [])
        
        skill_category_map = {s['skillId']: s.get('category', '') for s in skills}
        skill_sub_map = {s['skillId']: s.get('subcategory', '') for s in skills}
        
        filtered_activities = []

        for activity in activities:
            skill_id = activity.get('skillId')
            skill_category = skill_category_map.get(skill_id, '')
            skill_subcategory = skill_sub_map.get(skill_id, '')

            # ✅ กรองตาม PLO
            if plo_filter and plo_filter.lower() != 'all':
                raw_plos = activity.get('plo') or []
                if isinstance(raw_plos, str):
                    try:
                        parsed = json.loads(raw_plos)
                        raw_plos = parsed if isinstance(parsed, list) else raw_plos.split(',')
                    except:
                        raw_plos = raw_plos.split(',')
                plos_list = [str(p).strip().upper() for p in raw_plos if p]
                if plo_filter.upper() not in plos_list:
                    continue
            
            # ✅ กรองตาม activityGroup
            if activity_group and activity_group.lower() != 'all':
                group_value = (
                    activity.get('activityGroup') or
                    activity.get('subcategory') or
                    skill_subcategory or ''
                )
                if str(group_value).lower() != activity_group.lower():
                    continue
            
            # ✅ กรองตาม skillType (ใช้ skillCategory จาก activity ถ้าไม่มี skillId)
            if skill_type and skill_type.lower() != 'all':
                activity_cat = (activity.get('skillCategory') or '').lower()
                mapped_cat = (skill_category or '').lower()
                if activity_cat != skill_type.lower() and mapped_cat != skill_type.lower():
                    continue
            
            # ✅ เติมข้อมูล skill ลงในกิจกรรม
            if skill_id:
                skill_info = next((s for s in skills if s['skillId'] == skill_id), {})
                activity['skillCategory'] = skill_category or activity.get('skillCategory')
                activity['skillName'] = skill_info.get('name', '')
                activity['skillSubcategory'] = skill_info.get('subcategory', '')
            else:
                # ไม่มี skillId ก็เก็บค่าเดิมไว้
                activity['skillCategory'] = activity.get('skillCategory', '')
                activity['skillName'] = ''
                activity['skillSubcategory'] = ''
            
            if is_upcoming_activity(activity.get('startDateTime')):
                filtered_activities.append(activity)
        
        filtered_activities.sort(key=lambda x: x.get('startDateTime', ''))
        print(f'Returning {len(filtered_activities)} filtered activities')
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(filtered_activities, cls=DecimalEncoder)
        }

    except ClientError as e:
        print('DynamoDB Error:', str(e))
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': 'DynamoDB error', 'details': str(e)})}
    except Exception as e:
        print('Unexpected error:', str(e))
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': 'Unhandled error', 'details': str(e)})}

def is_upcoming_activity(start_date_time):
    if not start_date_time:
        return True
    try:
        dt = datetime.fromisoformat(start_date_time.replace('Z', '+00:00'))
        return dt >= datetime.now(dt.tzinfo)
    except:
        return True
