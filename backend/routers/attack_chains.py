import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, Column, String, Text, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from models.database import get_db
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase
from models.models import Base

class AttackChain(Base):
    __tablename__ = "attack_chains"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    steps = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

router = APIRouter(prefix="/attack-chains", tags=["attack-chains"])

class ChainStep(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    severity: Optional[str] = "medium"
    finding_id: Optional[str] = None

class ChainCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    steps: Optional[List[ChainStep]] = []

class ChainUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[ChainStep]] = None

@router.get("/project/{project_id}")
async def list_chains(project_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(AttackChain).where(AttackChain.project_id == uuid.UUID(project_id)))
    chains = result.scalars().all()
    return [{"id": str(c.id), "title": c.title, "description": c.description, "steps": c.steps, "created_at": str(c.created_at)} for c in chains]

@router.post("/project/{project_id}")
async def create_chain(project_id: str, data: ChainCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    chain = AttackChain(
        project_id=uuid.UUID(project_id),
        title=data.title,
        description=data.description,
        steps=[s.dict() for s in data.steps]
    )
    db.add(chain)
    await db.commit()
    await db.refresh(chain)
    return {"id": str(chain.id), "title": chain.title, "description": chain.description, "steps": chain.steps}

@router.put("/{chain_id}")
async def update_chain(chain_id: str, data: ChainUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(AttackChain).where(AttackChain.id == uuid.UUID(chain_id)))
    chain = result.scalar_one_or_none()
    if not chain:
        raise HTTPException(status_code=404, detail="Not found")
    if data.title is not None: chain.title = data.title
    if data.description is not None: chain.description = data.description
    if data.steps is not None: chain.steps = [s.dict() for s in data.steps]
    chain.updated_at = datetime.utcnow()
    await db.commit()
    return {"id": str(chain.id), "title": chain.title, "steps": chain.steps}

@router.delete("/{chain_id}")
async def delete_chain(chain_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(AttackChain).where(AttackChain.id == uuid.UUID(chain_id)))
    chain = result.scalar_one_or_none()
    if not chain:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(chain)
    await db.commit()
    return {"deleted": True}
