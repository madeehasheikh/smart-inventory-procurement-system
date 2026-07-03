import sys
import os
import json
import shutil

# Setup path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import directly from consolidated main
from app.main import (
    hash_password, verify_password, create_token, verify_token,
    determine_status, SyncLocalDB
)

def test_database():
    print("[*] Testing Sync Local JSON Database Engine...")
    test_db_path = os.path.join(os.path.dirname(__file__), "test_db.json")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        
    db = SyncLocalDB(test_db_path)
    
    # 1. Insert
    test_doc = {"_id": "item-1", "name": "Item A", "quantity": 10, "min_stock": 5}
    items = db.get_collection("inventory")
    items.append(test_doc)
    db.save_collection("inventory", items)
    
    items_check = db.get_collection("inventory")
    assert len(items_check) == 1, f"Expected 1 item, got {len(items_check)}"
    print("[OK] Insert and fetch operations verified.")
    
    # 2. Update One & Auto Stock status check
    fetched = items_check[0]
    fetched["quantity"] = 3
    db.save_collection("inventory", items_check)
    
    items_check_2 = db.get_collection("inventory")
    assert items_check_2[0]["quantity"] == 3, "Failed to update item quantity"
    
    status = determine_status(items_check_2[0]["quantity"], items_check_2[0]["min_stock"])
    assert status == "Low Stock", f"Expected 'Low Stock', got {status}"
    print("[OK] Update operations and dynamic status alerts verified.")
    
    # Clean up
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        
    print("[OK] Database fallback unit tests completed successfully!")

def test_security():
    print("[*] Testing PBKDF2 Password Hashing & HMAC Session Handlers...")
    
    password = "SuperSecurePassword123"
    hashed = hash_password(password)
    
    assert verify_password(password, hashed), "Password verification failed"
    assert not verify_password("wrong_pwd", hashed), "Invalid password verified as true"
    print("[OK] PBKDF2 password hashing and verification verified.")
    
    user_payload = {"email": "test@sipms.edu", "role": "Staff"}
    token = create_token(user_payload, expires_in=100)
    decoded = verify_token(token)
    
    assert decoded is not None, "Failed to decode valid token"
    assert decoded["email"] == "test@sipms.edu", "Token extraction email mismatch"
    assert decoded["role"] == "Staff", "Role attribute mismatch"
    print("[OK] Custom signed HMAC-SHA256 session tokens verified.")

def main():
    print("="*60)
    print("           SIPMS BACKEND SYSTEM CHECK")
    print("="*60)
    try:
        test_database()
        test_security()
        print("\n[SUCCESS] All backend sub-modules are operational!")
        print("Run 'python backend/app/main.py' to start the HTTP REST API server.")
        print("="*60)
    except Exception as e:
        print(f"\n[FAIL] Verification error encountered: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
