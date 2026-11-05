const NS="http://www.w3.org/2000/svg";
const sv=document.getElementById('sv');
let uid=0; const id=p=>p+(++uid);
function el(tag,a,parent){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(parent||sv).appendChild(e);return e}
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,k)=>a+(b-a)*k;
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const E={io:x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2,out:x=>1-Math.pow(1-x,3),in:x=>x*x*x,
  back:gsap.parseEase('back.out(1.7)'),backIn:gsap.parseEase('back.in(1.6)'),el:gsap.parseEase('elastic.out(1,0.45)')};
const pop=(t,a,d=.5)=>t<a?0:E.back(clamp((t-a)/d));
const defs=el('defs',{});

function blob(r,cx,cy,R,n,j){const p=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=R*(1-j/2+j*r());p.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr])}
  let d=`M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;for(let i=0;i<n;i++){const p0=p[(i-1+n)%n],p1=p[i],p2=p[(i+1)%n],p3=p[(i+2)%n];
  d+=`C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)},${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)},${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`}return d+'Z'}
const circ=(cx,cy,r)=>`M${cx-r},${cy}a${r},${r} 0 1,0 ${2*r},0a${r},${r} 0 1,0 ${-2*r},0Z`;
const rrect=(x,y,w,h,r)=>`M${x+r},${y}H${x+w-r}A${r},${r} 0 0 1 ${x+w},${y+r}V${y+h-r}A${r},${r} 0 0 1 ${x+w-r},${y+h}H${x+r}A${r},${r} 0 0 1 ${x},${y+h-r}V${y+r}A${r},${r} 0 0 1 ${x+r},${y}Z`;

function hx(c){c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(c.substr(i,2),16))}
function mix(a,b,k){const A=hx(a),B=hx(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join('')}
function boost(c,sk=1.3,lk=1.22){if(!/^#/.test(c))return c;let[r,g,b]=hx(c).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,S=0,L=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;S=L>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}
  S=Math.min(1,S*sk);L=Math.min(.92,L*lk);const q=L<.5?L*(1+S):L+S-L*S,pp=2*L-q,f=t=>{t=(t+1)%1;return t<1/6?pp+(q-pp)*6*t:t<.5?q:t<2/3?pp+(q-pp)*(2/3-t)*6:pp};
  return'#'+[h+1/3,h,h-1/3].map(t=>Math.round(f(t)*255).toString(16).padStart(2,'0')).join('')}
function shaded(g,{d,cx,cy,r,base,shade,light,rim,lx=-1,ly=-1,spec=true,tex=0,seed=7,mid,flat=false}){
  const c=id('c');const cp=el('clipPath',{id:c},defs);el('path',{d},cp);
  const s=el('g',{'clip-path':`url(#${c})`},g);
  const L=light||mix(base,'#fff',.35),dk=mix(shade,'#0A0030',.25);
  el('path',{d,fill:rim||dk},s);
  const gid=id('vg');const rg=el('radialGradient',{id:gid,cx:.5+lx*.2,cy:.5+ly*.2,fx:.5+lx*.3,fy:.5+ly*.3,r:.78},defs);
  [[0,mix(L,'#fff',.15)],[.22,mid||mix(base,L,.55)],[.5,base],[.8,mix(base,shade,.7)],[1,dk]].forEach(([o,cc])=>el('stop',{offset:o,'stop-color':cc},rg));
  el('path',{d,fill:`url(#${gid})`,transform:rim?`translate(${lx*r*.07},${ly*r*.07})`:''},s);
  if(rim){const bid=id('bg');const bg=el('radialGradient',{id:bid,cx:.5-lx*.42,cy:.5-ly*.42,r:.45},defs);el('stop',{offset:0,'stop-color':rim,'stop-opacity':.55},bg);el('stop',{offset:1,'stop-color':rim,'stop-opacity':0},bg);el('path',{d,fill:`url(#${bid})`},s)}
  if(tex){const R=rng(seed);for(let i=0;i<tex;i++){const a=R()*6.28,q=Math.sqrt(R())*r*.95,rr=r*(.025+R()*.06),x=cx+Math.cos(a)*q,y=cy+Math.sin(a)*q;el('circle',{cx:x,cy:y,r:rr,fill:shade,opacity:.35},s);el('circle',{cx:x+lx*rr*.3,cy:y+ly*rr*.3,r:rr*.7,fill:mix(base,L,.3),opacity:.35},s)}}
  if(spec){el('ellipse',{cx:cx+lx*r*.5,cy:cy+ly*r*.52,rx:r*.13,ry:r*.07,fill:'#fff',opacity:.8,transform:`rotate(-35 ${cx+lx*r*.5} ${cy+ly*r*.52})`},s);el('circle',{cx:cx+lx*r*.28,cy:cy+ly*r*.66,r:r*.035,fill:'#fff',opacity:.75},s)}
  return s}
function ao(g,x,y,rx,op=.45,col='#0A0030'){const gid=id('ao');const rg=el('radialGradient',{id:gid},defs);el('stop',{offset:0,'stop-color':col,'stop-opacity':op},rg);el('stop',{offset:.6,'stop-color':col,'stop-opacity':op*.45},rg);el('stop',{offset:1,'stop-color':col,'stop-opacity':0},rg);return el('ellipse',{cx:x,cy:y,rx,ry:rx*.22,fill:`url(#${gid})`},g)}
function box3d(g,x,y,w,h,dz,{front,top,side,light,r=10,tex=0,seed=5}){const B=el('g',{},g),dx=dz*.7,dy=-dz*.55;
  el('path',{d:`M${x+r},${y} L${x+w-r},${y} L${x+w-r+dx},${y+dy} L${x+r+dx},${y+dy}Z`,fill:top},B);
  el('path',{d:`M${x+w-r},${y} Q${x+w},${y} ${x+w},${y+r} L${x+w},${y+h-r} L${x+w+dx},${y+h-r+dy} L${x+w+dx},${y+r+dy} Q${x+w+dx},${y+dy} ${x+w-r+dx},${y+dy}Z`,fill:side},B);
  shaded(B,{d:rrect(x,y,w,h,r),cx:x+w/2,cy:y+h/2,r:Math.max(w,h)/2,base:front,shade:mix(front,side,.6),light:light||mix(front,'#fff',.3),spec:false,tex,seed});
  el('path',{d:`M${x+r},${y+2} L${x+w-r},${y+2}`,stroke:mix(top,'#fff',.4),'stroke-width':3,'stroke-linecap':'round',opacity:.8},B);
  return B}
function bokeh(g,seed,n=7,cols=['#9EFAFF','#FF9AD5','#FFD93B'],blur=16){const G=el('g',{style:`filter:blur(${blur}px)`},g),R=rng(seed),a=[];
  for(let i=0;i<n;i++){const left=R()<.5,x=left?R()*220-60:880+R()*220,y=R()*1920,rr=40+R()*110,c=el('circle',{r:rr,fill:cols[i%cols.length],opacity:.3+R()*.3},G);a.push([c,x,y,R()*6,40+R()*60])}
  return (t,p=0)=>a.forEach(([c,x,y,ph,amp])=>{c.setAttribute('cx',(x+Math.sin(t*.4+ph)*20).toFixed(1));c.setAttribute('cy',(y-p*amp*4+Math.cos(t*.3+ph)*amp*.4).toFixed(1))})}
function rivets(g,pts,col='#fff',rr=4,op=.7){pts.forEach(([x,y])=>{el('circle',{cx:x,cy:y,r:rr,fill:mix(col,'#000',.35),opacity:op},g);el('circle',{cx:x-rr*.3,cy:y-rr*.3,r:rr*.55,fill:col,opacity:op},g)})}
function planet(g,x,y,r,{base,shade,light,rim,ring,seed=3,tex=10,halo}){const P=el('g',{},g);
  if(halo)[2.2,1.6,1.25].forEach((k,i)=>el('circle',{cx:x,cy:y,r:r*k,fill:halo,opacity:[.06,.1,.16][i]},P));
  if(ring)el('ellipse',{cx:x,cy:y,rx:r*1.9,ry:r*.42,fill:'none',stroke:ring,'stroke-width':r*.16,opacity:.7,transform:`rotate(-18 ${x} ${y})`},P);
  shaded(P,{d:circ(x,y,r),cx:x,cy:y,r,base,shade,light,rim,tex,seed,spec:false});
  if(ring){const cid=id('pr');el('rect',{x:x-r*2,y:y-r*2,width:r*4,height:r*2,transform:`rotate(-18 ${x} ${y})`},el('clipPath',{id:cid},defs));
    el('ellipse',{cx:x,cy:y,rx:r*1.9,ry:r*.42,fill:'none',stroke:ring,'stroke-width':r*.16,transform:`rotate(-18 ${x} ${y})`,'clip-path':`url(#${cid})`},P);}
  return P}
function glow(g,x,y,r,cols,blend='screen'){const G=el('g',{style:`mix-blend-mode:${blend}`},g);
  const k=[7,4.2,2.6,1.6,1],o=[.05,.1,.2,.45,1];k.forEach((m,i)=>el('circle',{cx:x,cy:y,r:r*m,fill:cols[Math.min(i,cols.length-1)],opacity:o[i]},G));return G}
const CY=['#00B7FF','#17F0FF','#9EFAFF','#E8FFFF','#fff'], WARM=['#FF5F14','#FF9500','#FFCB22','#FFF4D1','#fff'], PINK=['#CF0075','#FF3DA8','#FF9AD5','#FFE3F3','#fff'];
function glint(g,x,y,s,cols){const G=el('g',{transform:`translate(${x},${y})`},g);const L=el('g',{style:'mix-blend-mode:screen'},G);
  el('polygon',{points:`0,${-s*9} ${s*.5},0 0,${s*9} ${-s*.5},0`,fill:cols[1],opacity:.8},L);
  el('polygon',{points:`${-s*7},0 0,${s*.45} ${s*7},0 0,${-s*.45}`,fill:cols[1],opacity:.8},L);
  glow(G,0,0,s,[cols[2],cols[2],cols[1],cols[0],'#fff']);return G}
function soft(g,x,y,r,col,op){const gid=id('sf');const rg=el('radialGradient',{id:gid},defs);el('stop',{offset:0,'stop-color':col,'stop-opacity':op},rg);el('stop',{offset:1,'stop-color':col,'stop-opacity':0},rg);return el('circle',{cx:x,cy:y,r,fill:`url(#${gid})`},g)}
function txt(g,x,y,s,size,fill,o={}){const t=el('text',Object.assign({x,y,'font-size':size,fill,'font-weight':o.w||700,'text-anchor':o.a||'middle','font-family':'Avenir Next, Montserrat, Nunito, sans-serif'},o.attr||{}),g);t.textContent=s;return t}
function layer(parent,depth){const g=el('g',{},parent);g._d=depth;return g}
function cam(layers,cx,cy,s,dx,dy){layers.forEach(L=>{const k=L._d,ss=1+(s-1)*k;L.setAttribute('transform',`translate(${cx+dx*k},${cy+dy*k}) scale(${ss}) translate(${-cx},${-cy})`)})}
const tf=(n,x,y,s=1,r=0)=>n.setAttribute('transform',`translate(${x},${y}) rotate(${r}) scale(${s})`);

const starCols=['#FFFFFF','#9EFAFF','#59D0FF','#FFD93B','#FF7FC8','#C7B6FF','#FFFFFF'];
function spaceBg(g,seed,o={}){const W=o.W||1080,H=o.H||1920,gid=id('sg'),B=o.raw?(c=>c):(c=>boost(c,1.5,1.72));
  const rg=el('radialGradient',{id:gid,cx:o.cx??.5,cy:o.cy??.4,r:.85},defs);
  [[0,o.c0||'#2E1A8E'],[.55,o.c1||'#170C66'],[1,o.c2||'#0A0440']].forEach(([k,c])=>el('stop',{offset:k,'stop-color':B(c)},rg));
  el('rect',{x:-W,y:-H,width:W*3,height:H*3,fill:`url(#${gid})`},g);
  const R=rng(seed),st=[],gl=[];
  (o.neb||[]).forEach(([x,y,r,c,op])=>{const cc=B(c);soft(g,x,y,r*1.15,cc,Math.min(.9,op*1.35));
    [[1,.1],[.72,.12],[.48,.14]].forEach(([k,oo],j)=>el('path',{d:blob(R,x+(R()-.5)*r*.3,y+(R()-.5)*r*.3,r*k,9,.45),fill:j===2?mix(cc,"#fff",.12):cc,opacity:oo*.8},g))});
  const dust=el('g',{opacity:.5},g);for(let i=0;i<(o.dust??26);i++){const a=-.5,tt=R(),x=lerp(-100,W+100,tt),y=lerp(H*.75,H*.15,tt)+(R()-.5)*260;el('circle',{cx:x,cy:y,r:30+R()*90,fill:B(['#7C4DFF','#FF4FA3','#2EC8FF'][i%3]),opacity:.07},dust)}
  (o.pl||[]).forEach(p=>planet(g,p[0],p[1],p[2],p[3]));
  for(let i=0;i<(o.n??300);i++){const c=el('circle',{cx:R()*W*1.6-W*.3,cy:R()*H*1.4-H*.2,r:R()<.9?.9+R()*2.4:3+R()*2.8,fill:starCols[R()*starCols.length|0]},g);st.push([c,R()*6,.8+R()*2.4])}
  for(let i=0;i<(o.g??7);i++){const x=R()*W,y=R()*H*.85,cols=[CY,WARM,PINK][i%3];gl.push([glint(g,x,y,1.6+R()*2.8,cols),x,y,i])}
  return t=>{st.forEach(([c,ph,f])=>c.setAttribute('opacity',(.45+.55*Math.abs(Math.sin(t*f+ph))).toFixed(2)));
    gl.forEach(([n,x,y,i])=>n.setAttribute('transform',`translate(${x},${y}) rotate(${Math.sin(t*.6+i)*8}) scale(${.8+.3*Math.abs(Math.sin(t*1.7+i*2))})`))}}

function momo(parent,P={}){
  const root=el('g',{},parent), shadowG=el('g',{},root), pose=el('g',{},root), idle=el('g',{},pose);
  const C=Object.assign({body:'#FF6B45',shade:'#D42A5E',light:'#FFC08A',rim:'#FFE0A8',limb:'#E0405E',eye:'#1B0B4A',iris:'#3A1FB0',shoe:'#3A22C9',helmet:true,cap:false,cup:false},P);
  const gnd=ao(shadowG,0,112,70,.5);
  const hotGlow=el('g',{opacity:0},idle);glow(hotGlow,0,0,60,WARM);
  let pack=null;if(C.helmet){pack=el('g',{},idle);box3d(pack,-66,-40,132,96,14,{front:'#5B4BE0',top:'#8C7BFF',side:'#3A22A0',r:18});
    [-50,50].forEach(x=>{shaded(pack,{d:rrect(x-11,-58,22,70,11),cx:x,cy:-23,r:30,base:'#C9C0FF',shade:'#6B5BD6',light:'#fff',spec:true})});}
  const tube=(w,col)=>[el('path',{fill:'none',stroke:mix(col,'#1A0040',.35),'stroke-width':w,'stroke-linecap':'round'},idle),el('path',{fill:'none',stroke:col,'stroke-width':w*.62,'stroke-linecap':'round'},idle),el('path',{fill:'none',stroke:mix(col,'#fff',.45),'stroke-width':w*.2,'stroke-linecap':'round',opacity:.8},idle)];
  const setTube=(T,d,dx=-2,dy=-2)=>{T[0].setAttribute('d',d);T[1].setAttribute('d',d);T[1].setAttribute('transform',`translate(${dx*.5},${dy*.5})`);T[2].setAttribute('d',d);T[2].setAttribute('transform',`translate(${dx*1.3},${dy*1.3})`)};
  const legs=[0,1].map(()=>tube(16,C.limb));
  const shoes=[0,1].map(i=>{const g=el('g',{},idle);shaded(g,{d:'M-20,0 C-20,-16 20,-16 22,0 C24,10 -20,10 -20,0Z',cx:0,cy:-3,r:20,base:C.shoe,shade:mix(C.shoe,'#000',.4),light:mix(C.shoe,'#fff',.45)});el('path',{d:'M-18,4 L22,4',stroke:'#fff','stroke-width':3,opacity:.7,'stroke-linecap':'round'},g);return g});
  const arms=[0,1].map(()=>tube(15,C.limb));
  const hands=[0,1].map(()=>{const g=el('g',{},idle);shaded(g,{d:circ(0,0,13),cx:0,cy:0,r:13,base:C.body,shade:C.shade,light:C.light});return g});
  const ant=tube(9,C.limb);
  const bulbG=el('g',{},idle); glow(bulbG,0,0,9,CY);
  const body=el('g',{},idle);
  const d='M0,-78C46,-78 72,-40 74,4C76,52 44,78 0,78C-44,78 -76,52 -74,4C-72,-40 -46,-78 0,-78Z';
  shaded(body,{d,cx:0,cy:0,r:78,base:C.body,shade:C.shade,light:C.light,rim:C.rim,tex:9,seed:11,spec:false});
  shaded(body,{d:'M0,14 C30,14 42,34 40,52 C38,70 20,76 0,76 C-20,76 -38,70 -40,52 C-42,34 -30,14 0,14Z',cx:0,cy:46,r:40,base:mix(C.light,C.body,.35),shade:mix(C.body,C.light,.3),light:mix(C.light,'#fff',.4),spec:false});
  const eyes=el('g',{},body), pup=[], brows=[];
  [-27,27].forEach(x=>{const ec=id('ec');el('circle',{cx:x,cy:-16,r:24},el('clipPath',{id:ec},defs));const E1=el('g',{'clip-path':`url(#${ec})`},eyes);
    el('circle',{cx:x,cy:-16,r:24,fill:'#fff'},E1);el('circle',{cx:x+3,cy:-10,r:24,fill:'#DCD6FF'},E1);el('circle',{cx:x-2,cy:-19,r:22,fill:'#fff'},E1);
    const p=el('g',{},E1);el('circle',{cx:x,cy:-16,r:14,fill:C.iris},p);el('circle',{cx:x+1,cy:-14,r:10,fill:C.eye},p);el('circle',{cx:x-5,cy:-22,r:5,fill:'#fff'},p);el('circle',{cx:x+5,cy:-9,r:2.4,fill:'#fff',opacity:.8},p);pup.push(p);
    el('circle',{cx:x,cy:-16,r:24,fill:'none',stroke:mix(C.shade,'#000',.2),'stroke-width':2.5,opacity:.35},eyes);
    brows.push(el('path',{d:`M${x-12},-50 Q${x},-58 ${x+12},-50`,fill:'none',stroke:mix(C.shade,'#000',.3),'stroke-width':5,'stroke-linecap':'round'},body))});
  el('ellipse',{cx:-48,cy:10,rx:12,ry:7,fill:'#FF3D7F',opacity:.5},body);el('ellipse',{cx:48,cy:10,rx:12,ry:7,fill:'#FF3D7F',opacity:.5},body);
  [-52,-46,-40].forEach((x,i)=>el('circle',{cx:x,cy:4+(i%2)*4,r:1.6,fill:'#fff',opacity:.6},body));
  const mouth=el('path',{d:'M-11,14 Q0,26 11,14 Q0,19 -11,14Z',fill:'#7A1240',stroke:C.eye,'stroke-width':3,'stroke-linejoin':'round'},body);
  el('ellipse',{cx:0,cy:-74,rx:20,ry:6,fill:mix(C.light,'#fff',.4),opacity:.5},body);
  const hot=el('path',{d,fill:'#FFF3C4',opacity:0},idle);
  if(C.cap){const cg=el('g',{transform:'translate(0,-74) rotate(-6)'},idle);shaded(cg,{d:'M-34,-6 L34,-6 L30,12 L-30,12Z',cx:0,cy:3,r:34,base:'#2A1670',shade:'#120840',light:'#4B36D6',spec:false});el('path',{d:'M0,-30 L70,-12 L0,6 L-70,-12Z',fill:'#3A22A0'},cg);el('path',{d:'M0,-34 L70,-16 L0,2 L-70,-16Z',fill:'#5536C9'},cg);el('path',{d:'M0,-30 L40,-20 L0,-10 L-40,-20Z',fill:'#7C62FF',opacity:.6},cg);
    el('path',{d:'M0,-16 Q40,-10 52,20',fill:'none',stroke:'#FFCB22','stroke-width':4,'stroke-linecap':'round'},cg);el('path',{d:rrect(46,18,12,18,5),fill:'#FFCB22'},cg);el('circle',{cx:0,cy:-16,r:5,fill:'#FFCB22'},cg)}
  let cup=null;if(C.cup){cup=el('g',{},idle);shaded(cup,{d:'M-16,-22 L16,-22 L13,18 L-13,18Z',cx:0,cy:-2,r:20,base:'#F4F1FF',shade:'#B9B0F0',light:'#fff',spec:false});el('path',{d:'M-15,-8 L15,-8 L14,6 L-14,6Z',fill:'#C2501A'},cup);el('path',{d:'M-14,-6 L14,-6',stroke:'#FF8A3D','stroke-width':2},cup);
    box3d(cup,-19,-30,38,9,6,{front:'#3A2AB0',top:'#6B5BFF',side:'#22167A',r:4});
    cup.steam=[0,1].map(i=>el('path',{fill:'none',stroke:'#fff','stroke-width':4,'stroke-linecap':'round',opacity:.6},cup))}
  const sweat=el('g',{opacity:0,transform:'translate(62,-44)'},idle);shaded(sweat,{d:'M0,-14 C8,-2 10,6 0,10 C-10,6 -8,-2 0,-14Z',cx:0,cy:0,r:10,base:'#7FE9FF',shade:'#2E9BFF',light:'#fff'});
  const helmet=el('g',{},idle);
  if(C.helmet){const hg=id('hg');const rg=el('radialGradient',{id:hg,cx:.35,cy:.3,r:.8},defs);[[0,'#E8FFFF',.22],[.6,'#9EFAFF',.08],[.9,'#59D0FF',.18],[1,'#BFF8FF',.45]].forEach(([o,c,op])=>el('stop',{offset:o,'stop-color':c,'stop-opacity':op},rg));
    el('circle',{cx:0,cy:-4,r:112,fill:`url(#${hg})`},helmet);
    el('circle',{cx:0,cy:-4,r:112,fill:'none',stroke:'#BFF8FF','stroke-width':4,opacity:.6},helmet);
    el('path',{d:'M-84,-52 A100,100 0 0,1 -30,-100',fill:'none',stroke:'#fff','stroke-width':10,'stroke-linecap':'round',opacity:.8},helmet);
    el('path',{d:'M-96,-10 A100,100 0 0,1 -92,-36',fill:'none',stroke:'#fff','stroke-width':6,'stroke-linecap':'round',opacity:.6},helmet);
    el('path',{d:'M72,56 A100,100 0 0,1 40,86',fill:'none',stroke:'#fff','stroke-width':5,'stroke-linecap':'round',opacity:.35},helmet);
    el('circle',{cx:-18,cy:-104,r:5,fill:'#fff',opacity:.8},helmet);
    box3d(helmet,-78,84,156,20,8,{front:'#C9C0FF',top:'#EDE8FF',side:'#7C6BE0',r:10});rivets(helmet,[[-58,94],[-20,94],[20,94],[58,94]],'#fff',3.5,.8)}
  const o={root,pose,idle,helmet,eyes,mouth,brows,wave:0,look:[0,0],space:true,energy:0,sweat:0,shrug:0};
  o.update=(t,ph=0)=>{
    const bob=Math.sin(t*2.1+ph)*6, sway=Math.sin(t*1.3+ph)*3;
    idle.setAttribute('transform',`translate(0,${o.space?bob:0}) rotate(${o.space?sway:sway*.4})`);
    shadowG.setAttribute('opacity',o.space?0:1);
    [[-66,12],[66,12]].forEach((s,i)=>{const sgn=i?1:-1;let a=(i?20:160)+Math.sin(t*2.4+ph+i)*8;
      if(i===1&&o.wave>0)a=-60+Math.sin(t*14)*28*o.wave+(1-o.wave)*80;
      if(o.shrug>0)a=lerp(a,i?-25:205,o.shrug);
      if(i===1&&C.cup)a=lerp(a,-10,1);
      const rad=a*Math.PI/180,L=58,hx=s[0]+Math.cos(rad)*L,hy=s[1]+Math.sin(rad)*L,mx=s[0]+Math.cos(rad)*L*.5+sgn*8,my=s[1]+Math.sin(rad)*L*.5+10;
      setTube(arms[i],`M${s[0]},${s[1]}Q${mx},${my} ${hx},${hy}`);hands[i].setAttribute('transform',`translate(${hx},${hy})`);
      if(i===1&&cup){cup.setAttribute('transform',`translate(${hx+4},${hy-14})`);cup.steam.forEach((p,k)=>{const x=-6+k*12,w=Math.sin(t*3+k)*6;p.setAttribute('d',`M${x},-38 q${w},-14 0,-26 q${-w},-12 0,-24`);p.setAttribute('opacity',(.35+.25*Math.sin(t*2+k)).toFixed(2))})}});
    [-28,28].forEach((x,i)=>{const k=o.space?Math.sin(t*1.9+ph+i*1.7)*14:0,fx=x+k+(i?6:-6),fy=o.space?108:100;setTube(legs[i],`M${x},62 Q${x+k*.3},86 ${fx},${fy}`);shoes[i].setAttribute('transform',`translate(${fx+(i?6:-6)},${fy+4}) rotate(${o.space?k*.8:0}) scale(${i?1:-1},1)`)});
    const tip=[Math.sin(t*2.7+ph)*14-6,-150+Math.cos(t*2.7+ph)*4];
    setTube(ant,`M0,-76 Q${tip[0]*.2-10},-118 ${tip[0]},${tip[1]}`);bulbG.setAttribute('transform',`translate(${tip[0]},${tip[1]}) scale(${1+Math.sin(t*5)*.12})`);
    const blink=((t+ph)%3.3)<.13?.1:1;eyes.setAttribute('transform',`translate(0,-16) scale(1,${blink}) translate(0,16)`);
    pup.forEach(p=>p.setAttribute('transform',`translate(${o.look[0]},${o.look[1]})`));
    const bu=o.sweat*4+Math.sin(t*1.1+ph)*1.5;brows.forEach((b,i)=>b.setAttribute('transform',`translate(0,${-bu}) rotate(${(i?1:-1)*o.sweat*12} ${i?27:-27} -52)`));
    hot.setAttribute('opacity',(o.energy*.95).toFixed(3));hotGlow.setAttribute('opacity',o.energy.toFixed(3));
    hotGlow.setAttribute('transform',`scale(${1+o.energy*1.6+Math.sin(t*9)*.05*o.energy})`);
    sweat.setAttribute('opacity',o.sweat.toFixed(2));
  };
  return o}
