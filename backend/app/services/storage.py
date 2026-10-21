import os
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Ensure environment variables are loaded
ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

try:
    import boto3
    from botocore.client import Config
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

class NeonStorageService:
    """
    S3-compatible Object Storage service for Neon Lakebase Postgres.
    Stores and retrieves reports, evidence artifacts, and media attachments
    branching with the database.
    """
    def __init__(self):
        self.endpoint_url = os.getenv("AWS_ENDPOINT_URL_S3", "").strip()
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
        self.region = os.getenv("AWS_REGION", "ap-southeast-1").strip()
        self.bucket = "files"

    @property
    def is_configured(self) -> bool:
        return bool(BOTO3_AVAILABLE and self.endpoint_url and self.access_key and self.secret_key)

    def get_client(self):
        if not self.is_configured:
            return None
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(s3={"addressing_style": "path"})
        )

    def check_connection(self) -> Dict[str, Any]:
        if not self.is_configured:
            return {
                "configured": False,
                "connected": False,
                "provider": "Neon Object Storage",
                "message": "S3 credentials not configured; local filesystem fallback active."
            }
        try:
            s3 = self.get_client()
            response = s3.list_buckets()
            bucket_names = [b["Name"] for b in response.get("Buckets", [])]
            return {
                "configured": True,
                "connected": True,
                "provider": "Neon Object Storage (S3-compatible)",
                "bucket": self.bucket,
                "bucket_exists": self.bucket in bucket_names,
                "region": self.region,
                "message": f"Successfully connected to Neon Object Storage. Bucket '{self.bucket}' verified."
            }
        except Exception as e:
            return {
                "configured": True,
                "connected": False,
                "provider": "Neon Object Storage",
                "error": str(e),
                "message": "Failed to connect to Neon Object Storage."
            }

    def upload_file(self, local_path: Path, s3_key: str, content_type: Optional[str] = None) -> bool:
        if not self.is_configured:
            return False
        try:
            s3 = self.get_client()
            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type
            s3.upload_file(str(local_path), self.bucket, s3_key, ExtraArgs=extra_args if extra_args else None)
            return True
        except Exception as e:
            print(f"[STORAGE ERROR] Upload failed for {s3_key}: {e}")
            return False

    def generate_presigned_url(self, s3_key: str, expires_in: int = 3600) -> Optional[str]:
        if not self.is_configured:
            return None
        try:
            s3 = self.get_client()
            return s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": s3_key},
                ExpiresIn=expires_in
            )
        except Exception as e:
            print(f"[STORAGE ERROR] Presigning failed for {s3_key}: {e}")
            return None

    def delete_file(self, s3_key: str) -> bool:
        if not self.is_configured:
            return False
        try:
            s3 = self.get_client()
            s3.delete_object(Bucket=self.bucket, Key=s3_key)
            return True
        except Exception as e:
            print(f"[STORAGE ERROR] Deletion failed for {s3_key}: {e}")
            return False

storage_service = NeonStorageService()
