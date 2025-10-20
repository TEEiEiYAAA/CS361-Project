import json
import boto3
import decimal
from datetime import datetime, timezone
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
ACTIVITIES_TABLE = 'Activities'
PARTICIPATIONS_TABLE = 'ActivityParticipations'
LOCATIONS_TABLE = 'Locations'

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o) if o % 1 else int(o)
        return super().default(o)

def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

def _now_iso():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

def lambda_handler(event, context):
    # CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    headers = _cors_headers()

    try:
        # path: /students/{studentId}/activities
        path_params = event.get('pathParameters') or {}
        student_id = path_params.get('studentId')
        if not student_id:
            return {'statusCode': 400, 'headers': headers,
                    'body': json.dumps({'error': 'studentId is required'})}

        # tables
        activities_table = dynamodb.Table(ACTIVITIES_TABLE)
        parts_table = dynamodb.Table(PARTICIPATIONS_TABLE)
        locations_table = dynamodb.Table(LOCATIONS_TABLE)

        # 1) ดึงรายการ participation ของนักศึกษา
        #   สมมติ PK = studentId, SK = activityId (ถ้า schema คุณต่าง ให้ปรับเป็น query ตาม index)
        resp = parts_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('studentId').eq(student_id)
        )
        participations = resp.get('Items', [])

        if not participations:
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps([], ensure_ascii=False)}

        results = []

        # 2) รวมกับ Activities และดึง Locations ให้เสร็จในรอบเดียว
        for p in participations:
            activity_id = p.get('activityId')
            if not activity_id:
                # ข้าม record แปลก
                continue

            # ==== get activity
            try:
                act_res = activities_table.get_item(Key={'activityId': activity_id})
                activity = act_res.get('Item')
            except ClientError as e:
                print(f'Activities get_item fail: {e}')
                activity = None

            if not activity:
                # หากกิจกรรมถูกลบไปแล้ว ให้แนบข้อมูลเท่าที่มีจาก participation
                combined = {
                    'activityId': activity_id,
                    'name': '[กิจกรรมถูกลบ]',
                    'description': '',
                    'startDateTime': None,
                    'endDateTime': None,
                    'location': None,
                    'locationId': None,
                    'locationName': None,
                    'locationLatitude': None,
                    'locationLongitude': None,
                    'locationRadiusMeters': None,

                    # participation fields
                    'studentId': student_id,
                    'isRegistered': True,
                    'isConfirmed': bool(p.get('isConfirmed')),
                    'confirmMethod': p.get('confirmMethod') or None,   # 'geo' (ใหม่)
                    'confirmedAt': p.get('confirmedAt') or None,
                    'confirmLat': p.get('confirmLat') or None,
                    'confirmLon': p.get('confirmLon') or None,

                    'surveyCompleted': bool(p.get('surveyCompleted')),
                    'surveyCompletedAt': p.get('surveyCompletedAt') or None,

                    # flow ใหม่: เกียรติบัตร (กดรับได้ตลอดหลัง survey)
                    'certificateClaimed': bool(p.get('certificateClaimed')),
                    'certificateClaimedAt': p.get('certificateClaimedAt') or None,
                }
                results.append(combined)
                continue

            # ==== enrich location (ดึงพิกัดจาก Locations โดยใช้ locationId ของกิจกรรม)
            loc_lat = loc_lon = loc_radius = None
            location_id = activity.get('locationId')
            location_name = activity.get('locationName') or activity.get('location')

            if location_id:
                try:
                    loc_res = locations_table.get_item(Key={'locationId': location_id})
                    loc_item = loc_res.get('Item')
                    if loc_item:
                        loc_lat = loc_item.get('latitude')
                        loc_lon = loc_item.get('longitude')
                        loc_radius = loc_item.get('radiusMeters')
                except ClientError as e:
                    print(f'Locations get_item fail for {location_id}: {e}')

            # ==== pack result
            combined = {
                # from Activities
                'activityId': activity.get('activityId'),
                'name': activity.get('name'),
                'description': activity.get('description'),
                'startDateTime': activity.get('startDateTime'),
                'endDateTime': activity.get('endDateTime'),
                'location': activity.get('location'),
                'locationId': location_id,
                'locationName': location_name,
                'locationLatitude': loc_lat,
                'locationLongitude': loc_lon,
                'locationRadiusMeters': loc_radius,
                'skillId': activity.get('skillId'),
                'skillCategory': activity.get('skillCategory'),
                'plo': activity.get('plo'),
                'imageUrl': activity.get('imageUrl'),

                # from ActivityParticipations
                'studentId': student_id,
                'isRegistered': True,
                'isConfirmed': bool(p.get('isConfirmed')),
                'confirmMethod': p.get('confirmMethod') or None,   # 'geo'
                'confirmedAt': p.get('confirmedAt') or None,
                'confirmLat': p.get('confirmLat') or None,
                'confirmLon': p.get('confirmLon') or None,

                'surveyCompleted': bool(p.get('surveyCompleted')),
                'surveyCompletedAt': p.get('surveyCompletedAt') or None,

                # flow ใหม่: เกียรติบัตร
                'certificateClaimed': bool(p.get('certificateClaimed')),
                'certificateClaimedAt': p.get('certificateClaimedAt') or None,
            }

            # (ออปชัน) คำนวณสถานะเวลา ใช้ฝั่ง FE ก็ได้
            # combined['lifecycle'] = _calc_lifecycle(activity.get('startDateTime'), activity.get('endDateTime'))

            results.append({k: v for k, v in combined.items() if v is not None})

        # sort ตามเวลาเริ่ม
        results.sort(key=lambda x: x.get('startDateTime') or '')
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(results, cls=DecimalEncoder, ensure_ascii=False)
        }

    except Exception as e:
        print('Unexpected error:', str(e))
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': 'Unhandled error', 'details': str(e)})}
