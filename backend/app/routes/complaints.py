from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any, Optional

from app.models.schemas import ComplaintCreate, ComplaintUpdate, ComplaintResponse
from app.db.db import db
from app.routes.dependencies import get_current_user, RoleChecker, log_action

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

@router.get("", response_model=List[ComplaintResponse])
async def get_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status_filter:
        query["status"] = status_filter
        
    role = current_user.get("role")
    
    if role == "Staff":
        query["user_id"] = current_user["_id"]
    # Other roles (HOD, Admin, Principal, Management) can see all complaints
    
    cursor = db.complaints.find(query)
    cursor.sort("created_at", -1)
    return await cursor.to_list(length=500)

@router.post("", response_model=ComplaintResponse)
async def create_complaint(
    complaint: ComplaintCreate,
    current_user: dict = Depends(RoleChecker(["Staff", "Administrator"]))
):
    comp_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    new_complaint = {
        "_id": comp_id,
        "user_id": current_user["_id"],
        "type": complaint.type,
        "description": complaint.description,
        "status": "Submitted",
        "assigned_to": None,
        "resolution_notes": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.complaints.insert_one(new_complaint)
    await log_action(current_user, "CREATE_COMPLAINT", None, new_complaint)
    return new_complaint

@router.put("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: str,
    update: ComplaintUpdate,
    current_user: dict = Depends(RoleChecker(["Administrator", "HOD"]))
):
    existing = await db.complaints.find_one({"_id": complaint_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": update.status,
        "updated_at": now
    }
    
    if update.assigned_to:
        update_data["assigned_to"] = update.assigned_to
    if update.resolution_notes:
        update_data["resolution_notes"] = update.resolution_notes
        
    await db.complaints.update_one({"_id": complaint_id}, {"$set": update_data})
    updated = await db.complaints.find_one({"_id": complaint_id})
    await log_action(current_user, f"UPDATE_COMPLAINT_{complaint_id}", existing, update_data)
    
    return updated
