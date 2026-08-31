// NESTSWARM · Ambient — a full-screen, purely visual "watch the swarm work" page.
// Reads live.json and animates the swarm as an organic brain: a pulsing core,
// orbiting service nodes, agents drifting with their service connections, flowing
// particles, activity bursts, and a bottom ribbon cycling live transmissions.
const NODES = [
  { id: 'vault',     label: 'Vault',   color: '#7b5cff', icon: '▣' },
  { id: 'github',    label: 'GitHub',  color: '#37d39b', icon: '◈' },
  { id: 'internet',  label: 'Internet',color: '#00e5ff', icon: '◍' },
  { id: 'models',    label: 'Models',  color: '#ffb454', icon: '◈' },
  { id: 'telegram',  label: 'Telegram',color: '#2dd4bf', icon: '✈' },
  { id: 'payments',  label: 'Payments',color: '#ff2ec4', icon: '$' },
  { id: 'mcp',       label: 'MCP',     color: '#a3e635', icon: '⌘' }
];

const NAME_TO_ROLE = {
  Guinan:'ideator', Spock:'architect', Scotty:'coder', Monica:'designer', Chandler:'publisher',
  Data:'critic', Worf:'polisher', Seven:'researcher', Joey:'marketer', Picard:'conductor',
  Quark:'scout', Sentinel:'security', LaForge:'distributor', "O'Brien":'launcher', Hoshi:'github_researcher'
};
const ROLE_SERVICES = {
  ideator:['vault','models'], architect:['vault','models'], coder:['github','vault'],
  designer:['vault'], publisher:['payments','github'], critic:['vault'], polisher:['github','vault'],
  researcher:['internet','models'], marketer:['telegram','internet'], conductor:['vault','models','telegram'],
  scout:['internet','models'], security:['vault'], distributor:['github','payments'],
  launcher:['github','payments','telegram'], github_researcher:['github','internet']
};
const TYPES = { listed:'#37d39b', polished:'#2dd4bf', building:'#00e5ff', ideated:'#b98cff', test:'#22d3ee',
  security:'#ff5c7a', launch:'#ff2ec4', meeting:'#7b5cff', scout:'#a3e635', trending:'#ffb454',
  vault:'#7b5cff', bench:'#facc15', cap:'#facc15', chat:'', event:'#5f7194' };

let data = { stats:{}, agents:[], chat:[], events:[], building:[], products:[] };
function $(s){ return document.querySelector(s); }
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

async function load() {
  try { const r = await fetch('live.json?t=' + Date.now()); data = await r.json(); } catch {}
  $('#status').textContent = (data.status || '…') + ' · ' + (data.stats.products||0) + ' products · ' + (data.stats.listed||0) + ' listed';
  buildFeed();
}

