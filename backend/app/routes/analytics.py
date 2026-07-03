from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from app.db.db import db
from app.routes.dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    dept_id = current_user.get("department_id")
    
    # Base queries
    inv_query = {}
    req_query = {}
    comp_query = {}
    po_query = {}
    
    # Restrict data based on roles
    if role == "Staff":
        req_query["requester_id"] = current_user["_id"]
        comp_query["user_id"] = current_user["_id"]
        inv_query["department_id"] = dept_id
    elif role == "HOD":
        req_query["department_id"] = dept_id
        inv_query["department_id"] = dept_id
        users_in_dept = await db.users.find({"department_id": dept_id}).to_list(1000)
        user_ids = [u["_id"] for u in users_in_dept]
        comp_query["user_id"] = {"$in": user_ids}
        
    # Get statistics
    total_inv_docs = await db.inventory.count_documents(inv_query)
    
    low_stock_query = {**inv_query, "status": "Low Stock"}
    low_stock_count = await db.inventory.count_documents(low_stock_query)
    
    out_stock_query = {**inv_query, "status": "Out of Stock"}
    out_stock_count = await db.inventory.count_documents(out_stock_query)
    
    pending_reqs = await db.requests.count_documents({**req_query, "status": {"$in": ["Pending HOD", "Pending Admin"]}})
    approved_reqs = await db.requests.count_documents({**req_query, "status": {"$in": ["Approved Admin", "Completed", "Stock Checking", "Issued"]}})
    rejected_reqs = await db.requests.count_documents({**req_query, "status": "Rejected"})
    
    total_pos = await db.purchase_orders.count_documents(po_query)
    
    # Today's requests
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_reqs = await db.requests.count_documents({**req_query, "created_at": {"$gte": today_start}})
    
    # Complaints status
    total_complaints = await db.complaints.count_documents(comp_query)
    open_complaints = await db.complaints.count_documents({**comp_query, "status": {"$ne": "Closed"}})
    
    # Budget calculation
    budget_allocated = 0.0
    budget_spent = 0.0
    
    if role in ["HOD", "Staff"] and dept_id:
        dept = await db.departments.find_one({"_id": dept_id})
        if dept:
            budget_allocated = dept.get("budget_allocated", 0.0)
            budget_spent = dept.get("budget_spent", 0.0)
    else:
        depts = await db.departments.find({}).to_list(100)
        budget_allocated = sum(d.get("budget_allocated", 0.0) for d in depts)
        budget_spent = sum(d.get("budget_spent", 0.0) for d in depts)

    # 1. Monthly consumption data for charts - Pure Python Grouping
    consumption_cursor = db.monthly_consumption.find({})
    consumption_list = await consumption_cursor.to_list(1000)
    
    monthly_usage = []
    if consumption_list:
        grouped_dict = {}
        for c in consumption_list:
            y = int(c.get("year", 2026))
            m = int(c.get("month", 6))
            month_str = f"{y}-{m:02d}"
            qty = int(c.get("quantity_consumed", 0))
            spend = float(c.get("total_spend", 0.0))
            
            if month_str not in grouped_dict:
                grouped_dict[month_str] = [0, 0.0]
            grouped_dict[month_str][0] += qty
            grouped_dict[month_str][1] += spend
            
        for month_str in sorted(grouped_dict.keys()):
            monthly_usage.append({
                "month": month_str,
                "quantity": grouped_dict[month_str][0],
                "spend": grouped_dict[month_str][1]
            })
    else:
        monthly_usage = [
            {"month": "2026-02", "quantity": 120, "spend": 2400.0},
            {"month": "2026-03", "quantity": 180, "spend": 3600.0},
            {"month": "2026-04", "quantity": 150, "spend": 3100.0},
            {"month": "2026-05", "quantity": 220, "spend": 4500.0},
            {"month": "2026-06", "quantity": 310, "spend": 6200.0},
            {"month": "2026-07", "quantity": 280, "spend": 5700.0}
        ]

    # 2. Department-wise usage
    dept_usage = []
    depts = await db.departments.find({}).to_list(100)
    for d in depts:
        dept_usage.append({
            "name": d.get("name"),
            "spent": d.get("budget_spent", 0.0),
            "allocated": d.get("budget_allocated", 0.0)
        })
        
    # 3. Category-wise usage
    inventory_items = await db.inventory.find(inv_query).to_list(1000)
    cat_usage_dict = {}
    for item in inventory_items:
        cat = item.get("category", "General")
        cat_usage_dict[cat] = cat_usage_dict.get(cat, 0) + (item.get("price", 0.0) * item.get("quantity", 0))
    cat_usage = [{"name": k, "value": v} for k, v in cat_usage_dict.items()]

    return {
        "summary": {
            "total_inventory": total_inv_docs,
            "low_stock": low_stock_count,
            "out_of_stock": out_stock_count,
            "pending_requests": pending_reqs,
            "approved_reqs": approved_reqs,
            "rejected_reqs": rejected_reqs,
            "total_purchase_orders": total_pos,
            "today_requests": today_reqs,
            "total_complaints": total_complaints,
            "open_complaints": open_complaints,
            "budget_allocated": budget_allocated,
            "budget_spent": budget_spent,
        },
        "charts": {
            "monthly_usage": monthly_usage,
            "department_usage": dept_usage,
            "category_usage": cat_usage
        }
    }

