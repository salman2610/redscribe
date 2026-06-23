import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models.models import Template, SeverityEnum
from models.database import DATABASE_URL

TEMPLATES = [
    {"title": "SQL Injection", "severity": "critical", "cvss_score": 9.8, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-89", "owasp": "A03:2021"},
    {"title": "Cross-Site Scripting (XSS)", "severity": "high", "cvss_score": 8.2, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N", "cwe": "CWE-79", "owasp": "A07:2021"},
    {"title": "Cross-Site Request Forgery (CSRF)", "severity": "high", "cvss_score": 8.8, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H", "cwe": "CWE-352", "owasp": "A01:2021"},
    {"title": "Remote Code Execution (RCE)", "severity": "critical", "cvss_score": 9.9, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-94", "owasp": "A08:2021"},
    {"title": "Authentication Bypass", "severity": "critical", "cvss_score": 9.1, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-287", "owasp": "A07:2021"},
    {"title": "Server-Side Request Forgery (SSRF)", "severity": "high", "cvss_score": 9.1, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-918", "owasp": "A10:2021"},
    {"title": "Path Traversal", "severity": "high", "cvss_score": 7.5, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N", "cwe": "CWE-22", "owasp": "A01:2021"},
    {"title": "Insecure Deserialization", "severity": "critical", "cvss_score": 9.8, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-502", "owasp": "A08:2021"},
    {"title": "Broken Authentication", "severity": "critical", "cvss_score": 9.8, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-287", "owasp": "A07:2021"},
    {"title": "Sensitive Data Exposure", "severity": "high", "cvss_score": 8.6, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", "cwe": "CWE-200", "owasp": "A02:2021"},
    {"title": "XML External Entity (XXE)", "severity": "high", "cvss_score": 9.8, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-611", "owasp": "A05:2021"},
    {"title": "Broken Access Control", "severity": "critical", "cvss_score": 9.1, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-284", "owasp": "A01:2021"},
    {"title": "Security Misconfiguration", "severity": "high", "cvss_score": 7.5, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N", "cwe": "CWE-16", "owasp": "A05:2021"},
    {"title": "Insecure Dependencies", "severity": "high", "cvss_score": 8.6, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", "cwe": "CWE-426", "owasp": "A06:2021"},
    {"title": "Insufficient Logging & Monitoring", "severity": "medium", "cvss_score": 6.5, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", "cwe": "CWE-778", "owasp": "A09:2021"},
    {"title": "Command Injection", "severity": "critical", "cvss_score": 9.8, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-78", "owasp": "A03:2021"},
    {"title": "LDAP Injection", "severity": "high", "cvss_score": 8.6, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N", "cwe": "CWE-90", "owasp": "A03:2021"},
    {"title": "NoSQL Injection", "severity": "high", "cvss_score": 9.8, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cwe": "CWE-943", "owasp": "A03:2021"},
    {"title": "Weak Cryptography", "severity": "high", "cvss_score": 7.5, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N", "cwe": "CWE-327", "owasp": "A02:2021"},
    {"title": "Subdomain Takeover", "severity": "high", "cvss_score": 8.0, "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", "cwe": "CWE-404", "owasp": "A06:2021"},
]

async def seed_templates():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        from sqlalchemy import select
        
        # Check if templates already exist
        result = await session.execute(select(Template))
        existing = result.scalars().first()
        
        if existing:
            print("✅ Templates already seeded")
            return
        
        # Add all templates as global
        for template_data in TEMPLATES:
            template = Template(
                id=uuid.uuid4(),
                is_global=True,
                user_id=None,
                **template_data
            )
            session.add(template)
        
        await session.commit()
        print(f"✅ Seeded {len(TEMPLATES)} templates")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_templates())
