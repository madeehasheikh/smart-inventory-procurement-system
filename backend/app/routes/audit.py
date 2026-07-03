from fastapi import APIRouter, Depends, Query
from typing import List

from app.models.schemas import AuditLogResponse
from app.db.db import db
from app.routes.dependencies import RoleChecker

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(RoleChecker(["Administrator"]))
):
    cursor = db.audit_logs.find({})
    cursor.sort("timestamp", -1)
    return await cursor.to_list(length=limit)
