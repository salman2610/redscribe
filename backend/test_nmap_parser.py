"""
tests/test_nmap_parser.py
--------------------------
Unit tests for parsers/nmap.py

Run with:
    pytest tests/test_nmap_parser.py -v
"""

import pytest
import xml.etree.ElementTree as ET
from parsers.nmap import (
    NmapHost,
    NmapOSMatch,
    NmapPort,
    NmapResult,
    NmapScript,
    NmapService,
    HostState,
    PortState,
    Protocol,
    parse_nmap_xml,
)


# ---------------------------------------------------------------------------
# Fixtures — minimal but realistic nmap XML snippets
# ---------------------------------------------------------------------------

MINIMAL_XML = """<?xml version="1.0"?>
<nmaprun scanner="nmap" args="nmap -sV -O 192.168.1.1"
         start="1700000000" version="7.94"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <scaninfo type="syn" protocol="tcp" numservices="1000"/>
  <host starttime="1700000001" endtime="1700000060">
    <status state="up" reason="echo-reply"/>
    <address addr="192.168.1.1" addrtype="ipv4"/>
    <address addr="AA:BB:CC:DD:EE:FF" addrtype="mac" vendor="Acme Corp"/>
    <hostnames>
      <hostname name="router.local" type="PTR"/>
    </hostnames>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open" reason="syn-ack"/>
        <service name="ssh" product="OpenSSH" version="8.9p1"
                 extrainfo="Ubuntu" tunnel="" proto=""/>
      </port>
      <port protocol="tcp" portid="80">
        <state state="open" reason="syn-ack"/>
        <service name="http" product="nginx" version="1.24.0"/>
        <script id="http-title" output="Login Page">
          <elem key="title">Login Page</elem>
        </script>
      </port>
      <port protocol="tcp" portid="8080">
        <state state="filtered" reason="no-response"/>
        <service name="http-proxy"/>
      </port>
      <port protocol="tcp" portid="23">
        <state state="open" reason="syn-ack"/>
        <service name="telnet"/>
      </port>
    </ports>
    <os>
      <osmatch name="Linux 5.4" accuracy="95">
        <osclass type="general purpose" vendor="Linux" osfamily="Linux" osgen="5.X"/>
        <cpe>cpe:/o:linux:linux_kernel:5</cpe>
      </osmatch>
    </os>
    <hostscript>
      <script id="smb-security-mode" output="account_used: guest"/>
    </hostscript>
  </host>
  <host>
    <status state="down" reason="no-response"/>
    <address addr="192.168.1.2" addrtype="ipv4"/>
    <ports/>
  </host>
  <runstats>
    <finished time="1700000120" elapsed="120"/>
  </runstats>
</nmaprun>"""


MULTI_HOST_XML = """<?xml version="1.0"?>
<nmaprun scanner="nmap" args="nmap -sV 10.0.0.0/24" start="1700001000" version="7.94">
  <scaninfo type="syn" protocol="tcp" numservices="1000"/>
  <host>
    <status state="up" reason="arp-response"/>
    <address addr="10.0.0.1" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="443">
        <state state="open" reason="syn-ack"/>
        <service name="https" product="Apache httpd" version="2.4.57" tunnel="ssl">
          <cpe>cpe:/a:apache:http_server:2.4.57</cpe>
        </service>
      </port>
      <port protocol="tcp" portid="3306">
        <state state="open" reason="syn-ack"/>
        <service name="mysql" product="MySQL" version="8.0.33"/>
      </port>
    </ports>
  </host>
  <host>
    <status state="up" reason="arp-response"/>
    <address addr="10.0.0.2" addrtype="ipv4"/>
    <address addr="10.0.0.2" addrtype="ipv6"/>
    <ports>
      <port protocol="udp" portid="53">
        <state state="open" reason="udp-response"/>
        <service name="domain" product="dnsmasq" version="2.89"/>
      </port>
    </ports>
  </host>
  <runstats>
    <finished time="1700001200" elapsed="200"/>
  </runstats>
</nmaprun>"""

