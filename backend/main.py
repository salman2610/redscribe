from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()

from routers import auth, projects, findings, uploads, reports, templates, ai

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ GhostWrite starting up...")
    from models.database import create_tables
    await create_tables()
    print("✅ Database tables ready")
    yield
    print("🛑 GhostWrite shutting down...")

app = FastAPI(
    title="GhostWrite API",
    description="AI-Assisted Pentest Reporting Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(findings.router, prefix="/findings", tags=["Findings"])
app.include_router(uploads.router, prefix="/uploads", tags=["Uploads"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(templates.router, prefix="/templates", tags=["Templates"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])

@app.get("/")
async def root():
    return {"message": "GhostWrite API", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
