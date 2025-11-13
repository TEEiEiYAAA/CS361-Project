import json
import boto3
import uuid
from datetime import datetime, timezone, timedelta

dynamodb = boto3.resource('dynamodb')

ACTIVITIES_TABLE = 'Activities'
STUDENTS_TABLE = 'Students'
PARTICIPATIONS_TABLE = 'ActivityParticipations'
CERTIFICATES_TABLE = 'Certificates'

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

    # preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        path_params = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}

        activity_id = path_params.get('activityId')
        student_id = query_params.get('studentId')

        if not activity_id or not student_id:
            return _bad_request(headers, 'ต้องระบุ activityId และ studentId')

        # 1) ตรวจสิทธิ์ใน ActivityParticipations
        participations_table = dynamodb.Table(PARTICIPATIONS_TABLE)
        part_resp = participations_table.get_item(
            Key={'studentId': student_id, 'activityId': activity_id}
        )
        if 'Item' not in part_resp:
            return _bad_request(headers, 'ไม่พบบันทึกการเข้าร่วมกิจกรรม')

        participation = part_resp['Item']

        if not participation.get('isConfirmed', False):
            return _bad_request(headers, 'ยังไม่ได้ยืนยันการเข้าร่วมกิจกรรม')

        if not participation.get('surveyCompleted', False):
            return _bad_request(headers, 'ต้องทำแบบประเมินกิจกรรมให้เรียบร้อยก่อนรับเกียรติบัตร')

        # 2) สร้างหรือดึง certificate record
        cert_table = dynamodb.Table(CERTIFICATES_TABLE)
        cert_resp = cert_table.get_item(
            Key={'studentId': student_id, 'activityId': activity_id}
        )

        thai_tz = timezone(timedelta(hours=7))
        now = datetime.now(thai_tz)
        now_str = now.isoformat()

        if 'Item' in cert_resp:
            cert_item = cert_resp['Item']
        else:
            cert_item = {
                'studentId': student_id,
                'activityId': activity_id,
                'certificateId': str(uuid.uuid4()),
                'issuedAt': now_str,
                'status': 'issued'
            }
            cert_table.put_item(Item=cert_item)

        # 3) ดึงข้อมูล Activity + Student
        activities_table = dynamodb.Table(ACTIVITIES_TABLE)
        students_table = dynamodb.Table(STUDENTS_TABLE)

        act_resp = activities_table.get_item(Key={'activityId': activity_id})
        stu_resp = students_table.get_item(Key={'studentId': student_id})

        activity = act_resp.get('Item', {}) if act_resp else {}
        student = stu_resp.get('Item', {}) if stu_resp else {}

        # NOTE: ปรับชื่อฟิลด์ให้ตรงกับของจริง
        student_name = student.get('fullName') or student.get('name') or 'Student Name'
        activity_name = activity.get('name') or 'Activity Name'
        organizer_name = activity.get('organizerName') or activity.get('organizer') or 'ผู้จัดกิจกรรม'
        end_datetime = activity.get('endDateTime') or activity.get('endDate') or ''

        result = {
            'certificateId': cert_item['certificateId'],
            'issuedAt': cert_item['issuedAt'],
            'studentId': student_id,
            'studentName': student_name,
            'activityId': activity_id,
            'activityName': activity_name,
            'organizerName': organizer_name,
            'endDateTime': end_datetime,
        }

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'certificate': result}, ensure_ascii=False)
        }

    except Exception as e:
        print('Error in issueCertificate:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'เกิดข้อผิดพลาดภายในระบบ'}, ensure_ascii=False)
        }

def _bad_request(headers, msg):
    return {
        'statusCode': 400,
        'headers': headers,
        'body': json.dumps({'success': False, 'message': msg}, ensure_ascii=False)
    }
