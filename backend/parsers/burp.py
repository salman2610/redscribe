"""
parsers/burp.py
---------------
Burp Suite Professional XML parser for GhostWrite.

Parses the XML export produced by Burp Suite Pro (Scanner Issues export)
into structured Python dataclasses, following the same conventions as
parsers/nmap.py — everything typed, .to_findings() returns dicts ready
for asyncpg insertion.

Supported Burp export types:
  - Scanner Issues export  (Issues → Report → XML)
  - Burp's own XML report format (with <issues> root)
  - Both the short and verbose export variants

Usage:
    result = parse_burp_xml(xml_string)         # from string / bytes
    result = parse_burp_file("burp_scan.xml")   # from file path
    findings = result.to_findings(project_id)   # → list[dict] for DB
    print(result.summary())                     # quick stats
"""

from __future__ import annotations

import base64
import html
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional
from uuid import uuid4


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class BurpSeverity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFORMATION = "Information"

    @classmethod
    def normalise(cls, raw: str) -> "BurpSeverity":
        """Case-insensitive lookup with fallback."""
        mapping = {v.value.lower(): v for v in cls}
        return mapping.get(raw.strip().lower(), cls.INFORMATION)

    def to_ghostwrite(self) -> str:
        """Map to GhostWrite canonical severity strings."""
        return {
            BurpSeverity.CRITICAL: "critical",
            BurpSeverity.HIGH: "high",
            BurpSeverity.MEDIUM: "medium",
            BurpSeverity.LOW: "low",
            BurpSeverity.INFORMATION: "info",
        }[self]


class BurpConfidence(str, Enum):
    CERTAIN = "Certain"
    FIRM = "Firm"
    TENTATIVE = "Tentative"

    @classmethod
    def normalise(cls, raw: str) -> "BurpConfidence":
        mapping = {v.value.lower(): v for v in cls}
        return mapping.get(raw.strip().lower(), cls.TENTATIVE)


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class BurpRequestResponse:
    """
    A single HTTP request/response pair attached to an issue.

    Burp stores these base64-encoded inside <requestresponse> blocks.
    We decode them for use as evidence.
    """

    request: bytes = b""
    response: bytes = b""
    # The URL this request/response was captured from (may differ from issue host)
    url: str = ""
    # Whether base64 decoding succeeded
    decoded: bool = True

    @property
    def request_str(self) -> str:
        try:
            return self.request.decode("utf-8", errors="replace")
        except Exception:
            return repr(self.request)

    @property
    def response_str(self) -> str:
        try:
            return self.response.decode("utf-8", errors="replace")
        except Exception:
            return repr(self.response)

    @property
    def request_preview(self) -> str:
        """First 500 chars of the request — safe for evidence fields."""
        return self.request_str[:500]

    @property
    def response_preview(self) -> str:
        """First 500 chars of the response."""
        return self.response_str[:500]

    @classmethod
    def from_element(cls, elem: ET.Element) -> "BurpRequestResponse":
        url = _text(elem.find("url")) or ""
        req_elem = elem.find("request")
        resp_elem = elem.find("response")

        def _decode(el: Optional[ET.Element]) -> tuple[bytes, bool]:
            if el is None:
                return b"", True
            raw = (el.text or "").strip()
            if el.get("base64") == "true":
                try:
                    return base64.b64decode(raw), True
                except Exception:
                    return raw.encode(), False
            return raw.encode(), True

        req_bytes, req_ok = _decode(req_elem)
        resp_bytes, resp_ok = _decode(resp_elem)

        return cls(
            request=req_bytes,
            response=resp_bytes,
            url=url,
            decoded=req_ok and resp_ok,
        )


