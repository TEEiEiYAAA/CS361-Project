import json
import boto3
import decimal
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Helper class to convert a DynamoDB item to JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    """
    GET /skills/all
    ดึงทักษะทั้งหมดจากตาราง Skills
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
        print('Fetching all skills from Skills table')
        
        # Connect to Skills table
        skills_table = dynamodb.Table('Skills')
        
        # Scan all skills
        response = skills_table.scan()
        
        skills = response.get('Items', [])
        print(f'Found {len(skills)} skills total')
        
        # Log skills for debugging
        for skill in skills:
            print(f'Skill {skill.get("skillId")}: {skill.get("name")} (isRequired: {skill.get("isRequired")})')
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(skills, cls=DecimalEncoder)
        }
        
    except ClientError as e:
        print(f'DynamoDB error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล',
                'details': str(e)
            })
        }
    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
                'details': str(e)
            })
        }