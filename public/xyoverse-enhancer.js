(() => {
  const body = document.body;
  if (!body || document.getElementById('xyoverse-enhancer')) return;
  const style = document.createElement('style');
  style.id = 'xyoverse-enhancer';
  style.textContent = '.xy-float{transition:transform .45s ease;transform-style:preserve-3d}.xy-float:hover{transform:translateY(-4px) rotateX(2deg) rotateY(-2deg)}.xy-shimmer{background:linear-gradient(90deg,#fff,#8d79ff,#53e9ff,#fff);background-size:300% 100%;-webkit-background-clip:text;color:transparent;animation:xyShimmer 7s linear infinite}@keyframes xyShimmer{to{background-position:300% 0}}@media(prefers-reduced-motion:reduce){.xy-float,.xy-shimmer{animation:none!important;transition:none!important}}';
  document.head.appendChild(style);
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n=>{if(!n.nodeValue)return; n.nodeValue=n.nodeValue.replace(/ZIO/g,'Xyoverse').replace(/XIO/g,'Xyoverse').replace(/Veyron/g,'Novum');});
  document.title='Xyoverse · your intelligent universe';
  const core=document.querySelector('.n1');
  if(core){const b=core.querySelector('b'),s=core.querySelector('span');if(b)b.textContent='NOVUM';if(s)s.textContent='the intelligence at the heart of Xyoverse';core.classList.add('xy-float');}
  document.querySelectorAll('.node').forEach(n=>n.classList.add('xy-float'));
  const input=document.querySelector('.composer input'); if(input) input.placeholder='Ask Novum anything…';
  const topButton=document.querySelector('.topbtn'); if(topButton){topButton.textContent='Start with Xyoverse';topButton.classList.add('xy-float');}
  const map=document.createElement('div'); map.id='xy-map'; map.style.cssText='position:fixed;inset:0;z-index:100;display:none;padding:8vh 8vw;background:#02040bf5;color:#eef2ff;font-family:Inter,system-ui,sans-serif;overflow:auto';
  map.innerHTML='<div style="max-width:1000px;margin:auto"><button id="xy-map-close" style="float:right;padding:10px;border-radius:10px;background:#ffffff10;color:#fff;border:1px solid #ffffff22">Close</button><div style="font-size:10px;letter-spacing:.2em;color:#53e9ff">XYOVERSE</div><h2 class="xy-shimmer" style="font-size:clamp(44px,7vw,84px);margin:10px 0">Axiomap</h2><p style="color:#8f99b5;max-width:650px;line-height:1.7">Explore how your ideas connect. Axiomap connects memory, goals, research, creation, learning and action around Novum.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:30px"><div style="padding:20px;border:1px solid #ffffff15;border-radius:18px"><b>NOVUM</b><p>The intelligence at the heart of Xyoverse.</p></div><div style="padding:20px;border:1px solid #ffffff15;border-radius:18px"><b>Memory</b><p>Context you choose to retain.</p></div><div style="padding:20px;border:1px solid #ffffff15;border-radius:18px"><b>Goals</b><p>Intentions become visible paths.</p></div><div style="padding:20px;border:1px solid #ffffff15;border-radius:18px"><b>Research</b><p>Evidence stays traceable.</p></div><div style="padding:20px;border:1px solid #ffffff15;border-radius:18px"><b>Creation</b><p>Ideas become real outputs.</p></div><div style="padding:20px;border:1px solid #ffffff15;border-radius:18px"><b>Action</b><p>Insight becomes the next move.</p></div></div></div>';
  body.appendChild(map);
  const mapButton=document.createElement('button');mapButton.textContent='Axiomap · Explore how your ideas connect';mapButton.style.cssText='position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:90;padding:9px 13px;border-radius:12px;border:1px solid #53e9ff44;background:#070a18dd;color:#dbe3ff;backdrop-filter:blur(12px)';body.appendChild(mapButton);mapButton.onclick=()=>map.style.display='block';map.querySelector('#xy-map-close').onclick=()=>map.style.display='none';
  const scene=document.querySelector('.scene'); if(scene&&!matchMedia('(prefers-reduced-motion: reduce)').matches){body.addEventListener('pointermove',e=>{const x=(e.clientX/innerWidth-.5)*2,y=(e.clientY/innerHeight-.5)*2;scene.style.transform=`rotateX(${58-y*2}deg) rotateZ(${-2+x}deg) translate3d(${x*6}px,${y*4}px,0)`},{passive:true});}
})();
