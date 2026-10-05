"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PILLARS = ["Memory","Learning","Projects","Intelligence","Agents","Knowledge","Insights","Trust"];

function wordsFrom(text: string) {
  return Array.from(new Set(text.toLowerCase().replace(/[^a-z0-9\s'-]/g," ").split(/\s+/).filter(w=>w.length>3))).slice(0,12);
}

export default function SanctumExperience({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [goal,setGoal]=useState("");
  const [saved,setSaved]=useState(false);
  const concepts=useMemo(()=>wordsFrom(goal),[goal]);

  async function remember() {
    if (!signedIn) { router.push("/sign-up?redirect_url=/sanctum"); return; }
    try {
      const workspaceResponse=await fetch("/api/workspace");
      if (!workspaceResponse.ok) throw new Error("workspace");
      const { workspace }=await workspaceResponse.json();
      const response=await fetch("/api/memory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        workspaceId:workspace.id,text:goal.trim(),category:"goal",confidence:70,relevance:80,confirmed:true,
        source:"sanctum-arrival",scope:{contexts:["personal"],arrival:true},
        provenance:{type:"sanctum-arrival",source:"user-confirmed",capturedAt:new Date().toISOString()}
      })});
      if (!response.ok) throw new Error("memory");
      setSaved(true);
    } catch { setSaved(false); }
  }

  return <main className="sanctum">
    <header className="sanctum-header"><span className="sanctum-brand"><i/>Zuna · Sanctum</span><button className="sanctum-ghost" onClick={()=>router.push("/")}>Return</button></header>
    <div className="sanctum-field" aria-hidden="true"><div className="sanctum-core"/>{PILLARS.map((p,i)=><span key={p} className="sanctum-node" style={{"--i":i} as React.CSSProperties}>{p}</span>)}{concepts.map((c,i)=><span key={c} className="sanctum-concept" style={{"--i":i} as React.CSSProperties}>{c}</span>)}</div>
    <section className="sanctum-content">
      <div className="sanctum-stage">
        <div className="sanctum-eyebrow">Vea · provenance-first intelligence</div>
        <h1>What do you want to make possible?</h1>
        <p>Give Zuna one intention. It becomes a user-confirmed starting point—not an invisible assumption.</p>
        <textarea value={goal} onChange={e=>setGoal(e.target.value)} autoFocus placeholder="I want to…"/>
        <div className="sanctum-actions">
          {!saved ? <button className="sanctum-button" disabled={!goal.trim()} onClick={remember}>{signedIn ? "Remember this" : "Sign in to remember this"} →</button> : <span className="sanctum-confirmed">✓ Remembered with your permission</span>}
          <button className="sanctum-ghost" onClick={()=>router.push(signedIn?"/app":"/sign-up?redirect_url=/app")}>Enter Zuna →</button>
        </div>
        {goal && <div className="sanctum-quote">“{goal.trim()}”</div>}
      </div>
    </section>
    <div className="sanctum-caption">Context becomes part of the world only when you authorize it.</div>
  </main>;
}
