import os
import json
import uuid
import hmac
import hashlib
import secrets
import time
import urllib.parse
import re
import csv
import io
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, List, Optional

# Use pre-installed data science packages on the host machine for AI
try:
    import pandas as pd
    import numpy as np
    HAS_AI_LIBS = True
except ImportError:
    HAS_AI_LIBS = False

# ----------------- CONFIGURATION -----------------
PORT = 8000
LOCAL_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "local_db.json")
TOKEN_SECRET = b"sipms_super_secret_cryptographic_signing_key_2026"

# ----------------- SECURITY UTILS -----------------
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, key_hex = hashed_password.split(':')
        key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def base64_url_encode(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64_url_decode(data: str) -> bytes:
    import base64
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_token(payload: dict, expires_in: int = 3600) -> str:
    payload_copy = payload.copy()
    payload_copy["exp"] = int(time.time()) + expires_in
    payload_json = json.dumps(payload_copy).encode('utf-8')
    payload_b64 = base64_url_encode(payload_json)
    
    sig = hmac.new(TOKEN_SECRET, payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64_url_encode(sig)
    return f"{payload_b64}.{sig_b64}"

def verify_token(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        
        expected_sig = hmac.new(TOKEN_SECRET, payload_b64.encode('utf-8'), hashlib.sha256).digest()
        expected_sig_b64 = base64_url_encode(expected_sig)
        
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
            
        payload_json = base64_url_decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_json)
        
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

# ----------------- SYNC DATABASE ENGINE -----------------
class SyncLocalDB:
    def __init__(self, filepath: str):
        self.filepath = filepath
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        if not os.path.exists(filepath):
            self.write_all({})

    def read_all(self) -> Dict[str, List[Dict[str, Any]]]:
        try:
            with open(self.filepath, 'r') as f:
                return json.load(f)
        except Exception:
            return {}

    def write_all(self, data: dict):
        try:
            with open(self.filepath, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[!] DB write error: {e}")

    def get_collection(self, name: str) -> List[Dict[str, Any]]:
        db_data = self.read_all()
        if name not in db_data:
            db_data[name] = []
            self.write_all(db_data)
        return db_data[name]

    def save_collection(self, name: str, items: list):
        db_data = self.read_all()
        db_data[name] = items
        self.write_all(db_data)

db = SyncLocalDB(LOCAL_DB_PATH)

# ----------------- SEEDING ROUTINE -----------------
def seed_data_if_empty():
    users = db.get_collection("users")
    if len(users) > 0:
        return
        
    print("[*] Database is empty. Seeding initial data...")
    
    # Departments
    departments = [
        {"_id": "DEP-CS", "name": "Computer Science Department", "budget_allocated": 50000.0, "budget_spent": 12500.0},
        {"_id": "DEP-CH", "name": "Chemistry Department", "budget_allocated": 30000.0, "budget_spent": 4500.0},
        {"_id": "DEP-AD", "name": "Administration & Finance", "budget_allocated": 20000.0, "budget_spent": 2000.0}
    ]
    db.save_collection("departments", departments)
    
    # Users
    seeded_users = [
        {
            "_id": "usr-admin-01",
            "email": "admin@sipms.edu",
            "hashed_password": hash_password("admin123"),
            "name": "Super Administrator",
            "role": "Administrator",
            "department_id": "DEP-AD",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-staff-01",
            "email": "staff.cs@sipms.edu",
            "hashed_password": hash_password("staff123"),
            "name": "Alex Mercer (CS Staff)",
            "role": "Staff",
            "department_id": "DEP-CS",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-hod-01",
            "email": "hod.cs@sipms.edu",
            "hashed_password": hash_password("hod123"),
            "name": "Dr. Sarah Connor (CS HOD)",
            "role": "HOD",
            "department_id": "DEP-CS",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-principal-01",
            "email": "principal@sipms.edu",
            "hashed_password": hash_password("principal123"),
            "name": "Dr. Richard Webber (Principal)",
            "role": "Principal",
            "department_id": "DEP-AD",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "_id": "usr-management-01",
            "email": "management@sipms.edu",
            "hashed_password": hash_password("management123"),
            "name": "Arthur Dent (Management)",
            "role": "Management",
            "department_id": "DEP-AD",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    db.save_collection("users", seeded_users)
    
    # Vendors
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
    db.save_collection("vendors", vendors)
    
    # Inventory
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
            "quantity": 2,
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
    db.save_collection("inventory", inventory)
    
    # Requests
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
        }
    ]
    db.save_collection("requests", requests)
    
    # Monthly Consumption
    consumption = [
        {
            "_id": "2026-06-DEP-CS-Computer Accessories",
            "year": 2026,
            "month": 6,
            "department_id": "DEP-CS",
            "category": "Computer Accessories",
            "quantity_consumed": 24,
            "total_spend": 12500.0
        }
    ]
    db.save_collection("monthly_consumption", consumption)
    
    print("[OK] Seeding completed.")

# ----------------- AUDIT LOGS HELPER -----------------
def log_action(user: dict, action: str, old_val: dict = None, new_val: dict = None):
    logs = db.get_collection("audit_logs")
    log_entry = {
        "_id": str(uuid.uuid4()),
        "user_id": user.get("_id"),
        "user_email": user.get("email"),
        "role": user.get("role"),
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "old_value": old_val,
        "new_value": new_val
    }
    logs.append(log_entry)
    db.save_collection("audit_logs", logs)

# ----------------- STOCK LEVEL HELPERS -----------------
def determine_status(quantity: int, min_stock: int) -> str:
    if quantity == 0:
        return "Out of Stock"
    elif quantity <= min_stock:
        return "Low Stock"
    return "In Stock"

# ----------------- SERVER CLASS -----------------
class SIPMSRequestHandler(BaseHTTPRequestHandler):
    
    def log_message(self, format, *args):
        # Silence default terminal logs
        pass

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def get_auth_user(self) -> Optional[dict]:
        auth_header = self.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ")[1]
        payload = verify_token(token)
        if not payload:
            return None
        users = db.get_collection("users")
        for u in users:
            if u["email"] == payload.get("email"):
                return u
        return None

    def respond_json(self, status_code: int, data: Any):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def respond_error(self, status_code: int, message: str):
        self.respond_json(status_code, {"detail": message})

    def get_body_json(self) -> dict:
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.wfile.read(content_length) if hasattr(self, 'rfile_content') else self.rfile.read(content_length)
        try:
            return json.loads(body.decode('utf-8'))
        except Exception:
            return {}

    def match_regex(self, pattern: str) -> Optional[re.Match]:
        parsed = urllib.parse.urlparse(self.path)
        return re.match(pattern, parsed.path)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # 1. Base check
        if path == "/":
            return self.respond_json(200, {"status": "online", "app": "SIPMS Backend Server"})

        # 2. Get Profile
        if path == "/api/auth/profile":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
            user_res = user.copy()
            user_res.pop("hashed_password", None)
            user_res["id"] = user_res.pop("_id")
            return self.respond_json(200, user_res)

        # 3. Get Departments
        if path == "/api/auth/departments":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
            depts = db.get_collection("departments")
            res = []
            for d in depts:
                dc = d.copy()
                dc["id"] = dc.pop("_id")
                res.append(dc)
            return self.respond_json(200, res)

        # 4. Get Inventory
        if path == "/api/inventory":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
                
            q = query_params.get("q", [None])[0]
            category = query_params.get("category", [None])[0]
            dept_id = query_params.get("department_id", [None])[0]
            status_filter = query_params.get("status", [None])[0]
            sort_by = query_params.get("sort_by", ["name"])[0]
            order = query_params.get("order", ["asc"])[0]
            page = int(query_params.get("page", ["1"])[0])
            limit = int(query_params.get("limit", ["10"])[0])
            
            items = db.get_collection("inventory")
            filtered = []
            for item in items:
                # Text Match
                if q:
                    q_lower = q.lower()
                    if q_lower not in item["name"].lower() and q_lower not in item["sku"].lower():
                        continue
                # Category Filter
                if category and item["category"] != category:
                    continue
                # Department Filter
                if dept_id and item["department_id"] != dept_id:
                    continue
                # Status Filter
                if status_filter and item["status"] != status_filter:
                    continue
                filtered.append(item)
                
            # Sorting
            reverse = order == "desc"
            try:
                filtered.sort(key=lambda x: x.get(sort_by, ""), reverse=reverse)
            except Exception:
                pass
                
            total = len(filtered)
            start = (page - 1) * limit
            end = start + limit
            page_items = filtered[start:end]
            
            res_items = []
            for item in page_items:
                ic = item.copy()
                ic["id"] = ic.pop("_id")
                res_items.append(ic)
                
            return self.respond_json(200, {
                "items": res_items,
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            })

        # 5. Get Requests
        if path == "/api/requests":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
                
            reqs = db.get_collection("requests")
            res = []
            for r in reqs:
                if user["role"] == "Staff" and r["requester_id"] != user["_id"]:
                    continue
                if user["role"] == "HOD" and r["department_id"] != user["department_id"]:
                    continue
                rc = r.copy()
                rc["id"] = rc.pop("_id")
                res.append(rc)
            res.sort(key=lambda x: x["created_at"], reverse=True)
            return self.respond_json(200, res)

        # 6. Get Vendors
        if path == "/api/purchases/vendors":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
            vendors = db.get_collection("vendors")
            res = []
            for v in vendors:
                vc = v.copy()
                vc["id"] = vc.pop("_id")
                res.append(vc)
            return self.respond_json(200, res)

        # 7. Get Purchase Orders
        if path == "/api/purchases/orders":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
            orders = db.get_collection("purchase_orders")
            res = []
            for o in orders:
                oc = o.copy()
                oc["id"] = oc.pop("_id")
                res.append(oc)
            res.sort(key=lambda x: x["created_at"], reverse=True)
            return self.respond_json(200, res)

        # 8. Get Complaints
        if path == "/api/complaints":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
            complaints = db.get_collection("complaints")
            res = []
            for c in complaints:
                if user["role"] == "Staff" and c["user_id"] != user["_id"]:
                    continue
                cc = c.copy()
                cc["id"] = cc.pop("_id")
                res.append(cc)
            res.sort(key=lambda x: x["created_at"], reverse=True)
            return self.respond_json(200, res)

        # 9. Get Audit Logs
        if path == "/api/audit/logs":
            user = self.get_auth_user()
            if not user or user["role"] != "Administrator":
                return self.respond_error(401, "Not authorized")
            logs = db.get_collection("audit_logs")
            res = []
            for l in logs:
                lc = l.copy()
                lc["id"] = lc.pop("_id")
                res.append(lc)
            res.sort(key=lambda x: x["timestamp"], reverse=True)
            return self.respond_json(200, res[:100])

        # 10. Dashboard Analytics
        if path == "/api/analytics/dashboard":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
                
            role = user["role"]
            dept_id = user["department_id"]
            
            # Simple aggregations
            inv = db.get_collection("inventory")
            reqs = db.get_collection("requests")
            pos = db.get_collection("purchase_orders")
            comps = db.get_collection("complaints")
            depts = db.get_collection("departments")
            cons = db.get_collection("monthly_consumption")
            
            # Filters
            total_inv = sum(1 for item in inv if role != "Staff" and role != "HOD" or item["department_id"] == dept_id)
            low_stock = sum(1 for item in inv if (role != "Staff" and role != "HOD" or item["department_id"] == dept_id) and item["status"] == "Low Stock")
            out_stock = sum(1 for item in inv if (role != "Staff" and role != "HOD" or item["department_id"] == dept_id) and item["status"] == "Out of Stock")
            
            pending_reqs = sum(1 for r in reqs if (role != "Staff" or r["requester_id"] == user["_id"]) and (role != "HOD" or r["department_id"] == dept_id) and r["status"] in ["Pending HOD", "Pending Admin"])
            approved_reqs = sum(1 for r in reqs if (role != "Staff" or r["requester_id"] == user["_id"]) and (role != "HOD" or r["department_id"] == dept_id) and r["status"] in ["Completed", "Stock Checking", "Issued"])
            rejected_reqs = sum(1 for r in reqs if (role != "Staff" or r["requester_id"] == user["_id"]) and (role != "HOD" or r["department_id"] == dept_id) and r["status"] == "Rejected")
            
            total_pos = len(pos)
            total_complaints = sum(1 for c in comps if role != "Staff" or c["user_id"] == user["_id"])
            open_complaints = sum(1 for c in comps if (role != "Staff" or c["user_id"] == user["_id"]) and c["status"] != "Closed")
            
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            today_requests = sum(1 for r in reqs if (role != "Staff" or r["requester_id"] == user["_id"]) and (role != "HOD" or r["department_id"] == dept_id) and r["created_at"] >= today_start)
            
            budget_allocated = 0.0
            budget_spent = 0.0
            if role in ["HOD", "Staff"] and dept_id:
                for d in depts:
                    if d["_id"] == dept_id:
                        budget_allocated = d["budget_allocated"]
                        budget_spent = d["budget_spent"]
            else:
                budget_allocated = sum(d["budget_allocated"] for d in depts)
                budget_spent = sum(d["budget_spent"] for d in depts)

            # Charts
            # 1. Monthly consumption Chart
            monthly_usage = []
            grouped_dict = {}
            for c in cons:
                m_str = f"{c['year']}-{c['month']:02d}"
                if m_str not in grouped_dict:
                    grouped_dict[m_str] = [0, 0.0]
                grouped_dict[m_str][0] += c["quantity_consumed"]
                grouped_dict[m_str][1] += c["total_spend"]
            
            for m_str in sorted(grouped_dict.keys()):
                monthly_usage.append({
                    "month": m_str,
                    "quantity": grouped_dict[m_str][0],
                    "spend": grouped_dict[m_str][1]
                })
            if not monthly_usage:
                monthly_usage = [
                    {"month": "2026-05", "quantity": 110, "spend": 2100.0},
                    {"month": "2026-06", "quantity": 230, "spend": 4500.0},
                    {"month": "2026-07", "quantity": 180, "spend": 3200.0}
                ]

            # 2. Dept comparison
            dept_usage = []
            for d in depts:
                dept_usage.append({
                    "name": d["name"],
                    "spent": d["budget_spent"],
                    "allocated": d["budget_allocated"]
                })

            # 3. Category distribution
            cat_usage_dict = {}
            for item in inv:
                cat = item["category"]
                cat_usage_dict[cat] = cat_usage_dict.get(cat, 0) + (item["price"] * item["quantity"])
            cat_usage = [{"name": k, "value": v} for k, v in cat_usage_dict.items()]

            return self.respond_json(200, {
                "summary": {
                    "total_inventory": total_inv,
                    "low_stock": low_stock,
                    "out_of_stock": out_stock,
                    "pending_requests": pending_reqs,
                    "approved_reqs": approved_reqs,
                    "rejected_reqs": rejected_reqs,
                    "total_purchase_orders": total_pos,
                    "today_requests": today_requests,
                    "total_complaints": total_complaints,
                    "open_complaints": open_complaints,
                    "budget_allocated": budget_allocated,
                    "budget_spent": budget_spent
                },
                "charts": {
                    "monthly_usage": monthly_usage,
                    "department_usage": dept_usage,
                    "category_usage": cat_usage
                }
            })

        # 11. Extended Analytics Metrics
        if path == "/api/analytics/metrics":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
                
            vendors = db.get_collection("vendors")
            vendor_perf = [{"name": v["name"], "rating": v["rating"]} for v in vendors]
            
            comps = db.get_collection("complaints")
            complaint_stats = {}
            for c in comps:
                complaint_stats[c["type"]] = complaint_stats.get(c["type"], 0) + 1
            complaint_data = [{"type": k, "count": v} for k, v in complaint_stats.items()]
            
            reqs = db.get_collection("requests")
            req_counts = {}
            for r in reqs:
                name = r["item_name"]
                req_counts[name] = req_counts.get(name, 0) + r["quantity"]
            sorted_reqs = sorted(req_counts.items(), key=lambda x: x[1], reverse=True)
            top_items = [{"name": k, "value": v} for k, v in sorted_reqs[:5]]
            least_items = [{"name": k, "value": v} for k, v in sorted_reqs[-5:]] if sorted_reqs else []
            
            pos = db.get_collection("purchase_orders")
            po_trends = []
            grouped_po = {}
            for po in pos:
                dt_str = po["created_at"].split("T")[0]
                grouped_po[dt_str] = grouped_po.get(dt_str, 0.0) + po["total_cost"]
            for dt_str in sorted(grouped_po.keys()):
                po_trends.append({"date": dt_str, "cost": grouped_po[dt_str]})
                
            if not po_trends:
                po_trends = [
                    {"date": "2026-06-30", "cost": 1200.0},
                    {"date": "2026-07-02", "cost": 450.0}
                ]

            return self.respond_json(200, {
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
            })

        # 12. AI insights Page (Uses numpy and pandas if installed on host!)
        if path == "/api/ai/insights":
            user = self.get_auth_user()
            if not user:
                return self.respond_error(401, "Not authorized")
                
            inventory_items = db.get_collection("inventory")
            requests = db.get_collection("requests")
            depts = db.get_collection("departments")
            vendors = db.get_collection("vendors")
            consumption = db.get_collection("monthly_consumption")
            
            # Forecast calculations
            forecasts = []
            if HAS_AI_LIBS and consumption:
                # Compile demand forecast using pandas
                df_c = pd.DataFrame(consumption)
                df_c["month_str"] = df_c.apply(lambda r: f"{int(r['year'])}-{int(r['month']):02d}", axis=1)
                grouped = df_c.groupby(["category", "month_str"])["quantity_consumed"].sum().reset_index()
                
                for cat in grouped["category"].unique():
                    cat_data = grouped[grouped["category"] == cat].sort_values("month_str")
                    history = cat_data["quantity_consumed"].astype(float).tolist()
                    
                    if len(history) >= 2:
                        # Exponential smoothing
                        alpha = 0.3
                        forecast = history[0]
                        for val in history:
                            forecast = alpha * val + (1 - alpha) * forecast
                            
                        # Linear trend using numpy
                        x = np.arange(len(history))
                        y = np.array(history)
                        slope, intercept = np.polyfit(x, y, 1)
                        next_val = slope * len(history) + intercept
                        
                        final_forecast = round((forecast + max(0.0, next_val)) / 2.0, 1)
                        direction = "Upward" if slope > 0 else "Downward" if slope < 0 else "Stable"
                        
                        forecasts.append({
                            "category": cat,
                            "historical_average": round(np.mean(history), 1),
                            "last_month_actual": history[-1],
                            "forecasted_next_month": final_forecast,
                            "trend_direction": direction
                        })
            else:
                # Pure Python Fallback math for forecasting
                cat_groups = {}
                for c in consumption:
                    cat = c["category"]
                    m_str = f"{c['year']}-{c['month']:02d}"
                    if cat not in cat_groups:
                        cat_groups[cat] = {}
                    cat_groups[cat][m_str] = cat_groups[cat].get(m_str, 0) + c["quantity_consumed"]
                
                for cat, dates in cat_groups.items():
                    history = [float(dates[d]) for d in sorted(dates.keys())]
                    if len(history) >= 2:
                        # Exponential smoothing
                        forecast = history[0]
                        for val in history:
                            forecast = 0.3 * val + 0.7 * forecast
                        # Pure Python Linear regression
                        n = len(history)
                        x = list(range(n))
                        mean_x = sum(x) / n
                        mean_y = sum(history) / n
                        num = sum((x[i] - mean_x) * (history[i] - mean_y) for i in range(n))
                        den = sum((x[i] - mean_x) ** 2 for i in range(n))
                        slope = num / den if den != 0 else 0
                        intercept = mean_y - slope * mean_x
                        next_val = max(0.0, slope * n + intercept)
                        
                        final_forecast = round((forecast + next_val) / 2.0, 1)
                        direction = "Upward" if slope > 0 else "Downward" if slope < 0 else "Stable"
                        
                        forecasts.append({
                            "category": cat,
                            "historical_average": round(mean_y, 1),
                            "last_month_actual": history[-1],
                            "forecasted_next_month": final_forecast,
                            "trend_direction": direction
                        })

            if not forecasts:
                forecasts = [
                    {"category": "Office Stationery", "historical_average": 45.2, "last_month_actual": 48.0, "forecasted_next_month": 51.5, "trend_direction": "Upward"},
                    {"category": "Lab Chemicals", "historical_average": 22.0, "last_month_actual": 19.0, "forecasted_next_month": 21.0, "trend_direction": "Stable"},
                    {"category": "Computer Accessories", "historical_average": 15.4, "last_month_actual": 12.0, "forecasted_next_month": 18.2, "trend_direction": "Upward"}
                ]

            # Shortages
            shortages = []
            reorder_suggestions = []
            for item in inventory_items:
                qty = item["quantity"]
                min_stk = item["min_stock"]
                max_stk = item["max_stock"]
                if qty <= min_stk:
                    shortages.append({
                        "item_name": item["name"],
                        "sku": item["sku"],
                        "category": item["category"],
                        "current_stock": qty,
                        "min_stock": min_stk,
                        "risk_level": "Critical" if qty == 0 else "High"
                    })
                    reorder_suggestions.append({
                        "item_name": item["name"],
                        "category": item["category"],
                        "suggested_quantity": max_stk - qty,
                        "estimated_cost": (max_stk - qty) * item["price"],
                        "priority": "Critical" if qty == 0 else "High",
                        "reason": f"Stock is below safety margins: {qty}/{min_stk} units."
                    })

            # Fast / Slow Moving
            fast_moving = []
            slow_moving = []
            item_qty = {}
            for r in requests:
                name = r["item_name"]
                item_qty[name] = item_qty.get(name, 0) + r["quantity"]
            sorted_items = sorted(item_qty.items(), key=lambda x: x[1], reverse=True)
            
            for name, qty in sorted_items[:3]:
                fast_moving.append({"item_name": name, "total_requested": qty, "turnover_index": "High"})
            for name, qty in sorted_items[-3:]:
                if name not in [f["item_name"] for f in fast_moving]:
                    slow_moving.append({"item_name": name, "total_requested": qty, "turnover_index": "Low"})
            
            if not fast_moving:
                fast_moving = [{"item_name": "A4 Copier Paper", "total_requested": 150, "turnover_index": "High"}]
                slow_moving = [{"item_name": "Digital Oscilloscope", "total_requested": 2, "turnover_index": "Low"}]

            # Budgets limits
            budget_recommendations = []
            for d in depts:
                spent = d["budget_spent"]
                allocated = d["budget_allocated"]
                if allocated > 0:
                    rate = (spent / allocated) * 100
                    if rate > 80:
                        budget_recommendations.append({
                            "department": d["name"],
                            "utilization_rate": round(rate, 1),
                            "recommendation": "Freeze non-essential orders immediately. Budget limit exceeded.",
                            "severity": "Critical"
                        })
            if not budget_recommendations:
                budget_recommendations = [{"department": "Computer Science Department", "utilization_rate": 84.5, "recommendation": "High budget spent. Limit discretionary PC purchases.", "severity": "Medium"}]

            # Vendors preferred
            vendor_recommendations = []
            for v in vendors:
                if v["rating"] >= 4.5:
                    vendor_recommendations.append({
                        "vendor_name": v["name"],
                        "rating": v["rating"],
                        "recommendation": "Highly reliable supplier. Priority choice for procurement contracts.",
                        "action": "Prioritize"
                    })
            if not vendor_recommendations:
                vendor_recommendations = [{"vendor_name": "Global Tech Solutions", "rating": 4.8, "recommendation": "Highly reliable networking supplies.", "action": "Prioritize"}]

            return self.respond_json(200, {
                "shortages": shortages,
                "reorder_suggestions": reorder_suggestions,
                "demand_forecasts": forecasts,
                "fast_moving": fast_moving,
                "slow_moving": slow_moving,
                "budget_recommendations": budget_recommendations,
                "vendor_recommendations": vendor_recommendations
            })

        # 13. Reports Exports (CSV / Excel Mock / PDF Mock streams)
        match_export = self.match_regex(r"^/api/reports/export/(csv|excel|pdf)/([a-zA-Z0-9_]+)$")
        if match_export:
            export_format = match_export.group(1)
            report_type = match_export.group(2)
            
            # Fetch target items
            if report_type == "inventory":
                records = db.get_collection("inventory")
            elif report_type == "requests":
                records = db.get_collection("requests")
            elif report_type == "purchases":
                records = db.get_collection("purchase_orders")
            elif report_type == "complaints":
                records = db.get_collection("complaints")
            else:
                records = db.get_collection("departments")
                
            # Compile simple CSV output stream
            output = io.StringIO()
            writer = csv.writer(output)
            
            if not records:
                writer.writerow(["No records found"])
            else:
                headers = [k for k in records[0].keys() if k != "hashed_password" and k != "reset_token"]
                writer.writerow(headers)
                for item in records:
                    row = [str(item.get(h, ""))[:40] for h in headers]
                    writer.writerow(row)
                    
            output.seek(0)
            file_bytes = output.getvalue().encode('utf-8')
            
            self.send_response(200)
            self.send_header("Content-Type", "text/csv")
            self.send_header("Content-Disposition", f"attachment; filename=sipms_{report_type}_report.csv")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(file_bytes)
            return

        return self.respond_error(404, "Endpoint not found")

    def do_POST(self):
        path = self.path
        body = self.get_body_json()

        # 1. Login
        if path == "/api/auth/login":
            email = body.get("email")
            password = body.get("password")
            remember_me = body.get("remember_me", False)
            
            users = db.get_collection("users")
            user = None
            for u in users:
                if u["email"] == email:
                    user = u
                    break
                    
            if not user or not verify_password(password, user["hashed_password"]):
                return self.respond_error(401, "Incorrect email or password")
                
            user_payload = {"email": user["email"], "role": user["role"]}
            expires = 2592000 if remember_me else 3600 # 30 days vs 1 hr
            
            token = create_token(user_payload, expires)
            refresh = create_token(user_payload, expires * 2)
            
            user_res = user.copy()
            user_res.pop("hashed_password", None)
            user_res["id"] = user_res.pop("_id")
            
            log_action(user, "LOGIN")
            
            return self.respond_json(200, {
                "access_token": token,
                "refresh_token": refresh,
                "token_type": "bearer",
                "user": user_res
            })

        # 2. Register
        if path == "/api/auth/register":
            email = body.get("email")
            password = body.get("password")
            name = body.get("name")
            role = body.get("role", "Staff")
            department_id = body.get("department_id")
            
            users = db.get_collection("users")
            for u in users:
                if u["email"] == email:
                    return self.respond_error(400, "Email already taken")
                    
            new_user = {
                "_id": f"usr-{uuid.uuid4().hex[:10]}",
                "email": email,
                "hashed_password": hash_password(password),
                "name": name,
                "role": role,
                "department_id": department_id or "DEP-CS",
                "is_verified": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            users.append(new_user)
            db.save_collection("users", users)
            
            user_payload = {"email": new_user["email"], "role": new_user["role"]}
            token = create_token(user_payload)
            refresh = create_token(user_payload, 7200)
            
            user_res = new_user.copy()
            user_res.pop("hashed_password", None)
            user_res["id"] = user_res.pop("_id")
            
            log_action(new_user, "REGISTER")
            
            return self.respond_json(200, {
                "access_token": token,
                "refresh_token": refresh,
                "token_type": "bearer",
                "user": user_res
            })

        # 3. Refresh token
        if path == "/api/auth/refresh":
            refresh_token = body.get("refresh_token")
            payload = verify_token(refresh_token) if refresh_token else None
            if not payload:
                return self.respond_error(401, "Invalid refresh token")
                
            token = create_token(payload)
            new_refresh = create_token(payload, 7200)
            return self.respond_json(200, {
                "access_token": token,
                "refresh_token": new_refresh,
                "token_type": "bearer"
            })

        # 4. Forgot password
        if path == "/api/auth/forgot-password":
            email = body.get("email")
            users = db.get_collection("users")
            user = None
            for u in users:
                if u["email"] == email:
                    user = u
                    break
            if not user:
                return self.respond_json(200, {"message": "Reset details logged if email matches."})
                
            reset_token = str(uuid.uuid4())
            user["reset_token"] = reset_token
            db.save_collection("users", users)
            return self.respond_json(200, {
                "message": "Reset details logged if email matches.",
                "debug_reset_token": reset_token
            })

        # 5. Reset password
        if path == "/api/auth/reset-password":
            token = body.get("token")
            password = body.get("password")
            
            users = db.get_collection("users")
            user = None
            for u in users:
                if u.get("reset_token") == token:
                    user = u
                    break
            if not user:
                return self.respond_error(400, "Invalid reset token")
                
            user["hashed_password"] = hash_password(password)
            user.pop("reset_token", None)
            db.save_collection("users", users)
            log_action(user, "RESET_PASSWORD")
            return self.respond_json(200, {"message": "Password reset completed."})

        # 6. Create Inventory
        if path == "/api/inventory":
            user = self.get_auth_user()
            if not user or user["role"] != "Administrator":
                return self.respond_error(401, "Not authorized")
                
            items = db.get_collection("inventory")
            for item in items:
                if item["sku"] == body.get("sku"):
                    return self.respond_error(400, "SKU already exists")
                    
            item_id = str(uuid.uuid4())
            new_item = {
                "_id": item_id,
                "name": body.get("name"),
                "sku": body.get("sku"),
                "barcode": body.get("barcode"),
                "qr_code": body.get("qr_code"),
                "category": body.get("category"),
                "department_id": body.get("department_id"),
                "vendor_id": body.get("vendor_id"),
                "purchase_date": body.get("purchase_date"),
                "warranty": body.get("warranty", "1 Year"),
                "quantity": int(body.get("quantity", 0)),
                "min_stock": int(body.get("min_stock", 5)),
                "max_stock": int(body.get("max_stock", 100)),
                "price": float(body.get("price", 0.0)),
                "location": body.get("location"),
                "status": determine_status(int(body.get("quantity", 0)), int(body.get("min_stock", 5))),
                "expiry_date": body.get("expiry_date"),
                "image_url": body.get("image_url") or "https://picsum.photos/200/200",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            items.append(new_item)
            db.save_collection("inventory", items)
            log_action(user, "CREATE_INVENTORY_ITEM", None, new_item)
            
            res_item = new_item.copy()
            res_item["id"] = res_item.pop("_id")
            return self.respond_json(200, res_item)

        # 7. Create Request
        if path == "/api/requests":
            user = self.get_auth_user()
            if not user or user["role"] not in ["Staff", "Administrator"]:
                return self.respond_error(401, "Not authorized")
                
            reqs = db.get_collection("requests")
            req_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            new_req = {
                "_id": req_id,
                "requester_id": user["_id"],
                "department_id": user["department_id"],
                "item_name": body.get("item_name"),
                "category": body.get("category"),
                "quantity": int(body.get("quantity", 1)),
                "estimated_cost": float(body.get("estimated_cost", 0.0)),
                "purpose": body.get("purpose"),
                "status": "Pending HOD",
                "timeline": [{
                    "status": "Pending HOD",
                    "timestamp": now,
                    "updated_by": user["name"],
                    "comments": "Request submitted"
                }],
                "po_id": None,
                "created_at": now
            }
            reqs.append(new_req)
            db.save_collection("requests", reqs)
            log_action(user, "CREATE_REQUEST", None, new_req)
            
            res_req = new_req.copy()
            res_req["id"] = res_req.pop("_id")
            return self.respond_json(200, res_req)

        # 8. Create Vendor
        if path == "/api/purchases/vendors":
            user = self.get_auth_user()
            if not user or user["role"] != "Administrator":
                return self.respond_error(401, "Not authorized")
                
            vendors = db.get_collection("vendors")
            vendor_id = str(uuid.uuid4())
            new_vendor = {
                "_id": vendor_id,
                "name": body.get("name"),
                "contact_person": body.get("contact_person"),
                "email": body.get("email"),
                "phone": body.get("phone"),
                "rating": 5.0,
                "categories": body.get("categories", []),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            vendors.append(new_vendor)
            db.save_collection("vendors", vendors)
            log_action(user, "CREATE_VENDOR", None, new_vendor)
            
            res_vendor = new_vendor.copy()
            res_vendor["id"] = res_vendor.pop("_id")
            return self.respond_json(200, res_vendor)

        # 9. Rate Vendor
        match_rate = self.match_regex(r"^/api/purchases/vendors/([a-zA-Z0-9_-]+)/rate$")
        if match_rate:
            vendor_id = match_rate.group(1)
            user = self.get_auth_user()
            if not user or user["role"] not in ["Administrator", "HOD"]:
                return self.respond_error(401, "Not authorized")
                
            rating = float(body.get("rating", 5.0))
            vendors = db.get_collection("vendors")
            for v in vendors:
                if v["_id"] == vendor_id:
                    v["rating"] = round((v.get("rating", 5.0) + rating) / 2.0, 1)
                    db.save_collection("vendors", vendors)
                    return self.respond_json(200, {"message": "Vendor rated successfully", "rating": v["rating"]})
            return self.respond_error(404, "Vendor not found")

        # 10. Generate Purchase Order (PO)
        if path == "/api/purchases/orders":
            user = self.get_auth_user()
            if not user or user["role"] != "Administrator":
                return self.respond_error(401, "Not authorized")
                
            orders = db.get_collection("purchase_orders")
            po_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            new_po = {
                "_id": po_id,
                "request_id": body.get("request_id"),
                "vendor_id": body.get("vendor_id"),
                "items": body.get("items", []),
                "total_cost": float(body.get("total_cost", 0.0)),
                "status": "Draft",
                "expected_delivery": body.get("expected_delivery"),
                "actual_delivery": None,
                "invoice_url": None,
                "created_at": now
            }
            orders.append(new_po)
            db.save_collection("purchase_orders", orders)
            
            # Advanc request stage
            reqs = db.get_collection("requests")
            for r in reqs:
                if r["_id"] == body.get("request_id"):
                    r["status"] = "Ordered"
                    r["po_id"] = po_id
                    r["timeline"].append({
                        "status": "Ordered",
                        "timestamp": now,
                        "updated_by": user["name"],
                        "comments": f"PO {po_id.split('-')[0]} generated. Sent to vendor."
                    })
                    db.save_collection("requests", reqs)
                    break
                    
            log_action(user, "CREATE_PURCHASE_ORDER", None, new_po)
            
            res_po = new_po.copy()
            res_po["id"] = res_po.pop("_id")
            return self.respond_json(200, res_po)

        # 11. Create Complaint
        if path == "/api/complaints":
            user = self.get_auth_user()
            if not user or user["role"] not in ["Staff", "Administrator"]:
                return self.respond_error(401, "Not authorized")
                
            comps = db.get_collection("complaints")
            comp_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            new_comp = {
                "_id": comp_id,
                "user_id": user["_id"],
                "type": body.get("type"),
                "description": body.get("description"),
                "status": "Submitted",
                "assigned_to": None,
                "resolution_notes": None,
                "created_at": now,
                "updated_at": now
            }
            comps.append(new_comp)
            db.save_collection("complaints", comps)
            log_action(user, "CREATE_COMPLAINT", None, new_comp)
            
            res_comp = new_comp.copy()
            res_comp["id"] = res_comp.pop("_id")
            return self.respond_json(200, res_comp)

        return self.respond_error(404, "Endpoint not found")

    def do_PUT(self):
        path = self.path
        body = self.get_body_json()
        user = self.get_auth_user()
        
        if not user:
            return self.respond_error(401, "Not authorized")

        # 1. Update Profile
        if path == "/api/auth/profile":
            users = db.get_collection("users")
            for u in users:
                if u["_id"] == user["_id"]:
                    old = u.copy()
                    if body.get("name"): u["name"] = body.get("name")
                    if body.get("email"): u["email"] = body.get("email")
                    if body.get("password"): u["hashed_password"] = hash_password(body.get("password"))
                    
                    db.save_collection("users", users)
                    log_action(user, "UPDATE_PROFILE", old, u)
                    
                    res_user = u.copy()
                    res_user.pop("hashed_password", None)
                    res_user["id"] = res_user.pop("_id")
                    return self.respond_json(200, res_user)

        # 2. Update Inventory item details
        match_inv = self.match_regex(r"^/api/inventory/([a-zA-Z0-9_-]+)$")
        if match_inv:
            item_id = match_inv.group(1)
            if user["role"] != "Administrator":
                return self.respond_error(403, "Not allowed")
                
            inv = db.get_collection("inventory")
            for item in inv:
                if item["_id"] == item_id:
                    old = item.copy()
                    for k, v in body.items():
                        if k != "_id" and k != "id":
                            item[k] = v
                    # Recalculate status
                    item["status"] = determine_status(item["quantity"], item["min_stock"])
                    db.save_collection("inventory", inv)
                    log_action(user, f"UPDATE_INVENTORY_ITEM_{item_id}", old, item)
                    
                    res_item = item.copy()
                    res_item["id"] = res_item.pop("_id")
                    return self.respond_json(200, res_item)
            return self.respond_error(404, "Inventory item not found")

        # 3. Update Request timeline (Approvals / Decisions)
        match_req_status = self.match_regex(r"^/api/requests/([a-zA-Z0-9_-]+)/status$")
        if match_req_status:
            req_id = match_req_status.group(1)
            reqs = db.get_collection("requests")
            
            for req in reqs:
                if req["_id"] == req_id:
                    old_status = req["status"]
                    new_status = body.get("status")
                    comments = body.get("comments", "")
                    
                    # RBAC gate checks
                    if user["role"] == "HOD":
                        if old_status != "Pending HOD":
                            return self.respond_error(400, "Can only approve Pending HOD")
                        if new_status == "Approved HOD":
                            new_status = "Pending Admin"
                    elif user["role"] == "Principal":
                        if old_status not in ["Pending Admin", "Approved HOD"]:
                            return self.respond_error(400, "Invalid reviewer state")
                            
                    # Update status
                    now = datetime.now(timezone.utc).isoformat()
                    req["status"] = new_status
                    req["timeline"].append({
                        "status": new_status,
                        "timestamp": now,
                        "updated_by": user["name"],
                        "comments": comments
                    })
                    
                    # AUTOMATION: stock deduction when Admin issues materials!
                    if new_status == "Completed" and old_status == "Stock Checking":
                        inv = db.get_collection("inventory")
                        target_item = None
                        for item in inv:
                            if item["name"] == req["item_name"] and item["category"] == req["category"]:
                                target_item = item
                                break
                        if not target_item or target_item["quantity"] < req["quantity"]:
                            return self.respond_error(400, f"Cannot issue: Available stock: {target_item['quantity'] if target_item else 0}")
                            
                        # Deduct quantity
                        target_item["quantity"] -= req["quantity"]
                        target_item["status"] = determine_status(target_item["quantity"], target_item["min_stock"])
                        db.save_collection("inventory", inv)
                        
                        # Add monthly consumption spend
                        cons = db.get_collection("monthly_consumption")
                        date_obj = datetime.now()
                        month_id = f"{date_obj.year}-{date_obj.month:02d}-{req['department_id']}-{req['category']}"
                        found_con = False
                        for c in cons:
                            if c["_id"] == month_id:
                                c["quantity_consumed"] += req["quantity"]
                                c["total_spend"] += req["estimated_cost"]
                                found_con = True
                                break
                        if not found_con:
                            cons.append({
                                "_id": month_id,
                                "year": date_obj.year,
                                "month": date_obj.month,
                                "department_id": req["department_id"],
                                "category": req["category"],
                                "quantity_consumed": req["quantity"],
                                "total_spend": req["estimated_cost"]
                            })
                        db.save_collection("monthly_consumption", cons)
                        
                        # Deduct department budget
                        depts = db.get_collection("departments")
                        for d in depts:
                            if d["_id"] == req["department_id"]:
                                d["budget_spent"] += req["estimated_cost"]
                                break
                        db.save_collection("departments", depts)

                    db.save_collection("requests", reqs)
                    log_action(user, f"UPDATE_REQUEST_STATUS_{req_id}", {"status": old_status}, {"status": new_status})
                    
                    res_req = req.copy()
                    res_req["id"] = res_req.pop("_id")
                    return self.respond_json(200, res_req)
            return self.respond_error(404, "Request not found")

        # 4. Update PO Status (Draft -> Shipped -> Received)
        match_po_status = self.match_regex(r"^/api/purchases/orders/([a-zA-Z0-9_-]+)/status$")
        if match_po_status:
            po_id = match_po_status.group(1)
            orders = db.get_collection("purchase_orders")
            
            for po in orders:
                if po["_id"] == po_id:
                    old_status = po["status"]
                    new_status = body.get("status")
                    
                    po["status"] = new_status
                    now = datetime.now(timezone.utc).isoformat()
                    if new_status == "Received":
                        po["actual_delivery"] = now
                        
                    db.save_collection("purchase_orders", orders)
                    
                    # AUTOMATION: Increment inventory when PO is received!
                    if new_status == "Received" and old_status != "Received":
                        reqs = db.get_collection("requests")
                        req_obj = None
                        for r in reqs:
                            if r["_id"] == po["request_id"]:
                                req_obj = r
                                break
                        dept_id = req_obj["department_id"] if req_obj else "DEP-GEN"
                        cat = req_obj["category"] if req_obj else "General"
                        
                        inv = db.get_collection("inventory")
                        for item in po["items"]:
                            # Look for existing item
                            target_item = None
                            for inv_item in inv:
                                if inv_item["name"] == item["item_name"] and inv_item["category"] == cat:
                                    target_item = inv_item
                                    break
                            if target_item:
                                target_item["quantity"] += item["quantity"]
                                target_item["status"] = determine_status(target_item["quantity"], target_item["min_stock"])
                            else:
                                # Create new item
                                inv.append({
                                    "_id": f"inv-{uuid.uuid4().hex[:10]}",
                                    "name": item["item_name"],
                                    "sku": f"SKU-{item['item_name'][:3].upper()}-{uuid.uuid4().hex[:5].upper()}",
                                    "barcode": f"BAR-{uuid.uuid4().hex[:8].upper()}",
                                    "qr_code": f"QR-{uuid.uuid4().hex[:8].upper()}",
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
                                })
                        db.save_collection("inventory", inv)
                        
                        # Advance associated request to stock checking stage
                        if req_obj:
                            req_obj["status"] = "Stock Checking"
                            req_obj["timeline"].append({
                                "status": "Received",
                                "timestamp": now,
                                "updated_by": user["name"],
                                "comments": "PO goods received at warehouse. Syncing stock."
                            })
                            req_obj["timeline"].append({
                                "status": "Stock Checking",
                                "timestamp": now,
                                "updated_by": "System Auto",
                                "comments": "Stock check passed. Material available."
                            })
                            db.save_collection("requests", reqs)

                    log_action(user, f"UPDATE_PO_STATUS_{po_id}", {"status": old_status}, {"status": new_status})
                    
                    res_po = po.copy()
                    res_po["id"] = res_po.pop("_id")
                    return self.respond_json(200, res_po)
            return self.respond_error(404, "Purchase Order not found")

        # 5. Resolve Complaint Ticket
        match_comp = self.match_regex(r"^/api/complaints/([a-zA-Z0-9_-]+)$")
        if match_comp:
            comp_id = match_comp.group(1)
            if user["role"] not in ["Administrator", "HOD"]:
                return self.respond_error(403, "Not allowed")
                
            comps = db.get_collection("complaints")
            for c in comps:
                if c["_id"] == comp_id:
                    old = c.copy()
                    c["status"] = body.get("status")
                    if body.get("resolution_notes"):
                        c["resolution_notes"] = body.get("resolution_notes")
                    c["assigned_to"] = user["_id"]
                    c["updated_at"] = datetime.now(timezone.utc).isoformat()
                    
                    db.save_collection("complaints", comps)
                    log_action(user, f"RESOLVE_COMPLAINT_{comp_id}", old, c)
                    
                    res_comp = c.copy()
                    res_comp["id"] = res_comp.pop("_id")
                    return self.respond_json(200, res_comp)
            return self.respond_error(404, "Complaint ticket not found")

        return self.respond_error(404, "Endpoint not found")

    def do_DELETE(self):
        user = self.get_auth_user()
        if not user:
            return self.respond_error(401, "Not authorized")
            
        # Delete Inventory asset
        match_inv = self.match_regex(r"^/api/inventory/([a-zA-Z0-9_-]+)$")
        if match_inv:
            item_id = match_inv.group(1)
            if user["role"] != "Administrator":
                return self.respond_error(403, "Not allowed")
                
            inv = db.get_collection("inventory")
            new_inv = [item for item in inv if item["_id"] != item_id]
            if len(new_inv) == len(inv):
                return self.respond_error(404, "Inventory item not found")
                
            # Log deleted item
            deleted_doc = next(x for x in inv if x["_id"] == item_id)
            db.save_collection("inventory", new_inv)
            log_action(user, f"DELETE_INVENTORY_ITEM_{item_id}", deleted_doc, None)
            return self.respond_json(200, {"message": "Asset deleted successfully"})
            
        return self.respond_error(404, "Endpoint not found")

# Run Server
def run(server_class=HTTPServer, handler_class=SIPMSRequestHandler):
    seed_data_if_empty()
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"[*] SIPMS REST Backend Server active on port {PORT}...")
    print(f"[*] Local database file: {LOCAL_DB_PATH}")
    print(f"[*] Pandas & NumPy AI library status: {'AVAILABLE (Highly Optimized)' if HAS_AI_LIBS else 'FALLBACK (Pure Python)'}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
