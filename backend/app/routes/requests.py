from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any

from app.models.schemas import RequestCreate, RequestUpdate, RequestResponse, TimelineItem
from app.db.db import db
from app.routes.dependencies import get_current_user, RoleChecker, log_action

router = APIRouter(prefix="/api/requests", tags=["requests"])

@router.get("", response_model=List[RequestResponse])
async def get_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status_filter:
        query["status"] = status_filter
        
    role = current_user.get("role")
    
    # Filter based on role permissions
    if role == "Staff":
        query["requester_id"] = current_user["_id"]
    elif role == "HOD":
        query["department_id"] = current_user["department_id"]
    # Admin, Principal, and Management can view all requests
    
    cursor = db.requests.find(query)
    cursor.sort("created_at", -1)
    return await cursor.to_list(length=500)

@router.get("/{request_id}", response_model=RequestResponse)
async def get_request_by_id(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.requests.find_one({"_id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request

@router.post("", response_model=RequestResponse)
async def create_request(
    req: RequestCreate,
    current_user: dict = Depends(RoleChecker(["Staff", "Administrator"]))
):
    if not current_user.get("department_id"):
        raise HTTPException(status_code=400, detail="User must belong to a department to raise a request")
        
    req_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    initial_timeline = [
        {
            "status": "Pending HOD",
            "timestamp": now,
            "updated_by": current_user["name"],
            "comments": "Request submitted successfully"
        }
    ]
    
    new_request = {
        "_id": req_id,
        "requester_id": current_user["_id"],
        "department_id": current_user["department_id"],
        "item_name": req.item_name,
        "category": req.category,
        "quantity": req.quantity,
        "estimated_cost": req.estimated_cost,
        "purpose": req.purpose,
        "status": "Pending HOD",
        "timeline": initial_timeline,
        "po_id": None,
        "created_at": now
    }
    
    await db.requests.insert_one(new_request)
    await log_action(current_user, "CREATE_REQUEST", None, new_request)
    return new_request

@router.put("/{request_id}/status", response_model=RequestResponse)
async def update_request_status(
    request_id: str,
    update: RequestUpdate,
    current_user: dict = Depends(get_current_user)
):
    req = await db.requests.find_one({"_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    role = current_user.get("role")
    now = datetime.now(timezone.utc).isoformat()
    old_status = req["status"]
    new_status = update.status
    
    # ----------------- HOD ACTION -----------------
    if role == "HOD":
        if old_status != "Pending HOD":
            raise HTTPException(status_code=400, detail="HOD can only take action on 'Pending HOD' requests")
        if new_status not in ["Approved HOD", "Rejected"]:
            raise HTTPException(status_code=400, detail="Invalid HOD approval state transition")
        
        # If HOD approves, transition to Pending Admin
        if new_status == "Approved HOD":
            new_status = "Pending Admin"

    # ----------------- PRINCIPAL ACTION -----------------
    elif role == "Principal":
        # Principal only needs to approve high budget orders, but let's allow general review
        if old_status not in ["Pending Admin", "Approved HOD"]:
            raise HTTPException(status_code=400, detail="Principal can only review pending admin requests")
        if new_status not in ["Approved Admin", "Rejected"]:
            raise HTTPException(status_code=400, detail="Invalid Principal approval state transition")

    # ----------------- ADMIN ACTION -----------------
    elif role == "Administrator":
        # Admin can approve or transition to any subsequent states
        pass
    else:
        raise HTTPException(status_code=403, detail="Role not authorized to update request workflow")

    # Update timeline
    timeline_entry = {
        "status": new_status,
        "timestamp": now,
        "updated_by": current_user["name"],
        "comments": update.comments or ""
    }
    
    update_fields = {
        "status": new_status,
        "timeline": req["timeline"] + [timeline_entry]
    }
    
    if update.po_id:
        update_fields["po_id"] = update.po_id
        
    # AUTOMATION: If transition is to "Issued" or "Completed" and was from "Stock Checking",
    # deduct quantity from stock
    if new_status == "Completed" and old_status == "Stock Checking":
        # Find inventory item by category/name in the requester's department or global
        inv_item = await db.inventory.find_one({
            "category": req["category"],
            "name": req["item_name"],
            "department_id": req["department_id"]
        })
        
        # Fallback to general search if department specific doesn't exist
        if not inv_item:
            inv_item = await db.inventory.find_one({
                "category": req["category"],
                "name": req["item_name"]
            })
            
        if not inv_item or inv_item["quantity"] < req["quantity"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot complete request: Insufficient stock. Available: {inv_item['quantity'] if inv_item else 0}"
            )
            
        # Deduct stock
        new_qty = inv_item["quantity"] - req["quantity"]
        # Determine status
        from app.routes.inventory import determine_status
        new_item_status = determine_status(new_qty, inv_item["min_stock"])
        
        await db.inventory.update_one(
            {"_id": inv_item["_id"]},
            {"$set": {"quantity": new_qty, "status": new_item_status}}
        )
        
        # Record Transaction for Monthly Consumption and Power BI
        # Find month
        date_obj = datetime.now()
        month_id = f"{date_obj.year}-{date_obj.month:02d}-{req['department_id']}-{req['category']}"
        await db.monthly_consumption.update_one(
            {"_id": month_id},
            {
                "$set": {
                    "year": date_obj.year,
                    "month": date_obj.month,
                    "department_id": req["department_id"],
                    "category": req["category"]
                },
                "$inc": {
                    "quantity_consumed": req["quantity"],
                    "total_spend": float(req["estimated_cost"])
                }
            },
            upsert=True
        )
        
        # Deduct department budget
        await db.departments.update_one(
            {"_id": req["department_id"]},
            {"$inc": {"budget_spent": float(req["estimated_cost"])}}
        )

    await db.requests.update_one({"_id": request_id}, {"$set": update_fields})
    updated_req = await db.requests.find_one({"_id": request_id})
    await log_action(current_user, f"TRANSITION_REQUEST_{request_id}", req, update_fields)
    
    return updated_req
