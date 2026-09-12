(() => {
  const doc = document;
  if (doc.documentElement.dataset.starfieldEnhanced) return;
  doc.documentElement.dataset.starfieldEnhanced = '1';

  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'1',pointerEvents:'none',opacity:'.9'});
  doc.body.appendChild(canvas);
  const gl = canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
  if (!gl) return;
  const vs = `attribute vec3 p; attribute float s; uniform mat4 m; varying float a; void main(){ vec4 q=m*vec4(p,1.0); gl_Position=q; gl_PointSize=s*(1.0/max(.35,q.w)); a=clamp(1.25-q.w*.18,0.05,1.0); }`;
  const fs = `precision mediump float; varying float a; void main(){ vec2 q=gl_PointCoord-.5; float d=length(q); float g=smoothstep(.5,.02,d); gl_FragColor=vec4(.42,.55,1.0,g*a*.82); }`;
  const compile=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x};
  const prog=gl.createProgram(); gl.attachShader(prog,compile(gl.VERTEX_SHADER,vs)); gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(prog); gl.useProgram(prog);
  const N=Math.min(2600,Math.max(900,Math.floor(innerWidth*innerHeight/520)));
  const pts=new Float32Array(N*3), sizes=new Float32Array(N);
  for(let i=0;i<N;i++){const r=Math.pow(Math.random(),.55)*9.5, a=Math.random()*Math.PI*2, z=(Math.random()-.5)*6; pts[i*3]=Math.cos(a)*r; pts[i*3+1]=Math.sin(a)*r*.58; pts[i*3+2]=z+(Math.random()-.5)*r*.18; sizes[i]=.8+Math.random()*2.4;}
  const bp=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bp);gl.bufferData(gl.ARRAY_BUFFER,pts,gl.STATIC_DRAW);const lp=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,3,gl.FLOAT,false,0,0);
  const bs=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bs);gl.bufferData(gl.ARRAY_BUFFER,sizes,gl.STATIC_DRAW);const ls=gl.getAttribLocation(prog,'s');gl.enableVertexAttribArray(ls);gl.vertexAttribPointer(ls,1,gl.FLOAT,false,0,0);
  const lm=gl.getUniformLocation(prog,'m'); gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE); gl.clearColor(0,0,0,0);
  let rx=.16,ry=0,t=0,tx=0,ty=0;
  const resize=()=>{const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;gl.viewport(0,0,canvas.width,canvas.height)};
  addEventListener('resize',resize); addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5)*.28;ty=(e.clientY/innerHeight-.5)*.18}); resize();
  const perspective=(fov,asp,n,f)=>{const q=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=q/asp;o[5]=q;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o};
  const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o};
  const rot=(x,y,z)=>{const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);return new Float32Array([cy*cz,cy*sz,-sy,0,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,0,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy,0,0,0,0,1])};
  const frame=()=>{t+=.002;rx+=(ty-rx)*.025;ry+=(tx+Math.sin(t)*.035-ry)*.018;const p=perspective(1.05,innerWidth/innerHeight,.1,40),r=rot(rx,ry,t*.045);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniformMatrix4fv(lm,false,mul(p,r));gl.drawArrays(gl.POINTS,0,N);requestAnimationFrame(frame)}; frame();

  const input=doc.querySelector('.composer input'), send=doc.querySelector('.send'), context=doc.querySelector('.context'), title=doc.querySelector('.label h1'), subtitle=doc.querySelector('.label p'), toast=doc.querySelector('.toast');
  let conversationId;
  const notify=(text)=>{if(!toast)return;toast.textContent=text;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)};
  const submit=async()=>{const message=input?.value.trim();if(!message)return; if(send)send.disabled=true; if(title)title.textContent='THINKING'; if(subtitle)subtitle.textContent='Astara is reorganizing the intelligence field';
    try{const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,conversationId})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Unable to reach Astara');conversationId=data.conversationId; if(context)context.innerHTML=(data.answer||'Intelligence synchronized.').replace(/[<>]/g,'')+' <span class="cursor"></span>'; if(title)title.textContent='NEXUS'; if(subtitle)subtitle.textContent=data.recommendation||'Context understood. Intelligence updated.'; notify('Intelligence synchronized'); input.value=''; doc.querySelectorAll('.node button').forEach((n,i)=>{if(i<5)n.animate([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(1)'}],{duration:900,delay:i*80})});}
    catch(e){if(title)title.textContent='READY';if(subtitle)subtitle.textContent=e.message;notify('Connection needs attention');} finally{if(send)send.disabled=false;}
  };
  send?.addEventListener('click',submit); input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
})();
