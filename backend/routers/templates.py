from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Template, User
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="", tags=["templates"])

class TemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str
    cvss_score: Optional[float] = None
    cvss_vector: Optional[str] = None
    cwe: Optional[str] = None
    owasp: Optional[str] = None

class TemplateResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    severity: str
    cvss_score: Optional[float]
    cvss_vector: Optional[str]
    cwe: Optional[str]
    owasp: Optional[str]
    is_global: bool

def template_to_dict(t: Template) -> dict:
    return {
        "id": str(t.id),
        "title": t.title,
        "description": t.description,
        "severity": t.severity,
        "cvss_score": t.cvss_score,
        "cvss_vector": t.cvss_vector,
        "cwe": t.cwe,
        "owasp": t.owasp,
        "is_global": t.is_global,
    }

@router.get("/")
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all global templates + user's personal templates"""
    result = await db.execute(
        select(Template).where(
            (Template.is_global == True) | (Template.user_id == current_user.id)
        )
    )
    templates = result.scalars().all()
    return [template_to_dict(t) for t in templates]

@router.post("/")
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create personal template"""
    template = Template(
        id=uuid.uuid4(),
        user_id=current_user.id,
        is_global=False,
        **data.model_dump()
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template_to_dict(template)

@router.get("/{template_id}")
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get template by ID"""
    result = await db.execute(
        select(Template).where(Template.id == uuid.UUID(template_id))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template_to_dict(template)

@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete personal template (only owner)"""
    result = await db.execute(
        select(Template).where(Template.id == uuid.UUID(template_id))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.delete(template)
    await db.commit()
    return {"message": "Template deleted"}
