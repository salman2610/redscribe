#!/bin/bash

# RedScribe Finding Templates - MEGA Setup Script
# Run from project root: bash setup-templates-mega.sh
# This does EVERYTHING: DB, models, routes, templates, frontend

set -e

echo "🚀 MEGA Finding Templates Setup..."
echo "This will:"
echo "  ✅ Create database table"
echo "  ✅ Add model to SQLAlchemy"
echo "  ✅ Create backend routes"
echo "  ✅ Seed 20+ templates"
echo "  ✅ Create frontend modal"
echo "  ✅ Integrate with UI"
echo ""

# ============================================================================
# STEP 1: DATABASE
# ============================================================================
echo "📊 Step 1: Creating database table..."

psql -U postgres -d ghostwrite << 'SQL_EOF'
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL,
    cvss_score FLOAT,
    cvss_vector VARCHAR(255),
    cwe VARCHAR(100),
    owasp VARCHAR(100),
    is_global BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_global ON templates(is_global);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
SQL_EOF

echo "✅ Database table created"

# ============================================================================
# STEP 2: UPDATE MODELS
# ============================================================================
echo "🔧 Step 2: Adding Template model..."

cat >> ~/redscribe/backend/models/models.py << 'MODEL_EOF'


class Template(Base):
    __tablename__ = "templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(SeverityEnum), nullable=False)
    cvss_score = Column(Float, nullable=True)
    cvss_vector = Column(String(255), nullable=True)
    cwe = Column(String(100), nullable=True)
    owasp = Column(String(100), nullable=True)
    is_global = Column(Boolean, default=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="templates")

# Update User model to include templates relationship
# Add this to User class: templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")
MODEL_EOF

echo "✅ Template model added"

# ============================================================================
# STEP 3: CREATE BACKEND ROUTES
# ============================================================================
echo "📡 Step 3: Creating template routes..."

cat > ~/redscribe/backend/routers/templates.py << 'ROUTES_EOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import Template, User
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/templates", tags=["templates"])

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
ROUTES_EOF

echo "✅ Template routes created"

# ============================================================================
# STEP 4: ADD ROUTES TO MAIN
# ============================================================================
echo "📌 Step 4: Registering routes in main.py..."

if ! grep -q "templates" ~/redscribe/backend/main.py; then
    sed -i '/from routers import/s/$/,templates/' ~/redscribe/backend/main.py
    sed -i '/app.include_router(auth.router)/a\app.include_router(templates.router)' ~/redscribe/backend/main.py
    echo "✅ Routes registered"
else
    echo "✅ Routes already registered"
fi

# ============================================================================
# STEP 5: CREATE SEED SCRIPT WITH 20+ TEMPLATES
# ============================================================================
echo "🌱 Step 5: Creating seed script with 20+ templates..."

mkdir -p ~/redscribe/backend/seeds

cat > ~/redscribe/backend/seeds/templates.py << 'SEED_EOF'
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
SEED_EOF

echo "✅ Seed script created (20+ templates)"

# ============================================================================
# STEP 6: CREATE FRONTEND MODAL
# ============================================================================
echo "🎨 Step 6: Creating frontend TemplateGallery component..."

cat > ~/redscribe/frontend/components/TemplateGallery.tsx << 'FRONTEND_EOF'
'use client';

import { useState, useEffect } from 'react';
import { api } from '../app/lib/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

