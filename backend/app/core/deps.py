import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)


def get_current_user_dep(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user


def require_roles(*allowed_roles: UserRole):
    """Dependency factory: only lets requests from users whose DB role is one of
    `allowed_roles` through. Authorization is always checked against the role
    stored on the user record (re-fetched via get_current_user_dep on every
    request), never against the role claim embedded in the JWT — so a role
    change or deactivation takes effect immediately, even for tokens issued
    before the change.
    """

    def _dependency(current_user: User = Depends(get_current_user_dep)) -> User:
        if current_user.role not in allowed_roles:
            allowed = ", ".join(role.value for role in allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of the following roles: {allowed}",
            )
        return current_user

    return _dependency


def require_admin():
    """Dependency factory restricting an endpoint to ADMIN users only."""
    return require_roles(UserRole.ADMIN)


def require_compliance_officer():
    """Dependency factory restricting an endpoint to COMPLIANCE_OFFICER users only."""
    return require_roles(UserRole.COMPLIANCE_OFFICER)
