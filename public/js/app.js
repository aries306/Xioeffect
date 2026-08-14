/* ═════════════ XIO 2.0 — App Controller ═════════════ */
"use strict";

const XIO_APP = (() => {
  const { esc, fmtDate, clamp } = XIO_UTILS;
  const E = () => XIO_ENGINE;

  /* ══ Toast ═════════════════════════════════════════ */
  function toast(msg, kind = ""){
    const stack = document.getElementById("toast-stack");
    const t = document.createElement("div");
    t.className = `toast ${kind}`;
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .35s"; setTimeout(() => t.remove(), 380); }, 3200);
  }

  /* ══ Modal helper ═══════════════════════════════════ */
  function modal(html, onMount){
    const ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal-card glass"><button class="modal-x">×</button>${html}</div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    ov.querySelector(".modal-x").onclick = close;
    if (onMount) onMount(ov, close);
    return close;
  }

  function upgradeModal(){
    modal(`
      <h3>✦ That's a Pro prompt</h3>
      <p class="muted">Pro prompts, the full packs, and the adaptive intelligence layer are part of XIO Pro — $29/month. (Demo: switch plans instantly, no card.)</p>
      <div class="row">
        <button class="btn btn-ghost" data-x="1">Maybe later</button>
        <button class="btn btn-primary" id="um-go">See plans</button>
      </div>`, (ov, close) => {
        ov.querySelector("[data-x]").onclick = close;
        ov.querySelector("#um-go").onclick = () => { close(); location.hash = "#/app/pricing"; };
      });
  }

  /* ══ Router ════════════════════════════════════════ */
  const appRoutes = ["today","chat","intelligence","insights","memory","goals","content","prompts","packs","toolkits","pricing","settings"];
  const titles = {
    today: "Today", chat: "Talk to XIO", intelligence: "My Intelligence", insights: "Insights",
    memory: "Memory", goals: "Goals & Projects", content: "Content Engine", prompts: "Prompt Builder",
    packs: "Prompt Packs", toolkits: "Toolkits", pricing: "Plans", settings: "Settings"
  };

  function route(){
    const hash = location.hash || "#/home";
    const views = { landing: document.getElementById("view-landing"), onboarding: document.getElementById("view-onboarding"), app: document.getElementById("view-app") };
    Object.values(views).forEach(v => v.classList.remove("active"));
    document.body.style.overflow = "";

    if (hash.startsWith("#/app")){
      if (!E().state.onboarded){ location.hash = "#/onboarding"; return; }
      views.app.classList.add("active");
      const sub = hash.replace("#/app/","").split("?")[0] || "today";
      const view = appRoutes.includes(sub) ? sub : "today";
      showAppView(view);
      document.body.style.overflow = "hidden";
    }
    else if (hash.startsWith("#/onboarding")){
      views.onboarding.classList.add("active");
      XIO_SITE.initOnboarding();
      if (new URLSearchParams(hash.split("?")[1] || "").get("demo")){
        E().reset(); E().seedDemo();
        toast("Demo profile loaded — this is what XIO looks like after a few days of use.");
        location.hash = "#/app/today";
        return;
      }
    }
    else {
      // 4-page public site: home / intelligence / systems / pricing
      views.landing.classList.add("active");
      const p = hash.replace(/^#\/?/, "").split("?")[0] || "home";
      const page = ["home","intelligence","systems","pricing"].includes(p) ? p : "home";
      if (hash !== "#/" + page) history.replaceState(null, "", "#/" + page);
      XIO_SITE.showPage(page);
    }
    syncChrome();
  }

  function showAppView(view){
    document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
    document.getElementById("av-" + view)?.classList.add("active");
    document.querySelectorAll(".side-nav a").forEach(a => a.classList.toggle("active", a.dataset.route === view));
    document.getElementById("topbar-title").textContent = titles[view] || "XIO";
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("app-scroll").scrollTop = 0;

    const renders = {
      today: renderToday, intelligence: renderIntelligence, insights: renderInsights,
      memory: renderMemory, goals: renderGoals, settings: renderSettings
    };
    if (renders[view]) renders[view]();
    if (view === "chat") XIO_CHAT.mount();
    if (view === "packs") XIO_TOOLS.renderPacks();
    if (view === "toolkits") XIO_TOOLS.renderToolkits();
    if (view === "prompts") XIO_TOOLS.renderLibrary();
    if (view === "pricing") XIO_SITE.renderPricing("app-pricing", XIO_DATA.plans);
  }

  /* ══ Chrome sync (status + confidence) ═══════════════ */
  function syncChrome(){
    const ms = E().activeMemories().length;
    const el = document.getElementById("side-status-text");
    if (el) el.textContent = `Learning · ${ms} ${ms === 1 ? "memory" : "memories"}`;
    const pill = document.getElementById("confidence-pill");
    if (pill){ const avg = E().avgConfidence(); pill.textContent = ms ? `XIO confidence ${avg}%` : "No memory yet"; }
    const chip = document.getElementById("plan-chip");
    if (chip){ const p = XIO_DATA.plans.find(x => x.id === E().state.profile.plan); chip.textContent = p ? p.name : "XIO Core"; }
  }

  /* ══ TODAY ═════════════════════════════════════════ */
  function renderToday(){
    document.getElementById("today-greeting").textContent = E().greeting();
    document.getElementById("today-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

    const b = E().briefing();
    document.getElementById("briefing").innerHTML = `
      <div class="brief-item"><div class="brief-ico">🎯</div><div><h4>Biggest priority</h4><p>${esc(b.priority)}</p></div></div>
      <div class="brief-item"><div class="brief-ico">⚡</div><div><h4>Your momentum</h4><p>${esc(b.momentum)}</p></div></div>
      <div class="brief-item"><div class="brief-ico">🧠</div><div><h4>Something I noticed</h4><p>${esc(b.noticed)}</p></div></div>`;

    // momentum
    const series = E().momentumSeries();
    const max = Math.max(1, ...series.map(s => s.count));
    document.getElementById("momentum-block").innerHTML = `
      <div class="focus-num">${E().streak()}<span style="font-size:16px;color:var(--muted)"> day streak</span></div>
      <div class="muted small" style="margin-top:4px">${E().totalActive()} total actions logged</div>
      <div class="streak-bar">${series.map(s => `<div class="streak-cell" title="${s.key}: ${s.count} actions"><div class="streak-fill" style="height:${Math.round(s.count / max * 100)}%;opacity:${s.count ? 1 : .25}"></div></div>`).join("")}</div>
      <div class="muted tiny" style="margin-top:8px">Last 14 days of XIO activity</div>`;

    // focus
    const g = E().topGoal();
    const gObj = E().state.goals.find(x => !x.done);
    document.getElementById("focus-block").innerHTML = g ? `
      <p style="font-size:15.5px">${esc(String(g).replace(/^(Goal:|Is working toward:)\s*/i,""))}</p>
      ${gObj ? `<div class="goal-prog" style="margin-top:14px"><div class="prog-track"><div class="prog-fill" style="width:${gObj.progress}%"></div></div><div class="goal-foot"><span>${gObj.progress}% complete</span><button class="mini-link" id="focus-advance">+10% progress</button></div></div>` : `<div class="muted small" style="margin-top:10px">Pulled from memory · <a class="mini-link" href="#/app/goals">manage goals →</a></div>`}
    ` : `<div class="empty-note">No goal yet. <a class="mini-link" href="#/app/goals">Set your first goal →</a></div>`;
    document.getElementById("focus-advance")?.addEventListener("click", () => {
      gObj.progress = Math.min(100, gObj.progress + 10);
      if (gObj.progress >= 100) gObj.done = true;
      E().save(); E().logEvent("goal-progress"); renderToday(); toast(gObj.done ? "Goal complete — that's a real win. Logged." : "Progress logged. Momentum acknowledged.", "good");
    });

    // noticed
    const ins = E().state.insights.filter(i => i.status === "open").sort((a,b2) => b2.confidence - a2.confidence)[0];
    document.getElementById("noticed-block").innerHTML = ins ? `
      <p style="font-size:14.5px">${esc(ins.insight)}</p>
      <div class="conf-bar"><div class="conf-fill" style="width:${ins.confidence}%"></div></div>
      <div class="row" style="justify-content:space-between"><span class="muted tiny">Confidence ${ins.confidence}%</span><a class="mini-link" href="#/app/insights">All insights →</a></div>
    ` : `<div class="empty-note">XIO needs a little more time with you before it says "I noticed…". Keep using it today.</div>`;

    // next move
    const nba = E().nextBestAction();
    document.getElementById("nextmove-block").innerHTML = `
      <div class="next-move">${esc(nba.title)}</div>
      <p class="next-why">${esc(nba.why)}</p>
      <p style="margin-top:10px;font-size:14px"><b>The move:</b> ${esc(nba.action)}</p>
      <div class="row" style="gap:10px;margin-top:16px;flex-wrap:wrap">
        ${nba.sprint ? `<button class="btn btn-primary btn-sm" id="nba-sprint">Start 25-min focus sprint</button>` : `<button class="btn btn-primary btn-sm" onclick="location.hash='#/app/chat'">Talk it through with XIO</button>`}
        <button class="btn btn-ghost btn-sm" onclick="location.hash='#/app/chat'">Discuss with XIO</button>
      </div>`;
    document.getElementById("nba-sprint")?.addEventListener("click", () => startSprint(nba.action));
  }

  /* ══ MY INTELLIGENCE ════════════════════════════════ */
  function renderIntelligence(){
    const ms = E().activeMemories();
    const conf = E().avgConfidence();
    const daysActive = E().state.created ? Math.max(1, Math.ceil((Date.now() - E().state.created) / 86400000)) : 1;
    document.getElementById("intel-stats").innerHTML = [
      { n: ms.length, l: "Memories learned" },
      { n: conf + "%", l: "Avg. confidence" },
      { n: E().streak(), l: "Day streak" },
      { n: E().state.insights.filter(i => i.status !== "rejected").length, l: "Active insights" }
    ].map(s => `<div class="stat-card glass"><div class="num">${s.n}</div><div class="lbl">${s.l}</div></div>`).join("");

    const n = E().intelNarrative();
    const dayWord = daysActive === 1 ? "your first day" : `day ${daysActive}`;
    document.getElementById("intel-narrative").innerHTML = `
      <div class="in-block"><h4>Your current focus</h4><p>${esc(n.focus)}</p></div>
      <div class="in-block"><h4>How you work best</h4><p>${esc(n.style)}</p><span class="hedge">${(() => { const c = ms.filter(m => m.category === "working_style").length; return c ? `Learned from ${c} observation${c > 1 ? "s" : ""}` : "Still learning"; })()} · ${dayWord}</span></div>
      <div class="in-block"><h4>What I've noticed</h4><p>${esc(n.noticed)}</p><span class="hedge">XIO presents patterns as hypotheses — confirm or correct them in Insights.</span></div>
      <div class="in-block"><h4>What seems to motivate you</h4><p>${esc(n.motivation)}</p></div>
      <div class="in-block"><h4>Current opportunity</h4><p>${esc(n.opportunity)}</p></div>
      ${n.uncertain ? `<div class="in-block"><h4>Still learning</h4><p class="muted">XIO holds ${n.uncertain} low-confidence ${n.uncertain === 1 ? "memory" : "memories"} it isn't sure about yet. It will ask before acting on them — <a class="mini-link" href="#/app/memory">review them →</a></p></div>` : ""}`;

    // psychology read
    const psi = document.getElementById("psych-read");
    const open = E().state.insights.filter(i => i.status === "open").length;
    psi.innerHTML = `
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">${["CLARITY","FOCUS","DECISION","ACTION","ENCOURAGEMENT","SIMPLIFICATION","CELEBRATION"].map(s => `<span class="tag" style="opacity:.8">${XIO_DATA.psychStates[s].label}</span>`).join("")}</div>
      <p class="muted small">Every message you send is quietly classified into what kind of help serves you right now — then XIO answers in that mode. ${open ? `${open} open ${open === 1 ? "insight is" : "insights are"} waiting for your verdict.` : "No pending insights for review right now."}</p>`;
  }

  /* ══ INSIGHTS ══════════════════════════════════════ */
  function renderInsights(){
    E().refreshInsights();
    const list = document.getElementById("insights-list");
    const ins = E().state.insights.filter(i => i.status !== "rejected").sort((a,b) => b.created - a.created);
    list.innerHTML = ins.length ? ins.map(i => `
      <div class="insight-card glass" data-id="${i.id}">
        <div class="insight-top">
          <span class="insight-cat">${esc(i.category)}</span>
          <span class="insight-conf">${i.status === "confirmed" ? "✓ You confirmed this" : `Confidence ${i.confidence}%`}</span>
        </div>
        <p>${esc(i.insight)}</p>
        <div class="insight-evidence">Evidence: ${esc(i.evidence)}</div>
        <div class="conf-bar"><div class="conf-fill" style="width:${i.confidence}%"></div></div>
        ${i.status === "open" ? `
        <div class="row" style="gap:8px;margin-top:6px">
          <button class="btn btn-ghost btn-sm ins-yes">That's right</button>
          <button class="btn btn-ghost btn-sm ins-no">Not quite</button>
        </div>` : ""}
      </div>`).join("") :
      `<div class="empty-note">No insights yet. Patterns emerge after a few honest conversations — XIO never invents them.</div>`;

    list.querySelectorAll(".ins-yes").forEach(b => b.onclick = () => { E().reactInsight(b.closest("[data-id]").dataset.id, true); renderInsights(); toast("Confirmed — XIO weighs this more heavily now.", "good"); });
    list.querySelectorAll(".ins-no").forEach(b => b.onclick = () => { E().reactInsight(b.closest("[data-id]").dataset.id, false); renderInsights(); toast("Corrected. Getting it wrong-usefully is how XIO learns."); });
  }

  /* ══ MEMORY ════════════════════════════════════════ */
  function renderMemory(){
    const list = document.getElementById("memory-list");
    const ms = E().state.memories.filter(m => m.active !== false).sort((a,b) => b.created - a.created);
    list.innerHTML = ms.length ? ms.map(m => {
      const confClass = m.confidence >= 75 ? "var(--good)" : m.confidence >= 50 ? "var(--acc-2)" : "var(--warn)";
      return `
      <div class="mem-card glass" data-id="${m.id}">
        <div class="mem-cat">${XIO_DATA.categories[m.category] || m.category}</div>
        <div class="mem-body">
          <p>${esc(m.text)}</p>
          <div class="mem-meta">
            <span style="color:${confClass}">● ${m.confidence}% confident</span>
            <span>${m.confirmed ? "You confirmed this" : m.source === "onboarding" ? "From onboarding" : "XIO proposed"}</span>
            <span>${fmtDate(m.created)}</span>
          </div>
        </div>
        <div class="mem-actions">
          <button class="icon-btn mem-edit" title="Correct it">✎</button>
          <button class="icon-btn mem-del" title="Delete">🗑</button>
        </div>
      </div>`;
    }).join("") : `<div class="empty-note">XIO hasn't remembered anything yet. Start a conversation, or add a memory manually.</div>`;

    list.querySelectorAll(".mem-del").forEach(b => b.onclick = () => {
      modal(`<h3>Delete this memory?</h3><p class="muted">XIO will forget it completely and stop using it. This is instant and permanent.</p>
        <div class="row"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-danger" id="md-del">Delete memory</button></div>`,
        (ov, close) => {
          ov.querySelector("[data-x]").onclick = close;
          ov.querySelector("#md-del").onclick = () => { E().deleteMemory(b.closest("[data-id]").dataset.id); close(); renderMemory(); syncChrome(); toast("Forgotten. It's gone from XIO's memory."); };
        });
    });
    list.querySelectorAll(".mem-edit").forEach(b => b.onclick = () => {
      const m = E().state.memories.find(x => x.id === b.closest("[data-id]").dataset.id);
      modal(`<h3>Correct this memory</h3><p class="muted">Corrections are gold — they teach XIO the truth directly.</p>
        <textarea id="me-text" rows="3">${esc(m.text)}</textarea>
        <select id="me-cat">${Object.entries(XIO_DATA.categories).map(([k,v]) => `<option value="${k}" ${m.category === k ? "selected" : ""}>${v}</option>`).join("")}</select>
        <div class="row"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-primary" id="me-save">Save correction</button></div>`,
        (ov, close) => {
          ov.querySelector("[data-x]").onclick = close;
          ov.querySelector("#me-save").onclick = () => {
            const txt = ov.querySelector("#me-text").value.trim();
            if (!txt) return;
            E().editMemory(m.id, txt, ov.querySelector("#me-cat").value);
            close(); renderMemory(); syncChrome(); toast("Corrected — and confidence raised. Thank you for teaching me.", "good");
          };
        });
    });
  }

  function bindMemoryControls(){
    document.getElementById("mem-add").onclick = () => {
      modal(`<h3>Add a memory manually</h3><p class="muted">Tell XIO something worth knowing — at full confidence.</p>
        <textarea id="ma-text" rows="3" placeholder="e.g. I prefer concise answers and morning deep work sessions"></textarea>
        <select id="ma-cat">${Object.entries(XIO_DATA.categories).map(([k,v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <div class="row"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-primary" id="ma-save">Remember this</button></div>`,
        (ov, close) => {
          ov.querySelector("[data-x]").onclick = close;
          ov.querySelector("#ma-save").onclick = () => {
            const txt = ov.querySelector("#ma-text").value.trim();
            if (!txt) return;
            E().addMemory({ text: txt, category: ov.querySelector("#ma-cat").value, confidence: 95, source: "manual", confirmed: true });
            close(); renderMemory(); syncChrome(); toast("Remembered at full confidence.", "good");
          };
        });
    };
    document.getElementById("mem-export").onclick = () => { E().exportData(); toast("Exported — everything XIO knows, in your hands."); };
    document.getElementById("mem-clear").onclick = () => {
      modal(`<h3>Delete ALL memory?</h3><p class="muted">Everything XIO has learned — memories, insights, history — will be permanently forgotten. Goals and settings stay. This can't be undone.</p>
        <div class="row"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-danger" id="mc-go">Delete all memory</button></div>`,
        (ov, close) => {
          ov.querySelector("[data-x]").onclick = close;
          ov.querySelector("#mc-go").onclick = () => {
            E().state.memories = []; E().state.insights = []; E().state.chat = []; E().state.challengeMentions = {};
            E().save(); close(); renderMemory(); syncChrome(); toast("XIO has forgotten everything. A clean slate.");
          };
        });
    };
  }

  /* ══ GOALS ═════════════════════════════════════════ */
  function renderGoals(){
    const gl = document.getElementById("goals-list");
    const goals = E().state.goals;
    gl.innerHTML = goals.length ? goals.map(g => `
      <div class="goal-card glass" data-id="${g.id}">
        <div class="goal-top">
          <h4 style="${g.done ? "text-decoration:line-through;opacity:.6" : ""}">${esc(g.title)}</h4>
          ${g.done ? `<span class="tag" style="background:rgba(61,220,151,.12);color:var(--good);border-color:rgba(61,220,151,.3)">Done</span>` : `<button class="icon-btn g-done" title="Mark complete">✓</button><button class="icon-btn g-del" title="Delete">🗑</button>`}
        </div>
        <div class="goal-prog"><div class="prog-track"><div class="prog-fill" style="width:${g.progress}%"></div></div>
        <div class="goal-foot"><span>${g.progress}%</span>${!g.done ? `<div class="row" style="gap:6px"><button class="mini-link g-plus">+10%</button></div>` : ""}</div></div>
      </div>`).join("") : `<div class="empty-note">No goals yet. Add one — XIO protects focus around named goals.</div>`;

    gl.querySelectorAll(".g-plus").forEach(b => b.onclick = () => {
      const g = E().state.goals.find(x => x.id === b.closest("[data-id]").dataset.id);
      g.progress = Math.min(100, g.progress + 10); if (g.progress >= 100) g.done = true;
      E().save(); E().logEvent("goal-progress"); renderGoals(); syncChrome(); toast(g.done ? "Goal complete. Genuinely — well done." : "+10% logged.");
    });
    gl.querySelectorAll(".g-done").forEach(b => b.onclick = () => {
      const g = E().state.goals.find(x => x.id === b.closest("[data-id]").dataset.id);
      g.done = true; g.progress = 100; E().addWin(`Completed goal: ${g.title}`); renderGoals(); toast("Goal complete — logged as a win.", "good");
    });
    gl.querySelectorAll(".g-del").forEach(b => b.onclick = () => {
      E().state.goals = E().state.goals.filter(x => x.id !== b.closest("[data-id]").dataset.id); E().save(); renderGoals();
    });

    const pl = document.getElementById("projects-list");
    pl.innerHTML = E().state.projects.length ? E().state.projects.map(p => `
      <div class="goal-card glass" data-id="${p.id}">
        <div class="goal-top"><h4>${esc(p.name)}</h4>
          <span class="tag" style="${p.status === "stalled" ? "background:rgba(255,207,92,.1);color:var(--warn);border-color:rgba(255,207,92,.3)" : ""}">${p.status}</span>
          <button class="icon-btn p-del" title="Delete">🗑</button>
        </div>
        ${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ""}
        <div class="row" style="gap:8px;margin-top:10px">
          <button class="btn btn-ghost btn-sm p-touch">Log progress</button>
          ${p.status !== "stalled" ? `<button class="btn btn-ghost btn-sm p-stall">Mark stalled</button>` : ""}
        </div>
      </div>`).join("") : `<div class="empty-note">No projects tracked. Projects tell XIO what "progress" means for you.</div>`;

    pl.querySelectorAll(".p-touch").forEach(b => b.onclick = () => { E().touchProject(b.closest("[data-id]").dataset.id); E().logEvent("project"); renderGoals(); toast("Progress logged — XIO sees the movement.", "good"); });
    pl.querySelectorAll(".p-stall").forEach(b => b.onclick = () => { const p = E().state.projects.find(x => x.id === b.closest("[data-id]").dataset.id); p.status = "stalled"; E().save(); renderGoals(); toast("Marked stalled. Naming it honestly is the first move back."); });
    pl.querySelectorAll(".p-del").forEach(b => b.onclick = () => { E().state.projects = E().state.projects.filter(x => x.id !== b.closest("[data-id]").dataset.id); E().save(); renderGoals(); });
  }

  function bindGoals(){
    document.getElementById("goal-add").onclick = () => {
      modal(`<h3>New goal</h3><p class="muted">Name it in one line. Specific beats impressive.</p>
        <input id="ga-title" placeholder="e.g. Launch the new offer by end of month" />
        <div class="row"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-primary" id="ga-save">Add goal</button></div>`,
        (ov, close) => {
          ov.querySelector("[data-x]").onclick = close;
          ov.querySelector("#ga-title").focus();
          ov.querySelector("#ga-save").onclick = () => {
            const t = ov.querySelector("#ga-title").value.trim(); if (!t) return;
            E().addGoal(t); close(); renderGoals(); syncChrome(); toast("Goal added. XIO will protect focus for it.", "good");
          };
        });
    };
    document.getElementById("project-add").onclick = () => {
      modal(`<h3>New project</h3><p class="muted">A goal is a direction — a project is the thing you're building.</p>
        <input id="pa-name" placeholder="e.g. Client onboarding system" />
        <input id="pa-note" placeholder="Optional note (status, next step…)" />
        <div class="row"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-primary" id="pa-save">Add project</button></div>`,
        (ov, close) => {
          ov.querySelector("[data-x]").onclick = close;
          ov.querySelector("#pa-save").onclick = () => {
            const n = ov.querySelector("#pa-name").value.trim(); if (!n) return;
            E().addProject({ name: n, note: ov.querySelector("#pa-note").value.trim(), status: "active" });
            close(); renderGoals(); toast("Project tracked. Stall detection is on.");
          };
        });
    };
  }

  /* ══ SETTINGS ══════════════════════════════════════ */
  function renderSettings(){
    const s = E().state;
    document.getElementById("set-name").value = s.profile.name || "";
    document.getElementById("set-tone").value = s.profile.tone;
    document.getElementById("set-detail").value = s.profile.detail;
    document.getElementById("set-plan").value = s.profile.plan;
    document.getElementById("set-learning").classList.toggle("on", s.prefs.learning);
    document.getElementById("set-ask").classList.toggle("on", s.prefs.askBeforeMemory);
  }
  function bindSettings(){
    document.getElementById("set-save").onclick = () => {
      const s = E().state;
      s.profile.name = document.getElementById("set-name").value.trim();
      s.profile.tone = document.getElementById("set-tone").value;
      s.profile.detail = document.getElementById("set-detail").value;
      s.profile.plan = document.getElementById("set-plan").value;
      E().save(); syncChrome(); toast("Saved. XIO adapts moving forward.", "good");
    };
    ["set-learning","set-ask"].forEach(id => document.getElementById(id).onclick = e => {
      const on = e.currentTarget.classList.toggle("on");
      if (id === "set-learning"){ E().state.prefs.learning = on; toast(on ? "Learning resumed. XIO will propose memories again." : "Learning paused. XIO remembers nothing new until you resume."); }
      else { E().state.prefs.askBeforeMemory = on; toast(on ? "XIO will ask before remembering." : "XIO will remember automatically — you can still delete anything."); }
      E().save();
    });
    document.getElementById("set-export").onclick = () => { E().exportData(); toast("Exported — your intelligence belongs to you."); };
    document.getElementById("set-reset").onclick = () => {
      modal(`<h3>Reset XIO completely?</h3><p class="muted">Profile, memories, goals, history — everything gone, back to a fresh install. Type <b>reset</b> to confirm.</p>
        <input id="rs-confirm" placeholder="type reset" />
        <div class="row"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-danger" id="rs-go">Reset everything</button></div>`,
        (ov, close) => {
          ov.querySelector("[data-x]").onclick = close;
          ov.querySelector("#rs-go").onclick = () => {
            if (ov.querySelector("#rs-confirm").value.trim().toLowerCase() !== "reset"){ toast("Type 'reset' to confirm.", "bad"); return; }
            E().reset(); close(); location.hash = "#/"; toast("XIO is a blank page again.");
          };
        });
    };
  }

  /* ══ FOCUS SPRINT ══════════════════════════════════ */
  let sprintTimer = null;
  const SPRINT_SECONDS = 25 * 60;
  function startSprint(task){
    const ov = document.getElementById("sprint-overlay");
    document.getElementById("sprint-task").textContent = task || "One move. Full attention.";
    ov.classList.add("show");
    let left = SPRINT_SECONDS;
    const ring = document.getElementById("sprint-ring");
    const timeEl = document.getElementById("sprint-time");
    const C = 2 * Math.PI * 52;
    const tick = () => {
      const m = String(Math.floor(left / 60)).padStart(2, "0"), s = String(left % 60).padStart(2, "0");
      timeEl.textContent = `${m}:${s}`;
      ring.style.strokeDashoffset = C * (1 - left / SPRINT_SECONDS);
      if (left <= 0){ endSprint(true); return; }
      left--;
      sprintTimer = setTimeout(tick, 1000);
    };
    ring.style.strokeDasharray = C;
    tick();
  }
  function endSprint(completed){
    clearTimeout(sprintTimer);
    document.getElementById("sprint-overlay").classList.remove("show");
    if (completed){
      E().state.stats.sprints++; E().addWin("Completed a 25-minute focus sprint"); E().logEvent("sprint");
      toast("Sprint complete. That's a logged win — momentum acknowledged.", "good");
    } else toast("Sprint ended early. The streak forgive — restart when ready.");
    syncChrome();
  }

  /* ══ Global bindings ════════════════════════════════ */
  function bindGlobal(){
    window.addEventListener("hashchange", route);
    document.getElementById("burger").onclick = () => document.getElementById("sidebar").classList.add("open");
    document.getElementById("side-close").onclick = () => document.getElementById("sidebar").classList.remove("open");
    document.getElementById("topbar-action").onclick = () => { location.hash = "#/app/chat"; XIO_CHAT.newConversation(); };
    document.getElementById("sprint-cancel").onclick = () => endSprint(false);
    document.getElementById("sprint-done").onclick = () => endSprint(true);
    XIO_SITE.bindBilling("app-billing-switch", "abt-monthly", "abt-annual", [() => XIO_SITE.renderPricing("app-pricing", XIO_DATA.plans)]);
    // close sidebar on outside click (mobile)
    document.addEventListener("click", e => {
      const sb = document.getElementById("sidebar");
      if (sb.classList.contains("open") && !sb.contains(e.target) && e.target.id !== "burger") sb.classList.remove("open");
    });
  }

  /* ══ Boot ══════════════════════════════════════════ */
  function boot(){
    E().refreshInsights();
    XIO_SITE.initLanding();
    XIO_CHAT.init();
    XIO_TOOLS.initContent();
    XIO_TOOLS.initPrompts();
    bindGlobal(); bindGoals(); bindMemoryControls(); bindSettings();
    route();
    // log a session event (feeds momentum honestly)
    if (E().state.onboarded) E().logEvent("session");
  }

  document.addEventListener("DOMContentLoaded", boot);

  return { toast, modal, upgradeModal, syncChrome, showAppView };
})();

window.XIO_APP = XIO_APP;
