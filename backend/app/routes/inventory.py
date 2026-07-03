from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any

from app.models.schemas import InventoryCreate, InventoryUpdate, InventoryResponse
from app.db.db import db
from app.routes.dependencies import get_current_user, RoleChecker, log_action

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

def determine_status(quantity: int, min_stock: int) -> str:
    if quantity == 0:
        return "Out of Stock"
    elif quantity <= min_stock:
        return "Low Stock"
    return "In Stock"

@router.get("", response_model=Dict[str, Any])
async def get_inventory(
    q: Optional[str] = Query(None, description="Search term for name, SKU, barcode, or QR code"),
    category: Optional[str] = Query(None, description="Category filter"),
    department_id: Optional[str] = Query(None, description="Department filter"),
    status: Optional[str] = Query(None, description="In Stock, Low Stock, Out of Stock"),
    sort_by: str = Query("name", description="Field to sort by"),
    order: str = Query("asc", description="asc or desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Text search
    if q:
        query["$or"] = [
            {"name": {"$regex": q}},
            {"sku": {"$regex": q}},
            {"barcode": {"$regex": q}},
            {"qr_code": {"$regex": q}}
        ]
        
    # Filters
    if category:
        query["category"] = category
    if department_id:
        query["department_id"] = department_id
    if status:
        query["status"] = status
        
    cursor = db.inventory.find(query)
    
    # Sorting
    direction = 1 if order == "asc" else -1
    cursor.sort(sort_by, direction)
    
    # Total count
    total = await db.inventory.count_documents(query)
    
    # Pagination
    skip = (page - 1) * limit
    cursor.skip(skip).limit(limit)
    
    items = await cursor.to_list()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.post("", response_model=InventoryResponse)
async def create_inventory_item(
    item: InventoryCreate,
    current_user: dict = Depends(RoleChecker(["Administrator"]))
):
    # Check if SKU is unique
    existing = await db.inventory.find_one({"sku": item.sku})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
        
    item_id = str(uuid.uuid4())
    item_status = determine_status(item.quantity, item.min_stock)
    
    new_item = {
        "_id": item_id,
        "name": item.name,
        "sku": item.sku,
        "barcode": item.barcode,
        "qr_code": item.qr_code,
        "category": item.category,
        "department_id": item.department_id,
        "vendor_id": item.vendor_id,
        "purchase_date": item.purchase_date,
        "warranty": item.warranty,
        "quantity": item.quantity,
        "min_stock": item.min_stock,
        "max_stock": item.max_stock,
        "price": item.price,
        "location": item.location,
        "status": item_status,
        "expiry_date": item.expiry_date,
        "image_url": item.image_url or "https://picsum.photos/200/200",  # default premium visual asset
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inventory.insert_one(new_item)
    await log_action(current_user, "CREATE_INVENTORY_ITEM", None, new_item)
    return new_item

@router.put("/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(
    item_id: str,
    item: InventoryUpdate,
    current_user: dict = Depends(RoleChecker(["Administrator"]))
):
    existing = await db.inventory.find_one({"_id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    update_data = {}
    for k, v in item.model_dump(exclude_unset=True).items():
        update_data[k] = v
        
    # Recalculate status if quantity or min_stock changes
    if "quantity" in update_data or "min_stock" in update_data:
        qty = update_data.get("quantity", existing["quantity"])
        min_stk = update_data.get("min_stock", existing["min_stock"])
        update_data["status"] = determine_status(qty, min_stk)

    if update_data:
        await db.inventory.update_one({"_id": item_id}, {"$set": update_data})
        updated = await db.inventory.find_one({"_id": item_id})
        await log_action(current_user, f"UPDATE_INVENTORY_ITEM_{item_id}", existing, update_data)
        
        # Check and write low stock event logs
        if updated["status"] in ["Low Stock", "Out of Stock"] and existing["status"] not in ["Low Stock", "Out of Stock"]:
            # Auto notifications could trigger here
            pass
            
        return updated
    return existing

@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: str,
    current_user: dict = Depends(RoleChecker(["Administrator"]))
):
    existing = await db.inventory.find_one({"_id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    await db.inventory.delete_one({"_id": item_id})
    await log_action(current_user, f"DELETE_INVENTORY_ITEM_{item_id}", existing, None)
    return {"message": "Inventory item deleted successfully"}