EMPTY_SCAN_XML = """<?xml version="1.0"?>
<nmaprun scanner="nmap" args="nmap 10.99.99.0/24" start="1700002000" version="7.94">
  <scaninfo type="syn" protocol="tcp" numservices="1000"/>
  <runstats>
    <finished time="1700002010" elapsed="10"/>
  </runstats>
</nmaprun>"""


# ---------------------------------------------------------------------------
# Tests — parsing
# ---------------------------------------------------------------------------


class TestParseNmapXml:
    def test_returns_nmap_result(self):
        result = parse_nmap_xml(MINIMAL_XML)
        assert isinstance(result, NmapResult)

    def test_accepts_bytes(self):
        result = parse_nmap_xml(MINIMAL_XML.encode())
        assert len(result.hosts) == 2

    def test_invalid_root_tag_raises(self):
        with pytest.raises(ValueError, match="nmaprun"):
            parse_nmap_xml("<notanmap/>")

    def test_malformed_xml_raises(self):
        with pytest.raises(ET.ParseError):
            parse_nmap_xml("not xml at all <<<")

    def test_scan_info_args(self):
        result = parse_nmap_xml(MINIMAL_XML)
        assert "nmap" in result.scan_info.args
        assert result.scan_info.version == "7.94"

    def test_scan_info_timing(self):
        result = parse_nmap_xml(MINIMAL_XML)
        assert result.scan_info.scan_start is not None
        assert result.scan_info.scan_end is not None
        assert result.scan_info.scan_end > result.scan_info.scan_start

    def test_scan_info_services(self):
        result = parse_nmap_xml(MINIMAL_XML)
        assert result.scan_info.services_scanned == 1000
        assert "syn" in result.scan_info.scan_types

    def test_host_count(self):
        result = parse_nmap_xml(MINIMAL_XML)
        assert len(result.hosts) == 2

    def test_up_hosts_filters_down(self):
        result = parse_nmap_xml(MINIMAL_XML)
        assert len(result.up_hosts) == 1
        assert result.up_hosts[0].state == HostState.UP

    def test_empty_scan_no_hosts(self):
        result = parse_nmap_xml(EMPTY_SCAN_XML)
        assert result.hosts == []
        assert result.up_hosts == []
        assert result.total_open_ports == 0

    def test_summary_keys(self):
        result = parse_nmap_xml(MINIMAL_XML)
        s = result.summary()
        assert "total_hosts" in s
        assert "up_hosts" in s
        assert "total_open_ports" in s
        assert s["up_hosts"] == 1


class TestNmapHost:
    def setup_method(self):
        self.result = parse_nmap_xml(MINIMAL_XML)
        self.host = self.result.up_hosts[0]

    def test_ip_parsed(self):
        assert self.host.ip == "192.168.1.1"

    def test_mac_and_vendor(self):
        assert self.host.mac == "AA:BB:CC:DD:EE:FF"
        assert self.host.mac_vendor == "Acme Corp"

    def test_hostname(self):
        assert "router.local" in self.host.hostnames
        assert self.host.primary_hostname == "router.local"
        assert self.host.display_name == "router.local"

    def test_display_name_falls_back_to_ip(self):
        result = parse_nmap_xml(MULTI_HOST_XML)
        host = result.up_hosts[0]
        assert host.display_name == host.ip   # no hostname set

    def test_host_timing(self):
        assert self.host.start_time is not None
        assert self.host.end_time is not None

    def test_open_ports_count(self):
        # 22 open, 80 open, 23 open, 8080 filtered
        assert len(self.host.open_ports) == 3

    def test_total_open_ports(self):
        assert self.result.total_open_ports == 3


class TestNmapPort:
    def setup_method(self):
        result = parse_nmap_xml(MINIMAL_XML)
        host = result.up_hosts[0]
        self.ports = {p.port: p for p in host.ports}

    def test_port_states(self):
        assert self.ports[22].state == PortState.OPEN
        assert self.ports[8080].state == PortState.FILTERED

    def test_is_open(self):
        assert self.ports[22].is_open is True
        assert self.ports[8080].is_open is False

    def test_protocol(self):
        assert self.ports[22].protocol == Protocol.TCP

    def test_port_id(self):
        assert self.ports[22].port_id == "22/tcp"

    def test_state_reason(self):
        assert self.ports[22].state_reason == "syn-ack"


