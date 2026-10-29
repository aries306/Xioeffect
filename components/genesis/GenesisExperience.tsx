"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type GenesisExperienceProps = { authenticated?: boolean };
type WorkspacePayload = {
  workspace?: { id: string; name: string; context?: Record<string, unknown> };
  goals?: Array<{ id: string; title: string; progress?: number; status?: string }>;
};
type ChatPayload = { answer?: string; conversationId?: string; recommendation?: string | null; evidence?: Array<{ id: string; text: string; category?: string; confidence?: number; provenance?: unknown }>; error?: string };

const constellation = [
  { id: "focus", label: "Current focus", hint: "What matters now", x: 50, y: 28, tone: "core" },
  { id: "memory", label: "Memory", hint: "Context that carries forward", x: 23, y: 48, tone: "violet" },
  { id: "research", label: "Research", hint: "Evidence and discovery", x: 76, y: 45, tone: "cyan" },
  { id: "ideas", label: "Ideas", hint: "Connections taking shape", x: 35, y: 72, tone: "violet" },
  { id: "outcomes", label: "Outcomes", hint: "Where insight can lead", x: 68, y: 72, tone: "mint" },
];

export default function GenesisExperience({ authenticated = false }: GenesisExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [workspace, setWorkspace] = useState<WorkspacePayload["workspace"]>();
  const [goals, setGoals] = useState<WorkspacePayload["goals"]>([]);
  const [selectedNode, setSelectedNode] = useState("focus");
  const [answer, setAnswer] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [evidence, setEvidence] = useState<ChatPayload["evidence"]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [conversationId, setConversationId] = useState<string>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let tick = 0;
    const stars = Array.from({ length: 170 }, (_, index) => ({
      x: Math.random(), y: Math.random(), radius: Math.random() * 1.25 + 0.2,
      phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.007 + 0.002,
      drift: (Math.random() - 0.5) * 0.00018, index,
    }));
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = () => {
      tick += reducedMotion ? 0 : 1;
      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * 0.5, height * 0.43, 4, width * 0.5, height * 0.43, Math.max(width, height) * 0.55);
      glow.addColorStop(0, "rgba(71, 65, 151, .17)");
      glow.addColorStop(0.46, "rgba(18, 32, 77, .10)");
      glow.addColorStop(1, "rgba(2, 4, 14, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      for (const star of stars) {
        if (!reducedMotion) star.x = (star.x + star.drift + 1) % 1;
        const pulse = reducedMotion ? 0.72 : 0.42 + (Math.sin(tick * star.speed + star.phase) + 1) * 0.28;
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(205, 218, 255, ${pulse})`;
        context.fill();
      }
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };
    resize();
    draw();
    if (reducedMotion) return () => window.removeEventListener("resize", resize);
    window.addEventListener("resize", resize);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    fetch("/api/workspace", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Your workspace could not be loaded.");
        return response.json() as Promise<WorkspacePayload>;
      })
      .then((data) => {
        if (!active) return;
        setWorkspace(data.workspace);
        setGoals(data.goals ?? []);
      })
      .catch(() => {
        if (active) setNotice("Your universe is visible, but the workspace connection needs attention.");
      });
    return () => { active = false; };
  }, [authenticated]);

  const submitThought = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const thought = message.trim();
    if (!thought || busy) return;
    if (!authenticated || !workspace?.id) {
      setNotice("Sign in to connect your thought to your private intelligence workspace.");
      return;
    }
    setBusy(true);
    setNotice("The Core is considering your thought…");
    setRecommendation("");
    setEvidence([]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: thought, workspaceId: workspace.id, conversationId }),
      });
      const data = (await response.json()) as ChatPayload;
      if (!response.ok) {
        if (response.status === 401) throw new Error("Your session has expired. Sign in again to continue.");
        throw new Error(data.error || "The Core could not complete that request.");
      }
      setAnswer(data.answer ?? "Your thought has been received.");
      setConversationId(data.conversationId);
      setRecommendation(data.recommendation ?? "");
      setEvidence(data.evidence ?? []);
      setSelectedNode("focus");
      setMessage("");
      setNotice("A response is ready. Review its supporting context before acting.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something interrupted the connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [authenticated, busy, conversationId, message, workspace?.id]);

  const selected = constellation.find((node) => node.id === selectedNode) ?? constellation[0];

  return (
    <main className="genesis-shell">
      <canvas ref={canvasRef} className="genesis-stars" aria-hidden="true" />
      <div className="genesis-nebula" aria-hidden="true" />
      <div className="genesis-vignette" aria-hidden="true" />
      <header className="genesis-topbar">
        <a className="genesis-brand" href="/" aria-label="ZIO Genesis home">
          <span className="genesis-mark" aria-hidden="true"><i /></span>
          <span><strong>ZIO</strong><small>GENESIS</small></span>
        </a>
        <div className="genesis-top-status"><span className="genesis-status-dot" /> {authenticated ? (workspace?.name ?? "Private universe") : "A living intelligent reality"}</div>
        <nav className="genesis-nav" aria-label="Account">
          {authenticated ? <a className="genesis-nav-link" href="/app">Enter universe <span aria-hidden="true">↗</span></a> : <><a className="genesis-nav-link" href="/sign-in">Sign in</a><a className="genesis-nav-cta" href="/sign-up">Begin</a></>}
        </nav>
      </header>

      <section className="genesis-stage" aria-label="ZIO living universe">
        <div className="genesis-orbit genesis-orbit-one" aria-hidden="true" />
        <div className="genesis-orbit genesis-orbit-two" aria-hidden="true" />
        <svg className="genesis-links" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="genesis-link" x1="0" x2="1"><stop offset="0%" stopColor="#8e80ff" stopOpacity=".05" /><stop offset="50%" stopColor="#9b9aff" stopOpacity=".42" /><stop offset="100%" stopColor="#52e5f4" stopOpacity=".08" /></linearGradient></defs>
          <path d="M500 182 Q360 180 230 310" /><path d="M500 182 Q650 180 760 292" /><path d="M230 310 Q270 420 350 468" /><path d="M760 292 Q720 412 680 468" /><path d="M350 468 Q510 520 680 468" />
        </svg>
        <div className="genesis-intro">
          <p className="genesis-eyebrow"><span /> YOUR THOUGHTS, CONNECTED</p>
          <h1>There you are<span>.</span></h1>
          <p className="genesis-subtitle">Bring me the thought.<br /><em>Let’s see what it could become.</em></p>
        </div>

        <div className="genesis-core-wrap" aria-label="Intelligence Core">
          <div className="genesis-core-halo genesis-halo-back" />
          <div className="genesis-core-halo genesis-halo-front" />
          <div className="genesis-core">
            <div className="genesis-core-inner"><span className="genesis-core-star">✦</span></div>
          </div>
          <span className="genesis-core-label">THE CORE</span>
        </div>

        {constellation.map((node) => (
          <button
            key={node.id}
            type="button"
            className={`genesis-node genesis-node-${node.tone} ${selectedNode === node.id ? "is-selected" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => setSelectedNode(node.id)}
            aria-pressed={selectedNode === node.id}
          >
            <span className="genesis-node-orb" />
            <span className="genesis-node-copy"><strong>{node.label}</strong><small>{node.hint}</small></span>
          </button>
        ))}

        <aside className="genesis-focus-card" aria-live="polite">
          <p className="genesis-eyebrow">CURRENT FOCUS</p>
          <h2>{selected.label}</h2>
          <p>{selected.id === "focus" ? (answer ? "Your latest thought is here, ready to explore." : "Start with whatever is on your mind. The universe will take shape around it.") : selected.hint + ". This area becomes meaningful as your workspace builds context."}</p>
          {selected.id === "memory" && authenticated && <div className="genesis-card-stat"><strong>{evidence?.length ?? 0}</strong><span>context items in latest response</span></div>}
          {selected.id === "outcomes" && authenticated && <div className="genesis-card-stat"><strong>{goals?.length ?? 0}</strong><span>goals in your workspace</span></div>}
        </aside>

        <div className="genesis-input-dock">
          {answer && <div className="genesis-answer">
            <div className="genesis-answer-header"><span className="genesis-status-dot" /> RESPONSE FROM THE CORE</div>
            <p>{answer}</p>
            {recommendation && <div className="genesis-recommendation"><span>INSIGHT</span><strong>{recommendation}</strong></div>}
            {evidence && evidence.length > 0 && <details className="genesis-evidence"><summary>View supporting context ({evidence.length})</summary>{evidence.map((item) => <p key={item.id}>{item.text}<small>{item.category ? ` · ${item.category}` : ""}{typeof item.confidence === "number" ? ` · ${item.confidence}% confidence` : ""}</small></p>)}</details>}
          </div>}
          <form className="genesis-prompt" onSubmit={submitThought}>
            <span className="genesis-prompt-symbol" aria-hidden="true">✧</span>
            <label className="genesis-sr-only" htmlFor="genesis-thought">What’s on your mind?</label>
            <textarea
              id="genesis-thought"
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={authenticated ? "What are you building, solving, deciding, or trying to understand?" : "What’s on your mind?"}
              rows={2}
              maxLength={8000}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
            />
            <button className="genesis-send" type="submit" disabled={busy || !message.trim()} aria-label="Send thought">{busy ? <span className="genesis-spinner" /> : <span aria-hidden="true">↗</span>}</button>
          </form>
          <div className="genesis-dock-footer"><span>{authenticated ? "Private workspace · contextual intelligence" : "A space for your next possibility"}</span><span>ENTER TO SEND · SHIFT + ENTER FOR A NEW LINE</span></div>
          {notice && <p className="genesis-notice" role="status">{notice}{!authenticated && notice.startsWith("Sign in") ? <> <a href="/sign-in">Sign in →</a></> : null}</p>}
        </div>
      </section>
      <footer className="genesis-footer"><span>INTELLIGENCE, IN MOTION</span><span>Memory · Research · Connection · Possibility</span></footer>
    </main>
  );
}
