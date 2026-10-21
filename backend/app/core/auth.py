import os
import time
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from fastapi import Header, HTTPException, Depends, status

# Ensure environment variables are loaded
ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

try:
    import jwt
    from jwt import PyJWKClient
    PYJWT_AVAILABLE = True
except ImportError:
    PYJWT_AVAILABLE = False

class NeonAuthService:
    """
    Validates Managed Better Auth sessions/JWTs issued by Neon.
    Keys are fetched and cached from NEON_AUTH_JWKS_URL using EdDSA (Ed25519).
    """
    def __init__(self):
        self.base_url = os.getenv("NEON_AUTH_BASE_URL", "").strip()
        self.jwks_url = os.getenv("NEON_AUTH_JWKS_URL", "").strip()
        self._jwks_client: Optional[PyJWKClient] = None
        if self.jwks_url and PYJWT_AVAILABLE:
            try:
                self._jwks_client = PyJWKClient(self.jwks_url, cache_keys=True, max_cached_keys=16)
            except Exception as e:
                print(f"[AUTH WARN] Could not initialize JWKS client: {e}")

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.jwks_url and PYJWT_AVAILABLE)

    def check_status(self) -> Dict[str, Any]:
        if not self.is_configured:
            return {
                "configured": False,
                "provider": "Neon Managed Better Auth",
                "message": "Neon Auth environment variables not configured. Running in open forensic mode."
            }
        return {
            "configured": True,
            "provider": "Neon Managed Better Auth",
            "base_url": self.base_url,
            "jwks_url": self.jwks_url,
            "algorithm": "EdDSA (Ed25519)",
            "message": "Neon Managed Better Auth is configured and ready for token verification."
        }

    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verifies a Bearer JWT issued by Neon Managed Better Auth against the remote JWKS.
        """
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Neon Auth service is not configured on this server."
            )
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["EdDSA"],
                options={"verify_aud": False}
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            )

auth_service = NeonAuthService()

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency: Returns verified user payload if a valid Bearer token is provided.
    Returns None if no token is provided.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        return auth_service.verify_token(token)
    except HTTPException:
        return None

def get_current_user_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency: Enforces a valid Neon Auth Bearer token.
    Raises 401 if missing, expired, or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = authorization.split(" ", 1)[1].strip()
    return auth_service.verify_token(token)