@router.get("/metrics")
async def get_extended_metrics(current_user: dict = Depends(get_current_user)):
    # 1. Vendor performance
    vendors = await db.vendors.find({}).to_list(100)
    vendor_perf = [{"name": v.get("name"), "rating": v.get("rating", 5.0)} for v in vendors]
    
    # 2. Complaint statistics
    complaints = await db.complaints.find({}).to_list(1000)
    complaint_stats = {}
    for c in complaints:
        ctype = c.get("type", "Other")
        complaint_stats[ctype] = complaint_stats.get(ctype, 0) + 1
    complaint_data = [{"type": k, "count": v} for k, v in complaint_stats.items()]

    # 3. Top requested items
    requests = await db.requests.find({}).to_list(1000)
    req_counts = {}
    for r in requests:
        item = r.get("item_name")
        req_counts[item] = req_counts.get(item, 0) + r.get("quantity", 1)
    
    sorted_reqs = sorted(req_counts.items(), key=lambda x: x[1], reverse=True)
    top_items = [{"name": k, "value": v} for k, v in sorted_reqs[:5]]
    least_items = [{"name": k, "value": v} for k, v in sorted_reqs[-5:]] if sorted_reqs else []

    # 4. Expenditure and PO trends - Pure Python Grouping
    pos = await db.purchase_orders.find({}).to_list(500)
    po_trends = []
    if pos:
        grouped_po = {}
        for po in pos:
            dt_str = po["created_at"].split("T")[0]
            cost = float(po["total_cost"])
            grouped_po[dt_str] = grouped_po.get(dt_str, 0.0) + cost
            
        for dt_str in sorted(grouped_po.keys()):
            po_trends.append({
                "date": dt_str,
                "cost": grouped_po[dt_str]
            })
    else:
        po_trends = [
            {"date": "2026-06-25", "cost": 1500.0},
            {"date": "2026-06-27", "cost": 3000.0},
            {"date": "2026-06-28", "cost": 800.0},
            {"date": "2026-07-01", "cost": 4500.0},
            {"date": "2026-07-02", "cost": 1200.0}
        ]

    return {
        "vendor_performance": vendor_perf,
        "complaint_statistics": complaint_data,
        "top_requested_items": top_items,
        "least_requested_items": least_items,
        "po_expenditure_trends": po_trends,
        "approval_times": [
            {"step": "HOD Approval", "hours": 4.5},
            {"step": "Admin Approval", "hours": 12.0},
            {"step": "Stock Issue", "hours": 2.0},
            {"step": "Procurement Delivery", "hours": 72.0}
        ]
    }
