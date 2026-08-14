/* ═════════════ XIO 2.0 — Conversational XIO ═════════════ */
"use strict";

const XIO_CHAT = (() => {
  const { esc } = XIO_UTILS;
  const E = () => XIO_ENGINE;
  let busy = false;
  let greetedOnce = false;

  const els = () => ({
    thread: document.getElementById("chat-thread"),
    form: document.getElementById("chat-form"),
    field: document.getElementById("chat-field"),
    suggest: document.getElementById("chat-suggest")
  });

  /* ── Rendering ─────────────────────────────────────── */
  function bubble(role, text, proposals = []){
    const { thread } = els();
    const wrap = document.createElement("div");
    wrap.className = `chat-msg ${role}`;
    const name = E().state.profile.name || "You";
    wrap.innerHTML = `
      <div class="chat-ava ${role}">${role === "xio" ? "✦" : esc((name || "Y")[0].toUpperCase())}</div>
      <div class="chat-bubble">${esc(text).replace(/\n/g, "<br/>")}</div>`;
    thread.appendChild(wrap);

    if (proposals.length){
      const bubbleEl = wrap.querySelector(".chat-bubble");
      proposals.forEach(p => {
        const card = document.createElement("div");
        card.className = "mem-proposal";
        card.innerHTML = `
          <div class="mp-label">Should I remember this?</div>
          <p>${esc(p.text)}</p>
          <div class="row">
            <button class="btn btn-primary btn-sm mp-yes">Remember</button>
            <button class="btn btn-ghost btn-sm mp-no">Not now</button>
          </div>`;
        bubbleEl.appendChild(card);
        card.querySelector(".mp-yes").onclick = () => {
          const res = E().addMemory({ ...p, confirmed: true, confidence: 72 });
          if (res) E().bumpMentions(res.memory);
          E().logEvent("memory-confirmed");
          card.innerHTML = `<div class="mp-label">✓ Remembered</div><p class="muted small">Stored to memory (${p.category.replace(/_/g," ")}). Manage it anytime in Memory.</p>`;
          XIO_APP.syncChrome(); XIO_APP.toast("Got it — I'll remember that.", "good");
        };
        card.querySelector(".mp-no").onclick = () => {
          card.innerHTML = `<p class="muted small">No problem — discarded. You're in control of what XIO remembers.</p>`;
        };
      });
    }
    thread.scrollTop = thread.scrollHeight;
  }

  function typing(show){
    const { thread } = els();
    let t = thread.querySelector(".typing-wrap");
    if (show && !t){
      t = document.createElement("div");
      t.className = "chat-msg xio typing-wrap";
      t.innerHTML = `<div class="chat-ava xio">✦</div><div class="chat-bubble typing"><span></span><span></span><span></span></div>`;
      thread.appendChild(t);
    } else if (!show && t) t.remove();
    thread.scrollTop = thread.scrollHeight;
  }

  function renderSuggestions(){
    const { suggest } = els();
    const g = E().topGoal();
    const chips = [
      "What should I focus on today?",
      g ? `How's my momentum on ${g.slice(0, 28)}${g.length > 28 ? "…" : ""}?` : "Help me set a goal",
      "What have you learned about me?",
      "I keep putting something off",
      "I'm feeling overwhelmed"
    ];
    suggest.innerHTML = chips.map(c => `<button class="suggest-chip">${esc(c)}</button>`).join("");
    suggest.querySelectorAll(".suggest-chip").forEach(c => c.onclick = () => { els().field.value = c.textContent; submit(); });
  }

  /* ── Restore history ───────────────────────────────── */
  function restore(){
    const { thread } = els();
    thread.innerHTML = "";
    const hist = E().state.chat.slice(-40);
    if (!hist.length){ greet(); return; }
    hist.forEach(m => bubble(m.role === "user" ? "user" : "xio", m.text));
    greetedOnce = true;
  }

  function greet(){
    if (greetedOnce) return;
    greetedOnce = true;
    const name = E().state.profile.name;
    const memories = E().activeMemories().length;
    const greetText = name
      ? `${E().greeting()}\n\nI'm holding ${memories} ${memories === 1 ? "memory" : "memories"} about you — what you're building toward, how you like to work, what's in the way. And every conversation sharpens them.\n\nWhat's on your mind?`
      : `Hey — I'm XIO. The more we talk, the more I learn how you work, and the more useful I get.\n\nWhat's on your mind?`;
    typing(true);
    setTimeout(() => { typing(false); bubble("xio", greetText); E().state.chat.push({ role: "xio", text: greetText, at: Date.now() }); E().save(); }, 900);
  }

  /* ── Core turn ─────────────────────────────────────── */
  function submit(){
    const { field } = els();
    const text = field.value.trim();
    if (!text || busy) return;
    field.value = ""; busy = true;

    bubble("user", text);
    E().state.chat.push({ role: "user", text, at: Date.now() });
    E().state.stats.chats++;
    E().logEvent("chat");
    E().save();

    // memory extraction (if learning on)
    let proposals = [];
    if (E().state.prefs.learning){
      const cands = E().extractMemories(text);
      if (cands.length){
        if (E().state.prefs.askBeforeMemory){
          proposals = cands;
        } else {
          cands.forEach(c => { const r = E().addMemory({ ...c, confidence: 60 }); if(r) E().bumpMentions(r.memory); });
        }
      }
    }

    // win detection → log win
    const cls = E().classify(text);
    if (cls.state === "CELEBRATION"){
      const frag = text.split(/[.!\n]/)[0].slice(0, 120);
      if (frag.length > 6){ E().addWin(frag); }
    }

    typing(true);
    const delay = 900 + Math.min(1600, text.length * 8);
    setTimeout(() => {
      const { reply } = E().generateReply(text);
      typing(false);
      // occasionally prepend the superhero line when we have strong memory context
      const rel = E().relevantMemory(text);
      const prefix = rel && rel.confidence >= 70 && Math.random() < 0.35 ? "Based on what I know about you — " : "";
      bubble("xio", prefix + reply, proposals);
      E().state.chat.push({ role: "xio", text: reply, at: Date.now() });
      E().save();
      E().refreshInsights();
      XIO_APP.syncChrome();
      busy = false;
    }, delay);
  }

  function init(){
    els().form.addEventListener("submit", e => { e.preventDefault(); submit(); });
    renderSuggestions();
  }

  function mount(){ restore(); renderSuggestions(); setTimeout(() => els().field.focus(), 60); }
  function newConversation(){
    E().state.chat = []; E().save(); greetedOnce = false;
    restore(); els().field.focus();
    XIO_APP.toast("Fresh conversation. Your memory and intelligence stay intact.");
  }

  return { init, mount, newConversation };
})();

window.XIO_CHAT = XIO_CHAT;
