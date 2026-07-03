import asyncio
import uuid
import logging
from datetime import datetime, timezone

from app.db.db import db
from app.core.security import get_password_hash

logger = logging.getLogger("sipms.seed")

async def seed_data():
    # Check if we already have users seeded
    user_count = await db.users.count_documents({})
    if user_count > 0:
        logger.info("Database already seeded. Skipping initial seeding.")
        return

    logger.info("Starting database seeding...")

    # 1. Seed Departments
    departments = [
        {"_id": "DEP-CS", "name": "Computer Science Department", "budget_allocated": 50000.0, "budget_spent": 12500.0},
        {"_id": "DEP-CH", "name": "Chemistry Department", "budget_allocated": 30000.0, "budget_spent": 4500.0},
        {"_id": "DEP-AD", "name": "Administration & Finance", "budget_allocated": 20000.0, "budget_spent": 2000.0}
    ]
    for d in departments:
        await db.departments.update_one({"_id": d["_id"]}, {"$set": d}, upsert=True)

    # 2. Seed Users
    users = [
        {
            "_id": "usr-admin-01",
            "email": "admin@sipms.edu",
            "hashed_password": get_password_hash("admin123"),
            "name": "Super Administrator",
            "role": "Administrator",
            "department_id": "DEP-AD",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-staff-01",
            "email": "staff.cs@sipms.edu",
            "hashed_password": get_password_hash("staff123"),
            "name": "Alex Mercer (CS Staff)",
            "role": "Staff",
            "department_id": "DEP-CS",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-hod-01",
            "email": "hod.cs@sipms.edu",
            "hashed_password": get_password_hash("hod123"),
            "name": "Dr. Sarah Connor (CS HOD)",
            "role": "HOD",
            "department_id": "DEP-CS",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-principal-01",
            "email": "principal@sipms.edu",
            "hashed_password": get_password_hash("principal123"),
            "name": "Dr. Richard Webber (Principal)",
            "role": "Principal",
            "department_id": "DEP-AD",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-management-01",
            "email": "management@sipms.edu",
            "hashed_password": get_password_hash("management123"),
            "name": "Arthur Dent (Management)",
            "role": "Management",
            "department_id": "DEP-AD",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    for u in users:
        await db.users.update_one({"_id": u["_id"]}, {"$set": u}, upsert=True)

    # 3. Seed Vendors
    vendors = [
        {
            "_id": "ven-tech-01",
            "name": "Global Tech Solutions",
            "contact_person": "Tony Stark",
            "email": "tony@globaltech.com",
            "phone": "+1-555-0199",
            "rating": 4.8,
            "categories": ["Computer Accessories", "Electrical Assets"]
        },
        {
            "_id": "ven-sci-01",
            "name": "Apex Scientific Corp",
            "contact_person": "Bruce Banner",
            "email": "bruce@apexsci.com",
            "phone": "+1-555-0188",
            "rating": 4.6,
            "categories": ["Lab Chemicals", "Safety Equipment"]
        },
        {
            "_id": "ven-stat-01",
            "name": "Modern Stationery Hub",
            "contact_person": "Pepper Potts",
            "email": "pepper@stationeryhub.com",
            "phone": "+1-555-0177",
            "rating": 4.2,
            "categories": ["Office Stationery"]
        }
    ]
    for v in vendors:
        await db.vendors.update_one({"_id": v["_id"]}, {"$set": v}, upsert=True)

    # 4. Seed Inventory Items
    inventory = [
        {
            "_id": "inv-item-01",
            "name": "Dell OptiPlex Desktop",
            "sku": "SKU-PC-DELL-883",
            "barcode": "BAR-882716382",
            "qr_code": "QR-PC88271",
            "category": "Computer Accessories",
            "department_id": "DEP-CS",
            "vendor_id": "ven-tech-01",
            "purchase_date": "2026-01-15",
            "warranty": "3 Years",
            "quantity": 30,
            "min_stock": 5,
            "max_stock": 50,
            "price": 650.0,
            "location": "Lab 102",
            "status": "In Stock",
            "expiry_date": None,
            "image_url": "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=200&auto=format&fit=crop&q=60",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "inv-item-02",
            "name": "Hydrochloric Acid (500ml)",
            "sku": "SKU-CHEM-HCL-02",
            "barcode": "BAR-118273618",
            "qr_code": "QR-CHEM-HCL",
            "category": "Lab Chemicals",
            "department_id": "DEP-CH",
            "vendor_id": "ven-sci-01",
            "purchase_date": "2026-03-10",
            "warranty": "N/A",
            "quantity": 2, # Trigger low stock warning!
            "min_stock": 6,
            "max_stock": 20,
            "price": 35.0,
            "location": "Chemical Cabinet 4",
            "status": "Low Stock",
            "expiry_date": "2028-03-10",
            "image_url": "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=200&auto=format&fit=crop&q=60",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "inv-item-03",
            "name": "Whiteboard Markers (Pack of 4)",
            "sku": "SKU-STAT-MRK-09",
            "barcode": "BAR-552718273",
            "qr_code": "QR-MRK55",
            "category": "Office Stationery",
            "department_id": "DEP-CS",
            "vendor_id": "ven-stat-01",
            "purchase_date": "2026-05-20",
            "warranty": "N/A",
            "quantity": 80,
            "min_stock": 15,
            "max_stock": 200,
            "price": 4.5,
            "location": "CS HOD Office",
            "status": "In Stock",
            "expiry_date": None,
            "image_url": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=200&auto=format&fit=crop&q=60",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    for i in inventory:
        await db.inventory.update_one({"_id": i["_id"]}, {"$set": i}, upsert=True)

    # 5. Seed Requests
    now = datetime.now(timezone.utc).isoformat()
    requests = [
        {
            "_id": "req-001",
            "requester_id": "usr-staff-01",
            "department_id": "DEP-CS",
            "item_name": "Ethernet Hub Switch (24 Port)",
            "category": "Computer Accessories",
            "quantity": 2,
            "estimated_cost": 240.0,
            "purpose": "Upgrading student lab networking capabilities.",
            "status": "Completed",
            "timeline": [
                {"status": "Pending HOD", "timestamp": "2026-06-20T10:00:00Z", "updated_by": "Alex Mercer", "comments": "Request submitted"},
                {"status": "Approved HOD", "timestamp": "2026-06-20T14:30:00Z", "updated_by": "Dr. Sarah Connor", "comments": "Approved. Crucial for lab upgrades."},
                {"status": "Approved Admin", "timestamp": "2026-06-21T09:15:00Z", "updated_by": "Super Administrator", "comments": "In-stock verification passed."},
                {"status": "Stock Checking", "timestamp": "2026-06-21T10:00:00Z", "updated_by": "System Auto", "comments": "Stock check completed. Item is available."},
                {"status": "Completed", "timestamp": "2026-06-21T11:00:00Z", "updated_by": "Super Administrator", "comments": "Material issued to Alex Mercer."}
            ],
            "po_id": None,
            "created_at": "2026-06-20T10:00:00Z"
        },
        {
            "_id": "req-002",
            "requester_id": "usr-staff-01",
            "department_id": "DEP-CS",
            "item_name": "VGA to HDMI Adapters",
            "category": "Computer Accessories",
            "quantity": 10,
            "estimated_cost": 90.0,
            "purpose": "Connecting classroom projectors.",
            "status": "Pending HOD",
            "timeline": [
                {"status": "Pending HOD", "timestamp": now, "updated_by": "Alex Mercer", "comments": "Projectors in main block require replacement adapters."}
            ],
            "po_id": None,
            "created_at": now
        }
    ]
    for r in requests:
        await db.requests.update_one({"_id": r["_id"]}, {"$set": r}, upsert=True)

    # 6. Seed Complaints
    complaints = [
        {
            "_id": "comp-001",
            "user_id": "usr-staff-01",
            "type": "Damaged item",
            "description": "One of the A4 paper bundles was completely wet when received yesterday.",
            "status": "Resolved",
            "assigned_to": "usr-admin-01",
            "resolution_notes": "We have replaced the wet paper pack with a new one from the backup shelf.",
            "created_at": "2026-06-25T08:30:00Z",
            "updated_at": "2026-06-26T11:00:00Z"
        }
    ]
    for c in complaints:
        await db.complaints.update_one({"_id": c["_id"]}, {"$set": c}, upsert=True)

    # 7. Seed Audit Logs
    audit_logs = [
        {
            "_id": str(uuid.uuid4()),
            "user_id": "usr-admin-01",
            "user_email": "admin@sipms.edu",
            "role": "Administrator",
            "action": "SYSTEM_SEED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "old_value": None,
            "new_value": {"seeded_collections": ["departments", "users", "vendors", "inventory", "requests"]}
        }
    ]
    for a in audit_logs:
        await db.audit_logs.insert_one(a)

    # 8. Seed Monthly Consumption
    consumption = [
        {
            "_id": "2026-06-DEP-CS-Computer Accessories",
            "year": 2026,
            "month": 6,
            "department_id": "DEP-CS",
            "category": "Computer Accessories",
            "quantity_consumed": 24,
            "total_spend": 12500.0
        },
        {
            "_id": "2026-06-DEP-CH-Lab Chemicals",
            "year": 2026,
            "month": 6,
            "department_id": "DEP-CH",
            "category": "Lab Chemicals",
            "quantity_consumed": 15,
            "total_spend": 4500.0
        }
    ]
    for co in consumption:
        await db.monthly_consumption.update_one({"_id": co["_id"]}, {"$set": co}, upsert=True)

    logger.info("Database seeded successfully!")