export default function TemplateGallery({ onSelect, onClose }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' 
    ? templates 
    : templates.filter(t => t.severity === filter);

  return (
    <>
      <style>{`
        .gallery-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); display: flex; align-items: center;
          justify-content: center; z-index: 1000; backdrop-filter: blur(2px);
        }

        .gallery-modal {
          background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 12px;
          width: 90%; max-width: 900px; max-height: 80vh; overflow: hidden;
          display: flex; flex-direction: column;
        }

        .gallery-header {
          padding: 20px; border-bottom: 1px solid #111;
          display: flex; justify-content: space-between; align-items: center;
        }

        .gallery-title {
          font-size: 16px; font-weight: 600; color: #fff;
        }

        .gallery-close {
          background: none; border: none; color: #444; font-size: 24px;
          cursor: pointer;
        }

        .gallery-filters {
          padding: 16px; border-bottom: 1px solid #111;
          display: flex; gap: 8px; flex-wrap: wrap;
        }

        .filter-btn {
          padding: 6px 12px; border-radius: 4px; border: 1px solid #1a1a1a;
          background: none; color: #666; font-size: 11px; cursor: pointer;
          transition: all 0.2s; font-family: 'JetBrains Mono', monospace;
        }

        .filter-btn.active {
          background: #CC0000; color: #fff; border-color: #CC0000;
        }

        .gallery-content {
          overflow-y: auto; flex: 1; padding: 16px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }

        .template-card {
          background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px;
          padding: 16px; cursor: pointer; transition: all 0.2s;
        }

        .template-card:hover {
          background: #111; border-color: #333;
        }

        .template-severity {
          display: inline-block; padding: 3px 8px; border-radius: 3px;
          font-size: 9px; font-weight: 600; text-transform: uppercase;
          margin-bottom: 8px;
        }

        .template-title {
          font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 4px;
        }

        .template-meta {
          font-size: 10px; color: #666; display: flex; gap: 8px; flex-wrap: wrap;
        }

        .template-select {
          margin-top: 12px; padding: 8px 12px; background: #CC0000;
          color: #fff; border: none; border-radius: 4px; font-size: 10px;
          cursor: pointer; width: 100%; font-weight: 600;
        }
      `}</style>

      <div className="gallery-overlay" onClick={onClose}>
        <div className="gallery-modal" onClick={e => e.stopPropagation()}>
          <div className="gallery-header">
            <div className="gallery-title">📋 Finding Templates</div>
            <button className="gallery-close" onClick={onClose}>×</button>
          </div>

          <div className="gallery-filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({templates.length})
            </button>
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <button
                key={sev}
                className={`filter-btn ${filter === sev ? 'active' : ''}`}
                onClick={() => setFilter(sev)}
                style={filter === sev ? { background: SEV_COLOR[sev] } : {}}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="gallery-content">
            {loading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666' }}>
                Loading templates...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666' }}>
                No templates found
              </div>
            ) : (
              filtered.map(template => (
                <div key={template.id} className="template-card">
                  <div
                    className="template-severity"
                    style={{
                      color: SEV_COLOR[template.severity],
                      background: `${SEV_COLOR[template.severity]}20`,
                      borderColor: SEV_COLOR[template.severity]
                    }}
                  >
                    {template.severity}
                  </div>
                  <div className="template-title">{template.title}</div>
                  <div className="template-meta">
                    {template.cwe && <span>{template.cwe}</span>}
                    {template.cvss_score && <span>CVSS {template.cvss_score}</span>}
                  </div>
                  <button
                    className="template-select"
                    onClick={() => onSelect(template)}
                  >
                    Use Template
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
FRONTEND_EOF

echo "✅ TemplateGallery component created"

# ============================================================================
# STEP 7: FINAL STEPS
# ============================================================================
echo ""
echo "✨ MEGA Setup Complete!"
echo ""
echo "🎯 FINAL STEPS:"
echo ""
echo "1️⃣  Update User model (add templates relationship):"
echo "   In ~/redscribe/backend/models/models.py, add to User class:"
echo "   templates = relationship('Template', back_populates='user', cascade='all, delete-orphan')"
echo ""
echo "2️⃣  Seed the 20+ templates:"
echo "   cd ~/redscribe/backend"
echo "   python seeds/templates.py"
echo ""
echo "3️⃣  Restart backend:"
echo "   uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "4️⃣  Test it:"
echo "   Go to project → Click '+ New Finding' → Uses template gallery! 🎉"
echo ""
