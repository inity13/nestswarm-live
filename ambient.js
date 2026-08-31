// NESTSWARM · Ambient — an interactive full-screen "watch the swarm work" page.
// Reads live.json, animates the brain, and lets you inspect agents/nodes: click
// any agent or service node for an info card, hover to highlight its connections,
// pause the flow, and tune intensity. Reflects REAL activity, not theatre.
const NODES = [
  { id: 'vault',     label: 'Vault',   color: '#7b5cff', icon: '▣' },
  { id: 'github',    label: 'GitHub',  color: '#37d39b', icon: '◈' },
  { id: 'internet',  label: 'Internet',color: '#00e5ff', icon: '◍' },
  { id: 'models',    label: 'Models',  color: '#ffb454', icon: '◈' },
  { id: 'telegram',  label: 'Telegram',color: '#2dd4bf', icon: '✈' },
  { id: 'payments',  label: 'Payments',color: '#ff2ec4', icon: '$' },
  { id: 'mcp',       label: 'MCP',     color: '#a3e635', icon: '⌘' }
];
const NODE_DESC = {
  vault: 'Obsidian knowledge vault — products, research, decisions, brand assets.',
  github: 'Private product repos + the public passive site (nestswarm-live).',
  internet: 'Web research, GitHub trending scans, bounty discovery.',
  models: 'Model routing — deepseek-pro → free Zen → local (OOM-safe ladder).',
  telegram: 'Owner notifications + remote control.',
  payments: 'Stripe checkout + self-hosted x402 crypto invoices.',
  mcp: 'MCP endpoint so external agents can discover & drive the swarm.'
};
const NAME_TO_ROLE = {
  Guinan:'ideator', Spock:'architect', Scotty:'coder', Monica:'designer', Chandler:'publisher',
  Data:'critic', Worf:'polisher', Seven:'researcher', Joey:'marketer', Picard:'conductor',
  Quark:'scout', Sentinel:'security', LaForge:'distributor', "O'Brien":'launcher', Hoshi:'github_researcher',
  Neelix:'finops', Nog:'payment_integrator', Tasha:'compliance'
};
const STATIONS = {
  ideator:'Signal Hearth', architect:'Navigation Lattice', coder:'Engine Room', designer:'Interface Deck',
  publisher:'Transmission Desk', critic:'Calibration Bay', polisher:'Shield Watch', researcher:'Observatory',
  marketer:'Signal Relay', conductor:'Bridge', scout:'Opportunity Scanner', security:'Airlock',
  distributor:'Distribution Array', launcher:'Dockmaster', github_researcher:'Archive Relay',
  finops:'Ledger Room', payment_integrator:'Payment Gateway', compliance:'Airlock (Policy)'
};
const ROLE_SERVICES = {
  ideator:['vault','models'], architect:['vault','models'], coder:['github','vault'],
  designer:['vault'], publisher:['payments','github'], critic:['vault'], polisher:['github','vault'],
  researcher:['internet','models'], marketer:['telegram','internet'], conductor:['vault','models','telegram'],
  scout:['internet','models'], security:['vault'], distributor:['github','payments'],
  launcher:['github','payments','telegram'], github_researcher:['github','internet'],
  finops:['payments','vault'], payment_integrator:['payments'], compliance:['vault']
};
const TYPES = { listed:'#37d39b', polished:'#2dd4bf', building:'#00e5ff', ideated:'#b98cff', test:'#22d3ee',
  security:'#ff5c7a', launch:'#ff2ec4', meeting:'#7b5cff', scout:'#a3e635', trending:'#ffb454',
  vault:'#7b5cff', bench:'#facc15', cap:'#facc15', chat:'', event:'#5f7194' };

let data = { stats:{}, agents:[], chat:[], events:[], building:[], products:[], recent:[] };
function $(s){ return document.querySelector(s); }
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* ---------- interaction state ---------- */
let paused = false, pausedAt = 0, intensity = 1, hover = null;
let mouse = { x: 0, y: 0 };
const hit = { agents: [], nodes: [] };  // last-frame positions for click/hover

async function load() {
  try { const r = await fetch('live.json?t=' + Date.now()); data = await r.json(); } catch {}
  $('#status').textContent = (data.status || '…') + ' · ' + (data.stats.products||0) + ' products · ' + (data.stats.listed||0) + ' listed';
  buildFeed();
}

