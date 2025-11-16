import json
import os
import uuid
import shutil
from datetime import datetime, timezone, timedelta

import boto3
from fpdf import FPDF

# ======== เช็ค Pillow (PIL) จาก Layer ========
HAS_PILLOW = False
try:
    from PIL import Image  # noqa: F401
    HAS_PILLOW = True
    print("[DEBUG] Pillow (PIL) imported OK")
except Exception as e:
    HAS_PILLOW = False
    print("[WARN] Pillow (PIL) import FAILED:", repr(e))
# ===========================================

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

ACTIVITIES_TABLE = 'Activities'
STUDENTS_TABLE = 'Students'
PARTICIPATIONS_TABLE = 'ActivityParticipations'
CERTIFICATES_TABLE = 'Certificates'

# ชื่อ S3 bucket ตั้งใน Environment variable ของ Lambda
CERT_BUCKET = os.getenv('CERT_BUCKET', '')

# โฟลเดอร์โค้ด (read-only) และโฟลเดอร์ชั่วคราว (เขียนได้)
FONT_SRC_DIR = os.path.dirname(__file__)  # /var/task
FONT_DST_DIR = "/tmp"                     # เขียนไฟล์ได้บน Lambda

THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
]


def prepare_fonts_in_tmp():
    """คัดลอกไฟล์ฟอนต์จากโฟลเดอร์โค้ดไปไว้ใน /tmp (เขียนได้)"""
    os.makedirs(FONT_DST_DIR, exist_ok=True)

    font_files = [
        "THSarabunNew.ttf",
        "THSarabunNew Bold.ttf",
    ]

    for fname in font_files:
        src = os.path.join(FONT_SRC_DIR, fname)
        dst = os.path.join(FONT_DST_DIR, fname)
        if not os.path.exists(dst):
            try:
                shutil.copyfile(src, dst)
                print(f"[DEBUG] Copied font {fname} to /tmp")
            except Exception as e:
                print(f"[ERROR] Copy font {fname} failed:", repr(e))


def format_thai_date(iso_str: str) -> str:
    """
    แปลงวันที่ ISO string เช่น '2025-05-25T16:00:00Z'
    -> '25 พฤษภาคม 2568'
    ถ้า parse ไม่ได้จะส่งคืน string เดิม
    """
    if not iso_str:
        return ""

    try:
        s = iso_str
        # รองรับรูปแบบที่ลงท้ายด้วย 'Z'
        if s.endswith("Z"):
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        else:
            dt = datetime.fromisoformat(s)

        # แปลงเป็นเวลาไทย
        dt_th = dt.astimezone(timezone(timedelta(hours=7)))
        day = dt_th.day
        month_name = THAI_MONTHS[dt_th.month - 1]
        year_th = dt_th.year + 543

        return f"{day} {month_name} {year_th}"
    except Exception as e:
        print("[WARN] format_thai_date parse failed:", repr(e))
        return iso_str


def generate_certificate_pdf(student_name, activity_name, organizer_name, activity_date):
    """
    สร้างไฟล์ PDF เกียรติบัตร (เวอร์ชันสวยงาม)
    ใช้พื้นหลัง certificate_bg.png + ฟอนต์ไทย THSarabun
    """
    prepare_fonts_in_tmp()

    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()

    # ===== พื้นหลังเกียรติบัตร =====
    bg_path = os.path.join(FONT_SRC_DIR, "certificate_bg.png")
    if HAS_PILLOW and os.path.exists(bg_path):
        try:
            pdf.image(bg_path, x=0, y=0, w=297, h=210)
            print("[DEBUG] Drew certificate background")
        except Exception as e:
            print("[WARN] Failed to draw certificate background:", repr(e))
    else:
        # fallback วาดกรอบง่าย ๆ ถ้าไม่มีรูปหรือไม่มี Pillow
        print("[INFO] No background image or Pillow, drawing simple frame instead")
        pdf.set_draw_color(23, 53, 101)  # #173565
        pdf.set_line_width(2)
        margin_outer = 10
        pdf.rect(margin_outer, margin_outer, 297 - 2 * margin_outer, 210 - 2 * margin_outer)

    # ===== ฟอนต์ไทย =====
    pdf.add_font("THSarabunNew", "", os.path.join(FONT_DST_DIR, "THSarabunNew.ttf"), uni=True)
    pdf.add_font("THSarabunNew", "B", os.path.join(FONT_DST_DIR, "THSarabunNew Bold.ttf"), uni=True)

    # ===== ส่วนหัว: ประกาศนียบัตร =====
    pdf.set_xy(0, 38)
    pdf.set_font("THSarabunNew", "B", 60)
    pdf.cell(0, 15, "ประกาศนียบัตร", align="C")

    # คำบรรยายใต้หัวข้อ
    pdf.set_xy(0, 62)
    pdf.set_font("THSarabunNew", "", 20)
    pdf.set_text_color(0, 110, 120)   # สีฟ้าอมเขียวเหมือนตัวอย่าง
    pdf.cell(0, 10, "ขอมอบเกียรติบัตรนี้เพื่อแสดงไว้ว่า", align="C")

    # reset สีดำ
    pdf.set_text_color(0, 0, 0)

    # ===== ชื่อนักศึกษา =====
    pdf.set_xy(0, 92)
    pdf.set_font("THSarabunNew", "B", 44)
    pdf.cell(0, 18, student_name, align="C")

    # ===== เส้นคั่นใต้ชื่อ =====
    pdf.set_draw_color(0, 150, 150)   # เขียวฟ้า
    pdf.set_line_width(1.2)
    pdf.line(35, 118, 262, 118)

    # ===== ข้อความกิจกรรม (3 บรรทัด แยก cell ชัด ๆ) =====
    pdf.set_font("THSarabunNew", "", 20)

    # บรรทัดที่ 1
    pdf.set_xy(20, 132)
    pdf.cell(
        257, 10,
        f"ได้เข้าร่วมการอบรมกิจกรรม {activity_name}",
        align="C"
    )

    # บรรทัดที่ 2
    pdf.set_xy(20, 145)
    pdf.cell(
        257, 10,
        f"ซึ่งจัดขึ้นโดย {organizer_name}",
        align="C"
    )

    # บรรทัดที่ 3
    pdf.set_xy(20, 158)
    pdf.cell(
        257, 10,
        f"ในวันที่ {activity_date}",
        align="C"
    )

    return pdf.output(dest="S")



