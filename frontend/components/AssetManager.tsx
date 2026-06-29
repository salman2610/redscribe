'use client';
import { useState, useEffect } from 'react';
import { assets } from '../app/lib/api';

export default function AssetManager({ projectId }: { projectId: string }) {
  const [assetList, setAssetList] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAsset, setNewAsset] = useState({ host: '', ip: '', os: '', ports: '', services: '' });

  useEffect(() => { loadAssets(); }, [projectId]);

  const loadAssets = async () => {
    try {
      const res = await assets.list(projectId);
      setAssetList(res.data);
    } catch {}
  };

  const handleAdd = async () => {
    try {
      await assets.create(projectId, {
        host: newAsset.host,
        ip: newAsset.ip,
        os: newAsset.os,
        ports: newAsset.ports ? newAsset.ports.split(',').map(p => p.trim()) : [],
        services: newAsset.services ? newAsset.services.split(',').map(s => s.trim()) : [],
      });
      setNewAsset({ host: '', ip: '', os: '', ports: '', services: '' });
      setShowAdd(false);
      loadAssets();
    } catch { alert('Failed to add asset'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await assets.delete(id);
      loadAssets();
    } catch { alert('Failed to delete'); }
  };

  return (
    <>
      <style>{`
        .am-section { margin-bottom: 32px; }
        .am-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .am-title { font-size: 16px; font-weight: 600; color: #fff; }
        .am-add-btn { background: none; border: 1px solid #1a1a1a; color: #666; padding: 6px 14px; border-radius: 6px; font-size: 11px; cursor: pointer; }
        .am-add-btn:hover { border-color: #333; color: #888; }
        .am-table { width: 100%; border-collapse: collapse; }
        .am-table th { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px; text-align: left; border-bottom: 1px solid #1a1a1a; }
        .am-table td { font-size: 12px; color: #ccc; padding: 12px; border-bottom: 1px solid #111; font-family: monospace; }
        .am-table tr:hover td { background: #111; }
        .am-tag { display: inline-block; background: #1a1a1a; color: #666; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin: 2px; }
        .am-delete { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px; opacity: 0.5; }
        .am-delete:hover { opacity: 1; }
        .am-form { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
        .am-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .am-input { width: 100%; background: #111; border: 1px solid #1e1e1e; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-family: monospace; }
        .am-input:focus { outline: none; border-color: #CC0000; }
        .am-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; display: block; }
        .am-save { background: #CC0000; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; }
        .am-cancel { background: none; border: 1px solid #1a1a1a; color: #666; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-right: 8px; }
        .am-empty { color: #555; font-size: 12px; padding: 16px 0; }
      `}</style>

      <div className="am-section">
        <div className="am-header">
          <div className="am-title">🖥 Assets ({assetList.length})</div>
          <button className="am-add-btn" onClick={() => setShowAdd(!showAdd)}>+ Add Asset</button>
        </div>

        {showAdd && (
          <div className="am-form">
            <div className="am-form-grid">
              <div>
                <label className="am-label">Hostname</label>
                <input className="am-input" value={newAsset.host} onChange={e => setNewAsset({...newAsset, host: e.target.value})} placeholder="app.example.com" />
              </div>
              <div>
                <label className="am-label">IP Address</label>
                <input className="am-input" value={newAsset.ip} onChange={e => setNewAsset({...newAsset, ip: e.target.value})} placeholder="192.168.1.1" />
              </div>
              <div>
                <label className="am-label">OS</label>
                <input className="am-input" value={newAsset.os} onChange={e => setNewAsset({...newAsset, os: e.target.value})} placeholder="Ubuntu 22.04" />
              </div>
              <div>
                <label className="am-label">Ports (comma separated)</label>
                <input className="am-input" value={newAsset.ports} onChange={e => setNewAsset({...newAsset, ports: e.target.value})} placeholder="80, 443, 8080" />
              </div>
            </div>
            <div style={{marginBottom: '16px'}}>
              <label className="am-label">Services (comma separated)</label>
              <input className="am-input" value={newAsset.services} onChange={e => setNewAsset({...newAsset, services: e.target.value})} placeholder="nginx, mysql, ssh" />
            </div>
            <button className="am-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="am-save" onClick={handleAdd}>Save Asset</button>
          </div>
        )}

        {assetList.length === 0 ? (
          <div className="am-empty">No assets added yet. Click "+ Add Asset" to add one.</div>
        ) : (
          <table className="am-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>IP</th>
                <th>OS</th>
                <th>Ports</th>
                <th>Services</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assetList.map(a => (
                <tr key={a.id}>
                  <td>{a.host || '—'}</td>
                  <td>{a.ip || '—'}</td>
                  <td>{a.os || '—'}</td>
                  <td>{(a.ports || []).map((p: string) => <span key={p} className="am-tag">{p}</span>)}</td>
                  <td>{(a.services || []).map((s: string) => <span key={s} className="am-tag">{s}</span>)}</td>
                  <td><button className="am-delete" onClick={() => handleDelete(a.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
