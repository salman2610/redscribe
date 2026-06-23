from weasyprint import HTML
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

SEVERITY_COLORS = {
    'critical': '#ef4444',
    'high': '#f97316',
    'medium': '#eab308',
    'low': '#3b82f6',
    'info': '#6b7280',
}

SEVERITY_BG = {
    'critical': '#fef2f2',
    'high': '#fff7ed',
    'medium': '#fefce8',
    'low': '#eff6ff',
    'info': '#f9fafb',
}

SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info']


def get_sev_index(sev):
    try:
        return SEV_ORDER.index(sev.lower() if sev else 'info')
    except ValueError:
        return 99


def build_html(project, findings, executive_summary=''):
    counts = {s: sum(1 for f in findings if (f.get('severity') or 'info').lower() == s) for s in SEV_ORDER}

    findings_html = ''
    sorted_findings = sorted(findings, key=lambda x: get_sev_index(x.get('severity', 'info')))

    for i, f in enumerate(sorted_findings):
        sev = (f.get('severity') or 'info').lower()
        color = SEVERITY_COLORS.get(sev, '#6b7280')
        bg = SEVERITY_BG.get(sev, '#f9fafb')
        affected = ', '.join(f.get('affected_hosts') or [])
        ports = ', '.join(str(p) for p in (f.get('affected_ports') or []))

        desc_html = ''
        if f.get('description'):
            desc_html = f'<div class="finding-section"><div class="section-label">Description</div><div class="section-text">{f["description"]}</div></div>'

        impact_html = ''
        if f.get('business_impact'):
            impact_html = f'<div class="finding-section impact"><div class="section-label">Business Impact</div><div class="section-text">{f["business_impact"]}</div></div>'

        rem_html = ''
        if f.get('remediation'):
            rem_html = f'<div class="finding-section remediation"><div class="section-label">Remediation</div><div class="section-text">{f["remediation"]}</div></div>'

        attack_html = ''
        if f.get('attack_scenario'):
            attack_html = f'<div class="finding-section attack"><div class="section-label">Attack Scenario</div><div class="section-text">{f["attack_scenario"]}</div></div>'

        meta_parts = []
        if f.get('cvss_score'):
            meta_parts.append(f'<span>CVSS: {f["cvss_score"]}</span>')
        if f.get('cwe'):
            meta_parts.append(f'<span>{f["cwe"]}</span>')
        if f.get('owasp'):
            meta_parts.append(f'<span>{f["owasp"]}</span>')
        if f.get('source_tool'):
            meta_parts.append(f'<span>via {f["source_tool"]}</span>')
        meta_html = ''.join(meta_parts)

        evidence_html = ""
        for ev in f.get("evidence_files", []):
            import os
            upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
            fp = os.path.join(upload_dir, ev["file_path"])
            if os.path.exists(fp) and ev["file_name"].lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
                import base64
                with open(fp, "rb") as img:
                    b64 = base64.b64encode(img.read()).decode()
                ext = ev["file_name"].rsplit(".", 1)[-1].lower()
                evidence_html += f'<div class="finding-section"><div class="section-label">Evidence</div><img src="data:image/{ext};base64,{b64}" style="max-width:100%;border-radius:4px;margin-top:8px;" /><div style="font-size:10px;color:#999;margin-top:4px;">{ev.get("caption","") or ev["file_name"]}</div></div>'
        footer_parts = []
        if affected:
            footer_parts.append(f'<span class="tag">{affected}</span>')
        if ports:
            footer_parts.append(f'<span class="tag">Port {ports}</span>')
        if f.get('cvss_vector'):
            footer_parts.append(f'<span class="tag">{f["cvss_vector"]}</span>')
        footer_html = ''.join(footer_parts)

        findings_html += f'''
<div class="finding">
    <div class="finding-header">
        <div class="finding-num">F{str(i+1).zfill(2)}</div>
        <div class="finding-title-area">
            <div class="finding-title">{f.get("title", "Untitled")}</div>
            <div class="finding-meta">{meta_html}</div>
        </div>
        <div class="sev-badge" style="color:{color};background:{bg};border:1px solid {color}40">{sev.upper()}</div>
    </div>
    {desc_html}
    {impact_html}
    {rem_html}
    {attack_html}
    {evidence_html}
    <div class="finding-footer">{footer_html}</div>
</div>'''

    summary_html = ''
    if executive_summary:
        summary_html = f'''
<div class="section">
    <div class="section-title">// executive summary</div>
    <div class="summary-text">{executive_summary}</div>
</div>'''

    risk_cards = ''
    for s in SEV_ORDER:
        c = SEVERITY_COLORS[s]
        b = SEVERITY_BG[s]
        risk_cards += f'<div class="risk-card" style="color:{c};background:{b};border-color:{c}40"><div class="risk-num">{counts[s]}</div><div class="risk-label">{s}</div></div>'

    return f'''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: Arial, sans-serif; background: #fff; color: #111; font-size: 13px; line-height: 1.6; }}
.cover {{ min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; background: #080808; color: #fff; page-break-after: always; }}
.cover-logo {{ font-size: 24px; font-weight: 700; }}
.cover-logo span {{ color: #BB2649; }}
.cover-main {{ flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px 0; }}
.cover-label {{ font-size: 10px; color: #BB2649; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }}
.cover-title {{ font-size: 48px; font-weight: 700; line-height: 1; margin-bottom: 12px; }}
.cover-client {{ font-size: 14px; color: #555; margin-bottom: 48px; }}
.cover-stats {{ display: flex; gap: 48px; }}
.cover-stat-num {{ font-size: 36px; font-weight: 700; line-height: 1; }}
.cover-stat-label {{ font-size: 9px; color: #444; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }}
.cover-footer {{ display: flex; justify-content: space-between; align-items: flex-end; padding-top: 40px; border-top: 1px solid #1a1a1a; }}
.cover-date {{ font-size: 11px; color: #333; line-height: 1.8; }}
.cover-confidential {{ font-size: 9px; color: #BB2649; letter-spacing: 3px; text-transform: uppercase; border: 1px solid #BB264940; padding: 4px 12px; border-radius: 4px; }}
.page {{ padding: 48px 60px; page-break-after: always; }}
.page-header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; margin-bottom: 40px; }}
.page-logo {{ font-size: 16px; font-weight: 700; }}
.page-logo span {{ color: #BB2649; }}
.page-project {{ font-size: 10px; color: #999; }}
.section {{ margin-bottom: 48px; }}
.section-title {{ font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #BB2649; margin-bottom: 20px; }}
.risk-matrix {{ display: flex; gap: 8px; margin-bottom: 32px; }}
.risk-card {{ flex: 1; padding: 16px; border-radius: 6px; text-align: center; border: 1px solid; }}
.risk-num {{ font-size: 32px; font-weight: 700; line-height: 1; }}
.risk-label {{ font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }}
.summary-text {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; font-size: 13px; color: #374151; line-height: 1.8; }}
.finding {{ border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px; overflow: hidden; page-break-inside: avoid; }}
.finding-header {{ display: flex; align-items: flex-start; gap: 16px; padding: 20px; background: #fafafa; border-bottom: 1px solid #e5e7eb; }}
.finding-num {{ font-size: 11px; color: #999; padding-top: 3px; white-space: nowrap; }}
.finding-title-area {{ flex: 1; }}
.finding-title {{ font-size: 15px; font-weight: 600; color: #111; margin-bottom: 6px; }}
.finding-meta {{ display: flex; gap: 12px; flex-wrap: wrap; }}
.finding-meta span {{ font-size: 10px; color: #999; }}
.sev-badge {{ font-size: 9px; letter-spacing: 2px; text-transform: uppercase; padding: 4px 12px; border-radius: 4px; white-space: nowrap; font-weight: 600; }}
.finding-section {{ padding: 16px 20px; border-bottom: 1px solid #f0f0f0; }}
.finding-section.impact {{ background: #faf5ff; }}
.finding-section.remediation {{ background: #f0fdf4; }}
.finding-section.attack {{ background: #fff5f5; }}
.section-label {{ font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 6px; font-weight: 500; }}
.finding-section.impact .section-label {{ color: #7c3aed; }}
.finding-section.remediation .section-label {{ color: #059669; }}
.finding-section.attack .section-label {{ color: #dc2626; }}
.section-text {{ font-size: 12px; color: #374151; line-height: 1.7; }}
.finding-footer {{ padding: 12px 20px; display: flex; gap: 8px; flex-wrap: wrap; background: #fafafa; }}
.tag {{ font-size: 10px; color: #6b7280; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 2px 8px; border-radius: 4px; }}
.info-table {{ width: 100%; border-collapse: collapse; }}
.info-table td {{ padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }}
.info-table td:first-child {{ font-size: 10px; color: #999; letter-spacing: 1px; text-transform: uppercase; width: 140px; }}
</style>
</head>
<body>

<div class="cover">
    <div class="cover-logo">Red<span>Scribe</span></div>
    <div class="cover-main">
        <div class="cover-label">// penetration test report</div>
        <div class="cover-title">{project.get("name", "Security Assessment")}</div>
        <div class="cover-client">{project.get("client_name", "")}</div>
        <div class="cover-stats">
            <div><div class="cover-stat-num" style="color:#fff">{len(findings)}</div><div class="cover-stat-label">Total</div></div>
            <div><div class="cover-stat-num" style="color:#ef4444">{counts["critical"]}</div><div class="cover-stat-label">Critical</div></div>
            <div><div class="cover-stat-num" style="color:#f97316">{counts["high"]}</div><div class="cover-stat-label">High</div></div>
            <div><div class="cover-stat-num" style="color:#eab308">{counts["medium"]}</div><div class="cover-stat-label">Medium</div></div>
            <div><div class="cover-stat-num" style="color:#3b82f6">{counts["low"]}</div><div class="cover-stat-label">Low</div></div>
        </div>
    </div>
    <div class="cover-footer">
        <div class="cover-date">Generated: {datetime.now().strftime("%d %B %Y")}<br>Scope: {project.get("scope", "N/A")}</div>
        <div class="cover-confidential">Confidential</div>
    </div>
</div>

<div class="page">
    <div class="page-header">
        <div class="page-logo">Red<span>Scribe</span></div>
        <div class="page-project">{project.get("name", "")}</div>
    </div>
    <div class="section">
        <div class="section-title">// engagement details</div>
        <table class="info-table">
            <tr><td>Project</td><td>{project.get("name", "N/A")}</td></tr>
            <tr><td>Client</td><td>{project.get("client_name", "N/A")}</td></tr>
            <tr><td>Scope</td><td>{project.get("scope", "N/A")}</td></tr>
            <tr><td>Report Date</td><td>{datetime.now().strftime("%d %B %Y")}</td></tr>
            <tr><td>Total Findings</td><td>{len(findings)}</td></tr>
        </table>
    </div>
    <div class="section">
        <div class="section-title">// risk overview</div>
        <div class="risk-matrix">{risk_cards}</div>
    </div>
    {summary_html}
</div>

<div class="page">
    <div class="page-header">
        <div class="page-logo">Red<span>Scribe</span></div>
        <div class="page-project">Findings — {len(findings)} total</div>
    </div>
    <div class="section">
        <div class="section-title">// findings</div>
        {findings_html}
    </div>
</div>

</body>
</html>'''