// merge conversation + events into one chronological feed for the ribbon
let feed = [];
function buildFeed() {
  const conv = (data.chat||[]).map(m => ({ who:m.who, text:m.text, t:m.t, color: (data.agents||[]).find(a=>a.name===m.who)?.color || '#5f7194', type:m.system?'system':'chat' }));
  const evs = (data.events||[]).map(m => ({ who:'swarm', text:m.text, t:m.t, color: TYPES[m.type]||'#5f7194', type:m.type||'event' }));
  // Prefer the live window (last 90s) if there is recent activity, else full feed.
  const live = (data.recent||[]).map(m => ({ who:m.who, text:m.text, t:m.t, color: (data.agents||[]).find(a=>a.name===m.who)?.color || TYPES[m.type] || '#5f7194', type:m.type }));
  feed = (live.length ? live : conv.concat(evs)).sort((a,b)=>(b.t||0)-(a.t||0)).slice(0,40);
}
let ribbonIdx = 0;
setInterval(() => {
  if (!feed.length) return;
  // cycle newest → oldest in order, so the ribbon reads like a live transcript
  const m = feed[ribbonIdx % Math.min(feed.length, 20)];
  ribbonIdx = (ribbonIdx + 1) % Math.min(feed.length, 20);
  $('#who').textContent = m.who + (m.type && m.type !== 'chat' && m.type !== 'system' ? ' · ' + m.type : '');
  $('#who').style.color = m.color;
  $('#txt').textContent = m.text;
  $('#meta').textContent = (m.type && m.type !== 'chat' ? 'activity' : 'agent') + ' · ' + new Date(m.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}, 3500);

// ---------------- cinematic brain ----------------
function brain() {
  const c = $('#c'); const ctx = c.getContext('2d');
  let w,h;
  function resize(){ w=c.width=innerWidth; h=c.height=innerHeight; }
  resize(); addEventListener('resize', resize);

  const particles = [];
  const bursts = [];
  const dust = [];
  for (let i=0;i<70;i++) dust.push({ x:Math.random(), y:Math.random(), r:Math.random()*1.4+0.4, sp:Math.random()*0.0004+0.0001, ph:Math.random()*Math.PI*2 });

  function hexA(h,a){ if(!h) return 'rgba(120,130,160,'+a+')'; const n=parseInt(h.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
  function spawn(a,b,color,sp){ particles.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,t:0,sp:sp||(0.5+Math.random()*0.9),color}); }
  function burst(p){ for(let i=0;i<6;i++){ const a=Math.random()*Math.PI*2; bursts.push({x:p.x,y:p.y,vx:Math.cos(a)*(0.4+Math.random()*1.3),vy:Math.sin(a)*(0.4+Math.random()*1.3),life:1,color:p.color}); } }

  function L(t){
    const small = innerWidth < 768;
    const m = Math.min(w,h);
    return { cx:w/2, cy:h/2, m, small,
      nodeR: m*0.36, agentR: m*0.21,
      fnode: small?9:13, fagent: small?0:10, core: small?15:22, rot: t*0.00005 };
  }
  function nodePos(id,t,lay){ const i=NODES.findIndex(n=>n.id===id); const a=(i/NODES.length)*Math.PI*2 + lay.rot; return { x:lay.cx+Math.cos(a)*lay.nodeR, y:lay.cy+Math.sin(a)*lay.nodeR }; }
  function agentPos(i,t,lay){ const list=data.agents||[]; const a=(i/Math.max(list.length,1))*Math.PI*2 - lay.rot*2.2; return { x:lay.cx+Math.cos(a)*lay.agentR, y:lay.cy+Math.sin(a)*lay.agentR }; }

  let ambient=0;
  function loop(t){
    ctx.clearRect(0,0,w,h);
    const lay = L(t);
    const cx=lay.cx, cy=lay.cy, agents=data.agents||[];

    // deep space gradient
    const bg = ctx.createRadialGradient(cx,cy,0,cx,cy,lay.m*0.7);
    bg.addColorStop(0,'rgba(123,92,255,.10)'); bg.addColorStop(0.5,'rgba(0,229,255,.05)'); bg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);

    // dust field
    dust.forEach(d=>{ d.y -= d.sp*60; if(d.y<0) d.y=1; const x=d.x*w, y=d.y*h; ctx.fillStyle=hexA('#00e5ff', 0.10+0.06*Math.sin(d.ph+t/1000)); ctx.beginPath(); ctx.arc(x,y,d.r,0,Math.PI*2); ctx.fill(); });

    // core
    const pulse = 1 + Math.sin(t/400)*0.12;
    for (let i=3;i>=0;i--) {
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,lay.core*(i*6+8)*pulse);
      g.addColorStop(0, hexA('#00e5ff', 0.10/(i+1))); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,lay.core*(i*6+8)*pulse,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#9be9ff'; ctx.shadowBlur=34; ctx.shadowColor='#00e5ff';
    ctx.beginPath(); ctx.arc(cx,cy,lay.core,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(214,228,255,.8)'; ctx.textAlign='center'; ctx.font='12px ui-monospace,Menlo,monospace';
    ctx.fillText('SWARM CORE', cx, cy+lay.core+18);

    // orbit rings
    [[lay.agentR,'rgba(0,229,255,.06)'],[lay.nodeR,'rgba(123,92,255,.08)']].forEach(([r,col])=>{
      ctx.strokeStyle=col; ctx.beginPath(); ctx.ellipse(cx,cy,r,r,0,0,Math.PI*2); ctx.stroke();
    });

    // service nodes
    NODES.forEach((n)=>{
      const p = nodePos(n.id,t,lay);
      ctx.strokeStyle=hexA(n.color,0.10); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p.x,p.y); ctx.stroke();
      ctx.fillStyle=n.color; ctx.shadowBlur=20; ctx.shadowColor=n.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#030409'; ctx.font='8px monospace'; ctx.textAlign='center';
      ctx.fillText(n.icon, p.x, p.y+3);
      ctx.fillStyle=hexA(n.color,0.85); ctx.font=lay.fnode+'px ui-monospace,Menlo,monospace';
      ctx.fillText(n.label, p.x, p.y + (p.y>cy?22:-14));
      ambient++; if(ambient%Math.max(2, Math.floor(24-(agents.length*0.4)))===0) spawn({x:cx,y:cy}, p, n.color);
    });

    // agents + connections
    agents.forEach((a,i)=>{
      const p = agentPos(i,t,lay);
      const role = NAME_TO_ROLE[a.name]||'coder';
      (ROLE_SERVICES[role]||['vault']).forEach(sid=>{
        const sp = nodePos(sid,t,lay);
        ctx.strokeStyle=hexA(a.color,0.12); ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(sp.x,sp.y); ctx.stroke();
        if(a.active && Math.random()>0.96) spawn(p,sp,a.color,1.2);
      });
      const r = a.active ? 6.5 : 4.5;
      ctx.fillStyle=a.color; ctx.shadowBlur= a.active?24:10; ctx.shadowColor=a.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      if(a.active){ ctx.strokeStyle=hexA(a.color,0.6); ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(p.x,p.y,r+4+Math.sin(t/280)*2,0,Math.PI*2); ctx.stroke(); burst(p); }
      if(lay.fagent>0){ ctx.fillStyle=hexA(a.color, a.active?1:0.55); ctx.font='9px ui-monospace,Menlo,monospace'; ctx.textAlign='center'; ctx.fillText(a.name, p.x, p.y+(p.y>cy?16:-11)); }

      // live activity speech label — the agent's ACTUAL recent message, so the
      // animation reflects real work instead of theatre.
      if (a.active && a.last && a.last.text) {
        const age = Date.now() - a.last.t;
        const alpha = Math.max(0.25, Math.min(1, 1 - age / 90000));
        const raw = String(a.last.text);
        const label = raw.length > 44 ? raw.slice(0, 44) + '…' : raw;
        ctx.font = '10px ui-monospace,Menlo,monospace';
        const wl = ctx.measureText(label).width + 16;
        const hl = 18;
        const bx = p.x - wl / 2;
        const by = p.y < cy ? p.y + 20 : p.y - 38;
        const lx = Math.max(6, Math.min(w - wl - 6, bx));
        const ly = Math.max(6, Math.min(h - hl - 6, by));
        ctx.fillStyle = hexA('#04060c', 0.88 * alpha);
        ctx.strokeStyle = hexA(a.color, 0.75 * alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lx, ly, wl, hl, 6); else ctx.rect(lx, ly, wl, hl);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = hexA(a.color, alpha);
        ctx.textAlign = 'left';
        ctx.fillText(label, lx + 8, ly + 13);
      }
    });

    // conversation edges
    const recent=(data.chat||[]).filter(m=>!m.system).map(m=>m.who).filter(w=>agents.find(a=>a.name===w)).slice(0,6);
    for(let i=0;i<recent.length-1;i++){
      const A=agents.findIndex(a=>a.name===recent[i]), B=agents.findIndex(a=>a.name===recent[i+1]);
      if(A<0||B<0||A===B) continue;
      const pa=agentPos(A,t,lay), pb=agentPos(B,t,lay);
      ctx.strokeStyle=hexA(agents[A].color,0.28); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
      if(Math.random()>0.97) spawn(pa,pb,'#ffffff',1.4);
    }

    // particles
    for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.t+=p.sp/50; if(p.t>=1){particles.splice(i,1);continue;} const x=p.ax+(p.bx-p.ax)*p.t, y=p.ay+(p.by-p.ay)*p.t; ctx.fillStyle=hexA(p.color, Math.sin(p.t*Math.PI)); ctx.beginPath(); ctx.arc(x,y,1.7,0,Math.PI*2); ctx.fill(); }
    // bursts
    for(let i=bursts.length-1;i>=0;i--){ const b=bursts[i]; b.life-=0.03; b.x+=b.vx; b.y+=b.vy; if(b.life<=0){bursts.splice(i,1);continue;} ctx.fillStyle=hexA(b.color,b.life); ctx.beginPath(); ctx.arc(b.x,b.y,1.6*b.life,0,Math.PI*2); ctx.fill(); }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

load();
setInterval(load, 30000);
brain();
