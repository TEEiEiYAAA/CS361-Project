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


def normalize_category(cat):
    """ ทำให้ category ทุกแบบ normalize เป็นค่าเดียวกัน """
    if not cat:
        return ''
    c = cat.strip().lower().replace('_', '-').replace(' ', '-')
    if c in ['hardskill', 'hard-skill', 'hard']:
        return 'hard skill'
    if c in ['softskill', 'soft-skill', 'soft']:
        return 'soft skill'
    if c in ['multi', 'multi-skill', 'multiskill', 'multi-skill']:
        return 'multi-skill'
    return cat.strip().lower()


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

        skill_category_filter = normalize_category(query_params.get('skillCategory'))
        plo_filter = query_params.get('plo')
        activity_group = query_params.get('activityGroup')

        print("\n====== [DEBUG] Incoming Filters ======")
        print(f"skillCategory (normalized) => {skill_category_filter}")
        print(f"plo => {plo_filter}")
        print(f"activityGroup => {activity_group}")
        print("=====================================\n")

        activities_table = dynamodb.Table('Activities')
        plos_table = dynamodb.Table('PLOs')

        activities = activities_table.scan().get('Items', [])
        plos = plos_table.scan().get('Items', [])

        plo_category_map = {p['plo']: p.get('skillCategory', '') for p in plos}

        filtered_activities = []

        for activity in activities:

            # Normalize skillCategory ของกิจกรรมด้วย
            raw_cat = activity.get('skillCategory', '')
            normalized_cat = normalize_category(raw_cat)

            # log รายกิจกรรม
            print(
                f"[ACTIVITY] {activity.get('activityId')} | "
                f"skillCategory(raw)= {raw_cat} => normalized={normalized_cat} | "
                f"plo={activity.get('plo')}"
            )

            # ------------ Filter PLO (advisor-activities) ------------
            if plo_filter and plo_filter.lower() != 'all':
                plos_list = activity.get('plo') or []
                if plo_filter.upper() not in [p.upper() for p in plos_list]:
                    print(f"  [SKIP] ไม่ match PLO {plo_filter}")
                    continue

            # ------------ Filter skillCategory (recommend-activities) ------------
            if skill_category_filter and skill_category_filter != 'all':
                if normalized_cat != skill_category_filter:
                    print(
                        f"  [SKIP] ไม่ match skillCategory {skill_category_filter} "
                        f"(ของกิจกรรม = {normalized_cat})"
                    )
                    continue

            # ถ้าไม่ skip ก็ผ่าน
            filtered_activities.append(activity)

        # 🔽🔽🔽 ตรงนี้คือส่วนที่เพิ่มเข้ามา: เรียงตาม startDateTime 🔽🔽🔽
        def sort_key(a):
            dt = a.get('startDateTime')
            if not dt:
                # ไม่มี startDateTime ให้ไปอยู่ท้าย ๆ
                return ('2', '')
            # ถ้าเป็น ISO string (2025-11-23T05:50:00Z) เอามาใช้เรียงได้เลย
            return ('1', dt)

        filtered_activities.sort(key=sort_key)
        # 🔼🔼🔼 จบส่วนเรียงตามวันที่ 🔼🔼🔼

        print(f"\n====== [DEBUG] Final Count: {len(filtered_activities)} ======\n")

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(filtered_activities, cls=DecimalEncoder, ensure_ascii=False)
        }

    except Exception as e:
        print("[ERROR]", str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
