from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone, timedelta
import uuid
from typing import List

from app.models.schemas import (
    UserLogin, UserRegister, UserResponse, TokenResponse, UserUpdate,
    DepartmentCreate, DepartmentResponse
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
)
from app.db.db import db
from app.routes.dependencies import get_current_user, RoleChecker, log_action

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    # Check department if applicable
    if user_data.department_id:
        dept = await db.departments.find_one({"_id": user_data.department_id})
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department {user_data.department_id} does not exist"
            )

    user_id = str(uuid.uuid4())
    hashed_pwd = get_password_hash(user_data.password)
    
    new_user = {
        "_id": user_id,
        "email": user_data.email,
        "hashed_password": hashed_pwd,
        "name": user_data.name,
        "role": user_data.role,
        "department_id": user_data.department_id,
        "is_verified": True,  # Auto-verify for simplicity
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Generate tokens
    user_payload = {"sub": user_id, "email": user_data.email, "role": user_data.role}
    access_token = create_access_token(data=user_payload)
    refresh_token = create_refresh_token(data=user_payload)
    
    await log_action(new_user, "REGISTER", None, {"email": user_data.email, "role": user_data.role})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = user["_id"]
    user_payload = {"sub": user_id, "email": user["email"], "role": user["role"]}
    
    # Adjust expiration if remember_me is checked
    access_delta = timedelta(days=1) if credentials.remember_me else None
    refresh_delta = timedelta(days=30) if credentials.remember_me else None
    
    access_token = create_access_token(data=user_payload, expires_delta=access_delta)
    refresh_token = create_refresh_token(data=user_payload, expires_delta=refresh_delta)
    
    await log_action(user, "LOGIN")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Dict[str, str])
async def refresh(payload: Dict[str, str]):
    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token is required")
        
    try:
        decoded = decode_token(refresh_token)
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        email = decoded.get("email")
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        user_payload = {"sub": user["_id"], "email": user["email"], "role": user["role"]}
        access_token = create_access_token(data=user_payload)
        new_refresh = create_refresh_token(data=user_payload)
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {str(e)}")

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    old_val = {k: current_user.get(k) for k in ["name", "email", "department_id"] if k in current_user}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.email is not None:
        # Check if email is being updated and already taken
        if data.email != current_user["email"]:
            exists = await db.users.find_one({"email": data.email})
            if exists:
                raise HTTPException(status_code=400, detail="Email already taken")
            update_data["email"] = data.email
    if data.password is not None:
        update_data["hashed_password"] = get_password_hash(data.password)
    if data.department_id is not None:
        update_data["department_id"] = data.department_id

    if update_data:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_data})
        updated_user = await db.users.find_one({"_id": current_user["_id"]})
        await log_action(current_user, "UPDATE_PROFILE", old_val, update_data)
        return updated_user
        
    return current_user

@router.post("/forgot-password")
async def forgot_password(payload: Dict[str, str]):
    email = payload.get("email")
    user = await db.users.find_one({"email": email})
    if not user:
        # Avoid user enumeration, pretend it works
        return {"message": "If the email exists, a password reset link has been sent."}
    
    # Simulate sending email
    reset_token = str(uuid.uuid4())
    # Save reset token inside user object
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"reset_token": reset_token}})
    
    return {
        "message": "If the email exists, a password reset link has been sent.",
        "debug_reset_token": reset_token  # Expose token for frontend to use in reset flow
    }

@router.post("/reset-password")
async def reset_password(payload: Dict[str, str]):
    token = payload.get("token")
    password = payload.get("password")
    
    if not token or not password:
        raise HTTPException(status_code=400, detail="Token and password are required")
        
    user = await db.users.find_one({"reset_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    hashed_pwd = get_password_hash(password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hashed_pwd}, "$unset": {"reset_token": ""}}
    )
    
    await log_action(user, "RESET_PASSWORD")
    return {"message": "Password reset successful"}

# ----------------- ADMIN USER MANAGEMENT -----------------
@router.get("/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(RoleChecker(["Administrator"]))):
    cursor = db.users.find({})
    return await cursor.to_list(length=1000)

@router.put("/users/{user_id}", response_model=UserResponse)
async def admin_update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(RoleChecker(["Administrator"]))):
    target_user = await db.users.find_one({"_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.email is not None:
        update_data["email"] = data.email
    if data.department_id is not None:
        update_data["department_id"] = data.department_id

    if update_data:
        await db.users.update_one({"_id": user_id}, {"$set": update_data})
        updated = await db.users.find_one({"_id": user_id})
        await log_action(current_user, f"ADMIN_UPDATE_USER_{user_id}", target_user, update_data)
        return updated
    return target_user

@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(RoleChecker(["Administrator"]))):
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
        
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db.users.delete_one({"_id": user_id})
    await log_action(current_user, f"ADMIN_DELETE_USER_{user_id}", target, None)
    return {"message": "User deleted successfully"}

# ----------------- DEPARTMENTS ROUTING -----------------
@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(current_user: dict = Depends(get_current_user)):
    cursor = db.departments.find({})
    return await cursor.to_list(length=100)

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(dept: DepartmentCreate, current_user: dict = Depends(RoleChecker(["Administrator"]))):
    existing = await db.departments.find_one({"_id": dept.id})
    if existing:
        raise HTTPException(status_code=400, detail="Department ID already exists")
        
    new_dept = {
        "_id": dept.id,
        "name": dept.name,
        "budget_allocated": dept.budget_allocated,
        "budget_spent": dept.budget_spent,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.departments.insert_one(new_dept)
    await log_action(current_user, "CREATE_DEPARTMENT", None, new_dept)
    return new_dept

@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(dept_id: str, data: Dict[str, Any], current_user: dict = Depends(RoleChecker(["Administrator"]))):
    dept = await db.departments.find_one({"_id": dept_id})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    update_data = {}
    if "name" in data:
        update_data["name"] = data["name"]
    if "budget_allocated" in data:
        update_data["budget_allocated"] = float(data["budget_allocated"])
    if "budget_spent" in data:
        update_data["budget_spent"] = float(data["budget_spent"])
        
    if update_data:
        await db.departments.update_one({"_id": dept_id}, {"$set": update_data})
        updated = await db.departments.find_one({"_id": dept_id})
        await log_action(current_user, f"UPDATE_DEPARTMENT_{dept_id}", dept, update_data)
        return updated
    return dept

@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, current_user: dict = Depends(RoleChecker(["Administrator"]))):
    dept = await db.departments.find_one({"_id": dept_id})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    await db.departments.delete_one({"_id": dept_id})
    await log_action(current_user, f"DELETE_DEPARTMENT_{dept_id}", dept, None)
    return {"message": "Department deleted successfully"}
