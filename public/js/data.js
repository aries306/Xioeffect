/* ═════════════ XIO 2.0 — Content & Knowledge Data ═════════════ */
"use strict";

const XIO_DATA = {

  /* ── Pricing plans ─────────────────────────────────── */
  plans: [
    {
      id: "core", name: "XIO Core", sub: "Meet your private intelligence", monthly: 0,
      cta: "Start free", feats: [
        "Conversational onboarding",
        "Core memory (up to 25 memories)",
        "Daily XIO briefing",
        "Next-best-action engine",
        "Content Engine — 5 generations / day",
        "2 prompt packs included",
        "Full privacy controls"
      ]
    },
    {
      id: "pro", name: "XIO Pro", sub: "Your intelligence, personalized", monthly: 29, hot: true,
      cta: "Go Pro", feats: [
        "Unlimited adaptive memory",
        "Insight & pattern engine",
        "Psychology-informed responses",
        "Proactive recommendations",
        "Momentum + goal protection",
        "Content Engine — unlimited",
        "All prompt packs + toolkits",
        "Prompt Builder library"
      ]
    },
    {
      id: "business", name: "XIO Business", sub: "Team intelligence & systems", monthly: 79,
      cta: "Scale up", feats: [
        "Everything in Pro",
        "Shared team context",
        "Workflow & automation packs",
        "Client-facing content ops",
        "Priority model access",
        "Quarterly strategy reviews"
      ]
    },
    {
      id: "executive", name: "XIO Executive", sub: "Strategic intelligence partner", monthly: 199,
      cta: "Apply", feats: [
        "Everything in Business",
        "Deep context & document memory",
        "Decision-support systems",
        "Custom integrations & agents",
        "Dedicated intelligence architect",
        "White-glove onboarding"
      ]
    }
  ],

  faq: [
    { q: "Is XIO just another AI chatbot?", a: "No. The chat is the surface — the product is the intelligence underneath it. XIO maintains a private, structured model of your goals, preferences, projects and patterns, and uses it in every interaction. A chatbot answers; XIO learns." },
    { q: "Who controls what XIO remembers?", a: "You do — completely. Every memory is visible in your Memory page with a confidence level. You can edit, correct, delete anything, pause learning, or require confirmation before anything is stored. XIO never hides what it knows." },
    { q: "What does the psychology layer actually do?", a: "It helps XIO decide what kind of help you need right now — clarity, focus, a decision, encouragement, a challenge, or simplification. It's behavioral science applied to motivation and momentum. It never labels you, never diagnoses, and always uses hedged, honest language." },
    { q: "How does XIO get better over time?", a: "Every interaction runs a learning loop: interact → understand → learn → adapt → anticipate. Repeated observations raise or lower confidence in what XIO knows. Insights you confirm carry more weight. Your XIO literally becomes more yours every day." },
    { q: "Can I use XIO for content and business work?", a: "Yes. The Content Engine drafts in your voice; the Prompt Builder assembles professional prompts; Prompt Packs give you pro-grade prompts by outcome; Toolkits give you clarity, decision and momentum frameworks." },
    { q: "What does 'private by design' mean here?", a: "This demo stores everything locally in your browser — nothing leaves your device. The production architecture follows the same contract: per-user encrypted memory, full export, full deletion, zero training on your data." }
  ],

  /* ── Onboarding calibration script ─────────────────── */
  onboarding: [
    {
      key: "intro", type: "xio",
      text: "Hey — I'm XIO. Before anything else, I want to start learning you.\n\nSix short questions. No wrong answers. Everything you tell me becomes the beginning of your private intelligence profile — and you can see, edit or delete all of it, always."
    },
    { key: "name", type: "ask", field: "name", ask: "First — what should I call you?", memory: c => ({ text: `Prefers to be called ${c}.`, category: "identity", confidence: 100 }) },
    { key: "ambition", type: "ask", field: "ambition", ask: "What are you trying to accomplish right now? The big thing.", memory: c => ({ text: `Is working toward: ${c}`, category: "goal", confidence: 95 }), goal: true },
    { key: "success90", type: "ask", field: "success90", ask: "If we fast-forward 90 days… what would make that version of you say 'that worked'?", memory: c => ({ text: `90-day definition of success: ${c}`, category: "goal", confidence: 90 }), goal: true },
    { key: "friction", type: "ask", field: "friction", ask: "What's eating too much of your time or energy right now?", memory: c => ({ text: `Is losing time/energy to: ${c}`, category: "challenge", confidence: 90 }) },
    { key: "help", type: "ask", field: "help", ask: "If I could take one thing off your plate starting today — what would it be?", memory: c => ({ text: `Wants help with: ${c}`, category: "preference", confidence: 90 }) },
    { key: "style", type: "ask", field: "style", ask: "How do you work best? Be honest — mornings or nights, deep focus or quick sprints, one thing or many plates spinning?", memory: c => ({ text: `Works best: ${c}`, category: "working_style", confidence: 85 }) },
    {
      key: "extra", type: "ask", field: "extra", ask: "Last one. Anything else I should understand about you — how you think, what you value, what you're tired of?", optional: true, memory: c => ({ text: `Shared about themselves: ${c}`, category: "context", confidence: 85 })
    },
    {
      key: "complete", type: "xio",
      text: "That's enough to begin.\n\nI already have my first picture of you — where you're headed, what's in the way, and how you like to move. From here, every conversation sharpens it.\n\nHere's what happens next: each day I'll give you a short briefing, I'll name the one move that matters most, and I'll notice patterns you'd miss. If I ever get something wrong — correct me. That's how I learn.\n\nWelcome to your own private intelligence. Let's go."
    }
  ],

  /* ── Psychology layer: assistance states ───────────── */
  psychStates: {
    CLARITY:        { words: ["confus", "unclear", "don't understand", "dont understand", "lost", "no idea", "what does", "why is", "explain"], label: "Clarity" },
    FOCUS:          { words: ["distract", "scattered", "too many things", "everywhere", "can't focus", "cant focus", "pulled", "juggling", "putting off", "put it off", "procrastinat", "avoiding", "keep avoiding", "haven't started", "havent started", "focus on", "focus today", "priorit", "what to work on", "most important"], label: "Focus" },
    DECISION:       { words: ["should i", "which", "decide", "decision", "or should", "pick", "choose", "option", "dilemma"], label: "Decision" },
    ACTION:         { words: ["how do i", "how can i", "how to", "what should i do", "next step", "get started", "start", "plan"], label: "Action" },
    ENCOURAGEMENT:  { words: ["tired", "exhausted", "burned", "burnt", "give up", "failing", "failed", "can't do", "cant do", "not good", "discouraged", "anxious", "worried", "scared", "afraid", "behind"], label: "Encouragement" },
    CHALLENGE:      { words: ["push me", "bigger", "too comfortable", "playing small", "next level", "bored", "plateau"], label: "Challenge" },
    SIMPLIFICATION: { words: ["overwhelm", "too much", "stress", "swamped", "drowning", "no time", "busy", "chaotic", "on fire"], label: "Simplification" },
    REFLECTION:     { words: ["thinking about", "reflect", "why did", "looking back", "what happened", "learned", "realized", "realised"], label: "Reflection" },
    CELEBRATION:    { words: ["finished", "done", "launched", "shipped", "closed", "landed", "signed", "won", "did it", "nailed", "completed", "hit my"], label: "Celebration" }
  },

  /* ── Memory extraction patterns ────────────────────── */
  memoryPatterns: [
    { re: /\b(?:my goal is|goals? (?:is|are) to|i (?:really )?want to|i'?m trying to|hearts? set on|i hope to|i plan to|working toward)/i, category: "goal", template: t => `Is working toward: ${t}` },
    { re: /\b(?:my dream is|eventually i want|long.?term (?:i want|goal))/i, category: "goal", template: t => `Long-term ambition: ${t}` },
    { re: /\b(?:i (?:really )?(?:prefer|like|enjoy|love))/i, category: "preference", template: t => `Prefers: ${t}` },
    { re: /\b(?:i (?:hate|dislike|can'?t stand|don'?t like))/i, category: "preference", template: t => `Dislikes: ${t}` },
    { re: /\b(?:i'?m (?:struggling|stuck|overwhelmed)|i struggle with|it'?s hard to|i keep putting off|i'?ve been avoiding|procrastinat|i can'?t seem to)/i, category: "challenge", template: t => `Is experiencing friction with: ${t}` },
    { re: /\b(?:my project (?:is|called)|i'?m (?:currently )?(?:working on|building|launching|writing|creating|developing))/i, category: "project", template: t => `Has an active project: ${t}` },
    { re: /\b(?:i just (?:finished|launched|shipped|completed|closed|landed|signed)|finished|done with|nailed it|hit my target)/i, category: "achievement", template: t => `Recent win: ${t}` },
    { re: /\b(?:i work best|i'?m a (?:morning|night)|deep work|i need (?:quiet|deadlines|pressure)|quick sprints?)/i, category: "working_style", template: t => `Working pattern: ${t}` },
    { re: /\b(?:i (?:decided|decision was|chose to)|i'?m going with)/i, category: "decision", template: t => `Made a decision: ${t}` },
    { re: /\b(?:my (?:business|company|startup|agency|store|brand|clients?|customers?) (?:is|are|do|sell|help))/i, category: "business_context", template: t => `Business context: ${t}` },
    { re: /\b(?:i feel|feeling (?:stuck|great|good|bad|anxious|confident|tired|excited))/i, category: "motivation", template: t => `Emotional context: ${t}` },
    { re: /\b(?:i (?:used to|always|tend to|usually|never) )/i, category: "habit", template: t => `Observed habit: ${t}` }
  ],

  categories: {
    identity: "Identity", goal: "Goal", preference: "Preference", challenge: "Challenge",
    project: "Project", achievement: "Win", working_style: "Work style", decision: "Decision",
    business_context: "Business", motivation: "Motivation", habit: "Habit", context: "Context", other: "Other"
  },

  /* ── Chat scaffolds by state ───────────────────────── */
  chatScaffolds: {
    CLARITY: [
      "Let's strip this down to what's actually true.\n\n{context}Here's the simplest version: {reframe}. Everything else is detail we can add back later.\n\nOne question back to you, because it'll unlock the rest: {question}",
      "Good instinct to pause here — confusion usually means one undefined thing, not ten.\n\n{context}My read: the unclear part is {reframe}.\n\nLet's define it in one sentence. If you had to explain it to a smart friend in 20 seconds, what would you say?"
    ],
    FOCUS: [
      "I can feel the pull in different directions — let's take that seriously instead of pretending it's fine.\n\n{context}Here's what I'd do: forget everything except {reframe} for the next working session. One thing. Full stop.\n\nWant me to run a 25-minute focus sprint with you on it?"
    ],
    DECISION: [
      "Decisions like this stall when we compare everything at once. So we won't.\n\n{context}Two questions settle most of it:\n1. Which option is reversible if you're wrong?\n2. Which one you'd regret not trying in a year?\n\n{reframe}\n\nTell me your gut answer — not the logical one. That's usually the data point you're actually missing."
    ],
    ACTION: [
      "Say less. Here's how we move.\n\n{context}Your next move: {reframe}\n\nSmall enough to finish today, big enough that finishing it changes something.\n\nIf you want, I'll help you do the first piece right now — just say 'let's do it'."
    ],
    ENCOURAGEMENT: [
      "Hey. Before any strategy — I noticed the weight in that message, and I want to acknowledge it first.\n\n{context}Here's what's also true: you're still here, still working on {somethingThatMatters}, on a day when it would be easier not to be. That's not nothing. That's the whole thing.\n\nSo today we go smaller, not harder. {reframe}\n\nJust that. I've got the rest of the list — you don't have to carry it."
    ],
    CHALLENGE: [
      "Good. I was hoping you'd say something like that.\n\n{context}Then let's raise the bar honestly: {reframe}\n\nThat's the version of this where you grow into someone new to finish it. Ready to commit to it in one sentence?"
    ],
    SIMPLIFICATION: [
      "Okay — stop. Forget the other sixteen things for a minute.\n\n{context}From everything you're carrying, this is the one move that matters most right now: {reframe}\n\nNot the whole project. Not the plan. Just that move. What's the first physical action it needs?"
    ],
    REFLECTION: [
      "This is the kind of thinking most people skip — and it's where the compounding lives.\n\n{context}{reframe}\n\nOne reflection question worth sitting with: what did this teach you about how you work at your best?"
    ],
    CELEBRATION: [
      "Hold on — before we move to the next thing: that's a real win, and I want you to register it as one.\n\n{context}Most people skip straight to the next task and rob themselves of the momentum they just earned. You finished something that mattered.\n\n{reframe}\n\nNow — while that energy is warm: want to ride it into the next move, or bank it and rest? Both are correct strategies."
    ],
    DEFAULT: [
      "Got it.\n\n{context}Here's my honest read: {reframe}\n\nIf it helps, I can turn this into a concrete next step, save something to memory, or just keep thinking it through with you. Your call."
    ]
  },

  bridgeLines: {
    goal: "Knowing you're working toward {short}, I'll frame it against that. ",
    style: "And since you work best {short}, I'll keep it matched to that. ",
    challenge: "And I haven't forgotten the friction you mentioned with {short} — this works around it. ",
    win: "You've already shown you finish things — {short}. This is the same muscle. "
  },

  suggChips: [
    "What should I focus on today?",
    "I keep putting something off",
    "Help me make a decision",
    "I just finished something",
    "I'm feeling overwhelmed",
    "What have you learned about me?"
  ],

  /* ── Prompt packs ──────────────────────────────────── */
  promptPacks: [
    {
      id: "clarity", icon: "🎯", name: "Clarity & Focus", desc: "Cut noise. Find the one thing.", pro: false,
      prompts: [
        { t: "The One Thing Filter", p: "Act as a ruthless prioritization coach. Here is everything on my plate: [LIST]. Interview me with exactly 5 questions, one at a time, then force-rank the list and tell me the single task that makes the others easier or irrelevant — and defend why.", pro: false },
        { t: "Overwhelm Dissolver", p: "I'm overwhelmed by: [DESCRIBE EVERYTHING]. Do three things: (1) categorize into 'only I can do', 'can be delegated/systemized', 'can be dropped for 30 days'; (2) pick the ONE item causing the most drag; (3) give me a 25-minute first move for it.", pro: false },
        { t: "Monday Reset Script", p: "Design my ideal Monday-morning 30-minute reset ritual as someone who works best [WORK STYLE]. It must end with exactly 3 priorities for the week — never more. Include a rule for what gets explicitly deleted weekly.", pro: false },
        { t: "Energy Audit", p: "Act as a performance analyst. Here's a typical week: [WEEK]. Identify my 3 biggest energy drains and 2 energy multipliers, then redesign ONE day to protect a 2-hour deep-work block in my peak window.", pro: true },
        { t: "Decision Backlog Clearer", p: "These decisions have been open for 2+ weeks: [LIST]. For each: classify reversible vs irreversible, name the cheapest way to get the missing information, and set a hard decision deadline with the tiebreaker rule I'll use.", pro: true },
        { t: "90-Day Focal Point", p: "My ambition: [AMBITION]. My constraints: [TIME/BUDGET/ENERGY]. Define the single 90-day objective that best compounds toward it, with weekly milestones and a 'proof of progress' metric I can check every Friday.", pro: false },
        { t: "The No-More-Plate Method", p: "I juggle many projects: [PROJECTS]. Be honest about what must pause. Create a 'one active, one queued, three parked' structure and write the exact message I'd tell myself (or my team/clients) about why parked work waits.", pro: true },
        { t: "Deep Work Design", p: "Design a personalized deep-work protocol for someone who loses focus to [DISTRACTIONS]. Include entry ritual, friction elimination, a shutdown ritual, and one rule that protects the block from my own team/clients.", pro: false }
      ]
    },
    {
      id: "growth", icon: "📈", name: "Business Growth", desc: "Strategy that compounds.", pro: false,
      prompts: [
        { t: "Offer Stress-Test", p: "Act as a skeptical enterprise buyer. My offer: [OFFER]. Attack it: find the 5 weakest assumptions, the objection I'd hate hearing most, and the one proof element that would close you. Then rewrite my pitch against those weaknesses.", pro: true },
        { t: "Revenue Leak Map", p: "Here's how my business makes money: [MODEL]. Identify the 3 most likely revenue leaks, rank by dollars-at-risk, and design a 2-week experiment to patch the biggest one without new spend.", pro: true },
        { t: "Ideal Client Inverse", p: "Instead of describing my dream client, tell me who I should FIRE or never sell to, based on this client history: [HISTORY]. Then write the qualifying questions that filter them out before a sales call.", pro: false },
        { t: "Pricing Courage Session", p: "My pricing: [PRICING + HISTORY]. Analyze it like a pricing strategist: what am I undercharging and why (psychologically) am I doing it? Give me a 2-tier experiment and the exact words to say when existing clients ask about the change.", pro: true },
        { t: "The Referral Engine", p: "Design a referral system for [BUSINESS TYPE] that doesn't rely on discounts. Include the trigger moment to ask, the exact script, and the mechanism that makes referrers look good for referring me.", pro: false },
        { t: "Churn Autopsy", p: "These customers left: [DETAILS]. Reconstruct the likely real reasons (beyond what they said), isolate the common thread, and design an early-warning signal I can monitor monthly.", pro: true },
        { t: "90-Day Growth Sprint", p: "Current state: [REVENUE, CHANNELS, CAPACITY]. Goal: [TARGET]. Propose the ONE growth motion worth betting 90 days on (not three), the weekly cadence to run it, and the kill criteria if it's not working by week 6.", pro: false },
        { t: "Founder Time Economics", p: "My weekly hours breakdown: [HOURS]. Calculate my effective hourly value, then re-allocate my week so 60%+ of hours sit above that value. List what gets systemized, delegated, or deleted — be specific.", pro: false }
      ]
    },
    {
      id: "content", icon: "✍️", name: "Content Engine", desc: "Never face a blank page again.", pro: false,
      prompts: [
        { t: "Voice Capture", p: "Here are 3 things I've written: [SAMPLES]. Extract my voice: sentence length, rhythm, taboo words, signature moves, and level of formality. Output a reusable 'voice card' I can paste into any future prompt.", pro: false },
        { t: "30-Day Content Spine", p: "My niche: [NICHE]. My audience's expensive problem: [PROBLEM]. Build a 30-day content calendar built on 3 pillars, where every post either builds authority, builds trust, or builds demand. Tag each accordingly.", pro: true },
        { t: "The Hook Lab", p: "Take this plain idea: [IDEA] and write 12 hooks: 3 contrarian, 3 curiosity-gap, 3 proof-led, 3 story-led. Rank them for [PLATFORM]. Explain briefly why the top 3 will stop the scroll.", pro: false },
        { t: "One-to-Many Repurposer", p: "Here is one long-form piece: [PASTE]. Convert it into: a 5-post LinkedIn series, a 10-tweet thread, a 60-second video script, and a newsletter section — keeping my voice card: [VOICE CARD].", pro: true },
        { t: "Objection-to-Content", p: "List the 10 most common objections my audience ([AUDIENCE]) has about [OFFER/TOPIC]. Turn each objection into a content idea that answers it before it's raised — with headline and angle for each.", pro: false },
        { t: "Case Story Extractor", p: "Interview me about a client/customer win one question at a time. Then write the case story in 3 formats: a 100-word proof snippet, a full LinkedIn post, and a website case study with metrics headline.", pro: true },
        { t: "The Editorial Brainstorm", p: "Give me 20 content ideas at the intersection of [MY EXPERTISE] and [AUDIENCE'S URGENT PAIN], sorted into: easy authority plays, bold opinion plays, and conversion plays. Mark the 3 with highest viral potential.", pro: false },
        { t: "CTA Upgrade Lab", p: "Here are my usual calls-to-action: [CTAS]. Rewrite each 5 different ways across the commitment ladder (free value → conversation → purchase) and tell me which ladder step each belongs on.", pro: true }
      ]
    },
    {
      id: "decisions", icon: "⚖️", name: "Decision Intelligence", desc: "Better calls, faster.", pro: true,
      prompts: [
        { t: "10/10/10 Frame", p: "The decision: [DECISION]. Walk me through the 10/10/10 lens (10 minutes, 10 months, 10 years) honestly, then tell me which option the long-game favors and what fear is masquerading as logic here.", pro: false },
        { t: "Pre-Mortem Protocol", p: "It's 12 months from now and [DECISION/PLAN] failed badly. Write the story of how it failed — the 5 most likely causes, the early warning signs I ignored, and what I should put in place this week to prevent each.", pro: true },
        { t: "Reversibility Test", p: "Classify this decision: [DECISION]. If reversible: what's the cheapest fastest test? If irreversible: what evidence bar should I demand first, and who should red-team it with me?", pro: false },
        { t: "Second-Order Map", p: "Map the second- and third-order consequences of [DECISION]: what does this decision CAUSE, and what do those consequences cause in turn? End with the non-obvious risk I'm most likely blind to.", pro: true },
        { t: "Opportunity Cost Honesty", p: "Option A: [A]. Option B: [B]. Be brutally honest about what saying yes to each one costs me — time, focus, positioning, energy. Then tell me which 'no' I'll regret less in 3 years.", pro: false },
        { t: "The Advisor Council", p: "Simulate a board of 5 advisors reviewing my decision: [DECISION] — a contrarian CFO, a customer, a future me (5 years older), a competitor, and a mentor. Each gives 3 sentences. Then synthesize the conflict into a recommendation.", pro: true },
        { t: "Decision Memo Template", p: "Write a one-page decision memo template I can reuse for any significant call, with fields for context, options considered, reversibility, evidence, risks, and the date I'll revisit the decision. Then complete it for: [DECISION].", pro: false },
        { t: "Gut vs Data Audit", p: "My gut says: [GUT]. The data says: [DATA]. Diagnose where my intuition tends to be reliable vs biased (based on my history: [PAST CALLS]) and tell me how much weight to give each side on THIS call.", pro: true }
      ]
    },
    {
      id: "sales", icon: "🤝", name: "Sales Momentum", desc: "Conversations that convert.", pro: true,
      prompts: [
        { t: "Discovery Call Architect", p: "Design my discovery call flow for [OFFER]: opening frame, 8 questions in exact order, the permission-based transition to pitch, and the two worst questions I should never ask again.", pro: false },
        { t: "Objection Playbook", p: "The objections I hear: [LIST]. For each, write: the real meaning under it, a reframe response in my voice, and one question that moves the conversation forward without pressure.", pro: true },
        { t: "Follow-Up That Isn't Annoying", p: "Write a 5-touch follow-up sequence for prospects who went quiet after [STAGE]. Each touch must add value (insight/lens/proof), never 'just checking in'. Include exact subject lines and timing.", pro: false },
        { t: "The Honest Proposal", p: "Rewrite my proposal for [PROSPECT + SCOPE] so it leads with their problem in their words, presents one recommended option (not a menu), prices the outcome, and ends with a clean decision deadline.", pro: true },
        { t: "Lost Deal Reassembly", p: "This deal died: [WHAT HAPPENED]. Interview me with 6 questions to extract what actually went wrong, then give me a re-engagement message worth sending — or the discipline note for next time.", pro: true },
        { t: "Pipeline Triage", p: "My open opportunities: [LIST WITH STAGE + LAST ACTIVITY]. Triage into: close this week, revive deliberately, or kill politely. For the top 3, give me the single next action with the words to send.", pro: false },
        { t: "Referral Ask Scripts", p: "Write 3 referral-ask scripts I can send after [MOMENT OF VALUE]. Each must make the referrer look good, specify who I'm a fit for, and take <60 seconds to forward.", pro: true },
        { t: "The 48-Hour Nurture", p: "Someone just downloaded/requested [ASSET]. Write a 48-hour nurture: 3 messages across email/DM that convert interest into a conversation — mapping their likely question at each stage.", pro: true }
      ]
    },
    {
      id: "performance", icon: "⚡", name: "Energy & Performance", desc: "The human behind the output.", pro: false,
      prompts: [
        { t: "Weekly Debrief Ritual", p: "Walk me through a 20-minute Friday debrief: what moved, what stalled, what I learned about how I work, one thing to celebrate, and the single theme that should shape next week. Ask me the questions one at a time.", pro: false },
        { t: "Procrastination Translator", p: "I keep avoiding: [TASK]. Don't give me productivity tips. Instead, diagnose what's emotionally expensive about this specific task, then shrink it until starting it feels almost silly to refuse.", pro: false },
        { t: "The Momentum Reboot", p: "I've stalled on [GOAL/PROJECT] for [TIME]. Design a 3-day re-entry protocol that rebuilds momentum without shame: day 1 absurdly small, day 2 visible progress, day 3 commitment device.", pro: false },
        { t: "Decision Fatigue Diet", p: "These recurring decisions drain me daily: [LIST]. For each, propose a default rule, a system, or a deletion so I never decide it manually again. Prioritize by weekly cognitive cost saved.", pro: true },
        { t: "Energy-First Calendar", p: "I'm sharpest during [PEAK HOURS] and crash during [DIP]. Rebuild my ideal week template putting my highest-leverage work in peak windows and protecting recovery. Include the boundaries I must communicate.", pro: true },
        { t: "The Honest Capacity Check", p: "My current commitments: [LIST]. Am I over capacity? Do the math honestly, name what breaks first if I continue, and give me the one conversation I need to have (with myself or others) this week.", pro: false },
        { t: "Confidence Ledger", p: "I undersell myself on [TOPIC]. Interview me for 10 minutes about things I've actually shipped/survived/built, then write my 'evidence of capability' ledger — 10 facts I can reread before any intimidating move.", pro: true },
        { t: "Identity Shift Script", p: "I'm trying to become someone who [IDENTITY GOAL]. Using identity-based habit principles, design the smallest daily proof-action and the environment change that makes the old identity harder to perform.", pro: true }
      ]
    }
  ],

  /* ── Toolkits ──────────────────────────────────────── */
  toolkits: [
    {
      id: "clarity-system", icon: "🎯", name: "The Clarity System", sub: "From scattered to one focal point",
      steps: [
        { h: "Dump everything", d: "Write down every open loop — tasks, ideas, worries, half-finished projects. No organizing. The goal is empty head, not tidy list." },
        { h: "Sort by physics", d: "Three buckets: Only I can do this · Someone/something else can do this · This can wait 30 days. Be brutal — most lists collapse by half here." },
        { h: "Name the One Door", d: "Ask: which single item, when finished, makes the most other items easier or irrelevant? That's your One Door. It gets the next deep-work block." },
        { h: "Shrink the first step", d: "Define the first physical action so small it feels almost silly not to do — 'open the doc and write the headline', not 'work on the launch'." },
        { h: "Protect it", d: "Book the block. Tell XIO (or a human) what you committed to. Unfinished One Doors get carried over, never quietly dropped." },
        { h: "Weekly re-run", d: "Every week, re-dump and re-sort. Clarity isn't a state you reach — it's a loop you run." }
      ]
    },
    {
      id: "momentum-os", icon: "⚡", name: "Momentum OS", sub: "The weekly loop that compounds",
      steps: [
        { h: "Monday: commit to one theme", d: "Not ten goals — one theme for the week (e.g. 'finish', 'sell', 'build'). Every day gets judged against the theme." },
        { h: "Daily: one move, logged", d: "Each day, complete ONE move that advances your top goal and log it in XIO. Streaks aren't vanity — momentum is measurable." },
        { h: "Midweek: momentum check", d: "Ask XIO 'where's my momentum?' It will show you what's actually moving vs what you think is moving. Adjust the theme if reality disagrees." },
        { h: "Friday: celebrate, then decide", d: "Name the week's real win — register it properly. Then decide, not drift, into next week: continue, cut, or change." },
        { h: "Sunday: rest deliberately", d: "Genuine rest is part of the system. An exhausted operator makes expensive decisions. Recovery is a strategy, not a reward." }
      ]
    },
    {
      id: "decision-engine", icon: "⚖️", name: "The Decision Engine", sub: "Make the call. Stop renting it anxiety.",
      steps: [
        { h: "Reversible? Decide fast", d: "If you can undo it cheaply, speed beats analysis. Pick the option that teaches you the most, set a review date, move." },
        { h: "Irreversible? Raise the bar", d: "Slow down. Demand evidence. Run a pre-mortem (it's a year later and it failed — what happened?) before you commit." },
        { h: "10 / 10 / 10", d: "How will each option feel in 10 minutes, 10 months, 10 years? The 10-year answer usually exposes which fear is pretending to be logic." },
        { h: "Disqualify the fake options", d: "Most 'decisions' are one real option plus its disguised negative. Write both options as real, livable lives. If one can't be written vividly, it isn't an option." },
        { h: "Decide by identity", d: "Ask: which choice is made by the person I'm trying to become? When values settle it, stop optimizing." },
        { h: "Log it and revisit", d: "Record the decision and reasoning in XIO. Future-you gets to see your reasoning, not just your result — that's how judgment compounds." }
      ]
    },
    {
      id: "xio-effect", icon: "✦", name: "The XIO Effect Playbook", sub: "From busy to building",
      steps: [
        { h: "Audit the repetition", d: "Track one week honestly. Highlight anything you did more than twice. That highlight is your automation/systemization roadmap." },
        { h: "Systemize in order of drag", d: "Don't automate everything. Start with the one repetitive task that drains the most energy per week — energy saved beats time saved." },
        { h: "Build the intelligence habit", d: "5 minutes daily with XIO: one briefing, one next move, one logged win. Small, consistent context is what teaches your intelligence layer who you are." },
        { h: "Raw materials → assets", d: "Every solved problem is a future asset: a template, a checklist, a prompt, a SOP. When you solve something twice, capture it once." },
        { h: "Buy back founder time", d: "Reinvest recovered hours into the One Door — the highest-leverage move available. The XIO Effect compounds when recovered capacity funds momentum, not more busywork." },
        { h: "Review the system monthly", d: "Ask: is the business asking less of me for the same output? If the answer is no, the system needs work, not you." }
      ]
    }
  ],

  /* ── Demo seed profile ─────────────────────────────── */
  demo: {
    name: "Alex",
    goal: "Grow my design studio to a point where it runs without me in every decision",
    memories: [
      { text: "Prefers to be called Alex.", category: "identity", confidence: 100, source: "onboarding" },
      { text: "Is working toward: grow my design studio to a point where it runs without me in every decision", category: "goal", confidence: 95, source: "onboarding" },
      { text: "90-day definition of success: two retainer clients signed and delivery documented into playbooks", category: "goal", confidence: 90, source: "onboarding" },
      { text: "Is losing time/energy to: client revisions arriving in scattered messages across three platforms", category: "challenge", confidence: 88, source: "onboarding" },
      { text: "Wants help with: turning ideas into shipped work instead of endless planning", category: "preference", confidence: 90, source: "onboarding" },
      { text: "Works best: deep focus in the morning, admin after lunch, no decisions after 6pm", category: "working_style", confidence: 85, source: "onboarding" },
      { text: "Recent win: finally sent the retainer proposal to the brewery client", category: "achievement", confidence: 75, source: "conversation" },
      { text: "Observed habit: Alex tends to refine plans instead of shipping them", category: "habit", confidence: 46, source: "system" }
    ],
    projects: [
      { name: "Brewery retainer proposal", status: "active", note: "Sent — awaiting reply, follow-up due Friday" },
      { name: "Studio delivery playbook", status: "stalled", note: "Outline done; hasn't moved in 9 days" }
    ],
    wins: ["Sent the retainer proposal", "Blocked morning deep-work three days in a row", "Raised package pricing 15%"],
    insights: [
      { insight: "It looks like you build momentum when the first step is tiny and visible — the proposal moved the day it became 'just send version one'.", category: "pattern", confidence: 68, evidence: "Retainer proposal + pricing change both followed small first steps" },
      { insight: "I've noticed planning sometimes substitutes for shipping — the playbook has an outline, 3 versions of the outline, and no draft.", category: "pattern", confidence: 55, evidence: "Playbook activity over 9 days: edits to outline only" }
    ]
  }
};

/* ── Helpers used across modules ─────────────────────── */
window.XIO_UTILS = {
  esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); },
  fmtDate(ts){ return new Date(ts).toLocaleDateString(undefined, { month:"short", day:"numeric" }); },
  daysBetween(a,b){ return Math.floor((b - a) / 86400000); },
  todayKey(ts = Date.now()){ const d = new Date(ts); return d.toISOString().slice(0,10); },
  uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); },
  clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
};

window.XIO_DATA = XIO_DATA;

/* ── Beta reviews (private beta impressions) ─────────── */
XIO_DATA.testimonials = {
  home: [
    { q: "I told XIO about my week on Monday. By Friday it had noticed I was re-opening the same proposal without sending it. Uncomfortably accurate — and exactly what I needed.", n: "Maya R.", r: "Brand designer · beta user" },
    { q: "Every AI tool I tried felt identical on day one and day thirty. XIO is the first thing that's more useful on day nine than day two. It compounds.", n: "Devon K.", r: "Agency founder · beta user" },
    { q: "The 'should I remember this?' prompt won me over. It asks. My data stays mine. And then it actually uses what it learns.", n: "Priya S.", r: "Independent consultant · beta user" }
  ],
  intelligence: [
    { q: "Week two, I asked something random and it answered with reference to a goal I'd mentioned once. That was the moment I started trusting it.", n: "Jordan M.", r: "E-commerce owner · beta user" },
    { q: "It never pretends to know me. When its confidence is low, it asks. That honesty is what makes the strong answers feel earned.", n: "Alba D.", r: "Coach & writer · beta user" }
  ],
  systems: [
    { q: "The Prompt Builder alone replaced my messy notes folder. And the Content Engine drafts sound like me on a very good day.", n: "Sofia T.", r: "Content lead · beta user" },
    { q: "Toolkit one killed my Sunday-planning anxiety. One theme, one move a day. My week stopped being a junk drawer.", n: "Marcus B.", r: "Solo SaaS founder · beta user" }
  ],
  pricing: [
    { q: "Pro costs less than one recovered hour of my month. In the first three weeks it gave me back roughly six.", n: "Andre L.", r: "Operations consultant · beta user" },
    { q: "I keep Core on a second account just for the morning briefing. Pro is where the memory unlock — and the magic — is.", n: "Nadia F.", r: "Studio owner · beta user" }
  ]
};
