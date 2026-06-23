from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.database import Base
from datetime import datetime
import uuid
import enum

class SeverityEnum(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"

class StatusEnum(str, enum.Enum):
    open = "open"
    in_review = "in_review"
    accepted = "accepted"
    remediated = "remediated"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    api_key = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="user")
    templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scope = Column(Text, nullable=True)
    methodology = Column(Text, nullable=True)
    tester_name = Column(String(255), nullable=True)
    classification = Column(String(100), nullable=True)
    ai_provider = Column(String, default="anthropic")
    status = Column(String, default="active")
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    findings = relationship("Finding", back_populates="project", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    upload_jobs = relationship("UploadJob", back_populates="project", cascade="all, delete-orphan")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    severity = Column(Enum(SeverityEnum), nullable=False)
    cvss_score = Column(Float, nullable=True)
    cvss_vector = Column(String, nullable=True)
    cwe = Column(String, nullable=True)
    owasp = Column(String, nullable=True)
    cve = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    business_impact = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)
    attack_scenario = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    affected_hosts = Column(JSON, default=list)
    affected_ports = Column(JSON, default=list)
    source_tool = Column(String, nullable=True)
    source_file = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    status = Column(Enum(StatusEnum), default=StatusEnum.open)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=True)
    ai_enriched = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="findings")
    evidence_files = relationship("Evidence", back_populates="finding", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    finding_id = Column(UUID(as_uuid=True), ForeignKey("findings.id"), nullable=False)
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    ai_description = Column(Text, nullable=True)
    caption = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    finding = relationship("Finding", back_populates="evidence_files")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    host = Column(String, nullable=True)
    ip = Column(String, nullable=True)
    ports = Column(JSON, default=list)
    os = Column(String, nullable=True)
    services = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="assets")

class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    severity = Column(Enum(SeverityEnum), nullable=False)
    cvss_score = Column(Float, nullable=True)
    cvss_vector = Column(String, nullable=True)
    cwe = Column(String, nullable=True)
    owasp = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)
    variables = Column(JSON, default=list)
    is_public = Column(Boolean, default=False)
    is_global = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="templates")

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    format = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    settings = Column(JSON, default=dict)
    generated_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="reports")

class UploadJob(Base):
    __tablename__ = "upload_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    status = Column(String, default="pending")
    findings_count = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="upload_jobs")
