// NESTSWARM · Live Brain — fully passive public visualization.
// Reads live.json (a sanitized snapshot) and animates the swarm as a brain
// with a pulsing core connected to its nodes, flowing particles, and chat.
const COLORS = ['#6c8cff','#37d39b','#ffb454','#ff6bd0','#b98cff','#ff8f6b','#ff6b6b','#2dd4bf','#f472b6','#facc15','#a3e635','#22d3ee','#00e5ff','#7b5cff','#ffb454'];

const NODES = [
  { id: 'vault', label: 'Obsidian Vault', color: '#7b5cff' },
  { id: 'github', label: 'GitHub', color: '#37d39b' },
  { id: 'internet', label: 'Internet', color: '#00e5ff' },
  { id: 'models', label: 'Models', color: '#ffb454' },
  { id: 'telegram', label: 'Telegram', color: '#2dd4bf' },
  { id: 'payments', label: 'Payments', color: '#ff2ec4' },
  { id: 'mcp', label: 'MCP', color: '#a3e635' }
];

let data = { stats:{}, agents:[], chat:[], products:[], building:[], nodes:NODES.map(n=>n.id) };

async function load() {
  try {
    const r = await fetch('live.json?t=' + Date.now());
    data = await r.json();
  } catch {}
  render();
}

