'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projects } from '../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', client_name: '', scope: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projects.list();
      setProjectList(res.data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
  e.stopPropagation();
  if (!confirm('Delete this project and all its findings?')) return;
  try {
    await projects.delete(projectId);
    loadProjects();
   } catch {
    alert('Failed to delete project');
    }
  };


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await projects.create(newProject);
      setShowCreate(false);
      setNewProject({ name: '', client_name: '', scope: '' });
      loadProjects();
    } catch {
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #080808; font-family: 'Syne', sans-serif; }

        .app { min-height: 100vh; background: #080808; color: #fff; }

        /* Nav */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid #111;
          position: sticky;
          top: 0;
          background: rgba(8,8,8,0.95);
          backdrop-filter: blur(10px);
          z-index: 100;
        }

        .nav-logo {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #fff;
          cursor: pointer;
        }

        .nav-logo span { color: #CC0000; }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-user {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #444;
        }

        .nav-logout {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #333;
          background: none;
          border: 1px solid #1a1a1a;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-logout:hover {
          border-color: #CC0000;
          color: #CC0000;
        }

        /* Main */
        .main { max-width: 1200px; margin: 0 auto; padding: 60px 40px; }

        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 48px;
        }

        .page-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #CC0000;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .page-title {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -1.5px;
          color: #fff;
          line-height: 1;
        }

        .page-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #333;
          margin-top: 8px;
        }

        .new-btn {
          background: #CC0000;
          color: #fff;
          border: none;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .new-btn:hover { background: #aa0000; }

        /* Grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 2px;
        }

        .card {
          background: #0d0d0d;
          border: 1px solid #111;
          padding: 28px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #CC0000;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s;
        }

        .card:hover {
          background: #111;
          border-color: #1a1a1a;
        }

        .card:hover::before {
          transform: scaleX(1);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .card-name {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: #fff;
          line-height: 1.2;
        }

        .card-client {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #444;
          margin-top: 4px;
        }

        .status-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 4px;
          background: rgba(34,197,94,0.08);
          color: #22c55e;
          border: 1px solid rgba(34,197,94,0.15);
          white-space: nowrap;
        }

        .card-scope {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #2a2a2a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 20px;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid #111;
        }

        .card-date {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #2a2a2a;
        }

        .card-arrow {
          font-size: 16px;
          color: #222;
          transition: color 0.2s, transform 0.2s;
        }

        .card:hover .card-arrow {
          color: #CC0000;
          transform: translateX(4px);
        }

        /* Empty state */
        .empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 120px 0;
          border: 1px dashed #1a1a1a;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 20px;
          opacity: 0.3;
        }

        .empty-title {
          font-size: 24px;
          font-weight: 700;
          color: #222;
          margin-bottom: 8px;
        }

        .empty-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #1a1a1a;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          backdrop-filter: blur(4px);
          padding: 24px;
        }

        .modal {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          padding: 36px;
          width: 100%;
          max-width: 480px;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }

        .modal-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #333;
          margin-bottom: 32px;
        }

        .field { margin-bottom: 20px; }

        .field label {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #444;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .field input, .field textarea {
          width: 100%;
          background: #111;
          border: 1px solid #1a1a1a;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          padding: 12px 14px;
          border-radius: 6px;
          outline: none;
          transition: border-color 0.2s;
        }

        .field input:focus, .field textarea:focus { border-color: #CC0000; }
        .field input::placeholder, .field textarea::placeholder { color: #222; }
        .field textarea { height: 80px; resize: none; }

        .modal-btns {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .cancel-btn {
          flex: 1;
          background: none;
          border: 1px solid #1a1a1a;
          color: #444;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 600;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover { border-color: #333; color: #666; }

        .create-btn {
          flex: 1;
          background: #CC0000;
          border: none;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .create-btn:hover { background: #aa0000; }
        .create-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .loading-state {
          text-align: center;
          padding: 120px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #222;
        }
      `}</style>

      <div className="app">
        <nav className="nav">
          <img src="/logo.png" alt="RedScribe" style={{height:"60px", objectFit:"contain"}} />
          <div className="nav-right">
            <span className="nav-user">{user?.email}</span>
            <button className="nav-logout" onClick={() => { localStorage.clear(); router.push('/login'); }}>
              Sign out
            </button>
          </div>
        </nav>

        <main className="main">
          <div className="page-header">
            <div>
              <div className="page-label">// engagements</div>
              <h1 className="page-title">Projects</h1>
              <p className="page-count">{projectList.length} active engagement{projectList.length !== 1 ? 's' : ''}</p>
            </div>
            <button className="new-btn" onClick={() => setShowCreate(true)}>
              + New Project
            </button>
          </div>

          {loading ? (
            <div className="loading-state">Loading engagements...</div>
          ) : (
            <div className="grid">
              {projectList.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📁</div>
                  <div className="empty-title">No engagements yet</div>
                  <div className="empty-sub">// create your first pentest project</div>
                </div>
              ) : (
                projectList.map(project => (
                  <div
                    key={project.id}
                    className="card"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <div className="card-top">
                      <div>
                        <div className="card-name">{project.name}</div>
                        <div className="card-client">{project.client_name}</div>
                      </div>
                      <span className="status-badge">{project.status}</span>
                    </div>
                    {project.scope && (
                      <div className="card-scope">{project.scope}</div>
                    )}
                    <div className="card-footer">
                      <button onClick={e => handleDelete(e, project.id)} style={{background:'none', border:'1px solid #1a1a1a', color:'#444', fontSize:'11px', cursor:'pointer', fontFamily:"'JetBrains Mono', monospace", padding:'4px 10px', borderRadius:'4px'}} onMouseEnter={e => { e.currentTarget.style.borderColor='#CC0000'; e.currentTarget.style.color='#CC0000'; }} onMouseLeave={e => { e.currentTarget.style.borderColor='#1a1a1a'; e.currentTarget.style.color='#444'; }}>delete</button>
                  <span className="card-date">
                        {new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="card-arrow">→</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {showCreate && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
            <div className="modal">
              <div className="modal-title">New Engagement</div>
              <div className="modal-sub">// create a new pentest project</div>
              <form onSubmit={handleCreate}>
                <div className="field">
                  <label>Project Name</label>
                  <input
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                    placeholder="Web App VAPT — Q2 2026"
                    required
                  />
                </div>
                <div className="field">
                  <label>Client Name</label>
                  <input
                    value={newProject.client_name}
                    onChange={e => setNewProject({...newProject, client_name: e.target.value})}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>
                <div className="field">
                  <label>Scope</label>
                  <textarea
                    value={newProject.scope}
                    onChange={e => setNewProject({...newProject, scope: e.target.value})}
                    placeholder="*.acme.com, 192.168.1.0/24"
                  />
                </div>
                <div className="modal-btns">
                  <button type="button" className="cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="create-btn" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Project →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
