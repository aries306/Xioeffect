"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

type Phase = "arrival" | "name" | "story" | "intention" | "reveal";
type Workspace = { id: string; name?: string; context?: Record<string, unknown> };
type SpeechRecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEvent = { results: ArrayLike<SpeechRecognitionResult> };
type SpeechRecognitionError = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
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

const PHASES: Phase[] = ["arrival", "name", "story", "intention", "reveal"];
const GREETINGS = [
  "Oh… there you are. I've been waiting for you.",
  "I'm Vea. I'm glad you've arrived.",
  "Let's make this space mean something.",
];

function extractConcepts(text: string) {
  const stop = new Set(["about", "after", "again", "also", "because", "being", "could", "from", "have", "into", "just", "like", "make", "more", "that", "them", "there", "they", "this", "want", "with", "would", "your", "what", "when", "where", "which", "while", "will", "their", "really", "very", "some", "than", "then", "think", "need", "work", "working"]);
  const words = text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? [];
  const counts = new Map<string, number>();
  for (const word of words) if (!stop.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([word]) => word);
}

function speak(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-CA";
  utterance.rate = 0.94;
  utterance.pitch = 1.04;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((item) => /samantha|ava|jenny|victoria|karen/i.test(item.name))
    ?? voices.find((item) => /^en-CA/i.test(item.lang))
    ?? voices.find((item) => /^en(-|_)/i.test(item.lang));
  if (voice) utterance.voice = voice;
  utterance.onstart = onStart ?? null;
  utterance.onend = onEnd ?? null;
  utterance.onerror = onEnd ?? null;
  window.speechSynthesis.speak(utterance);
}

