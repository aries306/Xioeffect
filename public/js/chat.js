/* Veyron conversational surface. The browser owns presentation; authenticated reasoning and memory stay server-side. */
"use strict";

const VEYRON_CHAT = (() => {
  const { esc } = XIO_UTILS;
  const E = () => XIO_ENGINE;
  let busy = false;
  let greetedOnce = false;
  let conversationId = null;
  let workspaceId = null;
  let voiceEnabled = false;
  let recognition = null;

  const els = () => ({
    thread: document.getElementById("chat-thread"),
    form: document.getElementById("chat-form"),
    field: document.getElementById("chat-field"),
    suggest: document.getElementById("chat-suggest")
  });

  function speak(text) {
    if (!voiceEnabled || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-CA";
    utterance.rate = .96;
    utterance.pitch = 1.08;
    const voices = window.speechSynthesis.getVoices();
    const preferred = ["Ava","Samantha","Victoria","Karen","Jenny","Zira","Google UK English Female","Microsoft Jenny","Microsoft Ava"];
    const voice = voices.find((item) => preferred.some((name) => item.name.toLowerCase().includes(name.toLowerCase()))) || voices.find((item) => /^en(-|_|$)/i.test(item.lang)) || voices[0];
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  function setupVoice() {
    const form = els().form;
    if (!form || document.getElementById("veyron-voice-tools")) return;
    const wrap = document.createElement("div");
    wrap.id = "veyron-voice-tools";
    wrap.style.cssText = "display:flex;gap:7px;align-items:center;margin:8px 0 0";
    const voice = document.createElement("button");
    voice.type = "button";
    voice.className = "btn btn-ghost btn-sm";
    voice.textContent = "Voice off";
    voice.onclick = () => {
      voiceEnabled = !voiceEnabled;
      voice.textContent = voiceEnabled ? "Voice on" : "Voice off";
      if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    const talk = document.createElement("button");
    talk.type = "button";
    talk.className = "btn btn-ghost btn-sm";
    talk.textContent = "Speak";
    talk.onclick = () => {
      if (recognition) {
        try { recognition.stop(); } catch {}
        recognition = null;
        talk.textContent = "Speak";
        return;
      }
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) {
        XIO_APP.toast("Microphone input is not supported in this browser.", "bad");
        return;
      }
      recognition = new Ctor();
      recognition.lang = "en-CA";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const value = Array.from(event.results || []).map((item) => item?.[0]?.transcript || "").join(" ").trim();
        if (value) els().field.value = value;
      };
      recognition.onend = () => { recognition = null; talk.textContent = "Speak"; };
      recognition.onerror = () => { recognition = null; talk.textContent = "Speak"; };
      try { recognition.start(); talk.textContent = "Listening…"; } catch { recognition = null; talk.textContent = "Speak"; }
    };
    wrap.appendChild(voice);
    wrap.appendChild(talk);
    form.parentNode.insertBefore(wrap, form.nextSibling);
  }

  async function ensureWorkspace() {
    const response = await fetch("/api/workspace", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Workspace could not be loaded");
    const data = await response.json();
    workspaceId = data.workspace.id;
    const syncResponse = await fetch("/api/workspace", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        context: {
          route: location.hash,
          profile: { name: E().state.profile.name, tone: E().state.profile.tone, detail: E().state.profile.detail },
          goals: E().state.goals,
          projects: E().state.projects
        }
      })
    });
    if (!syncResponse.ok) throw new Error("Workspace could not be synchronized");
    return data;
  }

  function bubble(role, text, options = {}) {
    const { thread } = els();
    const wrap = document.createElement("div");
    wrap.className = "chat-msg " + role;
    const name = E().state.profile.name || "You";
    wrap.innerHTML = "<div class='chat-ava " + role + "'>" + (role === "xio" ? "✦" : esc((name || "Y")[0].toUpperCase())) + "</div><div class='chat-bubble'>" + esc(text).replace(/\\n/g, "<br/>") + "</div>";
    thread.appendChild(wrap);
    const bubbleEl = wrap.querySelector(".chat-bubble");
    if (options.proposals?.length) options.proposals.forEach((proposal) => {
      const card = document.createElement("div");
      card.className = "mem-proposal";
      card.innerHTML = "<div class='mp-label'>Should I remember this?</div><p>" + esc(proposal.text) + "</p><div class='row'><button class='btn btn-primary btn-sm mp-yes'>Remember</button><button class='btn btn-ghost btn-sm mp-no'>Not now</button></div>";
      bubbleEl.appendChild(card);
      card.querySelector(".mp-yes").onclick = async () => {
        try {
          const response = await fetch("/api/memory", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ workspaceId, text:proposal.text, category:proposal.category, confidence:72, relevance:proposal.relevance ?? 60, source:"conversation", confirmed:true, provenance:{type:"conversation",conversationId}, scope:{conversationId} }) });
          if (!response.ok) throw new Error("Memory save failed");
          const data = await response.json();
          card.innerHTML = "<div class='mp-label'>✓ Remembered</div><p class='muted small'>Stored in the Memory Fabric. It can be revisited, corrected, or retired later.</p>";
          if (data.memory) E().state.memories.push({ id:data.memory.id, text:data.memory.text, category:data.memory.category, confidence:data.memory.confidence, active:data.memory.lifecycleState === "active" });
          XIO_APP.syncChrome(); XIO_APP.toast("Remembered.", "good");
        } catch (error) { XIO_APP.toast(error.message || "Could not save memory", "bad"); }
      };
      card.querySelector(".mp-no").onclick = () => { card.innerHTML = "<p class='muted small'>Not stored. You stay in control of memory.</p>"; };
    });
    if (options.recommendation) {
      const controls = document.createElement("div");
      controls.className = "row";
      controls.style.marginTop = "10px";
      controls.innerHTML = "<span class='muted tiny'>Recommendation outcome</span><button class='btn btn-ghost btn-sm rec-useful'>Useful</button><button class='btn btn-ghost btn-sm rec-not'>Not useful</button>";
      bubbleEl.appendChild(controls);
      const sendOutcome = async (outcome, feedback) => {
        try {
          const response = await fetch("/api/feedback", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ workspaceId, recommendation:options.recommendation, outcome, feedback, conversationId, memoryIds:options.memoryIds || [] }) });
          if (!response.ok) throw new Error("Feedback failed");
          controls.innerHTML = "<span class='muted tiny'>✓ Outcome recorded</span>";
        } catch (error) { XIO_APP.toast(error.message || "Could not record feedback", "bad"); }
      };
      controls.querySelector(".rec-useful").onclick = () => sendOutcome("accepted", "User marked the recommendation useful.");
      controls.querySelector(".rec-not").onclick = () => sendOutcome("rejected", "User marked the recommendation not useful.");
    }
    if (role === "xio") speak(text);
    thread.scrollTop = thread.scrollHeight;
  }

  function typing(show) {
    const { thread } = els();
    let t = thread.querySelector(".typing-wrap");
    if (show && !t) {
      t = document.createElement("div");
      t.className = "chat-msg xio typing-wrap";
      t.innerHTML = "<div class='chat-ava xio'>✦</div><div class='chat-bubble typing'><span></span><span></span><span></span></div>";
      thread.appendChild(t);
    } else if (!show && t) t.remove();
    thread.scrollTop = thread.scrollHeight;
  }

  function renderSuggestions() {
    const { suggest } = els();
    const g = E().topGoal();
    const chips = ["What should I focus on today?", g ? "How's my momentum on " + g.slice(0, 28) + (g.length > 28 ? "…" : "") : "Help me set a goal", "What have you learned about me?", "I keep putting something off", "I'm feeling overwhelmed"];
    suggest.innerHTML = chips.map((c) => "<button class='suggest-chip'>" + esc(c) + "</button>").join("");
    suggest.querySelectorAll(".suggest-chip").forEach((c) => c.onclick = () => { els().field.value = c.textContent; submit(); });
  }

  function restore() {
    const { thread } = els();
    thread.innerHTML = "";
    const hist = E().state.chat.slice(-40);
    if (!hist.length) { greet(); return; }
    hist.forEach((m) => bubble(m.role === "user" ? "user" : "xio", m.text));
    greetedOnce = true;
  }

  function greet() {
    if (greetedOnce) return;
    greetedOnce = true;
    const name = E().state.profile.name;
    const greetText = name ? E().greeting() + "\\n\\nYour workspace is connected to Avenne and the Memory Fabric. What's on your mind?" : "Hey — I'm Avenne inside Veyron. Your workspace context and approved memory can inform our conversations. What's on your mind?";
    typing(true);
    setTimeout(() => {
      typing(false);
      bubble("xio", greetText);
      E().state.chat.push({ role:"xio", text:greetText, at:Date.now() });
      E().save();
    }, 500);
  }

  async function submit() {
    const { field } = els();
    const text = field.value.trim();
    if (!text || busy) return;
    field.value = "";
    busy = true;
    bubble("user", text);
    E().state.chat.push({ role:"user", text, at:Date.now() });
    E().state.stats.chats++;
    E().logEvent("chat");
    E().save();
    typing(true);
    try {
      const workspace = await ensureWorkspace();
      const response = await fetch("/api/chat", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ workspaceId:workspace.workspace.id, conversationId, message:text }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Avenne could not process the request");
      conversationId = data.conversationId || conversationId;
      typing(false);
      bubble("xio", data.answer, { proposals:data.memoryProposals || [], recommendation:data.recommendation, memoryIds:data.evidenceMemoryIds || [] });
      E().state.chat.push({ role:"xio", text:data.answer, at:Date.now() });
      E().save();
      XIO_APP.syncChrome();
    } catch (error) {
      typing(false);
      bubble("xio", "I couldn't complete that turn. " + (error.message || "The server returned an unexpected error."));
    } finally {
      busy = false;
    }
  }

  function init() {
    els().form.addEventListener("submit", (event) => { event.preventDefault(); submit(); });
    renderSuggestions();
    setupVoice();
  }

  async function mount() {}

  function newConversation() {
    conversationId = null;
    E().state.chat = [];
    E().save();
    greetedOnce = false;
    restore();
    els().field.focus();
    XIO_APP.toast("Fresh conversation. Your persistent memory remains intact.");
  }

  return { init, mount, newConversation };
})();
window.VEYRON_CHAT = VEYRON_CHAT;
window.XIO_CHAT = VEYRON_CHAT;
