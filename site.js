// NEST CONCORD · Live Brain — interactive public visualization.
// A pulsing SWARM CORE ringed by service nodes (Vault, GitHub, Internet, Models,
// Telegram, Payments, MCP) + a live COMPUTE FLEET node (owned GPUs), with orbiting
// agents you can click/tap to inspect what each is doing right now. Fully passive:
// this page reflects real activity but cannot control the swarm.

const NODES = [
  { id: 'vault',     label: 'Vault',    short: 'Vault',  color: '#7b5cff', icon: '▣' },
  { id: 'github',    label: 'GitHub',   short: 'GitHub', color: '#37d39b', icon: '◈' },
  { id: 'internet',  label: 'Internet', short: 'Web',    color: '#00e5ff', icon: '◍' },
  { id: 'models',    label: 'Models',   short: 'Models', color: '#ffb454', icon: '◈' },
  { id: 'telegram',  label: 'Telegram', short: 'TG',     color: '#2dd4bf', icon: '✈' },
  { id: 'payments',  label: 'Payments', short: 'Pay',    color: '#ff2ec4', icon: '$' },
  { id: 'mcp',       label: 'MCP',      short: 'MCP',    color: '#a3e635', icon: '⌘' },
  // Compute fleet — owned GPU nodes. Rendered only when fleet data is present.
  { id: 'compute',   label: 'Compute',  short: 'GPU',    color: '#f472b6', icon: '⚡', fleet: true }
];
const NODE_DESC = {
  vault: 'Obsidian knowledge vault — products, research, decisions, brand assets.',
  github: 'Private product repos + this public passive site (nestswarm-live).',
  internet: 'Web research, GitHub trending scans, bounty discovery.',
  models: 'Free-first model routing — free providers → owned GPU nodes → local Ollama → paid reserved for extreme cases.',
  telegram: 'Owner notifications + remote control.',
  payments: 'Stripe checkout + self-hosted crypto invoices.',
  mcp: 'MCP endpoint so external agents can discover & drive the swarm.',
  compute: 'Owned GPU compute fleet — the swarm offloads its thinking to its own hardware first.'
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
  ideator:['vault','models'], architect:['vault','models'], coder:['github','vault','compute'],
  designer:['vault'], publisher:['payments','github'], critic:['vault'], polisher:['github','vault'],
  researcher:['internet','models'], marketer:['telegram','internet'], conductor:['vault','models','telegram'],
  scout:['internet','models'], security:['vault'], distributor:['github','payments'],
  launcher:['github','payments','telegram'], github_researcher:['github','internet'],
  finops:['payments','vault'], payment_integrator:['payments'], compliance:['vault']
};
const TYPES = {
  listed:'#37d39b', polished:'#2dd4bf', building:'#00e5ff', ideated:'#b98cff', test:'#22d3ee',
  security:'#ff5c7a', launch:'#ff2ec4', meeting:'#7b5cff', scout:'#a3e635', trending:'#ffb454',
  vault:'#7b5cff', bench:'#facc15', cap:'#facc15', chat:'', event:'#5f7194'
};

let data = { stats:{}, agents:[], chat:[], events:[], building:[], products:[], recent:[], fleet:null };

function $(s){ return document.querySelector(s); }
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function relTime(t){
  if (!t) return '';
  const s = Math.max(0, Math.floor((Date.now() - t)/1000));
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s/60) + 'm';
  if (s < 86400) return Math.floor(s/3600) + 'h';
  return Math.floor(s/86400) + 'd';
}
// Which service-node ids are actually live right now (compute only if fleet online).
function activeNodeIds(){
  const ids = NODES.filter(n => !n.fleet).map(n => n.id);
  if (data.fleet && data.fleet.online > 0) ids.push('compute');
  return ids;
}

/* ---------- interaction state ---------- */
let paused = false, pausedAt = 0, intensity = 1, hover = null;
let mouse = { x: 0, y: 0 };
const hit = { agents: [], nodes: [] };
const avatarImgs = {};

