'use client';
import { useState, useEffect } from 'react';
import { findings, evidence, ai } from '../app/lib/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

export default function FindingModal({ finding, onClose, onSave }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [improving, setImproving] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [formData, setFormData] = useState({
    title: finding.title || '',
    severity: finding.severity || 'info',
    description: finding.description || '',
    business_impact: finding.business_impact || '',
    remediation: finding.remediation || '',
    attack_scenario: finding.attack_scenario || '',
    cvss_score: finding.cvss_score || '',
    cvss_vector: finding.cvss_vector || '',
    cwe: finding.cwe || '',
    owasp: finding.owasp || '',
    cve: finding.cve || '',
    evidence: finding.evidence || '',
    affected_hosts: finding.affected_hosts || '',
    affected_ports: finding.affected_ports || '',
  });

  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    try {
      const res = await evidence.list(finding.id);
      setEvidenceList(res.data);
    } catch (err) {
      console.error('Failed to load evidence');
    }
  };

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await evidence.upload(finding.id, file, caption);
      setCaption('');
      loadEvidence();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (id: string) => {
    if (!confirm('Delete this evidence?')) return;
    try {
      await evidence.delete(id);
      loadEvidence();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAIImprove = async (field: string) => {
    const text = formData[field as keyof typeof formData] as string;
    if (!text) return alert("Field is empty!");
    setImproving(field);
    try {
      const res = await ai.improve(text, field);
      handleChange(field, res.data.improved);
    } catch {
      alert("AI improve failed");
    } finally {
      setImproving(null);
    }
  };

  const handleAIRewrite = async (field: string, tone: string) => {
    const text = formData[field as keyof typeof formData] as string;
    if (!text) return alert("Field is empty!");
    setImproving(field);
    try {
      const res = await ai.rewrite(text, tone);
      handleChange(field, res.data.rewritten);
    } catch {
      alert("AI rewrite failed");
    } finally {
      setImproving(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await findings.update(finding.id, formData);
      setIsEditing(false);
      onSave();
    } catch (err) {
      alert('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this finding?')) return;
    try {
      await findings.delete(finding.id);
      onClose();
      onSave();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const isImage = (filename: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(filename);

  return (
    <>
      <style>{`
        .fm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 24px; }
        .fm-modal { background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 12px; padding: 36px; width: 100%; max-width: 760px; max-height: 88vh; overflow-y: auto; }
        .fm-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .fm-title { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .fm-close { background: none; border: none; color: #444; font-size: 20px; cursor: pointer; }
        .fm-sev { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
        .fm-meta { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .fm-meta-item { font-size: 11px; color: #666; }
        .fm-meta-item span { color: #888; }
        .fm-section { margin-bottom: 20px; }
        .fm-section-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
        .fm-section-content { font-size: 13px; color: #ccc; line-height: 1.7; }
        .fm-evidence-box { background: #070707; border: 1px solid #1a1a1a; border-radius: 6px; padding: 12px; font-size: 12px; color: #888; font-family: monospace; white-space: pre-wrap; overflow-x: auto; }
        .fm-footer { display: flex; gap: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #1a1a1a; }
        .fm-btn { padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
        .fm-btn-edit { background: #1a1a1a; color: #ccc; border: 1px solid #333; }
        .fm-btn-save { background: #CC0000; color: #fff; }
        .fm-btn-delete { background: none; color: #666; border: 1px solid #1a1a1a; margin-left: auto; }
        .fm-btn-cancel { background: none; color: #666; border: 1px solid #1a1a1a; }
        .fm-input { width: 100%; background: #111; border: 1px solid #1e1e1e; color: #fff; padding: 10px 14px; border-radius: 6px; font-family: monospace; font-size: 13px; margin-top: 4px; box-sizing: border-box; }
        .fm-input:focus { outline: none; border-color: #CC0000; }
        .fm-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; display: block; }
        .fm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .fm-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .ev-upload { border: 1px dashed #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .ev-upload-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
        .ev-caption { flex: 1; background: #111; border: 1px solid #1e1e1e; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
        .ev-upload-btn { position: relative; background: #1a1a1a; color: #888; border: 1px solid #333; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; }
        .ev-upload-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .ev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 12px; }
        .ev-item { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; overflow: hidden; }
        .ev-img { width: 100%; height: 100px; object-fit: cover; display: block; }
        .ev-file { display: flex; align-items: center; justify-content: center; height: 100px; font-size: 32px; }
        .ev-caption-text { font-size: 10px; color: #666; padding: 6px 8px; }
        .ev-delete { width: 100%; background: none; border: none; border-top: 1px solid #1a1a1a; color: #ef4444; padding: 6px; font-size: 11px; cursor: pointer; }
        .divider { border: none; border-top: 1px solid #1a1a1a; margin: 24px 0; }
      `}</style>

      <div className="fm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="fm-modal">

          {!isEditing ? (
            <>
              <div className="fm-header">
                <div>
                  <div className="fm-sev" style={{ background: `${SEV_COLOR[finding.severity]}20`, color: SEV_COLOR[finding.severity], border: `1px solid ${SEV_COLOR[finding.severity]}` }}>
                    {finding.severity}
                  </div>
                  <div className="fm-title">{finding.title}</div>
                </div>
                <button className="fm-close" onClick={onClose}>✕</button>
              </div>

              <div className="fm-meta">
                {finding.cvss_score && <div className="fm-meta-item">CVSS <span>{finding.cvss_score}</span></div>}
                {finding.cwe && <div className="fm-meta-item">CWE <span>{finding.cwe}</span></div>}
                {finding.owasp && <div className="fm-meta-item">OWASP <span>{finding.owasp}</span></div>}
                {finding.cve && <div className="fm-meta-item">CVE <span style={{color: '#f97316'}}>{finding.cve}</span></div>}
              </div>

              {finding.cvss_vector && (
                <div className="fm-section">
                  <div className="fm-section-label">CVSS Vector</div>
                  <div className="fm-evidence-box" style={{padding: '8px'}}>{finding.cvss_vector}</div>
                </div>
              )}

              {(finding.affected_hosts?.length > 0 || finding.affected_ports?.length > 0) && (
                <div className="fm-section">
                  <div className="fm-section-label">Affected Assets</div>
                  <div className="fm-section-content">
                    {finding.affected_hosts && <div>Hosts: {Array.isArray(finding.affected_hosts) ? finding.affected_hosts.join(', ') : finding.affected_hosts}</div>}
                    {finding.affected_ports && <div>Ports: {Array.isArray(finding.affected_ports) ? finding.affected_ports.join(', ') : finding.affected_ports}</div>}
                  </div>
                </div>
              )}

              {finding.description && (
                <div className="fm-section">
                  <div className="fm-section-label">Description</div>
                  <div className="fm-section-content">{finding.description}</div>
                </div>
              )}

              {finding.business_impact && (
                <div className="fm-section">
                  <div className="fm-section-label" style={{color: '#f97316'}}>Business Impact</div>
                  <div className="fm-section-content">{finding.business_impact}</div>
                </div>
              )}

              {finding.attack_scenario && (
                <div className="fm-section">
                  <div className="fm-section-label" style={{color: '#ef4444'}}>Attack Scenario</div>
                  <div className="fm-section-content">{finding.attack_scenario}</div>
                </div>
              )}

              {finding.remediation && (
                <div className="fm-section">
                  <div className="fm-section-label" style={{color: '#22c55e'}}>Remediation</div>
                  <div className="fm-section-content">{finding.remediation}</div>
                </div>
              )}

              {finding.evidence && (
                <div className="fm-section">
                  <div className="fm-section-label" style={{color: '#3b82f6'}}>Raw Evidence</div>
                  <div className="fm-evidence-box">{finding.evidence}</div>
                </div>
              )}

              <hr className="divider" />

              {/* Evidence Files */}
              <div className="fm-section">
                <div className="fm-section-label">📎 Evidence Files</div>
                <div className="ev-upload">
                  <div style={{fontSize: '11px', color: '#666'}}>Upload screenshots, PoC files, HTTP requests...</div>
                  <div className="ev-upload-row">
                    <input className="ev-caption" placeholder="Caption (optional)" value={caption} onChange={e => setCaption(e.target.value)} />
                    <label className="ev-upload-btn">
                      {uploading ? '⏳ Uploading...' : '📁 Choose File'}
                      <input type="file" onChange={handleUpload} disabled={uploading} accept="image/*,.txt,.pdf,.xml,.json,.py,.js,.sh,.md" />
                    </label>
                  </div>
                </div>

                {evidenceList.length > 0 && (
                  <div className="ev-grid">
                    {evidenceList.map((ev: any) => (
                      <div key={ev.id} className="ev-item">
                        {isImage(ev.file_name) ? (
                          <img src={evidence.fileUrl(ev.file_path)} alt={ev.caption || ev.file_name} className="ev-img" />
                        ) : (
                          <div className="ev-file">
                            {ev.file_name.endsWith('.pdf') ? '📄' : ev.file_name.endsWith('.txt') ? '📝' : ev.file_name.endsWith('.xml') ? '📋' : '📁'}
                          </div>
                        )}
                        <div className="ev-caption-text">{ev.caption || ev.file_name}</div>
                        <button className="ev-delete" onClick={() => handleDeleteEvidence(ev.id)}>🗑️ Delete</button>
                      </div>
                    ))}
                  </div>
                )}

                {evidenceList.length === 0 && (
                  <div style={{fontSize: '12px', color: '#444', marginTop: '8px'}}>No evidence files uploaded yet.</div>
                )}
              </div>

              <div className="fm-footer">
                <button className="fm-btn fm-btn-edit" onClick={() => setIsEditing(true)}>✏️ Edit</button>
                <button className="fm-btn fm-btn-delete" onClick={handleDelete}>🗑️ Delete Finding</button>
              </div>
            </>
          ) : (
            <>
              <div className="fm-header">
                <div style={{fontSize: '16px', fontWeight: 700, color: '#fff'}}>Edit Finding</div>
                <button className="fm-close" onClick={() => setIsEditing(false)}>✕</button>
              </div>

              <label className="fm-label">Title</label>
              <input className="fm-input" value={formData.title} onChange={e => handleChange('title', e.target.value)} />

              <div className="fm-grid" style={{marginTop: '16px'}}>
                <div>
                  <label className="fm-label">Severity</label>
                  <select className="fm-input" value={formData.severity} onChange={e => handleChange('severity', e.target.value)} style={{background: '#111', cursor: 'pointer'}}>
                    <option>critical</option>
                    <option>high</option>
                    <option>medium</option>
                    <option>low</option>
                    <option>info</option>
                  </select>
                </div>
                <div>
                  <label className="fm-label">CVE ID</label>
                  <input className="fm-input" value={formData.cve} onChange={e => handleChange('cve', e.target.value)} placeholder="CVE-2024-1234" />
                </div>
              </div>

              <div className="fm-grid3" style={{marginTop: '4px'}}>
                <div>
                  <label className="fm-label">CVSS Score</label>
                  <input className="fm-input" type="number" step="0.1" value={formData.cvss_score} onChange={e => handleChange('cvss_score', e.target.value)} />
                </div>
                <div>
                  <label className="fm-label">CWE</label>
                  <input className="fm-input" value={formData.cwe} onChange={e => handleChange('cwe', e.target.value)} />
                </div>
                <div>
                  <label className="fm-label">OWASP</label>
                  <input className="fm-input" value={formData.owasp} onChange={e => handleChange('owasp', e.target.value)} />
                </div>
              </div>

              <label className="fm-label">CVSS Vector</label>
              <input className="fm-input" value={formData.cvss_vector} onChange={e => handleChange('cvss_vector', e.target.value)} />

              <label className="fm-label">Affected Hosts</label>
              <input className="fm-input" value={formData.affected_hosts} onChange={e => handleChange('affected_hosts', e.target.value)} placeholder="192.168.1.1, app.example.com" />

              <label className="fm-label">Affected Ports</label>
              <input className="fm-input" value={formData.affected_ports} onChange={e => handleChange('affected_ports', e.target.value)} placeholder="80, 443, 8080" />

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"16px"}}><label className="fm-label" style={{marginTop:0}}>Description</label><div style={{display:"flex",gap:"4px"}}>{["technical","executive","compliance","concise"].map(tone => (<button key={tone} type="button" onClick={() => handleAIRewrite("description", tone)} disabled={improving==="description"} style={{fontSize:"9px",padding:"2px 6px",background:"rgba(123,47,190,0.1)",color:"#a855f7",border:"1px solid rgba(123,47,190,0.2)",borderRadius:"3px",cursor:"pointer"}}>{improving==="description" ? "..." : tone}</button>))}</div></div>
              <textarea className="fm-input" rows={4} value={formData.description} onChange={e => handleChange('description', e.target.value)} style={{resize: 'vertical'}} />

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"16px"}}><label className="fm-label" style={{marginTop:0}}>Business Impact</label><div style={{display:"flex",gap:"4px"}}>{["technical","executive","compliance","concise"].map(tone => (<button key={tone} type="button" onClick={() => handleAIRewrite("business_impact", tone)} disabled={improving==="business_impact"} style={{fontSize:"9px",padding:"2px 6px",background:"rgba(123,47,190,0.1)",color:"#a855f7",border:"1px solid rgba(123,47,190,0.2)",borderRadius:"3px",cursor:"pointer"}}>{improving==="business_impact" ? "..." : tone}</button>))}</div></div>
              <textarea className="fm-input" rows={3} value={formData.business_impact} onChange={e => handleChange('business_impact', e.target.value)} style={{resize: 'vertical'}} />

              <label className="fm-label">Attack Scenario</label>
              <textarea className="fm-input" rows={3} value={formData.attack_scenario} onChange={e => handleChange('attack_scenario', e.target.value)} style={{resize: 'vertical'}} />

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"16px"}}><label className="fm-label" style={{marginTop:0}}>Remediation</label><div style={{display:"flex",gap:"4px"}}>{["technical","executive","compliance","concise"].map(tone => (<button key={tone} type="button" onClick={() => handleAIRewrite("remediation", tone)} disabled={improving==="remediation"} style={{fontSize:"9px",padding:"2px 6px",background:"rgba(123,47,190,0.1)",color:"#a855f7",border:"1px solid rgba(123,47,190,0.2)",borderRadius:"3px",cursor:"pointer"}}>{improving==="remediation" ? "..." : tone}</button>))}</div></div>
              <textarea className="fm-input" rows={3} value={formData.remediation} onChange={e => handleChange('remediation', e.target.value)} style={{resize: 'vertical'}} />

              <label className="fm-label">Raw Evidence</label>
              <textarea className="fm-input" rows={4} value={formData.evidence} onChange={e => handleChange('evidence', e.target.value)} placeholder="Raw output, logs, HTTP responses, PoC..." style={{resize: 'vertical', fontFamily: 'monospace'}} />

              <div className="fm-footer">
                <button className="fm-btn fm-btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="fm-btn fm-btn-save" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
