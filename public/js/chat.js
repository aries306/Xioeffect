/* XIO conversational surface. The browser owns presentation; authenticated data and reasoning stay server-side. */
"use strict";

const XIO_CHAT = (() => {
  const { esc } = XIO_UTILS;
  const E = () => XIO_ENGINE;
  let busy = false;
  let greetedOnce = false;
  let conversationId = null;
  let workspaceId = null;
  const els = () => ({ thread: document.getElementById("chat-thread"), form: document.getElementById("chat-form"), field: document.getElementById("chat-field"), suggest: document.getElementById("chat-suggest") });

  async function ensureWorkspace() {
    const response = await fetch("/api/workspace", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Workspace could not be loaded");
    const data = await response.json(); workspaceId = data.workspace.id;
    const syncResponse = await fetch("/api/workspace", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, context: { route: location.hash, profile: { name: E().state.profile.name, tone: E().state.profile.tone, detail: E().state.profile.detail }, goals: E().state.goals, projects: E().state.projects } }) });
    if (!syncResponse.ok) throw new Error("Workspace could not be synchronized");
    return data;
  }

  function bubble(role, text, options = {}) {
    const { thread } = els(); const wrap = document.createElement("div"); wrap.className = `chat-msg ${role}`;
    const name = E().state.profile.name || "You";
    wrap.innerHTML = `<div class="chat-ava ${role}">${role === "xio" ? "✦" : esc((name || "Y")[0].toUpperCase())}</div><div class="chat-bubble">${esc(text).replace(/\n/g, "<br/>")}</div>`;
    thread.appendChild(wrap); const bubbleEl = wrap.querySelector(".chat-bubble");
    if (options.proposals?.length) options.proposals.forEach((proposal) => {
      const card = document.createElement("div"); card.className = "mem-proposal";
      card.innerHTML = `<div class="mp-label">Should I remember this?</div><p>${esc(proposal.text)}</p><div class="row"><button class="btn btn-primary btn-sm mp-yes">Remember</button><button class="btn btn-ghost btn-sm mp-no">Not now</button></div>`;
      bubbleEl.appendChild(card);
      card.querySelector(".mp-yes").onclick = async () => {
        try {
          const response = await fetch("/api/memory", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, text: proposal.text, category: proposal.category, confidence: 72, relevance: proposal.relevance ?? 60, source: "conversation", confirmed: true, provenance: { type: "conversation", conversationId }, scope: { conversationId } }) });
          if (!response.ok) throw new Error("Memory save failed"); const data = await response.json();
          card.innerHTML = `<div class="mp-label">✓ Remembered</div><p class="muted small">Stored in the Memory Fabric. It can be revisited, corrected, or retired later.</p>`;
          if (data.memory) E().state.memories.push({ id: data.memory.id, text: data.memory.text, category: data.memory.category, confidence: data.memory.confidence, active: data.memory.lifecycleState === "active" });
          XIO_APP.syncChrome(); XIO_APP.toast("Remembered.", "good");
        } catch (error) { XIO_APP.toast(error.message || "Could not save memory", "bad"); }
      };
      card.querySelector(".mp-no").onclick = () => { card.innerHTML = `<p class="muted small">Not stored. You stay in control of memory.</p>`; };
    });
    if (options.recommendation) {
      const controls = document.createElement("div"); controls.className = "row"; controls.style.marginTop = "10px";
      controls.innerHTML = `<span class="muted tiny">Recommendation outcome</span><button class="btn btn-ghost btn-sm rec-useful">Useful</button><button class="btn btn-ghost btn-sm rec-not">Not useful</button>`;
      bubbleEl.appendChild(controls);
      const sendOutcome = async (outcome, feedback) => {
        try {
          const response = await fetch("/api/feedback", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, recommendation: options.recommendation, outcome, feedback, conversationId }) });
          if (!response.ok) throw new Error("Feedback failed"); controls.innerHTML = `<span class="muted tiny">✓ Outcome recorded</span>`;
        } catch (error) { XIO_APP.toast(error.message || "Could not record feedback", "bad"); }
      };
      controls.querySelector(".rec-useful").onclick = () => sendOutcome("accepted", "User marked the recommendation useful.");
      controls.querySelector(".rec-not").onclick = () => sendOutcome("rejected", "User marked the recommendation not useful.");
    }
    thread.scrollTop = thread.scrollHeight;
  }

  function typing(show) { const { thread } = els(); let t = thread.querySelector(".typing-wrap"); if (show && !t) { t = document.createElement("div"); t.className = "chat-msg xio typing-wrap"; t.innerHTML = `<div class="chat-ava xio">✦</div><div class="chat-bubble typing"><span></span><span></span><span></span></div>`; thread.appendChild(t); } else if (!show && t) t.remove(); thread.scrollTop = thread.scrollHeight; }

  function renderSuggestions() { const { suggest } = els(); const g = E().topGoal(); const chips = ["What should I focus on today?", g ? `How's my momentum on ${g.slice(0, 28)}${g.length > 28 ? "…" : ""}?` : "Help me set a goal", "What have you learned about me?", "I keep putting something off", "I'm feeling overwhelmed"]; suggest.innerHTML = chips.map((c) => `<button class="suggest-chip">${esc(c)}</button>`).join(""); suggest.querySelectorAll(".suggest-chip").forEach((c) => c.onclick = () => { els().field.value = c.textContent; submit(); }); }
  function restore() { const { thread } = els(); thread.innerHTML = ""; const hist = E().state.chat.slice(-40); if (!hist.length) { greet(); return; } hist.forEach((m) => bubble(m.role === "user" ? "user" : "xio", m.text)); greetedOnce = true; }
  function greet() { if (greetedOnce) return; greetedOnce = true; const name = E().state.profile.name; const greetText = name ? `${E().greeting()}\n\nYour workspace is connected to Astara and the Memory Fabric. What's on your mind?` : `Hey — I'm Astara inside XIO. Your workspace context and approved memory can inform our conversations. What's on your mind?`; typing(true); setTimeout(() => { typing(false); bubble("xio", greetText); E().state.chat.push({ role: "xio", text: greetText, at: Date.now() }); E().save(); }, 500); }

  async function submit() {
    const { field } = els(); const text = field.value.trim(); if (!text || busy) return; field.value = ""; busy = true;
    bubble("user", text); E().state.chat.push({ role: "user", text, at: Date.now() }); E().state.stats.chats++; E().logEvent("chat"); E().save(); typing(true);
    try {
      const workspace = await ensureWorkspace();
      const response = await fetch("/api/chat", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspace.workspace.id, conversationId, message: text }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Astara could not process the request");
      conversationId = data.conversationId || conversationId; typing(false); bubble("xio", data.answer, { proposals: data.memoryProposals || [], recommendation: data.recommendation });
      E().state.chat.push({ role: "xio", text: data.answer, at: Date.now() }); E().save(); XIO_APP.syncChrome();
    } catch (error) { typing(false); bubble("xio", `I couldn't complete that turn. ${error.message || "The server returned an unexpected error."}`); }
    finally { busy = false; }
  }

  function init() { els().form.addEventListener("submit", (event) => { event.preventDefault(); submit(); }); renderSuggestions(); }
  async function mount() { try { await ensureWorkspace(); } catch { /* protected API reports auth/server errors on submit */ } restore(); renderSuggestions(); setTimeout(() => els().field.focus(), 60); }
  function newConversation() { conversationId = null; E().state.chat = []; E().save(); greetedOnce = false; restore(); els().field.focus(); XIO_APP.toast("Fresh conversation. Your persistent memory remains intact."); }
  return { init, mount, newConversation };
})();
window.XIO_CHAT = XIO_CHAT;