/* ---------- ribbon ---------- */
let feed = [];
function buildFeed() {
  const conv = (data.chat||[]).map(m => ({ who:m.who, text:m.text, t:m.t, color: (data.agents||[]).find(a=>a.name===m.who)?.color || '#5f7194', type:m.system?'system':'chat' }));
  const evs = (data.events||[]).map(m => ({ who:'swarm', text:m.text, t:m.t, color: TYPES[m.type]||'#5f7194', type:m.type||'event' }));
  const live = (data.recent||[]).map(m => ({ who:m.who, text:m.text, t:m.t, color: (data.agents||[]).find(a=>a.name===m.who)?.color || TYPES[m.type] || '#5f7194', type:m.type }));
  feed = (live.length ? live : conv.concat(evs)).sort((a,b)=>(b.t||0)-(a.t||0)).slice(0,40);
}
let ribbonIdx = 0;
setInterval(() => {
  if (!feed.length || paused) return;
  const m = feed[ribbonIdx % Math.min(feed.length, 20)];
  ribbonIdx = (ribbonIdx + 1) % Math.min(feed.length, 20);
  $('#who').textContent = m.who + (m.type && m.type !== 'chat' && m.type !== 'system' ? ' · ' + m.type : '');
  $('#who').style.color = m.color;
  $('#txt').textContent = m.text;
  $('#meta').textContent = (m.type && m.type !== 'chat' ? 'activity' : 'agent') + ' · ' + new Date(m.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}, 3500);

/* ---------- info card ---------- */
function showInfo(html, x, y) {
  const el = $('#info');
  el.innerHTML = '<span class="i-close">✕</span>' + html;
  el.style.display = 'block';
  const w = Math.min(el.offsetWidth, innerWidth - 16);
  el.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px';
  el.style.top = Math.max(8, Math.min(innerHeight - el.offsetHeight - 8, y)) + 'px';
  el.querySelector('.i-close').onclick = hideInfo;
}
function hideInfo() { $('#info').style.display = 'none'; }

function agentInfo(a) {
  const role = NAME_TO_ROLE[a.name] || '';
  const station = STATIONS[role] || '';
  const lines = (data.chat||[]).filter(m => !m.system && m.who === a.name).slice(0, 3)
    .map(m => `· ${m.text.slice(0, 90)}`).join('<br>');
  return `<div class="i-name" style="color:${a.color}">${esc(a.name)}</div>` +
    `<div class="i-role">${role}${a.active ? ' · ACTIVE' : ''}</div>` +
    `<div class="i-station">◆ ${station}</div>` +
    `<div class="i-body">${a.last && a.last.text ? esc(a.last.text) : 'no recent transmission'}</div>` +
    (lines ? `<div class="i-line">${lines}</div>` : '');
}
function nodeInfo(n) {
  const mention = (data.recent||[]).filter(m => m.text.toLowerCase().includes(n.id)).slice(0, 3)
    .map(m => `· ${m.text.slice(0, 80)}`).join('<br>');
  return `<div class="i-name" style="color:${n.color}">${n.icon} ${esc(n.label)}</div>` +
    `<div class="i-body">${esc(NODE_DESC[n.id] || '')}</div>` +
    (mention ? `<div class="i-line">recent flow:${'<br>'}${mention}</div>` : '');
}

/* ---------- brain ---------- */
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
  function spawn(a,b,color,sp){ particles.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,t:0,sp:(sp||(0.5+Math.random()*0.9))*intensity,color}); }
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
  function loop(now){
    ctx.clearRect(0,0,w,h);
    const t = paused ? pausedAt : now;
    const lay = L(t);
    const cx=lay.cx, cy=lay.cy, agents=data.agents||[];
    hit.agents = []; hit.nodes = [];

    const bg = ctx.createRadialGradient(cx,cy,0,cx,cy,lay.m*0.7);
    bg.addColorStop(0,'rgba(123,92,255,.10)'); bg.addColorStop(0.5,'rgba(0,229,255,.05)'); bg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);

    if (!paused) dust.forEach(d=>{ d.y -= d.sp*60*intensity; if(d.y<0) d.y=1; const x=d.x*w, y=d.y*h; ctx.fillStyle=hexA('#00e5ff', 0.10+0.06*Math.sin(d.ph+now/1000)); ctx.beginPath(); ctx.arc(x,y,d.r,0,Math.PI*2); ctx.fill(); });

    const pulse = 1 + Math.sin(now/400)*0.12;
    for (let i=3;i>=0;i--) {
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,lay.core*(i*6+8)*pulse);
      g.addColorStop(0, hexA('#00e5ff', 0.10/(i+1))); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,lay.core*(i*6+8)*pulse,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#9be9ff'; ctx.shadowBlur=34; ctx.shadowColor='#00e5ff';
    ctx.beginPath(); ctx.arc(cx,cy,lay.core,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(214,228,255,.8)'; ctx.textAlign='center'; ctx.font='12px ui-monospace,Menlo,monospace';
    ctx.fillText('SWARM CORE', cx, cy+lay.core+18);

    [[lay.agentR,'rgba(0,229,255,.06)'],[lay.nodeR,'rgba(123,92,255,.08)']].forEach(([r,col])=>{
      ctx.strokeStyle=col; ctx.beginPath(); ctx.ellipse(cx,cy,r,r,0,0,Math.PI*2); ctx.stroke();
    });

    NODES.forEach((n)=>{
      const p = nodePos(n.id,t,lay);
      hit.nodes.push({ id:n.id, label:n.label, color:n.color, icon:n.icon, x:p.x, y:p.y });
      const hl = hover && hover.type==='node' && hover.id===n.id;
      ctx.strokeStyle=hexA(n.color, hl?0.5:0.10); ctx.lineWidth = hl?1.5:1; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p.x,p.y); ctx.stroke();
      ctx.fillStyle=n.color; ctx.shadowBlur= hl?32:20; ctx.shadowColor=n.color;
      ctx.beginPath(); ctx.arc(p.x,p.y, hl?9:7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#030409'; ctx.font='8px monospace'; ctx.textAlign='center';
      ctx.fillText(n.icon, p.x, p.y+3);
      ctx.fillStyle=hexA(n.color,0.85); ctx.font=lay.fnode+'px ui-monospace,Menlo,monospace';
      ctx.fillText(n.label, p.x, p.y + (p.y>cy?22:-14));
      ambient++; if(!paused && ambient%Math.max(2, Math.floor(24-(agents.length*0.4)))===0) spawn({x:cx,y:cy}, p, n.color);
    });

    agents.forEach((a,i)=>{
      const p = agentPos(i,t,lay);
      hit.agents.push({ name:a.name, color:a.color, role:NAME_TO_ROLE[a.name]||'', x:p.x, y:p.y, active:a.active, last:a.last });
      const role = NAME_TO_ROLE[a.name]||'coder';
      const hl = hover && hover.type==='agent' && hover.name===a.name;
      (ROLE_SERVICES[role]||['vault']).forEach(sid=>{
        const sp = nodePos(sid,t,lay);
        ctx.strokeStyle=hexA(a.color, hl?0.4:0.12); ctx.lineWidth= hl?1.4:0.7; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(sp.x,sp.y); ctx.stroke();
        if(!paused && a.active && Math.random()>0.96) spawn(p,sp,a.color,1.2);
      });
      const r = a.active ? 6.5 : 4.5;
      ctx.fillStyle=a.color; ctx.shadowBlur= (a.active||hl)?26:10; ctx.shadowColor=a.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      if(a.active){ ctx.strokeStyle=hexA(a.color,0.6); ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(p.x,p.y,r+4+Math.sin(now/280)*2,0,Math.PI*2); ctx.stroke(); if(!paused) burst(p); }
      if(lay.fagent>0){ ctx.fillStyle=hexA(a.color, a.active?1:0.55); ctx.font='9px ui-monospace,Menlo,monospace'; ctx.textAlign='center'; ctx.fillText(a.name, p.x, p.y+(p.y>cy?16:-11)); }

      if (a.active && a.last && a.last.text) {
        const age = Date.now() - a.last.t;
        const alpha = Math.max(0.25, Math.min(1, 1 - age / 90000));
        const raw = String(a.last.text);
        const label = raw.length > 44 ? raw.slice(0, 44) + '…' : raw;
        ctx.font = '10px ui-monospace,Menlo,monospace';
        const wl = ctx.measureText(label).width + 16, hl2 = 18;
        const lx = Math.max(6, Math.min(w - wl - 6, p.x - wl / 2));
        const ly = Math.max(6, Math.min(h - hl2 - 6, p.y < cy ? p.y + 20 : p.y - 38));
        ctx.fillStyle = hexA('#04060c', 0.88 * alpha); ctx.strokeStyle = hexA(a.color, 0.75 * alpha); ctx.lineWidth = 1;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(lx, ly, wl, hl2, 6); else ctx.rect(lx, ly, wl, hl2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = hexA(a.color, alpha); ctx.textAlign = 'left'; ctx.fillText(label, lx + 8, ly + 13);
      }
    });

    const recent=(data.chat||[]).filter(m=>!m.system).map(m=>m.who).filter(w=>agents.find(a=>a.name===w)).slice(0,6);
    for(let i=0;i<recent.length-1;i++){
      const A=agents.findIndex(a=>a.name===recent[i]), B=agents.findIndex(a=>a.name===recent[i+1]);
      if(A<0||B<0||A===B) continue;
      const pa=agentPos(A,t,lay), pb=agentPos(B,t,lay);
      ctx.strokeStyle=hexA(agents[A].color,0.28); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
      if(!paused && Math.random()>0.97) spawn(pa,pb,'#ffffff',1.4);
    }

    if (!paused) {
      for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.t+=p.sp/50; if(p.t>=1){particles.splice(i,1);continue;} const x=p.ax+(p.bx-p.ax)*p.t, y=p.ay+(p.by-p.ay)*p.t; ctx.fillStyle=hexA(p.color, Math.sin(p.t*Math.PI)); ctx.beginPath(); ctx.arc(x,y,1.7,0,Math.PI*2); ctx.fill(); }
      for(let i=bursts.length-1;i>=0;i--){ const b=bursts[i]; b.life-=0.03; b.x+=b.vx; b.y+=b.vy; if(b.life<=0){bursts.splice(i,1);continue;} ctx.fillStyle=hexA(b.color,b.life); ctx.beginPath(); ctx.arc(b.x,b.y,1.6*b.life,0,Math.PI*2); ctx.fill(); }
    }

    // hover highlight ring
    if (hover) {
      ctx.strokeStyle = hexA(hover.color, 0.8); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hover.x, hover.y, hover.r + 6, 0, Math.PI*2); ctx.stroke();
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ---------- pointer + controls ---------- */
function pick(x, y) {
  const near = (px, py) => Math.hypot(px - x, py - y) < 22;
  for (const a of hit.agents) if (near(a.x, a.y)) return { type: 'agent', ...a, r: 6 };
  for (const n of hit.nodes) if (near(n.x, n.y)) return { type: 'node', ...n, r: 8 };
  return null;
}
const c = $('#c');
c.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
c.addEventListener('click', (e) => {
  const p = pick(e.clientX, e.clientY);
  if (p) {
    hideInfo();
    const html = p.type === 'agent' ? agentInfo(p) : nodeInfo(p);
    showInfo(html, e.clientX + 12, e.clientY + 12);
  } else {
    hideInfo();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  if (e.code === 'Escape') hideInfo();
});

function setHover() {
  const p = pick(mouse.x, mouse.y);
  hover = p;
  c.style.cursor = p ? 'pointer' : 'default';
}
setInterval(setHover, 120);

function togglePause() {
  paused = !paused;
  if (paused) pausedAt = performance.now();
  $('#pauseBtn').textContent = paused ? '▶' : '❚❚';
}
$('#pauseBtn').addEventListener('click', togglePause);
$('#intensity').addEventListener('input', (e) => { intensity = parseFloat(e.target.value); });
$('#ribbon').addEventListener('click', () => {
  if (!feed.length) return;
  const m = feed[ribbonIdx % Math.min(feed.length, 20)];
  const color = m.color || '#5f7194';
  showInfo(`<div class="i-name" style="color:${color}">${esc(m.who)}</div><div class="i-body">${esc(m.text)}</div>`, innerWidth/2 - 160, innerHeight - 200);
});

load();
setInterval(load, 30000);
brain();
