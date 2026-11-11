"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";

type Workspace = { id: string; name?: string };
type ChatMessage = { role: "user" | "assistant"; text: string };
type Module = {
  id: string;
  label: string;
  description: string;
  status: "connected" | "foundation" | "architecture";
  x: number;
  y: number;
  color: string;
};

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; 0: RecognitionAlternative };
type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const subscribeToVoiceSupport = () => () => {};
const getVoiceSupportSnapshot = () => typeof window !== "undefined" && Boolean((window.SpeechRecognition ?? window.webkitSpeechRecognition) && "speechSynthesis" in window);
const getServerVoiceSupportSnapshot = () => false;

const MODULES: Module[] = [
  { id: "memory", label: "Memory", description: "User-owned context that can persist, become dormant, and return when relevant.", status: "connected", x: 18, y: 38, color: "violet" },
  { id: "research", label: "Research", description: "Source-backed evidence from connected repositories and external sources.", status: "connected", x: 80, y: 34, color: "cyan" },
  { id: "avenne", label: "Avenne", description: "Reasoning over eligible evidence before producing a response or recommendation.", status: "foundation", x: 50, y: 16, color: "gold" },
  { id: "nexus", label: "NEXUS", description: "Ingestion events and downstream processing, kept separate from memory.", status: "foundation", x: 83, y: 68, color: "blue" },
  { id: "goals", label: "Goals", description: "Intentions and outcomes that give current context direction.", status: "foundation", x: 19, y: 72, color: "mint" },
  { id: "learning", label: "Learning", description: "User-governed feedback and re-evaluation over time.", status: "architecture", x: 50, y: 82, color: "pink" },
  { id: "insights", label: "Insights", description: "Derived interpretations that retain their evidence and uncertainty.", status: "architecture", x: 67, y: 50, color: "gold" },
  { id: "trust", label: "Trust", description: "Consent, permissions, provenance, evaluation and auditability.", status: "foundation", x: 33, y: 51, color: "violet" },
];

function statusLabel(status: Module["status"]) {
  if (status === "connected") return "API surface";
  if (status === "foundation") return "Foundation";
  return "Architecture";
}

function pickVoice(voices: SpeechSynthesisVoice[]) {
  const preferred = ["Samantha", "Ava", "Jenny", "Victoria", "Karen", "Google UK English Female", "Microsoft Jenny", "Microsoft Ava"];
  return voices.find((voice) => preferred.some((name) => voice.name.toLowerCase().includes(name.toLowerCase())))
    ?? voices.find((voice) => /^en-CA/i.test(voice.lang))
    ?? voices.find((voice) => /^en(-|_)/i.test(voice.lang))
    ?? voices[0];
}

