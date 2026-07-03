from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timezone
import uuid
from typing import List

from app.core.security import decode_token, oauth2_scheme
from app.db.db import db

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    email = payload.get("email")
    token_type = payload.get("type")
    
    if email is None or token_type != "access":
        raise credentials_exception
        
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user

async def log_action(user: dict, action: str, old_value: dict = None, new_value: dict = None):
    log_entry = {
        "_id": str(uuid.uuid4()),
        "user_id": user.get("_id"),
        "user_email": user.get("email"),
        "role": user.get("role"),
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "old_value": old_value,
        "new_value": new_value
    }
    await db.audit_logs.insert_one(log_entry)
