'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { projects, findings } from '../../../lib/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

const SEV_BG: Record<string, string> = {
  critical: '#fef2f2',
  high: '#fff7ed',
  medium: '#fefce8',
  low: '#eff6ff',
  info: '#f9fafb',
};

export default function ReportPreview() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [findingsList, setFindingsList] = useState<any[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      if (findRes.data.length > 0) setSelectedFinding(findRes.data[0]);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setSelectedFinding((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedFinding) return;
    setSaving(true);
    try {
      await findings.update(selectedFinding.id, selectedFinding);
      loadData();
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    critical: findingsList.filter(f => f.severity === 'critical').length,
    high: findingsList.filter(f => f.severity === 'high').length,
    medium: findingsList.filter(f => f.severity === 'medium').length,
    low: findingsList.filter(f => f.severity === 'low').length,
  };

  const previewHtml = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: #fff; color: #111; font-size: 13px; line-height: 1.6; padding: 32px; }
      .cover { background: #080808; color: #fff; padding: 40px; border-radius: 8px; margin-bottom: 32px; }
      .cover-logo { font-size: 20px; font-weight: 700; margin-bottom: 24px; }
      .cover-logo span { color: #BB2649; }
      .cover-title { font-size: 36px; font-weight: 800; margin-bottom: 8px; }
      .cover-client { font-size: 14px; color: #666; margin-bottom: 24px; }
      .cover-stats { display: flex; gap: 32px; }
      .stat-num { font-size: 28px; font-weight: 700; }
      .stat-label { font-size: 9px; color: #555; letter-spacing: 2px; text-transform: uppercase; }
      .section { margin-bottom: 32px; }
      .section-title { font-size: 10px; color: #BB2649; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; font-weight: 600; }
      .risk-row { display: flex; gap: 8px; margin-bottom: 24px; }
      .risk-card { flex: 1; padding: 16px; border-radius: 6px; text-align: center; }
      .risk-num { font-size: 28px; font-weight: 700; }
      .risk-label { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
      .finding { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
      .finding-header { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: #fafafa; border-bottom: 1px solid #e5e7eb; }
      .finding-num { font-size: 10px; color: #999; padding-top: 2px; }
      .finding-title { font-size: 14px; font-weight: 600; color: #111; flex: 1; }
      .sev-badge { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; padding: 3px 10px; border-radius: 4px; font-weight: 600; }
      .finding-body { padding: 16px; }
      .field-label { font-size: 9px; color: #999; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; margin-top: 12px; }
      .field-text { font-size: 12px; color: #374151; line-height: 1.6; }
      .highlight { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; border-radius: 0 4px 4px 0; }
    </style>

    <div class="cover">
      <div class="cover-logo">Red<span>Scribe</span></div>
      <div class="cover-title">${project?.name || ''}</div>
      <div class="cover-client">${project?.client_name || ''}</div>
      <div class="cover-stats">
        <div><div class="stat-num" style="color:#fff">${findingsList.length}</div><div class="stat-label">Total</div></div>
        <div><div class="stat-num" style="color:#ef4444">${counts.critical}</div><div class="stat-label">Critical</div></div>
        <div><div class="stat-num" style="color:#f97316">${counts.high}</div><div class="stat-label">High</div></div>
        <div><div class="stat-num" style="color:#eab308">${counts.medium}</div><div class="stat-label">Medium</div></div>
        <div><div class="stat-num" style="color:#3b82f6">${counts.low}</div><div class="stat-label">Low</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">// risk overview</div>
      <div class="risk-row">
        <div class="risk-card" style="background:#fef2f2;border:1px solid #ef444440"><div class="risk-num" style="color:#ef4444">${counts.critical}</div><div class="risk-label" style="color:#ef4444">Critical</div></div>
        <div class="risk-card" style="background:#fff7ed;border:1px solid #f9731640"><div class="risk-num" style="color:#f97316">${counts.high}</div><div class="risk-label" style="color:#f97316">High</div></div>
        <div class="risk-card" style="background:#fefce8;border:1px solid #eab30840"><div class="risk-num" style="color:#eab308">${counts.medium}</div><div class="risk-label" style="color:#eab308">Medium</div></div>
        <div class="risk-card" style="background:#eff6ff;border:1px solid #3b82f640"><div class="risk-num" style="color:#3b82f6">${counts.low}</div><div class="risk-label" style="color:#3b82f6">Low</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">// findings</div>
      ${findingsList.map((f, i) => {
        const sev = f.severity || 'info';
        const color = SEV_COLOR[sev] || '#6b7280';
        const bg = SEV_BG[sev] || '#f9fafb';
        const isSelected = selectedFinding?.id === f.id;
        return `
        <div class="finding" style="${isSelected ? 'border-color:#CC0000;box-shadow:0 0 0 2px #CC000020;' : ''}">
          <div class="finding-header">
            <div class="finding-num">F${String(i+1).padStart(2,'0')}</div>
            <div class="finding-title">${f.title}</div>
            <div class="sev-badge" style="color:${color};background:${bg};border:1px solid ${color}40">${sev.toUpperCase()}</div>
          </div>
          <div class="finding-body">
            ${f.description ? `<div class="field-label">Description</div><div class="field-text">${f.description}</div>` : ''}
            ${f.business_impact ? `<div class="field-label">Business Impact</div><div class="field-text highlight">${f.business_impact}</div>` : ''}
            ${f.remediation ? `<div class="field-label">Remediation</div><div class="field-text">${f.remediation}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  if (loading) return <div style={{padding: '24px', color: '#fff', background: '#0d0d0d', minHeight: '100vh'}}>Loading...</div>;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0d0d0d; }
        .preview-layout { display: flex; height: 100vh; overflow: hidden; }
        .left-panel { width: 300px; min-width: 300px; background: #0a0a0a; border-right: 1px solid #1a1a1a; display: flex; flex-direction: column; overflow: hidden; }
        .left-header { padding: 16px; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between; }
        .left-title { font-size: 11px; color: #CC0000; letter-spacing: 3px; text-transform: uppercase; }
        .back-btn { background: none; border: 1px solid #1a1a1a; color: #666; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; }
        .findings-list { overflow-y: auto; flex: 1; }
        .finding-item { padding: 12px 16px; border-bottom: 1px solid #111; cursor: pointer; transition: background 0.15s; }
        .finding-item:hover { background: #111; }
        .finding-item.active { background: #130000; border-left: 3px solid #CC0000; }
        .finding-sev { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 4px; }
        .finding-name { font-size: 12px; color: #ccc; font-weight: 500; }
        .editor-panel { width: 380px; min-width: 380px; display: flex; flex-direction: column; overflow: hidden; background: #0d0d0d; border-right: 1px solid #1a1a1a; }
        .editor-header { padding: 16px; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between; }
        .editor-title { font-size: 13px; color: #fff; font-weight: 600; }
        .save-btn { background: #CC0000; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; }
        .editor-body { overflow-y: auto; flex: 1; padding: 20px; }
        .field-group { margin-bottom: 16px; }
        .field-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: block; }
        .field-input { width: 100%; background: #111; border: 1px solid #1e1e1e; color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 12px; font-family: monospace; resize: vertical; }
        .field-input:focus { outline: none; border-color: #CC0000; }
        .sev-select { background: #111; border: 1px solid #1e1e1e; color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%; }
        .right-panel { flex: 1; overflow-y: auto; background: #f5f5f5; }
        .no-finding { padding: 24px; color: #555; font-size: 13px; text-align: center; margin-top: 40px; }
      `}</style>

      <div className="preview-layout">
        <div className="left-panel">
          <div className="left-header">
            <div className="left-title">// findings ({findingsList.length})</div>
            <button className="back-btn" onClick={() => router.push(`/projects/${projectId}`)}>← Back</button>
          </div>
          <div className="findings-list">
            {findingsList.map(f => (
              <div key={f.id} className={`finding-item ${selectedFinding?.id === f.id ? 'active' : ''}`} onClick={() => setSelectedFinding(f)}>
                <div className="finding-sev" style={{background: `${SEV_COLOR[f.severity]}20`, color: SEV_COLOR[f.severity], border: `1px solid ${SEV_COLOR[f.severity]}40`}}>
                  {f.severity}
                </div>
                <div className="finding-name">{f.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-panel">
          <div className="editor-header">
            <div className="editor-title">{selectedFinding ? 'Edit Finding' : 'Select a finding'}</div>
            {selectedFinding && (
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save'}
              </button>
            )}
          </div>
          {selectedFinding ? (
            <div className="editor-body">
              <div className="field-group">
                <label className="field-label">Title</label>
                <input className="field-input" value={selectedFinding.title || ''} onChange={e => handleFieldChange('title', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Severity</label>
                <select className="sev-select" value={selectedFinding.severity || 'medium'} onChange={e => handleFieldChange('severity', e.target.value)}>
                  <option>critical</option>
                  <option>high</option>
                  <option>medium</option>
                  <option>low</option>
                  <option>info</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Description</label>
                <textarea className="field-input" rows={4} value={selectedFinding.description || ''} onChange={e => handleFieldChange('description', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Business Impact</label>
                <textarea className="field-input" rows={3} value={selectedFinding.business_impact || ''} onChange={e => handleFieldChange('business_impact', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Remediation</label>
                <textarea className="field-input" rows={3} value={selectedFinding.remediation || ''} onChange={e => handleFieldChange('remediation', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Attack Scenario</label>
                <textarea className="field-input" rows={3} value={selectedFinding.attack_scenario || ''} onChange={e => handleFieldChange('attack_scenario', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">CVSS Score</label>
                <input className="field-input" type="number" step="0.1" value={selectedFinding.cvss_score || ''} onChange={e => handleFieldChange('cvss_score', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">CWE</label>
                <input className="field-input" value={selectedFinding.cwe || ''} onChange={e => handleFieldChange('cwe', e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="no-finding">Select a finding from the left to edit</div>
          )}
        </div>

        <div className="right-panel">
          <div dangerouslySetInnerHTML={{__html: previewHtml}} />
        </div>
      </div>
    </>
  );
}
