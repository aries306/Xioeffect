import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Nova | XIO",
  description: "Nova is an independent creator building ideas into experiences.",
};

const principles = [
  ["01", "Question the default", "The first acceptable answer is rarely the final one."],
  ["02", "Build with intent", "Every detail earns its place. Utility and feeling belong together."],
  ["03", "Use what works", "Ideas lead; technology is the means to make them real."],
  ["04", "Keep moving", "The work is never static. Learn, refine, ship, repeat."],
];

const process = ["Research the signal", "Explore the possible", "Build the first real version", "Refine until it holds attention", "Ship, learn, and push further"];

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="ambient"><i className="orb orbOne" /><i className="orb orbTwo" /><i className="grid" /></div>
      <header className="nav">
        <Link href="/" className="brand" aria-label="XIO home"><span>✦</span> XIO</Link>
        <nav><Link href="/">Home</Link><Link href="/about" className="active">About</Link><a href="/#/pricing">Pricing</a></nav>
        <a className="cta" href="/#/app/today">Enter XIO <span>→</span></a>
      </header>

      <section className="hero">
        <p className="eyebrow">About the creator</p>
        <h1>I’m Nova — an independent creator building ideas into <em>experiences.</em></h1>
        <p className="intro">I work from concept through design, execution, and refinement. The goal is never simply to make something work. It’s to make something worth experiencing.</p>
        <div className="heroMark"><span>concept</span><b>→</b><span>craft</span><b>→</b><span>impact</span></div>
      </section>

      <section className="statement panel"><p>“I’m interested in what’s possible, I build things, and I’m always pushing the work further.”</p></section>

      <section className="section split">
        <p className="eyebrow">01 — The creator</p>
        <div><h2>Not one title. A body of work in motion.</h2><p>I’m drawn to ideas with room to become more: products, digital experiences, experiments, and systems that turn a rough thought into something clear, intentional, and memorable.</p><p>I work independently and across disciplines because the most interesting work rarely fits inside one narrow box.</p></div>
      </section>

      <section className="section philosophy">
        <div><p className="eyebrow">02 — The philosophy</p><h2>High standards are a practice, not a finish line.</h2></div>
        <div className="principles">{principles.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="section work">
        <p className="eyebrow">03 — The work</p>
        <h2>Things made to be used, felt, and remembered.</h2>
        <p className="lead">This is a space for projects, experiments, products, and concepts. Some are finished. Some are becoming. All of them are part of the same pursuit: making ideas real.</p>
        <div className="workGrid"><div className="workCard feature"><span>Featured direction</span><strong>Technology, craft, and curiosity in the same frame.</strong></div><div className="workCard"><span>Always exploring</span><strong>New tools. Better systems. Bigger questions.</strong></div><div className="workCard"><span>Built in public</span><strong>The next chapter is already in progress.</strong></div></div>
      </section>

      <section className="section process"><p className="eyebrow">04 — The process</p><h2>From a rough thought to something polished.</h2><ol>{process.map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol></section>

      <section className="future panel"><p className="eyebrow">05 — What’s next</p><h2>The story is still being built.</h2><p>I’m not interested in presenting a finished version of myself. I’m interested in building what comes next — and making it exceptional.</p><a className="cta" href="/#/app/today">Explore XIO <span>→</span></a></section>
      <footer><Link href="/">XIO</Link><span>Independent creation, in motion.</span></footer>
      <style>{`
        :global(*) { box-sizing: border-box; } :global(body) { margin: 0; background: #06060e; color: #f1f1f8; font-family: Arial, sans-serif; }
        .about-page { --muted:#a2a1ba; --line:rgba(255,255,255,.11); --purple:#8978ff; --cyan:#00e5ff; min-height:100vh; overflow:hidden; position:relative; }
        .ambient { position:fixed; inset:0; pointer-events:none; z-index:0; } .orb { position:absolute; border-radius:50%; filter:blur(110px); opacity:.42; } .orbOne { width:580px;height:580px;background:#5d48d9;top:-220px;left:-180px; } .orbTwo { width:480px;height:480px;background:#007e98;right:-200px;top:35%; } .grid { position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px); background-size:64px 64px; mask-image:radial-gradient(ellipse 78% 55% at 50% 10%,#000,transparent 80%); }
        .nav,.hero,.section,.statement,.future,footer { position:relative; z-index:1; width:min(1120px,calc(100% - 48px)); margin-inline:auto; } .nav { height:76px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); } .brand { color:white; text-decoration:none; font-weight:800; letter-spacing:.15em; } .brand span { color:var(--cyan); } nav { display:flex; gap:28px; } nav a { color:var(--muted); text-decoration:none; font-size:14px; } nav .active,nav a:hover { color:white; } .cta { display:inline-flex; gap:9px; align-items:center; color:white; text-decoration:none; background:linear-gradient(135deg,#7764ec,#4d9eff); padding:11px 17px; border-radius:11px; font-size:14px; font-weight:700; box-shadow:0 10px 30px -12px #7163ff; } .cta span { color:var(--cyan); }
        .hero { padding:138px 0 96px; max-width:920px; } .eyebrow { color:var(--cyan); letter-spacing:.2em; text-transform:uppercase; font-size:12px; font-weight:700; margin:0 0 20px; } h1,h2,h3,p { margin-top:0; } h1,h2,h3 { font-family:Arial,sans-serif; letter-spacing:-.045em; } h1 { font-size:clamp(48px,7vw,88px); line-height:.98; margin-bottom:28px; } em { font-style:normal; background:linear-gradient(100deg,var(--purple),var(--cyan)); -webkit-background-clip:text; color:transparent; } .intro { max-width:670px; color:var(--muted); font-size:19px; line-height:1.7; } .heroMark { display:flex; gap:14px; margin-top:48px; color:#cbc7ef; font-size:13px; letter-spacing:.08em; text-transform:uppercase; } .heroMark b { color:var(--cyan); }
        .panel { background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025)); border:1px solid var(--line); border-radius:22px; backdrop-filter:blur(16px); } .statement { padding:42px; } .statement p { font-size:clamp(24px,3vw,39px); line-height:1.25; max-width:850px; margin:0; letter-spacing:-.035em; }
        .section { padding:130px 0; } .split { display:grid; grid-template-columns:1fr 2fr; gap:80px; } h2 { font-size:clamp(34px,4.5vw,59px); line-height:1.03; margin-bottom:26px; } .split p:not(.eyebrow),.lead,.future > p:not(.eyebrow) { color:var(--muted); font-size:17px; line-height:1.75; max-width:680px; } .philosophy { display:grid; grid-template-columns:1.2fr 1.5fr; gap:64px; border-top:1px solid var(--line); } .principles { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid var(--line); border-left:1px solid var(--line); } .principles article { padding:26px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); min-height:190px; } .principles span { color:var(--cyan); font-size:12px; font-weight:700; letter-spacing:.1em; } h3 { font-size:21px; margin:26px 0 12px; } .principles p { color:var(--muted); line-height:1.55; font-size:14px; }
        .work { border-top:1px solid var(--line); } .lead { margin-bottom:46px; } .workGrid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:14px; } .workCard { min-height:280px; border:1px solid var(--line); border-radius:18px; padding:25px; display:flex; flex-direction:column; justify-content:space-between; background:rgba(255,255,255,.035); } .workCard:first-child { background:radial-gradient(circle at 20% 15%,rgba(0,229,255,.18),transparent 33%),linear-gradient(140deg,rgba(124,108,255,.38),rgba(255,255,255,.03)); } .workCard span { text-transform:uppercase; letter-spacing:.12em; font-size:11px; color:#c2bee9; } .workCard strong { font-size:clamp(20px,2.3vw,31px); line-height:1.08; letter-spacing:-.035em; }
        .process { border-top:1px solid var(--line); } ol { margin:46px 0 0; padding:0; list-style:none; } li { display:grid; grid-template-columns:100px 1fr; padding:19px 0; border-top:1px solid var(--line); font-size:clamp(20px,2.6vw,31px); letter-spacing:-.03em; } li span { color:var(--cyan); font-size:12px; letter-spacing:.1em; padding-top:8px; }
        .future { margin-bottom:100px; padding:56px; } .future h2 { margin-bottom:16px; } footer { display:flex; justify-content:space-between; color:var(--muted); font-size:13px; padding:0 0 42px; } footer a { color:white; text-decoration:none; font-weight:800; letter-spacing:.12em; }
        @media(max-width:720px) { .nav { height:66px; } .nav nav { display:none; } .nav .cta { padding:9px 12px; font-size:12px; } .hero { padding:92px 0 68px; } .section { padding:84px 0; } .split,.philosophy { grid-template-columns:1fr; gap:26px; } .principles,.workGrid { grid-template-columns:1fr; } .workCard { min-height:190px; } .statement,.future { padding:28px; } footer { gap:20px; flex-direction:column; } }
      `}</style>
    </main>
  );
}
