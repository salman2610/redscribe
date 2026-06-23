from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Finding, Project, SeverityEnum, StatusEnum
from routers.auth import get_current_user
from models.models import User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter()

class FindingCreate(BaseModel):
    title: str
    severity: SeverityEnum
    cvss_score: Optional[float] = None
    cvss_vector: Optional[str] = None
    cwe: Optional[str] = None
    owasp: Optional[str] = None
    cve: Optional[str] = None
    description: Optional[str] = None
    business_impact: Optional[str] = None
    remediation: Optional[str] = None
    attack_scenario: Optional[str] = None
    evidence: Optional[str] = None
    affected_hosts: Optional[list] = []
    affected_ports: Optional[list] = []
    source_tool: Optional[str] = None
    tags: Optional[list] = []

class FindingUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[SeverityEnum] = None
    cvss_score: Optional[float] = None
    cvss_vector: Optional[str] = None
    cwe: Optional[str] = None
    owasp: Optional[str] = None
    cve: Optional[str] = None
    description: Optional[str] = None
    business_impact: Optional[str] = None
    remediation: Optional[str] = None
    attack_scenario: Optional[str] = None
    evidence: Optional[str] = None
    affected_hosts: Optional[list] = None
    affected_ports: Optional[list] = None
    tags: Optional[list] = None
    status: Optional[StatusEnum] = None

def finding_to_dict(f: Finding) -> dict:
    return {
        "id": str(f.id),
        "project_id": str(f.project_id),
        "title": f.title,
        "severity": f.severity,
        "cvss_score": f.cvss_score,
        "cvss_vector": f.cvss_vector,
        "cwe": f.cwe,
        "owasp": f.owasp,
        "cve": f.cve,
        "description": f.description,
        "business_impact": f.business_impact,
        "remediation": f.remediation,
        "attack_scenario": f.attack_scenario,
        "evidence": f.evidence,
        "affected_hosts": f.affected_hosts,
        "affected_ports": f.affected_ports,
        "source_tool": f.source_tool,
        "tags": f.tags,
        "status": f.status,
        "ai_enriched": f.ai_enriched,
        "created_at": f.created_at,
        "updated_at": f.updated_at,
        "sort_order": f.sort_order,
    }

async def get_project_or_404(project_id: str, user_id, db):
    result = await db.execute(
        select(Project).where(
            Project.id == uuid.UUID(project_id),
            Project.user_id == user_id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.get("/project/{project_id}")
async def get_findings(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_project_or_404(project_id, current_user.id, db)
    result = await db.execute(
        select(Finding).where(Finding.project_id == uuid.UUID(project_id)).order_by(Finding.sort_order)
    )
    findings = result.scalars().all()
    return [finding_to_dict(f) for f in findings]

@router.post("/project/{project_id}")
async def create_finding(
    project_id: str,
    data: FindingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_project_or_404(project_id, current_user.id, db)
    finding = Finding(
        project_id=uuid.UUID(project_id),
        **data.model_dump()
    )
    db.add(finding)
    await db.commit()
    await db.refresh(finding)
    return finding_to_dict(finding)

@router.get("/{finding_id}")
async def get_finding(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Finding).where(Finding.id == uuid.UUID(finding_id))
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding_to_dict(finding)

@router.put("/{finding_id}")
async def update_finding(
    finding_id: str,
    data: FindingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Finding).where(Finding.id == uuid.UUID(finding_id))
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(finding, field, value)

    finding.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(finding)
    return finding_to_dict(finding)

@router.delete("/{finding_id}")
async def delete_finding(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Finding).where(Finding.id == uuid.UUID(finding_id))
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    await db.delete(finding)
    await db.commit()
    return {"message": "Finding deleted"}

from pydantic import BaseModel as PydanticBase
from typing import List as PyList

class ReorderRequest(PydanticBase):
    finding_ids: PyList[str]

@router.post("/project/{project_id}/reorder")
async def reorder_findings(
    project_id: str,
    data: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    for i, finding_id in enumerate(data.finding_ids):
        result = await db.execute(select(Finding).where(Finding.id == finding_id))
        finding = result.scalar_one_or_none()
        if finding:
            finding.sort_order = i
    await db.commit()
    return {"reordered": True}
