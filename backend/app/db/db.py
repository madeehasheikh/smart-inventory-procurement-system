import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger("sipms.db")

class LocalCursor:
    def __init__(self, data: List[Dict[str, Any]]):
        self._data = data
        self._skip = 0
        self._limit = None
        self._sort_key = None
        self._sort_direction = 1

    def sort(self, key_or_list: Any, direction: int = 1):
        if isinstance(key_or_list, list) and len(key_or_list) > 0:
            self._sort_key = key_or_list[0][0]
            self._sort_direction = key_or_list[0][1]
        else:
            self._sort_key = key_or_list
            self._sort_direction = direction
        return self

    def skip(self, count: int):
        self._skip = count
        return self

    def limit(self, count: int):
        self._limit = count
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        # Apply sorting
        data = list(self._data)
        if self._sort_key:
            def sort_val(x):
                val = x.get(self._sort_key)
                if val is None:
                    return ""
                return val
            reverse = self._sort_direction == -1
            try:
                data.sort(key=sort_val, reverse=reverse)
            except Exception:
                pass  # Ignore type mismatches

        # Apply skip and limit
        start = self._skip
        end = None
        if self._limit is not None:
            end = start + self._limit
        elif length is not None:
            end = start + length

        return data[start:end]

class LocalCollection:
    def __init__(self, db_client: 'LocalJSONDB', name: str):
        self.db_client = db_client
        self.name = name

    def _get_data(self) -> List[Dict[str, Any]]:
        return self.db_client._read_data().get(self.name, [])

    def _save_data(self, data: List[Dict[str, Any]]):
        all_data = self.db_client._read_data()
        all_data[self.name] = data
        self.db_client._write_data(all_data)

    def _match_query(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "$or":
                # Handle basic OR query
                if not isinstance(v, list) or not any(self._match_query(doc, sub) for sub in v):
                    return False
            elif k == "$and":
                # Handle basic AND query
                if not isinstance(v, list) or not all(self._match_query(doc, sub) for sub in v):
                    return False
            else:
                doc_val = doc.get(k)
                if isinstance(v, dict):
                    # Handle operators like $regex, $in, $gte, $lte
                    for op, op_val in v.items():
                        if op == "$regex":
                            import re
                            if not doc_val or not re.search(str(op_val), str(doc_val), re.IGNORECASE):
                                return False
                        elif op == "$in":
                            if doc_val not in op_val:
                                return False
                        elif op == "$gte":
                            if doc_val is None or doc_val < op_val:
                                return False
                        elif op == "$lte":
                            if doc_val is None or doc_val > op_val:
                                return False
                        elif op == "$gt":
                            if doc_val is None or doc_val <= op_val:
                                return False
                        elif op == "$lt":
                            if doc_val is None or doc_val >= op_val:
                                return False
                        elif op == "$ne":
                            if doc_val == op_val:
                                return False
                else:
                    if doc_val != v:
                        return False
        return True

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = self._get_data()
        for doc in data:
            if self._match_query(doc, query):
                return doc
        return None

    def find(self, query: Dict[str, Any]) -> LocalCursor:
        data = self._get_data()
        filtered = [doc for doc in data if self._match_query(doc, query)]
        return LocalCursor(filtered)

    async def insert_one(self, doc: Dict[str, Any]):
        data = self._get_data()
        # Serialize datetimes to string format for JSON compatibility
        doc_copy = self._serialize(doc)
        data.append(doc_copy)
        self._save_data(data)
        return type('InsertResult', (), {'inserted_id': doc_copy.get('_id')})()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        data = self._get_data()
        updated = False
        target_doc = None
        
        for idx, doc in enumerate(data):
            if self._match_query(doc, query):
                target_doc = doc
                # Apply updates
                if "$set" in update:
                    for k, v in update["$set"].items():
                        target_doc[k] = self._serialize_val(v)
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        target_doc[k] = target_doc.get(k, 0) + v
                data[idx] = target_doc
                updated = True
                break

        if not updated and upsert:
            # Create a new document containing query fields and set fields
            new_doc = {}
            for k, v in query.items():
                if not k.startswith("$"):
                    new_doc[k] = v
            if "$set" in update:
                for k, v in update["$set"].items():
                    new_doc[k] = self._serialize_val(v)
            new_doc = self._serialize(new_doc)
            data.append(new_doc)
            self._save_data(data)
            return type('UpdateResult', (), {'modified_count': 1, 'upserted_id': new_doc.get('_id')})()

        if updated:
            self._save_data(data)
            return type('UpdateResult', (), {'modified_count': 1, 'upserted_id': None})()
            
        return type('UpdateResult', (), {'modified_count': 0, 'upserted_id': None})()

    async def delete_one(self, query: Dict[str, Any]):
        data = self._get_data()
        for idx, doc in enumerate(data):
            if self._match_query(doc, query):
                del data[idx]
                self._save_data(data)
                return type('DeleteResult', (), {'deleted_count': 1})()
        return type('DeleteResult', (), {'deleted_count': 0})()

    async def delete_many(self, query: Dict[str, Any]):
        data = self._get_data()
        original_len = len(data)
        data = [doc for doc in data if not self._match_query(doc, query)]
        self._save_data(data)
        return type('DeleteResult', (), {'deleted_count': original_len - len(data)})()

    async def count_documents(self, query: Dict[str, Any]) -> int:
        data = self._get_data()
        return sum(1 for doc in data if self._match_query(doc, query))

    async def distinct(self, key: str, query: Dict[str, Any] = None) -> List[Any]:
        if query is None:
            query = {}
        data = self._get_data()
        vals = set()
        for doc in data:
            if self._match_query(doc, query) and key in doc:
                val = doc.get(key)
                if isinstance(val, list):
                    for item in val:
                        vals.add(item)
                else:
                    vals.add(val)
        return list(vals)

    def _serialize(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        return {k: self._serialize_val(v) for k, v in doc.items()}

    def _serialize_val(self, val: Any) -> Any:
        if isinstance(val, datetime):
            return val.isoformat()
        if isinstance(val, dict):
            return self._serialize(val)
        if isinstance(val, list):
            return [self._serialize_val(x) for x in val]
        return val

class LocalJSONDB:
    def __init__(self, filepath: str):
        self.filepath = filepath
        # Ensure the directories exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        if not os.path.exists(filepath):
            with open(filepath, 'w') as f:
                json.dump({}, f)

    def _read_data(self) -> Dict[str, List[Dict[str, Any]]]:
        try:
            with open(self.filepath, 'r') as f:
                return json.load(f)
        except Exception:
            return {}

    def _write_data(self, data: Dict[str, List[Dict[str, Any]]]):
        try:
            with open(self.filepath, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing to local database file: {e}")

    def __getattr__(self, name: str) -> LocalCollection:
        return LocalCollection(self, name)

# Initialize Database Gatekeeper
db = None
is_mock_db = False

async def init_db():
    global db, is_mock_db
    try:
        # Check if we can reach real MongoDB with a 1-second timeout
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=1000)
        # Try to ping server
        await client.admin.command('ping')
        db = client[settings.MONGO_DB_NAME]
        is_mock_db = False
        logger.info("Connected to MongoDB database successfully!")
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB ({e}). Falling back to local JSON database.")
        db = LocalJSONDB(settings.LOCAL_DB_PATH)
        is_mock_db = True
        logger.info(f"Initialized Local JSON Database at {settings.LOCAL_DB_PATH}")

# Run initialization during module load
try:
    loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(init_db())
    else:
        loop.run_until_complete(init_db())
except Exception:
    # If run_until_complete fails or loop isn't active, initialize db synchronously to fallback
    db = LocalJSONDB(settings.LOCAL_DB_PATH)
    is_mock_db = True