@dataclass
class BurpIssue:
    """
    A single Burp Scanner issue (one <issue> element).

    Field names mirror Burp's XML element names where possible.
    """

    # Core identity
    serial_number: str = ""
    issue_type: int = 0           # Burp's numeric type code (e.g. 1049088 = SQLi)
    name: str = ""
    host: str = ""                # hostname or IP
    host_ip: str = ""             # IP from the host element's ip attribute
    path: str = ""                # URL path component
    full_url: str = ""            # reconstructed from host + path

    # Classification
    severity: BurpSeverity = BurpSeverity.INFORMATION
    confidence: BurpConfidence = BurpConfidence.TENTATIVE

    # Content — Burp stores these as HTML; we strip tags for plain text
    issue_background: str = ""    # generic description of the vulnerability class
    remediation_background: str = ""  # generic fix guidance
    issue_detail: str = ""        # instance-specific detail
    remediation_detail: str = ""  # instance-specific fix

    # Evidence
    request_responses: list[BurpRequestResponse] = field(default_factory=list)

    # Extracted vulnerability metadata (best-effort from name / type)
    cwe: str = ""
    owasp: str = ""

    @property
    def description(self) -> str:
        """Combined plain-text description: background + instance detail."""
        parts = [p for p in (self.issue_background, self.issue_detail) if p]
        return "\n\n".join(parts)

    @property
    def remediation(self) -> str:
        """Combined plain-text remediation."""
        parts = [p for p in (self.remediation_background, self.remediation_detail) if p]
        return "\n\n".join(parts)

    @property
    def evidence_text(self) -> str:
        """Formatted request/response pairs for the evidence field."""
        if not self.request_responses:
            return ""
        parts: list[str] = []
        for i, rr in enumerate(self.request_responses, 1):
            header = f"--- Request/Response {i}"
            if rr.url:
                header += f": {rr.url}"
            header += " ---"
            parts.append(header)
            if rr.request:
                parts.append("[Request]")
                parts.append(rr.request_preview)
            if rr.response:
                parts.append("[Response]")
                parts.append(rr.response_preview)
        return "\n".join(parts)

    @classmethod
    def from_element(cls, elem: ET.Element) -> "BurpIssue":
        # Host element carries both the display name and an ip attribute
        host_elem = elem.find("host")
        host_name = _text(host_elem) or ""
        host_ip = host_elem.get("ip", "") if host_elem is not None else ""

        path = _text(elem.find("path")) or ""
        name = _text(elem.find("name")) or ""

        # Reconstruct a readable URL
        location = _text(elem.find("location")) or path
        full_url = f"{host_name}{location}" if host_name else location

        severity_raw = _text(elem.find("severity")) or "Information"
        confidence_raw = _text(elem.find("confidence")) or "Tentative"

        issue_type_raw = _text(elem.find("type")) or "0"
        try:
            issue_type = int(issue_type_raw)
        except ValueError:
            issue_type = 0

        rrs = [
            BurpRequestResponse.from_element(rr)
            for rr in elem.findall("requestresponses/requestresponse")
        ]
        # Also handle single <requestresponse> directly under <issue>
        if not rrs:
            single = elem.find("requestresponse")
            if single is not None:
                rrs = [BurpRequestResponse.from_element(single)]

        issue = cls(
            serial_number=_text(elem.find("serialNumber")) or elem.get("serialNumber", ""),
            issue_type=issue_type,
            name=name,
            host=host_name,
            host_ip=host_ip,
            path=path,
            full_url=full_url,
            severity=BurpSeverity.normalise(severity_raw),
            confidence=BurpConfidence.normalise(confidence_raw),
            issue_background=_strip_html(_text(elem.find("issueBackground")) or ""),
            remediation_background=_strip_html(_text(elem.find("remediationBackground")) or ""),
            issue_detail=_strip_html(_text(elem.find("issueDetail")) or ""),
            remediation_detail=_strip_html(_text(elem.find("remediationDetail")) or ""),
            request_responses=rrs,
        )

        # Best-effort CWE / OWASP from the issue type code and name
        issue.cwe, issue.owasp = _infer_cwe_owasp(issue_type, name)

        return issue


@dataclass
class BurpScanInfo:
    """Metadata extracted from the Burp XML export."""

    export_time: Optional[datetime] = None
    burp_version: str = ""
    target_host: str = ""          # from <host> in issues, deduplicated
    target_hosts: list[str] = field(default_factory=list)


