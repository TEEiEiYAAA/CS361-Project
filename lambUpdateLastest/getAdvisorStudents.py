import json
import boto3
import decimal
from botocore.exceptions import ClientError

# สร้าง DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Helper class to convert a DynamoDB item to JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:  # ถ้าเป็นเลขทศนิยม
                return float(o)
            else:  # ถ้าเป็นเลขจำนวนเต็ม
                return int(o)
        return super(DecimalEncoder, self).default(o)

def count_required_skills_by_year(all_skills, year_level):
    """
    นับจำนวนทักษะบังคับตามชั้นปี
    ทักษะจะถือว่าบังคับถ้า isRequired = True และ yearLevel == ชั้นปีของนักศึกษา
    """
    required_count = 0
    
    for skill in all_skills:
        # ตรวจสอบว่าเป็นทักษะบังคับและเหมาะสำหรับชั้นปีนี้
        is_required = skill.get('isRequired', False)
        skill_year_level = skill.get('yearLevel', 1)
        
        # ทักษะจะบังคับถ้า isRequired = True และ yearLevel == ชั้นปีของนักศึกษา
        if is_required and skill_year_level == year_level:
            required_count += 1
            print(f"  - Required skill: {skill.get('name', skill.get('skillId'))} (Year {skill_year_level})")
    
    print(f"Total required skills for year {year_level}: {required_count}")
    return required_count

def lambda_handler(event, context):
    # ดึง advisorId จาก path parameters
    advisor_id = event.get('pathParameters', {}).get('advisorId')
    
    if not advisor_id:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'ต้องระบุรหัสอาจารย์ที่ปรึกษา'})
        }
    
    try:
        # ค้นหานักศึกษาที่มีอาจารย์ที่ปรึกษาตามที่ระบุ
        students_table = dynamodb.Table('Students')
        skills_table = dynamodb.Table('Skills')
        completed_skills_table = dynamodb.Table('CompletedSkills')
        
        # พยายามใช้ query กับ GSI ก่อน
        try:
            print(f"Querying students for advisor {advisor_id} using advisorId-index GSI")
            response = students_table.query(
                IndexName='advisorId-index',  # ใช้ชื่อ index ใหม่
                KeyConditionExpression='advisorId = :advisor_id',
                ExpressionAttributeValues={
                    ':advisor_id': advisor_id
                }
            )
        except ClientError as e:
            # ถ้าไม่สามารถใช้ query ได้ (เช่น GSI ยังไม่พร้อมใช้งาน) ให้ใช้ scan แทน
            print(f"GSI query failed, falling back to scan: {str(e)}")
            response = students_table.scan(
                FilterExpression='advisorId = :advisor_id',
                ExpressionAttributeValues={
                    ':advisor_id': advisor_id
                }
            )
        
        students = response.get('Items', [])
        print(f"Found {len(students)} students for advisor {advisor_id}")
        
        # ดึงข้อมูลทักษะทั้งหมดเพื่อคำนวณ requiredSkills ตาม yearLevel
        skills_response = skills_table.scan()
        all_skills = skills_response.get('Items', [])
        print(f"Found {len(all_skills)} skills in Skills table")
        
        # ดึงข้อมูลทักษะเพิ่มเติมสำหรับแต่ละนักศึกษา
        for student in students:
            student_year_level = student.get('yearLevel', 1)
            
            # คำนวณจำนวนทักษะบังคับสำหรับชั้นปีของนักศึกษา
            required_skills_count = count_required_skills_by_year(all_skills, student_year_level)
            student['requiredSkills'] = required_skills_count
            
            print(f"Student {student['studentId']} (Year {student_year_level}) has {required_skills_count} required skills")
            
            # นับจำนวนทักษะที่นักศึกษาได้รับ
            try:
                skills_response = completed_skills_table.query(
                    KeyConditionExpression='studentId = :student_id',
                    ExpressionAttributeValues={
                        ':student_id': student['studentId']
                    }
                )
                
                student['completedSkills'] = len(skills_response.get('Items', []))
                
            except Exception as e:
                print(f"Error fetching skills for student {student['studentId']}: {str(e)}")
                student['completedSkills'] = 0
        
        # ใช้ DecimalEncoder เพื่อแปลงค่า Decimal
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(students, cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดในการดึงข้อมูลนักศึกษา', 'details': str(e)})
        }