import json
import boto3
import decimal
import uuid
from datetime import datetime, timezone, timedelta
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
    POST /activities/{activityId}/assessment
    บันทึกแบบประเมินกิจกรรม
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
                'body': json.dumps({
                    'success': False,
                    'message': 'ข้อมูลไม่ครบถ้วน'
                })
            }
        
        request_body = json.loads(event.get('body'))
        
        # Get activityId from path parameters
        activity_id = event.get('pathParameters', {}).get('activityId')
        
        if not activity_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'ต้องระบุรหัสกิจกรรม'
                })
            }
        
        # Extract required fields
        student_id = request_body.get('studentId')
        if not student_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'ต้องระบุรหัสนักศึกษา'
                })
            }
        
        # Validate assessment data
        required_ratings = ['overall_satisfaction', 'content_quality', 'instructor_quality', 'organization', 'recommendation']
        for rating in required_ratings:
            if rating not in request_body or not isinstance(request_body[rating], int) or request_body[rating] not in [1, 2, 3, 4, 5]:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'message': f'ข้อมูลการประเมิน {rating} ไม่ถูกต้อง (ต้องเป็นตัวเลข 1-5)'
                    })
                }
        
        print(f"Processing assessment for activity {activity_id} by student {student_id}")
        
        # Connect to DynamoDB tables
        participations_table = dynamodb.Table('ActivityParticipations')
        
        # Step 1: Check if student participated in this activity
        print("Step 1: Checking student participation...")
        participations_response = participations_table.scan(
            FilterExpression='studentId = :studentId AND activityId = :activityId',
            ExpressionAttributeValues={
                ':studentId': student_id,
                ':activityId': activity_id
            }
        )
        
        participations = participations_response.get('Items', [])
        
        if not participations:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'คุณไม่ได้เข้าร่วมกิจกรรมนี้'
                })
            }
        
        participation = participations[0]
        participation_id = participation['participationId']
        
        # Step 2: Check if already confirmed participation
        if not participation.get('isConfirmed', False):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'กรุณายืนยันการเข้าร่วมกิจกรรมก่อนทำแบบประเมิน'
                })
            }
        
        # Step 3: Check if assessment already completed
        if participation.get('surveyCompleted', False):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'คุณได้ทำแบบประเมินกิจกรรมนี้แล้ว'
                })
            }
        
        # Step 4: Create assessment record
        print("Step 4: Creating assessment record...")
        
        # ใช้เวลาไทย (UTC+7)
        thai_tz = timezone(timedelta(hours=7))
        current_time = datetime.now(thai_tz)
        current_time_str = current_time.isoformat()
        
        # Create assessment data
        assessment_data = {
            'assessmentId': str(uuid.uuid4()),
            'activityId': activity_id,
            'studentId': student_id,
            'participationId': participation_id,
            
            # Rating scores (1-5)
            'overallSatisfaction': request_body['overall_satisfaction'],
            'contentQuality': request_body['content_quality'],
            'instructorQuality': request_body['instructor_quality'],
            'organization': request_body['organization'],
            'recommendation': request_body['recommendation'],
            
            # Calculate average score
            'averageScore': decimal.Decimal(str(request_body.get('average_score', 0))),
            
            # Comments
            'comments': request_body.get('comments', ''),
            
            # Timestamps
            'submittedAt': current_time_str,
            'createdAt': current_time_str
        }
        
        # Try to create Assessments table if it doesn't exist and save assessment
        try:
            assessments_table = dynamodb.Table('Assessments')
            assessments_table.put_item(Item=assessment_data)
            print("Assessment saved to Assessments table")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                print("Assessments table not found, skipping assessment storage")
            else:
                print(f"Error saving assessment: {e}")
        
        # Step 5: Update participation record
        print("Step 5: Updating participation record...")
        
        try:
            participations_table.update_item(
                Key={
                    'participationId': participation_id,
                    'activityId': activity_id
                },
                UpdateExpression='SET surveyCompleted = :completed, surveyCompletedAt = :completedAt, updatedAt = :updatedAt',
                ExpressionAttributeValues={
                    ':completed': True,
                    ':completedAt': current_time_str,
                    ':updatedAt': current_time_str
                }
            )
            
            print(f"Successfully updated participation {participation_id}")
            
            # Get activity name for response
            activities_table = dynamodb.Table('Activities')
            activity_response = activities_table.get_item(
                Key={'activityId': activity_id}
            )
            
            activity_name = 'กิจกรรม'
            if 'Item' in activity_response:
                activity_name = activity_response['Item'].get('name', 'กิจกรรม')
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': f'ส่งแบบประเมิน "{activity_name}" สำเร็จ! ขอบคุณสำหรับความคิดเห็น',
                    'assessmentId': assessment_data['assessmentId'],
                    'averageScore': float(assessment_data['averageScore']),
                    'submittedAt': current_time_str
                })
            }
            
        except ClientError as e:
            print(f"Error updating participation: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
                })
            }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': 'รูปแบบข้อมูลไม่ถูกต้อง'
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
            })
        }