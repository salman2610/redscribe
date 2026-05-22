"""
tests/test_burp_parser.py
--------------------------
Unit tests for parsers/burp.py

Run with:
    pytest tests/test_burp_parser.py -v
"""

import base64
import pytest
import xml.etree.ElementTree as ET

from parsers.burp import (
    BurpConfidence,
    BurpIssue,
    BurpRequestResponse,
    BurpResult,
    BurpSeverity,
    parse_burp_xml,
    parse_burp_file,
    _strip_html,
    _extract_port,
    _infer_cwe_owasp,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _b64(s: str) -> str:
    return base64.b64encode(s.encode()).decode()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

REQ_RAW = "GET /admin HTTP/1.1\r\nHost: example.com\r\nCookie: session=abc\r\n\r\n"
RESP_RAW = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>Admin Panel</html>"

FULL_XML = f"""<?xml version="1.0"?>
<issues burpVersion="2023.10.3.4" exportTime="Thu May 21 10:00:00 UTC 2026">
  <issue>
    <serialNumber>1000001</serialNumber>
    <type>1049088</type>
    <name>SQL injection</name>
    <host ip="93.184.216.34">https://example.com</host>
    <path>/login</path>
    <location>/login [username parameter]</location>
    <severity>High</severity>
    <confidence>Certain</confidence>
    <issueBackground>&lt;p&gt;SQL injection arises when user-controllable data is incorporated into database SQL queries in an unsafe manner.&lt;/p&gt;</issueBackground>
    <remediationBackground>&lt;p&gt;Parameterised queries should be used.&lt;/p&gt;</remediationBackground>
    <issueDetail>&lt;p&gt;The &lt;b&gt;username&lt;/b&gt; parameter is vulnerable. Payload: &lt;b&gt;' OR 1=1--&lt;/b&gt;&lt;/p&gt;</issueDetail>
    <remediationDetail>&lt;p&gt;Sanitise the username input before passing it to the query.&lt;/p&gt;</remediationDetail>
    <requestresponses>
      <requestresponse>
        <url>https://example.com/login</url>
        <request base64="true">{_b64(REQ_RAW)}</request>
        <response base64="true">{_b64(RESP_RAW)}</response>
      </requestresponse>
    </requestresponses>
  </issue>
  <issue>
    <serialNumber>1000002</serialNumber>
    <type>2097929</type>
    <name>Reflected cross-site scripting</name>
    <host ip="93.184.216.34">https://example.com</host>
    <path>/search</path>
    <location>/search [q parameter]</location>
    <severity>Medium</severity>
    <confidence>Firm</confidence>
    <issueBackground>&lt;p&gt;Reflected XSS arises when data is copied from a request and echoed into the response in an unsafe way.&lt;/p&gt;</issueBackground>
    <remediationBackground>&lt;p&gt;Input should be validated and output should be HTML-encoded.&lt;/p&gt;</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses>
      <requestresponse>
        <url>https://example.com/search?q=&lt;script&gt;alert(1)&lt;/script&gt;</url>
        <request base64="true">{_b64("GET /search?q=<script>alert(1)</script> HTTP/1.1\r\nHost: example.com\r\n\r\n")}</request>
        <response base64="true">{_b64("HTTP/1.1 200 OK\r\n\r\n<html>Results for: <script>alert(1)</script></html>")}</response>
      </requestresponse>
    </requestresponses>
  </issue>
  <issue>
    <serialNumber>1000003</serialNumber>
    <type>16777728</type>
    <name>Strict transport security not enforced</name>
    <host ip="93.184.216.34">https://example.com</host>
    <path>/</path>
    <location>/</location>
    <severity>Low</severity>
    <confidence>Certain</confidence>
    <issueBackground>&lt;p&gt;The HSTS header was not observed.&lt;/p&gt;</issueBackground>
    <remediationBackground>&lt;p&gt;Add the Strict-Transport-Security header.&lt;/p&gt;</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses/>
  </issue>
  <issue>
    <serialNumber>1000004</serialNumber>
    <type>0</type>
    <name>Password field with autocomplete enabled</name>
    <host ip="93.184.216.34">https://example.com</host>
    <path>/register</path>
    <location>/register</location>
    <severity>Information</severity>
    <confidence>Certain</confidence>
    <issueBackground>&lt;p&gt;The browser may cache credentials.&lt;/p&gt;</issueBackground>
    <remediationBackground>&lt;p&gt;Use autocomplete="off" on sensitive fields.&lt;/p&gt;</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses/>
  </issue>
  <issue>
    <serialNumber>1000005</serialNumber>
    <type>2098052</type>
    <name>Server-side request forgery</name>
    <host ip="10.0.0.5">http://internal-app:8080</host>
    <path>/fetch</path>
    <location>/fetch [url parameter]</location>
    <severity>Critical</severity>
    <confidence>Firm</confidence>
    <issueBackground>&lt;p&gt;SSRF allows attackers to make server-side requests to internal resources.&lt;/p&gt;</issueBackground>
    <remediationBackground>&lt;p&gt;Validate and whitelist URLs before making requests.&lt;/p&gt;</remediationBackground>
    <issueDetail>&lt;p&gt;The url parameter accepts arbitrary URLs including internal addresses.&lt;/p&gt;</issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses/>
  </issue>
</issues>"""

BURP_EXPORT_ROOT_XML = f"""<?xml version="1.0"?>
<BurpSuiteExport version="1.0">
  <issue>
    <serialNumber>2000001</serialNumber>
    <type>2097929</type>
    <name>Reflected cross-site scripting</name>
    <host ip="1.2.3.4">https://other.com</host>
    <path>/page</path>
    <location>/page [x]</location>
    <severity>High</severity>
    <confidence>Certain</confidence>
    <issueBackground>&lt;p&gt;XSS background.&lt;/p&gt;</issueBackground>
    <remediationBackground>&lt;p&gt;Encode output.&lt;/p&gt;</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses/>
  </issue>
</BurpSuiteExport>"""

SINGLE_RR_XML = f"""<?xml version="1.0"?>
<issues>
  <issue>
    <serialNumber>3000001</serialNumber>
    <type>1049088</type>
    <name>SQL injection</name>
    <host ip="5.5.5.5">https://target.com</host>
    <path>/api/users</path>
    <location>/api/users [id]</location>
    <severity>High</severity>
    <confidence>Certain</confidence>
    <issueBackground>&lt;p&gt;SQLi background.&lt;/p&gt;</issueBackground>
    <remediationBackground>&lt;p&gt;Use parameterised queries.&lt;/p&gt;</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponse>
      <url>https://target.com/api/users?id=1</url>
      <request base64="true">{_b64("GET /api/users?id=1 HTTP/1.1\r\nHost: target.com\r\n\r\n")}</request>
      <response base64="true">{_b64("HTTP/1.1 500 Internal Server Error\r\n\r\nMySQL error: ...")}</response>
    </requestresponse>
  </issue>
</issues>"""

AMPERSAND_XML = """<?xml version="1.0"?>
<issues>
  <issue>
    <serialNumber>4000001</serialNumber>
    <type>0</type>
    <name>Test &amp; verify finding</name>
    <host ip="1.1.1.1">https://ampersand-test.com</host>
    <path>/search?q=foo&amp;bar=baz</path>
    <location>/search</location>
    <severity>Low</severity>
    <confidence>Tentative</confidence>
    <issueBackground>Test &amp; background</issueBackground>
    <remediationBackground>Fix it &amp; done</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses/>
  </issue>
</issues>"""

EMPTY_XML = """<?xml version="1.0"?>
<issues burpVersion="2023.10" exportTime="">
</issues>"""


# ---------------------------------------------------------------------------
# Tests — parsing
# ---------------------------------------------------------------------------

class TestParseBurpXml:
    def test_returns_burp_result(self):
        result = parse_burp_xml(FULL_XML)
        assert isinstance(result, BurpResult)

    def test_accepts_bytes(self):
        result = parse_burp_xml(FULL_XML.encode())
        assert len(result.issues) == 5

    def test_invalid_root_raises(self):
        with pytest.raises(ValueError, match="Burp Suite"):
            parse_burp_xml("<notburp/>")

    def test_malformed_xml_raises(self):
        with pytest.raises(ET.ParseError):
            parse_burp_xml("<<< not xml")

    def test_burp_export_root_accepted(self):
        result = parse_burp_xml(BURP_EXPORT_ROOT_XML)
        assert len(result.issues) == 1

    def test_empty_scan_no_issues(self):
        result = parse_burp_xml(EMPTY_XML)
        assert result.issues == []

    def test_ampersand_in_xml_handled(self):
        result = parse_burp_xml(AMPERSAND_XML)
        assert len(result.issues) == 1
        assert "&" in result.issues[0].name

    def test_issue_count(self):
        result = parse_burp_xml(FULL_XML)
        assert len(result.issues) == 5

    def test_summary_keys(self):
        result = parse_burp_xml(FULL_XML)
        s = result.summary()
        assert "total_issues" in s
        assert "severity_breakdown" in s
        assert "target_hosts" in s

    def test_summary_counts(self):
        result = parse_burp_xml(FULL_XML)
        s = result.summary()
        assert s["total_issues"] == 5
        assert s["severity_breakdown"]["critical"] == 1
        assert s["severity_breakdown"]["high"] == 1
        assert s["severity_breakdown"]["medium"] == 1
        assert s["severity_breakdown"]["low"] == 1
        assert s["severity_breakdown"]["info"] == 1


class TestScanInfo:
    def test_burp_version_parsed(self):
        result = parse_burp_xml(FULL_XML)
        assert result.scan_info.burp_version == "2023.10.3.4"

    def test_target_hosts_collected(self):
        result = parse_burp_xml(FULL_XML)
        assert "https://example.com" in result.scan_info.target_hosts
        assert "http://internal-app:8080" in result.scan_info.target_hosts

    def test_target_hosts_deduplicated(self):
        result = parse_burp_xml(FULL_XML)
        # example.com appears 4 times in the XML but only once in target_hosts
        count = result.scan_info.target_hosts.count("https://example.com")
        assert count == 1

    def test_primary_target_host(self):
        result = parse_burp_xml(FULL_XML)
        assert result.scan_info.target_host == "https://example.com"


class TestBurpSeverityFilters:
    def setup_method(self):
        self.result = parse_burp_xml(FULL_XML)

    def test_critical_issues(self):
        assert len(self.result.critical_issues) == 1
        assert self.result.critical_issues[0].name == "Server-side request forgery"

    def test_high_issues(self):
        assert len(self.result.high_issues) == 1
        assert "SQL injection" in self.result.high_issues[0].name

    def test_medium_issues(self):
        assert len(self.result.medium_issues) == 1
        assert "cross-site scripting" in self.result.medium_issues[0].name

    def test_low_issues(self):
        assert len(self.result.low_issues) == 1

    def test_info_issues(self):
        assert len(self.result.info_issues) == 1


class TestBurpIssue:
    def setup_method(self):
        result = parse_burp_xml(FULL_XML)
        self.sqli = result.issues[0]       # SQL injection, High
        self.xss = result.issues[1]        # XSS, Medium
        self.hsts = result.issues[2]       # HSTS, Low
        self.ssrf = result.issues[4]       # SSRF, Critical

    def test_serial_number(self):
        assert self.sqli.serial_number == "1000001"

    def test_issue_type(self):
        assert self.sqli.issue_type == 1049088

    def test_name(self):
        assert self.sqli.name == "SQL injection"

    def test_host(self):
        assert self.sqli.host == "https://example.com"

    def test_host_ip(self):
        assert self.sqli.host_ip == "93.184.216.34"

    def test_path(self):
        assert self.sqli.path == "/login"

    def test_full_url(self):
        assert "example.com" in self.sqli.full_url
        assert "/login" in self.sqli.full_url

    def test_severity_enum(self):
        assert self.sqli.severity == BurpSeverity.HIGH
        assert self.ssrf.severity == BurpSeverity.CRITICAL

    def test_confidence_enum(self):
        assert self.sqli.confidence == BurpConfidence.CERTAIN
        assert self.xss.confidence == BurpConfidence.FIRM

    def test_description_combines_background_and_detail(self):
        desc = self.sqli.description
        assert "SQL injection arises" in desc
        assert "username" in desc  # from issueDetail

    def test_description_only_background_when_no_detail(self):
        # HSTS issue has no issueDetail
        assert "HSTS" in self.hsts.description or "observed" in self.hsts.description

    def test_remediation_combines(self):
        rem = self.sqli.remediation
        assert "Parameterised" in rem
        assert "Sanitise" in rem

    def test_html_stripped_from_background(self):
        # No <p>, <b> etc. should survive
        assert "<p>" not in self.sqli.description
        assert "<b>" not in self.sqli.description

    def test_html_entities_decoded(self):
        # &lt; and &gt; should be decoded to < >
        assert "&lt;" not in self.sqli.description

    def test_cwe_inferred_from_type(self):
        assert self.sqli.cwe == "CWE-89"
        assert self.ssrf.cwe == "CWE-918"

    def test_owasp_inferred_from_type(self):
        assert self.sqli.owasp == "A03:2021"
        assert self.ssrf.owasp == "A10:2021"


class TestRequestResponse:
    def setup_method(self):
        result = parse_burp_xml(FULL_XML)
        self.sqli = result.issues[0]
        self.hsts = result.issues[2]   # no request/response

    def test_rr_count(self):
        assert len(self.sqli.request_responses) == 1

    def test_no_rr_when_empty(self):
        assert len(self.hsts.request_responses) == 0

    def test_request_decoded(self):
        rr = self.sqli.request_responses[0]
        assert b"GET /admin" in rr.request or b"GET" in rr.request

    def test_response_decoded(self):
        rr = self.sqli.request_responses[0]
        assert b"HTTP/1.1" in rr.response

    def test_url_captured(self):
        rr = self.sqli.request_responses[0]
        assert "example.com/login" in rr.url

    def test_request_str_property(self):
        rr = self.sqli.request_responses[0]
        assert "HTTP" in rr.request_str

    def test_response_str_property(self):
        rr = self.sqli.request_responses[0]
        assert "200" in rr.response_str

    def test_request_preview_truncates(self):
        rr = self.sqli.request_responses[0]
        assert len(rr.request_preview) <= 500

    def test_decoded_flag_true(self):
        rr = self.sqli.request_responses[0]
        assert rr.decoded is True

    def test_single_rr_without_wrapper(self):
        """Burp sometimes puts <requestresponse> directly under <issue>."""
        result = parse_burp_xml(SINGLE_RR_XML)
        issue = result.issues[0]
        assert len(issue.request_responses) == 1
        assert b"GET /api/users" in issue.request_responses[0].request

    def test_evidence_text_includes_request(self):
        assert "Request" in self.sqli.evidence_text
        assert "Response" in self.sqli.evidence_text

    def test_evidence_text_empty_when_no_rr(self):
        assert self.hsts.evidence_text == ""


# ---------------------------------------------------------------------------
# Tests — to_findings
# ---------------------------------------------------------------------------

class TestToFindings:
    def setup_method(self):
        self.result = parse_burp_xml(FULL_XML)
        self.findings = self.result.to_findings("proj-burp-001")

    def test_finding_count(self):
        assert len(self.findings) == 5

    def test_required_schema_keys(self):
        f = self.findings[0]
        required = [
            "id", "project_id", "title", "severity", "description",
            "remediation", "evidence", "host", "ip", "full_url", "path",
            "affected_hosts", "affected_ports", "confidence", "cwe",
            "owasp", "source_tool", "burp_issue_type", "burp_serial", "tags",
        ]
        for key in required:
            assert key in f, f"Missing key: {key}"

    def test_project_id_set(self):
        assert all(f["project_id"] == "proj-burp-001" for f in self.findings)

    def test_unique_ids(self):
        ids = [f["id"] for f in self.findings]
        assert len(set(ids)) == len(ids)

    def test_source_tool(self):
        assert all(f["source_tool"] == "burp" for f in self.findings)

    def test_sqli_severity(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert sqli["severity"] == "high"

    def test_ssrf_severity_critical(self):
        ssrf = next(f for f in self.findings if "forgery" in f["title"])
        assert ssrf["severity"] == "critical"

    def test_info_severity(self):
        info = next(f for f in self.findings if "autocomplete" in f["title"])
        assert info["severity"] == "info"

    def test_cwe_populated(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert sqli["cwe"] == "CWE-89"

    def test_owasp_populated(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert sqli["owasp"] == "A03:2021"

    def test_affected_hosts_includes_ip(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert "93.184.216.34" in sqli["affected_hosts"]
        assert "https://example.com" in sqli["affected_hosts"]

    def test_port_extracted_from_https_host(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert 443 in sqli["affected_ports"]

    def test_port_extracted_from_custom_port(self):
        ssrf = next(f for f in self.findings if "forgery" in f["title"])
        assert 8080 in ssrf["affected_ports"]

    def test_evidence_in_finding(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert "Request" in sqli["evidence"]

    def test_tags_contain_burp(self):
        assert all("burp" in f["tags"] for f in self.findings)

    def test_tags_contain_severity(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert "high" in sqli["tags"]

    def test_tags_contain_slug(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert any("sql" in t for t in sqli["tags"])

    def test_confidence_preserved(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert sqli["confidence"] == "Certain"

    def test_burp_serial_preserved(self):
        sqli = next(f for f in self.findings if "SQL" in f["title"])
        assert sqli["burp_serial"] == "1000001"


# ---------------------------------------------------------------------------
# Tests — helper functions
# ---------------------------------------------------------------------------

class TestStripHtml:
    def test_strips_basic_tags(self):
        assert _strip_html("<p>Hello</p>") == "Hello"

    def test_br_becomes_newline(self):
        result = _strip_html("Line one<br>Line two")
        assert "Line one\nLine two" == result

    def test_p_close_becomes_double_newline(self):
        result = _strip_html("<p>Para one</p><p>Para two</p>")
        assert "Para one" in result
        assert "Para two" in result

    def test_li_becomes_bullet(self):
        result = _strip_html("<ul><li>Item one</li><li>Item two</li></ul>")
        assert "• Item one" in result
        assert "• Item two" in result

    def test_entities_decoded(self):
        assert _strip_html("&lt;script&gt;") == "<script>"
        assert _strip_html("&amp;") == "&"
        assert _strip_html("&quot;") == '"'

    def test_empty_string(self):
        assert _strip_html("") == ""

    def test_no_html(self):
        assert _strip_html("plain text") == "plain text"

    def test_nested_tags(self):
        result = _strip_html("<p>The <b>username</b> parameter is vulnerable.</p>")
        assert "username" in result
        assert "<b>" not in result


class TestExtractPort:
    def test_https_default(self):
        assert _extract_port("https://example.com") == 443

    def test_http_default(self):
        assert _extract_port("http://example.com") == 80

    def test_custom_port(self):
        assert _extract_port("http://internal-app:8080") == 8080

    def test_https_custom_port(self):
        assert _extract_port("https://example.com:8443") == 8443

    def test_no_scheme_no_port(self):
        assert _extract_port("example.com") is None

    def test_ip_with_port(self):
        assert _extract_port("http://10.0.0.1:9090") == 9090


class TestInferCweOwasp:
    def test_known_type_code_sqli(self):
        cwe, owasp = _infer_cwe_owasp(1049088, "SQL injection")
        assert cwe == "CWE-89"
        assert owasp == "A03:2021"

    def test_known_type_code_xss(self):
        cwe, owasp = _infer_cwe_owasp(2097929, "Reflected XSS")
        assert cwe == "CWE-79"

    def test_unknown_type_falls_back_to_name(self):
        cwe, owasp = _infer_cwe_owasp(0, "SQL injection via parameter")
        assert cwe == "CWE-89"

    def test_xss_name_fallback(self):
        cwe, _ = _infer_cwe_owasp(9999999, "Cross-site scripting in search field")
        assert cwe == "CWE-79"

    def test_ssrf_name_fallback(self):
        cwe, owasp = _infer_cwe_owasp(9999999, "Server-side request forgery")
        assert cwe == "CWE-918"
        assert owasp == "A10:2021"

    def test_unknown_returns_empty(self):
        cwe, owasp = _infer_cwe_owasp(9999999, "Some completely unknown finding")
        assert cwe == ""
        assert owasp == ""

    def test_clickjacking_name(self):
        cwe, _ = _infer_cwe_owasp(0, "Clickjacking vulnerability detected")
        assert cwe == "CWE-1021"

    def test_outdated_software_name(self):
        cwe, owasp = _infer_cwe_owasp(0, "Outdated jQuery version")
        assert cwe == "CWE-1104"
        assert owasp == "A06:2021"


class TestBurpSeverityEnum:
    def test_normalise_case_insensitive(self):
        assert BurpSeverity.normalise("high") == BurpSeverity.HIGH
        assert BurpSeverity.normalise("HIGH") == BurpSeverity.HIGH
        assert BurpSeverity.normalise("High") == BurpSeverity.HIGH

    def test_normalise_unknown_falls_back(self):
        assert BurpSeverity.normalise("unknown_severity") == BurpSeverity.INFORMATION

    def test_to_ghostwrite_mapping(self):
        assert BurpSeverity.CRITICAL.to_ghostwrite() == "critical"
        assert BurpSeverity.HIGH.to_ghostwrite() == "high"
        assert BurpSeverity.MEDIUM.to_ghostwrite() == "medium"
        assert BurpSeverity.LOW.to_ghostwrite() == "low"
        assert BurpSeverity.INFORMATION.to_ghostwrite() == "info"


class TestBurpConfidenceEnum:
    def test_normalise(self):
        assert BurpConfidence.normalise("certain") == BurpConfidence.CERTAIN
        assert BurpConfidence.normalise("Firm") == BurpConfidence.FIRM
        assert BurpConfidence.normalise("TENTATIVE") == BurpConfidence.TENTATIVE

    def test_normalise_unknown_falls_back(self):
        assert BurpConfidence.normalise("???") == BurpConfidence.TENTATIVE


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_non_base64_request_handled(self):
        xml = """<?xml version="1.0"?>
<issues>
  <issue>
    <serialNumber>9000001</serialNumber>
    <type>0</type>
    <name>Plain text request test</name>
    <host ip="9.9.9.9">https://plain.com</host>
    <path>/test</path>
    <location>/test</location>
    <severity>Low</severity>
    <confidence>Tentative</confidence>
    <issueBackground>Background.</issueBackground>
    <remediationBackground>Remediation.</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses>
      <requestresponse>
        <url>https://plain.com/test</url>
        <request base64="false">GET /test HTTP/1.1\r\nHost: plain.com\r\n\r\n</request>
        <response base64="false">HTTP/1.1 200 OK\r\n\r\nOK</response>
      </requestresponse>
    </requestresponses>
  </issue>
</issues>"""
        result = parse_burp_xml(xml)
        assert len(result.issues) == 1
        rr = result.issues[0].request_responses[0]
        assert b"GET" in rr.request

    def test_missing_host_ip_attribute(self):
        xml = """<?xml version="1.0"?>
<issues>
  <issue>
    <serialNumber>9000002</serialNumber>
    <type>0</type>
    <name>No IP test</name>
    <host>https://noip.com</host>
    <path>/</path>
    <location>/</location>
    <severity>Info</severity>
    <confidence>Tentative</confidence>
    <issueBackground>BG.</issueBackground>
    <remediationBackground>Fix.</remediationBackground>
    <issueDetail></issueDetail>
    <remediationDetail></remediationDetail>
    <requestresponses/>
  </issue>
</issues>"""
        result = parse_burp_xml(xml)
        assert result.issues[0].host_ip == ""
        assert result.issues[0].host == "https://noip.com"

    def test_multiple_hosts_in_scan(self):
        result = parse_burp_xml(FULL_XML)
        # example.com and internal-app:8080
        assert len(result.scan_info.target_hosts) == 2

    def test_empty_issues_summary(self):
        result = parse_burp_xml(EMPTY_XML)
        s = result.summary()
        assert s["total_issues"] == 0
        assert all(v == 0 for v in s["severity_breakdown"].values())

    def test_file_not_found(self):
        with pytest.raises(FileNotFoundError):
            parse_burp_file("/nonexistent/path/scan.xml")
