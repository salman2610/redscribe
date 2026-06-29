from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()

from routers import auth, projects, findings, uploads, reports, templates, ai, evidence, assets, attack_chains

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ RedScribe starting up...")
    from models.database import create_tables
    await create_tables()
    print("✅ Database tables ready")
    yield
    print("🛑 RedScribe shutting down...")

app = FastAPI(
    title="RedScribe API",
    description="AI-Assisted Pentest Reporting Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.1.24:3000", "http://127.0.0.1:3000", "http://192.168.1.24:3000","http://192.168.1.24:3000",
"http://192.168.1.24:8000" ],
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
app.include_router(evidence.router, tags=["Evidence"])
app.include_router(assets.router, tags=["Assets"])
app.include_router(attack_chains.router, tags=["Attack Chains"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])

@app.get("/")
async def root():
    return {"message": "RedScribe API", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
