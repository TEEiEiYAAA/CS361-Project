import json
import boto3
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    print('Event received:', json.dumps(event))
    
    # ดึง studentId จาก path parameters
    student_id = event.get('pathParameters', {}).get('studentId')
    
    if not student_id:
        print('No studentId provided')
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'ต้องระบุรหัสนักศึกษา'})
        }
    
    print(f'Looking up skills for student: {student_id}')
    
    try:
        # ค้นหาทักษะที่นักศึกษาได้รับ
        completed_skills_table = dynamodb.Table('CompletedSkills')
        skills_table = dynamodb.Table('Skills')
        
        response = completed_skills_table.query(
            KeyConditionExpression='studentId = :studentId',
            ExpressionAttributeValues={
                ':studentId': student_id
            }
        )
        
        print('Query result:', json.dumps(response, default=str))
        
        # ดึงรายละเอียดทักษะเพิ่มเติมจากตาราง Skills
        skills = []
        for item in response.get('Items', []):
            skill_id = item.get('skillId')
            skill_response = skills_table.get_item(
                Key={'skillId': skill_id}
            )
            
            skill_data = skill_response.get('Item')
            print('Skill data:', json.dumps(skill_data, default=str))
            
            if skill_data:
                item_with_details = dict(item)
                item_with_details['skillName'] = skill_data.get('name')
                item_with_details['skillDescription'] = skill_data.get('description')
                item_with_details['skillCategory'] = skill_data.get('category')
                skills.append(item_with_details)
        
        print('Final skills data:', json.dumps(skills, default=str))
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(skills, default=str)
        }
        
    except ClientError as e:
        print('Error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch student skills', 'details': str(e)})
        }
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch student skills', 'details': str(e)})
        }