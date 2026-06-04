<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&pause=1000&color=BB2649&center=true&vCenter=true&width=700&lines=RedScribe;AI-Powered+Pentest+Reporting;Raw+scans+%E2%86%92+Client+reports%2C+fast." alt="RedScribe" />

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
[![Built by](https://img.shields.io/badge/Built_by-Pentester-BB2649?style=flat-square)]()

</div>

---

## 🔴 What is RedScribe?

RedScribe is an **AI-powered pentest reporting platform** built by a pentester, for pentesters.

Upload your scan files → AI parses, deduplicates, and enriches every finding → export a professional PDF/DOCX report in minutes.

> *"The tool you wish existed when you started your first VAPT engagement."*

Most pentesters spend **30–40% of engagement time** writing reports. RedScribe cuts that to under an hour.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔍 Smart Parsing
- **Nmap XML** — full service/OS/script detection
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
- Full audit trail
- Self-hostable, air-gapped ready

</td>
</tr>
</table>

---

## 🧠 AI Provider Support

RedScribe uses an abstracted AI provider layer — swap providers with one config change:

| Provider | Model | Status |
|---|---|---|
| 🦙 Ollama (Local) | llama3.2, mistral | ✅ Default — free, private, no limits |
| 🔵 Google Gemini | gemini-2.0-flash | ✅ Free tier |
| 🟠 Groq | llama3-70b | ✅ Fast inference |
| 🟣 Anthropic | claude-sonnet-4-6 | ✅ Best quality |
| 🟢 OpenAI | gpt-4o | ✅ Widely used |

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/salman2610/redscribe.git
cd redscribe
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
cp .env.example .env
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

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
                    │   Ollama (local) │ Gemini │ Groq │ OpenAI   │
                    └──────────────────────────────────────────────┘
```

---

## 🔥 Workflow Features

RedScribe is designed around a real offensive security workflow — not just scan uploading. Every feature below reflects how pentesters actually work.

### ✍️ Manual Findings

Scanner-independent. Add any finding by hand with full structure:

- Title, severity, CVSS score & vector
- CWE / OWASP category
- Affected assets
- Description, evidence, remediation, references
- **"AI Improve"** button beside every field — instantly elevate your writing with AI

> No tool detected it? Add it manually. RedScribe never limits you to what scanners find.

---

### 🔎 Finding Detail Modal

Click any finding and get the full picture in one view:

- Screenshots and raw evidence
- AI-generated explanation and attack scenario
- Remediation steps
- References and CVEs
- Full HTTP request/response (for web findings)

This is what separates a reporting tool from a reporting **platform**.

---

### 📎 Evidence Upload System

Attach real proof to every finding:

| Supported Formats | Use Case |
|---|---|
| 📸 Screenshots (PNG/JPG) | Visual PoC |
| 🎥 Videos (MP4) | Exploit walkthroughs |
| 📄 Text files / logs | Raw output |
| 🌐 HTTP requests/responses | Web finding evidence |
| 💻 PoC code / scripts | Exploit delivery |

Evidence lives with the finding — not in a separate folder on your desktop.

---

### 👁️ Live Report Preview

Split-screen report editor:

```
┌──────────────────────┬──────────────────────┐
│   Findings Editor    │   Live Report Preview │
│                      │                       │
│  [Edit findings]  ──►│  [See output live]    │
└──────────────────────┴──────────────────────┘
```

What you edit on the left appears formatted on the right — instantly. No more "export to see how it looks."

---

### 📋 Finding Templates

Stop rewriting the same findings engagement after engagement.

Pre-built templates include:

| Template | Auto-fills |
|---|---|
| SQL Injection | Description, CVSS, CWE-89, remediation |
| Cross-Site Scripting | Description, CVSS, CWE-79, remediation |
| IDOR | Description, CVSS, CWE-639, remediation |
| SSRF | Description, CVSS, CWE-918, remediation |
| Weak TLS Configuration | Description, CVSS, CWE-326, remediation |
| Default Credentials | Description, CVSS, CWE-1391, remediation |
| Open Redirect | Description, CVSS, CWE-601, remediation |
| *+ Custom templates* | Save your own org-specific findings |

Select template → fields populate → edit what's specific → done.

---

### 📊 Severity Heatmap & Risk Dashboard

Executives read charts before they read paragraphs.

RedScribe auto-generates:

- **Severity distribution chart** — Critical / High / Medium / Low / Informational
- **Affected hosts chart** — findings per asset
- **Finding categories** — Web, Network, Config, etc.
- **Overall risk score** — calculated from CVSS across all findings

Every visual exports directly into the PDF/DOCX report.

---

### 🖥️ Asset Management

Pentesters think in assets, not just findings.

Each asset tracks:

| Field | Detail |
|---|---|
| Hostname / IP | Primary identifier |
| Technologies detected | Web server, framework, OS |
| Open ports / services | From scan imports |
| Findings count | Total across all severities |
| Severity breakdown | Critical → Informational |

Filter findings by asset. Build asset-centric report sections. Works with both scanner imports and manual entries.

---

### ⛓️ Attack Chain Builder

Show how individual findings connect into a real attack path:

```
Weak Password Policy
        ↓
   Admin Panel Access
        ↓
   IDOR in User API
        ↓
Sensitive Data Exposure (PII)
```

Drag findings into a chain. Add narrative text at each step. Exports as a dedicated "Attack Scenario" section in the report. This is the feature clients actually remember.

---

### 📁 Engagement Metadata

Every professional report starts with this:

| Field | Example |
|---|---|
| Client name | Acme Corp |
| Tester name(s) | Salmanul Faris P |
| Engagement type | Black-box VAPT / Red Team |
| Scope | `*.acme.com`, `10.0.0.0/24` |
| Start / End dates | 2025-01-10 → 2025-01-17 |
| Classification | Confidential |
| Methodology | OWASP, PTES, NIST |

Without this, a PDF is just a finding list. With it, it's a deliverable.

---

### ↕️ Reorder Findings

Control the narrative of your report.

- Drag and drop findings into any order
- Group by severity, asset, or category
- Build a logical story — not just a sorted list
- Reordering reflects immediately in the live preview

Real reports aren't sorted by CVSS. They're structured for maximum impact.

---

### 🎨 AI Rewrite Modes

One finding, four audiences:

| Mode | Output style |
|---|---|
| **Technical** | Full detail for security engineers — CVEs, vectors, code |
| **Executive** | Business risk language, no jargon |
| **Compliance** | Mapped to ISO 27001 / PCI DSS / SOC 2 controls |
| **Concise** | One paragraph. Clean. Fast to read. |

Write once. Rewrite for whoever's reading.

---

### 🖍️ Screenshot Annotation

Annotate screenshots directly inside RedScribe before attaching to findings:

- Draw arrows to highlight the vulnerable parameter
- Add text labels
- Highlight regions of interest
- Blur / redact sensitive data (passwords, PII, internal IPs)

No more Greenshot or Snagit just for basic annotations.

---

### 🎨 Report Themes

Reports that look like your brand, not a template:

| Theme | Use case |
|---|---|
| **Offensive Red** | Red team engagements |
| **Executive White** | Board-level reporting |
| **Enterprise Blue** | Corporate deliverables |
| **Minimal Dark** | Modern / startup clients |
| **Custom** | Upload your logo, set your colors |

Theme selection happens at export time. Switch without re-editing a single finding.

---

## 📁 Project Structure

```
redscribe/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models/              # SQLAlchemy models
│   ├── routers/             # API endpoints
│   │   ├── auth.py          # JWT auth
│   │   ├── projects.py      # Project CRUD
│   │   ├── findings.py      # Findings CRUD
│   │   ├── uploads.py       # File upload + parsing
│   │   ├── evidence.py      # Evidence attachments
│   │   ├── assets.py        # Asset management
│   │   ├── templates.py     # Finding templates
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
        ├── assets/          # Asset management view
        ├── templates/       # Finding templates library
        └── lib/api.ts       # Axios API client
```

---

## 🗺️ Roadmap

### Core Platform
- [x] JWT Authentication
- [x] Project Management
- [x] Findings CRUD
- [x] Nmap XML Parser
- [x] Burp Suite Parser
- [x] AI Enrichment (multi-provider)
- [x] Executive Summary Generation
- [x] Project Dashboard UI
- [x] Findings Detail UI with severity coding

### Workflow Features
- [ ] Manual Finding Creation (title, CVSS, CWE, OWASP, assets, evidence)
- [ ] AI Improve button per finding field
- [ ] Finding Detail Modal with full context
- [ ] Evidence Upload System (screenshots, video, HTTP, PoC)
- [ ] Live Report Preview (split-screen editor)
- [ ] Finding Templates Library (SQLi, XSS, IDOR, SSRF, TLS, etc.)
- [ ] Engagement Metadata (client, scope, dates, classification)
- [ ] Drag-and-drop Finding Reorder
- [ ] Asset Management (hostname, IP, tech, severity counts)
- [ ] Attack Chain Builder (visual kill chain)
- [ ] AI Rewrite Modes (Technical / Executive / Compliance / Concise)
- [ ] Screenshot Annotation (arrows, highlights, blur/redact)

### Export & Reporting
- [ ] PDF Export
- [ ] DOCX Export
- [ ] Severity Heatmap & Risk Dashboard
- [ ] Report Themes (Offensive Red, Executive White, Enterprise Blue, Minimal Dark)
- [ ] Custom Branding (logo, colors)

### Extended Parser Support
- [ ] Nessus Parser
- [ ] Nikto Parser
- [ ] SSLScan Parser
- [ ] Nuclei Parser
- [ ] ffuf Parser
- [ ] OpenVAS / Amass / WhatWeb

### Platform
- [ ] Multi-tenant / Team Support
- [ ] Stripe Billing

---

## 🛠️ API Reference

Full interactive docs at `http://localhost:8000/docs` when running locally.

```
POST   /auth/login                        Login
POST   /auth/register                     Register
GET    /projects                          List projects
POST   /projects                          Create project
POST   /uploads/project/{id}/nmap         Upload Nmap XML
POST   /uploads/project/{id}/burp         Upload Burp XML
GET    /findings/project/{id}             List findings
POST   /findings/project/{id}             Create manual finding
PUT    /findings/{finding_id}             Update finding
DELETE /findings/{finding_id}             Delete finding
POST   /findings/{finding_id}/evidence    Attach evidence
GET    /assets/project/{id}               List assets
POST   /assets/project/{id}              Create asset
GET    /templates                         List finding templates
POST   /templates                         Create custom template
POST   /ai/enrich/{finding_id}            AI enrich single finding
POST   /ai/enrich-all/{project_id}        Enrich all findings
POST   /ai/executive-summary/{id}         Generate executive summary
POST   /ai/rewrite                        Rewrite text in chosen tone
POST   /ai/improve-field                  AI improve single field
POST   /reports/{project_id}/preview      Generate report preview
POST   /reports/{project_id}/export/pdf   Export PDF
POST   /reports/{project_id}/export/docx  Export DOCX
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

Built by **[Salmanul Faris P](https://github.com/salman2610)** — Cybersecurity Engineer & Penetration Tester (CPT)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/p-salmanul-faris-68b733249/)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-BB2649?style=flat-square&logo=githubpages)](https://salman2610.github.io)
[![Instagram](https://img.shields.io/badge/Instagram-Follow-E4405F?style=flat-square&logo=instagram)](https://www.instagram.com/salmanulfaris26)

---

## 📜 License

MIT License — use it, fork it, build on it.

---

<div align="center">

⭐ **Star this repo if you find it useful** — it helps more people discover it!

*RedScribe — Built by a pentester. For pentesters.*

</div>
