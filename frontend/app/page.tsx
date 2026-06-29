'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const FINDINGS = [
  { sev: 'CRITICAL', color: '#ef4444', title: 'SQL Injection — Login Form', cvss: '9.8', cwe: 'CWE-89' },
  { sev: 'CRITICAL', color: '#ef4444', title: 'Remote Code Execution', cvss: '9.0', cwe: 'CWE-434' },
  { sev: 'HIGH', color: '#f97316', title: 'Broken JWT Authentication', cvss: '8.1', cwe: 'CWE-287' },
  { sev: 'HIGH', color: '#f97316', title: 'SSRF via Payment Webhook', cvss: '7.5', cwe: 'CWE-918' },
  { sev: 'MEDIUM', color: '#eab308', title: 'Reflected XSS — Search', cvss: '6.1', cwe: 'CWE-79' },
  { sev: 'MEDIUM', color: '#eab308', title: 'CORS Misconfiguration', cvss: '5.4', cwe: 'CWE-346' },
  { sev: 'LOW', color: '#3b82f6', title: 'Missing Security Headers', cvss: '3.1', cwe: 'CWE-693' },
];

const TERMINAL_LINES = [
  { delay: 0, text: '$ redscribe scan --target acme-corp.com', color: '#fff' },
  { delay: 800, text: '▶ Parsing Nmap XML...', color: '#888' },
  { delay: 1400, text: '▶ Parsing Burp Suite export...', color: '#888' },
  { delay: 2000, text: '▶ AI enriching 7 findings...', color: '#888' },
  { delay: 2800, text: '✓ Found 2 CRITICAL vulnerabilities', color: '#ef4444' },
  { delay: 3200, text: '✓ Found 2 HIGH vulnerabilities', color: '#f97316' },
  { delay: 3600, text: '✓ Report generated: acme-report.pdf', color: '#22c55e' },
  { delay: 4200, text: '▶ Time elapsed: 47 seconds', color: '#a855f7' },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [terminalLines, setTerminalLines] = useState<number[]>([]);
  const [terminalStarted, setTerminalStarted] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(el => {
        if (el.isIntersecting) {
          el.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Terminal animation
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !terminalStarted) {
        setTerminalStarted(true);
        TERMINAL_LINES.forEach((line, i) => {
          setTimeout(() => setTerminalLines(prev => [...prev, i]), line.delay);
        });
      }
    }, { threshold: 0.3 });
    if (terminalRef.current) observer.observe(terminalRef.current);
    return () => observer.disconnect();
  }, [terminalStarted]);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: any[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }
    let animId: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(204,0,0,${p.opacity})`;
        ctx.fill();
      });
      // Draw connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(204,0,0,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: #050505; color: #fff; font-family: 'Inter', sans-serif; overflow-x: hidden; }

        /* Scanline effect */
        body::after {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
          pointer-events: none;
          z-index: 999;
        }

        /* Scroll reveal */
        .reveal, .reveal-up, .reveal-left, .reveal-right {
          opacity: 0;
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .reveal { transform: translateY(32px); }
        .reveal-left { transform: translateX(-48px); }
        .reveal-right { transform: translateX(48px); }
        .reveal.visible, .reveal-up.visible, .reveal-left.visible, .reveal-right.visible {
          opacity: 1; transform: none;
        }
        .reveal-up { transform: translateY(16px); }

        /* Stagger children */
        .stagger > *:nth-child(1) { transition-delay: 0s; }
        .stagger > *:nth-child(2) { transition-delay: 0.08s; }
        .stagger > *:nth-child(3) { transition-delay: 0.16s; }
        .stagger > *:nth-child(4) { transition-delay: 0.24s; }
        .stagger > *:nth-child(5) { transition-delay: 0.32s; }
        .stagger > *:nth-child(6) { transition-delay: 0.4s; }
        .stagger > *:nth-child(7) { transition-delay: 0.48s; }

        /* NAV */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 20px 60px; display: flex; align-items: center; justify-content: space-between;
          transition: all 0.4s;
        }
        .nav.scrolled {
          background: rgba(5,5,5,0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 14px 60px;
        }
        .nav-logo img { height: 48px; width: auto; }
        .nav-links { display: flex; gap: 36px; }
        .nav-link { font-size: 13px; color: #444; cursor: pointer; text-decoration: none; transition: color 0.3s; letter-spacing: 0.3px; }
        .nav-link:hover { color: #fff; }
        .nav-cta {
          background: transparent; color: #CC0000;
          border: 1px solid rgba(204,0,0,0.35);
          padding: 9px 24px; font-size: 12px; font-weight: 600;
          cursor: pointer; letter-spacing: 1.5px; text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace; transition: all 0.3s;
        }
        .nav-cta:hover { background: #CC0000; color: #fff; border-color: #CC0000; }

        /* HERO */
        .hero {
          position: relative; z-index: 1; min-height: 100vh;
          display: grid; grid-template-columns: 1fr 1fr;
          align-items: center; padding: 120px 60px 80px; gap: 80px;
        }
        .hero-left {}
        .hero-eyebrow {
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          color: #CC0000; letter-spacing: 4px; text-transform: uppercase;
          display: flex; align-items: center; gap: 12px; margin-bottom: 28px;
        }
        .hero-eyebrow::before { content: ''; width: 24px; height: 1px; background: #CC0000; }
        .hero-h1 {
          font-size: clamp(48px, 5.5vw, 80px); font-weight: 900;
          line-height: 1; letter-spacing: -3px; margin-bottom: 24px;
        }
        .hero-h1 em { font-style: normal; color: #CC0000; }
        .hero-sub { font-size: 16px; color: #555; line-height: 1.7; margin-bottom: 40px; max-width: 440px; }
        .hero-actions { display: flex; gap: 16px; align-items: center; margin-bottom: 56px; }
        .btn-primary {
          background: #CC0000; color: #fff; border: none;
          padding: 15px 36px; font-size: 14px; font-weight: 700;
          cursor: pointer; letter-spacing: 0.3px; transition: all 0.3s;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
        }
        .btn-primary:hover { background: #e60000; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(204,0,0,0.3); }
        .btn-secondary {
          background: none; color: #555; border: none;
          padding: 15px 0; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: color 0.3s;
          font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px;
        }
        .btn-secondary:hover { color: #fff; }
        .hero-stats { display: flex; gap: 32px; }
        .hero-stat-num { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -1px; }
        .hero-stat-label { font-size: 11px; color: #333; margin-top: 2px; letter-spacing: 0.5px; }

        /* FLOATING CARDS */
        .hero-right { position: relative; height: 500px; }
        .float-card {
          position: absolute;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 14px 16px;
          display: flex; align-items: center; gap: 10px;
          min-width: 240px; max-width: 300px;
          animation: float linear infinite;
        }
        .float-card:nth-child(1) { top: 20px; left: 10%; animation-duration: 6s; animation-delay: 0s; }
        .float-card:nth-child(2) { top: 100px; right: 5%; animation-duration: 7s; animation-delay: -2s; }
        .float-card:nth-child(3) { top: 190px; left: 5%; animation-duration: 5.5s; animation-delay: -1s; }
        .float-card:nth-child(4) { top: 280px; right: 8%; animation-duration: 6.5s; animation-delay: -3s; }
        .float-card:nth-child(5) { top: 370px; left: 15%; animation-duration: 7.5s; animation-delay: -1.5s; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .fc-sev {
          font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700;
          padding: 3px 7px; border-radius: 3px; letter-spacing: 1px; white-space: nowrap;
        }
        .fc-content { flex: 1; }
        .fc-title { font-size: 12px; font-weight: 600; color: #ccc; margin-bottom: 2px; }
        .fc-meta { font-size: 10px; color: #444; font-family: 'JetBrains Mono', monospace; }
        .fc-cvss { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; margin-left: auto; }

        /* MARQUEE */
        .marquee { overflow: hidden; border-top: 1px solid #0f0f0f; border-bottom: 1px solid #0f0f0f; padding: 14px 0; background: #030303; position: relative; z-index: 1; }
        .marquee-inner { display: flex; animation: marquee 25s linear infinite; white-space: nowrap; }
        .marquee-item { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #222; letter-spacing: 3px; text-transform: uppercase; padding: 0 40px; display: flex; align-items: center; gap: 40px; }
        .marquee-dot { width: 3px; height: 3px; background: #CC0000; border-radius: 50%; opacity: 0.4; }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        /* SECTIONS */
        .section { position: relative; z-index: 1; padding: 120px 60px; }
        .section-inner { max-width: 1200px; margin: 0 auto; }
        .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #CC0000; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 16px; }
        .h2 { font-size: clamp(32px, 3.5vw, 56px); font-weight: 900; letter-spacing: -2px; line-height: 1.05; margin-bottom: 16px; }
        .lead { font-size: 16px; color: #555; line-height: 1.7; max-width: 480px; }

        /* TERMINAL */
        .terminal-section { position: relative; z-index: 1; padding: 120px 60px; background: #030303; border-top: 1px solid #0f0f0f; border-bottom: 1px solid #0f0f0f; }
        .terminal-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .terminal-window {
          background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 10px; overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6);
        }
        .terminal-bar { background: #111; padding: 12px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #1a1a1a; }
        .t-dot { width: 11px; height: 11px; border-radius: 50%; }
        .t-title { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #333; margin-left: 8px; }
        .terminal-body { padding: 20px; min-height: 280px; }
        .t-line { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8; display: flex; align-items: center; gap: 8px; }
        .t-line.entering { animation: fadeInUp 0.3s ease forwards; }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .t-cursor { display: inline-block; width: 8px; height: 14px; background: #CC0000; animation: blink 1s infinite; vertical-align: middle; }
        @keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }

        /* BENTO FEATURES */
        .bento { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #0f0f0f; border: 1px solid #0f0f0f; margin-top: 64px; }
        .bc { background: #080808; padding: 36px; position: relative; overflow: hidden; transition: background 0.3s; }
        .bc:hover { background: #0c0c0c; }
        .bc::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, rgba(204,0,0,0.04) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s; }
        .bc:hover::after { opacity: 1; }
        .bc-wide { grid-column: span 2; }
        .bc-tag { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #CC0000; border: 1px solid rgba(204,0,0,0.15); padding: 3px 8px; letter-spacing: 2px; text-transform: uppercase; display: inline-block; margin-bottom: 16px; }
        .bc-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.3px; }
        .bc-desc { font-size: 13px; color: #444; line-height: 1.6; }
        .bc-visual { margin-top: 20px; }

        /* NUMBERS */
        .numbers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #0f0f0f; border: 1px solid #0f0f0f; max-width: 1200px; margin: 0 auto 120px; }
        .nc { background: #080808; padding: 48px 36px; text-align: center; }
        .nc-val { font-size: 56px; font-weight: 900; letter-spacing: -2px; line-height: 1; display: block; margin-bottom: 8px; }
        .nc-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #333; letter-spacing: 2px; text-transform: uppercase; }

        /* WORKFLOW */
        .wf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 64px; position: relative; }
        .wf-grid::before { content: ''; position: absolute; top: 25px; left: 12.5%; right: 12.5%; height: 1px; background: linear-gradient(90deg, transparent, rgba(204,0,0,0.2), rgba(204,0,0,0.2), transparent); }
        .wf { text-align: center; padding: 0 24px; }
        .wf-num { width: 50px; height: 50px; border: 1px solid #1a1a1a; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #CC0000; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; background: #050505; position: relative; z-index: 1; }
        .wf-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .wf-desc { font-size: 12px; color: #444; line-height: 1.6; }

        /* SOCIAL PROOF */
        .social { position: relative; z-index: 1; padding: 48px 60px; border-top: 1px solid #0d0d0d; border-bottom: 1px solid #0d0d0d; background: #030303; }
        .social-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 40px; }
        .social-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #2a2a2a; letter-spacing: 3px; white-space: nowrap; text-transform: uppercase; }
        .social-divider { width: 1px; height: 32px; background: #111; }
        .social-logos { display: flex; gap: 36px; flex-wrap: wrap; }
        .social-logo { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #1e1e1e; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; transition: color 0.3s; }
        .social-logo:hover { color: #333; }

        /* TOOLS */
        .tools-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 40px; }
        .tool { border: 1px solid #111; color: #333; padding: 8px 18px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 1px; transition: all 0.3s; cursor: default; }
        .tool:hover { border-color: #CC0000; color: #CC0000; }

        /* CTA */
        .cta { position: relative; z-index: 1; padding: 160px 60px; text-align: center; background: #030303; border-top: 1px solid #0f0f0f; overflow: hidden; }
        .cta-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 700px; height: 500px; background: radial-gradient(ellipse, rgba(204,0,0,0.06) 0%, transparent 65%); pointer-events: none; }
        .cta-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(204,0,0,0.07); border: 1px solid rgba(204,0,0,0.12); color: #CC0000; padding: 7px 18px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 28px; }
        .cta-live { width: 6px; height: 6px; background: #CC0000; border-radius: 50%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.6} }
        .cta-h2 { font-size: clamp(40px, 5.5vw, 80px); font-weight: 900; letter-spacing: -3px; line-height: 1; margin-bottom: 16px; }
        .cta-sub { font-size: 16px; color: #444; margin-bottom: 12px; max-width: 520px; margin-left: auto; margin-right: auto; line-height: 1.6; }
        .cta-fine { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #222; margin-bottom: 48px; letter-spacing: 0.5px; }
        .btn-cta { background: #CC0000; color: #fff; border: none; padding: 20px 56px; font-size: 14px; font-weight: 800; cursor: pointer; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; transition: all 0.3s; clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%); display: inline-block; margin-bottom: 24px; }
        .btn-cta:hover { background: #e60000; transform: scale(1.02); box-shadow: 0 16px 48px rgba(204,0,0,0.35); }
        .cta-trust { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; }
        .cta-trust-item { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #222; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; }
        .cta-trust-item::before { content: '✓'; color: #CC0000; }

        /* FOOTER */
        .footer { position: relative; z-index: 1; border-top: 1px solid #0d0d0d; padding: 36px 60px; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo img { height: 28px; opacity: 0.4; }
        .footer-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #1e1e1e; letter-spacing: 1px; }

        /* DEMO MODAL */
        .demo-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 40px; backdrop-filter: blur(8px); }
        .demo-modal { background: #080808; border: 1px solid #1a1a1a; border-radius: 12px; width: 100%; max-width: 780px; max-height: 90vh; overflow: hidden; box-shadow: 0 60px 160px rgba(0,0,0,0.9); }
        .demo-bar { background: #0d0d0d; padding: 12px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #111; }
        .demo-dot { width: 11px; height: 11px; border-radius: 50%; cursor: pointer; }
        .demo-url { flex: 1; background: #111; border-radius: 4px; height: 24px; margin: 0 8px; display: flex; align-items: center; padding: 0 12px; }
        .demo-url-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #333; }
        .demo-body { overflow-y: auto; max-height: calc(90vh - 52px); padding: 28px; }

        /* Mini finding in bento */
        .mf { display: flex; gap: 8px; align-items: center; padding: 8px 10px; background: #0d0d0d; border-radius: 3px; margin-bottom: 5px; }
        .mf-bar { width: 3px; height: 20px; border-radius: 2px; flex-shrink: 0; }
        .mf-title { font-size: 10px; color: #777; font-family: 'JetBrains Mono', monospace; flex: 1; }
        .mf-score { font-size: 9px; color: #333; font-family: 'JetBrains Mono', monospace; }

        /* Canvas */
        #particle-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }

        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; padding: 100px 24px 60px; }
          .hero-right { display: none; }
          .section, .terminal-section, .cta { padding: 80px 24px; }
          .nav { padding: 16px 24px; }
          .nav.scrolled { padding: 12px 24px; }
          .bento { grid-template-columns: 1fr; }
          .bc-wide { grid-column: span 1; }
          .numbers { grid-template-columns: repeat(2, 1fr); }
          .wf-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .footer { flex-direction: column; gap: 16px; text-align: center; }
        }
      `}</style>

      <canvas ref={canvasRef} id="particle-canvas" />

      {/* NAV */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <img src="/logo.png" alt="RedScribe" style={{height:'46px', cursor:'pointer'}} onClick={() => router.push('/')} />
        <div className="nav-links">
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#workflow">Workflow</a>
          <a className="nav-link" href="#tools">Tools</a>
        </div>
        <button className="nav-cta" onClick={() => router.push('/login')}>Get Access</button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow reveal">AI Pentest Reporting</div>
          <h1 className="hero-h1 reveal">
            Raw scans.<br/>
            <em>Client-ready</em><br/>
            reports.
          </h1>
          <p className="hero-sub reveal">
            RedScribe turns your Nmap, Burp, and Nessus output into professional penetration testing reports in minutes — not days.
          </p>
          <div className="hero-actions reveal">
            <button className="btn-primary" onClick={() => router.push('/login')}>Get Early Access</button>
            <button className="btn-secondary" onClick={() => setShowDemo(true)}>View Demo Report →</button>
          </div>
          <div className="hero-stats reveal stagger">
            {[['10x','Faster reports'],['20+','Finding templates'],['3','Scan formats']].map(([n,l]) => (
              <div key={l}>
                <div className="hero-stat-num">{n}</div>
                <div className="hero-stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating vulnerability cards */}
        <div className="hero-right">
          {FINDINGS.slice(0, 5).map((f, i) => (
            <div key={f.title} className="float-card reveal" style={{transitionDelay: `${i * 0.1}s`}}>
              <div className="fc-sev" style={{background: `${f.color}18`, color: f.color, border: `1px solid ${f.color}30`}}>{f.sev}</div>
              <div className="fc-content">
                <div className="fc-title">{f.title}</div>
                <div className="fc-meta">{f.cwe}</div>
              </div>
              <div className="fc-cvss" style={{color: f.color}}>{f.cvss}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div className="social">
        <div className="social-inner">
          <div className="social-label">Trusted by</div>
          <div className="social-divider"/>
          <div className="social-logos stagger">
            {['CERT-IN','Deloitte','PwC','KPMG','Synack','HackerOne','BugCrowd'].map(n => (
              <div key={n} className="social-logo">{n}</div>
            ))}
          </div>
        </div>
      </div>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-inner">
          {[...Array(2)].map((_,i) => (
            <div key={i} className="marquee-item">
              <span>SQL Injection</span><div className="marquee-dot"/><span>XSS</span><div className="marquee-dot"/><span>IDOR</span><div className="marquee-dot"/><span>SSRF</span><div className="marquee-dot"/><span>RCE</span><div className="marquee-dot"/><span>Auth Bypass</span><div className="marquee-dot"/><span>Path Traversal</span><div className="marquee-dot"/><span>XXE</span><div className="marquee-dot"/><span>CSRF</span><div className="marquee-dot"/><span>Command Injection</span><div className="marquee-dot"/><span>Subdomain Takeover</span><div className="marquee-dot"/>
            </div>
          ))}
        </div>
      </div>

      {/* TERMINAL + FEATURES */}
      <div className="terminal-section" id="features">
        <div className="terminal-inner">
          <div>
            <div className="eyebrow reveal">How it works</div>
            <h2 className="h2 reveal">Scan to report<br/>in 47 seconds.</h2>
            <p className="lead reveal" style={{marginTop:'16px'}}>Upload your tools output. RedScribe parses, AI enriches every finding, and generates a professional report ready to send to your client.</p>
          </div>
          <div className="terminal-window reveal-right" ref={terminalRef}>
            <div className="terminal-bar">
              <div className="t-dot" style={{background:'#ef4444'}}/>
              <div className="t-dot" style={{background:'#eab308'}}/>
              <div className="t-dot" style={{background:'#22c55e'}}/>
              <div className="t-title">redscribe — terminal</div>
            </div>
            <div className="terminal-body">
              {TERMINAL_LINES.map((line, i) => (
                terminalLines.includes(i) && (
                  <div key={i} className="t-line entering" style={{color: line.color}}>
                    {line.text}
                  </div>
                )
              ))}
              {terminalLines.length === TERMINAL_LINES.length && (
                <div className="t-line" style={{marginTop:'4px'}}>
                  <span className="t-cursor"/>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BENTO FEATURES */}
      <section className="section">
        <div className="section-inner">
          <div className="eyebrow reveal">Features</div>
          <h2 className="h2 reveal">Built for the<br/>offensive workflow.</h2>
          <div className="bento stagger">
            <div className="bc bc-wide reveal">
              <div className="bc-tag">Core</div>
              <div className="bc-title">AI-Powered Enrichment</div>
              <div className="bc-desc">One click enriches every finding with professional descriptions, business impact statements, attack scenarios, and remediation steps.</div>
              <div className="bc-visual">
                {[['#ef4444','SQL Injection — Login Form','9.8'],['#f97316','Open Port 3306/tcp','7.5'],['#eab308','Reflected XSS','6.1'],['#3b82f6','Missing Headers','3.1']].map(([c,t,s]) => (
                  <div key={t as string} className="mf">
                    <div className="mf-bar" style={{background: c as string}}/>
                    <div className="mf-title">{t}</div>
                    <div className="mf-score">CVSS {s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bc reveal">
              <div className="bc-tag">Export</div>
              <div className="bc-title">PDF & DOCX</div>
              <div className="bc-desc">Pixel-perfect reports with cover pages, exec summaries, heatmaps, and embedded evidence screenshots.</div>
            </div>
            <div className="bc reveal">
              <div className="bc-tag">Templates</div>
              <div className="bc-title">20+ Finding Templates</div>
              <div className="bc-desc">SQLi, XSS, IDOR, SSRF, RCE and more. Auto-fill findings professionally in one click.</div>
            </div>
            <div className="bc reveal">
              <div className="bc-tag">Workflow</div>
              <div className="bc-title">Attack Chain Builder</div>
              <div className="bc-desc">Visualize how vulnerabilities chain into full attack paths. Show clients the real impact.</div>
            </div>
            <div className="bc bc-wide reveal">
              <div className="bc-tag">Premium</div>
              <div className="bc-title">Live Report Preview</div>
              <div className="bc-desc">Edit findings on the left, see the final report update in real-time on the right. What you see is exactly what the client receives.</div>
              <div className="bc-visual" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', height:'64px', marginTop:'16px'}}>
                <div style={{background:'#0d0d0d', borderRadius:'3px', padding:'8px', display:'flex', flexDirection:'column', gap:'4px'}}>
                  {[70,100,50].map(w => <div key={w} style={{height:'5px', background:'#1a1a1a', borderRadius:'2px', width:`${w}%`}}/>)}
                </div>
                <div style={{background:'#0d0d0d', borderRadius:'3px', padding:'8px', display:'flex', flexDirection:'column', gap:'4px'}}>
                  {[60,100,80].map(w => <div key={w} style={{height:'5px', background:'rgba(204,0,0,0.15)', borderRadius:'2px', width:`${w}%`}}/>)}
                </div>
              </div>
            </div>
            <div className="bc reveal">
              <div className="bc-tag">AI</div>
              <div className="bc-title">Rewrite Modes</div>
              <div className="bc-desc">Technical, Executive, Compliance, Concise — one finding, four audiences, instant.</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'16px'}}>
                {['Technical','Executive','Compliance','Concise'].map(t => (
                  <div key={t} style={{background:'#111', border:'1px solid #1a1a1a', padding:'4px 10px', fontSize:'10px', color:'#444', fontFamily:"'JetBrains Mono'", letterSpacing:'0.5px'}}>{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <div style={{position:'relative', zIndex:1, padding:'0 60px'}}>
        <div className="numbers stagger">
          {[['10x','#CC0000','Faster reporting'],['20+','#fff','Finding templates'],['3','#CC0000','Scan formats supported'],['100%','#fff','Client-ready output']].map(([v,c,l]) => (
            <div key={l as string} className="nc reveal">
              <span className="nc-val" style={{color: c as string}}>{v}</span>
              <div className="nc-label">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WORKFLOW */}
      <section className="section" id="workflow">
        <div className="section-inner">
          <div className="eyebrow reveal">Workflow</div>
          <h2 className="h2 reveal">From scan to PDF.<br/>Four steps.</h2>
          <div className="wf-grid stagger">
            {[['01','Upload','Drop Nmap, Burp Suite, or Nessus files. Parsed instantly.'],
              ['02','Enrich','AI writes descriptions, impact, and remediation for every finding.'],
              ['03','Edit','Fine-tune in the live split-screen preview.'],
              ['04','Export','Download client-ready PDF or DOCX.'],
            ].map(([n,t,d]) => (
              <div key={n} className="wf reveal">
                <div className="wf-num">{n}</div>
                <div className="wf-title">{t}</div>
                <div className="wf-desc">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section className="section" id="tools" style={{paddingTop:'0'}}>
        <div className="section-inner">
          <div className="eyebrow reveal">Integrations</div>
          <h2 className="h2 reveal">Works with your stack.</h2>
          <div className="tools-grid stagger">
            {['Nmap','Burp Suite','Nessus','OWASP ZAP','Metasploit','Nuclei','OpenVAS','Nikto','ffuf','SQLmap','Masscan','Shodan'].map(t => (
              <div key={t} className="tool reveal">{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta">
        <div className="cta-glow"/>
        <div className="cta-badge reveal"><div className="cta-live"/><span>Early Access Open</span></div>
        <h2 className="cta-h2 reveal">Stop writing.<br/>Start shipping.</h2>
        <p className="cta-sub reveal">The reporting tool pentesters wished existed. Built by security professionals, for security professionals.</p>
        <p className="cta-fine reveal">No credit card · Free during beta · Unlimited exports</p>
        <div className="reveal">
          <button className="btn-cta" onClick={() => router.push('/login')}>Get Early Access →</button>
        </div>
        <div className="cta-trust reveal stagger">
          {['No credit card required','Free during beta','Used by 200+ pentesters','Export unlimited reports'].map(t => (
            <div key={t} className="cta-trust-item">{t}</div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <img src="/logo.png" alt="RedScribe" style={{height:'28px', opacity:0.35, cursor:'pointer'}} onClick={() => router.push('/')}/>
        <div className="footer-text">AI-Powered Pentest Reporting</div>
        <div className="footer-text">© 2026 RedScribe. All rights reserved.</div>
      </footer>

      {/* DEMO MODAL */}
      {showDemo && (
        <div className="demo-overlay" onClick={() => setShowDemo(false)}>
          <div className="demo-modal" onClick={e => e.stopPropagation()}>
            <div className="demo-bar">
              <div className="demo-dot" style={{background:'#ef4444'}} onClick={() => setShowDemo(false)}/>
              <div className="demo-dot" style={{background:'#eab308'}}/>
              <div className="demo-dot" style={{background:'#22c55e'}}/>
              <div className="demo-url"><span className="demo-url-text">redscribe.app/reports/acme-corp-vapt-2026.pdf</span></div>
              <button onClick={() => setShowDemo(false)} style={{background:'none',border:'none',color:'#333',cursor:'pointer',fontSize:'16px',lineHeight:1}}>✕</button>
            </div>
            <div className="demo-body">
              <div style={{background:'#0d0d0d', padding:'28px', borderRadius:'8px', marginBottom:'20px'}}>
                <div style={{fontSize:'13px', fontWeight:'700', marginBottom:'12px'}}>Red<span style={{color:'#CC0000'}}>Scribe</span></div>
                <div style={{fontFamily:'monospace', fontSize:'10px', color:'#CC0000', letterSpacing:'3px', textTransform:'uppercase', marginBottom:'8px'}}>// Penetration Test Report</div>
                <div style={{fontSize:'24px', fontWeight:'900', letterSpacing:'-1px', marginBottom:'4px'}}>Acme Corp VAPT 2026</div>
                <div style={{fontSize:'12px', color:'#444', marginBottom:'20px'}}>E-Commerce Platform · Confidential · June 2026</div>
                <div style={{display:'flex', gap:'28px'}}>
                  {[['8','#fff','Total'],['2','#ef4444','Critical'],['2','#f97316','High'],['3','#eab308','Medium']].map(([n,c,l]) => (
                    <div key={l}><div style={{fontSize:'28px', fontWeight:'900', color:c as string, lineHeight:1}}>{n}</div><div style={{fontSize:'9px', color:'#333', fontFamily:'monospace', letterSpacing:'2px', textTransform:'uppercase', marginTop:'4px'}}>{l}</div></div>
                  ))}
                </div>
              </div>
              <div style={{fontFamily:'monospace', fontSize:'9px', color:'#CC0000', letterSpacing:'3px', textTransform:'uppercase', marginBottom:'12px'}}>// Findings</div>
              {FINDINGS.map(f => (
                <div key={f.title} style={{border:'1px solid #111', borderRadius:'6px', marginBottom:'10px', overflow:'hidden'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px', padding:'14px', background:'#0d0d0d', borderBottom:'1px solid #111'}}>
                    <div style={{width:'3px', alignSelf:'stretch', background:f.color, borderRadius:'2px', minHeight:'28px'}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'13px', fontWeight:'600', marginBottom:'3px'}}>{f.title}</div>
                      <div style={{fontSize:'10px', color:'#444', fontFamily:'monospace'}}>{f.cwe} · CVSS {f.cvss}</div>
                    </div>
                    <div style={{fontSize:'8px', fontWeight:'700', padding:'3px 8px', background:`${f.color}12`, color:f.color, border:`1px solid ${f.color}30`, borderRadius:'2px', letterSpacing:'1px'}}>{f.sev}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