async function load() {
  try { const r = await fetch('live.json?t=' + Date.now()); data = await r.json(); } catch {}
  loadAvatars();
  render();
  buildFeed();
}

function loadAvatars() {
  (data.agents || []).forEach((a) => {
    if (!a.avatar || avatarImgs[a.name]) return;
    const img = new Image(); img.src = a.avatar; avatarImgs[a.name] = img;
  });
}

/* ---------- dashboard panels ---------- */
function render() {
  const st = data.stats || {};
  animateNum($('#sProducts'), st.products ?? 0);
  animateNum($('#sListed'), st.listed ?? 0);
  animateNum($('#sAgents'), st.agents ?? 0);
  const scoreEl = $('#sScore');
  const scoreTxt = st.avgScore ?? '-';
  if (scoreTxt !== '-' && !isNaN(scoreTxt)) animateNum(scoreEl, parseFloat(scoreTxt)); else scoreEl.textContent = scoreTxt;

  const pill = $('#pill');
  pill.textContent = (data.status || 'idle');
  pill.className = 'pill ' + (data.status === 'running' ? 'running' : data.status);

  // mission banner
  const mEl = $('#mission'), mText = $('#missionText');
  const mt = data.meeting;
  if (mt && (mt.direction || mt.priority)) {
    mEl.style.display = '';
    mText.textContent = `mission: ${mt.direction || ''}${mt.priority ? ' · priority: ' + mt.priority : ''}`;
  } else { mEl.style.display = 'none'; }

  // ledger
  const led = data.ledger || {};
  animateNum($('#lgRevenue'), led.revenue ?? 0);
  animateNum($('#lgEffects'), led.effects ?? 0);
  animateNum($('#lgBoundary'), led.boundary ?? 0);

  renderFleet(data.fleet);

  // featured
  const fe = $('#featured');
  const best = (data.products || []).filter((p) => p.status === 'listed').sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  fe.innerHTML = best
    ? `<div class="ft-score" style="color:${best.score >= 7 ? '#37d39b' : best.score >= 5 ? '#00e5ff' : '#ffb454'}">${best.score ?? '-'}</div>` +
      `<div class="ft-body"><div class="ft-name">${esc(best.name)}</div><div class="ft-meta">${esc(best.niche || '')} · $${best.price || 0}</div></div>`
    : '<div class="ft-empty">no listed product yet</div>';

  // chat
  const chatEl = $('#chat'); chatEl.innerHTML = '';
  (data.chat || []).slice(0, 120).forEach((m) => {
    const d = document.createElement('div');
    d.className = 'msg ' + (m.system ? 'system' : 'agent');
    if (m.system) {
      d.innerHTML = `<div class="sys-line">${esc(m.text)}</div>`;
    } else {
      const role = NAME_TO_ROLE[m.who] || '';
      const agent = (data.agents || []).find(a => a.name === m.who);
      const color = agent?.color || '#5f7194';
      const ava = agent && agent.avatar
        ? `<img class="ava" src="${agent.avatar}" alt="${esc(m.who)}">`
        : `<div class="ava" style="background:${color};color:#04060c">${esc((m.who || '?')[0])}</div>`;
      d.innerHTML = `${ava}<div class="body">` +
        `<div class="meta"><span class="who" style="color:${color}">${esc(m.who)}</span>${role ? `<span class="role">${role}</span>` : ''}<span class="t">${relTime(m.t)}</span></div>` +
        `<div class="txt">${esc(m.text)}</div></div>`;
    }
    chatEl.appendChild(d);
  });
  if (!chatEl.children.length) chatEl.innerHTML = '<div class="msg system"><div class="sys-line">No conversation yet — agents convene when building &amp; reviewing products.</div></div>';

  // events
  const evEl = $('#events'); evEl.innerHTML = '';
  (data.events || []).forEach((m) => {
    const d = document.createElement('div'); d.className = 'ev';
    const c = TYPES[m.type] || '#5f7194';
    d.innerHTML = `<i style="background:${c};box-shadow:0 0 6px ${c}"></i><span>${esc(m.text)}</span>`;
    evEl.appendChild(d);
  });
  if (!evEl.children.length) evEl.innerHTML = '<div class="ev"><span>idle…</span></div>';

  // building
  const b = $('#building'); b.innerHTML = '';
  (data.building || []).forEach((p) => {
    const d = document.createElement('div'); d.className = 'build';
    const stage = p.stage || p.status || '';
    d.innerHTML = `<div class="nm">${esc(p.name)}</div><div class="meta">${esc(p.niche || '')} · <span class="stg">${esc(stage)}</span></div><div class="bar"><i></i></div>`;
    b.appendChild(d);
  });
  if (!b.children.length) b.innerHTML = '<div class="build"><div class="meta">Idle — between ideas.</div></div>';

  // capabilities
  const capsEl = $('#caps');
  if (capsEl) {
    capsEl.innerHTML = '';
    (data.capabilities || []).forEach((c) => {
      const d = document.createElement('div'); d.className = 'cap';
      d.innerHTML = `<b>${esc(c.name)}</b><span>${esc(c.desc)}</span>`;
      capsEl.appendChild(d);
    });
    if (!capsEl.children.length) capsEl.innerHTML = '<div class="cap"><span>scanning…</span></div>';
  }

  $('#updated').textContent = data.generated ? 'updated ' + new Date(data.generated).toLocaleTimeString() : '';
}

