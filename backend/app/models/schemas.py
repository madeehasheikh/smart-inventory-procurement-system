from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime

# ----------------- AUTHENTICATION & USERS -----------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "Staff"  # Staff, HOD, Principal, Management, Administrator
    department_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    name: str
    role: str
    department_id: Optional[str] = None
    is_verified: bool
    created_at: str

    class Config:
        populate_by_name = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- DEPARTMENTS -----------------
class DepartmentCreate(BaseModel):
    id: str = Field(..., description="ID like DEP-CS")
    name: str
    budget_allocated: float
    budget_spent: float = 0.0

class DepartmentResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    budget_allocated: float
    budget_spent: float

    class Config:
        populate_by_name = True

# ----------------- VENDORS -----------------
class VendorCreate(BaseModel):
    name: str
    contact_person: str
    email: str
    phone: str
    rating: float = 5.0
    categories: List[str] = []

class VendorResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    contact_person: str
    email: str
    phone: str
    rating: float
    categories: List[str]

    class Config:
        populate_by_name = True

# ----------------- INVENTORY -----------------
class InventoryCreate(BaseModel):
    name: str
    sku: str
    barcode: str
    qr_code: str
    category: str
    department_id: str
    vendor_id: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty: str = "N/A"
    quantity: int
    min_stock: int
    max_stock: int
    price: float
    location: str
    status: str = "In Stock"
    expiry_date: Optional[str] = None
    image_url: Optional[str] = None

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    qr_code: Optional[str] = None
    category: Optional[str] = None
    department_id: Optional[str] = None
    vendor_id: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty: Optional[str] = None
    quantity: Optional[int] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    price: Optional[float] = None
    location: Optional[str] = None
    status: Optional[str] = None
    expiry_date: Optional[str] = None
    image_url: Optional[str] = None

class InventoryResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    sku: str
    barcode: str
    qr_code: str
    category: str
    department_id: str
    vendor_id: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty: str
    quantity: int
    min_stock: int
    max_stock: int
    price: float
    location: str
    status: str
    expiry_date: Optional[str] = None
    image_url: Optional[str] = None
    created_at: str

    class Config:
        populate_by_name = True

# ----------------- PROCUREMENT REQUESTS -----------------
class TimelineItem(BaseModel):
    status: str
    timestamp: str
    updated_by: str
    comments: Optional[str] = ""

class RequestCreate(BaseModel):
    item_name: str
    category: str
    quantity: int
    estimated_cost: float
    purpose: str

class RequestUpdate(BaseModel):
    status: str
    comments: Optional[str] = ""
    po_id: Optional[str] = None
    vendor_id: Optional[str] = None

class RequestResponse(BaseModel):
    id: str = Field(alias="_id")
    requester_id: str
    department_id: str
    item_name: str
    category: str
    quantity: int
    estimated_cost: float
    purpose: str
    status: str
    timeline: List[TimelineItem]
    po_id: Optional[str] = None
    created_at: str

    class Config:
        populate_by_name = True

# ----------------- PURCHASE ORDERS -----------------
class POItem(BaseModel):
    item_name: str
    quantity: int
    price: float

class POCreate(BaseModel):
    request_id: str
    vendor_id: str
    items: List[POItem]
    total_cost: float
    expected_delivery: Optional[str] = None

class POUpdate(BaseModel):
    status: str
    invoice_url: Optional[str] = None
    actual_delivery: Optional[str] = None

class POResponse(BaseModel):
    id: str = Field(alias="_id")
    request_id: str
    vendor_id: str
    items: List[POItem]
    total_cost: float
    status: str
    expected_delivery: Optional[str] = None
    actual_delivery: Optional[str] = None
    invoice_url: Optional[str] = None
    created_at: str

    class Config:
        populate_by_name = True

# ----------------- COMPLAINTS -----------------
class ComplaintCreate(BaseModel):
    type: str  # Late delivery, Wrong item, Damaged item, Pending request, Poor quality
    description: str

class ComplaintUpdate(BaseModel):
    status: str  # Submitted, Assigned, Investigation, Resolved, Closed
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    type: str
    description: str
    status: str
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True

# ----------------- AUDIT LOGS -----------------
class AuditLogResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    user_email: str
    role: str
    action: str
    timestamp: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True
