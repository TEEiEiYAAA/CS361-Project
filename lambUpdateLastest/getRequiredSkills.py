import json
import boto3
from botocore.exceptions import ClientError

# สร้าง DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    print('Event received:', json.dumps(event))
    
    # ดึง yearLevel จาก path parameters
    year_level = event.get('pathParameters', {}).get('yearLevel')
    
    if not year_level:
        print('No yearLevel provided')
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'ต้องระบุชั้นปีที่ศึกษา'})
        }
    
    print(f'Looking up required skills for year level: {year_level}')
    
    try:
        # ค้นหาทักษะที่บังคับสำหรับชั้นปีที่ระบุ
        skills_table = dynamodb.Table('Skills')
        
        response = skills_table.scan(
            FilterExpression='isRequired = :isRequired AND yearLevel = :yearLevel',
            ExpressionAttributeValues={
                ':isRequired': True,
                ':yearLevel': int(year_level)
            }
        )
        
        required_skills = response.get('Items', [])
        print(f'Found {len(required_skills)} required skills for year level {year_level}')
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(required_skills, default=str)
        }
        
    except ClientError as e:
        print('Error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch required skills', 'details': str(e)})
        }
    except Exception as e:
        print('Unexpected error:', str(e))
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดในการดึงข้อมูลทักษะที่บังคับ', 'details': str(e)})
        }