def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

    # CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        if not CERT_BUCKET:
            return _bad_request(headers, 'ระบบยังไม่ได้ตั้งค่า CERT_BUCKET')

        path_params = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}

        activity_id = path_params.get('activityId')
        student_id = query_params.get('studentId')

        if not activity_id or not student_id:
            return _bad_request(headers, 'ต้องระบุ activityId และ studentId')

        # ตรวจสิทธิ์ใน ActivityParticipations
        participations_table = dynamodb.Table(PARTICIPATIONS_TABLE)
        part_resp = participations_table.get_item(
            Key={'studentId': student_id, 'activityId': activity_id}
        )
        if 'Item' not in part_resp:
            return _bad_request(headers, 'ไม่พบบันทึกการเข้าร่วมกิจกรรม')

        participation = part_resp['Item']

        if not participation.get('isConfirmed', False):
            return _bad_request(headers, 'ยังไม่ได้ยืนยันการเข้าร่วมกิจกรรม')

        if not participation.get('surveyCompleted', False):
            return _bad_request(headers, 'ต้องทำแบบประเมินกิจกรรมให้เรียบร้อยก่อนรับเกียรติบัตร')

        # ตาราง Certificates: ถ้ามีแล้วใช้ของเดิม ถ้าไม่มีให้สร้างใหม่
        cert_table = dynamodb.Table(CERTIFICATES_TABLE)
        cert_resp = cert_table.get_item(
            Key={'studentId': student_id, 'activityId': activity_id}
        )

        thai_tz = timezone(timedelta(hours=7))
        now = datetime.now(thai_tz)
        now_str = now.isoformat()

        if 'Item' in cert_resp:
            cert_item = cert_resp['Item']
        else:
            cert_item = {
                'studentId': student_id,
                'activityId': activity_id,
                'certificateId': str(uuid.uuid4()),
                'issuedAt': now_str,
                'status': 'issued'
            }
            cert_table.put_item(Item=cert_item)

        # ดึงข้อมูล Activity + Student จาก DynamoDB
        activities_table = dynamodb.Table(ACTIVITIES_TABLE)
        students_table = dynamodb.Table(STUDENTS_TABLE)

        act_resp = activities_table.get_item(Key={'activityId': activity_id})
        stu_resp = students_table.get_item(Key={'studentId': student_id})

        activity = act_resp.get('Item', {}) if act_resp else {}
        student = stu_resp.get('Item', {}) if stu_resp else {}

        student_name = student.get('name')
        activity_name = activity.get('name') 
        organizer_name = activity.get('organizerId') 
        start_datetime = activity.get('startDateTime') or ""

        # แปลงวันที่เป็นแบบไทย ถ้ามีค่า; ถ้าไม่มีใช้ข้อความ default
        activity_date_text = format_thai_date(start_datetime)

        # สร้าง PDF เกียรติบัตร
        pdf_bytes = generate_certificate_pdf(
            student_name, activity_name, organizer_name, activity_date_text
        )

        key = f"certificates/{activity_id}/{student_id}_certificate.pdf"

        s3.put_object(
            Bucket=CERT_BUCKET,
            Key=key,
            Body=pdf_bytes,
            ContentType="application/pdf"
        )

        file_url = f"https://{CERT_BUCKET}.s3.amazonaws.com/{key}"

        result = {
            'certificateId': cert_item['certificateId'],
            'issuedAt': cert_item['issuedAt'],
            'studentId': student_id,
            'studentName': student_name,
            'activityId': activity_id,
            'activityName': activity_name,
            'organizerName': organizer_name,
            'startDateTime': start_datetime,
            'pdfKey': key,
            'pdfUrl': file_url,
        }

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'certificate': result}, ensure_ascii=False)
        }

    except Exception as e:
        print("Error in issueCertificate:", repr(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'เกิดข้อผิดพลาดภายในระบบ'}, ensure_ascii=False)
        }


def _bad_request(headers, msg):
    return {
        'statusCode': 400,
        'headers': headers,
        'body': json.dumps({'success': False, 'message': msg}, ensure_ascii=False)
    }
