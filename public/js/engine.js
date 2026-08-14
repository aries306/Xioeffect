/* ═════════════ XIO 2.0 — Intelligence Engine ═════════════
   State + memory + psychology + insights + next-best-action.
   Everything is local-first: the "private by design" contract.
   ───────────────────────────────────────────────────────────
   PRODUCTION HOOK: replace `XIO_ENGINE.generateReply()` internals
   with a model-router call (see README §"Going to production").
   The interface is designed so the swap is one function.
   ═══════════════════════════════════════════════════════════ */
"use strict";

const XIO_ENGINE = (() => {
  const LS_KEY = "xio.state.v2";
  const { uid, clamp, daysBetween, todayKey } = XIO_UTILS;

  /* ── Shape ─────────────────────────────────────────── */
  const blank = () => ({
    created: null,
    onboarded: false,
    profile: { name: "", tone: "Calm & confident", detail: "Balanced", plan: "core" },
    prefs: { learning: true, askBeforeMemory: true },
    memories: [],        // {id,text,category,confidence,source,created,lastConfirmed,proposals,confirmed,active}
    goals: [],           // strings (from onboarding) + {id,title,progress,created,done}
    projects: [],        // {id,name,status,note,created,lastTouched}
    wins: [],            // {id,text,at}
    events: [],          // {at,kind} momentum ledger
    chat: [],            // {role,text,at}
    insights: [],        // {id,insight,category,confidence,evidence,status,created}
    promptLibrary: [],   // {id,title,prompt,created}
    stats: { chats: 0, sprints: 0, generated: 0 },
    challengeMentions: {}, // keyword-ish challenge counting for patterns
    goalMentions: {},
    hourLog: {},            // histogram of active hours
    sprint: { running: false, endsAt: null, secondsLeft: 0, task: "" }
  });

  /* ── Persistence ───────────────────────────────────── */
  let state = blank();
  function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  function load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){ state = { ...blank(), ...JSON.parse(raw) }; }
    }catch(e){ state = blank(); }
  }
  function reset(){ state = blank(); save(); }

  /* ── Event ledger / momentum ───────────────────────── */
  function logEvent(kind){
    state.events.push({ at: Date.now(), kind });
    state.hourLog[new Date().getHours()] = (state.hourLog[new Date().getHours()] || 0) + 1;
    if (state.events.length > 800) state.events = state.events.slice(-800);
    save();
  }
  function momentumSeries(days = 14){
    const out = []; const now = Date.now();
    for(let i = days - 1; i >= 0; i--){
      const day = new Date(now - i * 86400000);
      const key = todayKey(day.getTime());
      const count = state.events.filter(e => todayKey(e.at) === key).length;
      out.push({ key, label: day.toLocaleDateString(undefined,{weekday:"narrow"}), count });
    }
    return out;
  }
  function streak(){
    let s = 0; const now = Date.now();
    for(let i = 0;; i++){
      const key = todayKey(now - i * 86400000);
      const has = state.events.some(e => todayKey(e.at) === key);
      if(has) s++; else { if(i === 0) continue; break; }
    }
    return s;
  }
  function totalActive(){ return state.events.length; }

  /* ── Memory engine ─────────────────────────────────── */
  function addMemory({ text, category = "other", confidence = 60, source = "conversation", confirmed = false }){
    text = (text || "").trim();
    if(!text) return null;
    // duplicate / reinforcement check
    const norm = t => t.toLowerCase().replace(/[^\w\s]/g,"").trim();
    const existing = state.memories.find(m => m.active !== false && norm(m.text) === norm(text));
    if (existing){
      existing.confidence = clamp(existing.confidence + 8, 5, 99);
      existing.lastConfirmed = Date.now();
      save(); return { memory: existing, reinforced: true };
    }
    const mem = {
      id: uid(), text, category, confidence: clamp(confidence, 5, 100),
      source, created: Date.now(), lastConfirmed: Date.now(),
      confirmed, active: true
    };
    state.memories.push(mem); save();
    refreshInsights();
    return { memory: mem, reinforced: false };
  }
  function confirmMemory(id, val = true){
    const m = state.memories.find(x => x.id === id); if(!m) return;
    m.confirmed = val;
    m.confidence = clamp(m.confidence + (val ? 18 : -20), 5, 99);
    if (!val) m.active = false;
    m.lastConfirmed = Date.now();
    save(); refreshInsights();
  }
  function deleteMemory(id){ state.memories = state.memories.filter(m => m.id !== id); save(); }
  function editMemory(id, text, category){
    const m = state.memories.find(x => x.id === id); if(!m) return;
    m.text = text; if(category) m.category = category;
    m.confirmed = true; m.confidence = clamp(m.confidence + 5, 5, 99);
    m.lastConfirmed = Date.now(); save(); refreshInsights();
  }
  function activeMemories(){ return state.memories.filter(m => m.active !== false).sort((a,b) => b.confidence - a.confidence); }
  function memoriesByCategory(cat){ return activeMemories().filter(m => m.category === cat); }
  function avgConfidence(){
    const ms = activeMemories(); if(!ms.length) return 0;
    return Math.round(ms.reduce((s,m) => s + m.confidence, 0) / ms.length);
  }

  /* ── Extraction: text → candidate memories ─────────── */
  function extractMemories(text){
    const found = [];
    for (const pat of XIO_DATA.memoryPatterns){
      const m = text.match(pat.re);
      if (m){
        const frag = text.slice(Math.max(0, m.index + m[0].length)).replace(/^[,.\s:;-]+/,"").trim();
        const first = frag.split(/[.!?\n]/)[0].trim().slice(0, 180);
        if (first.length >= 3){
          found.push({ text: pat.template(first), category: pat.category, confidence: 45, source: "conversation" });
        }
      }
    }
    // dedupe within
    const seen = new Set();
    return found.filter(f => { const k = f.text.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0, 2);
  }

  /* reinforcement counters for pattern detection */
  function bumpMentions(mem){
    if (mem.category === "challenge"){
      const k = mem.text.slice(0, 40).toLowerCase();
      state.challengeMentions[k] = (state.challengeMentions[k] || 0) + 1;
    }
    if (mem.category === "goal"){
      const k = mem.text.slice(0, 40).toLowerCase();
      state.goalMentions[k] = (state.goalMentions[k] || 0) + 1;
    }
    save();
  }

  /* ── Psychology layer: classify the message ────────── */
  function classify(text){
    const t = text.toLowerCase();
    let best = "DEFAULT", bestScore = 0;
    for (const [stateName, cfg] of Object.entries(XIO_DATA.psychStates)){
      let score = 0;
      for (const w of cfg.words) if (t.includes(w)) score += w.length > 6 ? 2 : 1;
      if (score > bestScore){ bestScore = score; best = stateName; }
    }
    return { state: best, score: bestScore, label: XIO_DATA.psychStates[best]?.label || "General" };
  }

  /* ── Context assembly for replies ──────────────────── */
  function stripPrefix(text){
    // remove any "Some Label:" style prefix from a memory before weaving it into speech
    const m = String(text).match(/^.{2,45}?:\s*(.+)$/s);
    return (m ? m[1] : String(text)).trim();
  }
  function pickBridge(memCat){
    const ms = memoriesByCategory(memCat);
    if(!ms.length) return "";
    const m = ms[0];
    const short = stripPrefix(m.text).split(",")[0].slice(0, 90);
    return XIO_DATA.bridgeLines[memCat === "achievement" ? "win" : memCat === "working_style" ? "style" : memCat === "challenge" ? "challenge" : "goal"]?.replace("{short}", short) || "";
  }

  function relevantMemory(text){
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    if(!words.length) return null;
    let best = null, bestScore = 0;
    for (const m of activeMemories()){
      const mt = m.text.toLowerCase();
      const score = words.reduce((s,w) => s + (mt.includes(w) ? 1 : 0), 0);
      if (score > bestScore){ bestScore = score; best = m; }
    }
    return bestScore > 0 ? best : null;
  }

  function smallestStep(){
    // next-best micro-move derived from priorities
    const goal = topGoal();
    const stalled = stalledProject();
    if (stalled) return `define the next concrete deliverable for "${stalled.name}" — one sentence, then 25 minutes on it`;
    if (goal) return `spend 25 minutes on the one part of "${shortTitle(goal)}" that you're most likely to avoid`;
    return "tell me one outcome you want from this week, and we'll cut it down to today's move";
  }

  function shortTitle(s){
    const t = String(s).match(/^.{2,45}?:\s*(.+)$/s);
    return (t ? t[1] : String(s)).trim().slice(0, 90);
  }

  function topGoal(){
    const g = state.goals.find(x => !x.done);
    if (g) return g.title;
    const gm = memoriesByCategory("goal")[0];
    return gm ? gm.text : "";
  }

  function stalledProject(){
    const ps = state.projects.filter(p => p.status === "stalled");
    if (ps.length) return ps[0];
    const active = state.projects.filter(p => p.status === "active" && (Date.now() - (p.lastTouched || p.created)) > 5 * 86400000);
    if (active.length) return { ...active[0], name: active[0].name, _inferred: true };
    return null;
  }

  function somethingThatMatters(){ const g = topGoal(); return g ? shortTitle(g) : "what you're building"; }

  function generateReply(userText){
    const cls = classify(userText);
    const scaffold = XIO_DATA.chatScaffolds[cls.state] || XIO_DATA.chatScaffolds.DEFAULT;
    let tpl = scaffold[Math.floor(Math.random() * scaffold.length)];

    // adaptive detail level
    const bridge = pickBridge("goal") || pickBridge("working_style") || pickBridge("challenge") || pickBridge("achievement");
    const rel = relevantMemory(userText);
    let context = bridge ? bridge.trim() + " " : "";
    if (rel && rel.confidence >= 50){
      context += `\n\nOne thing I remember that feels relevant: ${stripPrefix(rel.text)}. `;
    }

    const reframe = buildReframe(cls.state, userText);
    let reply = tpl.replace("{context}", context).replace("{reframe}", reframe)
      .replace("{question}", questionFor(cls.state)).replace("{somethingThatMatters}", somethingThatMatters());

    if (state.profile.detail === "Short & sharp"){
      reply = reply.split("\n\n").slice(0, 2).join("\n\n");
    }
    return { reply, psi: cls };
  }

  function buildReframe(psiState, userText){
    const goal = topGoal(); const s = smallestStep();
    const fragments = {
      CLARITY: `the actual question is narrower than it feels right now. Most of what looks complex here is one decision wearing a costume of complications${goal ? ` — and it connects directly to ${shortTitle(goal)}` : ""}`,
      FOCUS: `${s}. That's it for now. The rest stays parked — deliberately, not accidentally`,
      DECISION: `My lean, based on what I know about you: pick the option that keeps ${goal ? `progress on ${shortTitle(goal)}` : "your main thing"} moving, even if it's less comfortable`,
      ACTION: `${s}. That's the move`,
      ENCOURAGEMENT: `Today: ${s}. One move only. The goal is a finished small thing, not a heroic day`,
      CHALLENGE: `take ${goal ? shortTitle(goal) : "your top goal"} and set the target one notch above comfortable — then reverse-engineer the next 7 days from that bar`,
      SIMPLIFICATION: `${s}. Everything else is parked with permission`,
      REFLECTION: `There's a pattern worth naming here — you learn fastest by doing small versions of the big thing, not by planning the big thing longer`,
      CELEBRATION: `I've logged this as a win. Momentum likes evidence, and this is evidence`,
      DEFAULT: `the useful move here is probably ${s}`
    };
    return fragments[psiState] || fragments.DEFAULT;
  }

  function questionFor(psiState){
    const q = {
      CLARITY: "what part, exactly, feels foggy?",
      FOCUS: "what's been stealing your attention most this week?",
      DECISION: "which option does future-you thank you for?",
      ACTION: "what would 'done' look like in one sentence?",
      ENCOURAGEMENT: "what's the heaviest thing you're carrying right now?",
      CHALLENGE: "what would 'scary but exciting' look like here?",
      SIMPLIFICATION: "if you could only keep one task today, which survives?",
      REFLECTION: "what would you do differently with the same information again?",
      CELEBRATION: "what did finishing this teach you about yourself?",
      DEFAULT: "what outcome do you actually want from this?"
    };
    return q[psiState] || q.DEFAULT;
  }

  /* ── Insight engine ────────────────────────────────── */
  function refreshInsights(){
    const out = [];
    const push = (insight, category, confidence, evidence) =>
      out.push({ id: uid(), insight, category, confidence: clamp(confidence, 20, 96), evidence, status: "open", created: Date.now() });

    // repeated challenge pattern
    const chKeys = Object.keys(state.challengeMentions);
    const repeated = chKeys.filter(k => state.challengeMentions[k] >= 2);
    if (repeated.length){
      const cm = memoriesByCategory("challenge")[0];
      if (cm) push(
        `I've noticed friction keeps returning around ${cm.text.replace(/^Is (losing time\/energy to|experiencing friction with):\s*/i,"")}. It may be structural — worth systemizing rather than pushing harder.`,
        "pattern", 60 + repeated.length * 8, `Mentioned in ${repeated.length + 1} separate conversations`
      );
    }
    // many goals
    const ms = activeMemories();
    const goals = ms.filter(m => m.category === "goal");
    if (goals.length >= 3) push(
      `You're carrying ${goals.length} goals at once. Every one of them is real — but attention divided four ways can look like no progress anywhere. It may be worth naming which one leads the next 30 days.`,
      "focus", 58, `${goals.length} active goal memories`
    );
    // streak insight
    const s = streak();
    if (s >= 3) push(
      `You've shown up ${s} days in a row. It looks like you build momentum through small daily actions rather than occasional heroics — that's worth protecting deliberately.`,
      "momentum", 62 + s * 3, `${s}-day event streak`
    );
    // time-of-day pattern
    const hours = Object.entries(state.hourLog);
    if (hours.length >= 4){
      const total = hours.reduce((a,[,v]) => a + v, 0);
      const morning = hours.filter(([h]) => +h >= 5 && +h < 12).reduce((a,[,v]) => a + v, 0);
      const night = hours.filter(([h]) => +h >= 21 || +h < 5).reduce((a,[,v]) => a + v, 0);
      if (total >= 8 && morning / total > 0.6) push("You consistently engage in the morning — it may be your highest-leverage window for the work that scares you.", "rhythm", 60, `${Math.round(morning/total*100)}% of activity 5am–12pm`);
      else if (total >= 8 && night / total > 0.5) push("A lot of your engagement happens late at night. That can work — but it may also be when the day's unfinished decisions land on you.", "rhythm", 55, `${Math.round(night/total*100)}% of activity after 9pm`);
    }
    // challenge vs win balance
    const wins = memoriesByCategory("achievement").length + state.wins.length;
    const challenges = memoriesByCategory("challenge").length;
    if (wins >= 2 && wins <= challenges) push(
      "You register problems quickly and wins quietly. The evidence says you finish things — your memory just undercounts it. Celebrating completions is not soft; it's fuel.",
      "psychology", 57, `${wins} wins vs ${challenges} open frictions in memory`
    );

    // keep manually confirmed old insights + new ones
    const kept = state.insights.filter(i => i.status === "confirmed");
    state.insights = [...kept, ...out].slice(-12);
    save();
  }

  function reactInsight(id, ok){
    const ins = state.insights.find(i => i.id === id); if(!ins) return;
    ins.status = ok ? "confirmed" : "rejected";
    ins.confidence = clamp(ins.confidence + (ok ? 15 : -25), 5, 99);
    if(!ok) state.insights = state.insights.filter(i => i.id !== id);
    save();
  }

  /* ── Next-best action ──────────────────────────────── */
  function nextBestAction(){
    const cls = recentStateBias();
    const stalled = stalledProject();
    const goal = topGoal();
    if (cls === "SIMPLIFICATION" || cls === "ENCOURAGEMENT"){
      return {
        title: "One 25-minute move — nothing else today",
        why: "Your recent messages carry signals of load. The prescription for overload is a finished small thing, not a bigger plan.",
        action: stalled ? `Pick up "${stalled.name}" for 25 minutes — the piece nearest completion.` : goal ? `One 25-minute block on ${shortTitle(goal)} — just the next physical step.` : "One 25-minute block on whatever's been loudest in your head.",
        sprint: true
      };
    }
    if (stalled){
      return {
        title: `Re-open "${stalled.name}"`,
        why: `It hasn't moved in days, and stalled work taxes attention quietly. Either progress it 25 minutes or consciously retire it — both are wins.`,
        action: `Define the next deliverable for "${stalled.name}" in one sentence, then do a 25-minute sprint on it.`,
        sprint: true
      };
    }
    if (goal){
      return {
        title: `Advance: ${shortTitle(goal).slice(0, 60)}`,
        why: "It's your stated priority. Momentum is the daily habit of moving the main thing before the loud things.",
        action: `25 minutes of honest progress on the most avoided part — before anything administrative.`,
        sprint: true
      };
    }
    return {
      title: "Tell XIO your one outcome for this week",
      why: "An intelligence works best with a target. 30 seconds now makes everything else smarter.",
      action: "Open a conversation and tell XIO what a good week looks like.",
      sprint: false
    };
  }
  function recentStateBias(){
    const recent = state.chat.slice(-6).filter(c => c.role === "user");
    if(!recent.length) return null;
    const votes = {};
    for (const c of recent){ const s = classify(c.text).state; votes[s] = (votes[s] || 0) + 1; }
    return Object.entries(votes).sort((a,b) => b[1] - a[1])[0][0];
  }

  /* ── Briefing (Today) ──────────────────────────────── */
  function briefing(){
    const g = topGoal(); const stalled = stalledProject();
    const noticed = state.insights.filter(i => i.status === "open").sort((a,b) => b.confidence - a.confidence)[0];
    const recentWin = state.wins.slice(-1)[0];
    return {
      priority: g ? shortTitle(g) : "Set your first goal — tell XIO what you're building toward.",
      momentum: streak() > 0
        ? `${streak()} day${streak() > 1 ? "s" : ""} of activity in a row. ${streak() >= 3 ? "Real momentum — protect it." : "The streak is alive."}`
        : "No activity streak yet — today's a clean start, one small move is enough.",
      noticed: noticed ? noticed.insight : (recentWin ? `You finished "${recentWin.text}" recently. People who register wins build more of them — this one's logged.` : "Not enough data yet — use XIO today and patterns will start to surface here."),
      recommendation: nextBestAction()
    };
  }

  /* ── Intelligence narrative ("My Intelligence") ────── */
  function intelNarrative(){
    const ms = activeMemories();
    const byCat = c => ms.filter(m => m.category === c);
    const first = a => a[0] ? a[0].text.replace(/^[^:]+:\s*/, "") : null;
    const g = first(byCat("goal")), style = first(byCat("working_style")),
          help = first(byCat("preference")), ch = first(byCat("challenge"));
    const topInsight = state.insights.filter(i => i.status !== "rejected").sort((a,b) => b.confidence - a.confidence)[0];
    const lowConf = ms.filter(m => m.confidence < 55 && !m.confirmed).length;

    return {
      focus: g ? `You're working toward ${g}.` : "XIO doesn't have a clear target for you yet — one conversation fixes that.",
      style: style ? `It looks like you work best with ${style.startsWith(":") ? style.slice(1) : style}.` : "XIO is still learning how you work best. It will sharpen over the next conversations.",
      noticed: topInsight ? `${topInsight.insight}` : "No strong patterns yet — that's normal early. XIO says 'I noticed' only when the evidence earns it.",
      motivation: help ? `You seem most motivated by visible momentum: ${help.replace(/^Wants help with:\s*/i,"")}.` : "Motivational patterns take a few sessions to read honestly. XIO is watching for them.",
      opportunity: ch ? `Your clearest open opportunity: the friction around ${ch.replace(/^Is (losing time\/energy to|experiencing friction with):\s*/i,"")}. Solving that structurally would free the most capacity.` : g ? `The opportunity in front of you: turning ${g} into a small finished proof within 7 days.` : "Everything is open. That's an opportunity too — pick a single thread and pull it.",
      uncertain: lowConf
    };
  }

  /* ── Greeting ──────────────────────────────────────── */
  function greeting(){
    const h = new Date().getHours();
    const base = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Burning the late oil";
    return state.profile.name ? `${base}, ${state.profile.name}.` : `${base}.`;
  }

  /* ── Export / wipe ─────────────────────────────────── */
  function exportData(){
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "xio-data-export.json";
    a.click();
  }

  /* ── Demo seed ─────────────────────────────────────── */
  function seedDemo(){
    const d = XIO_DATA.demo;
    state.profile.name = d.name;
    state.onboarded = true; state.created = Date.now() - 5 * 86400000;
    d.memories.forEach(m => addMemory({ ...m, confirmed: m.source === "onboarding" }));
    addGoal(d.goal);
    d.projects.forEach(p => addProject(p));
    d.wins.forEach(w => addWin(w));
    // spread events over past days for momentum
    const kinds = ["chat","goal","memory","sprint"];
    for(let i = 6; i >= 0; i--){
      if (i === 5) continue; // one gap day
      const n = i === 0 ? 3 : 1 + ((i * 7) % 4);
      for(let j = 0; j < n; j++) state.events.push({ at: Date.now() - i * 86400000 - j * 3600000, kind: kinds[(i + j) % kinds.length] });
    }
    state.stats.chats = 14; state.stats.generated = 6;
    save(); refreshInsights();
  }

  function addGoal(title, opts = {}){
    const g = { id: uid(), title: title.replace(/^Goal:\s*/i, ""), progress: opts.progress || 0, created: Date.now(), done: false };
    state.goals.push(g); save(); logEvent("goal"); return g;
  }
  function addProject(p){
    const pr = { id: uid(), name: p.name, status: p.status || "active", note: p.note || "", created: Date.now(), lastTouched: Date.now() };
    state.projects.push(pr); save(); return pr;
  }
  function addWin(text){
    state.wins.push({ id: uid(), text, at: Date.now() }); save(); logEvent("win");
  }
  function touchProject(id){ const p = state.projects.find(x => x.id === id); if(p){ p.lastTouched = Date.now(); if(p.status === "stalled") p.status = "active"; save(); } }

  load();

  return {
    get state(){ return state; },
    save, reset, exportData, logEvent,
    momentumSeries, streak, totalActive,
    addMemory, confirmMemory, deleteMemory, editMemory, activeMemories, memoriesByCategory, avgConfidence,
    extractMemories, bumpMentions,
    classify, generateReply, relevantMemory,
    refreshInsights, reactInsight,
    nextBestAction, briefing, intelNarrative, greeting, topGoal, stalledProject, smallestStep,
    addGoal, addProject, addWin, touchProject, seedDemo
  };
})();

/* expose as page-level global (explicit, robust across loaders/test envs) */
window.XIO_ENGINE = XIO_ENGINE;
