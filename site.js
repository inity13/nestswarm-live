// NESTSWARM · Live Brain — passive public visualization.
// A pulsing core connected to service nodes (Vault, GitHub, Internet, Models,
// Telegram, Payments, MCP) and orbiting agents. Agents link to the services they
// use; activity flows as particles along those edges. Mobile-responsive.
const NODES = [
  { id: 'vault',     label: 'Obsidian Vault', short: 'Vault',   color: '#7b5cff', icon: '▣' },
  { id: 'github',    label: 'GitHub',         short: 'GitHub',  color: '#37d39b', icon: '◈' },
  { id: 'internet',  label: 'Internet',       short: 'Web',     color: '#00e5ff', icon: '◍' },
  { id: 'models',    label: 'Models',         short: 'Models',  color: '#ffb454', icon: '◈' },
  { id: 'telegram',  label: 'Telegram',       short: 'TG',      color: '#2dd4bf', icon: '✈' },
  { id: 'payments',  label: 'Payments',       short: 'Pay',     color: '#ff2ec4', icon: '$' },
  { id: 'mcp',       label: 'MCP',            short: 'MCP',     color: '#a3e635', icon: '⌘' }
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

const TYPES = {
  listed:'#37d39b', polished:'#2dd4bf', building:'#00e5ff', ideated:'#b98cff', test:'#22d3ee',
  security:'#ff5c7a', launch:'#ff2ec4', meeting:'#7b5cff', scout:'#a3e635', trending:'#ffb454',
  vault:'#7b5cff', bench:'#facc15', cap:'#facc15', chat:'', event:'#5f7194'
};

let data = { stats:{}, agents:[], chat:[], products:[], building:[], nodes:NODES.map(n=>n.id) };

function $(s){ return document.querySelector(s); }
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

async function load() {
  try { const r = await fetch('live.json?t=' + Date.now()); data = await r.json(); } catch {}
  render();
  if (window.__brain) window.__brain.reindex();
}

function render() {
  const st = data.stats || {};
  $('#sProducts').textContent = st.products ?? 0;
  $('#sListed').textContent = st.listed ?? 0;
  $('#sAgents').textContent = st.agents ?? 0;
  $('#sScore').textContent = st.avgScore ?? '-';
  const pill = $('#pill');
  pill.textContent = (data.status || 'idle');
  pill.className = 'pill ' + (data.status === 'running' ? 'running' : data.status);

  // node legend with agent→service connection hints
  const nodesEl = $('#nodes'); nodesEl.innerHTML = '';
  (data.nodes || NODES.map(n=>n.id)).forEach((nid) => {
    const n = NODES.find(x=>x.id===nid) || { label:nid, color:'#5f7194', icon:'•' };
    const el = document.createElement('span'); el.className='node';
    el.innerHTML = `<i style="background:${n.color};color:${n.color}">${n.icon}</i>${esc(n.label)}`;
    nodesEl.appendChild(el);
  });

  // chat — real agent conversation (chat bubbles)
  const chatEl = $('#chat'); chatEl.innerHTML = '';
  (data.chat || []).slice(0, 120).forEach((m) => {
    const d = document.createElement('div');
    d.className = 'msg ' + (m.system ? 'system' : 'agent');
    if (m.system) {
      d.innerHTML = `<div class="sys-line">${esc(m.text)}</div>`;
    } else {
      const role = NAME_TO_ROLE[m.who] || '';
      const color = (data.agents||[]).find(a=>a.name===m.who)?.color || '#5f7194';
      const time = m.t ? new Date(m.t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
      d.innerHTML =
        `<div class="ava" style="background:${color};color:#04060c">${esc((m.who||'?')[0])}</div>` +
        `<div class="body">` +
          `<div class="meta"><span class="who" style="color:${color}">${esc(m.who)}</span>${role ? `<span class="role">${role}</span>` : ''}<span class="t">${time}</span></div>` +
          `<div class="txt">${esc(m.text)}</div>` +
        `</div>`;
    }
    chatEl.appendChild(d);
  });
  if (!chatEl.children.length) chatEl.innerHTML = '<div class="msg system"><div class="sys-line">No conversation yet — agents convene when building & reviewing products.</div></div>';

  // events — compact activity stream
  const evEl = $('#events'); evEl.innerHTML = '';
  (data.events || []).forEach((m) => {
    const d = document.createElement('div'); d.className='ev';
    const c = TYPES[m.type] || '#5f7194';
    d.innerHTML = `<i style="background:${c};box-shadow:0 0 6px ${c}"></i><span>${esc(m.text)}</span>`;
    evEl.appendChild(d);
  });
  if (!evEl.children.length) evEl.innerHTML = '<div class="ev"><span>idle…</span></div>';

  // now building / recent output
  const b = $('#building'); b.innerHTML = '';
  (data.building || []).forEach((p) => {
    const d = document.createElement('div'); d.className='build';
    const stage = p.stage || p.status || '';
    d.innerHTML = `<div class="nm">${esc(p.name)}</div><div class="meta">${esc(p.niche||'')} · <span class="stg">${esc(stage)}</span></div><div class="bar"><i></i></div>`;
    b.appendChild(d);
  });
  if (!b.children.length) b.innerHTML = '<div class="msg"><div class="txt">Idle — between ideas.</div></div>';

  // capabilities showcase (passive)
  const capsEl = $('#caps');
  if (capsEl) {
    capsEl.innerHTML = '';
    (data.capabilities || []).forEach((c) => {
      const d = document.createElement('div'); d.className='cap';
      d.innerHTML = `<b>${esc(c.name)}</b><span>${esc(c.desc)}</span>`;
      capsEl.appendChild(d);
    });
  }

  const tk = $('#ticker'); tk.innerHTML = '';
  const items = (data.products || []).map(p=>`${esc(p.name)} — ${esc(p.niche||'')} · ${esc(p.status)}`).join('  ✦  ');
  tk.innerHTML = items ? (items + '  ✦  ' + items) : 'no products yet';
  $('#updated').textContent = data.generated ? 'updated ' + new Date(data.generated).toLocaleTimeString() : '';
}

// ---------------- brain canvas ----------------
function brain() {
  const c = $('#brain'); const ctx = c.getContext('2d');
  let w,h;
  const particles = [];
  const bursts = [];

  function resize(){ w=c.width=innerWidth; h=c.height=innerHeight; }
  resize(); addEventListener('resize', resize);

  function layout() {
    const small = innerWidth < 768;
    const m = Math.min(w, h);
    const cx = small ? w/2 : w*0.60, cy = h/2;
    return {
      small, cx, cy, m,
      nodeR: small ? Math.max(m*0.30, 120) : m*0.36,
      agentR: small ? Math.max(m*0.17, 70) : m*0.22,
      coreR: small ? 14 : 22,
      fname: small ? 0 : 10,
      fnode: small ? 8 : 11,
      showAgentNames: !small
    };
  }

  function nodePos(id, t, L) {
    const i = NODES.findIndex(n=>n.id===id);
    const ang = (i / NODES.length) * Math.PI*2 + t*0.00006;
    return { x: L.cx + Math.cos(ang)*L.nodeR, y: L.cy + Math.sin(ang)*L.nodeR };
  }
  function agentPos(i, t, L) {
    const list = data.agents || [];
    const ang = (i / Math.max(list.length,1)) * Math.PI*2 + t*0.00028;
    return { x: L.cx + Math.cos(ang)*L.agentR, y: L.cy + Math.sin(ang)*L.agentR };
  }

  function spawnParticle(a, b, color, sp) {
    particles.push({ ax:a.x, ay:a.y, bx:b.x, by:b.y, t:0, sp: sp||(0.6+Math.random()*0.9), color });
  }
  function spawnBurst(p) {
    for (let i=0;i<5;i++) {
      const ang = Math.random()*Math.PI*2;
      bursts.push({ x:p.x, y:p.y, vx:Math.cos(ang)*(0.4+Math.random()*1.2), vy:Math.sin(ang)*(0.4+Math.random()*1.2), life:1, color:p.color });
    }
  }

  // draw a connection line (edge) with a gradient
  function edge(a, b, color, alpha, width) {
    ctx.strokeStyle = color.replace('$A', alpha);
    ctx.lineWidth = width||1;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }
  function hexA(h,a){ const n=parseInt(h.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }

  let ambient = 0;
  function loop(t) {
    ctx.clearRect(0,0,w,h);
    const L = layout();
    const cx=L.cx, cy=L.cy;
    const agents = data.agents || [];

    // core
    const pulse = 1 + Math.sin(t/380)*0.12;
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,(L.m*0.16)*pulse);
    g.addColorStop(0,'rgba(0,229,255,.28)'); g.addColorStop(1,'rgba(0,229,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,(L.m*0.16)*pulse,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,229,255,.95)'; ctx.shadowBlur=30; ctx.shadowColor='#00e5ff';
    ctx.beginPath(); ctx.arc(cx,cy,L.coreR,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(214,228,255,.75)'; ctx.textAlign='center'; ctx.font='11px ui-monospace,Menlo,monospace';
    ctx.fillText('SWARM CORE', cx, cy + L.coreR + 16);

    // service nodes + core<->service edges
    NODES.forEach((n) => {
      const p = nodePos(n.id, t, L);
      edge({x:cx,y:cy}, p, 'rgba(0,229,255,$A)', 0.10, 1);
      ctx.strokeStyle='rgba(0,229,255,.05)';
      ctx.beginPath(); ctx.ellipse(cx,cy,L.nodeR,L.nodeR,0,0,Math.PI*2); ctx.stroke();

      ctx.fillStyle=n.color; ctx.shadowBlur=16; ctx.shadowColor=n.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      // icon
      ctx.fillStyle='#04060c'; ctx.textAlign='center'; ctx.font='7px monospace';
      ctx.fillText(n.icon, p.x, p.y+2.5);
      ctx.fillStyle=hexA(n.color,0.75); ctx.font=(L.fnode)+'px ui-monospace,Menlo,monospace';
      ctx.fillText(L.small ? n.short : n.label, p.x, p.y + (p.y>cy?20:-12));

      // ambient particles core<->service
      ambient++;
      if (ambient % Math.max(3, Math.floor(26 - agents.length)) === 0) spawnParticle({x:cx,y:cy}, p, n.color);
    });

    // agents + their service edges
    agents.forEach((a, i) => {
      const p = agentPos(i, t, L);
      const role = NAME_TO_ROLE[a.name] || 'coder';
      const svcs = ROLE_SERVICES[role] || ['vault'];
      // edges to services
      svcs.forEach((sid) => {
        const sp = nodePos(sid, t, L);
        edge(p, sp, hexA(a.color,0.16), 0.16, 0.7);
        if (a.active && Math.random() > 0.96) spawnParticle(p, sp, a.color, 1.2);
      });
      // edge to core
      edge(p, {x:cx,y:cy}, hexA(a.color,0.20), 0.20, 0.8);

      const r = a.active ? 6 : 4;
      ctx.fillStyle=a.color; ctx.shadowBlur= a.active?22:9; ctx.shadowColor=a.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      if (a.active) {
        ctx.strokeStyle=hexA(a.color,0.7); ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.arc(p.x,p.y,r+4 + Math.sin(t/300)*2,0,Math.PI*2); ctx.stroke();
        spawnBurst(p);
      }
      if (L.showAgentNames) {
        ctx.fillStyle=hexA(a.color, a.active?1:0.6); ctx.textAlign='center'; ctx.font='9px ui-monospace,Menlo,monospace';
        ctx.fillText(a.name, p.x, p.y + (p.y>cy?16:-11));
      }
    });

    // conversation edges between recent speakers
    const recent = (data.chat||[]).filter(m=>!m.system).map(m=>m.who).filter(w=>agents.find(a=>a.name===w)).slice(0,6);
    for (let i=0;i<recent.length-1;i++) {
      const A = agents.findIndex(a=>a.name===recent[i]);
      const B = agents.findIndex(a=>a.name===recent[i+1]);
      if (A<0||B<0||A===B) continue;
      const pa = agentPos(A,t,L), pb = agentPos(B,t,L);
      edge(pa, pb, hexA(agents[A].color,0.35), 0.35, 1.1);
      if (Math.random()>0.97) spawnParticle(pa, pb, '#ffffff', 1.4);
    }

    // particles
    for (let i=particles.length-1;i>=0;i--) {
      const p=particles[i]; p.t += p.sp/50;
      if (p.t>=1) { particles.splice(i,1); continue; }
      const x=p.ax+(p.bx-p.ax)*p.t, y=p.ay+(p.by-p.ay)*p.t;
      ctx.fillStyle = hexA(p.color, Math.sin(p.t*Math.PI));
      ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill();
    }
    // bursts
    for (let i=bursts.length-1;i>=0;i--) {
      const b=bursts[i]; b.life-=0.03; b.x+=b.vx; b.y+=b.vy;
      if (b.life<=0){ bursts.splice(i,1); continue; }
      ctx.fillStyle=hexA(b.color, b.life);
      ctx.beginPath(); ctx.arc(b.x,b.y,1.5*b.life,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.__brain = { reindex: () => {} };
}

setInterval(()=>{ $('#clock').textContent = new Date().toLocaleTimeString(); }, 1000);
load();
setInterval(load, 30000);
brain();
