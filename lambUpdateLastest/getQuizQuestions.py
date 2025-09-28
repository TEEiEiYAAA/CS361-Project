import json
import boto3
import random
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    GET /quiz/questions/{skillId}
    ดึงคำถามแบบทดสอบสำหรับทักษะที่ระบุ
    """
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # ดึง skillId จาก path parameters
        skill_id = event.get('pathParameters', {}).get('skillId')
        
        if not skill_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'ต้องระบุ skillId'})
            }
        
        # ตรวจสอบว่านักศึกษามีสิทธิ์ทำแบบทดสอบหรือไม่
        student_id = event.get('queryStringParameters', {}).get('studentId') if event.get('queryStringParameters') else None
        
        if student_id:
            # ตรวจสอบว่าเข้าร่วมกิจกรรมครบ 3 ครั้งแล้วหรือไม่
            if not check_quiz_eligibility(student_id, skill_id):
                return {
                    'statusCode': 403,
                    'headers': headers,
                    'body': json.dumps({'error': 'ยังไม่มีสิทธิ์ทำแบบทดสอบ ต้องเข้าร่วมกิจกรรมครบ 3 ครั้งก่อน'})
                }
        
        # ดึงข้อมูลทักษะเพื่อแสดงชื่อ
        skills_table = dynamodb.Table('Skills')
        skill_response = skills_table.get_item(
            Key={'skillId': skill_id}
        )
        skill_info = skill_response.get('Item', {})
        skill_name = skill_info.get('name', 'ทักษะ')
        
        # ดึงคำถามจากฐานข้อมูล
        questions_table = dynamodb.Table('QuizQuestions')
        
        response = questions_table.scan(
            FilterExpression='skillId = :skillId',
            ExpressionAttributeValues={
                ':skillId': skill_id
            }
        )
        
        questions = response.get('Items', [])
        
        if not questions:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'ไม่พบคำถามสำหรับทักษะนี้'})
            }
        
        # สุ่มคำถาม 10 ข้อ (หรือทั้งหมดถ้ามีน้อยกว่า 10)
        num_questions = min(10, len(questions))
        selected_questions = random.sample(questions, num_questions)
        
        # ลบคำตอบที่ถูกต้องออกก่อนส่งให้ client
        quiz_questions = []
        for q in selected_questions:
            quiz_question = {
                'questionId': q['questionId'],
                'question': q['question'],
                'options': q['options'],
                'difficulty': q.get('difficulty', 'medium')
            }
            quiz_questions.append(quiz_question)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'skillId': skill_id,
                'skillName': skill_name,
                'questions': quiz_questions,
                'totalQuestions': len(quiz_questions),
                'timeLimit': 15,  # 15 นาที
                'passingScore': 70
            })
        }
        
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล'})
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด'})
        }

def check_quiz_eligibility(student_id, skill_id):
    """
    ตรวจสอบว่านักศึกษามีสิทธิ์ทำแบบทดสอบหรือไม่
    """
    try:
        # ตรวจสอบจำนวนกิจกรรมที่เข้าร่วม
        participations_table = dynamodb.Table('ActivityParticipations')
        activities_table = dynamodb.Table('Activities')
        
        # ค้นหา participations ของนักศึกษา
        participations_response = participations_table.scan(
            FilterExpression='studentId = :studentId',
            ExpressionAttributeValues={
                ':studentId': student_id
            }
        )
        
        confirmed_activities = []
        for participation in participations_response.get('Items', []):
            if participation.get('isConfirmed'):
                # ดึงข้อมูลกิจกรรม
                activity_response = activities_table.get_item(
                    Key={'activityId': participation['activityId']}
                )
                activity = activity_response.get('Item')
                if activity and activity.get('skillId') == skill_id:
                    confirmed_activities.append(activity)
        
        # ต้องเข้าร่วมกิจกรรมครบ 3 ครั้ง
        return len(confirmed_activities) >= 3
        
    except Exception as e:
        print(f"Error checking eligibility: {str(e)}")
        return False