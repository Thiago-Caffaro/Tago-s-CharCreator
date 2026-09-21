from datetime import datetime

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session, select

from .database import get_session
from .models.user import AuthSession, User
from .services.security import token_hash

SESSION_COOKIE = "charcreator_session"


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    session: Session = Depends(get_session),
) -> User:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    auth_session = session.exec(
        select(AuthSession).where(AuthSession.token_hash == token_hash(session_token))
    ).first()
    if (
        not auth_session
        or auth_session.revoked_at is not None
        or auth_session.expires_at <= datetime.utcnow()
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    user = session.get(User, auth_session.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account disabled")
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator required")
    return user
