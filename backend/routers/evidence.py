import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Evidence, Finding
from routers.auth import get_current_user
import aiofiles

router = APIRouter(prefix="/evidence", tags=["evidence"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/findings/{finding_id}")
async def upload_evidence(
    finding_id: str,
    file: UploadFile = File(...),
    caption: str = "",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify finding exists
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    # Save file
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    # Save to DB
    evidence = Evidence(
        finding_id=finding_id,
        file_name=file.filename,
        file_path=unique_name,
        caption=caption,
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)

    return {
        "id": str(evidence.id),
        "finding_id": str(evidence.finding_id),
        "file_name": evidence.file_name,
        "file_path": evidence.file_path,
        "caption": evidence.caption,
        "created_at": str(evidence.created_at)
    }

@router.get("/findings/{finding_id}")
async def list_evidence(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    result = await db.execute(select(Evidence).where(Evidence.finding_id == finding_id))
    files = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "file_name": e.file_name,
            "file_path": e.file_path,
            "caption": e.caption,
            "created_at": str(e.created_at)
        }
        for e in files
    ]

@router.get("/file/{file_path}")
async def get_evidence_file(file_path: str):
    full_path = os.path.join(UPLOAD_DIR, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)

@router.delete("/{evidence_id}")
async def delete_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Delete file
    full_path = os.path.join(UPLOAD_DIR, evidence.file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    
    await db.delete(evidence)
    await db.commit()
    return {"deleted": True}
