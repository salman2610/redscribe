"""
parsers/nmap.py
---------------
Nmap XML parser for GhostWrite.

Parses nmap -oX output into structured Python dataclasses, ready to be
persisted via asyncpg or fed into the findings pipeline.

Supported nmap output types:
  - Standard host/port scans
  - Service version detection (-sV)
  - OS detection (-O)
  - NSE script output (--script)
  - UDP scans (-sU)

Usage:
    result = parse_nmap_xml(xml_string)          # from string
    result = parse_nmap_file("scan.xml")         # from file path
    findings = result.to_findings(project_id)    # convert to Finding dicts
"""

from __future__ import annotations

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


class PortState(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    FILTERED = "filtered"
    OPEN_FILTERED = "open|filtered"
    CLOSED_FILTERED = "closed|filtered"
    UNFILTERED = "unfiltered"


class Protocol(str, Enum):
    TCP = "tcp"
    UDP = "udp"
    SCTP = "sctp"
    IP = "ip"


class HostState(str, Enum):
    UP = "up"
    DOWN = "down"
    UNKNOWN = "unknown"
    SKIPPED = "skipped"


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class NmapScript:
    """Output from a single NSE script execution on a port or host."""

    id: str
    output: str
    # Structured table data (key → value or nested) — present in some scripts
    elements: dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_element(cls, elem: ET.Element) -> "NmapScript":
        elements: dict[str, str] = {}
        for el in elem.findall(".//elem"):
            key = el.get("key", "")
            if key:
                elements[key] = (el.text or "").strip()
        return cls(
            id=elem.get("id", ""),
            output=(elem.get("output") or "").strip(),
            elements=elements,
        )


@dataclass
class NmapService:
    """Service information detected on an open port."""

    name: str = ""
    product: str = ""
    version: str = ""
    extra_info: str = ""
    tunnel: str = ""          # e.g. "ssl"
    proto: str = ""           # application-level proto, e.g. "http"
    hostname: str = ""
    os_type: str = ""
    device_type: str = ""
    cpe: list[str] = field(default_factory=list)

    @property
    def banner(self) -> str:
        """Human-readable service banner, mirroring nmap's PORT display."""
        parts = [p for p in (self.product, self.version, self.extra_info) if p]
        return " ".join(parts)

    @property
    def full_name(self) -> str:
        """ssl/http style compound name."""
        if self.tunnel:
            return f"{self.tunnel}/{self.name}"
        return self.name

    @classmethod
    def from_element(cls, elem: ET.Element) -> "NmapService":
        cpe_list = [c.text.strip() for c in elem.findall("cpe") if c.text]
        return cls(
            name=elem.get("name", ""),
            product=elem.get("product", ""),
            version=elem.get("version", ""),
            extra_info=elem.get("extrainfo", ""),
            tunnel=elem.get("tunnel", ""),
            proto=elem.get("proto", ""),
            hostname=elem.get("hostname", ""),
            os_type=elem.get("ostype", ""),
            device_type=elem.get("devicetype", ""),
            cpe=cpe_list,
        )


@dataclass
class NmapPort:
    """A single scanned port on a host."""

    port: int
    protocol: Protocol
    state: PortState
    state_reason: str = ""
    service: Optional[NmapService] = None
    scripts: list[NmapScript] = field(default_factory=list)

    @property
    def is_open(self) -> bool:
        return self.state == PortState.OPEN

    @property
    def port_id(self) -> str:
        """Canonical string identifier, e.g. '443/tcp'."""
        return f"{self.port}/{self.protocol.value}"

    @classmethod
    def from_element(cls, elem: ET.Element) -> "NmapPort":
        state_elem = elem.find("state")
        service_elem = elem.find("service")
        scripts = [NmapScript.from_element(s) for s in elem.findall("script")]

        raw_state = state_elem.get("state", "unknown") if state_elem is not None else "unknown"
        try:
            state = PortState(raw_state)
        except ValueError:
            state = PortState.FILTERED

        try:
            proto = Protocol(elem.get("protocol", "tcp").lower())
        except ValueError:
            proto = Protocol.TCP

        return cls(
            port=int(elem.get("portid", 0)),
            protocol=proto,
            state=state,
            state_reason=state_elem.get("reason", "") if state_elem is not None else "",
            service=NmapService.from_element(service_elem) if service_elem is not None else None,
            scripts=scripts,
        )


@dataclass
class NmapOSMatch:
    """Operating system guess for a host."""

    name: str
    accuracy: int            # 0-100
    cpe: list[str] = field(default_factory=list)
    os_families: list[str] = field(default_factory=list)
    os_generations: list[str] = field(default_factory=list)
    os_types: list[str] = field(default_factory=list)
    vendors: list[str] = field(default_factory=list)

    @classmethod
    def from_element(cls, elem: ET.Element) -> "NmapOSMatch":
        cpe_list = [c.text.strip() for c in elem.findall("cpe") if c.text]
        classes = elem.findall("osclass")
        families = [c.get("osfamily", "") for c in classes if c.get("osfamily")]
        generations = [c.get("osgen", "") for c in classes if c.get("osgen")]
        types = [c.get("type", "") for c in classes if c.get("type")]
        vendors = [c.get("vendor", "") for c in classes if c.get("vendor")]
        return cls(
            name=elem.get("name", ""),
            accuracy=int(elem.get("accuracy", 0)),
            cpe=cpe_list,
            os_families=families,
            os_generations=generations,
            os_types=types,
            vendors=vendors,
        )


@dataclass
class NmapHost:
    """A single host discovered in the nmap scan."""

    # Identity
    ip: str
    ipv6: str = ""
    mac: str = ""
    mac_vendor: str = ""
    hostnames: list[str] = field(default_factory=list)

    # State
    state: HostState = HostState.UP
    state_reason: str = ""

    # Scan data
    ports: list[NmapPort] = field(default_factory=list)
    os_matches: list[NmapOSMatch] = field(default_factory=list)
    host_scripts: list[NmapScript] = field(default_factory=list)

    # Timing (epoch seconds, may be None for older scans)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    @property
    def open_ports(self) -> list[NmapPort]:
        return [p for p in self.ports if p.is_open]

    @property
    def primary_hostname(self) -> str:
        return self.hostnames[0] if self.hostnames else ""

    @property
    def display_name(self) -> str:
        """Best available label for the host."""
        return self.primary_hostname or self.ip

    @property
    def best_os_guess(self) -> Optional[NmapOSMatch]:
        if not self.os_matches:
            return None
        return max(self.os_matches, key=lambda o: o.accuracy)

    @classmethod
    def from_element(cls, elem: ET.Element) -> "NmapHost":
        # --- addresses ---
        ip = ipv6 = mac = mac_vendor = ""
        for addr in elem.findall("address"):
            atype = addr.get("addrtype", "")
            if atype == "ipv4":
                ip = addr.get("addr", "")
            elif atype == "ipv6":
                ipv6 = addr.get("addr", "")
            elif atype == "mac":
                mac = addr.get("addr", "")
                mac_vendor = addr.get("vendor", "")

        # --- hostnames ---
        hostnames = [
            h.get("name", "")
            for h in elem.findall("hostnames/hostname")
            if h.get("name")
        ]

        # --- state ---
        status_elem = elem.find("status")
        raw_state = status_elem.get("state", "unknown") if status_elem is not None else "unknown"
        try:
            state = HostState(raw_state)
        except ValueError:
            state = HostState.UNKNOWN
        state_reason = status_elem.get("reason", "") if status_elem is not None else ""

        # --- ports ---
        ports = [
            NmapPort.from_element(p)
            for p in elem.findall("ports/port")
        ]

        # --- OS detection ---
        os_matches = [
            NmapOSMatch.from_element(m)
            for m in elem.findall("os/osmatch")
        ]

        # --- host scripts ---
        host_scripts = [
            NmapScript.from_element(s)
            for s in elem.findall("hostscript/script")
        ]

        # --- timing ---
        def _ts(attr: str) -> Optional[datetime]:
            val = elem.get(attr)
            if val:
                try:
                    return datetime.fromtimestamp(int(val), tz=timezone.utc)
                except (ValueError, OSError):
                    pass
            return None

        return cls(
            ip=ip,
            ipv6=ipv6,
            mac=mac,
            mac_vendor=mac_vendor,
            hostnames=hostnames,
            state=state,
            state_reason=state_reason,
            ports=ports,
            os_matches=os_matches,
            host_scripts=host_scripts,
            start_time=_ts("starttime"),
            end_time=_ts("endtime"),
        )


@dataclass
class NmapScanInfo:
    """Top-level metadata from the nmap run."""

    scanner: str = "nmap"
    args: str = ""
    version: str = ""
    scan_start: Optional[datetime] = None
    scan_end: Optional[datetime] = None
    scan_types: list[str] = field(default_factory=list)   # e.g. ["syn", "udp"]
    services_scanned: int = 0
    protocol: str = "tcp"


@dataclass
class NmapResult:
    """
    Complete parsed result of an nmap XML file.

    Iterate over .hosts for all discovered hosts, or use .up_hosts
    for convenience.
    """

    scan_info: NmapScanInfo
    hosts: list[NmapHost] = field(default_factory=list)
    raw_args: str = ""

    @property
    def up_hosts(self) -> list[NmapHost]:
        return [h for h in self.hosts if h.state == HostState.UP]

    @property
    def total_open_ports(self) -> int:
        return sum(len(h.open_ports) for h in self.up_hosts)

    def to_findings(self, project_id: str) -> list[dict]:
        """
        Convert scan results into GhostWrite Finding dicts.

        Each open port on each live host becomes a finding, with
        service details folded into the description. NSE script
        output is appended as evidence when present.

        Returns a list of dicts suitable for asyncpg insertion into
        the findings table (id, project_id, title, description,
        severity, host, port, protocol, service, evidence).
        """
        findings: list[dict] = []

        for host in self.up_hosts:
            for port in host.open_ports:
                svc = port.service
                service_name = svc.full_name if svc else "unknown"
                banner = svc.banner if svc else ""
                os_guess = host.best_os_guess

                title = _build_title(host, port, svc)
                description = _build_description(host, port, svc, os_guess)
                severity = _infer_severity(port, svc)
                evidence = _collect_evidence(port)

                findings.append(
                    {
                        "id": str(uuid4()),
                        "project_id": project_id,
                        "title": title,
                        "description": description,
                        "severity": severity,
                        "host": host.display_name,
                        "ip": host.ip,
                        "port": port.port,
                        "protocol": port.protocol.value,
                        "service": service_name,
                        "banner": banner,
                        "evidence": evidence,
                        "cpe": (svc.cpe if svc else []) + (os_guess.cpe if os_guess else []),
                        "tags": _build_tags(host, port, svc),
                    }
                )

        return findings

    def summary(self) -> dict:
        """Quick stats dict for API responses / logging."""
        return {
            "total_hosts": len(self.hosts),
            "up_hosts": len(self.up_hosts),
            "total_open_ports": self.total_open_ports,
            "scan_args": self.scan_info.args,
            "nmap_version": self.scan_info.version,
            "scan_start": self.scan_info.scan_start.isoformat() if self.scan_info.scan_start else None,
            "scan_end": self.scan_info.scan_end.isoformat() if self.scan_info.scan_end else None,
        }


# ---------------------------------------------------------------------------
# Public parse functions
# ---------------------------------------------------------------------------


def parse_nmap_xml(xml_data: str | bytes) -> NmapResult:
    """
    Parse an nmap XML string or bytes into a NmapResult.

    Raises:
        ValueError: if the XML is not a valid nmap document.
        ET.ParseError: if the XML is malformed.
    """
    if isinstance(xml_data, bytes):
        xml_data = xml_data.decode("utf-8", errors="replace")

    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as exc:
        raise ET.ParseError(f"Failed to parse nmap XML: {exc}") from exc

    if root.tag != "nmaprun":
        raise ValueError(
            f"Expected root element <nmaprun>, got <{root.tag}>. "
            "Make sure you're passing nmap -oX output."
        )

    scan_info = _parse_scan_info(root)
    hosts = [NmapHost.from_element(h) for h in root.findall("host")]

    return NmapResult(
        scan_info=scan_info,
        hosts=hosts,
        raw_args=root.get("args", ""),
    )


def parse_nmap_file(path: str | Path) -> NmapResult:
    """
    Parse an nmap XML file from disk.

    Raises:
        FileNotFoundError: if the file does not exist.
        ValueError / ET.ParseError: propagated from parse_nmap_xml.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Nmap XML file not found: {p}")
    return parse_nmap_xml(p.read_bytes())


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _parse_scan_info(root: ET.Element) -> NmapScanInfo:
    scan_types: list[str] = []
    services_scanned = 0
    protocol = "tcp"

    for si in root.findall("scaninfo"):
        scan_types.append(si.get("type", ""))
        protocol = si.get("protocol", "tcp")
        numservices = si.get("numservices", "0")
        try:
            services_scanned += int(numservices)
        except ValueError:
            pass

    def _ts(attr: str) -> Optional[datetime]:
        val = root.get(attr)
        if val:
            try:
                return datetime.fromtimestamp(int(val), tz=timezone.utc)
            except (ValueError, OSError):
                pass
        return None

    # scan end time lives in the <runstats><finished> element
    finished = root.find("runstats/finished")
    scan_end: Optional[datetime] = None
    if finished is not None:
        val = finished.get("time")
        if val:
            try:
                scan_end = datetime.fromtimestamp(int(val), tz=timezone.utc)
            except (ValueError, OSError):
                pass

    return NmapScanInfo(
        scanner=root.get("scanner", "nmap"),
        args=root.get("args", ""),
        version=root.get("version", ""),
        scan_start=_ts("start"),
        scan_end=scan_end,
        scan_types=scan_types,
        services_scanned=services_scanned,
        protocol=protocol,
    )


# ---------------------
# Finding construction
# ---------------------

# Ports that commonly indicate high-value or sensitive services
_HIGH_VALUE_PORTS: dict[int, str] = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    111: "RPC",
    135: "MSRPC",
    137: "NetBIOS-NS",
    139: "NetBIOS-SSN",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    512: "rexec",
    513: "rlogin",
    514: "rsh",
    873: "rsync",
    1433: "MSSQL",
    1521: "Oracle",
    2049: "NFS",
    3306: "MySQL",
    3389: "RDP",
    4848: "GlassFish Admin",
    5432: "PostgreSQL",
    5900: "VNC",
    5985: "WinRM",
    6379: "Redis",
    7001: "WebLogic",
    8080: "HTTP-Alt",
    8443: "HTTPS-Alt",
    8888: "HTTP-Alt",
    9200: "Elasticsearch",
    27017: "MongoDB",
}

_CRITICAL_SERVICES = {
    "telnet", "ftp", "rsh", "rexec", "rlogin",
    "vnc", "rdp", "ms-wbt-server",
}
_HIGH_SERVICES = {
    "smb", "microsoft-ds", "msrpc", "netbios-ssn",
    "mssql", "mysql", "postgresql", "oracle", "mongodb",
    "redis", "elasticsearch",
}
_MEDIUM_SERVICES = {
    "http", "https", "ssh", "smtp", "pop3", "imap",
    "dns", "nfs", "rsync", "winrm",
}


def _infer_severity(port: NmapPort, svc: Optional[NmapService]) -> str:
    """
    Heuristic severity rating for a pentest finding.
    Returns one of: critical / high / medium / low / info.
    """
    svc_name = (svc.name if svc else "").lower()

    if svc_name in _CRITICAL_SERVICES or port.port in (23, 512, 513, 514):
        return "critical"
    if svc_name in _HIGH_SERVICES or port.port in (445, 1433, 3306, 5432, 3389, 5900, 6379, 27017, 9200):
        return "high"
    if svc_name in _MEDIUM_SERVICES or port.port in (80, 443, 22, 25, 53, 110, 143, 873, 5985):
        return "medium"
    if port.port < 1024:
        return "low"
    return "info"


def _build_title(host: NmapHost, port: NmapPort, svc: Optional[NmapService]) -> str:
    svc_label = _HIGH_VALUE_PORTS.get(port.port, svc.full_name if svc else "Unknown Service")
    return f"Open Port: {port.port}/{port.protocol.value} ({svc_label}) on {host.display_name}"


def _build_description(
    host: NmapHost,
    port: NmapPort,
    svc: Optional[NmapService],
    os_guess: Optional[NmapOSMatch],
) -> str:
    lines: list[str] = [
        f"Host: {host.display_name} ({host.ip})",
        f"Port: {port.port_id} — {port.state.value} ({port.state_reason})",
    ]

    if svc:
        lines.append(f"Service: {svc.full_name}")
        if svc.banner:
            lines.append(f"Banner: {svc.banner}")
        if svc.cpe:
            lines.append(f"CPE: {', '.join(svc.cpe)}")

    if host.mac:
        vendor = f" ({host.mac_vendor})" if host.mac_vendor else ""
        lines.append(f"MAC: {host.mac}{vendor}")

    if os_guess:
        lines.append(
            f"OS Guess: {os_guess.name} (accuracy: {os_guess.accuracy}%)"
        )

    return "\n".join(lines)


def _collect_evidence(port: NmapPort) -> str:
    """Concatenate NSE script output as evidence text."""
    if not port.scripts:
        return ""
    parts: list[str] = []
    for script in port.scripts:
        parts.append(f"[{script.id}]\n{script.output}")
        if script.elements:
            for k, v in script.elements.items():
                parts.append(f"  {k}: {v}")
    return "\n\n".join(parts)


def _build_tags(
    host: NmapHost,
    port: NmapPort,
    svc: Optional[NmapService],
) -> list[str]:
    tags = [port.protocol.value, f"port-{port.port}"]
    if svc:
        tags.append(svc.name)
        if svc.tunnel:
            tags.append(svc.tunnel)
        tags.extend(svc.cpe)
    best_os = host.best_os_guess
    if best_os and best_os.os_families:
        tags.extend(best_os.os_families)
    return [t for t in tags if t]
