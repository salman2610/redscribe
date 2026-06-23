from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Finding, Project, UploadJob, SeverityEnum
from routers.auth import get_current_user
from models.models import User
from parsers.nmap import parse_nmap_xml
from parsers.nessus import parse_nessus, validate_nessus
from parsers.burp import parse_burp_xml
import uuid

router = APIRouter()

SEVERITY_MAP = {
    "critical": SeverityEnum.critical,
    "high": SeverityEnum.high,
    "medium": SeverityEnum.medium,
    "low": SeverityEnum.low,
    "info": SeverityEnum.info,
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

@router.post("/project/{project_id}/nmap")
async def upload_nmap(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_project_or_404(project_id, current_user.id, db)

    content = await file.read()

    # Create upload job record
    job = UploadJob(
        project_id=uuid.UUID(project_id),
        file_name=file.filename,
        file_type="nmap",
        status="processing",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        result = parse_nmap_xml(content)
        raw_findings = result.to_findings(project_id)

        saved = 0
        for f in raw_findings:
            severity_str = f.get("severity", "info").lower()
            severity = SEVERITY_MAP.get(severity_str, SeverityEnum.info)

            finding = Finding(
                project_id=uuid.UUID(project_id),
                title=f["title"],
                severity=severity,
                description=f.get("description", ""),
                evidence=f.get("evidence", ""),
                affected_hosts=[f["ip"]] if f.get("ip") else [],
                affected_ports=[f["port"]] if f.get("port") else [],
                source_tool="nmap",
                source_file=file.filename,
                tags=f.get("tags", []),
            )
            db.add(finding)
            saved += 1

        # Update job status
        job.status = "completed"
        job.findings_count = saved
        await db.commit()

        return {
            "message": "Nmap scan parsed successfully",
            "job_id": str(job.id),
            "summary": result.summary(),
            "findings_created": saved,
        }

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to parse Nmap file: {str(e)}")

@router.post("/project/{project_id}/burp")
async def upload_burp(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_project_or_404(project_id, current_user.id, db)

    content = await file.read()

    job = UploadJob(
        project_id=uuid.UUID(project_id),
        file_name=file.filename,
        file_type="burp",
        status="processing",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        result = parse_burp_xml(content)
        raw_findings = result.to_findings(project_id)

        saved = 0
        for f in raw_findings:
            severity_str = f.get("severity", "info").lower()
            severity = SEVERITY_MAP.get(severity_str, SeverityEnum.info)

            finding = Finding(
                project_id=uuid.UUID(project_id),
                title=f["title"],
                severity=severity,
                description=f.get("description", ""),
                evidence=f.get("evidence", ""),
                affected_hosts=[f["host"]] if f.get("host") else [],
                affected_ports=[],
                source_tool="burp",
                source_file=file.filename,
                tags=f.get("tags", []),
                cwe=f.get("cwe"),
                owasp=f.get("owasp"),
                remediation=f.get("remediation", ""),
            )
            db.add(finding)
            saved += 1

        job.status = "completed"
        job.findings_count = saved
        await db.commit()

        return {
            "message": "Burp scan parsed successfully",
            "job_id": str(job.id),
            "summary": result.summary(),
            "findings_created": saved,
        }

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to parse Burp file: {str(e)}")

@router.get("/project/{project_id}/jobs")
async def get_upload_jobs(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_project_or_404(project_id, current_user.id, db)
    result = await db.execute(
        select(UploadJob).where(
            UploadJob.project_id == uuid.UUID(project_id)
        )
    )
    jobs = result.scalars().all()
    return [
        {
            "id": str(j.id),
            "file_name": j.file_name,
            "file_type": j.file_type,
            "status": j.status,
            "findings_count": j.findings_count,
            "error": j.error,
            "created_at": j.created_at,
        }
        for j in jobs
    ]