export default function XIOAtlasExperience({ authenticated }: { authenticated: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState("memory");
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [researchCount, setResearchCount] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "I’m here. You can speak or type. We’ll work from your current context, and I’ll keep the supporting evidence visible." },
  ]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceSupported = useSyncExternalStore(subscribeToVoiceSupport, getVoiceSupportSnapshot, getServerVoiceSupportSnapshot);
  const [notice, setNotice] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const activeModule = MODULES.find((module) => module.id === selected) ?? MODULES[0];

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    fetch("/api/workspace", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workspace unavailable");
        return response.json() as Promise<{ workspace?: Workspace }>;
      })
      .then((payload) => {
        if (!active) return;
        setWorkspace(payload.workspace ?? null);
        setWorkspaceReady(Boolean(payload.workspace?.id));
      })
      .catch(() => {
        if (active) setNotice("Your private workspace could not be loaded. Refresh your session and try again.");
      });
    fetch("/api/memory", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("memory")))
      .then((payload: { memories?: unknown[] }) => { if (active) setMemoryCount(payload.memories?.length ?? 0); })
      .catch(() => { if (active) setMemoryCount(null); });
    fetch("/api/nexus/research", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("research")))
      .then((payload: { records?: unknown[] }) => { if (active) setResearchCount(payload.records?.length ?? 0); })
      .catch(() => { if (active) setResearchCount(null); });
    return () => { active = false; };
  }, [authenticated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let tick = 0;
    let pointerX = 0;
    let pointerY = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const stars = Array.from({ length: 230 }, () => ({
      x: (Math.random() - 0.5) * 2.6,
      y: (Math.random() - 0.5) * 2.1,
      z: Math.random() * 2.2 + 0.15,
      r: Math.random() * 1.35 + 0.25,
      phase: Math.random() * Math.PI * 2,
    }));
    const particles = Array.from({ length: 180 }, (_, index) => {
      const y = 1 - (index / 179) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = Math.PI * (3 - Math.sqrt(5)) * index;
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    });
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const project = (x: number, y: number, z: number, yaw: number, pitch: number) => {
      const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
      const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
      const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
      const depth = 3.8 / (3.8 + z2);
      return { x: width * 0.5 + x1 * Math.min(width, height) * 0.31 * depth, y: height * 0.49 + y1 * Math.min(width, height) * 0.31 * depth, depth };
    };
    const draw = () => {
      tick += reducedMotion ? 0 : 0.006;
      ctx.clearRect(0, 0, width, height);
      const yaw = tick * 0.52 + pointerX * 0.38;
      const pitch = 0.16 + pointerY * 0.22;
      const centerGlow = ctx.createRadialGradient(width * 0.5, height * 0.48, 8, width * 0.5, height * 0.48, Math.max(width, height) * 0.52);
      centerGlow.addColorStop(0, "rgba(115, 94, 255, .19)");
      centerGlow.addColorStop(0.48, "rgba(32, 75, 120, .08)");
      centerGlow.addColorStop(1, "rgba(4, 8, 22, 0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      for (const star of stars) {
        const p = project(star.x, star.y, star.z - 1.1, yaw * 0.18, pitch * 0.12);
        const alpha = reducedMotion ? 0.5 : 0.22 + (Math.sin(tick * 28 + star.phase) + 1) * 0.23;
        ctx.beginPath();
        ctx.arc(p.x, p.y, star.r * p.depth, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(205, 221, 255, ${alpha})`;
        ctx.fill();
      }

      const shell = particles.map((point) => project(point.x * 1.12, point.y * 1.12, point.z * 1.12, yaw, pitch));
      ctx.lineWidth = 0.55;
      for (let i = 0; i < shell.length; i += 1) {
        const next = (i + 11) % shell.length;
        const a = shell[i];
        const b = shell[next];
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < Math.min(width, height) * 0.18) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(151, 159, 255, ${0.035 + Math.min(a.depth, b.depth) * 0.1})`;
          ctx.stroke();
        }
      }
      shell.forEach((point, index) => {
        const alpha = 0.12 + point.depth * 0.48;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 0.7 + point.depth * (index % 9 === 0 ? 2.1 : 0.85), 0, Math.PI * 2);
        ctx.fillStyle = index % 7 === 0 ? `rgba(115, 229, 238, ${alpha})` : `rgba(184, 173, 255, ${alpha})`;
        ctx.fill();
      });

      const core = project(0, 0, 0, yaw, pitch);
      const pulse = reducedMotion ? 1 : 1 + Math.sin(tick * 24) * 0.035;
      const radius = Math.min(width, height) * 0.105 * pulse;
      const halo = ctx.createRadialGradient(core.x, core.y, radius * 0.08, core.x, core.y, radius * 2.8);
      halo.addColorStop(0, "rgba(168, 161, 255, .30)");
      halo.addColorStop(0.35, "rgba(99, 130, 255, .12)");
      halo.addColorStop(1, "rgba(74, 113, 240, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(core.x, core.y, radius * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(core.x, core.y, radius, 0, Math.PI * 2);
      const coreFill = ctx.createRadialGradient(core.x - radius * 0.28, core.y - radius * 0.35, 1, core.x, core.y, radius);
      coreFill.addColorStop(0, "rgba(236, 239, 255, .96)");
      coreFill.addColorStop(0.22, "rgba(163, 169, 255, .88)");
      coreFill.addColorStop(0.68, "rgba(91, 104, 205, .72)");
      coreFill.addColorStop(1, "rgba(35, 47, 105, .12)");
      ctx.fillStyle = coreFill;
      ctx.fill();
      ctx.strokeStyle = "rgba(220, 225, 255, .62)";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    canvas.addEventListener("pointermove", onPointer);
    window.addEventListener("resize", resize);
    resize();
    draw();
    return () => {
      window.cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speakResponse = useCallback((text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "en-CA";
    utterance.rate = 0.94;
    utterance.pitch = 1.02;
    const voice = pickVoice(window.speechSynthesis.getVoices());
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const sendMessage = useCallback(async (raw: string, spoken = false) => {
    const text = raw.trim();
    if (!text || busy) return;
    if (!authenticated) {
      window.location.href = "/sign-in?redirect_url=/atlas";
      return;
    }
    if (!workspace?.id) {
      setNotice("Your workspace is still connecting. Try again in a moment.");
      return;
    }
    setBusy(true);
    setNotice("EXelta is considering your thought…");
    setMessages((current) => [...current, { role: "user", text }]);
    setDraft("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          workspaceId: workspace.id,
          conversationId,
          context: { context: "zuna-atlas", surface: "voice-and-text" },
        }),
      });
      const payload = await response.json() as { answer?: string; conversationId?: string; error?: string; recommendation?: string | null };
      if (!response.ok) throw new Error(payload.error ?? "EXelta could not complete that request.");
      const answer = payload.answer ?? "I received your thought.";
      setConversationId(payload.conversationId);
      setMessages((current) => [...current, { role: "assistant", text: answer }]);
      setNotice(payload.recommendation ? `Response ready · ${payload.recommendation}` : "Response ready. Review context before acting.");
      if (spoken) speakResponse(answer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The connection was interrupted.";
      setNotice(message);
      setMessages((current) => [...current, { role: "assistant", text: `I couldn't complete that request: ${message}` }]);
    } finally {
      setBusy(false);
    }
  }, [authenticated, busy, conversationId, speakResponse, workspace]);

  const startListening = useCallback(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice input is not supported in this browser. You can still type to EXelta.");
      return;
    }
    if (!authenticated) {
      window.location.href = "/sign-in?redirect_url=/atlas";
      return;
    }
    if (!workspace?.id) {
      setNotice("Wait for your private workspace to connect before starting voice.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-CA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).filter((result) => result.isFinal).map((result) => result[0].transcript).join(" ").trim();
      if (transcript) void sendMessage(transcript, voiceEnabled);
    };
    recognition.onerror = (event) => {
      setListening(false);
      setNotice(event.error === "not-allowed" ? "Microphone permission was denied. Allow microphone access or use text." : `Voice input stopped: ${event.error}. You can continue by typing.`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setNotice("Listening. Speak naturally; select the microphone again to stop.");
    } catch {
      setListening(false);
      setNotice("The microphone could not start. Check browser permission and try again.");
    }
  }, [authenticated, listening, sendMessage, voiceEnabled, workspace]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft, voiceEnabled);
  }

  return (
    <main className="zuna-atlas">
      <header className="atlas-topbar">
        <Link href="/" className="atlas-brand" aria-label="Exelta home">
          <span className="atlas-brand-mark">Z</span>
          <span><strong>EXELTA</strong><small>INTELLIGENCE ENVIRONMENT</small></span>
        </Link>
        <div className="atlas-top-center"><span className="atlas-live-dot" /> SYSTEM ATLAS <span className="atlas-top-divider">/</span> SPATIAL PREVIEW</div>
        <nav className="atlas-top-nav" aria-label="Main navigation">
          <Link href="/sanctum">Sanctum</Link>
          <Link href="/app">Workspace <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="atlas-heading">
        <div>
          <p className="atlas-eyebrow">A MAP OF THE LIVING SYSTEM</p>
          <h1>Everything connected.<br /><em>Nothing assumed.</em></h1>
        </div>
        <p className="atlas-heading-copy">Explore Exelta’s cognitive architecture, see what is connected, and speak with the intelligence layer. This map separates live application surfaces from foundations and future architecture.</p>
      </section>

      <section className="atlas-grid">
        <aside className="atlas-sidebar">
          <p className="atlas-label">SYSTEM LAYERS</p>
          {MODULES.map((module) => (
            <button key={module.id} className={`atlas-sidebar-item ${selected === module.id ? "is-active" : ""}`} onClick={() => setSelected(module.id)} type="button">
              <span className={`atlas-sidebar-dot tone-${module.color}`} />
              <span>{module.label}</span>
              <small>{statusLabel(module.status)}</small>
            </button>
          ))}
          <div className="atlas-sidebar-foot">
            <span>CONTEXTUAL MEMORY</span>
            <p>Retrieved evidence is re-evaluated before it can influence a response.</p>
          </div>
        </aside>

        <section className="atlas-universe" aria-label="Interactive spatial system map">
          <canvas ref={canvasRef} className="atlas-cosmos" aria-hidden="true" />
          <div className="atlas-universe-grid" aria-hidden="true" />
          <div className="atlas-orbit atlas-orbit-a" aria-hidden="true" />
          <div className="atlas-orbit atlas-orbit-b" aria-hidden="true" />
          <div className="atlas-core-caption"><span>THE CORE</span><small>context · evidence · reasoning</small></div>
          {MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`atlas-node tone-${module.color} ${selected === module.id ? "is-selected" : ""}`}
              style={{ "--node-x": `${module.x}%`, "--node-y": `${module.y}%` } as React.CSSProperties}
              onClick={() => setSelected(module.id)}
              aria-pressed={selected === module.id}
            >
              <span className="atlas-node-orb" />
              <span className="atlas-node-copy"><strong>{module.label}</strong><small>{statusLabel(module.status)}</small></span>
            </button>
          ))}
          <div className="atlas-universe-note"><span>DRAG / MOVE</span> The field responds to your movement.</div>
        </section>

        <aside className="atlas-inspector">
          <div className="atlas-inspector-head"><span className="atlas-label">SELECTED LAYER</span><span className={`atlas-status-chip status-${activeModule.status}`}>{statusLabel(activeModule.status)}</span></div>
          <div className={`atlas-inspector-symbol tone-${activeModule.color}`}>{activeModule.label.slice(0, 1)}</div>
          <h2>{activeModule.label}</h2>
          <p className="atlas-inspector-description">{activeModule.description}</p>
          {activeModule.id === "memory" && <div className="atlas-metric"><strong>{memoryCount === null ? "—" : memoryCount}</strong><span>records returned by Memory API</span></div>}
          {activeModule.id === "research" && <div className="atlas-metric"><strong>{researchCount === null ? "—" : researchCount}</strong><span>records returned by Research API</span></div>}
          <div className="atlas-inspector-rule" />
          <p className="atlas-label">INFLUENCE RULE</p>
          <p className="atlas-rule-copy">Only evidence that passes provenance, scope, freshness, confidence and relevance evaluation may influence reasoning.</p>
          <div className="atlas-principle-list">
            <span><i /> Provenance before trust</span>
            <span><i /> Context before retrieval</span>
            <span><i /> Evaluation before influence</span>
          </div>
          <Link href="/sanctum" className="atlas-text-link">Open Sanctum experience <span>↗</span></Link>
        </aside>
      </section>

      <section className="atlas-voice-section" aria-label="Voice conversation with Exelta">
        <div className="atlas-voice-intro">
          <p className="atlas-eyebrow">VOICE-TO-VOICE INTERFACE</p>
          <h2>Talk to EXelta.<br /><em>Hear the response.</em></h2>
          <p>Speak into your microphone and EXelta will send the transcript through the authenticated chat API, then speak the response aloud when voice mode is enabled. Text remains available as a fallback.</p>
          <div className="atlas-voice-controls">
            <button type="button" className={`atlas-mic-button ${listening ? "is-listening" : ""}`} onClick={startListening} disabled={busy || !voiceSupported}>
              <span>{listening ? "Ⅱ" : "◉"}</span>{listening ? "Stop listening" : "Start speaking"}
            </button>
            <button type="button" className={`atlas-voice-toggle ${voiceEnabled ? "is-on" : ""}`} onClick={() => { if (voiceEnabled) stopSpeaking(); setVoiceEnabled((value) => !value); }}>
              <span className="atlas-toggle-track"><i /></span> Voice replies {voiceEnabled ? "on" : "off"}
            </button>
          </div>
          <p className="atlas-voice-note">{!authenticated ? "Sign in to connect voice conversation to your private workspace." : !workspaceReady ? "Connecting your private workspace…" : voiceSupported ? "Browser speech recognition and speech synthesis detected · English (Canada)" : "Voice APIs are unavailable in this browser. Text conversation remains available."}</p>
        </div>

        <div className="atlas-chat-card">
          <div className="atlas-chat-head">
            <div className={`atlas-chat-orb ${listening || speaking ? "is-active" : ""}`}><span /></div>
            <div><strong>Exelta · Zioren intelligence</strong><small>{listening ? "Listening to you" : speaking ? "Speaking response" : busy ? "Thinking" : "Ready for conversation"}</small></div>
            {speaking && <button type="button" className="atlas-stop-button" onClick={stopSpeaking}>Stop audio</button>}
          </div>
          <div className="atlas-chat-messages" aria-live="polite">
            {messages.slice(-5).map((message, index) => (
              <article className={`atlas-message message-${message.role}`} key={`${index}-${message.text.slice(0, 18)}`}>
                <span>{message.role === "assistant" ? "EXELTA" : "YOU"}</span><p>{message.text}</p>
              </article>
            ))}
            {busy && <div className="atlas-thinking"><i /><i /><i /> EXelta is considering…</div>}
          </div>
          <form className="atlas-chat-form" onSubmit={submit}>
            <label className="atlas-sr-only" htmlFor="atlas-draft">Message EXelta</label>
            <textarea id="atlas-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Speak or write what’s on your mind…" rows={2} maxLength={8000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">↗</button>
          </form>
          {notice && <p className="atlas-chat-notice" role="status">{notice}</p>}
          <div className="atlas-chat-foot"><span>{authenticated ? (workspace?.name ?? "Private workspace") : "Authentication required"}</span><span>VOICE + TEXT</span></div>
        </div>
      </section>

      <footer className="atlas-footer"><span>EXELTA SYSTEM ATLAS</span><span>Memory · Research · Context · Reasoning · Outcomes</span><span>PREVIEW — NOT A PRODUCTION RELEASE</span></footer>
    </main>
  );
}
