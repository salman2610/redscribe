from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import User, Project
from routers.auth import get_current_user
from exporters.pdf import generate_pdf
from exporters.docx import generate_docx
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class ReportRequest(BaseModel):
    executive_summary: Optional[str] = ''

@router.post("/pdf/{project_id}")
async def export_pdf(
    project_id: str,
    data: ReportRequest = ReportRequest(),
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

    try:
        pdf_bytes = await generate_pdf(project_id, db, data.executive_summary or '')
        filename = f"{project.name.replace(' ', '_')}_{project.client_name.replace(' ', '_')}_report.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/docx/{project_id}")
async def export_docx(project_id: str, db: AsyncSession = Depends(get_db)):
    """Export project as DOCX report"""
    try:
        docx_bytes = await generate_docx(project_id, db)
        
        return StreamingResponse(
            iter([docx_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=redscribe_report_{project_id}.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/export-docx")
async def export_docx(project_id: str, db: AsyncSession = Depends(get_db)):
    """Export project as DOCX report"""
    try:
        docx_bytes = await generate_docx(project_id, db)
        
        return StreamingResponse(
            iter([docx_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=redscribe_report_{project_id}.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
