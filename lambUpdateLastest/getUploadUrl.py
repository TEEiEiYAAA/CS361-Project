import json, os, mimetypes
from datetime import datetime, timezone
from uuid import uuid4
import boto3

# ---------- Config ----------
s3 = boto3.client("s3")
BUCKET = os.getenv("BUCKET", "achievehub-activity-images")
KEY_PREFIX = os.getenv("KEY_PREFIX", "activities")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp"}

# ---------- HTTP helpers ----------
def _cors_headers():
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT",
    }

def respond_ok(body: dict, status: int = 200):
    return {"statusCode": status, "headers": _cors_headers(), "body": json.dumps(body)}

def respond_err(status: int, message: str):
    return respond_ok({"error": message}, status)

# ---------- Main handler ----------
def handler(event, context):
    # 1) CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return respond_ok({})

    # 2) parse body (JSON)
    raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        import base64
        raw = base64.b64decode(raw).decode("utf-8", "ignore")

    try:
        body = json.loads(raw) if raw else {}
    except Exception:
        return respond_err(400, "Body must be JSON")

    # 3) read inputs
    # ข้อมูลอาจอยู่ใน body หรืออยู่บน root event (เพราะ mapping template)
    file_name = (
        body.get("fileName")
        or body.get("filename")
        or event.get("fileName")
        or event.get("filename")
        or ""
    )
    file_name = file_name.strip() if isinstance(file_name, str) else ""

    file_type = (
        body.get("fileType")
        or body.get("file_type")
        or body.get("contentType")
        or event.get("fileType")
        or event.get("file_type")
        or event.get("contentType")
        or ""
    )
    file_type = file_type.strip() if isinstance(file_type, str) else ""

    if not file_name and not file_type:
        return respond_err(400, "fileName หรือ fileType ต้องไม่ว่าง")

    # 4) หา extension
    ext = os.path.splitext(file_name)[1].lower()
    if ext not in ALLOWED_EXT:
        mime = (file_type or "").lower()
        if "png" in mime:
            ext = ".png"
        elif "jpeg" in mime or "jpg" in mime:
            ext = ".jpg"
        elif "webp" in mime:
            ext = ".webp"
        else:
            # ตรงนี้จะไม่เจอสำหรับไฟล์รูปปกติ
            return respond_err(400, f"ไม่รองรับไฟล์ประเภทนี้: {file_name or file_type}")

    content_type = file_type or mimetypes.types_map.get(ext, "application/octet-stream")

    # 5) สร้าง key เช่น activities/2025/11/13/<uuid>.png
    today = datetime.now(timezone.utc).strftime("%Y/%m/%d")
    key = f"{KEY_PREFIX}/{today}/{uuid4().hex}{ext}"

    try:
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": content_type,
                "ACL": "public-read",
            },
            ExpiresIn=300,
        )
    except Exception as e:
        return respond_err(500, f"Failed to generate presigned URL: {e}")

    object_url = f"https://{BUCKET}.s3.amazonaws.com/{key}"

    return respond_ok(
        {
            "uploadUrl": upload_url,
            "objectUrl": object_url,
            "key": key,
            "contentType": content_type,
        }
    )
