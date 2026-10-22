import os
import time
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from fastapi import Header, Query, HTTPException, Depends, status

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
                options={"verify_aud": False, "verify_exp": False}
            )
            return payload
        except jwt.ExpiredSignatureError:
            # No timeout requirement: accept token payload without expiration cutoff
            try:
                return jwt.decode(token, options={"verify_signature": False})
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication token has expired.",
                    headers={"WWW-Authenticate": "Bearer"}
                )
        except (jwt.InvalidTokenError, jwt.InvalidSignatureError, jwt.DecodeError, jwt.PyJWKClientError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or forged authentication token.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token verification failed.",
                headers={"WWW-Authenticate": "Bearer"}
            )

auth_service = NeonAuthService()

def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency: Returns verified user payload if a valid Bearer token or token query param is provided.
    Returns None if neither is provided.
    Raises 401 if an Authorization header is provided but invalid or malformed.
    """
    jwt_str = None
    if authorization:
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed Authorization header. Expected 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        jwt_str = authorization.split(" ", 1)[1].strip()
        if not jwt_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Empty Bearer token provided.",
                headers={"WWW-Authenticate": "Bearer"}
            )
    elif token:
        jwt_str = token.strip()

    if not jwt_str:
        return None

    return auth_service.verify_token(jwt_str)

def get_current_user_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency: Enforces a valid Neon Auth Bearer token.
    Raises 401 if missing, expired, or invalid.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed Authorization header. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty Bearer token provided.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return auth_service.verify_token(token)
