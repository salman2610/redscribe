'use client';

import { useState } from 'react';
import { projects } from '../app/lib/api';

export default function EngagementMetadata({ project, onSave }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name || '',
    client_name: project.client_name || '',
    scope: project.scope || '',
    tester_name: project.tester_name || '',
    classification: project.classification || '',
    methodology: project.methodology || '',
    start_date: project.start_date ? project.start_date.split('T')[0] : '',
    end_date: project.end_date ? project.end_date.split('T')[0] : '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await projects.update(project.id, formData);
      setIsEditing(false);
      onSave();
      alert('✅ Engagement details updated');
    } catch (err) {
      alert('❌ Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <style>{`
        .metadata-section {
          background: #0d0d0d; border: 1px solid #111; border-radius: 8px;
          padding: 24px; margin-bottom: 32px;
        }

        .metadata-title {
          font-size: 14px; font-weight: 600; color: #CC0000;
          letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px;
        }

        .metadata-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
          margin-bottom: 16px;
        }

        .metadata-item {
          font-family: 'JetBrains Mono', monospace;
        }

        .metadata-label {
          font-size: 10px; color: #999; letter-spacing: 1px;
          text-transform: uppercase; margin-bottom: 6px; display: block;
        }

        .metadata-value {
          font-size: 12px; color: #ccc;
        }

        .form-input {
          width: 100%; padding: 8px 12px;
          background: #080808; border: 1px solid #1a1a1a;
          border-radius: 4px; color: #fff;
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
        }

        .form-input:focus {
          outline: none; border-color: #CC0000;
        }

        .metadata-actions {
          display: flex; gap: 8px; justify-content: flex-end;
          padding-top: 16px; border-top: 1px solid #111;
        }

        .btn {
          padding: 8px 14px; border-radius: 4px; border: none;
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          cursor: pointer; transition: all 0.2s;
        }

        .btn-edit {
          background: rgba(123,47,190,0.1); color: #a855f7;
          border: 1px solid rgba(123,47,190,0.2);
        }

        .btn-save {
          background: #CC0000; color: #fff; border: none;
        }

        .btn-cancel {
          background: none; border: 1px solid #1a1a1a; color: #444;
        }
      `}</style>

      <div className="metadata-section">
        <div className="metadata-title">// Engagement Details</div>

        {!isEditing ? (
          <>
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Project Name</span>
                <span className="metadata-value">{formData.name}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Client</span>
                <span className="metadata-value">{formData.client_name}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Tester</span>
                <span className="metadata-value">{formData.tester_name || 'N/A'}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Classification</span>
                <span className="metadata-value">{formData.classification || 'N/A'}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Methodology</span>
                <span className="metadata-value">{formData.methodology || 'N/A'}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Scope</span>
                <span className="metadata-value">{formData.scope}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Start Date</span>
                <span className="metadata-value">{formData.start_date || 'N/A'}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">End Date</span>
                <span className="metadata-value">{formData.end_date || 'N/A'}</span>
              </div>
            </div>

            <div className="metadata-actions">
              <button className="btn btn-edit" onClick={() => setIsEditing(true)}>
                ✏️ Edit
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="metadata-grid">
              <input
                className="form-input"
                placeholder="Project Name"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Client Name"
                value={formData.client_name}
                onChange={e => handleChange('client_name', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Tester Name"
                value={formData.tester_name}
                onChange={e => handleChange('tester_name', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Classification (e.g., Confidential)"
                value={formData.classification}
                onChange={e => handleChange('classification', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Methodology (e.g., OWASP)"
                value={formData.methodology}
                onChange={e => handleChange('methodology', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Scope"
                value={formData.scope}
                onChange={e => handleChange('scope', e.target.value)}
              />
              <input
                className="form-input"
                type="date"
                value={formData.start_date}
                onChange={e => handleChange('start_date', e.target.value)}
              />
              <input
                className="form-input"
                type="date"
                value={formData.end_date}
                onChange={e => handleChange('end_date', e.target.value)}
              />
            </div>

            <div className="metadata-actions">
              <button className="btn btn-cancel" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button
                className="btn btn-save"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? '⏳ Saving...' : '💾 Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
