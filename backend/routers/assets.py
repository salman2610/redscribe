import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Asset
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/assets", tags=["assets"])

class AssetCreate(BaseModel):
    host: Optional[str] = None
    ip: Optional[str] = None
    os: Optional[str] = None
    ports: Optional[List] = []
    services: Optional[List] = []

@router.get("/project/{project_id}")
async def list_assets(project_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(Asset).where(Asset.project_id == uuid.UUID(project_id)))
    assets = result.scalars().all()
    return [{"id": str(a.id), "host": a.host, "ip": a.ip, "os": a.os, "ports": a.ports, "services": a.services, "created_at": str(a.created_at)} for a in assets]

@router.post("/project/{project_id}")
async def create_asset(project_id: str, data: AssetCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    asset = Asset(project_id=uuid.UUID(project_id), host=data.host, ip=data.ip, os=data.os, ports=data.ports or [], services=data.services or [])
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return {"id": str(asset.id), "host": asset.host, "ip": asset.ip, "os": asset.os, "ports": asset.ports, "services": asset.services}

@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(Asset).where(Asset.id == uuid.UUID(asset_id)))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(asset)
    await db.commit()
    return {"deleted": True}
