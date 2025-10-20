import json
import boto3
import decimal
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o) if o % 1 > 0 else int(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        activity_id = event.get('pathParameters', {}).get('activityId')
        if not activity_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'ต้องระบุรหัสกิจกรรม'})
            }

        print(f'Fetching activity: {activity_id}')
        activities_table = dynamodb.Table('Activities')
        skills_table = dynamodb.Table('Skills')

        activity_res = activities_table.get_item(Key={'activityId': activity_id})
        if 'Item' not in activity_res:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'ไม่พบกิจกรรมที่ระบุ'})
            }

        activity = activity_res['Item']

        # ดึง skill เพิ่มเติม
        skill_info = {}
        skill_id = activity.get('skillId')
        if skill_id:
            try:
                skill_data = skills_table.get_item(Key={'skillId': skill_id})
                if 'Item' in skill_data:
                    skill_info = skill_data['Item']
            except Exception as e:
                print(f'Error fetching skill info: {str(e)}')

        # ✅ เพิ่ม fallback skillCategory
        if not activity.get('skillCategory') and skill_info.get('category'):
            activity['skillCategory'] = skill_info['category']

        # ✅ เพิ่ม locationId/locationName
        location_info = {
            'locationId': activity.get('locationId'),
            'locationName': activity.get('locationName') or activity.get('location')
        }

        detailed_activity = {
            # 🟩 Activity Info
            'activityId': activity.get('activityId'),
            'name': activity.get('name'),
            'description': activity.get('description'),
            **location_info,
            'startDateTime': activity.get('startDateTime'),
            'endDateTime': activity.get('endDateTime'),
            'organizerId': activity.get('organizerId'),
            'qrCode': activity.get('qrCode'),
            'imageUrl': activity.get('imageUrl'),
            'createdAt': activity.get('createdAt'),
            'updatedAt': activity.get('updatedAt'),

            # 🟦 UI Fields
            'skillCategory': activity.get('skillCategory', ''),
            'activityGroup': activity.get('activityGroup', ''),
            'level': activity.get('level', ''),
            'suitableYearLevel': activity.get('suitableYearLevel', 0),
            'requiredActivities': activity.get('requiredActivities', 0),
            'prerequisiteActivities': activity.get('prerequisiteActivities', []),

            # 🟨 PLO Section
            'plo': activity.get('plo', []),
            'ploDescriptions': activity.get('ploDescriptions', []),

            # 🟧 Skill Reference
            'skill': {
                'skillId': skill_info.get('skillId', skill_id),
                'name': skill_info.get('name', 'ไม่ระบุทักษะ'),
                'description': skill_info.get('description', ''),
                'category': skill_info.get('category', ''),
                'subcategory': skill_info.get('subcategory', ''),
                'yearLevel': skill_info.get('yearLevel', 0),
                'isRequired': skill_info.get('isRequired', False),
                'passingScore': skill_info.get('passingScore', 0),
                'requiredActivities': skill_info.get('requiredActivities', 0)
            }
        }

        # ล้างค่า None ก่อนส่งออก
        clean_data = {k: v for k, v in detailed_activity.items() if v is not None}

        print(f"✅ Loaded activity detail: {activity.get('name')}")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(clean_data, cls=DecimalEncoder, ensure_ascii=False)
        }

    except ClientError as e:
        print('DynamoDB Error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล', 'details': str(e)})
        }

    except Exception as e:
        print('Unexpected Error:', str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'เกิดข้อผิดพลาดที่ไม่คาดคิด', 'details': str(e)})
        }
