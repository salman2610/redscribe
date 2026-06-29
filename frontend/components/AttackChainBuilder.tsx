'use client';
import { useState, useEffect } from 'react';
import { attackChains } from '../app/lib/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

export default function AttackChainBuilder({ projectId, findings }: { projectId: string, findings: any[] }) {
  const [chains, setChains] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editingChain, setEditingChain] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => { loadChains(); }, [projectId]);

  const loadChains = async () => {
    try {
      const res = await attackChains.list(projectId);
      setChains(res.data);
    } catch {}
  };

  const handleCreate = async () => {
    if (!newTitle) return;
    try {
      const res = await attackChains.create(projectId, { title: newTitle, description: newDesc, steps: [] });
      setChains([...chains, res.data]);
      setEditingChain(res.data);
      setShowNew(false);
      setNewTitle('');
      setNewDesc('');
    } catch { alert('Failed to create chain'); }
  };

  const handleDeleteChain = async (id: string) => {
    if (!confirm('Delete this attack chain?')) return;
    try {
      await attackChains.delete(id);
      setChains(chains.filter(c => c.id !== id));
      if (editingChain?.id === id) setEditingChain(null);
    } catch {}
  };

  const handleAddStep = async (chain: any) => {
    const newStep = {
      id: Date.now().toString(),
      title: 'New Step',
      description: '',
      severity: 'medium',
      finding_id: null,
    };
    const updatedSteps = [...(chain.steps || []), newStep];
    const res = await attackChains.update(chain.id, { steps: updatedSteps });
    const updated = { ...chain, steps: res.data.steps };
    setChains(chains.map(c => c.id === chain.id ? updated : c));
    setEditingChain(updated);
  };

  const handleUpdateStep = async (chain: any, stepId: string, field: string, value: string) => {
    const updatedSteps = chain.steps.map((s: any) => s.id === stepId ? { ...s, [field]: value } : s);
    const res = await attackChains.update(chain.id, { steps: updatedSteps });
    const updated = { ...chain, steps: res.data.steps };
    setChains(chains.map(c => c.id === chain.id ? updated : c));
    setEditingChain(updated);
  };

  const handleDeleteStep = async (chain: any, stepId: string) => {
    const updatedSteps = chain.steps.filter((s: any) => s.id !== stepId);
    const res = await attackChains.update(chain.id, { steps: updatedSteps });
    const updated = { ...chain, steps: res.data.steps };
    setChains(chains.map(c => c.id === chain.id ? updated : c));
    setEditingChain(updated);
  };

  return (
    <>
      <style>{`
        .acb-section { margin-bottom: 32px; }
        .acb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .acb-title { font-size: 16px; font-weight: 600; color: #fff; }
        .acb-add-btn { background: none; border: 1px solid #1a1a1a; color: #666; padding: 6px 14px; border-radius: 6px; font-size: 11px; cursor: pointer; }
        .acb-add-btn:hover { border-color: #333; color: #888; }
        .acb-new-form { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .acb-input { width: 100%; background: #111; border: 1px solid #1e1e1e; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 8px; }
        .acb-input:focus { outline: none; border-color: #CC0000; }
        .acb-save { background: #CC0000; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 12px; cursor: pointer; }
        .acb-cancel { background: none; border: 1px solid #1a1a1a; color: #666; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-right: 8px; }
        .acb-chains { display: flex; flex-direction: column; gap: 16px; }
        .acb-chain { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; padding: 16px; }
        .acb-chain-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .acb-chain-title { font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; }
        .acb-chain-title:hover { color: #CC0000; }
        .acb-chain-actions { display: flex; gap: 8px; }
        .acb-steps { display: flex; align-items: center; gap: 0; flex-wrap: wrap; }
        .acb-step { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 12px 16px; min-width: 140px; max-width: 180px; position: relative; }
        .acb-step-arrow { color: #333; font-size: 20px; padding: 0 4px; }
        .acb-step-sev { font-size: 8px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 4px; }
        .acb-step-title { font-size: 11px; color: #ccc; font-weight: 600; }
        .acb-step-desc { font-size: 10px; color: #555; margin-top: 4px; }
        .acb-step-delete { position: absolute; top: 4px; right: 4px; background: none; border: none; color: #333; cursor: pointer; font-size: 10px; }
        .acb-step-delete:hover { color: #ef4444; }
        .acb-add-step { background: none; border: 1px dashed #1e1e1e; color: #444; padding: 8px 16px; border-radius: 8px; font-size: 11px; cursor: pointer; min-width: 100px; }
        .acb-add-step:hover { border-color: #333; color: #666; }
        .acb-edit-panel { margin-top: 16px; border-top: 1px solid #1a1a1a; padding-top: 16px; }
        .acb-step-editor { background: #111; border: 1px solid #1e1e1e; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
        .acb-step-editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .acb-mini-input { background: #0a0a0a; border: 1px solid #1a1a1a; color: #fff; padding: 6px 8px; border-radius: 4px; font-size: 11px; width: 100%; margin-bottom: 6px; }
        .acb-mini-select { background: #0a0a0a; border: 1px solid #1a1a1a; color: #fff; padding: 6px 8px; border-radius: 4px; font-size: 11px; }
        .acb-empty { color: #555; font-size: 12px; padding: 8px 0; }
        .acb-delete-chain { background: none; border: none; color: #444; cursor: pointer; font-size: 11px; }
        .acb-delete-chain:hover { color: #ef4444; }
        .acb-expand-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 11px; }
      `}</style>

      <div className="acb-section">
        <div className="acb-header">
          <div className="acb-title">⛓ Attack Chains ({chains.length})</div>
          <button className="acb-add-btn" onClick={() => setShowNew(!showNew)}>+ New Chain</button>
        </div>

        {showNew && (
          <div className="acb-new-form">
            <input className="acb-input" placeholder="Chain title (e.g. Initial Access → Privilege Escalation)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <input className="acb-input" placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <button className="acb-cancel" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="acb-save" onClick={handleCreate}>Create Chain</button>
          </div>
        )}

        {chains.length === 0 && !showNew && (
          <div className="acb-empty">No attack chains yet. Click "+ New Chain" to visualize an attack path.</div>
        )}

        <div className="acb-chains">
          {chains.map(chain => (
            <div key={chain.id} className="acb-chain">
              <div className="acb-chain-header">
                <div className="acb-chain-title" onClick={() => setEditingChain(editingChain?.id === chain.id ? null : chain)}>
                  {chain.title}
                </div>
                <div className="acb-chain-actions">
                  <button className="acb-expand-btn" onClick={() => setEditingChain(editingChain?.id === chain.id ? null : chain)}>
                    {editingChain?.id === chain.id ? '▲ Collapse' : '▼ Edit'}
                  </button>
                  <button className="acb-delete-chain" onClick={() => handleDeleteChain(chain.id)}>🗑</button>
                </div>
              </div>

              {/* Visual chain */}
              <div className="acb-steps">
                {(chain.steps || []).map((step: any, i: number) => (
                  <>
                    <div key={step.id} className="acb-step">
                      <button className="acb-step-delete" onClick={() => handleDeleteStep(chain, step.id)}>✕</button>
                      <div className="acb-step-sev" style={{background: `${SEV_COLOR[step.severity]}20`, color: SEV_COLOR[step.severity], border: `1px solid ${SEV_COLOR[step.severity]}40`}}>
                        {step.severity}
                      </div>
                      <div className="acb-step-title">{step.title}</div>
                      {step.description && <div className="acb-step-desc">{step.description}</div>}
                    </div>
                    {i < chain.steps.length - 1 && <div className="acb-step-arrow">→</div>}
                  </>
                ))}
                <div className="acb-step-arrow">{chain.steps?.length > 0 ? '→' : ''}</div>
                <button className="acb-add-step" onClick={() => handleAddStep(chain)}>+ Add Step</button>
              </div>

              {/* Edit panel */}
              {editingChain?.id === chain.id && (
                <div className="acb-edit-panel">
                  <div style={{fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px'}}>Edit Steps</div>
                  {(chain.steps || []).map((step: any) => (
                    <div key={step.id} className="acb-step-editor">
                      <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '6px'}}>
                        <input className="acb-mini-input" style={{marginBottom: 0}} value={step.title} onChange={e => handleUpdateStep(chain, step.id, 'title', e.target.value)} placeholder="Step title" />
                        <select className="acb-mini-select" value={step.severity} onChange={e => handleUpdateStep(chain, step.id, 'severity', e.target.value)}>
                          <option>critical</option>
                          <option>high</option>
                          <option>medium</option>
                          <option>low</option>
                          <option>info</option>
                        </select>
                      </div>
                      <input className="acb-mini-input" value={step.description || ''} onChange={e => handleUpdateStep(chain, step.id, 'description', e.target.value)} placeholder="Short description" />
                      <div style={{marginTop: '6px'}}>
                        <select className="acb-mini-select" style={{width: '100%'}} value={step.finding_id || ''} onChange={e => handleUpdateStep(chain, step.id, 'finding_id', e.target.value)}>
                          <option value="">— Link to finding (optional) —</option>
                          {findings.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {chain.steps?.length === 0 && <div style={{fontSize: '11px', color: '#555'}}>No steps yet. Click "+ Add Step" above.</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
