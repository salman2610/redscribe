<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&pause=1000&color=BB2649&center=true&vCenter=true&width=600&lines=GhostWrite;AI+Pentest+Reporting;Your+reports%2C+written+by+a+ghost." alt="GhostWrite" />

<br/>

**Turn raw pentest chaos into client-ready reports in minutes, not hours.**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

[![License](https://img.shields.io/badge/License-MIT-BB2649?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active_Development-22C55E?style=flat-square)]()
[![AI](https://img.shields.io/badge/AI-Ollama_%7C_Gemini_%7C_OpenAI_%7C_Anthropic-7B2FBE?style=flat-square)]()

</div>

---

## 👻 What is GhostWrite?

GhostWrite is an **AI-powered pentest reporting platform** built by a pentester, for pentesters.

Upload your scan files → AI parses, deduplicates, and enriches every finding → export a professional PDF/DOCX report in minutes.

> *"The tool you wish existed when you started your first VAPT engagement."*

Most pentesters spend **30-40% of engagement time** writing reports. GhostWrite cuts that to under an hour.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔍 Smart Parsing
- **Nmap XML** — full service/OS detection
- **Burp Suite** — issues export with request/response
- **Nessus** — vulnerability scan results
- **Nikto, SSLScan, ffuf, Nuclei** — coming soon
- Auto-deduplication across tools

</td>
<td width="50%">

### 🤖 AI Enrichment
- Business impact generation
- Remediation steps (specific & actionable)
- Attack scenario narratives
- CVSS score & vector suggestion
- CWE / OWASP mapping

</td>
</tr>
<tr>
<td width="50%">

### 📄 Report Export
- Professional PDF export
- DOCX (Word) export
- Executive summary generation
- Risk matrix & severity heatmap
- Custom client branding

</td>
<td width="50%">

### 🔐 Security First
- JWT authentication
- Role-based access control
- Per-user project isolation
- Audit trail
- Self-hostable, air-gapped ready

</td>
</tr>
</table>

---

## 🧠 AI Provider Support

GhostWrite uses an abstracted AI provider layer — swap providers with one config change:

| Provider | Model | Status |
|---|---|---|
| 🦙 Ollama (Local) | llama3.2, mistral | ✅ Default — free, private |
| 🔵 Google Gemini | gemini-2.0-flash | ✅ Free tier |
| 🟠 Groq | llama3-70b | ✅ Fast inference |
| 🟣 Anthropic | claude-sonnet-4-6 | ✅ Best quality |
| 🟢 OpenAI | gpt-4o | ✅ Widely used |

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/salman2610/ghostwrite.git
cd ghostwrite
docker-compose up -d
```

Frontend → `http://localhost:3000`
Backend API → `http://localhost:8000/docs`

---

### Manual Setup

**Backend**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit with your settings
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Default login:** `admin@ghostwrite.com` / `admin123`

---

## 📸 Screenshots

<table>
<tr>
<td align="center"><b>Login</b></td>
<td align="center"><b>Dashboard</b></td>
</tr>
<tr>
<td align="center"><i>Clean dark UI, JWT auth</i></td>
<td align="center"><i>Project overview, quick actions</i></td>
</tr>
<tr>
<td align="center"><b>Findings</b></td>
<td align="center"><b>AI Enrichment</b></td>
</tr>
<tr>
<td align="center"><i>Severity-coded, filterable</i></td>
<td align="center"><i>One-click AI analysis</i></td>
</tr>
</table>

> Screenshots coming soon — project is in active development.

---

## 🏗️ Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│   Next.js Frontend  │ ◄──────► │   FastAPI Backend    │
│   (Port 3000)       │  REST   │   (Port 8000)        │
└─────────────────────┘         └──────────┬───────────┘
                                            │
                               ┌────────────▼───────────┐
                               │     PostgreSQL DB       │
                               └────────────┬───────────┘
                                            │
                    ┌───────────────────────▼──────────────────────┐
                    │              AI Provider Layer                │
                    │   Ollama (local) │ Gemini │ Groq │ OpenAI    │
                    └──────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ghostwrite/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models/              # SQLAlchemy models
│   ├── routers/             # API endpoints
│   │   ├── auth.py          # JWT auth
│   │   ├── projects.py      # Project CRUD
│   │   ├── findings.py      # Findings CRUD
│   │   ├── uploads.py       # File upload + parsing
│   │   └── ai.py            # AI enrichment
│   ├── parsers/             # Tool-specific parsers
│   │   ├── nmap.py          # Nmap XML parser
│   │   └── burp.py          # Burp Suite parser
│   └── providers/           # AI provider abstraction
│       ├── base.py          # Abstract base class
│       ├── ollama.py        # Local Ollama
│       ├── gemini.py        # Google Gemini
│       └── groq.py          # Groq
│
└── frontend/
    └── app/
        ├── login/           # Auth pages
        ├── dashboard/       # Project list
        ├── projects/        # Project detail + findings
        └── lib/api.ts       # Axios API client
```

---

## 🗺️ Roadmap

- [x] JWT Authentication
- [x] Project Management
- [x] Findings CRUD
- [x] Nmap XML Parser
- [x] Burp Suite Parser
- [x] AI Enrichment (multi-provider)
- [x] Executive Summary Generation
- [ ] Nikto / SSLScan / Nuclei parsers
- [ ] PDF Export
- [ ] DOCX Export
- [ ] Screenshot-to-Finding mapper
- [ ] Finding Templates library
- [ ] Attack Chain Builder
- [ ] Multi-tenant / Team support
- [ ] Stripe billing

---

## 🛠️ API Reference

Full interactive API docs available at `http://localhost:8000/docs` when running locally.

Key endpoints:

```
POST   /auth/login                    Login
POST   /auth/register                 Register
GET    /projects                      List projects
POST   /projects                      Create project
POST   /uploads/project/{id}/nmap     Upload Nmap XML
POST   /uploads/project/{id}/burp     Upload Burp XML
GET    /findings/project/{id}         List findings
POST   /ai/enrich/{finding_id}        AI enrich finding
POST   /ai/enrich-all/{project_id}    Enrich all findings
POST   /ai/executive-summary/{id}     Generate summary
```

---

## 🤝 Contributing

Contributions welcome! Open an issue before submitting a PR.

```bash
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

---

## 👤 Author

Built by **[Salmanul Faris P](https://github.com/salman2610)** — Cybersecurity Engineer & Penetration Tester

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/p-salmanul-faris-68b733249/)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-BB2649?style=flat-square&logo=githubpages)](https://salman2610.github.io)
[![Instagram](https://img.shields.io/badge/Instagram-Follow-E4405F?style=flat-square&logo=instagram)](https://www.instagram.com/salmanulfaris26)

---

## 📜 License

MIT License — use it, fork it, build on it.

---

<div align="center">

⭐ **Star this repo if you find it useful** — it helps more people discover it!

*GhostWrite — Your pentest reports, written by a ghost.* 👻

</div>
