'use client';

import { useState, useEffect } from 'react';
import { api } from '../app/lib/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

export default function TemplateGallery({ onSelect, onClose }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' 
    ? templates 
    : templates.filter(t => t.severity === filter);

  return (
    <>
      <style>{`
        .gallery-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); display: flex; align-items: center;
          justify-content: center; z-index: 1000; backdrop-filter: blur(2px);
        }

        .gallery-modal {
          background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 12px;
          width: 90%; max-width: 900px; max-height: 80vh; overflow: hidden;
          display: flex; flex-direction: column;
        }

        .gallery-header {
          padding: 20px; border-bottom: 1px solid #111;
          display: flex; justify-content: space-between; align-items: center;
        }

        .gallery-title {
          font-size: 16px; font-weight: 600; color: #fff;
        }

        .gallery-close {
          background: none; border: none; color: #444; font-size: 24px;
          cursor: pointer;
        }

        .gallery-filters {
          padding: 16px; border-bottom: 1px solid #111;
          display: flex; gap: 8px; flex-wrap: wrap;
        }

        .filter-btn {
          padding: 6px 12px; border-radius: 4px; border: 1px solid #1a1a1a;
          background: none; color: #666; font-size: 11px; cursor: pointer;
          transition: all 0.2s; font-family: 'JetBrains Mono', monospace;
        }

        .filter-btn.active {
          background: #CC0000; color: #fff; border-color: #CC0000;
        }

        .gallery-content {
          overflow-y: auto; flex: 1; padding: 16px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }

        .template-card {
          background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px;
          padding: 16px; cursor: pointer; transition: all 0.2s;
        }

        .template-card:hover {
          background: #111; border-color: #333;
        }

        .template-severity {
          display: inline-block; padding: 3px 8px; border-radius: 3px;
          font-size: 9px; font-weight: 600; text-transform: uppercase;
          margin-bottom: 8px;
        }

        .template-title {
          font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 4px;
        }

        .template-meta {
          font-size: 10px; color: #666; display: flex; gap: 8px; flex-wrap: wrap;
        }

        .template-select {
          margin-top: 12px; padding: 8px 12px; background: #CC0000;
          color: #fff; border: none; border-radius: 4px; font-size: 10px;
          cursor: pointer; width: 100%; font-weight: 600;
        }
      `}</style>

      <div className="gallery-overlay" onClick={onClose}>
        <div className="gallery-modal" onClick={e => e.stopPropagation()}>
          <div className="gallery-header">
            <div className="gallery-title">📋 Finding Templates</div>
            <button className="gallery-close" onClick={onClose}>×</button>
          </div>

          <div className="gallery-filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({templates.length})
            </button>
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <button
                key={sev}
                className={`filter-btn ${filter === sev ? 'active' : ''}`}
                onClick={() => setFilter(sev)}
                style={filter === sev ? { background: SEV_COLOR[sev] } : {}}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="gallery-content">
            {loading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666' }}>
                Loading templates...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666' }}>
                No templates found
              </div>
            ) : (
              filtered.map(template => (
                <div key={template.id} className="template-card">
                  <div
                    className="template-severity"
                    style={{
                      color: SEV_COLOR[template.severity],
                      background: `${SEV_COLOR[template.severity]}20`,
                      borderColor: SEV_COLOR[template.severity]
                    }}
                  >
                    {template.severity}
                  </div>
                  <div className="template-title">{template.title}</div>
                  <div className="template-meta">
                    {template.cwe && <span>{template.cwe}</span>}
                    {template.cvss_score && <span>CVSS {template.cvss_score}</span>}
                  </div>
                  <button
                    className="template-select"
                    onClick={() => onSelect(template)}
                  >
                    Use Template
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
