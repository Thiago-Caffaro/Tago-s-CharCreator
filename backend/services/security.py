import base64
import hashlib
import secrets
from pathlib import Path

import bcrypt
from cryptography.fernet import Fernet, InvalidToken


def hash_password(password: str) -> str:
    if len(password) < 4:
        raise ValueError("Password must contain at least 4 characters")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, encoded: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), encoded.encode("ascii"))
    except (ValueError, TypeError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(48)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _secret_path() -> Path:
    from ..config import settings
    return Path(settings.app_secret_file)


def get_or_create_secret() -> bytes:
    path = _secret_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raw = path.read_bytes().strip()
        if len(raw) == 44:
            return raw
    raw = Fernet.generate_key()
    path.write_bytes(raw)
    return raw


def encrypt_secret(value: str) -> str:
    if not value:
        return ""
    return Fernet(get_or_create_secret()).encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(value: str) -> str:
    if not value:
        return ""
    try:
        return Fernet(get_or_create_secret()).decrypt(value.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        return ""
