import json 
import os
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
ACTIVITIES_TABLE = os.getenv('ACTIVITIES_TABLE', 'Activities')

def lambda_handler(event, context):
    print("Incoming event:", json.dumps(event, ensure_ascii=False))

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    }

    # -------------------------------
    # ดึง HTTP method ให้รองรับหลายแบบ
    # -------------------------------
    http_method = ""

    # แบบ REST API (เก่า)
    if "httpMethod" in event:
        http_method = event.get("httpMethod", "")

    # แบบ HTTP API v2 / Lambda URL
    elif "requestContext" in event and "http" in event["requestContext"]:
        http_method = event["requestContext"]["http"].get("method", "")

    http_method = (http_method or "").upper()
    print("Resolved http_method:", http_method)

    # -------------------------------
    # CORS preflight (OPTIONS)
    # -------------------------------
    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": ""
        }

    # อนุญาตเฉพาะ DELETE
    if http_method != "DELETE":
        return {
            "statusCode": 405,
            "headers": headers,
            "body": json.dumps({"message": "Method Not Allowed"})
        }

    # -------------------------------
    # ดึง activityId จาก pathParameters
    # -------------------------------
    path_params = event.get("pathParameters") or {}
    activity_id = path_params.get("activityId")

    if not activity_id:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"message": "activityId is required"})
        }

    table = dynamodb.Table(ACTIVITIES_TABLE)

    try:
        table.delete_item(
            Key={"activityId": activity_id}
        )

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"message": "Activity deleted successfully"})
        }

    except ClientError as e:
        print("Delete error:", e)
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"message": "Internal server error"})
        }