function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function render() {
  const st = data.stats || {};
  $('#sProducts').textContent = st.products ?? 0;
  $('#sListed').textContent = st.listed ?? 0;
  $('#sAgents').textContent = st.agents ?? 0;
  $('#sScore').textContent = st.avgScore ?? '-';
  const pill = $('#pill');
  pill.textContent = (data.status || 'idle');
  pill.className = 'pill ' + (data.status === 'running' ? 'running' : data.status);

  // node legend
  const nodesEl = $('#nodes'); nodesEl.innerHTML = '';
  (data.nodes || NODES.map(n=>n.id)).forEach((nid) => {
    const n = NODES.find(x=>x.id===nid) || { label:nid, color:'#5f7194' };
    const el = document.createElement('span'); el.className='node';
    el.innerHTML = `<i style="background:${n.color};color:${n.color}"></i>${esc(n.label)}`;
    nodesEl.appendChild(el);
  });

  const TYPES = {
  listed:'#37d39b', polished:'#2dd4bf', building:'#00e5ff', ideated:'#b98cff', test:'#22d3ee',
  security:'#ff5c7a', launch:'#ff2ec4', meeting:'#7b5cff', scout:'#a3e635', trending:'#ffb454',
  vault:'#7b5cff', bench:'#facc15', cap:'#facc15', chat:'', event:'#5f7194'
};

// chat
  const chatEl = $('#chat'); chatEl.innerHTML = '';
  (data.chat || []).slice(0, 150).forEach((m) => {
    const d = document.createElement('div'); d.className='msg ' + (m.system ? 'system':'');
    const a = (data.agents || []).find(x=>x.name===m.who);
    const color = a ? a.color : (m.type && TYPES[m.type] ? TYPES[m.type] : '#5f7194');
    const time = m.t ? new Date(m.t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
    const badge = m.type && m.type !== 'chat' ? `<span class="badge" style="color:${TYPES[m.type]||'#5f7194'};border-color:${TYPES[m.type]||'#5f7194'}">${m.type}</span>` : '';
    d.innerHTML = `<div><span class="who" style="color:${color}">${esc(m.who)}</span>${badge}<span class="t">${time}</span></div><div class="txt">${esc(m.text)}</div>`;
    chatEl.appendChild(d);
  });
  if (!chatEl.children.length) chatEl.innerHTML = '<div class="msg system"><div class="txt">Awaiting first transmissions…</div></div>';

  // now building
  const b = $('#building'); b.innerHTML = '';
  (data.building || []).forEach((p) => {
    const d = document.createElement('div'); d.className='build';
    d.innerHTML = `<div class="nm">${esc(p.name)}</div><div class="meta">${esc(p.niche||'')} · ${esc(p.stage||p.status||'')}</div><div class="bar"><i></i></div>`;
    b.appendChild(d);
  });
  if (!b.children.length) b.innerHTML = '<div class="msg"><div class="txt">Idle — between ideas.</div></div>';

  // ticker
  const tk = $('#ticker'); tk.innerHTML = '';
  const items = (data.products || []).map(p=>`${esc(p.name)} — ${esc(p.niche||'')} · ${esc(p.status)}`).join('  ✦  ');
  tk.innerHTML = items ? (items + '  ✦  ' + items) : 'no products yet';
  $('#updated').textContent = data.generated ? 'updated ' + new Date(data.generated).toLocaleTimeString() : '';
}

function $(s){ return document.querySelector(s); }

// ------- brain canvas -------
function brain() {
  const c = $('#brain'); const ctx = c.getContext('2d');
  let w,h, cx, cy;
  const agents = data.agents || [];
  const agPos = [];
  function resize(){ w=c.width=innerWidth; h=c.height=innerHeight; cx=w*0.62; cy=h*0.5; }
  resize(); addEventListener('resize', resize);

  const particles = [];
  function spawn(from, to) {
    particles.push({ fx:from.x, fy:from.y, tx:to.x, ty:to.y, t:0, sp:0.5+Math.random()*0.8, color:to.color });
  }

  function nodePos(i, t) {
    const ang = (i / NODES.length) * Math.PI*2 + t*0.00008;
    return { x: cx + Math.cos(ang)*Math.min(w,h)*0.30, y: cy + Math.sin(ang)*Math.min(w,h)*0.30, color: NODES[i].color };
  }
  function agPos(i, t) {
    const ang = (i / Math.max(agents.length,1)) * Math.PI*2 + t*0.0005;
    const r = Math.min(w,h)*0.13;
    return { x: cx + Math.cos(ang)*r, y: cy + Math.sin(ang)*r, color: agents[i].color };
  }

  let spawnAcc = 0;
  function loop(t) {
    ctx.clearRect(0,0,w,h);

    // core glow
    const pulse = 1 + Math.sin(t/380)*0.12;
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,90*pulse);
    g.addColorStop(0,'rgba(0,229,255,.25)'); g.addColorStop(1,'rgba(0,229,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,90*pulse,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,229,255,.9)'; ctx.shadowBlur=30; ctx.shadowColor='#00e5ff';
    ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(214,228,255,.7)'; ctx.font='11px ui-monospace,Menlo,monospace'; ctx.textAlign='center';
    ctx.fillText('SWARM CORE', cx, cy+28);

    // nodes
    NODES.forEach((n,i) => {
      const p = nodePos(i,t);
      ctx.strokeStyle='rgba(0,229,255,.06)';
      ctx.beginPath(); ctx.ellipse(cx,cy,Math.min(w,h)*0.30,Math.min(w,h)*0.30,0,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle=n.color; ctx.shadowBlur=16; ctx.shadowColor=n.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='rgba(214,228,255,.6)'; ctx.font='10px ui-monospace,Menlo,monospace';
      ctx.fillText(n.label, p.x, p.y + (p.y>cy?20:-12));
      // spawn particles periodically
      spawnAcc++;
      if (spawnAcc % 24 === 0) spawn({x:cx,y:cy,color:'#00e5ff'}, p);
    });

    // agents orbit + active flash
    agents.forEach((a,i) => {
      const p = agPos(i,t);
      const active = a.active;
      ctx.fillStyle=a.color; ctx.shadowBlur= active?22:8; ctx.shadowColor=a.color;
      ctx.beginPath(); ctx.arc(p.x,p.y, active?6:4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      if (active) { ctx.strokeStyle=a.color+'88'; ctx.beginPath(); ctx.arc(p.x,p.y,10,0,Math.PI*2); ctx.stroke(); }
    });

    // particles
    for (let i=particles.length-1;i>=0;i--) {
      const p=particles[i]; p.t += p.sp/60;
      if (p.t>=1) { particles.splice(i,1); continue; }
      const x=p.fx+(p.tx-p.fx)*p.t, y=p.fy+(p.ty-p.fy)*p.t;
      const al = Math.sin(p.t*Math.PI);
      ctx.fillStyle = 'rgba(' + hex(p.color) + ',' + al.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
function hex(h){ const n=parseInt(h.slice(1),16); return ((n>>16)&255)+','+((n>>8)&255)+','+(n&255); }

// clock
setInterval(()=>{ $('#clock').textContent = new Date().toLocaleTimeString(); }, 1000);

load();
setInterval(load, 30000);
brain();
