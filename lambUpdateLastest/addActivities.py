import json
import os
import uuid
import boto3
import datetime
from decimal import Decimal
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
ACTIVITIES_TABLE = os.getenv('ACTIVITIES_TABLE', 'Activities')
SKILLS_TABLE = os.getenv('SKILLS_TABLE', 'Skills')

ALLOWED_LEVELS = {'พื้นฐาน', 'ปานกลาง', 'ขั้นสูง'}

# ===== Timezone Thailand support =====
TH_TZ = datetime.timezone(datetime.timedelta(hours=7))

def convert_utc_iso_to_thai_iso(dt_str):
    """
    รับค่า datetime จากเว็บ (เช่น '2025-11-20T10:00:00Z' หรือไม่มี timezone)
    โดยถือว่า 'ตัวเลขเวลา' ตรงนั้นคือเวลา 'ไทย' อยู่แล้ว
    แล้วแค่ผูก timezone เป็น +07:00 โดยไม่เลื่อนเวลา
    เช่น '2025-11-20T10:00:00Z' -> '2025-11-20T10:00:00+07:00'
    """
    if not dt_str:
        return None

    # ตัด Z หรือ offset ทิ้ง เพื่อเอาเฉพาะส่วนวัน-เวลา
    raw = dt_str.strip()

    # ตัด Z ท้ายสุด (ถ้ามี)
    if raw.endswith('Z') or raw.endswith('z'):
        raw = raw[:-1]

    # ถ้ามี offset เช่น +00:00 หรือ +07:00 ให้ตัดออก (เอาเฉพาะ yyyy-mm-ddThh:mm:ss)
    # หาเครื่องหมาย + หรือ - หลังตำแหน่งวันที่
    for sep in ['+', '-']:
        idx = raw[10:].find(sep)
        if idx != -1:
            raw = raw[:10 + idx]   # ตัดส่วน timezone ทิ้ง
            break

    # ตอนนี้ raw เป็น datetime แบบไม่มี timezone เช่น '2025-11-20T10:00:00'
    naive = datetime.datetime.fromisoformat(raw)

    # ผูกว่า datetime นี้คือเวลาไทย (ไม่เปลี่ยนชั่วโมง)
    th_dt = naive.replace(tzinfo=TH_TZ)

    return th_dt.isoformat()

def _now_iso():
    now_utc = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
    now_th = now_utc.astimezone(TH_TZ)
    return now_th.isoformat()

def _parse_int(s, default=None):
    try:
        return int(s)
    except Exception:
        return default


def compute_category_from_plos(plos):
    if not plos:
        return ''
    S = {str(p).upper() for p in plos if p}
    has_hard = bool({'PLO1', 'PLO2'} & S)
    has_soft = bool({'PLO3', 'PLO4'} & S)
    if has_hard and has_soft:
        return 'multi-skill'
    if has_hard:
        return 'hard skill'
    if has_soft:
        return 'soft skill'
    return ''


def _to_json_compat(o):
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    raise TypeError


def json_response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        },
        'body': json.dumps(body, default=_to_json_compat),
    }


def lambda_handler(event, context):
    # CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    if event.get('httpMethod') != 'POST':
        return json_response(405, {'error': 'Method Not Allowed'})

    try:
        body = json.loads(event.get('body') or '{}')

        # ===== ข้อมูลหลัก =====
        name = (body.get('name') or '').strip()
        startDateTime = (body.get('startDateTime') or '').strip()
        endDateTime = (body.get('endDateTime') or '').strip()

        if not name:
            return json_response(400, {'error': 'name is required'})
        if not startDateTime:
            return json_response(400, {'error': 'startDateTime is required (ISO string)'})
        if not endDateTime:
            return json_response(400, {'error': 'endDateTime is required (ISO string)'})

        try:
            # แปลงจาก string → datetime (สมมติว่าเป็น UTC ก่อน)
            start_dt_utc = datetime.datetime.fromisoformat(startDateTime.replace('Z', '+00:00'))
            end_dt_utc = datetime.datetime.fromisoformat(endDateTime.replace('Z', '+00:00'))

            # เช็คเงื่อนไขเวลาเหมือนเดิม (เทียบใน UTC)
            if end_dt_utc <= start_dt_utc:
                return json_response(400, {'error': 'endDateTime must be after startDateTime'})

            # ⭐ แปลงเป็น "เวลาไทย" เอาไว้เก็บลงตาราง
            start_th_iso = convert_utc_iso_to_thai_iso(startDateTime)
            end_th_iso = convert_utc_iso_to_thai_iso(endDateTime)

        except Exception:
            return json_response(400, {'error': 'Invalid datetime format (must be ISO 8601)'})

        description = (body.get('description') or '').strip()

        # location
        locationId = (body.get('locationId') or '').strip() or None
        locationName = (body.get('locationName') or '').strip() or None

        # ===== PLO / ทักษะ =====
        plos = body.get('plo') or []
        if isinstance(plos, str):
            plos = [p.strip() for p in plos.split(',') if p.strip()]
        if not isinstance(plos, list):
            return json_response(400, {'error': 'plo must be an array of strings'})
        plos = [str(p).upper() for p in plos if p]

        skillCategory = compute_category_from_plos(plos)

        ploDescriptions = body.get('ploDescriptions') or []
        if isinstance(ploDescriptions, str):
            ploDescriptions = [x.strip() for x in ploDescriptions.split(',')]
        if not isinstance(ploDescriptions, list):
            ploDescriptions = []

        # level
        level = (body.get('level') or body.get('skillLevel') or '').strip() or None
        if level and level not in ALLOWED_LEVELS:
            return json_response(400, {'error': f'level must be one of {sorted(ALLOWED_LEVELS)}'})

        # yearLevel
        year_level = body.get('yearLevel')
        if year_level is None:
            year_level = _parse_int(body.get('suitableYearLevel'), default=None)

        # activityGroup ไม่ใช้แล้ว แต่เผื่อรับจาก frontend เก่าเอาไว้เป็น fallback
        skillId = (body.get('skillId') or '').strip() or None

        # ===== สร้าง item =====
        activityId = 'A' + uuid.uuid4().hex[:7].upper()
        item = {
            'activityId': activityId,
            'name': name,
            'description': description,
            'locationId': locationId,
            'startDateTime': start_th_iso,
            'endDateTime': end_th_iso,
            'skillCategory': skillCategory,
            'skillId': skillId,                   # << ใช้ skill_id ตรงนี้
            'plo': plos,
            'ploDescriptions': ploDescriptions,
            'level': level,
            #'activityGroup': activityGroup,
            'yearLevel': year_level,
            'requiredActivities': body.get('requiredActivities'),
            'imageUrl': body.get('imageUrl'),
            'organizerId': body.get('organizerId'),
            'createdAt': _now_iso(),
            'updatedAt': _now_iso(),
        }

        # ลบ field ที่ว่าง ๆ ออก
        item = {k: v for k, v in item.items() if v not in (None, [], '')}

        table = dynamodb.Table(ACTIVITIES_TABLE)
        table.put_item(Item=item)

        return json_response(201, {'success': True, 'activity': item})

    except ClientError as e:
        return json_response(500, {
            'success': False,
            'error': 'DynamoDB error',
            'detail': str(e),
        })
    except Exception as e:
        return json_response(500, {
            'success': False,
            'error': 'Unhandled error',
            'detail': str(e),
        })
