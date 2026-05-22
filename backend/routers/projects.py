from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Project, User
from routers.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    client_name: str
    scope: Optional[str] = None
    methodology: Optional[str] = None
    ai_provider: Optional[str] = "anthropic"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    scope: Optional[str] = None
    methodology: Optional[str] = None
    ai_provider: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

def project_to_dict(p: Project) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "client_name": p.client_name,
        "scope": p.scope,
        "methodology": p.methodology,
        "ai_provider": p.ai_provider,
        "status": p.status,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }

@router.get("")
async def get_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(Project.user_id == current_user.id)
    )
    projects = result.scalars().all()
    return [project_to_dict(p) for p in projects]

@router.post("")
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Strip timezone info to make naive datetimes for PostgreSQL
    start = data.start_date.replace(tzinfo=None) if data.start_date else None
    end = data.end_date.replace(tzinfo=None) if data.end_date else None

    project = Project(
        name=data.name,
        client_name=data.client_name,
        user_id=current_user.id,
        scope=data.scope,
        methodology=data.methodology,
        ai_provider=data.ai_provider,
        start_date=start,
        end_date=end,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project_to_dict(project)

@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(
            Project.id == uuid.UUID(project_id),
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_to_dict(project)

@router.put("/{project_id}")
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(
            Project.id == uuid.UUID(project_id),
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project_to_dict(project)

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(
            Project.id == uuid.UUID(project_id),
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}
