'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { projects, findings, uploads, ai } from '../../lib/api';
import FindingModal from '../../../components/FindingModal';
import EngagementMetadata from '../../../components/EngagementMetadata';
import TemplateGallery from '../../../components/TemplateGallery';
import AssetManager from '../../../components/AssetManager';
import AttackChainBuilder from '../../../components/AttackChainBuilder';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};


function SortableFinding({ finding, onClick }: { finding: any, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: finding.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, cursor: 'grab' };
  const SEV_COLOR: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280' };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="finding-card"
      onClick={onClick}>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span style={{color: '#333', fontSize: '14px', cursor: 'grab'}}>⠿</span>
        <div>
          <div className="finding-severity" style={{background: `${SEV_COLOR[finding.severity]}20`, color: SEV_COLOR[finding.severity], border: `1px solid ${SEV_COLOR[finding.severity]}`}}>
            {finding.severity}
          </div>
          <div className="finding-title">{finding.title}</div>
          <div className="finding-meta">
            {finding.cwe && <span>{finding.cwe}</span>}
            {finding.cvss_score && <span>CVSS {finding.cvss_score}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [findingsList, setFindingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [showNewFinding, setShowNewFinding] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));
  const [newFinding, setNewFinding] = useState({
    title: '',
    severity: 'medium',
    cvss_score: null,
    cvss_vector: '',
    cwe: '',
    owasp: '',
    cve: '',
    description: '',
    business_impact: '',
    remediation: '',
    attack_scenario: '',
    affected_hosts: '',
    affected_ports: '',
    evidence: '',
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projRes, findRes] = await Promise.all([
        projects.get(projectId),
        findings.list(projectId),
      ]);
      setProject(projRes.data);
      setFindingsList(findRes.data);
    } catch (err) {
      console.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: any, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (type === 'nmap') await uploads.nmap(projectId, file);
      else if (type === 'burp') await uploads.burp(projectId, file);
      else if (type === 'nessus') await uploads.nessus(projectId, file);
      loadData();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleEnrichAll = async () => {
    setEnrichingAll(true);
    try {
      await ai.enrichAll(projectId);
      loadData();
    } finally {
      setEnrichingAll(false);
    }
  };

  const handleSummary = async () => {
    setLoadingSummary(true);
    try {
      await ai.executiveSummary(projectId);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSaveFinding = async (e: any) => {
    e.preventDefault();
    try {
      await findings.create(projectId, newFinding);
      setShowNewFinding(false);
      setNewFinding({
        title: '',
        severity: 'medium',
        cvss_score: null,
        cvss_vector: '',
        cwe: '',
        owasp: '',
        cve: '',
        description: '',
        business_impact: '',
        remediation: '',
        attack_scenario: '',
        affected_hosts: '',
        affected_ports: '',
        evidence: '',
      });
      loadData();
    } catch (err) {
      alert('Failed to save finding');
    }
  };

  const handleSelectTemplate = (template: any) => {
    setShowTemplateGallery(false);
    setNewFinding({
      ...newFinding,
      title: template.title,
      severity: template.severity,
      cvss_score: template.cvss_score,
      cvss_vector: template.cvss_vector,
      cwe: template.cwe,
      owasp: template.owasp,
      description: template.description,
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://192.168.1.24:8000/reports/pdf/${projectId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report.pdf`;
      a.click();
    } catch (err) {
      alert("PDF generation failed");
    }
  };

  const handleDownloadDocx = async () => {
    window.location.href = `http://192.168.1.24:8000/reports/docx/${projectId}`;
  };

  if (loading) return <div style={{ padding: '24px', color: '#fff' }}>Loading...</div>;
  if (!project) return <div style={{ padding: '24px', color: '#fff' }}>Project not found</div>;

  return (
    <>
      <style>{`
        body { background: #0d0d0d; color: #fff; font-family: 'JetBrains Mono', monospace; }
        .container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; gap: 24px; flex-wrap: wrap; }
        .project-info h1 { font-size: 40px; font-weight: 800; margin: 0; color: #fff; }
        .project-client { font-size: 13px; color: #666; margin-top: 8px; }
        .project-scope { font-size: 11px; color: #2a2a2a; margin-top: 4px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
        .action-btn { font-size: 11px; padding: 10px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid #1a1a1a; background: none; color: #444; }
        .action-btn:hover { border-color: #333; color: #888; }
        .btn-red { background: #CC0000; border: none; color: #fff; }
        .btn-red:hover { background: #aa0000; }
        .btn-upload { position: relative; overflow: hidden; }
        .btn-upload input { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
        .btn-ai { background: rgba(123,47,190,0.1); color: #a855f7; border: 1px solid rgba(123,47,190,0.2); }
        .btn-ai:hover { background: rgba(123,47,190,0.2); }
        .btn-summary { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; padding: 20px; }
        .stat-number { font-size: 28px; font-weight: 700; color: #fff; }
        .stat-label { font-size: 10px; color: #666; text-transform: uppercase; margin-top: 8px; }
        .findings-section { margin-top: 32px; }
        .findings-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #fff; }
        .finding-card { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
        .finding-card:hover { border-color: #333; background: #111; }
        .finding-severity { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; margin-bottom: 8px; }
        .finding-title { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .finding-meta { font-size: 10px; color: #666; display: flex; gap: 16px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
        .modal { background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 12px; padding: 36px; width: 100%; max-width: 680px; max-height: 85vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .modal-title { font-size: 22px; font-weight: 700; color: #fff; }
        .modal-close { background: none; border: none; color: #444; font-size: 20px; cursor: pointer; }
        .form-field { margin-bottom: 20px; }
        .form-label { display: block; font-size: 10px; color: #555; text-transform: uppercase; margin-bottom: 8px; font-weight: 500; }
        .form-input { width: 100%; background: #111; border: 1px solid #1e1e1e; color: #fff; padding: 14px 16px; border-radius: 8px; font-family: monospace; font-size: 14px; }
        .form-input:focus { outline: none; border-color: #CC0000; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .submit-btn { width: 100%; background: #CC0000; color: #fff; border: none; padding: 15px; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; }
        .submit-btn:hover { background: #aa0000; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cancel-btn { background: none; border: 1px solid #1a1a1a; color: #666; padding: 12px; border-radius: 8px; cursor: pointer; margin-right: 12px; }
        .template-btn { background: rgba(123,47,190,0.1); color: #a855f7; border: 1px solid rgba(123,47,190,0.2); padding: 8px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; margin-top: 16px; }
      `}</style>

      <div style={{borderBottom: '1px solid #1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#fff'}} onClick={() => router.push('/dashboard')}>
          <img src="/logo.png" style={{height: '60px', width: 'auto'}} />
          <span style={{fontSize: '10px', color: '#666', marginLeft: '4px'}}>AI PENTEST REPORTING</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
          <span style={{fontSize: '12px', color: '#888'}}>salman@ghostwrite.com</span>
          <button onClick={() => {localStorage.clear(); router.push('/login');}} style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px'}}>Sign out</button>
        </div>
      </div>

      <div className="container">
        <div className="header">
          <div className="project-info">
            <h1>{project.name}</h1>
            <p className="project-client">{project.client_name}</p>
            {project.scope && <p className="project-scope">{project.scope}</p>}
          </div>
          <div className="actions">
            <label className="action-btn btn-upload">
              {uploading ? '⏳' : '📁'} Nmap XML
              <input type="file" accept=".xml" onChange={e => handleUpload(e, 'nmap')} disabled={uploading} />
            </label>
            <label className="action-btn btn-upload">
              {uploading ? '⏳' : '📁'} Burp XML
              <input type="file" accept=".xml" onChange={e => handleUpload(e, 'burp')} disabled={uploading} />
            </label>
            <label className="action-btn btn-upload">
              {uploading ? '⏳' : '📁'} Nessus
              <input type="file" accept=".nessus" onChange={e => handleUpload(e, 'nessus')} disabled={uploading} />
            </label>
            <button className="action-btn btn-ai" onClick={handleEnrichAll} disabled={enrichingAll}>
              {enrichingAll ? '⏳' : '🤖'} AI Enrich All
            </button>
            <button className="action-btn btn-summary" onClick={handleSummary} disabled={loadingSummary}>
              {loadingSummary ? '⏳' : '📝'} Exec Summary
            </button>
            <button className="action-btn btn-red" onClick={handleDownloadPDF}>
              📄 Export PDF
            </button>
            <button className="action-btn btn-red" onClick={handleDownloadDocx}>
              📝 Export DOCX
            </button>
            <button className="action-btn btn-red" onClick={() => setShowNewFinding(true)}>
              + New Finding
            </button>
            <button className="action-btn" onClick={() => router.push(`/projects/${projectId}/preview`)} style={{background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)"}}>
              👁 Preview Report
            </button>
          </div>
        </div>

        <EngagementMetadata project={project} onSave={loadData} />

        <div className="stats">
          <div className="stat-card">
            <div className="stat-number">{findingsList.length}</div>
            <div className="stat-label">Total Findings</div>
          </div>
          {['critical', 'high', 'medium', 'low'].map(sev => (
            <div key={sev} className="stat-card">
              <div className="stat-number" style={{color: SEV_COLOR[sev]}}>
                {findingsList.filter(f => f.severity === sev).length}
              </div>
              <div className="stat-label">{sev}</div>
            </div>
          ))}
        </div>

        {/* Severity Heatmap */}
        {findingsList.length > 0 && (
        <div style={{background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '24px', marginBottom: '32px'}}>
          <div style={{fontSize: '10px', color: '#CC0000', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '20px'}}>// risk overview</div>
          <div style={{display: 'flex', gap: '24px', alignItems: 'flex-end', height: '100px', marginBottom: '16px', borderBottom: '1px solid #1a1a1a', paddingBottom: '8px'}}>
            {['critical','high','medium','low'].map(sev => {
              const count = findingsList.filter(f => f.severity === sev).length;
              const maxCount = Math.max(...['critical','high','medium','low'].map(s => findingsList.filter(f => f.severity === s).length), 1);
              const barH = Math.max((count / maxCount) * 80, count > 0 ? 8 : 2);
              return (
                <div key={sev} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flex: 1, height: '100%'}}>
                  <div style={{fontSize: '11px', color: SEV_COLOR[sev], fontWeight: '700'}}>{count}</div>
                  <div style={{width: '40px', height: barH + 'px', background: SEV_COLOR[sev], borderRadius: '4px 4px 0 0', opacity: 0.85}}></div>
                  <div style={{fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px'}}>{sev}</div>
                </div>
              );
            })}
            <div style={{width: '1px', background: '#1a1a1a', alignSelf: 'stretch'}}></div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', flex: 1}}>
              <div style={{fontSize: '28px', fontWeight: '800', color: '#fff'}}>{Math.round((findingsList.filter(f=>f.severity==='critical').length*10+findingsList.filter(f=>f.severity==='high').length*7+findingsList.filter(f=>f.severity==='medium').length*4+findingsList.filter(f=>f.severity==='low').length*1)/Math.max(findingsList.length,1)*10)/10}</div>
              <div style={{fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px'}}>risk score</div>
            </div>
          </div>
        </div>
        )}


        <div className="findings-section">
          <div className="findings-title">Findings ({findingsList.length})</div>
          {findingsList.length === 0 ? (
            <p style={{color: '#666'}}>No findings yet. Upload a scan file or create one manually.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={async (event: any) => {
              const {active, over} = event;
              if (active.id !== over?.id) {
                const oldIndex = findingsList.findIndex(f => f.id === active.id);
                const newIndex = findingsList.findIndex(f => f.id === over.id);
                const newOrder = arrayMove(findingsList, oldIndex, newIndex);
                setFindingsList(newOrder);
                await findings.reorder(projectId, newOrder.map(f => f.id));
              }
            }}>
              <SortableContext items={findingsList.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {findingsList.map(finding => (
                  <SortableFinding key={finding.id} finding={finding} onClick={() => setSelectedFinding(finding)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {showNewFinding && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div style={{fontSize: '10px', color: '#CC0000', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px'}}>// manual finding</div>
                <div className="modal-title">Add Finding</div>
                <button type="button" className="template-btn" onClick={() => setShowTemplateGallery(true)}>
                  📋 Use Template
                </button>
              </div>
              <button className="modal-close" onClick={() => setShowNewFinding(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveFinding}>

              {/* Title + Severity */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px'}}>
                <div className="form-field">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={newFinding.title} onChange={e => setNewFinding({...newFinding, title: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label className="form-label">Severity *</label>
                  <select className="form-input" value={newFinding.severity} onChange={e => setNewFinding({...newFinding, severity: e.target.value})} style={{background: '#111', border: '1px solid #1e1e1e', color: '#fff', cursor: 'pointer'}}>
                    <option>critical</option>
                    <option>high</option>
                    <option>medium</option>
                    <option>low</option>
                  </select>
                </div>
              </div>

              {/* CVSS Score + CWE + OWASP */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px'}}>
                <div className="form-field">
                  <label className="form-label">CVSS Score</label>
                  <input className="form-input" type="number" step="0.1" value={newFinding.cvss_score || ''} onChange={e => setNewFinding({...newFinding, cvss_score: e.target.value ? parseFloat(e.target.value) : null as any})} />
                </div>
                <div className="form-field">
                  <label className="form-label">CWE</label>
                  <input className="form-input" value={newFinding.cwe} onChange={e => setNewFinding({...newFinding, cwe: e.target.value})} />
                </div>
                <div className="form-field">
                  <label className="form-label">OWASP</label>
                  <input className="form-input" value={newFinding.owasp} onChange={e => setNewFinding({...newFinding, owasp: e.target.value})} />
                </div>
              </div>

              {/* CVE + CVSS Vector */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div className="form-field">
                  <label className="form-label">CVE ID</label>
                  <input className="form-input" value={newFinding.cve} onChange={e => setNewFinding({...newFinding, cve: e.target.value})} placeholder="CVE-2024-1234" />
                </div>
                <div className="form-field">
                  <label className="form-label">CVSS Vector</label>
                  <input className="form-input" value={newFinding.cvss_vector} onChange={e => setNewFinding({...newFinding, cvss_vector: e.target.value})} />
                </div>
              </div>

              {/* Affected Hosts + Affected Ports */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div className="form-field">
                  <label className="form-label">Affected Hosts/IPs</label>
                  <input className="form-input" value={newFinding.affected_hosts} onChange={e => setNewFinding({...newFinding, affected_hosts: e.target.value})} placeholder="192.168.1.1, app.example.com" />
                </div>
                <div className="form-field">
                  <label className="form-label">Affected Ports</label>
                  <input className="form-input" value={newFinding.affected_ports} onChange={e => setNewFinding({...newFinding, affected_ports: e.target.value})} placeholder="80, 443, 8080" />
                </div>
              </div>

              {/* Description */}
              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={4} value={newFinding.description} onChange={e => setNewFinding({...newFinding, description: e.target.value})} style={{minHeight: '80px', resize: 'vertical'}} />
              </div>

              {/* Evidence */}
              <div className="form-field">
                <label className="form-label">Evidence / Raw Data</label>
                <textarea className="form-input" rows={4} value={newFinding.evidence} onChange={e => setNewFinding({...newFinding, evidence: e.target.value})} placeholder="Raw output, logs, HTTP responses..." style={{minHeight: '80px', resize: 'vertical'}} />
              </div>

              {/* Business Impact */}
              <div className="form-field">
                <label className="form-label">Business Impact</label>
                <textarea className="form-input" rows={3} value={newFinding.business_impact} onChange={e => setNewFinding({...newFinding, business_impact: e.target.value})} style={{minHeight: '60px', resize: 'vertical'}} />
              </div>

              {/* Remediation */}
              <div className="form-field">
                <label className="form-label">Remediation</label>
                <textarea className="form-input" rows={3} value={newFinding.remediation} onChange={e => setNewFinding({...newFinding, remediation: e.target.value})} style={{minHeight: '60px', resize: 'vertical'}} />
              </div>

              {/* Attack Scenario */}
              <div className="form-field">
                <label className="form-label">Attack Scenario</label>
                <textarea className="form-input" rows={3} value={newFinding.attack_scenario} onChange={e => setNewFinding({...newFinding, attack_scenario: e.target.value})} style={{minHeight: '60px', resize: 'vertical'}} />
              </div>

              <div>
                <button type="button" className="cancel-btn" onClick={() => setShowNewFinding(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save Finding →</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedFinding && <FindingModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} onSave={loadData} />}
      {showTemplateGallery && <TemplateGallery onSelect={handleSelectTemplate} onClose={() => setShowTemplateGallery(false)} />}
    </>
  );
}
