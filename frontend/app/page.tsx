'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const FINDINGS = [
  { sev: 'CRITICAL', color: '#ff1744', title: 'SQL Injection — Login Form', cvss: '9.8', cwe: 'CWE-89' },
  { sev: 'CRITICAL', color: '#ff1744', title: 'Remote Code Execution', cvss: '9.0', cwe: 'CWE-434' },
  { sev: 'HIGH', color: '#ff6d00', title: 'Broken JWT Authentication', cvss: '8.1', cwe: 'CWE-287' },
  { sev: 'HIGH', color: '#ff6d00', title: 'SSRF via Payment Webhook', cvss: '7.5', cwe: 'CWE-918' },
  { sev: 'MEDIUM', color: '#ffd600', title: 'Reflected XSS — Search', cvss: '6.1', cwe: 'CWE-79' },
];

const TERMINAL_LINES = [
  { delay: 0, text: '$ redscribe scan --target acme-corp.com', color: '#e2e8f0' },
  { delay: 700, text: '  ▸ Parsing Nmap XML...', color: '#64748b' },
  { delay: 1300, text: '  ▸ Parsing Burp Suite export...', color: '#64748b' },
  { delay: 1900, text: '  ▸ AI enriching 7 findings...', color: '#64748b' },
  { delay: 2700, text: '  ✓ 2 CRITICAL vulnerabilities found', color: '#ff1744' },
  { delay: 3100, text: '  ✓ 2 HIGH vulnerabilities found', color: '#ff6d00' },
  { delay: 3500, text: '  ✓ Report generated: acme-report.pdf', color: '#4ade80' },
  { delay: 4100, text: '  ▸ Time elapsed: 47 seconds', color: '#a78bfa' },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [termLines, setTermLines] = useState<number[]>([]);
  const [termStarted, setTermStarted] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);
  const termRef = useRef<HTMLDivElement>(null);
  const heroPinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      if (heroPinRef.current) {
        const rect = heroPinRef.current.getBoundingClientRect();
        const total = heroPinRef.current.offsetHeight - window.innerHeight;
        const scrolled2 = -rect.top;
        const p = Math.min(Math.max(scrolled2 / total, 0), 1);
        setHeroProgress(p);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          const d = parseFloat(el.dataset.delay || '0');
          setTimeout(() => el.classList.add('show'), d * 1000);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !termStarted) {
        setTermStarted(true);
        TERMINAL_LINES.forEach((_, i) => setTimeout(() => setTermLines(p => [...p, i]), TERMINAL_LINES[i].delay));
      }
    }, { threshold: 0.3 });
    if (termRef.current) obs.observe(termRef.current);
    return () => obs.disconnect();
  }, [termStarted]);

  // Derived transforms for the pinned hero
  const titleScale = 1 - heroProgress * 0.45;
  const titleY = heroProgress * -120;
  const titleSkew = heroProgress * 6;
  const subOpacity = Math.max(0, 1 - heroProgress * 3);
  const lateOpacity = Math.min(1, Math.max(0, (heroProgress - 0.5) * 3));
  const lateY = (1 - lateOpacity) * 40;
  const glitch = heroProgress > 0.3 && heroProgress < 0.7;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{background:#030303;color:#fff;font-family:'Inter',sans-serif;overflow-x:hidden;}

        .bg-mesh{position:fixed;inset:0;z-index:0;pointer-events:none;
          background:
            radial-gradient(ellipse 70% 50% at 15% 0%, rgba(255,23,68,0.10) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 90% 90%, rgba(255,23,68,0.06) 0%, transparent 60%);
        }
        .grid-overlay{position:fixed;inset:0;z-index:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);
          background-size:56px 56px;
          mask-image:radial-gradient(ellipse 80% 80% at 50% 30%, black 30%, transparent 100%);
        }

        [data-reveal]{opacity:0;transform:translateY(36px);transition:opacity .85s cubic-bezier(.16,1,.3,1),transform .85s cubic-bezier(.16,1,.3,1);}
        [data-reveal="right"]{transform:translateX(48px);}
        [data-reveal].show{opacity:1;transform:none;}
        [data-delay="0.1"]{transition-delay:.1s;} [data-delay="0.15"]{transition-delay:.15s;}
        [data-delay="0.2"]{transition-delay:.2s;} [data-delay="0.25"]{transition-delay:.25s;}
        [data-delay="0.3"]{transition-delay:.3s;} [data-delay="0.35"]{transition-delay:.35s;}
        [data-delay="0.4"]{transition-delay:.4s;} [data-delay="0.5"]{transition-delay:.5s;}
        [data-delay="0.6"]{transition-delay:.6s;} [data-delay="0.7"]{transition-delay:.7s;}

        .nav{position:fixed;top:0;left:0;right:0;z-index:200;padding:20px 64px;display:flex;align-items:center;justify-content:space-between;transition:all .5s cubic-bezier(.16,1,.3,1);}
        .nav.scrolled{background:rgba(3,3,3,0.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.05);padding:14px 64px;}
        .nav-logo{cursor:pointer;display:flex;align-items:center;}
        .nav-logo img{height:58px;width:auto;filter:drop-shadow(0 0 16px rgba(255,23,68,0.5));}
        .nav-links{display:flex;gap:36px;}
        .nav-link{font-size:13px;color:rgba(255,255,255,0.35);cursor:pointer;text-decoration:none;letter-spacing:.3px;transition:color .3s;}
        .nav-link:hover{color:#fff;}
        .nav-cta{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#ff1744;background:rgba(255,23,68,0.08);border:1px solid rgba(255,23,68,0.3);padding:10px 26px;cursor:pointer;letter-spacing:2px;text-transform:uppercase;transition:all .3s;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);}
        .nav-cta:hover{background:#ff1744;color:#000;box-shadow:0 0 30px rgba(255,23,68,0.5);}

        /* PINNED HERO */
        .hero-pin-wrap{position:relative;height:280vh;z-index:1;isolation:isolate;}
        .hero-pin{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;text-align:center;padding:0 24px;}
        .hero-tag{font-family:'JetBrains Mono',monospace;font-size:11px;color:#ff1744;letter-spacing:5px;text-transform:uppercase;margin-bottom:24px;text-shadow:0 0 20px rgba(255,23,68,0.6);}
        .hero-title{font-weight:900;line-height:0.92;letter-spacing:-4px;will-change:transform;font-size:clamp(48px,9vw,140px);}
        .hero-title .line2{
          color:#ff1744;
          text-shadow:0 0 30px rgba(255,23,68,0.8),0 0 60px rgba(255,23,68,0.4),0 0 100px rgba(255,23,68,0.2);
        }
        .glitch{animation:glitchAnim .15s infinite;}
        @keyframes glitchAnim{
          0%{clip-path:inset(0 0 0 0);}
          20%{clip-path:inset(10% 0 60% 0);transform:translateX(-4px);}
          40%{clip-path:inset(70% 0 5% 0);transform:translateX(4px);}
          60%{clip-path:inset(40% 0 40% 0);transform:translateX(-2px);}
          80%{clip-path:inset(5% 0 80% 0);transform:translateX(2px);}
          100%{clip-path:inset(0 0 0 0);}
        }
        .hero-sub{font-size:16px;color:rgba(255,255,255,0.4);max-width:480px;margin:32px auto 0;line-height:1.7;}
        .hero-late{position:absolute;bottom:14vh;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:32px;width:100%;padding:0 24px;}
        .hero-btns{display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center;}
        .btn-primary{background:linear-gradient(135deg,#ff1744,#b3000f);color:#fff;border:none;padding:16px 40px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.3px;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);transition:all .3s;box-shadow:0 8px 32px rgba(255,23,68,0.4),inset 0 1px 0 rgba(255,255,255,0.15);}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 48px rgba(255,23,68,0.6);}
        .btn-outline{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.12);padding:16px 32px;font-size:13px;font-weight:500;cursor:pointer;transition:all .3s;}
        .btn-outline:hover{background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.25);}
        .hero-stats{display:flex;gap:40px;}
        .stat-n{font-size:26px;font-weight:900;letter-spacing:-1px;color:#fff;}
        .stat-l{font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px;font-family:'JetBrains Mono',monospace;letter-spacing:.5px;}
        .scroll-hint{position:absolute;bottom:4vh;left:50%;transform:translateX(-50%);font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.2);letter-spacing:3px;text-transform:uppercase;display:flex;flex-direction:column;align-items:center;gap:10px;}
        .scroll-line{width:1px;height:36px;background:linear-gradient(to bottom,#ff1744,transparent);animation:scrollPulse 1.6s ease-in-out infinite;}
        @keyframes scrollPulse{0%,100%{opacity:.3;transform:scaleY(.6);}50%{opacity:1;transform:scaleY(1);}}

        /* FLOATING CARDS that fade in around the title mid-scroll */
        .fc-field{position:absolute;inset:0;pointer-events:none;}
        .fc{position:absolute;background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:9px;min-width:200px;box-shadow:0 8px 24px rgba(0,0,0,0.4);}
        .fc-sev{font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;padding:3px 7px;border-radius:3px;letter-spacing:1px;white-space:nowrap;}
        .fc-title{font-size:10px;font-weight:600;color:rgba(255,255,255,0.8);flex:1;}
        .fc-cvss{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;}

        .ticker{position:relative;z-index:1;overflow:hidden;padding:13px 0;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);}
        .ticker-inner{display:flex;animation:ticker 28s linear infinite;white-space:nowrap;}
        .ticker-item{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;padding:0 40px;display:flex;align-items:center;gap:40px;}
        .ticker-dot{width:3px;height:3px;background:#ff1744;border-radius:50%;}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}

        .social{position:relative;z-index:1;padding:32px 64px;background:rgba(255,255,255,0.01);border-bottom:1px solid rgba(255,255,255,0.05);}
        .social-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:40px;}
        .social-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;white-space:nowrap;}
        .social-line{width:1px;height:24px;background:rgba(255,255,255,0.08);flex-shrink:0;}
        .social-logos{display:flex;gap:36px;flex-wrap:wrap;}
        .social-logo{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.45);font-weight:700;letter-spacing:2px;text-transform:uppercase;transition:color .4s;}
        .social-logo:hover{color:rgba(255,23,68,0.6);}

        .section{position:relative;z-index:1;padding:120px 64px;}
        .s-inner{max-width:1200px;margin:0 auto;}
        .eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,23,68,0.8);letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;}
        .h2{font-size:clamp(36px,3.8vw,58px);font-weight:900;letter-spacing:-2.5px;line-height:1.02;margin-bottom:16px;}
        .lead{font-size:15px;color:rgba(255,255,255,0.55);line-height:1.75;max-width:460px;}

        .term-section{position:relative;z-index:1;padding:120px 64px;background:rgba(255,23,68,0.015);border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);}
        .term-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}
        .term-win{background:rgba(8,8,8,0.85);border:1px solid rgba(255,23,68,0.1);border-radius:12px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.6),0 0 60px rgba(255,23,68,0.05);}
        .term-bar{background:rgba(255,255,255,0.03);padding:12px 16px;display:flex;align-items:center;gap:7px;border-bottom:1px solid rgba(255,255,255,0.06);}
        .t-dot{width:11px;height:11px;border-radius:50%;}
        .t-title{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.15);margin-left:8px;}
        .term-body{padding:20px 24px;min-height:240px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.9;}
        .t-line{animation:fadeUp .35s ease forwards;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .t-cur{display:inline-block;width:8px;height:13px;background:#ff1744;animation:blink 1s infinite;vertical-align:middle;margin-left:2px;}
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}

        .bento{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.05);margin-top:64px;border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden;}
        .gc{background:rgba(255,255,255,0.015);padding:36px;position:relative;overflow:hidden;transition:background .3s,box-shadow .3s;}
        .gc:hover{background:rgba(255,23,68,0.03);box-shadow:inset 0 0 60px rgba(255,23,68,0.04);}
        .gc-wide{grid-column:span 2;}
        .gc-tag{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,23,68,0.7);border:1px solid rgba(255,23,68,0.15);padding:3px 8px;letter-spacing:2px;text-transform:uppercase;display:inline-block;margin-bottom:16px;border-radius:3px;}
        .gc-title{font-size:17px;font-weight:700;margin-bottom:8px;letter-spacing:-.3px;color:rgba(255,255,255,0.9);}
        .gc-desc{font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65;}
        .mf{display:flex;gap:8px;align-items:center;padding:7px 10px;background:rgba(255,255,255,0.03);border-radius:4px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.05);}
        .mf-bar{width:2px;height:18px;border-radius:1px;flex-shrink:0;}
        .mf-title{font-size:10px;color:rgba(255,255,255,0.5);font-family:'JetBrains Mono',monospace;flex:1;}
        .mf-score{font-size:9px;color:rgba(255,255,255,0.2);font-family:'JetBrains Mono',monospace;}

        .nums{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,0.05);max-width:1200px;margin:0 auto 120px;border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden;}
        .nc{background:rgba(255,255,255,0.015);padding:52px 40px;text-align:center;transition:background .3s;}
        .nc:hover{background:rgba(255,23,68,0.03);}
        .nc-v{font-size:60px;font-weight:900;letter-spacing:-3px;line-height:1;display:block;margin-bottom:10px;}
        .nc-l{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:2px;text-transform:uppercase;}

        .wf-row{display:grid;grid-template-columns:repeat(4,1fr);margin-top:64px;position:relative;}
        .wf-row::before{content:'';position:absolute;top:23px;left:12%;right:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,23,68,0.3),rgba(255,23,68,0.3),transparent);}
        .wf-item{text-align:center;padding:0 24px;}
        .wf-n{width:48px;height:48px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,23,68,0.8);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;border-radius:8px;position:relative;z-index:1;transition:all .3s;}
        .wf-item:hover .wf-n{border-color:rgba(255,23,68,0.4);box-shadow:0 0 20px rgba(255,23,68,0.15);}
        .wf-t{font-size:14px;font-weight:700;margin-bottom:8px;color:rgba(255,255,255,0.85);}
        .wf-d{font-size:12px;color:rgba(255,255,255,0.5);line-height:1.65;}

        .tools-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:40px;}
        .tool{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.25);padding:8px 18px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;transition:all .3s;border-radius:6px;}
        .tool:hover{background:rgba(255,23,68,0.08);border-color:rgba(255,23,68,0.3);color:#ff1744;}

        .cta-sec{position:relative;z-index:1;padding:160px 64px;text-align:center;background:radial-gradient(ellipse 80% 60% at 50% 50%,rgba(255,23,68,0.08) 0%,transparent 60%);border-top:1px solid rgba(255,255,255,0.05);overflow:hidden;}
        .cta-badge{display:inline-flex;align-items:center;gap:10px;background:rgba(255,23,68,0.08);border:1px solid rgba(255,23,68,0.2);color:#ff1744;padding:8px 20px;margin-bottom:32px;border-radius:100px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;}
        .cta-live{width:6px;height:6px;background:#ff1744;border-radius:50%;animation:pulse 1.5s infinite;}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.5}}
        .cta-h2{font-size:clamp(44px,6vw,88px);font-weight:900;letter-spacing:-4px;line-height:.95;margin-bottom:20px;}
        .cta-h2 span{color:#ff1744;text-shadow:0 0 40px rgba(255,23,68,0.6);}
        .cta-sub{font-size:16px;color:rgba(255,255,255,0.55);margin-bottom:12px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.65;}
        .cta-fine{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:48px;letter-spacing:.5px;}
        .btn-cta{display:inline-block;background:linear-gradient(135deg,#ff1744,#b3000f);color:#fff;border:none;padding:20px 60px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:2px;text-transform:uppercase;font-family:'JetBrains Mono',monospace;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%);transition:all .3s;margin-bottom:28px;box-shadow:0 16px 48px rgba(255,23,68,0.35),inset 0 1px 0 rgba(255,255,255,0.15);}
        .btn-cta:hover{transform:scale(1.02);box-shadow:0 24px 64px rgba(255,23,68,0.55);}
        .trust-row{display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;}
        .trust-item{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:1px;display:flex;align-items:center;gap:6px;}
        .trust-item::before{content:'✓';color:#ff1744;}

        .footer{position:relative;z-index:1;border-top:1px solid rgba(255,255,255,0.05);padding:36px 64px;display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.2);flex-wrap:wrap;gap:16px;}
        .footer img{height:26px;opacity:0.25;cursor:pointer;transition:opacity .3s;}
        .footer img:hover{opacity:.4;}
        .footer-t{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:1px;}

        .demo-ov{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:40px;backdrop-filter:blur(10px);}
        .demo-modal{background:rgba(8,8,8,0.92);border:1px solid rgba(255,23,68,0.12);border-radius:14px;width:100%;max-width:760px;max-height:90vh;overflow:hidden;box-shadow:0 80px 200px rgba(0,0,0,0.9);}
        .demo-bar{background:rgba(255,255,255,0.03);padding:12px 16px;display:flex;align-items:center;gap:7px;border-bottom:1px solid rgba(255,255,255,0.06);}
        .demo-dot{width:11px;height:11px;border-radius:50%;cursor:pointer;}
        .demo-url{flex:1;background:rgba(255,255,255,0.04);border-radius:4px;height:22px;margin:0 8px;display:flex;align-items:center;padding:0 10px;border:1px solid rgba(255,255,255,0.05);}
        .demo-url span{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.2);}
        .demo-body{overflow-y:auto;max-height:calc(90vh - 48px);padding:24px;}

        @media(max-width:900px){
          .hero-pin-wrap{height:auto;}
          .hero-pin{position:relative;height:auto;min-height:100vh;padding:140px 24px 80px;}
          .hero-title{font-size:clamp(40px,12vw,70px);}
          .hero-late{position:static;transform:none;margin-top:40px;}
          .fc-field{display:none;}
          .section,.term-section,.cta-sec{padding:80px 24px;}
          .nav,.nav.scrolled{padding:16px 24px;}
          .social,.ticker{padding-left:24px;padding-right:24px;}
          .bento{grid-template-columns:1fr;}
          .gc-wide{grid-column:span 1;}
          .nums{grid-template-columns:repeat(2,1fr);}
          .wf-row{grid-template-columns:repeat(2,1fr);gap:32px;}
          .footer{flex-direction:column;gap:16px;text-align:center;padding:24px;}
          .term-grid{grid-template-columns:1fr;}
        }
      `}</style>

      <div className="bg-mesh" />
      <div className="grid-overlay" />

      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-logo" onClick={() => router.push('/')}>
          <img src="/logo.png" alt="RedScribe" />
        </div>
        <div className="nav-links">
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#workflow">Workflow</a>
          <a className="nav-link" href="#tools">Tools</a>
        </div>
        <button className="nav-cta" onClick={() => router.push('/login')}>Get Access</button>
      </nav>

      {/* PINNED KINETIC HERO */}
      <div className="hero-pin-wrap" ref={heroPinRef}>
        <div className="hero-pin">
          <div className="hero-tag" style={{ opacity: subOpacity }}>AI Pentest Reporting</div>

          <h1
            className={`hero-title ${glitch ? 'glitch' : ''}`}
            style={{
              transform: `translateY(${titleY}px) scale(${titleScale}) skewX(${titleSkew}deg)`,
            }}
          >
            <span style={{ display: 'block' }}>Raw scans.</span>
            <span className="line2" style={{ display: 'block' }}>Client-ready</span>
            <span style={{ display: 'block' }}>reports.</span>
          </h1>

          <p className="hero-sub" style={{ opacity: subOpacity }}>
            RedScribe turns your Nmap, Burp, and Nessus output into professional penetration testing reports in minutes — not days.
          </p>

          <div className="fc-field">
            {FINDINGS.map((f, i) => {
              const positions = [
                { top: '14%', left: '6%' },
                { top: '22%', right: '5%' },
                { top: '62%', left: '4%' },
                { top: '68%', right: '7%' },
                { top: '40%', left: '50%' },
              ];
              return (
                <div
                  key={f.title}
                  className="fc"
                  style={{
                    ...positions[i],
                    opacity: Math.min(1, Math.max(0, (heroProgress - 0.15 - i * 0.05) * 4)),
                    transform: `translateY(${(1 - Math.min(1, Math.max(0, (heroProgress - 0.15 - i * 0.05) * 4))) * 20}px)`,
                  }}
                >
                  <div className="fc-sev" style={{ background: `${f.color}18`, color: f.color, border: `1px solid ${f.color}35` }}>{f.sev}</div>
                  <div className="fc-title">{f.title}</div>
                  <div className="fc-cvss" style={{ color: f.color }}>{f.cvss}</div>
                </div>
              );
            })}
          </div>

          <div className="hero-late" style={{ opacity: lateOpacity, transform: `translate(-50%, ${lateY}px)` }}>
            <div className="hero-btns">
              <button className="btn-primary" onClick={() => router.push('/login')}>Get Early Access</button>
              <button className="btn-outline" onClick={() => setShowDemo(true)}>View Demo Report</button>
            </div>
            <div className="hero-stats">
              {[['10x', 'Faster reports'], ['20+', 'Templates'], ['3', 'Scan formats']].map(([n, l]) => (
                <div key={l}>
                  <div className="stat-n">{n}</div>
                  <div className="stat-l">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="scroll-hint" style={{ opacity: subOpacity }}>
            <span>Scroll</span>
            <div className="scroll-line" />
          </div>
        </div>
      </div>

      <div className="social">
        <div className="social-inner">
          <div className="social-label">Trusted by</div>
          <div className="social-line" />
          <div className="social-logos">
            {['CERT-IN', 'Deloitte', 'PwC', 'KPMG', 'Synack', 'HackerOne', 'BugCrowd'].map(n => (
              <div key={n} className="social-logo">{n}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="ticker">
        <div className="ticker-inner">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="ticker-item">
              {['SQL Injection', 'XSS', 'IDOR', 'SSRF', 'RCE', 'Auth Bypass', 'Path Traversal', 'XXE', 'CSRF', 'Command Injection', 'Subdomain Takeover', 'Weak Crypto'].map((t, j) => (
                <span key={t} style={{ display: 'contents' }}><span>{t}</span>{j < 11 && <div className="ticker-dot" />}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="term-section" id="features">
        <div className="term-grid">
          <div>
            <div className="eyebrow" data-reveal>How it works</div>
            <h2 className="h2" data-reveal data-delay="0.1">Scan to report<br />in 47 seconds.</h2>
            <p className="lead" data-reveal data-delay="0.2" style={{ marginTop: '16px' }}>Upload your scanner output. RedScribe parses, AI enriches every finding, and generates a professional client report automatically.</p>
          </div>
          <div className="term-win" data-reveal="right" data-delay="0.1" ref={termRef}>
            <div className="term-bar">
              <div className="t-dot" style={{ background: '#ff1744' }} />
              <div className="t-dot" style={{ background: '#ffd600' }} />
              <div className="t-dot" style={{ background: '#22c55e' }} />
              <div className="t-title">redscribe — zsh</div>
            </div>
            <div className="term-body">
              {TERMINAL_LINES.map((line, i) => termLines.includes(i) && (
                <div key={i} className="t-line" style={{ color: line.color }}>{line.text}</div>
              ))}
              {termLines.length > 0 && termLines.length < TERMINAL_LINES.length && <span className="t-cur" />}
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="s-inner">
          <div className="eyebrow" data-reveal>Features</div>
          <h2 className="h2" data-reveal data-delay="0.1">Built for the<br />offensive workflow.</h2>
          <div className="bento">
            {[
              { tag: 'Core', title: 'AI-Powered Enrichment', desc: 'One click enriches every finding with professional descriptions, business impact, attack scenarios, and remediation steps.', wide: true, visual: true, d: '0' },
              { tag: 'Export', title: 'PDF & DOCX Reports', desc: 'Pixel-perfect reports with cover pages, executive summaries, severity heatmaps, and embedded evidence.', wide: false, d: '0.1' },
              { tag: 'Templates', title: '20+ Finding Templates', desc: 'SQLi, XSS, IDOR, SSRF, RCE. Auto-fill professionally.', wide: false, d: '0.2' },
              { tag: 'Workflow', title: 'Attack Chain Builder', desc: 'Visualize full attack paths from initial access to exfiltration.', wide: false, d: '0.3' },
              { tag: 'Premium', title: 'Live Report Preview', desc: 'Edit on the left, see the final report update in real-time on the right.', wide: true, d: '0.4' },
              { tag: 'AI', title: 'Rewrite Modes', desc: 'Technical, Executive, Compliance, Concise — one finding, four audiences.', wide: false, ai: true, d: '0.5' },
            ].map((c) => (
              <div key={c.title} className={`gc ${c.wide ? 'gc-wide' : ''}`} data-reveal data-delay={c.d}>
                <div className="gc-tag">{c.tag}</div>
                <div className="gc-title">{c.title}</div>
                <div className="gc-desc">{c.desc}</div>
                {c.visual && (
                  <div style={{ marginTop: '20px' }}>
                    {[['#ff1744', 'SQL Injection — Login Form', '9.8'], ['#ff6d00', 'Open Port 3306/tcp', '7.5'], ['#ffd600', 'Reflected XSS', '6.1'], ['#3b82f6', 'Missing Headers', '3.1']].map(([cl, t, s]) => (
                      <div key={t as string} className="mf">
                        <div className="mf-bar" style={{ background: cl as string }} />
                        <div className="mf-title">{t}</div>
                        <div className="mf-score">CVSS {s}</div>
                      </div>
                    ))}
                  </div>
                )}
                {(c as any).ai && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {['Technical', 'Executive', 'Compliance', 'Concise'].map(t => (
                      <div key={t} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono'", letterSpacing: '1px', borderRadius: '4px' }}>{t}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 64px' }}>
        <div className="nums">
          {[['10x', '#ff1744', 'Faster reporting'], ['20+', 'rgba(255,255,255,0.9)', 'Finding templates'], ['3', '#ff1744', 'Scan formats'], ['100%', 'rgba(255,255,255,0.9)', 'Client-ready']].map(([v, c, l], i) => (
            <div key={l as string} className="nc" data-reveal data-delay={`${i * 0.1}`}>
              <span className="nc-v" style={{ color: c as string }}>{v}</span>
              <div className="nc-l">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="section" id="workflow">
        <div className="s-inner">
          <div className="eyebrow" data-reveal>Workflow</div>
          <h2 className="h2" data-reveal data-delay="0.1">Four steps.<br />Zero friction.</h2>
          <div className="wf-row">
            {[['01', 'Upload', 'Drop Nmap, Burp Suite, or Nessus files. Parsed instantly.', '0'],
              ['02', 'Enrich', 'AI writes professional descriptions and remediation.', '0.1'],
              ['03', 'Edit', 'Fine-tune in the live split-screen preview.', '0.2'],
              ['04', 'Export', 'Client-ready PDF or DOCX in one click.', '0.3'],
            ].map(([n, t, d, dl]) => (
              <div key={n} className="wf-item" data-reveal data-delay={dl}>
                <div className="wf-n">{n}</div>
                <div className="wf-t">{t}</div>
                <div className="wf-d">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="tools" style={{ paddingTop: '0' }}>
        <div className="s-inner">
          <div className="eyebrow" data-reveal>Integrations</div>
          <h2 className="h2" data-reveal data-delay="0.1">Works with<br />your stack.</h2>
          <div className="tools-wrap">
            {['Nmap', 'Burp Suite', 'Nessus', 'OWASP ZAP', 'Metasploit', 'Nuclei', 'OpenVAS', 'Nikto', 'ffuf', 'SQLmap', 'Masscan', 'Shodan'].map((t, i) => (
              <div key={t} className="tool" data-reveal data-delay={`${(i % 4) * 0.08}`}>{t}</div>
            ))}
          </div>
        </div>
      </section>

      <div className="cta-sec">
        <div className="cta-badge" data-reveal><div className="cta-live" /><span>Early Access Open</span></div>
        <h2 className="cta-h2" data-reveal data-delay="0.1">Stop writing.<br /><span>Start shipping.</span></h2>
        <p className="cta-sub" data-reveal data-delay="0.2">The reporting tool pentesters wished existed.</p>
        <p className="cta-fine" data-reveal data-delay="0.3">No credit card · Free during beta · Unlimited exports</p>
        <div data-reveal data-delay="0.4">
          <button className="btn-cta" onClick={() => router.push('/login')}>Get Early Access →</button>
        </div>
        <div className="trust-row" data-reveal data-delay="0.5">
          {['No credit card', 'Free during beta', '200+ pentesters', 'Unlimited exports'].map(t => (
            <div key={t} className="trust-item">{t}</div>
          ))}
        </div>
      </div>

      <footer className="footer">
        <img src="/logo.png" alt="RedScribe" onClick={() => router.push('/')} />
        <div className="footer-t">AI-Powered Pentest Reporting</div>
        <div className="footer-t" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>© 2026 RedScribe</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>
            Developed by{' '}
            <a
              href="https://salman2610.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,23,68,0.8)', textDecoration: 'none' }}
            >
              Salmanul Faris
            </a>
            {' · '}
            <a
              href="https://www.linkedin.com/in/p-salmanul-faris-68b733249/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,23,68,0.8)', textDecoration: 'none' }}
            >
              LinkedIn
            </a>
          </span>
        </div>
      </footer>

      {showDemo && (
        <div className="demo-ov" onClick={() => setShowDemo(false)}>
          <div className="demo-modal" onClick={e => e.stopPropagation()}>
            <div className="demo-bar">
              <div className="demo-dot" style={{ background: '#ff1744' }} onClick={() => setShowDemo(false)} />
              <div className="demo-dot" style={{ background: '#ffd600' }} />
              <div className="demo-dot" style={{ background: '#22c55e' }} />
              <div className="demo-url"><span>redscribe.app/reports/acme-corp-vapt-2026.pdf</span></div>
              <button onClick={() => setShowDemo(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div className="demo-body">
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '28px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>Red<span style={{ color: '#ff1744' }}>Scribe</span></div>
                <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,23,68,0.7)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>//  Penetration Test Report</div>
                <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '4px' }}>Acme Corp VAPT 2026</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginBottom: '20px', fontFamily: 'monospace' }}>E-Commerce Platform · Confidential · June 2026</div>
                <div style={{ display: 'flex', gap: '28px' }}>
                  {[['8', 'rgba(255,255,255,0.9)', 'Total'], ['2', '#ff1744', 'Critical'], ['2', '#ff6d00', 'High'], ['3', '#ffd600', 'Medium']].map(([n, c, l]) => (
                    <div key={l}><div style={{ fontSize: '28px', fontWeight: '900', color: c as string, lineHeight: 1 }}>{n}</div><div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>{l}</div></div>
                  ))}
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,23,68,0.7)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>//  Findings</div>
              {FINDINGS.map(f => (
                <div key={f.title} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: '2px', alignSelf: 'stretch', background: f.color, minHeight: '24px', borderRadius: '1px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px', color: 'rgba(255,255,255,0.8)' }}>{f.title}</div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{f.cwe} · CVSS {f.cvss}</div>
                    </div>
                    <div style={{ fontSize: '8px', fontWeight: '700', padding: '2px 8px', background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}30`, letterSpacing: '1px', borderRadius: '3px' }}>{f.sev}</div>
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
