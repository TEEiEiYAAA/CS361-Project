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
    
    print(f'Looking up info for student: {student_id}')
    
    try:
        # ดึงข้อมูลนักศึกษาจากตาราง Students
        students_table = dynamodb.Table('Students')
        student_response = students_table.get_item(
            Key={'studentId': student_id}
        )
        
        student_data = student_response.get('Item', {})
        
        if not student_data:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'ไม่พบข้อมูลนักศึกษา'})
            }
        
        # สร้างข้อมูลที่จะส่งกลับ
        student_info = {
            'studentId': student_id,
            'name': student_data.get('name', ''),
            'yearLevel': student_data.get('yearLevel', 1),
            'department': student_data.get('department', ''),
            'advisorId': student_data.get('advisorId', ''),
            'requiredSkills': student_data.get('requiredSkills', 0)
        }
        
        print('Student info:', json.dumps(student_info, default=str))
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(student_info, default=str)
        }
        
    except ClientError as e:
        print('Error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch student info', 'details': str(e)})
        }
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch student info', 'details': str(e)})
        }