@dataclass
class BurpResult:
    """
    Complete parsed result of a Burp Suite XML export.

    Iterate .issues for all findings, or use severity-filtered properties.
    """

    scan_info: BurpScanInfo
    issues: list[BurpIssue] = field(default_factory=list)

    # ---- Convenience filters ----

    @property
    def critical_issues(self) -> list[BurpIssue]:
        return [i for i in self.issues if i.severity == BurpSeverity.CRITICAL]

    @property
    def high_issues(self) -> list[BurpIssue]:
        return [i for i in self.issues if i.severity == BurpSeverity.HIGH]

    @property
    def medium_issues(self) -> list[BurpIssue]:
        return [i for i in self.issues if i.severity == BurpSeverity.MEDIUM]

    @property
    def low_issues(self) -> list[BurpIssue]:
        return [i for i in self.issues if i.severity == BurpSeverity.LOW]

    @property
    def info_issues(self) -> list[BurpIssue]:
        return [i for i in self.issues if i.severity == BurpSeverity.INFORMATION]

    def to_findings(self, project_id: str) -> list[dict]:
        """
        Convert all Burp issues into GhostWrite Finding dicts.

        Schema matches the findings table in the spec:
            id, project_id, title, severity, description, remediation,
            evidence, affected_hosts, affected_ports, source_tool,
            host, full_url, confidence, cwe, owasp, tags
        """
        findings: list[dict] = []

        for issue in self.issues:
            # Extract port from host URL if present (e.g. https://host:8443)
            port = _extract_port(issue.host)
            affected_ports = [port] if port else []

            affected_hosts = list(
                {h for h in (issue.host, issue.host_ip) if h}
            )

            findings.append(
                {
                    "id": str(uuid4()),
                    "project_id": project_id,
                    # Core fields
                    "title": issue.name,
                    "severity": issue.severity.to_ghostwrite(),
                    "description": issue.description,
                    "remediation": issue.remediation,
                    "evidence": issue.evidence_text,
                    # Host / location
                    "host": issue.host,
                    "ip": issue.host_ip,
                    "full_url": issue.full_url,
                    "path": issue.path,
                    "affected_hosts": affected_hosts,
                    "affected_ports": affected_ports,
                    # Classification
                    "confidence": issue.confidence.value,
                    "cwe": issue.cwe,
                    "owasp": issue.owasp,
                    "source_tool": "burp",
                    "burp_issue_type": issue.issue_type,
                    "burp_serial": issue.serial_number,
                    # Tagging
                    "tags": _build_tags(issue),
                }
            )

        return findings

    def summary(self) -> dict:
        """Quick stats dict for API responses / logging."""
        severity_counts = {
            "critical": len(self.critical_issues),
            "high": len(self.high_issues),
            "medium": len(self.medium_issues),
            "low": len(self.low_issues),
            "info": len(self.info_issues),
        }
        return {
            "total_issues": len(self.issues),
            "severity_breakdown": severity_counts,
            "target_hosts": self.scan_info.target_hosts,
            "burp_version": self.scan_info.burp_version,
            "export_time": (
                self.scan_info.export_time.isoformat()
                if self.scan_info.export_time
                else None
            ),
        }


# ---------------------------------------------------------------------------
# Public parse functions
# ---------------------------------------------------------------------------


def parse_burp_xml(xml_data: str | bytes) -> BurpResult:
    """
    Parse a Burp Suite XML export from a string or bytes.

    Handles both:
    - <issues> root (Scanner Issues XML export)
    - <BurpSuiteExport> root (older Burp report format)

    Raises:
        ValueError: if the XML doesn't look like a Burp export.
        ET.ParseError: if the XML is malformed.
    """
    if isinstance(xml_data, bytes):
        xml_data = xml_data.decode("utf-8", errors="replace")

    # Burp sometimes emits invalid XML entities — strip the most common ones
    xml_data = _sanitise_burp_xml(xml_data)

    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as exc:
        raise ET.ParseError(f"Failed to parse Burp XML: {exc}") from exc

    # Support both root element variants
    if root.tag == "issues":
        issue_elements = root.findall("issue")
    elif root.tag in ("BurpSuiteExport", "burpSuiteExport"):
        issue_elements = root.findall(".//issue")
    else:
        # Be permissive — look for <issue> elements anywhere
        issue_elements = root.findall(".//issue")
        if not issue_elements:
            raise ValueError(
                f"Expected a Burp Suite XML export (root <issues> or <BurpSuiteExport>), "
                f"got <{root.tag}>. Make sure you exported via: Issues → Report → XML."
            )

    scan_info = _parse_scan_info(root, issue_elements)
    issues = [BurpIssue.from_element(e) for e in issue_elements]

    return BurpResult(scan_info=scan_info, issues=issues)


