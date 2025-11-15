import json
import boto3
import decimal
from botocore.exceptions import ClientError

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
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

    # รองรับ preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        # ---------- 1) อ่าน activityId ----------
        activity_id = event.get('pathParameters', {}).get('activityId')
        if not activity_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'ต้องระบุรหัสกิจกรรม'})
            }

        print(f'Fetching activity: {activity_id}')
        activities_table = dynamodb.Table('Activities')
        plos_table = dynamodb.Table('PLOs')
        locations_table = dynamodb.Table('Locations')

        # ---------- 2) ดึงกิจกรรมจาก Activities ----------
        activity_res = activities_table.get_item(Key={'activityId': activity_id})
        if 'Item' not in activity_res:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'ไม่พบกิจกรรมที่ระบุ'})
            }

        activity = activity_res['Item']

        # ---------- 3) จัดการ PLO จากกิจกรรม ----------
        raw_plos = activity.get('plo') or []
        if isinstance(raw_plos, str):
            # เผื่อเก็บเป็น string เช่น "PLO1,PLO2"
            try:
                parsed = json.loads(raw_plos)
                if isinstance(parsed, list):
                    raw_plos = parsed
                else:
                    raw_plos = [parsed]
            except Exception:
                raw_plos = [p.strip() for p in raw_plos.split(',') if p.strip()]

        plos = raw_plos

        # ดึงข้อมูลจากตาราง PLOs ทั้งหมด แล้ว map เป็น dict
        plos_items = plos_table.scan().get('Items', [])
        plo_map = {item['plo']: item for item in plos_items}

        plo_full_names = []
        # ถ้า activity มี ploDescriptions อยู่แล้วใช้ของเดิมก่อน
        plo_descriptions = activity.get('ploDescriptions') or []

        for idx, plo_code in enumerate(plos):
            info = plo_map.get(plo_code, {})
            full_name = info.get('ploFullName', plo_code)
            plo_full_names.append(full_name)

            # ถ้าไม่มี description ตรง index นี้ ลองดึงจากตาราง PLOs (ถ้ามี field นี้)
            if idx >= len(plo_descriptions):
                desc_from_table = info.get('description') or ''
                plo_descriptions.append(desc_from_table)

        # ---------- 4) หาประเภททักษะ (skillCategory) ----------
        skill_category = activity.get('skillCategory')

        if not skill_category:
            categories = {
                plo_map.get(p, {}).get('skillCategory')
                for p in plos if plo_map.get(p)
            }
            categories = {c for c in categories if c}
            if len(categories) == 1:
                skill_category = categories.pop()
            elif len(categories) > 1:
                skill_category = 'multi skill'
            else:
                skill_category = ''

        level = activity.get('level')  # พื้นฐาน/ปานกลาง/ขั้นสูง

        # ---------- 5) location info ----------
        location_id = activity.get('locationId')
        location_name = activity.get('locationName') or activity.get('location')

        if location_id:
            try:
                loc_res = locations_table.get_item(Key={'locationId': location_id})
                loc_item = loc_res.get('Item')
                if loc_item:
                    location_name = loc_item.get('locationName', location_name)
            except ClientError as e:
                print('Error fetching location from Locations table:', str(e))

        location_info = {
            'locationId': location_id,
            'locationName': location_name
        }

        # --- ดึง skillId (รองรับของเก่า activityGroup) ---
        skill_id = activity.get('skillId') or activity.get('activityGroup', '')

        detailed_activity = {
            # 🟩 Activity Info
            'activityId': activity.get('activityId'),
            'name': activity.get('name'),
            'description': activity.get('description'),
            **location_info,
            'startDateTime': activity.get('startDateTime'),
            'endDateTime': activity.get('endDateTime'),
            'organizerId': activity.get('organizerId'),
            'qrCode': activity.get('qrCode'),
            'imageUrl': activity.get('imageUrl'),
            'createdAt': activity.get('createdAt'),
            'updatedAt': activity.get('updatedAt'),

            # 🟦 UI Fields
            'skillCategory': skill_category,
            'skillId': skill_id,
            'level': level,
            'yearLevel': activity.get('yearLevel', 0),
            'requiredActivities': activity.get('requiredActivities', 0),
            'prerequisiteActivities': activity.get('prerequisiteActivities', []),

            # 🟨 PLO Section (code + ชื่อเต็ม + description)
            'plo': plos,
            'ploFullNames': plo_full_names,
            'ploDescriptions': plo_descriptions,

            # 🟧 skill object สำหรับหน้า advisor-overall.js
            'skill': {
                'category': skill_category or '',
                'skillLevel': level or '',
                'ploFullNames': plo_full_names,
                'ploDescriptions': plo_descriptions,
            }
        }

        # ล้างค่า None
        clean_data = {k: v for k, v in detailed_activity.items() if v is not None}

        print(f"✅ Loaded activity detail: {activity.get('name')}")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(clean_data, cls=DecimalEncoder, ensure_ascii=False)
        }

    except ClientError as e:
        print('DynamoDB Error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล', 'details': str(e)})
        }

    except Exception as e:
        print('Unexpected Error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด', 'details': str(e)})
        }
