import json
import boto3
import decimal
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Helper class to convert a DynamoDB item to JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)

# ⭐️ ฟังก์ชันคำนวณชั้นปีจากรหัสนักศึกษา (อิงตามที่ระบุ 66=ปี3)
def calculate_year_level(student_id):
    if len(student_id) < 2 or not student_id[:2].isdigit():
        return 1
    
    # 🚨 กำหนดปีปัจจุบัน (พ.ศ.) ตามตัวอย่าง 66=ปี3 คือ 2568
    CURRENT_BE_YEAR = 2568 
    
    try:
        intake_prefix = int(student_id[:2])
        admissionYearBE = 2500 + intake_prefix
        year_level = CURRENT_BE_YEAR - admissionYearBE + 1
        
        return max(1, min(4, year_level)) # จำกัดให้อยู่ในช่วง 1-4
    except ValueError:
        return 1


def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        # ดึง studentId จาก path parameters
        student_id = event.get('pathParameters', {}).get('studentId')
        
        if not student_id:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'ต้องระบุรหัสนักศึกษา'})}

        # 1. คำนวณชั้นปี
        student_year_level = calculate_year_level(student_id)
        
        # 2. เชื่อมต่อตาราง
        completed_skills_table = dynamodb.Table('CompletedSkills')
        skills_table = dynamodb.Table('Skills')
        
        # 3. ⭐️ หา Required Skills ทั้งหมดของชั้นปีนี้ (Scan + Filter)
        required_response = skills_table.scan(
             FilterExpression=Attr('isRequired').eq(True) & Attr('yearLevel').eq(student_year_level)
        )
        all_required_skills = required_response.get('Items', [])
        total_required_count = len(all_required_skills)
        all_required_skill_ids = {skill['skillId'] for skill in all_required_skills}

        # 4. ค้นหาทักษะที่นักศึกษาได้รับ (Completed Skills)
        completed_response = completed_skills_table.query(
            KeyConditionExpression='studentId = :studentId',
            ExpressionAttributeValues={':studentId': student_id}
        )
        completed_items = completed_response.get('Items', [])
        completed_skill_ids = {item.get('skillId') for item in completed_items}
        
        # 5. คำนวณสรุปผล
        completed_required_count = 0
        completed_optional_count = 0
        
        for skill_id in completed_skill_ids:
            if skill_id in all_required_skill_ids:
                completed_required_count += 1
            else:
                completed_optional_count += 1 
        
        # 6. รายการทักษะบังคับที่ยังขาด (Pending Skills)
        pending_skill_ids = all_required_skill_ids - completed_skill_ids
        
        pending_skills_details = []
        for skill_id in pending_skill_ids:
            skill_data = next((s for s in all_required_skills if s['skillId'] == skill_id), None)
            if skill_data:
                 pending_skills_details.append({
                    'id': skill_id,
                    'name': skill_data.get('name'),
                    'category': skill_data.get('category'),
                    'requiredActivities': skill_data.get('requiredActivities', 3), # ดึงค่า requiredActivities
                 })

        # 7. สร้างผลลัพธ์
        summary = {
            'totalRequiredSkills': total_required_count,
            'completedRequiredSkills': completed_required_count,
            'completedOptionalSkills': completed_optional_count,
            'pendingSkills': pending_skills_details
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'data': summary}, cls=DecimalEncoder)
        }
        
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'error': 'เกิดข้อผิดพลาดในการคำนวณทักษะ', 'details': str(e)})
        }
    