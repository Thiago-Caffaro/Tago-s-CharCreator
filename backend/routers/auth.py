from datetime import datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ..auth import SESSION_COOKIE, get_current_user
from ..database import get_session
from ..models.user import AuthSession, User, UserRead
from ..services.security import new_session_token, token_hash, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login", response_model=UserRead)
def login(data: LoginRequest, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == data.username.strip())).first()
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha inválidos")
    token = new_session_token()
    session.add(AuthSession(
        user_id=user.id,
        token_hash=token_hash(token),
        expires_at=datetime.utcnow() + timedelta(days=30),
    ))
    session.commit()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=30 * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return user


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    session: Session = Depends(get_session),
):
    if session_token:
        row = session.exec(
            select(AuthSession).where(AuthSession.token_hash == token_hash(session_token))
        ).first()
        if row:
            row.revoked_at = datetime.utcnow()
            session.add(row)
            session.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user
