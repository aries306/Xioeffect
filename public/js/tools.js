/* ═════════════ XIO 2.0 — Tools (Content, Prompts, Packs, Toolkits) ═════════════ */
"use strict";

const XIO_TOOLS = (() => {
  const { esc, uid } = XIO_UTILS;
  const E = () => XIO_ENGINE;

  /* ══ CONTENT ENGINE ══════════════════════════════════ */
  function generateContent(){
    const type = document.getElementById("cg-type").value;
    const topic = document.getElementById("cg-topic").value.trim();
    const audience = document.getElementById("cg-audience").value.trim() || "your audience";
    const cta = document.getElementById("cg-cta").value.trim();
    let tone = document.getElementById("cg-tone").value;
    if (tone === "auto"){
      // adaptive: use learned preference if any
      const pref = E().memoriesByCategory("preference")[0];
      tone = pref ? pref.text.replace(/^Prefers:\s*/i,"") : E().state.profile.tone || "Calm & confident";
    }
    if(!topic){ XIO_APP.toast("Give me a topic first — even three words works.", "bad"); return; }

    const variants = buildVariants(type, topic, audience, cta, tone);
    const out = document.getElementById("cg-output");
    out.classList.remove("muted");
    out.innerHTML = variants.map((v, i) => `
      <div class="cg-variant">
        <div class="cv-label">Variation ${i + 1} · ${esc(v.angle)}</div>
        <button class="icon-btn cv-copy" title="Copy">⧉</button>
        <p>${esc(v.body)}</p>
      </div>`).join("");
    out.querySelectorAll(".cv-copy").forEach(b => b.addEventListener("click", () => {
      navigator.clipboard.writeText(b.parentElement.querySelector("p").textContent);
      XIO_APP.toast("Copied to clipboard.");
    }));
    E().state.stats.generated++; E().logEvent("generate");
    XIO_APP.syncChrome();
  }

  function hookify(topic, angle){
    const t = topic.charAt(0).toUpperCase() + topic.slice(1);
    const hooks = {
      contrarian: `Most people get ${topic} completely backwards.`,
      curiosity:  `Nobody talks about the part of ${topic} that actually matters.`,
      proof:      `Here's what happened when I stopped overcomplicating ${topic}.`,
      story:      `A year ago, ${topic} was my biggest problem. Today it's my edge.`
    };
    return hooks[angle] || t + ".";
  }

  function buildVariants(type, topic, audience, cta, tone){
    const name = E().state.profile.name;
    const ctaLine = cta ? `\n\n→ ${cta.charAt(0).toUpperCase() + cta.slice(1)}.` : "";
    const t = topic.toLowerCase();

    const bodies = {
      "Social post": [
        { angle: "Contrarian", body: `${hookify(t,"contrarian")}\n\nEveryone adds more: more tools, more steps, more noise.\nThe people winning at ${t} are doing the opposite — fewer moving parts, better ones.\n\nIf you're ${audience}, that's the real edge.${ctaLine}` },
        { angle: "Proof-led", body: `${hookify(t,"proof")}\n\nThe shift wasn't talent. It was subtraction:\n• One clear priority instead of ten\n• Systems instead of willpower\n• Small daily moves instead of heroic weekends\n\n${t.charAt(0).toUpperCase() + t.slice(1)} rewards consistency, not intensity.${ctaLine}` },
        { angle: "Curiosity", body: `${hookify(t,"curiosity")}\n\nHere's the part nobody says out loud:\n${t.charAt(0).toUpperCase() + t.slice(1)} isn't a knowledge problem. You already know what to do.\nIt's an execution environment problem.\n\nFix the environment and the "discipline" appears on its own.${ctaLine}` }
      ],
      "LinkedIn post": [
        { angle: "Story", body: `Two years ago I thought ${t} was about working harder.\n\nI was wrong — expensively wrong.\n\nWhat actually moved it:\n\n1. Naming the one bottleneck nobody wanted to admit\n2. Building a system around it\n3. Reviewing weekly, without mercy\n\nThe ${audience} who figure this out early stop trading time for progress.\n\nWhat would you add to the list?${ctaLine}` },
        { angle: "Contrarian", body: `Unpopular opinion: ${t} is 20% strategy and 80% removing friction.\n\nI've watched smart ${audience} stall for months because their process had 11 steps.\n\nMine has 3. It's not prettier. It ships.\n\nComplexity is where ambition goes to hide.${ctaLine}` },
        { angle: "Proof-led", body: `Results from rethinking ${t} (last 90 days):\n\n→ Clearer priorities: 1 focal goal instead of 7\n→ Output: consistent, shipping weekly\n→ Stress: measurably down\n\nNo new tools. No bigger team. Just an honest audit of where the energy was leaking.\n\nIf you're ${audience}: your next breakthrough is subtraction, not addition.${ctaLine}` }
      ],
      "Email": [
        { angle: "Direct", body: `Subject: The ${t} problem nobody names\n\nHi [Name],\n\nQuick one today.\n\nMost ${audience} I talk to don't actually struggle with ${t} itself — they struggle with the chaos around it. Too many moving parts. No single focus.\n\nSo here's the one-question audit I use:\n\n"If I could only fix one thing this week, which fix would make everything else easier?"\n\nWhatever answered that first — that's your real priority.\n\nWant help finding yours?${name ? `\n\n— ${name}` : ""}${ctaLine}` },
        { angle: "Curiosity", body: `Subject: I was wrong about ${t}\n\nHi [Name],\n\nFor a long time I believed the standard advice about ${t}.\n\nThen I watched it fail — for me and for almost every ${audience} I know.\n\nThe myth: you need more.\nThe truth: you need less, arranged better.\n\nI've put together exactly how I fixed it. It's short, and it works.${name ? `\n\n— ${name}` : ""}${ctaLine}` }
      ],
      "Product description": [
        { angle: "Outcome-led", body: `${topic.charAt(0).toUpperCase() + topic.slice(1)} — built for ${audience} who are done with noise.\n\nYou don't need another thing to manage. You need the result without the drag.\n\nHere's what changes:\n• Clarity replaces the guesswork — you always know the next move\n• Systems replace repetition — the busywork stops being yours\n• Momentum replaces catch-up — progress compounds daily\n\nThis isn't more. It's better, working quietly in the background while you do the work that matters.${ctaLine}` },
        { angle: "Story", body: `We built ${t} because we lived the alternative: scattered tools, constant catch-up, ambition outpacing capacity.\n\n${topic.charAt(0).toUpperCase() + topic.slice(1)} is the version that works for you — learning your patterns, removing your friction, and turning the grind into forward motion.\n\nMade for ${audience}. Built for momentum.${ctaLine}` }
      ],
      "Ad copy": [
        { angle: "Punchy", body: `Still doing ${t} the hard way?\n\nThere's a version where the heavy lifting happens behind the scenes — and you just move.\n\nThat's what we built. For ${audience}. Right now.${ctaLine || "\n\n→ See it work."}` },
        { angle: "Outcome-led", body: `Imagine ${t} handled.\n\nNot "managed". Not "a new dashboard to babysit". Handled.\n\nMore clarity. More capacity. More momentum.\n\nThe smart move for ${audience} this quarter:${ctaLine || "\n\n→ Start free."}` }
      ],
      "Video script outline": [
        { angle: "Educational", body: `TITLE: Why ${t} Feels Hard (And the 10-Minute Fix)\n\nHOOK (0:00–0:15)\n"${hookify(t,"contrarian")} And in the next 3 minutes I'll prove it."\n\nPROBLEM (0:15–0:45)\nName the pain ${audience} actually feel — not the surface one. The real one.\n\nREVEAL (0:45–1:45)\nThe reframe: it's an environment/systems problem, not a you-problem.\n\nPROOF (1:45–2:30)\nOne concrete example with a visible before/after.\n\nCTA (2:30–3:00)\n"If you want this for yourself — ${cta || "link below"}."\n\nPRODUCTION NOTES: ${tone} delivery, one static shot, captions with punch-word emphasis.` }
      ],
      "Blog intro": [
        { angle: "Narrative", body: `There's a moment every ${audience.replace(/^your /,"")} knows too well: the day you realize ${t} isn't going to fix itself.\n\nFor me it was a Tuesday. Everything urgent, nothing important, and the slow suspicion that effort wasn't the bottleneck — structure was.\n\nThis is the piece I wish I'd had that Tuesday. No fluff, no 47-step framework. Just the part that actually works.\n\nLet's get into it.` }
      ]
    };
    return (bodies[type] || bodies["Social post"]).slice(0, 3);
  }

  function copyAllContent(){
    const out = document.getElementById("cg-output");
    if(!out || !out.textContent.trim() || out.classList.contains("muted")) return;
    const text = [...out.querySelectorAll(".cg-variant")].map(v => v.querySelector("p").textContent).join("\n\n──────────\n\n");
    navigator.clipboard.writeText(text);
    XIO_APP.toast("All variations copied.");
  }

  /* ══ PROMPT BUILDER ══════════════════════════════════ */
  function assemblePrompt(){
    const role = document.getElementById("pb-role").value;
    const objective = document.getElementById("pb-objective").value.trim();
    const context = document.getElementById("pb-context").value.trim();
    const format = document.getElementById("pb-format").value;
    const tone = document.getElementById("pb-tone").value;
    const constraints = document.getElementById("pb-constraints").value.trim();

    const parts = [];
    if (role) parts.push(`Act as a ${role.toLowerCase()}.`);
    if (context) parts.push(`\nCONTEXT\n${context}`);
    if (objective) parts.push(`\nOBJECTIVE\n${objective}`);
    if (format) parts.push(`\nFORMAT\nDeliver this as: ${format.replace(/^An? /,"")}.`);
    if (tone) parts.push(`\nTONE\n${tone}.`);
    if (constraints) parts.push(`\nCONSTRAINTS\n${constraints}.`);
    if (parts.length) parts.push(`\nBefore you answer, ask me up to 3 clarifying questions if anything is ambiguous. Then deliver your best work — no padding, no disclaimers.`);

    const prompt = parts.join("\n");
    const filled = [role, objective, context, format, constraints].filter(Boolean).length;
    const quality = !filled ? "—" : filled <= 2 ? "Draft" : filled <= 4 ? "Strong" : "Excellent";
    return { prompt, quality, empty: !filled };
  }

  function refreshPreview(){
    const { prompt, quality, empty } = assemblePrompt();
    const pre = document.getElementById("pb-preview");
    pre.classList.toggle("muted", empty);
    pre.textContent = empty ? "Start filling the builder — your prompt assembles here in real time." : prompt;
    document.getElementById("pb-score").textContent = `Quality: ${quality}`;
    document.getElementById("pb-score").style.background = quality === "Excellent" ? "rgba(61,220,151,.14)" : quality === "Strong" ? "var(--acc-soft)" : "var(--panel-2)";
  }

  function savePrompt(){
    const { prompt, empty } = assemblePrompt();
    if (empty){ XIO_APP.toast("Nothing to save yet — fill a few fields first.", "bad"); return; }
    const role = document.getElementById("pb-role").value || "Custom";
    const obj = document.getElementById("pb-objective").value.trim();
    E().state.promptLibrary.push({ id: uid(), title: obj.slice(0, 60) || `${role} prompt`, prompt, created: Date.now() });
    E().save(); E().logEvent("prompt");
    renderLibrary();
    XIO_APP.toast("Saved to your prompt library.", "good");
  }

  function copyPrompt(){
    const { prompt, empty } = assemblePrompt();
    if (empty){ XIO_APP.toast("Nothing to copy yet.", "bad"); return; }
    navigator.clipboard.writeText(prompt);
    XIO_APP.toast("Prompt copied.");
  }

  function renderLibrary(){
    const el = document.getElementById("pb-library");
    const lib = E().state.promptLibrary;
    el.innerHTML = lib.length ? lib.map(p => `
      <div class="goal-card glass" data-id="${p.id}">
        <div class="goal-top">
          <h4>${esc(p.title)}</h4>
          <button class="icon-btn lib-copy" title="Copy">⧉</button>
          <button class="icon-btn lib-del" title="Delete">🗑</button>
        </div>
        <pre class="prompt-full" style="display:block;margin-top:10px">${esc(p.prompt)}</pre>
      </div>`).join("") : `<div class="empty-note">No saved prompts yet — build one above and save it here.</div>`;
    el.querySelectorAll(".lib-copy").forEach(b => b.onclick = () => {
      const p = E().state.promptLibrary.find(x => x.id === b.closest("[data-id]").dataset.id);
      navigator.clipboard.writeText(p.prompt); XIO_APP.toast("Copied.");
    });
    el.querySelectorAll(".lib-del").forEach(b => b.onclick = () => {
      const id = b.closest("[data-id]").dataset.id;
      E().state.promptLibrary = E().state.promptLibrary.filter(x => x.id !== id);
      E().save(); renderLibrary();
    });
  }

  /* ══ PROMPT PACKS ════════════════════════════════════ */
  function isProLocked(itemPro){
    if (!itemPro) return false;
    return E().state.profile.plan === "core";
  }

  function renderPacks(){
    const el = document.getElementById("packs-list");
    el.innerHTML = XIO_DATA.promptPacks.map(pack => `
      <div class="pack-block">
        <div class="pack-head">
          <div class="pack-head-ico">${pack.icon}</div>
          <div><h3>${pack.name}</h3><p class="muted small">${pack.desc}</p></div>
        </div>
        <div class="pack-grid">
          ${pack.prompts.map(pr => {
            const locked = isProLocked(pr.pro);
            return `
            <div class="pack-prompt glass ${locked ? "locked" : ""}" data-prompt="${esc(pr.p)}">
              ${locked ? `<div class="lock">✦ Pro</div>` : ""}
              <h4>${esc(pr.t)}</h4>
              <p>${esc(pr.p.slice(0, 110))}…</p>
              <pre class="prompt-full">${esc(pr.p)}</pre>
              <div class="row" style="margin-top:12px;gap:8px">
                <button class="btn btn-ghost btn-sm pk-expand">${locked ? "Unlock" : "Expand"}</button>
                ${locked ? "" : `<button class="btn btn-ghost btn-sm pk-copy">Copy</button>`}
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`).join("");

    el.querySelectorAll(".pk-expand").forEach(b => b.onclick = () => {
      const card = b.closest(".pack-prompt");
      if (card.classList.contains("locked")){ XIO_APP.upgradeModal(); return; }
      card.classList.toggle("expanded");
      b.textContent = card.classList.contains("expanded") ? "Collapse" : "Expand";
    });
    el.querySelectorAll(".pk-copy").forEach(b => b.onclick = () => {
      navigator.clipboard.writeText(b.closest(".pack-prompt").dataset.prompt.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"'));
      XIO_APP.toast("Prompt copied — paste it anywhere.");
    });
  }

  /* ══ TOOLKITS ════════════════════════════════════════ */
  function renderToolkits(){
    const el = document.getElementById("toolkits-list");
    el.innerHTML = XIO_DATA.toolkits.map(tk => `
      <div class="toolkit-card glass" data-tk="${tk.id}">
        <button class="toolkit-head">
          <div class="pack-head-ico">${tk.icon}</div>
          <div><h3>${tk.name}</h3><p>${tk.sub}</p></div>
          <span class="chev">⌄</span>
        </button>
        <div class="toolkit-body"><div class="toolkit-inner">
          ${tk.steps.map((s, i) => `
            <div class="tk-step"><div class="tk-step-n">${i + 1}</div><div><h4>${esc(s.h)}</h4><p>${esc(s.d)}</p></div></div>`).join("")}
        </div></div>
      </div>`).join("");
    el.querySelectorAll(".toolkit-head").forEach(h => h.onclick = () => {
      const card = h.closest(".toolkit-card");
      const body = card.querySelector(".toolkit-body");
      const open = card.classList.toggle("open");
      body.style.maxHeight = open ? body.scrollHeight + "px" : "0";
    });
  }

  /* ══ INIT ════════════════════════════════════════════ */
  function initContent(){
    document.getElementById("cg-go").onclick = generateContent;
    document.getElementById("cg-copy").onclick = copyAllContent;
  }
  function initPrompts(){
    ["pb-role","pb-objective","pb-context","pb-format","pb-tone","pb-constraints"].forEach(id =>
      document.getElementById(id).addEventListener("input", refreshPreview));
    document.getElementById("pb-save").onclick = savePrompt;
    document.getElementById("pb-copy").onclick = copyPrompt;
    renderLibrary(); refreshPreview();
  }

  return { initContent, initPrompts, renderPacks, renderToolkits, renderLibrary };
})();

window.XIO_TOOLS = XIO_TOOLS;
