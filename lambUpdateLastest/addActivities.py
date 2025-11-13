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

ALLOWED_LEVELS = {'พื้นฐาน', 'กลาง', 'ขั้นสูง'}

def _now_iso():
    return datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc).isoformat().replace('+00:00','Z')

def _parse_bool(s):
    if isinstance(s, bool): return s
    if isinstance(s, str): return s.strip().lower() in ('1','true','yes','y')
    return False

def _parse_int(s, default=None):
    try:
        return int(s)
    except Exception:
        return default

def compute_category_from_plos(plos):
    """คำนวณ skillCategory จากค่า PLO"""
    if not plos: return ''
    S = set([str(p).upper() for p in plos if p])
    has_hard = bool({'PLO1','PLO2'} & S)
    has_soft = bool({'PLO3','PLO4'} & S)
    if has_hard and has_soft: return 'multi-skill'
    if has_hard: return 'hard skill'
    if has_soft: return 'soft skill'
    return ''

def json_response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(body, default=_to_json_compat)
    }

def _to_json_compat(o):
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    raise TypeError

def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    if event.get('httpMethod') != 'POST':
        return json_response(405, {'error': 'Method Not Allowed'})

    try:
        body = json.loads(event.get('body') or '{}')

        # ===== Validate ข้อมูลพื้นฐาน =====
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
            start_dt = datetime.datetime.fromisoformat(startDateTime.replace('Z','+00:00'))
            end_dt = datetime.datetime.fromisoformat(endDateTime.replace('Z','+00:00'))
            if end_dt <= start_dt:
                return json_response(400, {'error': 'endDateTime must be after startDateTime'})
        except Exception:
            return json_response(400, {'error': 'Invalid datetime format (must be ISO 8601)'})

        description = (body.get('description') or '').strip()
        location = (body.get('location') or '').strip()
        imageUrl = (body.get('imageUrl') or '').strip()

        # ✅ new: รองรับ locationId/locationName สำหรับระบบพิกัด
        locationId = (body.get('locationId') or '').strip() or None
        locationName = (body.get('locationName') or '').strip() or None

        # ===== PLO =====
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

        level = (body.get('level') or '').strip() or None
        if level and level not in ALLOWED_LEVELS:
            return json_response(400, {'error': f'level must be one of {sorted(ALLOWED_LEVELS)}'})

        level = (body.get('level') or body.get('skillLevel') or '').strip() or None
        if level and level not in ALLOWED_LEVELS:
            return json_response(400, {'error': f'level must be one of {sorted(ALLOWED_LEVELS)}'})

        # year level: รองรับทั้งสองชื่อ แล้วยัดลง item เป็น yearLevel
        year_level = _parse_int(body.get('yearLevel'), default=None)
        if year_level is None:
            year_level = _parse_int(body.get('suitableYearLevel'), default=None)

        # ===== ข้อมูลจาก Skills (เติมอัตโนมัติ) =====
        skillId = (body.get('skillId') or '').strip() or None
        skillName = None
        activityGroup = (body.get('activityGroup') or '').strip() or None
        requiredActivities = None

        if skillId:
            skills_table = dynamodb.Table(SKILLS_TABLE)
            try:
                sk = skills_table.get_item(Key={'skillId': skillId}).get('Item')
            except ClientError as e:
                return json_response(500, {'error': 'Skills lookup failed', 'detail': str(e)})

            if sk:
                skillName = sk.get('name')
                if not activityGroup:
                    activityGroup = sk.get('subcategory')
                if suitableYearLevel is None and sk.get('yearLevel') is not None:
                    suitableYearLevel = _parse_int(sk.get('yearLevel'))
                requiredActivities = _parse_int(sk.get('requiredActivities'))

        # ===== สร้าง record =====
        activityId = 'A' + uuid.uuid4().hex[:7].upper()
        item = {
            'activityId': activityId,
            'name': name,
            'description': description,
            'locationId': locationId,
            'startDateTime': startDateTime,
            'endDateTime': endDateTime,
            'skillCategory': skillCategory,
            'plo': plos,
            'ploDescriptions': ploDescriptions,     # <== เก็บเพิ่ม
            'level': level,                         # <== ใช้ชื่อเดียวให้ตรงกับ validate
            'activityGroup': body.get('activityGroup'),
            'yearLevel': year_level,                # <== normalize แล้ว
            #'isRequired': _parse_bool(body.get('isRequired')),
            'requiredActivities': body.get('requiredActivities'),
            #'passingScore': _parse_int(body.get('passingScore')),
            'imageUrl': body.get('imageUrl'),
            'organizerId': body.get('organizerId'),
            'createdAt': _now_iso(),
            'updatedAt': _now_iso(),
        }

        item['organizerId'] = body.get('organizerId')
        #try:
        #    claims = (event.get('requestContext') or {}).get('authorizer', {}).get('claims', {})
        #    item['createdBy'] = claims.get('cognito:username') or claims.get('email') or None
        #except Exception:
        #    item['createdBy'] = None

        item = {k: v for k, v in item.items() if v not in (None, [], '')}
        table = dynamodb.Table(ACTIVITIES_TABLE)
        table.put_item(Item=item)

        return json_response(201, {'success': True, 'activity': item})

    except ClientError as e:
        return json_response(500, {'success': False, 'error': 'DynamoDB error', 'detail': str(e)})
    except Exception as e:
        return json_response(500, {'success': False, 'error': 'Unhandled error', 'detail': str(e)})
