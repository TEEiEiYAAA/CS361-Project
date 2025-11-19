import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')

# ถ้าอยากใช้ env var ก็เปลี่ยนเป็น os.getenv(...)
ACTIVITIES_TABLE = 'Activities'


def response(status_code, body_dict):
    """helper สำหรับตอบกลับพร้อม CORS"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body_dict, ensure_ascii=False)
    }


def lambda_handler(event, context):
    # ✅ รองรับ preflight (OPTIONS) ด้วย
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"success": True})

    # ===== 1) ดึง activityId จาก path =====
    path_params = event.get("pathParameters") or {}
    activity_id = path_params.get("activityId")

    if not activity_id:
        return response(400, {
            "success": False,
            "message": "ต้องระบุ activityId ใน path เช่น /activities/act001"
        })

    # ===== 2) อ่าน body (JSON) =====
    try:
        body = event.get("body") or "{}"
        if isinstance(body, str):
            body = json.loads(body)
    except json.JSONDecodeError:
        return response(400, {
            "success": False,
            "message": "รูปแบบ body ต้องเป็น JSON เท่านั้น"
        })

    # body ตอนส่งมาควรเป็นประมาณนี้
    # {
    #   "name": "Python programming (แก้ไขแล้ว)",
    #   "description": "...",
    #   "group": "วิชาการ",
    #   "yearLevel": "ปี 3",
    #   "level": "พื้นฐาน",
    #   "startDateTime": "2025-11-19T03:45",
    #   "endDateTime": "2025-11-19T06:00",
    #   "location": "ตึกเรียนรวม 4",
    #   "organizerId": "CS Club",
    #   "required": "ปฐมนิเทศ",
    #   "category": ["PLO2"],
    #   "ploDescriptions": ["ทักษะการพัฒนาและออกแบบระบบ"],
    #   "skillCategory": "Hard Skill",
    #   "coverImage": "https://.../act001.png"
    # }

    if not body:
        return response(400, {
            "success": False,
            "message": "ไม่มี field ใดถูกส่งมาใน body"
        })

    # ===== 3) เลือก field ที่อนุญาตให้แก้ไข =====
    # ปรับรายการนี้ให้ตรงกับ schema จริงของตาราง Activities ของโปรเจกต์นะ
    allowed_fields = {
    "name",
    "description",
    "locationId",
    "startDateTime",
    "endDateTime",
    "skillCategory",
    "skillId",
    "plo",
    "ploDescriptions",
    "level",
    "yearLevel",
    "requiredActivities",
    "organizerId",
    #"coverImage"
    "imageUrl",
}


    update_parts = []
    expr_attr_names = {}
    expr_attr_values = {}

    for key, value in body.items():
        if key in allowed_fields and value is not None:
            update_parts.append(f"#{key} = :{key}")
            expr_attr_names[f"#{key}"] = key
            expr_attr_values[f":{key}"] = value

    if not update_parts:
        return response(400, {
            "success": False,
            "message": "ไม่มี field ที่อนุญาตให้แก้ไขถูกส่งมา"
        })

    update_expression = "SET " + ", ".join(update_parts)

    table = dynamodb.Table(ACTIVITIES_TABLE)

    try:
        # ===== 4) เรียก update_item ไปที่ DynamoDB =====
        result = table.update_item(
            Key={"activityId": activity_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues="ALL_NEW"   # ให้ส่งค่าหลังอัปเดตกลับมา
        )

        updated_item = result.get("Attributes", {})

        return response(200, {
            "success": True,
            "message": "แก้ไขกิจกรรมเรียบร้อยแล้ว",
            "activity": updated_item
        })

    except ClientError as e:
        print("DynamoDB error:", e)
        return response(500, {
            "success": False,
            "message": "เกิดข้อผิดพลาดในการอัปเดตกิจกรรม"
        })
    except Exception as e:
        print("Unexpected error:", e)
        return response(500, {
            "success": False,
            "message": "เกิดข้อผิดพลาดภายในระบบ"
        })
