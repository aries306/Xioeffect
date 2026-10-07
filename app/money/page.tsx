"use client";

import { useMemo, useState } from "react";

type Idea = {
  title: string;
  audience: string;
  offer: string;
  price: number;
  monthlyBuyers: number;
  launchSteps: string[];
  channels: string[];
};

const ideas: Record<string, Idea> = {
  creator: {
    title: "Digital Product Sprint",
    audience: "creators, coaches, and niche experts",
    offer: "a paid checklist, template pack, or mini-course that solves one painful problem",
    price: 49,
    monthlyBuyers: 80,
    launchSteps: [
      "Pick one audience and one outcome you can deliver in under seven days.",
      "Package your best process into a template, worksheet, or recorded walkthrough.",
      "Publish a landing page with a clear promise, proof, price, and checkout button.",
      "Post one useful tip daily and invite readers to download the paid pack.",
    ],
    channels: ["TikTok demos", "LinkedIn carousels", "newsletter swaps"],
  },
  local: {
    title: "Local Lead Engine",
    audience: "home services, salons, fitness studios, and local consultants",
    offer: "a done-for-you landing page plus weekly ad and review follow-up system",
    price: 399,
    monthlyBuyers: 12,
    launchSteps: [
      "Choose one local niche where every new customer is worth at least $300.",
      "Build a one-page site that captures calls, quote requests, and reviews.",
      "Offer the first setup at a discount in exchange for a testimonial.",
      "Turn the first result into a case study and send it to 50 similar businesses.",
    ],
    channels: ["cold email", "Google Business Profile audits", "local Facebook groups"],
  },
  ecommerce: {
    title: "Micro-Brand Drops",
    audience: "buyers in passionate hobby communities",
    offer: "limited-run products bundled with story-driven content and helpful guides",
    price: 29,
    monthlyBuyers: 180,
    launchSteps: [
      "Validate a product idea by collecting 100 email votes before buying inventory.",
      "Create a preorder page with a simple guarantee and transparent ship date.",
      "Partner with two micro-influencers for authentic product demos.",
      "Reinvest early profit into the best-selling variation only.",
    ],
    channels: ["Reddit communities", "Instagram Reels", "micro-influencer affiliates"],
  },
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function MoneyAppPage() {
  const [path, setPath] = useState("creator");
  const [price, setPrice] = useState(ideas.creator.price);
  const [buyers, setBuyers] = useState(ideas.creator.monthlyBuyers);
  const [costs, setCosts] = useState(600);

  const idea = ideas[path];
  const revenue = price * buyers;
  const profit = Math.max(revenue - costs, 0);
  const annual = profit * 12;
  const breakeven = useMemo(() => Math.ceil(costs / Math.max(price, 1)), [costs, price]);

  function choose(nextPath: string) {
    const nextIdea = ideas[nextPath];
    setPath(nextPath);
    setPrice(nextIdea.price);
    setBuyers(nextIdea.monthlyBuyers);
  }

  return (
    <main className="money-page">
      <section className="money-hero">
        <p className="eyebrow">XIO Money Builder</p>
        <h1>Pick a monetizable offer, calculate the upside, and launch with a simple plan.</h1>
        <p className="hero-copy">This app does not promise guaranteed income. It gives you a practical revenue model, clear launch steps, and numbers you can test with real customers.</p>
      </section>

      <section className="builder-grid" aria-label="Money app builder">
        <div className="panel selector-panel">
          <h2>1. Choose your fastest path</h2>
          <div className="option-list">
            {Object.entries(ideas).map(([key, item]) => (
              <button key={key} className={key === path ? "option active" : "option"} type="button" onClick={() => choose(key)}>
                <strong>{item.title}</strong>
                <span>Sell to {item.audience}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel plan-panel">
          <h2>2. Your offer blueprint</h2>
          <p className="offer"><strong>{idea.title}</strong>: Sell {idea.offer} to {idea.audience}.</p>
          <div className="channels">{idea.channels.map((channel) => <span key={channel}>{channel}</span>)}</div>
          <ol>{idea.launchSteps.map((step) => <li key={step}>{step}</li>)}</ol>
        </div>

        <div className="panel calculator-panel">
          <h2>3. Profit calculator</h2>
          <label>Price per sale<input type="number" min="1" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
          <label>Monthly buyers<input type="number" min="0" value={buyers} onChange={(event) => setBuyers(Number(event.target.value))} /></label>
          <label>Monthly tools + ad costs<input type="number" min="0" value={costs} onChange={(event) => setCosts(Number(event.target.value))} /></label>
          <div className="metrics">
            <div><span>Monthly revenue</span><strong>{currency(revenue)}</strong></div>
            <div><span>Monthly profit</span><strong>{currency(profit)}</strong></div>
            <div><span>Annualized profit</span><strong>{currency(annual)}</strong></div>
            <div><span>Break-even sales</span><strong>{breakeven}</strong></div>
          </div>
        </div>
      </section>

      <section className="next-action">
        <h2>Your next money move</h2>
        <p>Validate before you build: message 20 likely buyers today with the offer promise and ask what would make it worth paying for.</p>
      </section>

      <style jsx>{`
        .money-page { min-height: 100vh; padding: 72px 24px; color: #f7f7ff; background: radial-gradient(circle at top left, rgba(124,108,255,.38), transparent 32%), #06060e; }
        .money-hero, .builder-grid, .next-action { max-width: 1120px; margin: 0 auto; }
        .money-hero { text-align: center; padding: 36px 0 44px; }
        .eyebrow { color: #00e5ff; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
        h1 { font-size: clamp(38px, 7vw, 78px); line-height: .98; margin: 14px auto; max-width: 950px; }
        .hero-copy { color: #b8b8d4; max-width: 720px; margin: 0 auto; font-size: 18px; }
        .builder-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 18px; align-items: stretch; }
        .panel, .next-action { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.055); border-radius: 24px; padding: 24px; box-shadow: 0 24px 80px rgba(0,0,0,.28); backdrop-filter: blur(18px); }
        .calculator-panel { grid-column: 1 / -1; }
        h2 { margin: 0 0 16px; font-size: 24px; }
        .option-list { display: grid; gap: 12px; }
        .option { text-align: left; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 16px; color: inherit; background: rgba(255,255,255,.04); }
        .option.active { border-color: #00e5ff; background: rgba(0,229,255,.1); }
        .option strong, .option span { display: block; }
        .option span, .offer, li, label { color: #b8b8d4; }
        .channels { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
        .channels span { color: #071018; background: #00e5ff; border-radius: 999px; padding: 6px 10px; font-weight: 800; }
        ol { padding-left: 22px; }
        li { margin: 10px 0; }
        label { display: grid; gap: 8px; margin: 12px 0; }
        input { color: #fff; border: 1px solid rgba(255,255,255,.16); background: rgba(0,0,0,.25); border-radius: 12px; padding: 12px; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 18px; }
        .metrics div { border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 16px; background: rgba(0,0,0,.18); }
        .metrics span { display: block; color: #9b9bb6; font-size: 13px; }
        .metrics strong { display: block; margin-top: 6px; font-size: 24px; }
        .next-action { margin-top: 20px; background: linear-gradient(135deg, rgba(124,108,255,.22), rgba(0,229,255,.1)); }
        .next-action p { color: #d8d8ed; font-size: 18px; }
        @media (max-width: 800px) { .builder-grid, .metrics { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
