from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

import httpx
import os
from providers.base import BaseAIProvider

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

class OllamaProvider(BaseAIProvider):

    async def _chat(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3}
                }
            )
            response.raise_for_status()
            return response.json()["response"]

    async def enrich_finding(self, finding: dict) -> dict:
        prompt = f"""You are a senior penetration tester writing professional security reports.
Given this security finding, provide enrichment in this EXACT format with no extra text:

BUSINESS_IMPACT: <2-3 sentences on business risk>
REMEDIATION: <specific actionable steps>
ATTACK_SCENARIO: <realistic attack chain>
CVSS_SCORE: <number between 0.0-10.0>
CVSS_VECTOR: <CVSS:3.1/AV:.../AC:.../PR:.../UI:.../S:.../C:.../I:.../A:...>

Finding Title: {finding.get('title')}
Severity: {finding.get('severity')}
Description: {finding.get('description', 'No description')}
Affected Hosts: {finding.get('affected_hosts', [])}
Affected Ports: {finding.get('affected_ports', [])}
CWE: {finding.get('cwe', 'Unknown')}
OWASP: {finding.get('owasp', 'Unknown')}"""

        raw = await self._chat(prompt)
        enriched = {}
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith("BUSINESS_IMPACT:"):
                enriched["business_impact"] = line.replace("BUSINESS_IMPACT:", "").strip()
            elif line.startswith("REMEDIATION:"):
                enriched["remediation"] = line.replace("REMEDIATION:", "").strip()
            elif line.startswith("ATTACK_SCENARIO:"):
                enriched["attack_scenario"] = line.replace("ATTACK_SCENARIO:", "").strip()
            elif line.startswith("CVSS_SCORE:"):
                try:
                    enriched["cvss_score"] = float(line.replace("CVSS_SCORE:", "").strip())
                except ValueError:
                    pass
            elif line.startswith("CVSS_VECTOR:"):
                enriched["cvss_vector"] = line.replace("CVSS_VECTOR:", "").strip()
        return enriched

    async def executive_summary(self, findings: list) -> str:
        counts = {}
        for f in findings:
            s = f.get("severity", "info")
            counts[s] = counts.get(s, 0) + 1
        titles = [f.get("title", "") for f in findings[:10]]

        prompt = f"""You are a senior penetration tester writing an executive summary for a client report.
Write a professional, non-technical executive summary under 300 words that:
- Summarizes the overall security posture
- Highlights the most critical risks
- Gives 3 top recommendations

Total findings: {len(findings)}
Severity breakdown: {counts}
Top findings:
{chr(10).join(titles)}"""

        return await self._chat(prompt)

    async def rewrite(self, text: str, tone: str) -> str:
        tones = {
            "technical": "a senior penetration tester writing for developers",
            "executive": "a CISO writing for C-suite executives, non-technical",
            "compliance": "a compliance officer writing for auditors",
            "client": "a consultant writing for non-technical business owners",
        }
        persona = tones.get(tone, tones["technical"])
        prompt = f"You are {persona}. Rewrite the following security text in your voice. Keep the facts, change the style.\n\n{text}"
        return await self._chat(prompt)