// Sanitized compute-fleet panel (aliases only — no ips/hosts/tokens).
function renderFleet(fleet) {
  const panel = $('#fleetPanel'), el = $('#fleet');
  if (!fleet || !fleet.total) { if (panel) panel.style.display = 'none'; return; }
  panel.style.display = '';
  const dot = (s) => s === 'online' ? '#37d39b' : (s === 'degraded' ? '#ffb454' : '#ff6b6b');
  const nodes = (fleet.nodes || []).map((n) => {
    const state = n.busy ? '▶ working' : (n.warm ? '◉ warm' : 'idle');
    return `<div class="flnode">
       <span class="fldot" style="background:${dot(n.status)}"></span>
       <b>${esc(n.alias)}</b>
       <span class="flgpu">${esc(n.gpu || 'GPU')}${n.vramGb ? ' · ' + n.vramGb + 'GB' : ''}${n.vramPct != null ? ' · ' + n.vramPct + '% vram' : ''}</span>
       <span class="flstate">${state}</span>
     </div>`;
  }).join('');
  el.innerHTML =
    `<div class="flhead">
       <span>${fleet.online}/${fleet.total} online</span>
       <span class="flpct">${fleet.selfHostedInferencePct}% self-hosted</span>
     </div>
     <div class="flbar"><i style="width:${fleet.selfHostedInferencePct}%"></i></div>
     ${nodes}`;
}

function animateNum(el, val) {
  if (!el) return;
  const cur = parseFloat(String(el.textContent).replace(/[^0-9.\-]/g, '')) || 0;
  const dollar = String(el.textContent).trim().startsWith('$');
  if (cur === val) { el.textContent = (dollar ? '$' : '') + val; return; }
  el.classList.add('bump');
  const start = performance.now(), dur = 500;
  (function step(now) {
    const k = Math.min(1, (now - start) / dur);
    const v = cur + (val - cur) * (1 - Math.pow(1 - k, 3));
    el.textContent = (dollar ? '$' : '') + (Number.isInteger(val) ? Math.round(v) : v.toFixed(1));
    if (k < 1) requestAnimationFrame(step); else setTimeout(() => el.classList.remove('bump'), 200);
  })(performance.now());
}

