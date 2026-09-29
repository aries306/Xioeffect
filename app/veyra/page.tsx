"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import "./veyra.css";

type Memory = {
  id: string;
  text: string;
  name: string;
  createdAt: number;
  color: string;
};

type Signal = {
  id: string;
  label: string;
  x: number;
  y: number;
  scale: number;
  hue: number;
};

const seedSignals: Signal[] = [
  { id: "seed-1", label: "unmade", x: 22, y: 31, scale: 1.1, hue: 192 },
  { id: "seed-2", label: "memory", x: 70, y: 25, scale: 0.72, hue: 275 },
  { id: "seed-3", label: "connection", x: 77, y: 68, scale: 1.35, hue: 44 },
  { id: "seed-4", label: "becoming", x: 30, y: 73, scale: 0.9, hue: 330 }
];

const words = ["Auralith", "Nymora", "Velin", "Orthea", "Caelis", "Thyra", "Oryn"];

function makeName(text: string) {
  const clean = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  const source = clean.split(/\s+/).filter(Boolean);
  const a = source[0] ? source[0].slice(0, 3) : words[Math.floor(Math.random() * words.length)].slice(0, 3);
  const b = source[source.length - 1] ? source[source.length - 1].slice(-3) : words[Math.floor(Math.random() * words.length)].slice(-3);
  return (a.charAt(0).toUpperCase() + a.slice(1) + b).slice(0, 12);
}

function hashHue(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export default function VeyraPage() {
  const [entered, setEntered] = useState(false);
  const [thought, setThought] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [signals, setSignals] = useState<Signal[]>(seedSignals);
  const [pulse, setPulse] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [status, setStatus] = useState("The world is listening.");
  const [selected, setSelected] = useState<Memory | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("veyra.memories");
      if (raw) setMemories(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("veyra.memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    if (!entered) return;
    const id = window.setInterval(() => setPulse(function(p) { return p + 1; }), 2400);
    return () => window.clearInterval(id);
  }, [entered]);

  const constellation = useMemo(() => {
    const memorySignals = memories.map(function(m, i) {
      return {
        id: m.id,
        label: m.name,
        x: 42 + ((i * 19 + hashHue(m.text)) % 48),
        y: 18 + ((i * 29 + hashHue(m.name)) % 64),
        scale: 0.55 + ((i + 1) % 4) * 0.18,
        hue: Number(m.color)
      };
    });
    return signals.concat(memorySignals);
  }, [signals, memories]);

  function createReality(value: string) {
    const text = value.trim();
    if (!text) return;
    const name = makeName(text);
    const hue = hashHue(text);
    const memory: Memory = {
      id: crypto.randomUUID(),
      text: text,
      name: name,
      createdAt: Date.now(),
      color: String(hue)
    };
    setMemories(function(m) { return [memory].concat(m).slice(0, 24); });
    setSignals(function(s) {
      return s.concat([{
        id: memory.id,
        label: name,
        x: 20 + ((hue * 7) % 62),
        y: 18 + ((hue * 11) % 65),
        scale: 0.75 + (hue % 7) / 10,
        hue: hue
      }]);
    });
    setThought("");
    setPulse(function(p) { return p + 1; });
    setStatus("Vael has given “" + name + "” a place to exist.");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    createReality(thought);
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setStatus("Voice perception is unavailable in this browser.");
      return;
    }
    if (voiceOn) {
      recognitionRef.current?.stop();
      setVoiceOn(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = function() {
      setVoiceOn(true);
      setStatus("Oryn is perceiving your voice.");
    };
    recognition.onresult = function(event: any) {
      let value = "";
      for (let i = event.resultIndex; i < event.results.length; i++) value += event.results[i][0].transcript;
      setThought(value);
    };
    recognition.onend = function() {
      setVoiceOn(false);
      setStatus("The world is listening.");
    };
    recognition.onerror = function() {
      setVoiceOn(false);
      setStatus("The signal faded before Veyra could hold it.");
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  if (!entered) {
    return (
      <main className="veyra-intro">
        <div className="intro-noise" />
        <div className="intro-orbit orbit-a" />
        <div className="intro-orbit orbit-b" />
        <div className="intro-core" />
        <div className="intro-copy">
          <div className="eyebrow">A LIVING INTELLIGENT REALITY</div>
          <h1>VEYRA</h1>
          <p>Nothing here is finished.</p>
          <button onClick={function() { setEntered(true); }}>Enter</button>
        </div>
      </main>
    );
  }

  return (
    <main className="veyra-world" style={{ ["--pulse" as any]: pulse }}>
      <div className="world-sky" />
      <div className="world-grid" />
      <div className="world-horizon" />
      <div className="world-veil" />

      {constellation.map(function(s) {
        return (
          <button
            key={s.id}
            className="signal"
            aria-label={s.label}
            onClick={function() {
              const found = memories.find(function(m) { return m.id === s.id; });
              if (found) {
                setSelected(found);
                setStatus("Elyth remembers: “" + found.text + "”");
              } else {
                setStatus("Thren detected a dormant relationship: " + s.label + ".");
              }
            }}
            style={{
              left: s.x + "%",
              top: s.y + "%",
              ["--h" as any]: s.hue,
              ["--s" as any]: s.scale,
              animationDelay: "-" + ((s.hue % 11) * 0.4) + "s"
            }}
          >
            <span className="signal-ring" />
            <span className="signal-core" />
            <span className="signal-label">{s.label}</span>
          </button>
        );
      })}

      <header className="veyra-header">
        <div className="mark">VEYRA</div>
        <div className="state"><span /> {status}</div>
        <button className="quiet-button" onClick={function() { setEntered(false); }}>Leave</button>
      </header>

      <section className="world-center">
        <div className="monolith">
          <div className="monolith-inner" />
          <div className="monolith-cut" />
        </div>
        <div className="center-caption">
          <span>ORYN / THREN / VAEL</span>
          <strong>The world is becoming.</strong>
        </div>
      </section>

      <form className="thought-interface" onSubmit={submit}>
        <div className="interface-line">
          <span className="interface-dot" />
          <input
            value={thought}
            onChange={function(e) { setThought(e.target.value); }}
            placeholder="Bring something unfinished into existence…"
            aria-label="Bring something unfinished into existence"
          />
          <button type="button" className={voiceOn ? "voice active" : "voice"} onClick={toggleVoice} aria-label="Speak">◉</button>
          <button type="submit" className="release" disabled={!thought.trim()}>Release</button>
        </div>
        <div className="microcopy">Your thought is not answered. It is given a place.</div>
      </form>

      {selected && (
        <aside className="memory-card">
          <button onClick={function() { setSelected(null); }} className="close">×</button>
          <span>ELYTH / SPATIAL MEMORY</span>
          <h2>{selected.name}</h2>
          <p>“{selected.text}”</p>
          <small>This place exists because you brought it here.</small>
        </aside>
      )}

      <footer className="world-footer">
        <span>{String(memories.length).padStart(2, "0")} memories held</span>
        <span>·</span>
        <span>no menus / no map / no finish state</span>
      </footer>
    </main>
  );
}
