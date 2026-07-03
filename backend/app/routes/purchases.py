from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any, Optional

from app.models.schemas import VendorCreate, VendorResponse, POCreate, POUpdate, POResponse
from app.db.db import db
from app.routes.dependencies import get_current_user, RoleChecker, log_action

router = APIRouter(prefix="/api/purchases", tags=["purchases"])

# ----------------- VENDOR ENDPOINTS -----------------
@router.get("/vendors", response_model=List[VendorResponse])
async def get_vendors(current_user: dict = Depends(get_current_user)):
    cursor = db.vendors.find({})
    return await cursor.to_list(length=100)

@router.post("/vendors", response_model=VendorResponse)
async def create_vendor(
    vendor: VendorCreate,
    current_user: dict = Depends(RoleChecker(["Administrator"]))
):
    vendor_id = str(uuid.uuid4())
    new_vendor = {
        "_id": vendor_id,
        "name": vendor.name,
        "contact_person": vendor.contact_person,
        "email": vendor.email,
        "phone": vendor.phone,
        "rating": vendor.rating,
        "categories": vendor.categories,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vendors.insert_one(new_vendor)
    await log_action(current_user, "CREATE_VENDOR", None, new_vendor)
    return new_vendor

@router.post("/vendors/{vendor_id}/rate")
async def rate_vendor(
    vendor_id: str,
    payload: Dict[str, float],
    current_user: dict = Depends(RoleChecker(["Administrator", "HOD"]))
):
    new_rating = payload.get("rating")
    if new_rating is None or not (1.0 <= new_rating <= 5.0):
        raise HTTPException(status_code=400, detail="Rating must be between 1.0 and 5.0")
        
    vendor = await db.vendors.find_one({"_id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    # Calculate simple average running rating
    current_rating = vendor.get("rating", 5.0)
    # Simulate a rating count or update rating directly
    updated_rating = round((current_rating + new_rating) / 2.0, 2)
    
    await db.vendors.update_one({"_id": vendor_id}, {"$set": {"rating": updated_rating}})
    await log_action(current_user, f"RATE_VENDOR_{vendor_id}", {"rating": current_rating}, {"rating": updated_rating})
    return {"message": "Vendor rated successfully", "rating": updated_rating}

# ----------------- PURCHASE ORDER ENDPOINTS -----------------
@router.get("/orders", response_model=List[POResponse])
async def get_purchase_orders(current_user: dict = Depends(get_current_user)):
    cursor = db.purchase_orders.find({})
    cursor.sort("created_at", -1)
    return await cursor.to_list(length=200)

@router.post("/orders", response_model=POResponse)
async def create_purchase_order(
    po: POCreate,
    current_user: dict = Depends(RoleChecker(["Administrator"]))
):
    po_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    new_po = {
        "_id": po_id,
        "request_id": po.request_id,
        "vendor_id": po.vendor_id,
        "items": [item.model_dump() for item in po.items],
        "total_cost": po.total_cost,
        "status": "Draft",
        "expected_delivery": po.expected_delivery,
        "actual_delivery": None,
        "invoice_url": None,
        "created_at": now
    }
    
    await db.purchase_orders.insert_one(new_po)
    
    # Update Request timeline
    request = await db.requests.find_one({"_id": po.request_id})
    if request:
        timeline_entry = {
            "status": "Ordered",
            "timestamp": now,
            "updated_by": current_user["name"],
            "comments": f"Purchase Order created: {po_id}. Waiting for vendor dispatch."
        }
        await db.requests.update_one(
            {"_id": po.request_id},
            {"$set": {"status": "Ordered", "po_id": po_id}, "$push": {"timeline": timeline_entry}}
        )
        
    await log_action(current_user, "CREATE_PURCHASE_ORDER", None, new_po)
    return new_po

@router.put("/orders/{po_id}/status", response_model=POResponse)
async def update_po_status(
    po_id: str,
    update: POUpdate,
    current_user: dict = Depends(RoleChecker(["Administrator", "Principal"]))
):
    po = await db.purchase_orders.find_one({"_id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    old_status = po["status"]
    new_status = update.status
    now = datetime.now(timezone.utc).isoformat()
    
    update_fields = {"status": new_status}
    if update.invoice_url:
        update_fields["invoice_url"] = update.invoice_url
    if update.actual_delivery:
        update_fields["actual_delivery"] = update.actual_delivery
    elif new_status == "Received":
        update_fields["actual_delivery"] = now
        
    await db.purchase_orders.update_one({"_id": po_id}, {"$set": update_fields})
    updated_po = await db.purchase_orders.find_one({"_id": po_id})
    await log_action(current_user, f"UPDATE_PO_STATUS_{po_id}", po, update_fields)
    
    # AUTOMATION: If PO is marked as Received, increment stock in the inventory!
    if new_status == "Received" and old_status != "Received":
        request = await db.requests.find_one({"_id": po["request_id"]})
        dept_id = request["department_id"] if request else "DEP-GEN"
        cat = request["category"] if request else "General"
        
        # Loop through PO items
        for item in po["items"]:
            # Check if matching item exists in inventory
            inv_item = await db.inventory.find_one({
                "name": item["item_name"],
                "category": cat,
                "department_id": dept_id
            })
            
            from app.routes.inventory import determine_status
            
            if inv_item:
                # Increment stock
                new_qty = inv_item["quantity"] + item["quantity"]
                new_item_status = determine_status(new_qty, inv_item["min_stock"])
                
                await db.inventory.update_one(
                    {"_id": inv_item["_id"]},
                    {"$set": {
                        "quantity": new_qty, 
                        "status": new_item_status,
                        "price": item["price"],  # update price with latest purchase
                        "vendor_id": po["vendor_id"]
                    }}
                )
            else:
                # Create a new inventory item
                new_inv_id = str(uuid.uuid4())
                sku = f"SKU-{item['item_name'][:3].upper()}-{str(uuid.uuid4())[:8].upper()}"
                barcode = f"BAR-{uuid.uuid4().hex[:10].upper()}"
                qr_code = f"QR-{uuid.uuid4().hex[:10].upper()}"
                
                new_inv = {
                    "_id": new_inv_id,
                    "name": item["item_name"],
                    "sku": sku,
                    "barcode": barcode,
                    "qr_code": qr_code,
                    "category": cat,
                    "department_id": dept_id,
                    "vendor_id": po["vendor_id"],
                    "purchase_date": now,
                    "warranty": "1 Year",
                    "quantity": item["quantity"],
                    "min_stock": 5,
                    "max_stock": 100,
                    "price": item["price"],
                    "location": "Central Warehouse",
                    "status": "In Stock",
                    "expiry_date": None,
                    "image_url": "https://picsum.photos/200/200",
                    "created_at": now
                }
                # Recalculate status just in case
                new_inv["status"] = determine_status(new_inv["quantity"], new_inv["min_stock"])
                await db.inventory.insert_one(new_inv)

        # Update associated request status to Received -> Stock Checking so Admin can issue it!
        if request:
            timeline_entry = {
                "status": "Received",
                "timestamp": now,
                "updated_by": current_user["name"],
                "comments": "Purchase Order received at warehouse. Materials ready to issue."
            }
            # Also auto-advance request to 'Stock Checking' stage so it's ready for issuance
            next_timeline_entry = {
                "status": "Stock Checking",
                "timestamp": now,
                "updated_by": "System Auto",
                "comments": "Stock check completed. Item is available in database."
            }
            await db.requests.update_one(
                {"_id": po["request_id"]},
                {
                    "$set": {"status": "Stock Checking"},
                    "$push": {"timeline": {"$each": [timeline_entry, next_timeline_entry]}}
                }
            )

    return updated_po