export default function ZunaArrivalExperience({ authenticated }: { authenticated: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [phase, setPhase] = useState<Phase>("arrival");
  const [name, setName] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [intention, setIntention] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [concepts, setConcepts] = useState<string[]>([]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(Recognition && "speechSynthesis" in window));
    if (!authenticated) return;
    let active = true;
    fetch("/api/workspace", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workspace unavailable");
        return response.json() as Promise<{ workspace?: Workspace }>;
      })
      .then((payload) => { if (active) setWorkspace(payload.workspace ?? null); })
      .catch(() => { if (active) setNotice("Your private workspace could not be connected. Refresh and try again."); });
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
    const points = Array.from({ length: 520 }, (_, index) => {
      const y = 1 - (index / 519) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = Math.PI * (3 - Math.sqrt(5)) * index;
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, phase: index * 0.13 };
    });
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const project = (x: number, y: number, z: number, yaw: number, pitch: number) => {
      const rx = x * Math.cos(yaw) - z * Math.sin(yaw);
      const rz = x * Math.sin(yaw) + z * Math.cos(yaw);
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
      const depthZ = y * Math.sin(pitch) + rz * Math.cos(pitch);
      const depth = 3.6 / (3.6 + depthZ);
      const scale = Math.min(width, height) * 0.285 * depth;
      return { x: width * 0.5 + rx * scale, y: height * 0.49 + ry * scale, depth };
    };
    const draw = () => {
      tick += reducedMotion ? 0 : 0.006;
      ctx.clearRect(0, 0, width, height);
      const yaw = tick * 0.34 + pointerX * 0.42;
      const pitch = 0.12 + pointerY * 0.24;
      const centerX = width * 0.5;
      const centerY = height * 0.49;
      const glow = ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, Math.max(width, height) * 0.46);
      glow.addColorStop(0, "rgba(145, 173, 255, .25)");
      glow.addColorStop(0.35, "rgba(133, 218, 235, .13)");
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const projected = points.map((point) => project(point.x * 1.06, point.y * 1.06, point.z * 1.06, yaw, pitch));
      ctx.lineWidth = 0.65;
      for (let index = 0; index < projected.length; index += 1) {
        const next = (index + 19) % projected.length;
        const a = projected[index];
        const b = projected[next];
        if (Math.hypot(a.x - b.x, a.y - b.y) < Math.min(width, height) * 0.105) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(111, 151, 231, ${0.045 + Math.min(a.depth, b.depth) * 0.10})`;
          ctx.stroke();
        }
      }
      projected.forEach((point, index) => {
        const pulse = reducedMotion ? 1 : 0.78 + Math.sin(tick * 8 + points[index].phase) * 0.22;
        const radius = (index % 13 === 0 ? 2.0 : 0.8) * point.depth * pulse;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = index % 11 === 0 ? `rgba(255, 172, 160, ${0.25 + point.depth * 0.55})` : index % 5 === 0 ? `rgba(78, 197, 211, ${0.24 + point.depth * 0.5})` : `rgba(117, 129, 224, ${0.18 + point.depth * 0.55})`;
        ctx.fill();
      });

      const coreRadius = Math.min(width, height) * (0.073 + (reducedMotion ? 0 : Math.sin(tick * 4) * 0.002));
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, coreRadius * 3.3);
      coreGlow.addColorStop(0, "rgba(255,255,255,.88)");
      coreGlow.addColorStop(0.16, "rgba(164,207,255,.56)");
      coreGlow.addColorStop(0.5, "rgba(145,151,255,.18)");
      coreGlow.addColorStop(1, "rgba(127,151,255,0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 3.3, 0, Math.PI * 2);
      ctx.fill();
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

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const say = useCallback((text: string) => {
    speak(text, () => setSpeaking(true), () => setSpeaking(false));
  }, []);

  const startListening = useCallback((target: "name" | "story" | "intention") => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice input is unavailable in this browser. You can type instead.");
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
      if (!transcript) return;
      if (target === "name") setName(transcript.slice(0, 80));
      if (target === "story") setIntroduction((current) => [current, transcript].filter(Boolean).join(" ").slice(0, 2000));
      if (target === "intention") setIntention((current) => [current, transcript].filter(Boolean).join(" ").slice(0, 2000));
    };
    recognition.onerror = (event) => {
      setListening(false);
      setNotice(event.error === "not-allowed" ? "Microphone permission was denied. Use the text field instead." : `Voice input stopped: ${event.error}.`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setNotice("Listening. Speak naturally.");
    } catch {
      setListening(false);
      setNotice("The microphone could not start. Check browser permissions.");
    }
  }, [listening]);

  function begin() {
    if (!authenticated) {
      window.location.href = "/sign-up?redirect_url=/";
      return;
    }
    setPhase("name");
    say(GREETINGS.join(" "));
  }

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setPhase("story");
    say(`It's good to meet you, ${name.trim()}. Before we begin, tell me a little about who you are and what matters to you.`);
  }

  function submitStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!introduction.trim()) return;
    setConcepts(extractConcepts(introduction));
    setPhase("intention");
    say("I'm beginning to see the shape of your world. What is one thing you want to create, change, solve, or move forward?");
  }

  async function submitIntention(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intention.trim() || !workspace?.id || busy) return;
    setBusy(true);
    setNotice("Bringing your context into your private Memory Fabric…");
    const capturedAt = new Date().toISOString();
    const provenance = {
      type: "user-provided",
      source: "zuna-five-minute-onboarding",
      capturedAt,
      interaction: "explicit-user-submission",
      consent: true,
      context: "first-session",
    };
    const memoryItems = [
      { text: `The user's name is ${name.trim()}.`, category: "identity", scope: { contexts: ["zuna-onboarding"], tags: ["identity", "onboarding"] } },
      { text: introduction.trim(), category: "personal_context", scope: { contexts: ["zuna-onboarding", "personal"], tags: ["introduction", "onboarding"] } },
      { text: intention.trim(), category: "goal", scope: { contexts: ["zuna-onboarding", "goals"], tags: ["intention", "onboarding"] } },
    ];
    try {
      const memoryResults = await Promise.all(memoryItems.map(async (item) => {
        const response = await fetch("/api/memory", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: workspace.id, text: item.text, category: item.category, confidence: 72, relevance: 82, scope: item.scope, provenance, confirmed: false }),
        });
        const payload = await response.json() as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "A memory could not be saved.");
        return true;
      }));
      const priorContext = workspace.context ?? {};
      const response = await fetch("/api/workspace", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          context: {
            ...priorContext,
            zunaOnboarding: {
              completedAt: capturedAt,
              version: 1,
              name: name.trim(),
              introduction: introduction.trim(),
              intention: intention.trim(),
              memoryCount: memoryResults.length,
            },
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        throw new Error(payload.error ?? "Your workspace context could not be updated.");
      }
      setSaved(true);
      setNotice("Your introduction and intention are now saved with their source and context. Vea is connecting the first thread.");
      try {
        const chatResponse = await fetch("/api/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `I'm meeting ${name.trim()}. Here is their self-introduction: ${introduction.trim()} Their current intention is: ${intention.trim()} Respond directly to them. Identify the strongest useful connection between who they are and what they want to do, then suggest one concrete first step. Do not invent biographical facts.`,
            workspaceId: workspace.id,
            context: { context: "zuna-onboarding", surface: "five-minute-wow", userAuthorized: true },
          }),
        });
        const payload = await chatResponse.json() as { answer?: string; error?: string };
        if (!chatResponse.ok) throw new Error(payload.error ?? "The first insight could not be generated.");
        setAnswer(payload.answer ?? "");
      } catch (error) {
        setNotice(error instanceof Error ? `Your context is saved. The first insight is not ready yet: ${error.message}` : "Your context is saved. The first insight is not ready yet.");
      }
      setPhase("reveal");
      say(`Thank you, ${name.trim()}. Your first context is in place. Let's see what we can build from here.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your onboarding could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const phaseIndex = PHASES.indexOf(phase);
  const activeTarget = phase === "name" ? "name" : phase === "story" ? "story" : "intention";
  const activeValue = phase === "name" ? name : phase === "story" ? introduction : intention;
  const conceptsToShow = concepts.length ? concepts : extractConcepts(`${introduction} ${intention}`);

  return (
    <main className="zuna-arrival">
      <canvas ref={canvasRef} className="zuna-particle-canvas" aria-hidden="true" />
      <div className="zuna-light-wash" aria-hidden="true" />
      <div className="zuna-depth-rings" aria-hidden="true"><i /><i /><i /></div>
      <header className="zuna-arrival-header">
        <Link href="/" className="zuna-arrival-brand" aria-label="Zuna home">
          <span className="zuna-brand-glyph">Z</span>
          <span><strong>ZUNA</strong><small>A LIVING INTELLIGENCE</small></span>
        </Link>
        <div className="zuna-header-center"><span className="zuna-online-dot" /> VEA IS HERE</div>
        <nav className="zuna-header-links">
          {authenticated ? <Link href="/atlas">Explore system ↗</Link> : <Link href="/sign-in">Sign in</Link>}
        </nav>
      </header>

      <section className={`zuna-arrival-stage phase-${phase}`}>
        <div className="zuna-stage-orb" aria-hidden="true">
          <div className="zuna-orb-halo" />
          <div className="zuna-orb-shell"><i /><i /><i /><span>V</span></div>
          <div className="zuna-orb-shadow" />
        </div>

        <div className="zuna-experience-card">
          <div className="zuna-card-topline">
            <span>YOUR FIRST FIVE MINUTES</span>
            <span>{phase === "arrival" ? "ARRIVAL" : `0${phaseIndex} / 04`}</span>
          </div>
          <div className="zuna-progress-track" aria-label={`Step ${phaseIndex + 1} of ${PHASES.length}`}>
            {PHASES.slice(1).map((item, index) => <i key={item} className={phaseIndex >= index + 1 ? "is-complete" : ""} />)}
          </div>

          {phase === "arrival" && <div className="zuna-phase-content zuna-phase-arrival">
            <p className="zuna-kicker">A DIFFERENT KIND OF BEGINNING</p>
            <h1>Oh… there you are.</h1>
            <p className="zuna-subtitle">I've been waiting for you.</p>
            <p className="zuna-body">I'm Vea. This is the beginning of your own living intelligence space. In the next few minutes, we'll give it a shape around what matters to you.</p>
            <button className="zuna-primary-button" type="button" onClick={begin}>{authenticated ? "Meet Vea" : "Begin your private space"} <span>↗</span></button>
            {!authenticated && <p className="zuna-privacy-note">Create your private space first. Your introduction will be saved only to your authenticated workspace.</p>}
            <button className="zuna-voice-link" type="button" onClick={() => say(GREETINGS.join(" "))} disabled={!voiceSupported}>{speaking ? "Vea is speaking…" : "Hear Vea speak"}</button>
          </div>}

          {phase === "name" && <div className="zuna-phase-content">
            <p className="zuna-kicker">01 · LET'S START WITH YOU</p>
            <h1>What should I call you?</h1>
            <p className="zuna-body">A name makes this space yours. You decide what to share.</p>
            <form className="zuna-entry-form" onSubmit={submitName}>
              <label htmlFor="zuna-name">YOUR NAME</label>
              <input id="zuna-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="given-name" placeholder="What do you go by?" autoFocus />
              <button className="zuna-primary-button" type="submit" disabled={!name.trim()}>Continue <span>→</span></button>
            </form>
            {voiceSupported && <button className="zuna-voice-link" type="button" onClick={() => startListening("name")}>{listening ? "Stop listening" : "Or say your name"}</button>}
          </div>}

          {phase === "story" && <div className="zuna-phase-content">
            <p className="zuna-kicker">02 · YOUR WORLD</p>
            <h1>Tell me who you are, {name.trim()}.</h1>
            <p className="zuna-body">What are you interested in? What are you working toward? What matters enough that you'd like it carried forward?</p>
            <form className="zuna-entry-form" onSubmit={submitStory}>
              <label htmlFor="zuna-introduction">YOUR INTRODUCTION</label>
              <textarea id="zuna-introduction" value={introduction} onChange={(event) => setIntroduction(event.target.value)} maxLength={2000} rows={4} placeholder="I'm someone who…" autoFocus />
              <button className="zuna-primary-button" type="submit" disabled={!introduction.trim()}>Let the space take shape <span>→</span></button>
            </form>
            {voiceSupported && <button className="zuna-voice-link" type="button" onClick={() => startListening("story")}>{listening ? "Stop listening" : "Speak your introduction"}</button>}
          </div>}

          {phase === "intention" && <div className="zuna-phase-content">
            <p className="zuna-kicker">03 · WHAT COMES NEXT</p>
            <h1>What do you want to make possible?</h1>
            <p className="zuna-body">Choose one meaningful direction. It can be a project, a problem, a decision, or a possibility you want to explore.</p>
            <form className="zuna-entry-form" onSubmit={submitIntention}>
              <label htmlFor="zuna-intention">YOUR FIRST INTENTION</label>
              <textarea id="zuna-intention" value={intention} onChange={(event) => setIntention(event.target.value)} maxLength={2000} rows={3} placeholder="I want to…" autoFocus />
              <button className="zuna-primary-button" type="submit" disabled={!intention.trim() || busy || !workspace?.id}>{busy ? "Connecting your context…" : "Bring Zuna to life"} <span>✦</span></button>
            </form>
            {voiceSupported && <button className="zuna-voice-link" type="button" onClick={() => startListening("intention")}>{listening ? "Stop listening" : "Speak your intention"}</button>}
            {!workspace?.id && <p className="zuna-privacy-note">Connecting your private workspace before saving…</p>}
          </div>}

          {phase === "reveal" && <div className="zuna-phase-content zuna-phase-reveal">
            <p className="zuna-kicker">04 · YOUR SPACE IS TAKING SHAPE</p>
            <h1>There’s a beginning here, {name.trim()}.</h1>
            <p className="zuna-body">Your introduction and first intention are saved in your private Memory Fabric with their source and onboarding context.</p>
            <div className="zuna-concept-cloud" aria-label="Concepts from your introduction">
              {conceptsToShow.map((concept, index) => <span key={concept} style={{ "--concept-index": index } as React.CSSProperties}>{concept}</span>)}
            </div>
            <div className="zuna-first-insight">
              <span>VEA'S FIRST RESPONSE</span>
              <p>{answer || "Your context is saved. Open your workspace to continue the conversation and develop your first insight."}</p>
            </div>
            <div className="zuna-reveal-actions">
              <Link className="zuna-primary-button" href="/app">Enter your Zuna space <span>↗</span></Link>
              <Link className="zuna-secondary-button" href="/atlas">Explore the system</Link>
            </div>
            <p className="zuna-privacy-note">{saved ? "3 context records saved · workspace context updated" : "Your private context is ready"}</p>
          </div>}

          {notice && <p className="zuna-status-message" role="status">{notice}</p>}
          <div className="zuna-card-footer"><span>CONTEXT BEFORE ASSUMPTION</span><span>MEMORY · CONNECTION · POSSIBILITY</span></div>
        </div>
      </section>

      <footer className="zuna-arrival-footer">
        <span>NOT A CHATBOT SKIN. A SPACE THAT GROWS WITH YOU.</span>
        <span>MEMORY IS USER-OWNED · PROVENANCE IS PRESERVED</span>
      </footer>
    </main>
  );
}
