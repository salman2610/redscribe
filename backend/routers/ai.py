from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Finding, Project, User
from routers.auth import get_current_user
from providers.factory import get_provider
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/enrich/{finding_id}")
async def enrich_finding(
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

    finding_dict = {
        "title": finding.title,
        "severity": finding.severity.value if finding.severity else "",
        "description": finding.description,
        "affected_hosts": finding.affected_hosts,
        "affected_ports": finding.affected_ports,
        "cwe": finding.cwe,
        "owasp": finding.owasp,
        "evidence": finding.evidence,
    }

    try:
        provider = get_provider()
        enriched = await provider.enrich_finding(finding_dict)

        if enriched.get("business_impact"):
            finding.business_impact = enriched["business_impact"]
        if enriched.get("remediation"):
            finding.remediation = enriched["remediation"]
        if enriched.get("attack_scenario"):
            finding.attack_scenario = enriched["attack_scenario"]
        if enriched.get("cvss_score"):
            finding.cvss_score = enriched["cvss_score"]
        if enriched.get("cvss_vector"):
            finding.cvss_vector = enriched["cvss_vector"]

        finding.ai_enriched = True
        finding.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(finding)

        return {
            "message": "Finding enriched successfully",
            "finding_id": finding_id,
            "enriched": enriched,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI enrichment failed: {str(e)}")

@router.post("/enrich-all/{project_id}")
async def enrich_all_findings(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Finding).where(
            Finding.project_id == uuid.UUID(project_id),
            Finding.ai_enriched == False
        )
    )
    findings = result.scalars().all()

    if not findings:
        return {"message": "No findings to enrich", "enriched_count": 0}

    provider = get_provider()
    enriched_count = 0
    errors = []

    for finding in findings:
        try:
            finding_dict = {
                "title": finding.title,
                "severity": finding.severity.value if finding.severity else "",
                "description": finding.description,
                "affected_hosts": finding.affected_hosts,
                "affected_ports": finding.affected_ports,
                "cwe": finding.cwe,
                "owasp": finding.owasp,
                "evidence": finding.evidence,
            }

            enriched = await provider.enrich_finding(finding_dict)

            if enriched.get("business_impact"):
                finding.business_impact = enriched["business_impact"]
            if enriched.get("remediation"):
                finding.remediation = enriched["remediation"]
            if enriched.get("attack_scenario"):
                finding.attack_scenario = enriched["attack_scenario"]
            if enriched.get("cvss_score"):
                finding.cvss_score = enriched["cvss_score"]
            if enriched.get("cvss_vector"):
                finding.cvss_vector = enriched["cvss_vector"]

            finding.ai_enriched = True
            finding.updated_at = datetime.utcnow()
            enriched_count += 1

        except Exception as e:
            errors.append({"finding_id": str(finding.id), "error": str(e)})

    await db.commit()

    return {
        "message": f"Enriched {enriched_count} findings",
        "enriched_count": enriched_count,
        "errors": errors,
    }

@router.post("/executive-summary/{project_id}")
async def generate_executive_summary(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Finding).where(Finding.project_id == uuid.UUID(project_id))
    )
    findings = result.scalars().all()

    if not findings:
        raise HTTPException(status_code=404, detail="No findings in this project")

    findings_list = [
        {
            "title": f.title,
            "severity": f.severity.value if f.severity else "",
            "description": f.description,
        }
        for f in findings
    ]

    try:
        provider = get_provider()
        summary = await provider.executive_summary(findings_list)
        return {"executive_summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI failed: {str(e)}")

@router.post("/rewrite")
async def rewrite_text(
    text: str,
    tone: str = "technical",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    valid_tones = ["technical", "executive", "compliance", "client"]
    if tone not in valid_tones:
        raise HTTPException(status_code=400, detail=f"Tone must be one of {valid_tones}")

    try:
        provider = get_provider()
        rewritten = await provider.rewrite(text, tone)
        return {"original": text, "rewritten": rewritten, "tone": tone}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI failed: {str(e)}")
