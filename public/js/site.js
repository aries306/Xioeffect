/* ═════════════ XIO 2.0 — Site (4-page experience + Slipstream) ═════════════
   Signature navigation: pages swap through "the Slipstream" — a chromatic
   light-tunnel that collapses the current page into the vortex and
   materializes the next. Futuristic, but fast (≈0.9s) and fully
   keyboard/deep-link friendly via hash routes.
   ═══════════════════════════════════════════════════════════════════════ */
"use strict";

const XIO_SITE = (() => {
  const { esc } = XIO_UTILS;
  const $ = id => document.getElementById(id);
  const PAGES = ["home", "intelligence", "systems", "pricing"];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let annual = false;
  let current = null;
  let slipping = false;

  /* ══ Pricing (shared) ═══════════════════════════════ */
  function renderPricing(containerId, plans){
    const el = $(containerId); if(!el) return;
    el.innerHTML = plans.map(p => {
      const price = annual ? Math.round(p.monthly * 0.8) : p.monthly;
      const isCurrent = XIO_ENGINE.state.profile.plan === p.id;
      return `
      <div class="plan-card glass ${p.hot ? "hot" : ""}">
        ${p.hot ? `<div class="plan-flag">Most popular</div>` : ""}
        ${isCurrent ? `<div class="plan-current">Current plan</div>` : ""}
        <div class="plan-name">${p.name}</div>
        <div class="plan-sub">${p.sub}</div>
        <div class="plan-price">${price === 0 ? "$0" : `$${price}`}<span>${p.monthly === 0 ? " forever" : "/month" + (annual ? " · billed annually" : "")}</span></div>
        <ul class="plan-feats">${p.feats.map(f => `<li>${f}</li>`).join("")}</ul>
        <button class="btn ${p.hot ? "btn-primary" : "btn-ghost"}" data-plan="${p.id}">${isCurrent ? "Current plan" : p.cta}</button>
      </div>`;
    }).join("");
    el.querySelectorAll("[data-plan]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.plan;
      if (XIO_ENGINE.state.profile.plan === id) return;
      if (id !== "core") {
        fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: id }) })
          .then(async response => ({ response, body: await response.json().catch(() => ({})) }))
          .then(({ response, body }) => {
            if (response.ok && body.url) window.top.location.href = body.url;
            else if (response.status === 401) window.top.location.href = "/sign-up";
            else XIO_APP.toast(body.error || "Checkout is unavailable right now.", "bad");
          })
          .catch(() => XIO_APP.toast("Checkout is unavailable right now.", "bad"));
        return;
      }
      XIO_ENGINE.state.profile.plan = "core"; XIO_ENGINE.save();
      XIO_APP.toast("You're now on XIO Core.", "good");
      renderPricing(containerId, plans);
      XIO_APP.syncChrome();
    }));
  }

  function bindBilling(switchId, monthlyId, annualId, renderers){
    const sw = $(switchId); if(!sw) return;
    sw.addEventListener("click", () => {
      annual = !annual;
      sw.classList.toggle("on", annual);
      $(monthlyId)?.classList.toggle("active", !annual);
      $(annualId)?.classList.toggle("active", annual);
      renderers.forEach(fn => fn());
    });
  }

  /* ══ Reviews ════════════════════════════════════════ */
  const stars = `<span class="rv-stars">✦✦✦✦✦</span>`;
  const reviewCard = r => `
    <div class="review-card glass rv">
      ${stars}
      <p class="rv-quote">“${esc(r.q)}”</p>
      <div class="rv-person"><span class="rv-ava">${esc(r.n.split(" ").map(x => x[0]).join(""))}</span><div><b>${esc(r.n)}</b><span>${esc(r.r)}</span></div></div>
    </div>`;
  const bannerHTML = r => `
    <div class="rbanner-mark">✦</div>
    <div><p class="rbanner-quote">“${esc(r.q)}”</p><div class="rbanner-person"><b>${esc(r.n)}</b> · ${esc(r.r)}</div></div>`;

  function initReviews(){
    const host = $("home-reviews");
    if (host) host.innerHTML = XIO_DATA.testimonials.home.map(reviewCard).join("");
    [["rv-intel","intelligence"],["rv-systems","systems"],["rv-pricing","pricing"]].forEach(([id, key]) => {
      const el = $(id); if(!el) return;
      const list = XIO_DATA.testimonials[key];
      let i = 0;
      el.innerHTML = bannerHTML(list[0]);
      if (!reduced) setInterval(() => {
        i = (i + 1) % list.length;
        el.classList.add("fade");
        setTimeout(() => { el.innerHTML = bannerHTML(list[i]); el.classList.remove("fade"); }, 420);
      }, 6500);
    });
  }

  /* ══ THE SLIPSTREAM (page transition) ═══════════════ */
  const slipCtx = { cv: null, ctx: null, w: 0, h: 0 };
  function slipSetup(){
    slipCtx.cv = $("slip-canvas"); if(!slipCtx.cv) return;
    try { slipCtx.ctx = slipCtx.cv.getContext("2d"); } catch(e){ slipCtx.ctx = null; }
    if(!slipCtx.ctx) return;
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    slipCtx.w = innerWidth; slipCtx.h = innerHeight;
    slipCtx.cv.width = slipCtx.w * dpr; slipCtx.cv.height = slipCtx.h * dpr;
    slipCtx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function playSlip(phase /* 1 = collapse into vortex, -1 = expand out */){
    return new Promise(res => {
      if (reduced || !slipCtx.ctx){ res(); return; }
      const { cv, ctx, w, h } = slipCtx;
      const cx = w / 2, cy = h * 0.42;
      const R0 = Math.hypot(w, h) * 0.62;
      cv.classList.add("on");
      const N = 150;
      const parts = Array.from({ length: N }, (_, i) => ({
        a: (i / N) * Math.PI * 2 + Math.random() * 0.35,
        r: R0 * (0.35 + Math.random() * 0.85),
        v: 0.85 + Math.random() * 0.4,
        hue: Math.random() < 0.62 ? "124,108,255" : (Math.random() < 0.5 ? "0,229,255" : "167,139,250"),
        wdt: 0.6 + Math.random() * 1.8
      }));
      const D = phase === 1 ? 400 : 430;
      const start = performance.now();
      const ease = t => phase === 1 ? t * t * t : 1 - Math.pow(1 - t, 3);
      (function frame(now){
        const t = Math.min(1, (now - start) / D);
        const k = ease(t);
        ctx.clearRect(0, 0, w, h);
        // dim veil
        const veil = phase === 1 ? 0.55 * k : 0.55 * (1 - k);
        ctx.fillStyle = `rgba(4,4,12,${veil})`;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        for (const p of parts){
          const r = (phase === 1 ? p.r * (1 - k) : p.r * k) * p.v ** 1;
          const len = 60 + 140 * (phase === 1 ? k : 1 - k);
          const x1 = cx + Math.cos(p.a) * r, y1 = cy + Math.sin(p.a) * r * 0.82;
          const x2 = cx + Math.cos(p.a) * (r + len), y2 = cy + Math.sin(p.a) * (r + len) * 0.82;
          const g = ctx.createLinearGradient(x1, y1, x2, y2);
          const alpha = phase === 1 ? (0.15 + k * 0.75) : (0.9 - t * 0.75);
          g.addColorStop(0, `rgba(${p.hue},${alpha})`);
          g.addColorStop(1, `rgba(${p.hue},0)`);
          ctx.strokeStyle = g; ctx.lineWidth = p.wdt;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        // vortex core ring
        const ringR = (phase === 1 ? 6 + k * 90 : 120 - k * 100);
        ctx.strokeStyle = `rgba(0,229,255,${phase === 1 ? 0.25 + k * 0.5 : 0.7 * (1 - t)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, ringR), 0, Math.PI * 2); ctx.stroke();
        // glyph flash at switch point
        if ((phase === 1 && k > 0.55) || (phase === -1 && k < 0.45)){
          const gl = phase === 1 ? (k - 0.55) / 0.45 : 1 - k / 0.45;
          ctx.font = `700 ${30 + gl * 6}px 'Space Grotesk', sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = `rgba(255,255,255,${gl * 0.95})`;
          ctx.shadowColor = "rgba(124,108,255,.9)"; ctx.shadowBlur = 26;
          ctx.fillText("✦", cx, cy);
          ctx.shadowBlur = 0;
        }
        ctx.globalCompositeOperation = "source-over";
        if (t < 1) requestAnimationFrame(frame);
        else { cv.classList.remove("on"); ctx.clearRect(0, 0, w, h); res(); }
      })(start);
    });
  }

  function setActiveNav(name){
    document.querySelectorAll(".nav-links a").forEach(a => a.classList.toggle("on", a.dataset.page === name));
  }

  async function showPage(name){
    if (!PAGES.includes(name)) name = "home";
    if (name === current && current !== null) return;
    if (slipping) return;
    setActiveNav(name);
    const next = $("site-" + name); if(!next) return;

    if (current === null || reduced){           // first paint / reduced motion → instant
      document.querySelectorAll(".site-page").forEach(p => p.classList.remove("active", "enter", "warp-out"));
      next.classList.add("active", "enter");
      current = name;
      refreshReveals();
      return;
    }
    slipping = true;
    const cur = $("site-" + current);
    if (cur) cur.classList.add("warp-out");
    await playSlip(1);                           // collapse
    document.querySelectorAll(".site-page").forEach(p => p.classList.remove("active", "enter", "warp-out"));
    next.classList.add("active", "enter");
    window.scrollTo(0, 0);
    current = name;
    refreshReveals();
    await playSlip(-1);                          // materialize
    slipping = false;
  }

  /* ══ Neural field background ════════════════════════ */
  function initNeural(){
    const cv = $("neuro-canvas"); if(!cv || reduced) return;
    let ctx;
    try { ctx = cv.getContext("2d"); } catch(e){ return; }
    if (!ctx) return;
    let w, h, nodes = [], pulses = [];
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    let mx = 0.5, my = 0.5;
    function size(){
      w = innerWidth; h = innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const N = w < 760 ? 30 : 62;
      nodes = Array.from({ length: N }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: 0.8 + Math.random() * 1.9,
        c: Math.random() < 0.7 ? "124,108,255" : "0,229,255"
      }));
    }
    size(); addEventListener("resize", size);
    addEventListener("pointermove", e => { mx = e.clientX / w; my = e.clientY / h; }, { passive: true });
    let lastPulse = 0;
    function frame(t){
      requestAnimationFrame(frame);
      if (document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      const ox = (mx - 0.5) * 14, oy = (my - 0.5) * 14;
      for (const n of nodes){
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = w + 20; if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; if (n.y > h + 20) n.y = -20;
      }
      // connections
      for (let i = 0; i < nodes.length; i++){
        for (let j = i + 1; j < nodes.length; j++){
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150){
            const alpha = (1 - Math.sqrt(d2) / 150) * 0.13;
            ctx.strokeStyle = `rgba(${a.c},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.lineTo(b.x + ox, b.y + oy); ctx.stroke();
          }
        }
      }
      // pulses traveling along random edges
      if (t - lastPulse > 1400 && nodes.length > 6){
        lastPulse = t;
        const i = Math.floor(Math.random() * nodes.length);
        let best = -1, bd = 1e9;
        for (let j = 0; j < nodes.length; j++){
          if (j === i) continue;
          const d = (nodes[i].x - nodes[j].x) ** 2 + (nodes[i].y - nodes[j].y) ** 2;
          if (d < bd && d < 220 * 220){ bd = d; best = j; }
        }
        if (best >= 0) pulses.push({ a: i, b: best, t0: t, c: nodes[i].c });
      }
      pulses = pulses.filter(p => t - p.t0 < 900);
      for (const p of pulses){
        const a = nodes[p.a], b = nodes[p.b];
        const k = (t - p.t0) / 900;
        const x = a.x + (b.x - a.x) * k + ox, y = a.y + (b.y - a.y) * k + oy;
        ctx.fillStyle = `rgba(${p.c},${0.7 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      // nodes
      for (const n of nodes){
        ctx.fillStyle = `rgba(${n.c},.5)`;
        ctx.beginPath(); ctx.arc(n.x + ox, n.y + oy, n.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  /* ══ Reveal on scroll ═══════════════════════════════ */
  let observer = null;
  function refreshReveals(){
    if (reduced){ document.querySelectorAll(".rv").forEach(el => el.classList.add("in")); return; }
    if (!observer){
      observer = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add("in"); observer.unobserve(en.target); } });
      }, { threshold: 0.12 });
    }
    document.querySelectorAll(".site-page.active .rv:not(.in)").forEach(el => observer.observe(el));
  }

  /* ══ Hero orb parallax (home) ═══════════════════════ */
  function initOrb(){
    const orb = $("core-orb"); const host = document.querySelector(".hero2-grid");
    if(!orb || !host || reduced) return;
    host.addEventListener("pointermove", e => {
      const r = host.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      orb.style.setProperty("--tx", (dx * 22) + "px");
      orb.style.setProperty("--ty", (dy * 22) + "px");
    }, { passive: true });
    host.addEventListener("pointerleave", () => { orb.style.setProperty("--tx", "0px"); orb.style.setProperty("--ty", "0px"); });
  }

  /* ══ Learning loop wheel (intelligence page) ════════ */
  const LOOP_STEPS = [
    { n: "Interact", d: "You talk. XIO listens for what matters." },
    { n: "Understand", d: "Goals, preferences, friction and patterns surface." },
    { n: "Learn", d: "Meaningful context becomes memory — with your consent." },
    { n: "Adapt", d: "Responses shift to match how you actually work." },
    { n: "Anticipate", d: "XIO names the next best move before you ask." }
  ];
  function initLoop(){
    const wheel = $("loop-wheel"); if(!wheel) return;
    const nodes = [...wheel.querySelectorAll(".lw-node")];
    const nameEl = $("lw-name"), descEl = $("lw-desc");
    let idx = 0;
    const show = i => {
      idx = i;
      nodes.forEach((n, j) => n.classList.toggle("on", j === i));
      nameEl.parentElement.classList.add("swap");
      setTimeout(() => {
        nameEl.textContent = LOOP_STEPS[i].n;
        descEl.textContent = LOOP_STEPS[i].d;
        nameEl.parentElement.classList.remove("swap");
      }, 240);
    };
    show(0);
    setInterval(() => show((idx + 1) % LOOP_STEPS.length), 2400);
    nodes.forEach((n, j) => n.addEventListener("click", () => show(j)));
  }

  /* ══ Landing init ═══════════════════════════════════ */
  function initLanding(){
    $("year").textContent = new Date().getFullYear();
    renderPricing("landing-pricing", XIO_DATA.plans);
    bindBilling("billing-switch", "bt-monthly", "bt-annual", [() => renderPricing("landing-pricing", XIO_DATA.plans)]);
    initReviews(); initNeural(); initOrb(); initLoop(); slipSetup();
    addEventListener("resize", slipSetup);

    // FAQ (now on Pricing page)
    const faq = $("landing-faq");
    if (faq){
      faq.innerHTML = XIO_DATA.faq.map((f, i) => `
        <div class="faq-item" data-i="${i}">
          <button class="faq-q">${esc(f.q)}<span>+</span></button>
          <div class="faq-a"><div class="faq-a-inner">${esc(f.a)}</div></div>
        </div>`).join("");
      faq.querySelectorAll(".faq-item").forEach(item => {
        item.querySelector(".faq-q").addEventListener("click", () => {
          const open = item.classList.toggle("open");
          const a = item.querySelector(".faq-a");
          a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
        });
      });
    }

    const navToggle = $("nav-toggle");
    const navLinks = $("site-nav-links");
    const closeNav = () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", closeNav));

    // CTAs
    document.querySelectorAll("#view-landing [data-go]").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.go === "demo"){ XIO_ENGINE.reset(); XIO_ENGINE.seedDemo(); location.hash = "#/app/today"; }
      else window.top.location.href = "/sign-up";
    }));
    $("nav-login").addEventListener("click", () => {
      window.top.location.href = "/sign-in";
    });

    // Intercept all in-site hash links → Slipstream handled by router/showPage
    document.querySelectorAll('#view-landing a[href^="#/"]').forEach(a => {
      a.addEventListener("click", e => {
        const href = a.getAttribute("href");
        const p = href.replace(/^#\/?/, "").split("?")[0] || "home";
        if (PAGES.includes(p)){
          e.preventDefault();
          if (p !== current) location.hash = "#/" + (p === "home" ? "home" : p);
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }

  /* ══ Onboarding flow (unchanged, guarded) ═══════════ */
  const ob = {
    i: -1, answers: {}, busy: false, runId: 0, bound: false,
    els(){ return { thread: $("onboard-thread"), form: $("onboard-form"), field: $("onboard-field"), hint: $("onboard-hint"), prog: $("onboard-progress") }; }
  };

  function initOnboarding(){
    ob.runId++;
    const myRun = ob.runId;
    const { form, prog } = ob.els();
    ob.i = -1; ob.answers = {}; ob.clearThread();
    const asks = XIO_DATA.onboarding.filter(s => s.type === "ask");
    prog.innerHTML = asks.map(() => `<div class="op-seg"></div>`).join("");

    if (!ob.bound){
      ob.bound = true;
      form.addEventListener("submit", onSubmit);
      $("onboard-skip").onclick = () => {
        ob.runId++;
        XIO_ENGINE.state.onboarded = true; XIO_ENGINE.save();
        XIO_APP.toast("Skipped. XIO will learn as you go — onboarding lives in Settings if you want it later.");
        location.hash = "#/app/today";
      };
    }
    setTimeout(() => { if (myRun === ob.runId) next(myRun); }, 300);
  }

  ob.clearThread = function(){ ob.els().thread.innerHTML = ""; };

  function addMsg(text, who){
    const { thread } = ob.els();
    const div = document.createElement("div");
    div.className = `ob-msg ${who}`;
    div.innerHTML = who === "xio" ? `<span class="ob-from">✦ XIO</span>${esc(text).replace(/\n/g, "<br/>")}` : esc(text);
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
    return div;
  }

  function next(myRun){
    if (myRun !== undefined && myRun !== ob.runId) return;
    const run = myRun ?? ob.runId;
    ob.i++;
    const step = XIO_DATA.onboarding[ob.i];
    if(!step){ finish(run); return; }
    const segs = ob.els().prog.children;
    const askIndex = XIO_DATA.onboarding.slice(0, ob.i).filter(s => s.type === "ask").length;
    [...segs].forEach((s, idx) => s.classList.toggle("done", idx < askIndex));

    if (step.type === "xio"){
      setFieldEnabled(false);
      addMsg(step.text, "xio");
      if (step.key === "complete"){ setTimeout(() => finish(run), 2200); return; }
      setTimeout(() => next(run), 1900);
    } else {
      setFieldEnabled(true, step.optional);
      addMsg(step.ask, "xio");
      ob.els().hint.innerHTML = step.optional ? "Optional — press Send empty and I'll move on." : "Answer honestly — XIO is learning <i>you</i>, not grading you.";
      ob.els().field.focus();
    }
  }

  function setFieldEnabled(on, optional = false){
    const { field, form } = ob.els();
    field.disabled = !on;
    form.querySelector("button").disabled = !on;
    field.placeholder = on ? (optional ? "Type, or send empty to skip…" : "Type your answer…") : "XIO is speaking…";
  }

  function onSubmit(e){
    e.preventDefault();
    const step = XIO_DATA.onboarding[ob.i];
    if (!step || step.type !== "ask") return;
    const { field } = ob.els();
    const val = field.value.trim();
    if (!val && !step.optional) { field.focus(); return; }
    if (val) addMsg(val, "user");
    if (val){
      ob.answers[step.field] = val;
      if (step.field === "name"){
        XIO_ENGINE.state.profile.name = val.split(" ")[0].replace(/[^a-zA-Z\u00C0-\u024F'-]/g, "") || val;
        XIO_ENGINE.save();
      }
      if (step.memory){ XIO_ENGINE.addMemory({ ...step.memory(val), source: "onboarding", confirmed: true }); }
      if (step.goal) XIO_ENGINE.addGoal(val);
      XIO_ENGINE.logEvent("onboarding");
    }
    field.value = "";
    next(ob.runId);
  }

  function finish(run){
    if (run !== undefined && run !== ob.runId) return;
    ob.runId++;
    XIO_ENGINE.state.onboarded = true;
    XIO_ENGINE.state.created = XIO_ENGINE.state.created || Date.now();
    XIO_ENGINE.save(); XIO_ENGINE.refreshInsights();
    XIO_APP.toast("Your XIO is calibrated. It starts learning you from here.", "good");
    location.hash = "#/app/today";
  }

  return { initLanding, initOnboarding, renderPricing, bindBilling, showPage, get currentPage(){ return current; }, get annual(){ return annual; } };
})();

window.XIO_SITE = XIO_SITE;
