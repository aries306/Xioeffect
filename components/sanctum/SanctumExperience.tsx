"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PILLARS = ["Memory","Learning","Projects","Intelligence","Agents","Knowledge","Insights","Trust"];
const ZUNA_WELCOME = "I am Zuna. I am here to understand what matters to you, remember only what you authorize, and help your world become more coherent over time.";

function wordsFrom(text: string) {
  return Array.from(new Set(text.toLowerCase().replace(/[^a-z0-9\s'-]/g," ").split(/\s+/).filter(w=>w.length>3))).slice(0,12);
}
function pickVoice(voices: SpeechSynthesisVoice[]) {
  const preferred=["Samantha","Ava","Jenny","Victoria","Karen","Google UK English Female","Microsoft Jenny","Microsoft Ava"];
  return voices.find(v=>preferred.some(n=>v.name.toLowerCase().includes(n.toLowerCase()))) ??
    voices.find(v=>/^en-CA/i.test(v.lang)) ?? voices.find(v=>/^en(-|_)/i.test(v.lang)) ?? voices[0];
}

export default function SanctumExperience({ signedIn }: { signedIn:boolean }) {
  const router=useRouter();
  const [goal,setGoal]=useState("");
  const [saved,setSaved]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [voiceReady,setVoiceReady]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const [memoryStates,setMemoryStates]=useState<Array<{id:string;text:string;category:string;lifecycleState:string;evaluation:{eligible:boolean;status:string;reasons:string[];influenceWeight:number}|null;potentialConflicts:Array<{id:string;text:string;category:string}>}>>([]);
  const [memoryLoading,setMemoryLoading]=useState(false);
  const [conflictBusy,setConflictBusy]=useState<string|null>(null);
  const concepts=useMemo(()=>wordsFrom(goal),[goal]);

  useEffect(()=>{
    if(!("speechSynthesis" in window)) return;
    const load=()=>setVoiceReady(window.speechSynthesis.getVoices().length>0);
    load(); window.speechSynthesis.addEventListener("voiceschanged",load);
    return()=>window.speechSynthesis.removeEventListener("voiceschanged",load);
  },[]);

  useEffect(()=>{
    if(!signedIn) return;
    let cancelled=false;
    async function loadMemoryState(){
      setMemoryLoading(true);
      try{
        const workspaceResponse=await fetch("/api/workspace");
        if(!workspaceResponse.ok) return;
        const {workspace}=await workspaceResponse.json();
        const response=await fetch(`/api/memory?workspaceId=${encodeURIComponent(workspace.id)}`);
        if(!response.ok) return;
        const payload=await response.json();
        const recent=Array.isArray(payload.memories)?payload.memories.slice(0,4):[];
        const evaluated=await Promise.all(recent.map(async (memory:{id:string;text:string;category?:string;lifecycle_state?:string;lifecycleState?:string})=>{
          try{
            const result=await fetch("/api/memory/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId:workspace.id,memoryId:memory.id,context:{context:"personal"}})});
            if(!result.ok) return {id:memory.id,text:memory.text,category:memory.category??"other",lifecycleState:memory.lifecycleState??memory.lifecycle_state??"unknown",evaluation:null,potentialConflicts:[]};
            const evaluatedPayload=await result.json();
            return {id:memory.id,text:memory.text,category:memory.category??"other",lifecycleState:memory.lifecycleState??memory.lifecycle_state??"unknown",evaluation:evaluatedPayload.evaluation??null,potentialConflicts:evaluatedPayload.potentialConflicts??[]};
          }catch{
            return {id:memory.id,text:memory.text,category:memory.category??"other",lifecycleState:memory.lifecycleState??memory.lifecycle_state??"unknown",evaluation:null,potentialConflicts:[]};
          }
        }));
        if(!cancelled) setMemoryStates(evaluated);
      }catch{
        if(!cancelled) setMemoryStates([]);
      }finally{
        if(!cancelled) setMemoryLoading(false);
      }
    }
    void loadMemoryState();
    return()=>{cancelled=true};
  },[signedIn]);

  function speak(text:string) {
    if(!("speechSynthesis" in window)||!text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text.trim());
    utterance.lang="en-CA"; utterance.rate=.92; utterance.pitch=1.06;
    const voice=pickVoice(window.speechSynthesis.getVoices()); if(voice) utterance.voice=voice;
    utterance.onstart=()=>setSpeaking(true); utterance.onend=()=>setSpeaking(false); utterance.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }
  function stopSpeaking(){ window.speechSynthesis?.cancel(); setSpeaking(false); }

  async function confirmConflict(memoryId:string,targetMemoryId:string) {
    const actionKey=`${memoryId}:${targetMemoryId}`;
    if(conflictBusy) return;
    setConflictBusy(actionKey); setSaveError(false);
    try{
      const workspaceResponse=await fetch("/api/workspace");
      if(!workspaceResponse.ok) throw new Error("workspace");
      const {workspace}=await workspaceResponse.json();
      const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        workspaceId:workspace.id,memoryId,signal:"contradict",contradictsMemoryId:targetMemoryId,
        note:"User confirmed a potential contradiction in Sanctum."
      })});
      if(!response.ok) throw new Error("feedback");
      const evaluate=async(id:string)=>{
        const result=await fetch("/api/memory/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId:workspace.id,memoryId:id,context:{context:"personal"}})});
        return result.ok?await result.json():null;
      };
      const [sourceState,targetState]=await Promise.all([evaluate(memoryId),evaluate(targetMemoryId)]);
      setMemoryStates(current=>current.map(item=>{
        if(item.id===memoryId) return {...item,evaluation:sourceState?.evaluation??null,potentialConflicts:sourceState?.potentialConflicts??[]};
        if(item.id===targetMemoryId) return {...item,evaluation:targetState?.evaluation??null,potentialConflicts:targetState?.potentialConflicts??[]};
        return item;
      }));
    }catch{setSaveError(true);}
    finally{setConflictBusy(null);}
  }

  async function remember() {
    if(!signedIn){ router.push("/sign-up?redirect_url=/sanctum"); return; }
    if(!goal.trim()||saving) return;
    setSaving(true); setSaveError(false);
    try{
      const workspaceResponse=await fetch("/api/workspace");
      if(!workspaceResponse.ok) throw new Error("workspace");
      const {workspace}=await workspaceResponse.json();
      const response=await fetch("/api/memory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        workspaceId:workspace.id,text:goal.trim(),category:"goal",confidence:70,relevance:80,confirmed:true,
        source:"sanctum-arrival",scope:{originContext:"personal",arrival:true},
        provenance:{type:"sanctum-arrival",source:"user-confirmed",capturedAt:new Date().toISOString()}
      })});
      if(!response.ok) throw new Error("memory");
      const {memory}=await response.json();
      let evaluation=null;
      let potentialConflicts:Array<{id:string;text:string;category:string}>=[];
      if(memory?.id){
        const evaluatedResponse=await fetch("/api/memory/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId:workspace.id,memoryId:memory.id,context:{context:"personal"}})});
        if(evaluatedResponse.ok){
          const evaluatedPayload=await evaluatedResponse.json();
          evaluation=evaluatedPayload.evaluation??null;
          potentialConflicts=evaluatedPayload.potentialConflicts??[];
        }
        setMemoryStates(current=>[{id:memory.id,text:memory.text,category:memory.category??"goal",lifecycleState:memory.lifecycleState??"active",evaluation,potentialConflicts},...current.filter(item=>item.id!==memory.id)].slice(0,4));
      }
      setSaved(true); speak(`Remembered with your permission. ${goal.trim()}`);
    }catch{ setSaved(false); setSaveError(true); }
    finally{ setSaving(false); }
  }

  return <main className="sanctum">
    <div className="sanctum-backdrop" aria-hidden="true">
      <div className="sanctum-nebula sanctum-nebula-one"/><div className="sanctum-nebula sanctum-nebula-two"/>
      <div className="sanctum-world sanctum-world-one"/><div className="sanctum-world sanctum-world-two"/>
      <div className="sanctum-ring sanctum-ring-one"/><div className="sanctum-ring sanctum-ring-two"/><div className="sanctum-ring sanctum-ring-three"/>
      <div className="sanctum-star sanctum-star-one"/><div className="sanctum-star sanctum-star-two"/><div className="sanctum-star sanctum-star-three"/>
    </div>
    <header className="sanctum-header">
      <button className="sanctum-brand" onClick={()=>router.push("/")} aria-label="Return to Zuna home"><span className="sanctum-brand-mark">Z</span><span>ZUNOVERSE</span></button>
      <div className="sanctum-header-right"><span className="sanctum-status"><i/> cognitive field online</span><button className="sanctum-ghost" onClick={()=>router.push("/")}>Return</button></div>
    </header>
    <div className="sanctum-field" aria-hidden="true">
      <div className="sanctum-core"><div className="sanctum-core-inner"/></div>
      {PILLARS.map((p,i)=><span key={p} className="sanctum-node" style={{"--i":i} as React.CSSProperties}>{p}</span>)}
      {concepts.map((c,i)=><span key={c} className="sanctum-concept" style={{"--i":i} as React.CSSProperties}>{c}</span>)}
    </div>
    <section className="sanctum-content">
      <div className="sanctum-stage">
        <div className="sanctum-kicker">YOUR MIND · OUR UNIVERSE</div>
        <div className="sanctum-z-mark" aria-hidden="true">Z</div>
        <div className="sanctum-eyebrow">Zuna · provenance-first intelligence</div>
        <h1>Enter the space where your context becomes coherent.</h1>
        <p className="sanctum-lede">Zuna learns with you—not ahead of you. Give her one intention, and she will treat it as <strong>user-authorized context</strong>, not an invisible assumption.</p>
        <div className="sanctum-voice">
          <button className={`sanctum-voice-button${speaking?" is-speaking":""}`} onClick={()=>speaking?stopSpeaking():speak(ZUNA_WELCOME)} disabled={!voiceReady} aria-label={speaking?"Stop Zuna voice":"Hear Zuna"}>
            <span className="sanctum-voice-orb"><i/><i/><i/></span><span>{speaking?"Zuna is speaking":"Hear Zuna"}</span>
          </button>
          <span className="sanctum-voice-note">{voiceReady?"Browser voice ready · en-CA":"Voice will appear when your browser exposes a voice"}</span>
        </div>
        <div className="sanctum-input-shell">
          <span className="sanctum-input-label">Your first intention</span>
          <textarea value={goal} onChange={e=>{setGoal(e.target.value);setSaved(false)}} autoFocus placeholder="I want to make possible…" aria-label="Your first intention"/>
          <span className="sanctum-input-glow"/>
        </div>
        <div className="sanctum-actions">
          {!saved?<button className="sanctum-button" disabled={!goal.trim()||saving} onClick={remember}>{saving?"Saving memory…":signedIn?"Remember this":"Sign in to remember this"} <span>→</span></button>:<span className="sanctum-confirmed">✓ Remembered with your permission</span>}
          {goal.trim()&&<button className="sanctum-speak-intention" onClick={()=>speaking?stopSpeaking():speak(goal)}>{speaking?"Stop voice":"Let Zuna say it"}</button>}
          <button className="sanctum-ghost sanctum-enter" onClick={()=>router.push(signedIn?"/app":"/sign-up?redirect_url=/app")}>Enter Zuna <span>↗</span></button>
        </div>
        {saveError&&<p className="sanctum-error" role="alert">The memory could not be saved. Please check your session and try again.</p>}
        {goal&&<div className="sanctum-quote">“{goal.trim()}”</div>}
        {signedIn&&<section className="sanctum-memory-panel" aria-label="Validated memory state">
          <div className="sanctum-memory-heading"><span>MEMORY FABRIC</span><strong>Validated state</strong><small>Context: personal</small></div>
          {memoryLoading?<p className="sanctum-memory-empty">Evaluating recent memories before influence…</p>:memoryStates.length===0?<p className="sanctum-memory-empty">No saved memories to evaluate yet.</p>:<div className="sanctum-memory-list">
            {memoryStates.map(item=><article className="sanctum-memory-row" key={item.id}>
              <div className="sanctum-memory-copy"><strong>{item.category}</strong><span>{item.text}</span></div>
              <div className={`sanctum-memory-status ${item.evaluation?.eligible?"is-eligible":"is-blocked"}`}>
                <strong>{item.evaluation?.status??"not evaluated"}</strong>
                <small>{item.evaluation?.eligible?`influence weight ${item.evaluation.influenceWeight.toFixed(3)}`:item.evaluation?.reasons?.[0]??item.lifecycleState}</small>
              </div>
              {item.potentialConflicts.map(conflict=><div className="sanctum-memory-conflict" key={conflict.id}>
                <span><strong>Possible conflict</strong> · lexical overlap only; review before acting: {conflict.text}</span>
                <button type="button" disabled={Boolean(conflictBusy)} onClick={()=>void confirmConflict(item.id,conflict.id)}>{conflictBusy===`${item.id}:${conflict.id}`?"Saving review…":"Confirm contradiction"}</button>
              </div>)}
            </article>)}
          </div>}
          <p className="sanctum-memory-footnote">Only eligible memories may influence responses. A memory status is not a belief, pattern, insight, or recommendation.</p>
        </section>}
      </div>
    </section>
    <section className="sanctum-manifest" aria-label="Zuna principles">
      <div><span>01</span><strong>Remember</strong><small>with permission</small></div>
      <div><span>02</span><strong>Understand</strong><small>through context</small></div>
      <div><span>03</span><strong>Re-evaluate</strong><small>before influence</small></div>
      <div><span>04</span><strong>Evolve</strong><small>without losing provenance</small></div>
    </section>
    <div className="sanctum-caption">Memory has lineage. Context has gravity. Nothing becomes truth by accident.</div>
  </main>;
}