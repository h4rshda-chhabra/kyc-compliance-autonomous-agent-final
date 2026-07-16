import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from app.config.settings import get_settings

ALGORITHM = "HS256"


def get_password_hash(password: str) -> str:
    """Generate secure hash using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = os.urandom(16)
    db_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        100000
    )
    return f"{salt.hex()}${db_hash.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify a plain password against its PBKDF2 hash."""
    try:
        if "$" not in hashed_password:
            return False
        salt_hex, hash_hex = hashed_password.split("$", 1)
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            100000
        )
        return hmac.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a standard HS256-signed JWT token using standard Python libraries."""
    settings = get_settings()
    
    # Header
    header = {"alg": ALGORITHM, "typ": "JWT"}
    encoded_header = _base64url_encode(json.dumps(header).encode("utf-8"))
    
    # Payload
    payload = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload["exp"] = int(expire.timestamp())
    encoded_payload = _base64url_encode(json.dumps(payload).encode("utf-8"))
    
    # Signature
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    key = settings.secret_key.encode("utf-8")
    sig = hmac.new(key, signing_input, hashlib.sha256).digest()
    encoded_sig = _base64url_encode(sig)
    
    return f"{encoded_header}.{encoded_payload}.{encoded_sig}"


def decode_access_token(token: str) -> dict | None:
    """Decode and verify signature/expiration of an HS256-signed JWT token."""
    settings = get_settings()
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        encoded_header, encoded_payload, encoded_sig = parts
        
        # Verify Signature
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        key = settings.secret_key.encode("utf-8")
        expected_sig = hmac.new(key, signing_input, hashlib.sha256).digest()
        
        if not hmac.compare_digest(_base64url_decode(encoded_sig), expected_sig):
            return None
        
        # Decode and Parse Payload
        payload_bytes = _base64url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))
        
        # Verify Expiration
        exp = payload.get("exp")
        if exp is None:
            return None
        if datetime.now(timezone.utc).timestamp() > exp:
            return None
            
        return payload
    except Exception:
        return None