/* ---------- ribbon (rotating transmissions) ---------- */
let feed = [], ribbonIdx = 0;
function buildFeed() {
  const conv = (data.chat || []).filter(m => !m.system).map(m => ({ who: m.who, text: m.text, t: m.t, color: (data.agents || []).find(a => a.name === m.who)?.color || '#5f7194', type: 'chat' }));
  const live = (data.recent || []).map(m => ({ who: m.who, text: m.text, t: m.t, color: (data.agents || []).find(a => a.name === m.who)?.color || TYPES[m.type] || '#5f7194', type: m.type }));
  feed = (live.length ? live : conv).sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 40);
}
setInterval(() => {
  if (!feed.length || paused) return;
  const m = feed[ribbonIdx % Math.min(feed.length, 20)];
  ribbonIdx = (ribbonIdx + 1) % Math.min(feed.length, 20);
  $('#rbWho').textContent = m.who + (m.type && m.type !== 'chat' ? ' · ' + m.type : '');
  $('#rbWho').style.color = m.color;
  $('#rbTxt').textContent = m.text;
  $('#rbMeta').textContent = (m.type && m.type !== 'chat' ? 'activity' : 'agent') + ' · ' + new Date(m.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const lines = (data.chat || []).filter(m => !m.system && m.who === a.name).slice(0, 3)
    .map(m => `· ${esc(m.text.slice(0, 90))}`).join('<br>');
  const av = a.avatar ? `<img class="i-avatar" src="${a.avatar}" alt="">` : '';
  return `${av}<div class="i-name" style="color:${a.color}">${esc(a.name)}</div>` +
    `<div class="i-role">${role}${a.active ? ' · ACTIVE' : ''}</div>` +
    `<div class="i-station">◆ ${station}</div>` +
    `<div class="i-body">${a.last && a.last.text ? esc(a.last.text) : 'no recent transmission'}</div>` +
    (lines ? `<div class="i-line">${lines}</div>` : '');
}
function nodeInfo(n) {
  if (n.id === 'compute' && data.fleet) {
    const f = data.fleet;
    const rows = (f.nodes || []).map(x => `· ${esc(x.alias)} — ${esc(x.gpu || 'GPU')}${x.vramGb ? ' ' + x.vramGb + 'GB' : ''} · ${x.status}${x.busy ? ' · working' : (x.warm ? ' · warm' : '')}`).join('<br>');
    return `<div class="i-name" style="color:${n.color}">${n.icon} Compute Fleet</div>` +
      `<div class="i-role">${f.online}/${f.total} online · ${f.selfHostedInferencePct}% self-hosted inference</div>` +
      `<div class="i-body">${esc(NODE_DESC.compute)}</div>` +
      (rows ? `<div class="i-line">${rows}</div>` : '');
  }
  const mention = (data.recent || []).filter(m => (m.text || '').toLowerCase().includes(n.id)).slice(0, 3)
    .map(m => `· ${esc(m.text.slice(0, 80))}`).join('<br>');
  return `<div class="i-name" style="color:${n.color}">${n.icon} ${esc(n.label)}</div>` +
    `<div class="i-body">${esc(NODE_DESC[n.id] || '')}</div>` +
    (mention ? `<div class="i-line">recent flow:<br>${mention}</div>` : '');
}

/* ---------- brain canvas ---------- */
function brain() {
  const c = $('#brain'); const ctx = c.getContext('2d');
  let w, h;
  function resize() { w = c.width = c.parentElement.clientWidth; h = c.height = c.parentElement.clientHeight; }
  resize(); addEventListener('resize', resize);

  const particles = [], bursts = [], dust = [];
  for (let i = 0; i < 60; i++) dust.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4, sp: Math.random() * 0.0004 + 0.0001, ph: Math.random() * Math.PI * 2 });

  function hexA(hx, a) { if (!hx) return 'rgba(120,130,160,' + a + ')'; const n = parseInt(hx.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function spawn(a, b, color, sp) { particles.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, t: 0, sp: (sp || (0.5 + Math.random() * 0.9)) * intensity, color }); }
  function burst(p) { for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; bursts.push({ x: p.x, y: p.y, vx: Math.cos(a) * (0.4 + Math.random() * 1.3), vy: Math.sin(a) * (0.4 + Math.random() * 1.3), life: 1, color: p.color }); } }

  function L(t) {
    const small = innerWidth < 768;
    const m = Math.min(w, h);
    return { cx: w / 2, cy: h / 2, m, small,
      nodeR: small ? m * 0.40 : m * 0.38, agentR: small ? m * 0.22 : m * 0.21,
      fnode: small ? 8 : 12, fagent: small ? 0 : 10, core: small ? 15 : 22, rot: t * 0.00005 };
  }
  function liveNodes() { const set = new Set(activeNodeIds()); return NODES.filter(n => set.has(n.id)); }
  function nodePos(id, t, lay) {
    const ln = liveNodes(); const i = ln.findIndex(n => n.id === id);
    const a = (i / Math.max(ln.length, 1)) * Math.PI * 2 + lay.rot;
    return { x: lay.cx + Math.cos(a) * lay.nodeR, y: lay.cy + Math.sin(a) * lay.nodeR };
  }
  function agentPos(i, t, lay) { const list = data.agents || []; const a = (i / Math.max(list.length, 1)) * Math.PI * 2 - lay.rot * 2.2; return { x: lay.cx + Math.cos(a) * lay.agentR, y: lay.cy + Math.sin(a) * lay.agentR }; }

  let ambient = 0;
  function loop(now) {
    ctx.clearRect(0, 0, w, h);
    const t = paused ? pausedAt : now;
    const lay = L(t);
    const cx = lay.cx, cy = lay.cy, agents = data.agents || [];
    hit.agents = []; hit.nodes = [];

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, lay.m * 0.7);
    bg.addColorStop(0, 'rgba(123,92,255,.10)'); bg.addColorStop(0.5, 'rgba(0,229,255,.05)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    if (!paused) dust.forEach(d => { d.y -= d.sp * 60 * intensity; if (d.y < 0) d.y = 1; const x = d.x * w, y = d.y * h; ctx.fillStyle = hexA('#00e5ff', 0.10 + 0.06 * Math.sin(d.ph + now / 1000)); ctx.beginPath(); ctx.arc(x, y, d.r, 0, Math.PI * 2); ctx.fill(); });

    // core glow
    const pulse = 1 + Math.sin(now / 400) * 0.12;
    for (let i = 3; i >= 0; i--) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, lay.core * (i * 6 + 8) * pulse);
      g.addColorStop(0, hexA('#00e5ff', 0.10 / (i + 1))); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, lay.core * (i * 6 + 8) * pulse, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#9be9ff'; ctx.shadowBlur = 34; ctx.shadowColor = '#00e5ff';
    ctx.beginPath(); ctx.arc(cx, cy, lay.core, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(214,228,255,.8)'; ctx.textAlign = 'center'; ctx.font = '12px ui-monospace,Menlo,monospace';
    ctx.fillText('SWARM CORE', cx, cy + lay.core + 18);

    [[lay.agentR, 'rgba(0,229,255,.06)'], [lay.nodeR, 'rgba(123,92,255,.08)']].forEach(([r, col]) => {
      ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2); ctx.stroke();
    });

    // service + compute nodes
    liveNodes().forEach((n) => {
      const p = nodePos(n.id, t, lay);
      hit.nodes.push({ id: n.id, label: n.label, color: n.color, icon: n.icon, x: p.x, y: p.y });
      const hl = hover && hover.type === 'node' && hover.id === n.id;
      // compute node pulses when a fleet node is busy
      const fleetBusy = n.fleet && data.fleet && (data.fleet.nodes || []).some(x => x.busy);
      ctx.strokeStyle = hexA(n.color, hl ? 0.5 : (fleetBusy ? 0.3 : 0.10)); ctx.lineWidth = hl ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke();
      const nr = n.fleet ? (fleetBusy ? 9 + Math.sin(now / 200) * 1.5 : 8) : (hl ? 9 : 7);
      ctx.fillStyle = n.color; ctx.shadowBlur = hl ? 32 : (fleetBusy ? 28 : 18); ctx.shadowColor = n.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, nr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#030409'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText(n.icon, p.x, p.y + 3);
      ctx.fillStyle = hexA(n.color, 0.9); ctx.font = lay.fnode + 'px ui-monospace,Menlo,monospace';
      ctx.fillText(lay.small ? n.short : n.label, p.x, p.y + (p.y > cy ? 22 : -14));
      ambient++; if (!paused && ambient % Math.max(2, Math.floor(24 - (agents.length * 0.4))) === 0) spawn({ x: cx, y: cy }, p, n.color);
    });

    // agents
    agents.forEach((a, i) => {
      const p = agentPos(i, t, lay);
      hit.agents.push({ name: a.name, color: a.color, x: p.x, y: p.y, active: a.active, last: a.last, avatar: a.avatar });
      const role = NAME_TO_ROLE[a.name] || 'coder';
      const hl = hover && hover.type === 'agent' && hover.name === a.name;
      (ROLE_SERVICES[role] || ['vault']).forEach(sid => {
        // don't draw an edge to compute if the fleet is offline
        if (sid === 'compute' && !(data.fleet && data.fleet.online > 0)) return;
        const sp = nodePos(sid, t, lay);
        ctx.strokeStyle = hexA(a.color, hl ? 0.4 : 0.12); ctx.lineWidth = hl ? 1.4 : 0.7;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(sp.x, sp.y); ctx.stroke();
        if (!paused && a.active && Math.random() > 0.96) spawn(p, sp, a.color, 1.2);
      });
      const size = (a.active || hl) ? 18 : 13;
      const img = avatarImgs[a.name];
      if (img && img.complete && img.naturalWidth) {
        ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(img, p.x - size / 2, p.y - size / 2, size, size); ctx.restore();
        ctx.strokeStyle = hexA(a.color, (a.active || hl) ? 0.9 : 0.4); ctx.lineWidth = (a.active || hl) ? 1.6 : 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = a.color; ctx.shadowBlur = (a.active || hl) ? 26 : 10; ctx.shadowColor = a.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      if (a.active) { ctx.strokeStyle = hexA(a.color, 0.6); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, size / 2 + 4 + Math.sin(now / 280) * 2, 0, Math.PI * 2); ctx.stroke(); if (!paused) burst(p); }
      if (lay.fagent > 0) { ctx.fillStyle = hexA(a.color, a.active ? 1 : 0.55); ctx.font = '9px ui-monospace,Menlo,monospace'; ctx.textAlign = 'center'; ctx.fillText(a.name, p.x, p.y + (p.y > cy ? 16 : -11)); }

      // thinking label — only for actively-working agents
      if (a.active && a.last && a.last.text) {
        const age = Date.now() - a.last.t;
        const alpha = Math.max(0.25, Math.min(1, 1 - age / 90000));
        const raw = String(a.last.text);
        const label = raw.length > 44 ? raw.slice(0, 44) + '…' : raw;
        ctx.font = '10px ui-monospace,Menlo,monospace';
        const wl = ctx.measureText(label).width + 16, hh = 18;
        const lx = Math.max(6, Math.min(w - wl - 6, p.x - wl / 2));
        const ly = Math.max(6, Math.min(h - hh - 6, p.y < cy ? p.y + 20 : p.y - 38));
        ctx.fillStyle = hexA('#04060c', 0.88 * alpha); ctx.strokeStyle = hexA(a.color, 0.75 * alpha); ctx.lineWidth = 1;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(lx, ly, wl, hh, 6); else ctx.rect(lx, ly, wl, hh); ctx.fill(); ctx.stroke();
        ctx.fillStyle = hexA(a.color, alpha); ctx.textAlign = 'left'; ctx.fillText(label, lx + 8, ly + 13);
      }
    });

    // conversation edges between recent speakers
    const recent = (data.chat || []).filter(m => !m.system).map(m => m.who).filter(wn => agents.find(a => a.name === wn)).slice(0, 6);
    for (let i = 0; i < recent.length - 1; i++) {
      const A = agents.findIndex(a => a.name === recent[i]), B = agents.findIndex(a => a.name === recent[i + 1]);
      if (A < 0 || B < 0 || A === B) continue;
      const pa = agentPos(A, t, lay), pb = agentPos(B, t, lay);
      ctx.strokeStyle = hexA(agents[A].color, 0.28); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      if (!paused && Math.random() > 0.97) spawn(pa, pb, '#ffffff', 1.4);
    }

    if (!paused) {
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.t += p.sp / 50; if (p.t >= 1) { particles.splice(i, 1); continue; } const x = p.ax + (p.bx - p.ax) * p.t, y = p.ay + (p.by - p.ay) * p.t; ctx.fillStyle = hexA(p.color, Math.sin(p.t * Math.PI)); ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill(); }
      for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.life -= 0.03; b.x += b.vx; b.y += b.vy; if (b.life <= 0) { bursts.splice(i, 1); continue; } ctx.fillStyle = hexA(b.color, b.life); ctx.beginPath(); ctx.arc(b.x, b.y, 1.6 * b.life, 0, Math.PI * 2); ctx.fill(); }
    }

    if (hover) {
      ctx.strokeStyle = hexA(hover.color, 0.8); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hover.x, hover.y, hover.r + 6, 0, Math.PI * 2); ctx.stroke();
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ---------- pointer + touch + controls ---------- */
function canvasXY(e) {
  const c = $('#brain'); const rect = c.getBoundingClientRect();
  const src = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top, cx: src.clientX, cy: src.clientY };
}
function pick(x, y) {
  const near = (px, py) => Math.hypot(px - x, py - y) < 24;
  for (const a of hit.agents) if (near(a.x, a.y)) return { type: 'agent', ...a, r: 12 };
  for (const n of hit.nodes) if (near(n.x, n.y)) return { type: 'node', ...n, r: 8 };
  return null;
}
function inspectAt(pt) {
  const p = pick(pt.x, pt.y);
  if (p) { hideInfo(); showInfo(p.type === 'agent' ? agentInfo(p) : nodeInfo(p), pt.cx + 12, pt.cy + 12); }
  else hideInfo();
}
const cnv = $('#brain');
cnv.addEventListener('mousemove', (e) => { const p = canvasXY(e); mouse.x = p.x; mouse.y = p.y; });
cnv.addEventListener('click', (e) => inspectAt(canvasXY(e)));
// Touch: tap to inspect (no 300ms delay, no accidental scroll hijack)
cnv.addEventListener('touchstart', (e) => { const p = canvasXY(e); mouse.x = p.x; mouse.y = p.y; }, { passive: true });
cnv.addEventListener('touchend', (e) => {
  const p = canvasXY(e);
  const target = pick(p.x, p.y);
  if (target) { e.preventDefault(); inspectAt(p); }
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); togglePause(); }
  if (e.code === 'Escape') hideInfo();
});
function setHover() { hover = pick(mouse.x, mouse.y); cnv.style.cursor = hover ? 'pointer' : 'default'; }
setInterval(setHover, 120);

function togglePause() { paused = !paused; if (paused) pausedAt = performance.now(); $('#pauseBtn').textContent = paused ? '▶' : '❚❚'; }
$('#pauseBtn').addEventListener('click', togglePause);
$('#intensity').addEventListener('input', (e) => { intensity = parseFloat(e.target.value); });
$('#ribbon').addEventListener('click', () => {
  if (!feed.length) return;
  const m = feed[ribbonIdx % Math.min(feed.length, 20)];
  showInfo(`<div class="i-name" style="color:${m.color || '#5f7194'}">${esc(m.who)}</div><div class="i-body">${esc(m.text)}</div>`, innerWidth / 2 - 160, innerHeight - 220);
});

setInterval(() => { const el = $('#clock'); if (el) el.textContent = new Date().toLocaleTimeString(); }, 1000);

load();
setInterval(load, 15000);
brain();