async def generate_pdf(project_id: str, db: AsyncSession, executive_summary: str = '') -> bytes:
    from models.models import Project, Finding, Evidence
    from sqlalchemy.orm import selectinload

    proj_result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
    project = proj_result.scalar_one_or_none()

    find_result = await db.execute(select(Finding).where(Finding.project_id == uuid.UUID(project_id)).options(selectinload(Finding.evidence_files)))
    findings = find_result.scalars().all()

    project_dict = {
        "name": project.name,
        "client_name": project.client_name,
        "scope": project.scope,
        "ai_provider": project.ai_provider,
    }

    findings_list = [{
        "title": f.title,
        "severity": f.severity.value.lower() if f.severity else "info",
        "cvss_score": f.cvss_score,
        "cvss_vector": f.cvss_vector,
        "cwe": f.cwe,
        "owasp": f.owasp,
        "description": f.description,
        "business_impact": f.business_impact,
        "remediation": f.remediation,
        "attack_scenario": f.attack_scenario,
        "affected_hosts": f.affected_hosts,
        "affected_ports": f.affected_ports,
        "source_tool": f.source_tool,
        "evidence_files": [{"file_path": e.file_path, "file_name": e.file_name, "caption": e.caption} for e in f.evidence_files],
    } for f in findings]

    html = build_html(project_dict, findings_list, executive_summary)
    pdf_bytes = HTML(string=html).write_pdf()
    return pdf_bytes
