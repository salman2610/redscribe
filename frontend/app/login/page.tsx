'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    if (!email || !password) {
      setError('Email and password required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await auth.login(email, password);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #080808; font-family: 'Syne', sans-serif; }
        .page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; background: #080808; }
        .left { position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 48px; overflow: hidden; background: #0d0d0d; border-right: 1px solid #1a1a1a; }
        .left::before { content: ''; position: absolute; top: -200px; left: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(204,0,0,0.12) 0%, transparent 70%); pointer-events: none; }
        .left::after { content: ''; position: absolute; bottom: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(204,0,0,0.06) 0%, transparent 70%); pointer-events: none; }
        .logo-area { position: relative; z-index: 1; }
        .tagline { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #444; margin-top: 6px; letter-spacing: 2px; text-transform: uppercase; }
        .hero-area { position: relative; z-index: 1; }
        .hero-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #CC0000; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
        .hero-title { font-family: 'Space Grotesk', sans-serif; font-size: 52px; font-weight: 800; line-height: 1.05; letter-spacing: -2px; color: #fff; margin-bottom: 20px; }
        .hero-title em { font-style: normal; color: #CC0000; }
        .hero-desc { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #555; line-height: 1.8; max-width: 380px; }
        .features { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; }
        .feature { display: flex; align-items: center; gap: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #444; }
        .feature-dot { width: 6px; height: 6px; border-radius: 50%; background: #CC0000; flex-shrink: 0; }
        .right { display: flex; align-items: center; justify-content: center; padding: 48px; background: #080808; }
        .form-box { width: 100%; max-width: 380px; }
        .form-title { font-size: 32px; font-weight: 700; color: #fff; letter-spacing: -1px; margin-bottom: 6px; }
        .form-sub { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #444; margin-bottom: 40px; }
        .error-box { background: rgba(204,0,0,0.08); border: 1px solid rgba(204,0,0,0.3); color: #ff6666; font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; }
        .field { margin-bottom: 20px; }
        .field label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #555; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
        .field input { width: 100%; background: #111; border: 1px solid #1e1e1e; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 14px; padding: 14px 16px; border-radius: 8px; outline: none; transition: border-color 0.2s; }
        .field input:focus { border-color: #CC0000; }
        .field input::placeholder { color: #333; }
        .submit-btn { width: 100%; background: #CC0000; color: #fff; border: none; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; padding: 15px; border-radius: 8px; cursor: pointer; margin-top: 8px; transition: background 0.2s; }
        .submit-btn:hover { background: #aa0000; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider { display: flex; align-items: center; gap: 16px; margin: 28px 0; }
        .divider-line { flex: 1; height: 1px; background: #1a1a1a; }
        .divider-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #333; letter-spacing: 2px; }
        .register-link { text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #444; }
        .register-link a { color: #CC0000; text-decoration: none; font-weight: 500; }
        .register-link a:hover { text-decoration: underline; }
        @media (max-width: 768px) { .page { grid-template-columns: 1fr; } .left { display: none; } }
      `}</style>

      <div className="page">
        <div className="left">
          <div className="logo-area">
            <img src="/logo_login.png" alt="RedScribe" style={{height:"72px", objectFit:"contain"}} />
            <div className="tagline">AI Pentest Reporting</div>
          </div>

          <div className="hero-area">
            <div className="hero-label">// built for operators</div>
            <h1 className="hero-title">
              Raw scans.<br />
              <em>Client-ready</em><br />
              reports.
            </h1>
            <p className="hero-desc">
              Upload your Nmap, Burp, and Nessus outputs.
              AI parses, enriches, and structures every finding.
              Export professional reports in minutes.
            </p>
          </div>

          <div className="features">
            {['Nmap & Burp XML parsing', 'AI enrichment via Ollama / Gemini / Claude', 'CVSS scoring & OWASP mapping', 'Executive summary generation', 'PDF & DOCX export'].map(f => (
              <div key={f} className="feature">
                <div className="feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="right">
          <div className="form-box">
            <h2 className="form-title">Sign in</h2>
            <p className="form-sub">// enter your credentials to continue</p>

            {error && <div className="error-box">⚠ {error}</div>}

            <div className="field">
              <label>Email</label>
              <input
                ref={emailRef}
                type="email"
                placeholder="operator@company.com"
                onKeyDown={handleKeyDown}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                ref={passwordRef}
                type="password"
                placeholder="••••••••••"
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />
            </div>
            <button
              type="button"
              className="submit-btn"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? 'Authenticating...' : 'Sign in →'}
            </button>

            <div className="divider">
              <div className="divider-line" />
              <div className="divider-text">OR</div>
              <div className="divider-line" />
            </div>

            <div className="register-link">
              New to RedScribe? <a href="/register">Create account</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