class TestNmapService:
    def setup_method(self):
        result = parse_nmap_xml(MINIMAL_XML)
        host = result.up_hosts[0]
        ports = {p.port: p for p in host.ports}
        self.ssh_svc = ports[22].service
        self.http_svc = ports[80].service

    def test_service_name(self):
        assert self.ssh_svc.name == "ssh"

    def test_service_banner(self):
        assert "OpenSSH" in self.ssh_svc.banner
        assert "8.9p1" in self.ssh_svc.banner

    def test_service_extra_info(self):
        assert self.ssh_svc.extra_info == "Ubuntu"

    def test_ssl_tunnel_full_name(self):
        result = parse_nmap_xml(MULTI_HOST_XML)
        host = result.up_hosts[0]
        https_port = next(p for p in host.ports if p.port == 443)
        assert https_port.service.tunnel == "ssl"
        assert https_port.service.full_name == "ssl/https"

    def test_service_cpe(self):
        result = parse_nmap_xml(MULTI_HOST_XML)
        host = result.up_hosts[0]
        https_port = next(p for p in host.ports if p.port == 443)
        assert any("apache" in c for c in https_port.service.cpe)


class TestNmapOSMatch:
    def setup_method(self):
        result = parse_nmap_xml(MINIMAL_XML)
        self.host = result.up_hosts[0]

    def test_os_match_parsed(self):
        assert len(self.host.os_matches) == 1

    def test_os_accuracy(self):
        assert self.host.os_matches[0].accuracy == 95

    def test_best_os_guess(self):
        best = self.host.best_os_guess
        assert best is not None
        assert "Linux" in best.name

    def test_os_cpe(self):
        assert any("linux" in c for c in self.host.os_matches[0].cpe)

    def test_os_families(self):
        assert "Linux" in self.host.os_matches[0].os_families

    def test_no_os_returns_none(self):
        result = parse_nmap_xml(MULTI_HOST_XML)
        assert result.up_hosts[0].best_os_guess is None


class TestNmapScript:
    def setup_method(self):
        result = parse_nmap_xml(MINIMAL_XML)
        host = result.up_hosts[0]
        ports = {p.port: p for p in host.ports}
        self.http_port = ports[80]
        self.host = host

    def test_port_script_parsed(self):
        assert len(self.http_port.scripts) == 1
        script = self.http_port.scripts[0]
        assert script.id == "http-title"
        assert "Login Page" in script.output

    def test_script_elements(self):
        script = self.http_port.scripts[0]
        assert script.elements.get("title") == "Login Page"

    def test_host_script_parsed(self):
        assert len(self.host.host_scripts) == 1
        assert self.host.host_scripts[0].id == "smb-security-mode"


class TestProtocolHandling:
    def test_udp_port_protocol(self):
        result = parse_nmap_xml(MULTI_HOST_XML)
        udp_host = result.up_hosts[1]
        dns_port = udp_host.ports[0]
        assert dns_port.protocol == Protocol.UDP
        assert dns_port.port == 53


# ---------------------------------------------------------------------------
# Tests — to_findings
# ---------------------------------------------------------------------------


