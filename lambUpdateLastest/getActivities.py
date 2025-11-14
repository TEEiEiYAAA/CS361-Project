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

    # CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        query_params = event.get('queryStringParameters') or {}
        skill_type = query_params.get('skillType')          # soft/hard/multi-skill
        plo_filter = query_params.get('plo')                # PLO1–PLO4
        activity_group = query_params.get('activityGroup')  # Database / Programming / etc.
        
        print(f'Filters => skillType={skill_type}, plo={plo_filter}, activityGroup={activity_group}')
        
        activities_table = dynamodb.Table('Activities')
        plos_table = dynamodb.Table('PLOs')   # ✅ เปลี่ยนจาก Skills เป็น PLOs
        
        activities = activities_table.scan().get('Items', [])
        plos = plos_table.scan().get('Items', [])
        
        # ✅ map จาก PLOs: key = plo (PLO1, PLO2, ...)
        skill_category_map = {p['plo']: p.get('skillCategory', '') for p in plos}
        # ใช้ ploFullName แทน subcategory/description เดิม
        skill_name_map = {p['plo']: p.get('ploFullName', '') for p in plos}
        
        filtered_activities = []

        for activity in activities:
            # --- Normalize skillId ให้เป็น list เสมอ ---
            raw_skill_id = activity.get('skillId')

            if isinstance(raw_skill_id, list):
                skill_ids = [str(x) for x in raw_skill_id if x]
            elif raw_skill_id:
                skill_ids = [str(raw_skill_id)]
            else:
                skill_ids = []

            primary_skill_id = skill_ids[0] if skill_ids else None  # เช่น "PLO3"

            skill_category = skill_category_map.get(primary_skill_id, '')
            skill_name = skill_name_map.get(primary_skill_id, '')

            # ✅ กรองตาม PLO (ใช้ activity.plo ซึ่งเป็น list ของ PLO*)
            if plo_filter and plo_filter.lower() != 'all':
                raw_plos = activity.get('plo') or []
                if isinstance(raw_plos, str):
                    try:
                        parsed = json.loads(raw_plos)
                        raw_plos = parsed if isinstance(parsed, list) else raw_plos.split(',')
                    except Exception:
                        raw_plos = raw_plos.split(',')
                plos_list = [str(p).strip().upper() for p in raw_plos if p]
                if plo_filter.upper() not in plos_list:
                    continue

            # ✅ กรองตาม activityGroup (ใช้ skillId แทน)
            if activity_group and activity_group.lower() != 'all':
                group_value = (activity.get('skillId') or '')  # ใช้จากตาราง Activities โดยตรง
                if str(group_value).lower() != activity_group.lower():
                    continue

            # ✅ กรองตาม skillType (ใช้ skillCategory จาก activity หรือจาก PLOs)
            if skill_type and skill_type.lower() != 'all':
                activity_cat = (activity.get('skillCategory') or '').lower()
                mapped_cat = (skill_category or '').lower()
                if activity_cat != skill_type.lower() and mapped_cat != skill_type.lower():
                    continue

            # ✅ เติมข้อมูล skill/PLO ลงในกิจกรรม
            if primary_skill_id:
                activity['skillId'] = skill_ids                      # เก็บเป็น list ตามของจริง
                activity['skillCategory'] = skill_category or activity.get('skillCategory', '')
                activity['skillName'] = skill_name                   # ใช้ ploFullName
            else:
                activity['skillCategory'] = activity.get('skillCategory', '')
                activity['skillName'] = ''

            # เอาเฉพาะกิจกรรมในอนาคต (หรือถ้า parse ไม่ได้ก็ปล่อยผ่าน)
            if is_upcoming_activity(activity.get('startDateTime')):
                filtered_activities.append(activity)
        
        # เรียงตาม startDateTime
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
            'body': json.dumps({'error': 'DynamoDB error', 'details': str(e)})
        }
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Unhandled error', 'details': str(e)})
        }

def is_upcoming_activity(start_date_time):
    if not start_date_time:
        return True
    try:
        dt = datetime.fromisoformat(start_date_time.replace('Z', '+00:00'))
        return dt >= datetime.now(dt.tzinfo)
    except Exception:
        return True