def parse_burp_file(path: str | Path) -> BurpResult:
    """
    Parse a Burp Suite XML export file from disk.

    Raises:
        FileNotFoundError: if the file does not exist.
        ValueError / ET.ParseError: propagated from parse_burp_xml.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Burp XML file not found: {p}")
    return parse_burp_xml(p.read_bytes())


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _text(elem: Optional[ET.Element]) -> Optional[str]:
    """Safely extract .text from an element that may be None."""
    if elem is None:
        return None
    return (elem.text or "").strip() or None


def _strip_html(text: str) -> str:
    """
    Strip HTML tags from Burp's rich-text fields and decode entities.
    Preserves newlines from <br>, <p>, <li> tags before stripping.
    """
    if not text:
        return ""
    # Normalise common block-level tags to newlines before stripping
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>", "• ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)  # strip remaining tags
    text = html.unescape(text)
    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _sanitise_burp_xml(xml: str) -> str:
    """
    Fix common Burp XML quirks that cause ElementTree to choke:
    - Lone & characters outside of entities
    - Null bytes
    """
    xml = xml.replace("\x00", "")
    # Replace bare & that are not already an entity/character reference
    xml = re.sub(r"&(?!(?:#\d+|#x[\da-fA-F]+|[\w]+);)", "&amp;", xml)
    return xml


def _parse_scan_info(
    root: ET.Element,
    issue_elements: list[ET.Element],
) -> BurpScanInfo:
    """Extract metadata from the root element and first few issues."""
    # Burp version — may appear as an attribute on the root
    burp_version = root.get("burpVersion", root.get("version", ""))

    # Export time — Burp sometimes includes it in the root element
    export_time_raw = root.get("exportTime", "")
    export_time: Optional[datetime] = None
    if export_time_raw:
        try:
            # Burp format: "Thu May 21 12:00:00 BST 2026"
            # We try ISO first, then fall through
            export_time = datetime.fromisoformat(export_time_raw)
        except ValueError:
            pass

    # Collect all unique target hosts from the issues themselves
    hosts: list[str] = []
    seen: set[str] = set()
    for elem in issue_elements:
        host_elem = elem.find("host")
        if host_elem is not None:
            h = (host_elem.text or "").strip()
            if h and h not in seen:
                seen.add(h)
                hosts.append(h)

    return BurpScanInfo(
        export_time=export_time,
        burp_version=burp_version,
        target_host=hosts[0] if hosts else "",
        target_hosts=hosts,
    )


def _extract_port(host: str) -> Optional[int]:
    """
    Extract port number from a host string like 'https://example.com:8443'.
    Falls back to scheme-default ports.
    """
    m = re.search(r":(\d{2,5})(?:/|$)", host)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    if host.startswith("https://"):
        return 443
    if host.startswith("http://"):
        return 80
    return None


def _build_tags(issue: BurpIssue) -> list[str]:
    tags = ["burp", issue.severity.value.lower(), issue.confidence.value.lower()]
    if issue.owasp:
        tags.append(issue.owasp.split(":")[0].lower())  # e.g. "a01"
    if issue.cwe:
        tags.append(issue.cwe.lower())   # e.g. "cwe-89"
    # Add slug from issue name — useful for dedup / template matching
    slug = re.sub(r"[^a-z0-9]+", "-", issue.name.lower()).strip("-")
    if slug:
        tags.append(slug)
    return [t for t in tags if t]


# ---------------------------------------------------------------------------
# CWE / OWASP inference table
#
# Burp's numeric issue type codes are documented (partially) in their API.
# We map the most common ones here; unknown codes get empty strings.
# ---------------------------------------------------------------------------

# (cwe, owasp_category)
_ISSUE_TYPE_MAP: dict[int, tuple[str, str]] = {
    # Injection
    1049088:  ("CWE-89",  "A03:2021"),   # SQL injection
    1049089:  ("CWE-89",  "A03:2021"),   # SQL injection (time-based)
    2097920:  ("CWE-78",  "A03:2021"),   # OS command injection
    2097921:  ("CWE-78",  "A03:2021"),   # OS command injection (time-based)
    1051648:  ("CWE-94",  "A03:2021"),   # Server-side template injection
    # XSS
    2097929:  ("CWE-79",  "A03:2021"),   # Reflected XSS
    2097936:  ("CWE-79",  "A03:2021"),   # Stored XSS
    2097937:  ("CWE-79",  "A03:2021"),   # DOM-based XSS
    # SSRF
    2098052:  ("CWE-918", "A10:2021"),   # SSRF
    # XXE
    2097924:  ("CWE-611", "A05:2021"),   # XXE
    # Path traversal
    6291456:  ("CWE-22",  "A01:2021"),   # File path traversal
    # Auth / session
    2097664:  ("CWE-287", "A07:2021"),   # Broken authentication
    2360320:  ("CWE-384", "A07:2021"),   # Session fixation
    2097921:  ("CWE-287", "A07:2021"),   # Password field autocomplete
    # Access control
    2097920:  ("CWE-284", "A01:2021"),   # Privilege escalation
    5243136:  ("CWE-639", "A01:2021"),   # IDOR
    # Crypto
    2883608:  ("CWE-326", "A02:2021"),   # Weak TLS
    2883616:  ("CWE-310", "A02:2021"),   # SSL/TLS issues
    # Info disclosure
    1049345:  ("CWE-200", "A05:2021"),   # Directory listing
    1049600:  ("CWE-209", "A05:2021"),   # Stack trace in response
    8389632:  ("CWE-200", "A05:2021"),   # Email address disclosure
    # CSRF
    2097928:  ("CWE-352", "A01:2021"),   # CSRF
    # Open redirect
    2097952:  ("CWE-601", "A01:2021"),   # Open redirection
    # Headers
    16777728:  ("CWE-693", "A05:2021"),  # Missing security headers
    16777473:  ("CWE-1021","A05:2021"),  # Clickjacking
    # Deserialization
    2097985:  ("CWE-502", "A08:2021"),   # Insecure deserialization
    # Components
    2097947:  ("CWE-1104","A06:2021"),   # Outdated software
}

# Name-based fallback patterns when issue_type isn't in the table
_NAME_PATTERN_MAP: list[tuple[re.Pattern, str, str]] = [
    (re.compile(r"sql\s*inject", re.I),           "CWE-89",  "A03:2021"),
    (re.compile(r"cross.site\s*script|xss", re.I),"CWE-79",  "A03:2021"),
    (re.compile(r"ssrf|server.side\s*request",re.I),"CWE-918","A10:2021"),
    (re.compile(r"xxe|xml\s*external",re.I),      "CWE-611", "A05:2021"),
    (re.compile(r"path\s*travers|directory\s*trav",re.I),"CWE-22","A01:2021"),
    (re.compile(r"open\s*redirect",re.I),          "CWE-601", "A01:2021"),
    (re.compile(r"csrf|cross.site\s*request",re.I),"CWE-352","A01:2021"),
    (re.compile(r"clickjack",re.I),                "CWE-1021","A05:2021"),
    (re.compile(r"idor|insecure\s*direct",re.I),   "CWE-639", "A01:2021"),
    (re.compile(r"deseri[ai]",re.I),               "CWE-502", "A08:2021"),
    (re.compile(r"command\s*inject|os\s*inject",re.I),"CWE-78","A03:2021"),
    (re.compile(r"template\s*inject|ssti",re.I),   "CWE-94",  "A03:2021"),
    (re.compile(r"broken\s*auth|auth.*bypass",re.I),"CWE-287","A07:2021"),
    (re.compile(r"session\s*fix",re.I),            "CWE-384", "A07:2021"),
    (re.compile(r"sensitiv.*data|info.*disclos",re.I),"CWE-200","A05:2021"),
    (re.compile(r"tls|ssl|certif",re.I),           "CWE-326", "A02:2021"),
    (re.compile(r"security\s*head",re.I),          "CWE-693", "A05:2021"),
    (re.compile(r"outdated|obsolete|version",re.I),"CWE-1104","A06:2021"),
]


def _infer_cwe_owasp(issue_type: int, name: str) -> tuple[str, str]:
    """Return (cwe, owasp) for a Burp issue, best-effort."""
    if issue_type in _ISSUE_TYPE_MAP:
        return _ISSUE_TYPE_MAP[issue_type]
    for pattern, cwe, owasp in _NAME_PATTERN_MAP:
        if pattern.search(name):
            return cwe, owasp
    return "", ""
