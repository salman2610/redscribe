import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from enum import Enum

class SeverityEnum(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


def severity_from_nessus(risk_factor: str) -> str:
    """Map Nessus risk factor to severity"""
    risk_map = {
        'Critical': 'critical',
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low',
        'None': 'info',
        'Info': 'info',
    }
    return risk_map.get(risk_factor, 'info')


def parse_nessus(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Parse Nessus .nessus XML file and extract findings
    
    Returns list of finding dicts with:
    - title
    - severity
    - description
    - cvss_score
    - cvss_vector
    - cwe
    - cve
    - affected_hosts (list of IPs)
    - affected_ports (list of ports)
    - source_tool ('nessus')
    """
    findings = []
    
    try:
        root = ET.fromstring(file_content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid Nessus XML: {str(e)}")
    
    # Group findings by plugin_id to consolidate across hosts
    findings_map: Dict[str, Dict[str, Any]] = {}
    
    # Iterate through all ReportHost elements
    for report_host in root.findall('.//ReportHost'):
        host_ip = report_host.get('name', 'Unknown')
        
        # Iterate through all ReportItem (vulnerability) elements
        for report_item in report_host.findall('.//ReportItem'):
            plugin_id = report_item.get('pluginID', '')
            plugin_name = report_item.get('pluginName', 'Unknown Vulnerability')
            port = report_item.get('port', '0')
            protocol = report_item.get('protocol', 'tcp')
            severity = report_item.get('severity', '0')
            risk_factor = report_item.get('risk_factor', 'None')
            
            # Skip if severity is 0 (info only)
            if severity == '0':
                continue
            
            # Get description and solution
            description = ''
            solution = ''
            cvss_score = None
            cvss_vector = None
            cve = None
            cwe = None
            
            for child in report_item:
                tag = child.tag
                text = child.text or ''
                
                if tag == 'description':
                    description = text.strip()
                elif tag == 'solution':
                    solution = text.strip()
                elif tag == 'cvss_base_score':
                    try:
                        cvss_score = float(text)
                    except (ValueError, TypeError):
                        pass
                elif tag == 'cvss_vector':
                    cvss_vector = text.strip()
                elif tag == 'cve':
                    cve = text.strip()
                elif tag == 'cwe':
                    cwe = text.strip()
            
            # Create finding key based on plugin_id
            key = f"nessus_{plugin_id}"
            
            if key not in findings_map:
                findings_map[key] = {
                    'title': plugin_name,
                    'severity': severity_from_nessus(risk_factor),
                    'description': description,
                    'remediation': solution,
                    'cvss_score': cvss_score,
                    'cvss_vector': cvss_vector,
                    'cve': cve,
                    'cwe': cwe,
                    'affected_hosts': [],
                    'affected_ports': [],
                    'source_tool': 'nessus',
                    'plugin_id': plugin_id,
                }
            
            # Add affected host and port
            if host_ip and host_ip not in findings_map[key]['affected_hosts']:
                findings_map[key]['affected_hosts'].append(host_ip)
            
            if port != '0' and port not in findings_map[key]['affected_ports']:
                try:
                    findings_map[key]['affected_ports'].append(int(port))
                except ValueError:
                    pass
    
    # Convert to list
    findings = list(findings_map.values())
    
    return findings


def validate_nessus(file_content: bytes) -> bool:
    """Validate that file is a Nessus XML"""
    try:
        root = ET.fromstring(file_content)
        # Check for NessusClientData or Report root
        return root.tag in ['NessusClientData', 'Report']
    except:
        return False
