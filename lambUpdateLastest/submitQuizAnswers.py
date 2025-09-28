import json
import boto3
import uuid
from datetime import datetime
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    POST /quiz/submit
    ส่งคำตอบแบบทดสอบและคำนวณคะแนน
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
        # Parse request body
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Missing request body'})
            }
        
        request_data = json.loads(event['body'])
        student_id = request_data.get('studentId')
        skill_id = request_data.get('skillId')
        answers = request_data.get('answers', [])
        started_at = request_data.get('startedAt')
        
        if not all([student_id, skill_id, answers]):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'ข้อมูลไม่ครบถ้วน'})
            }
        
        # ดึงคำตอบที่ถูกต้องจากฐานข้อมูล
        questions_table = dynamodb.Table('QuizQuestions')
        correct_answers = {}
        
        for answer in answers:
            question_id = answer.get('questionId')
            if question_id:
                response = questions_table.get_item(
                    Key={'questionId': question_id}
                )
                question = response.get('Item')
                if question:
                    correct_answers[question_id] = question.get('correctAnswer')
        
        # คำนวณคะแนน
        total_questions = len(answers)
        correct_count = 0
        detailed_answers = []
        
        for answer in answers:
            question_id = answer.get('questionId')
            selected_answer = answer.get('selectedAnswer')
            correct_answer = correct_answers.get(question_id)
            
            # Debug: แสดงการเปรียบเทียบ
            print(f"Question: {question_id}")
            print(f"Selected: '{selected_answer}'")
            print(f"Correct: '{correct_answer}'")
            
            # เปรียบเทียบคำตอบ (ไม่สนใจช่องว่างและตัวพิมพ์)
            is_correct = False
            if selected_answer and correct_answer:
                # ลบช่องว่างและแปลงเป็นตัวพิมพ์เล็ก
                selected_clean = selected_answer.strip().lower()[0]
                correct_clean = correct_answer.strip().lower()
                is_correct = selected_clean == correct_clean
                
                # Debug: แสดงผลการเปรียบเทียบ
                print(f"Selected clean: '{selected_clean}'")
                print(f"Correct clean: '{correct_clean}'")
                print(f"Is correct: {is_correct}")
            
            if is_correct:
                correct_count += 1
            
            detailed_answers.append({
                'questionId': question_id,
                'selectedAnswer': selected_answer,
                'correctAnswer': correct_answer,
                'isCorrect': is_correct
            })
        
        # คำนวณคะแนนเปอร์เซ็นต์
        score = (correct_count / total_questions * 100) if total_questions > 0 else 0
        is_passed = score >= 70  # เกณฑ์ผ่าน 70%
        
        # บันทึกผลการทดสอบ
        attempt_id = str(uuid.uuid4())
        attempts_table = dynamodb.Table('QuizAttempts')
        
        attempt_record = {
            'attemptId': attempt_id,
            'studentId': student_id,
            'skillId': skill_id,
            'score': int(score),
            'totalQuestions': total_questions,
            'correctAnswers': correct_count,
            'isPassed': is_passed,
            'startedAt': started_at or datetime.utcnow().isoformat() + 'Z',
            'completedAt': datetime.utcnow().isoformat() + 'Z',
            'answers': detailed_answers
        }
        
        attempts_table.put_item(Item=attempt_record)
        
        # ถ้าผ่านการทดสอบ ให้บันทึกทักษะที่ได้รับ
        if is_passed:
            await_skill_to_completed(student_id, skill_id, score)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'attemptId': attempt_id,
                'score': int(score),
                'totalQuestions': total_questions,
                'correctAnswers': correct_count,
                'isPassed': is_passed,
                'passingScore': 70,
                'message': 'ยินดีด้วย! คุณผ่านการทดสอบแล้ว' if is_passed else 'เสียใจด้วย คุณยังไม่ผ่านการทดสอบ',
                'skillReceived': is_passed
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON format'})
        }
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'})
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด'})
        }

def await_skill_to_completed(student_id, skill_id, score):
    """
    บันทึกทักษะที่นักศึกษาได้รับ
    """
    try:
        completed_skills_table = dynamodb.Table('CompletedSkills')
        
        # ตรวจสอบว่ามีทักษะนี้แล้วหรือไม่
        existing_response = completed_skills_table.get_item(
            Key={
                'studentId': student_id,
                'skillId': skill_id
            }
        )
        
        # ถ้ายังไม่มี ให้เพิ่มใหม่
        if 'Item' not in existing_response:
            completed_skill_record = {
                'studentId': student_id,
                'skillId': skill_id,
                'completedDate': datetime.utcnow().strftime('%Y-%m-%d'),
                'evidence': f'quiz-attempt-score-{score}%',
                'FinalScore': int(score),
                'verifiedDate': datetime.utcnow().strftime('%Y-%m-%d')
            }
            
            completed_skills_table.put_item(Item=completed_skill_record)
            print(f"Added completed skill: {skill_id} for student: {student_id}")
        else:
            # ถ้ามีแล้ว ให้อัปเดตคะแนนถ้าคะแนนใหม่สูงกว่า
            existing_score = existing_response['Item'].get('FinalScore', 0)
            if score > existing_score:
                completed_skills_table.update_item(
                    Key={
                        'studentId': student_id,
                        'skillId': skill_id
                    },
                    UpdateExpression='SET FinalScore = :score, evidence = :evidence, verifiedDate = :date',
                    ExpressionAttributeValues={
                        ':score': int(score),
                        ':evidence': f'quiz-attempt-score-{score}%',
                        ':date': datetime.utcnow().strftime('%Y-%m-%d')
                    }
                )
                print(f"Updated completed skill score: {skill_id} for student: {student_id}")
        
    except Exception as e:
        print(f"Error adding completed skill: {str(e)}")
        # ไม่ throw error เพราะการทดสอบสำเร็จแล้ว