class TestToFindings:
    def setup_method(self):
        self.result = parse_nmap_xml(MINIMAL_XML)
        self.findings = self.result.to_findings("proj-abc-123")

    def test_finding_count_matches_open_ports(self):
        # 3 open ports on 1 up host
        assert len(self.findings) == 3

    def test_finding_schema_keys(self):
        f = self.findings[0]
        for key in ("id", "project_id", "title", "description", "severity", "host", "ip", "port", "protocol", "service", "banner", "evidence", "cpe", "tags"):
            assert key in f, f"Missing key: {key}"

    def test_project_id_set(self):
        assert all(f["project_id"] == "proj-abc-123" for f in self.findings)

    def test_unique_ids(self):
        ids = [f["id"] for f in self.findings]
        assert len(set(ids)) == len(ids)

    def test_telnet_is_critical(self):
        telnet = next(f for f in self.findings if f["port"] == 23)
        assert telnet["severity"] == "critical"

    def test_ssh_is_medium(self):
        ssh = next(f for f in self.findings if f["port"] == 22)
        assert ssh["severity"] == "medium"

    def test_http_is_medium(self):
        http = next(f for f in self.findings if f["port"] == 80)
        assert http["severity"] == "medium"

    def test_evidence_includes_script_output(self):
        http = next(f for f in self.findings if f["port"] == 80)
        assert "http-title" in http["evidence"]
        assert "Login Page" in http["evidence"]

    def test_no_evidence_when_no_scripts(self):
        ssh = next(f for f in self.findings if f["port"] == 22)
        assert ssh["evidence"] == ""

    def test_ip_populated(self):
        assert all(f["ip"] == "192.168.1.1" for f in self.findings)

    def test_host_display_name(self):
        assert all(f["host"] == "router.local" for f in self.findings)

    def test_tags_contain_protocol(self):
        for f in self.findings:
            assert f["protocol"] in f["tags"]

    def test_down_hosts_excluded(self):
        # 192.168.1.2 is down — no findings from it
        ips = {f["ip"] for f in self.findings}
        assert "192.168.1.2" not in ips

    def test_mysql_is_high(self):
        result = parse_nmap_xml(MULTI_HOST_XML)
        findings = result.to_findings("proj-xyz")
        mysql = next(f for f in findings if f["port"] == 3306)
        assert mysql["severity"] == "high"

    def test_cpe_in_finding(self):
        result = parse_nmap_xml(MULTI_HOST_XML)
        findings = result.to_findings("proj-xyz")
        https = next(f for f in findings if f["port"] == 443)
        assert any("apache" in c for c in https["cpe"])


# ---------------------------------------------------------------------------
# Tests — edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_no_service_element(self):
        xml = """<nmaprun scanner="nmap" args="nmap x" version="7.94">
          <host>
            <status state="up" reason="echo-reply"/>
            <address addr="1.2.3.4" addrtype="ipv4"/>
            <ports>
              <port protocol="tcp" portid="9999">
                <state state="open" reason="syn-ack"/>
              </port>
            </ports>
          </host>
          <runstats><finished time="1700000200" elapsed="10"/></runstats>
        </nmaprun>"""
        result = parse_nmap_xml(xml)
        host = result.up_hosts[0]
        port = host.ports[0]
        assert port.service is None
        findings = result.to_findings("proj-1")
        assert findings[0]["service"] == "unknown"

    def test_unknown_state_handled(self):
        xml = """<nmaprun scanner="nmap" args="nmap x" version="7.94">
          <host>
            <status state="up" reason="echo-reply"/>
            <address addr="1.2.3.4" addrtype="ipv4"/>
            <ports>
              <port protocol="tcp" portid="12345">
                <state state="weirdstate" reason="unknown"/>
              </port>
            </ports>
          </host>
          <runstats><finished time="1700000200" elapsed="10"/></runstats>
        </nmaprun>"""
        result = parse_nmap_xml(xml)
        port = result.up_hosts[0].ports[0]
        assert port.state == PortState.FILTERED   # fallback

    def test_multiple_os_matches_best_selected(self):
        xml = """<nmaprun scanner="nmap" args="nmap -O x" version="7.94">
          <host>
            <status state="up" reason="echo-reply"/>
            <address addr="5.5.5.5" addrtype="ipv4"/>
            <ports/>
            <os>
              <osmatch name="Linux 4.x" accuracy="80"/>
              <osmatch name="Linux 5.x" accuracy="95"/>
              <osmatch name="Linux 3.x" accuracy="60"/>
            </os>
          </host>
          <runstats><finished time="1700000200" elapsed="10"/></runstats>
        </nmaprun>"""
        result = parse_nmap_xml(xml)
        best = result.up_hosts[0].best_os_guess
        assert best.accuracy == 95
        assert "5.x" in best.name
