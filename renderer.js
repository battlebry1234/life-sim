// renderer.js  – fixed version
// ============================================

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const wrap = document.getElementById('canvasWrap');

let cssW = 0;
let cssH = 0;

const cam = {
  x: 90,
  y: 50,
  zoom: 1.15,
  targetZoom: 1.15,
  minZoom: 0.45,
  maxZoom: 110,
  dragging: false,
  lastMX: 0,
  lastMY: 0
};

function resize() {
  const r = wrap.getBoundingClientRect();
  cssW = r.width;
  cssH = r.height;
  canvas.width = cssW * devicePixelRatio;
  canvas.height = cssH * devicePixelRatio;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function w2s(wx, wy) {
  return {
    x: (wx - cam.x) * cam.zoom + cssW / 2,
    y: (wy - cam.y) * cam.zoom + cssH / 2
  };
}

function s2w(sx, sy) {
  return {
    x: (sx - cssW / 2) / cam.zoom + cam.x,
    y: (sy - cssH / 2) / cam.zoom + cam.y
  };
}

// ---------- Drawing ----------
function drawTerrain() {
  const cell = cam.zoom;
  const margin = 1.5;
  const startX = Math.max(0, Math.floor(cam.x - cssW / (2 * cam.zoom) - margin));
  const endX   = Math.min(MAP_W, Math.ceil(cam.x + cssW / (2 * cam.zoom) + margin));
  const startY = Math.max(0, Math.floor(cam.y - cssH / (2 * cam.zoom) - margin));
  const endY   = Math.min(MAP_H, Math.ceil(cam.y + cssH / (2 * cam.zoom) + margin));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const t = terrain[y * MAP_W + x];
      let col = '#1a3a2a';
      if (t === 0) col = '#0c4a6e';
      else if (t === 2) col = '#166534';
      else if (t === 3) col = '#854d0e';
      else if (t === 4) col = '#4b5563';
      else if (t === 5) col = '#0284c7';
      else if (t === 7) col = '#4d7c0f';

      const s = w2s(x, y);
      ctx.fillStyle = col;
      ctx.fillRect(s.x, s.y, cell + 0.7, cell + 0.7);
    }
  }
}

function drawCityDetailed(c) {
  c.ensureLayout();
  const size = c.localSize;

  const tl = w2s(c.x - size / 2, c.y - size / 2);
  const br = w2s(c.x + size / 2, c.y + size / 2);
  const gw = br.x - tl.x;
  const gh = br.y - tl.y;

  ctx.fillStyle = '#2d3748';
  ctx.fillRect(tl.x, tl.y, gw, gh);
  ctx.fillStyle = '#374151';
  ctx.fillRect(tl.x + gw * 0.03, tl.y + gh * 0.03, gw * 0.94, gh * 0.94);

  c.streets.forEach(function(st) {
    const a = w2s(c.x + st.x1, c.y + st.y1);
    const b = w2s(c.x + st.x2, c.y + st.y2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = st.main ? '#94a3b8' : '#64748b';
    ctx.lineWidth = st.main ? Math.max(3.2, cam.zoom * 0.22) : Math.max(1.9, cam.zoom * 0.13);
    ctx.lineCap = 'butt';
    ctx.stroke();
  });

  c.buildings.forEach(function(b) {
    const s = w2s(c.x + b.lx - b.w / 2, c.y + b.ly - b.h / 2);
    const sw = b.w * cam.zoom;
    const sh = b.h * cam.zoom;

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(s.x + 2, s.y + 2, sw, sh);

    ctx.fillStyle = b.color;
    ctx.fillRect(s.x, s.y, sw, sh);

    if (cam.zoom > 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(s.x, s.y, sw, sh * 0.2);
    }

    if (cam.zoom > 24 && (b.type === 'house' || b.type === 'shop' || b.type === 'fastfood')) {
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(s.x + sw * 0.18, s.y + sh * 0.38, sw * 0.22, sh * 0.25);
      if (sw > 14) {
        ctx.fillRect(s.x + sw * 0.55, s.y + sh * 0.38, sw * 0.22, sh * 0.25);
      }
    }
  });

  if (cam.zoom < 55) {
    const s = w2s(c.x, c.y - size / 2 - 1.1);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold ' + Math.max(11, 12 * Math.min(cam.zoom * 0.14, 1.5)) + 'px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, s.x, s.y);
  }
}

function drawPeople() {
  if (cam.zoom < 8.5) return;

  const maxDraw = cam.zoom > 45 ? 1000 : cam.zoom > 22 ? 450 : 200;
  let drawn = 0;

  for (let i = 0; i < state.humans.length; i++) {
    const h = state.humans[i];
    if (!h.alive || drawn >= maxDraw) continue;

    const s = w2s(h.x, h.y);
    if (s.x < -25 || s.x > cssW + 25 || s.y < -25 || s.y > cssH + 25) continue;

    drawn++;
    const r = cam.zoom > 45 ? 5.8 : cam.zoom > 25 ? 4.0 : 2.7;

    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = h.sex === 'M' ? '#60a5fa' : '#f472b6';
    ctx.fill();

    if (cam.zoom > 30) {
      ctx.beginPath();
      ctx.arc(s.x, s.y - r * 0.4, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fde68a';
      ctx.fill();
    }

    if (cam.zoom > 42) {
      ctx.fillStyle = '#fff';
      ctx.font = '9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(h.name.split(' ')[0], s.x, s.y - r - 5);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, cssW, cssH);
  drawTerrain();

  // Nations (low zoom only)
  if (cam.zoom < 5.5) {
    state.nations.forEach(function(n) {
      if (!n.capital) return;
      const s = w2s(n.capital.x, n.capital.y);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 13 + Math.min(18, n.cities.length * 1.8), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59,130,246,0.38)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (cam.zoom > 1.15) {
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.font = 'bold ' + Math.max(10, 11 * Math.min(cam.zoom, 1.6)) + 'px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, s.x, s.y - 17);
      }
    });
  }

  // Cities – detailed only when zoomed in on that city
  state.cities.forEach(function(c) {
    const dist = Math.hypot(c.x - cam.x, c.y - cam.y);
    const showDetail = cam.zoom >= 8 && dist < (c.localSize * 0.65 + 5);

    if (showDetail) {
      drawCityDetailed(c);
    } else {
      const s = w2s(c.x, c.y);
      if (s.x < -35 || s.x > cssW + 35 || s.y < -35 || s.y > cssH + 35) return;

      const r = Math.min(12, 2.8 + Math.log10(c.pop + 1) * 1.6) * Math.min(1.15, cam.zoom * 0.38 + 0.45);
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = c.level >= 3 ? '#f59e0b' : '#fde68a';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.15;
      ctx.stroke();

      if (cam.zoom > 1.7) {
        ctx.fillStyle = '#fff';
        ctx.font = Math.max(9, 10 * Math.min(cam.zoom * 0.32, 1.25)) + 'px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(c.name, s.x, s.y - r - 3);
      }
    }
  });

  drawPeople();

  // Focus ring
  if (state.focus) {
    let fx, fy, fr = 11;
    if (state.focusType === 'city') {
      fx = state.focus.x;
      fy = state.focus.y;
      fr = 15;
    } else if (state.focusType === 'person') {
      fx = state.focus.x;
      fy = state.focus.y;
      fr = 8;
    } else if (state.focusType === 'nation') {
      fx = state.focus.capital.x;
      fy = state.focus.capital.y;
      fr = 20;
    }

    if (fx !== undefined) {
      const s = w2s(fx, fy);
      ctx.beginPath();
      ctx.arc(s.x, s.y, fr * Math.min(1.15, cam.zoom * 0.11 + 0.4), 0, Math.PI * 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  }

  document.getElementById('zoomBadge').textContent = 'Zoom: ' + cam.zoom.toFixed(1) + '×';
}

// ---------- UI ----------
function renderEvents() {
  const el = document.getElementById('eventLog');
  if (!el) return;

  let html = '';
  const list = state.events.slice(0, 28);
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const y = e.year < 0 ? Math.abs(e.year) + ' BCE' : e.year + ' CE';
    html += '<div class="event ' + e.type + '"><span class="year">' + y + '</span><span class="msg">' + e.msg + '</span></div>';
  }
  el.innerHTML = html;
}

function updateUI() {
  document.getElementById('yearDisplay').textContent =
    state.year < 0 ? Math.abs(state.year) + ' BCE' : state.year + ' CE';
  document.getElementById('eraDisplay').textContent = state.era;
  document.getElementById('popDisplay').textContent = state.population.toLocaleString();
  document.getElementById('cityDisplay').textContent = state.cities.length;
  document.getElementById('aliveDisplay').textContent = state.humans.filter(function(h) { return h.alive; }).length;

  // Stats
  document.getElementById('statGrid').innerHTML =
    '<div class="stat-card"><div class="label">Population</div><div class="value">' + state.population.toLocaleString() + '</div></div>' +
    '<div class="stat-card"><div class="label">Living Agents</div><div class="value">' + state.humans.filter(function(h){return h.alive;}).length + '</div></div>' +
    '<div class="stat-card"><div class="label">Marriages</div><div class="value">' + state.marriages + '</div></div>' +
    '<div class="stat-card"><div class="label">Families</div><div class="value">' + state.families.length + '</div></div>' +
    '<div class="stat-card"><div class="label">Wars</div><div class="value">' + state.wars + '</div></div>' +
    '<div class="stat-card"><div class="label">Cities</div><div class="value">' + state.cities.length + '</div></div>' +
    '<div class="stat-card"><div class="label">Nations</div><div class="value">' + state.nations.length + '</div></div>' +
    '<div class="stat-card"><div class="label">Discoveries</div><div class="value">' + state.discoveries + '</div></div>';

  document.getElementById('envList').innerHTML =
    '<div class="res-item"><span>Forests</span><span>' + state.environment.forests + '</span></div>' +
    '<div class="res-item"><span>Oceans</span><span>' + state.environment.oceans + '</span></div>' +
    '<div class="res-item"><span>Food</span><span>' + Math.floor(state.resources.food) + '</span></div>' +
    '<div class="res-item"><span>Energy</span><span>' + Math.floor(state.resources.energy) + '</span></div>' +
    '<div class="res-item"><span>Knowledge</span><span>' + Math.floor(state.resources.knowledge) + '</span></div>';

  // Tech list
  let techHtml = '';
  for (let i = 0; i < TECH_TREE.length; i++) {
    const t = TECH_TREE[i];
    const y = t.year < 0 ? Math.abs(t.year) + ' BCE' : t.year + ' CE';
    const cls = state.tech[t.id] ? 'unlocked' : 'locked';
    const mark = state.tech[t.id] ? '✓' : '○';
    techHtml += '<div class="tech-item ' + cls + '"><span>' + mark + ' ' + t.name + '</span><span>' + y + '</span></div>';
  }
  document.getElementById('techList').innerHTML = techHtml;

  // People list
  const alive = state.humans.filter(function(h) { return h.alive; });
  alive.sort(function(a, b) { return b.age - a.age; });
  const sample = alive.slice(0, 14);

  let peopleHtml = '';
  if (sample.length === 0) {
    peopleHtml = '<div style="color:var(--muted)">No living people right now.</div>';
  } else {
    for (let i = 0; i < sample.length; i++) {
      const h = sample[i];
      peopleHtml +=
        '<div class="person-card" onclick="focusPerson(' + h.id + ')">' +
        '<div class="name">' + h.name + ' (' + h.sex + ')</div>' +
        '<div class="meta">Age ' + h.age + ' • ' + h.job +
        (h.spouse ? ' • Married' : ' • Single') +
        (h.city ? ' • ' + h.city.name : '') +
        '</div></div>';
    }
  }
  document.getElementById('peopleList').innerHTML = peopleHtml;

  renderFocusPanel();
}

function renderFocusPanel() {
  const panel = document.getElementById('focusPanel');
  if (!panel) return;

  if (!state.focus) {
    panel.innerHTML = '<div style="color:var(--muted);font-size:0.85rem">' +
      'Click a city marker, then zoom in with the mouse wheel.<br>' +
      'Streets and buildings appear only for the city you are looking at.' +
      '</div>';
    return;
  }

  if (state.focusType === 'person') {
    const h = state.focus;
    panel.innerHTML =
      '<div style="font-size:1.1rem;font-weight:600;color:#f472b6;margin-bottom:6px">' + h.name + '</div>' +
      '<div class="res-item"><span>Age</span><span>' + h.age + '</span></div>' +
      '<div class="res-item"><span>Spouse</span><span>' + (h.spouse ? h.spouse.name : 'None') + '</span></div>' +
      '<div class="res-item"><span>Children</span><span>' + h.children.length + '</span></div>' +
      '<div class="res-item"><span>City</span><span>' + (h.city ? h.city.name : '—') + '</span></div>' +
      '<button class="focus-btn" onclick="zoomToPerson(' + h.id + ')">Zoom to Person</button>';
  } else if (state.focusType === 'city') {
    const c = state.focus;
    panel.innerHTML =
      '<div style="font-size:1.1rem;font-weight:600;color:#fbbf24;margin-bottom:6px">' + c.name + '</div>' +
      '<div class="res-item"><span>Population</span><span>' + Math.floor(c.pop).toLocaleString() + '</span></div>' +
      '<div class="res-item"><span>Level</span><span>' + ['','Village','Town','City','Metropolis'][c.level] + '</span></div>' +
      '<div class="res-item"><span>Nation</span><span>' + (c.nation ? c.nation.name : 'Independent') + '</span></div>' +
      '<div class="res-item"><span>Buildings</span><span>' + (c.buildings.length || 'Zoom in') + '</span></div>' +
      '<button class="focus-btn" onclick="zoomToCity()">Zoom into this City</button>';
  } else if (state.focusType === 'nation') {
    const n = state.focus;
    panel.innerHTML =
      '<div style="font-size:1.1rem;font-weight:600;color:#3b82f6;margin-bottom:6px">' + n.name + '</div>' +
      '<div class="res-item"><span>Capital</span><span>' + n.capital.name + '</span></div>' +
      '<div class="res-item"><span>Cities</span><span>' + n.cities.length + '</span></div>' +
      '<button class="focus-btn" onclick="zoomToNation()">Zoom to Nation</button>';
  }
}

// Global helpers
window.focusPerson = function(id) {
  const h = state.humans.find(function(p) { return p.id === id; });
  if (!h) return;
  state.focus = h;
  state.focusType = 'person';
  document.querySelector('[data-tab="focus"]').click();
  renderFocusPanel();
};

window.zoomToPerson = function(id) {
  const h = state.humans.find(function(p) { return p.id === id; });
  if (!h) return;
  state.focus = h;
  state.focusType = 'person';
  cam.x = h.x;
  cam.y = h.y;
  cam.targetZoom = 48;
};

window.zoomToCity = function() {
  if (state.focusType !== 'city') return;
  const c = state.focus;
  cam.x = c.x;
  cam.y = c.y;
  cam.targetZoom = 24;
  c.ensureLayout();
};

window.zoomToNation = function() {
  if (state.focusType !== 'nation') return;
  const n = state.focus;
  cam.x = n.capital.x;
  cam.y = n.capital.y;
  cam.targetZoom = 4.2;
};

// ---------- Input ----------
wrap.addEventListener('wheel', function(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.78 : 1.28;
  const mouse = s2w(e.offsetX, e.offsetY);
  cam.targetZoom = Math.max(cam.minZoom, Math.min(cam.maxZoom, cam.zoom * factor));
  const after = s2w(e.offsetX, e.offsetY);
  cam.x += mouse.x - after.x;
  cam.y += mouse.y - after.y;
}, { passive: false });

wrap.addEventListener('mousedown', function(e) {
  cam.dragging = true;
  cam.lastMX = e.clientX;
  cam.lastMY = e.clientY;
  wrap.classList.add('dragging');
});

window.addEventListener('mouseup', function() {
  cam.dragging = false;
  wrap.classList.remove('dragging');
});

window.addEventListener('mousemove', function(e) {
  if (!cam.dragging) return;
  cam.x -= (e.clientX - cam.lastMX) / cam.zoom;
  cam.y -= (e.clientY - cam.lastMY) / cam.zoom;
  cam.lastMX = e.clientX;
  cam.lastMY = e.clientY;
});

canvas.addEventListener('click', function(e) {
  if (cam.dragging) return;
  const rect = canvas.getBoundingClientRect();
  const w = s2w(e.clientX - rect.left, e.clientY - rect.top);

  if (cam.zoom > 14) {
    let closest = null;
    let bestD = 1.9;
    state.humans.forEach(function(h) {
      if (!h.alive) return;
      const d = Math.hypot(h.x - w.x, h.y - w.y);
      if (d < bestD) {
        bestD = d;
        closest = h;
      }
    });
    if (closest) {
      state.focus = closest;
      state.focusType = 'person';
      document.querySelector('[data-tab="focus"]').click();
      renderFocusPanel();
      return;
    }
  }

  let bestCity = null;
  let bestCD = 3.8;
  state.cities.forEach(function(c) {
    const d = Math.hypot(c.x - w.x, c.y - w.y);
    if (d < bestCD) {
      bestCD = d;
      bestCity = c;
    }
  });
  if (bestCity) {
    state.focus = bestCity;
    state.focusType = 'city';
    document.querySelector('[data-tab="focus"]').click();
    renderFocusPanel();
    return;
  }

  let bestN = null;
  let bestND = 11;
  state.nations.forEach(function(n) {
    const d = Math.hypot(n.capital.x - w.x, n.capital.y - w.y);
    if (d < bestND) {
      bestND = d;
      bestN = n;
    }
  });
  if (bestN) {
    state.focus = bestN;
    state.focusType = 'nation';
    document.querySelector('[data-tab="focus"]').click();
    renderFocusPanel();
  }
});

canvas.addEventListener('mousemove', function(e) {
  if (cam.dragging) return;
  const rect = canvas.getBoundingClientRect();
  const w = s2w(e.clientX - rect.left, e.clientY - rect.top);
  let info = '(' + w.x.toFixed(1) + ', ' + w.y.toFixed(1) + ')';

  if (cam.zoom > 11) {
    let closest = null;
    let bestD = 2.4;
    state.humans.forEach(function(h) {
      if (!h.alive) return;
      const d = Math.hypot(h.x - w.x, h.y - w.y);
      if (d < bestD) {
        bestD = d;
        closest = h;
      }
    });
    if (closest) {
      info = '<strong>' + closest.name + '</strong> (age ' + closest.age + ')<br>' +
             (closest.spouse ? 'Married' : 'Single') +
             (closest.city ? ' • ' + closest.city.name : '');
      document.getElementById('hoverInfo').innerHTML = info;
      return;
    }
  }

  const city = state.cities.find(function(c) {
    return Math.hypot(c.x - w.x, c.y - w.y) < 3.2;
  });
  if (city) {
    info = '<strong>' + city.name + '</strong><br>Pop ' + Math.floor(city.pop).toLocaleString() +
           '<br><em>Zoom in to see streets & buildings</em>';
  }
  document.getElementById('hoverInfo').innerHTML = info;
});

// Timeline
document.getElementById('timeline').addEventListener('input', function(e) {
  const target = parseInt(e.target.value, 10);
  state.year = target;
  state.era = getEra(state.year);

  TECH_TREE.forEach(function(t) {
    state.tech[t.id] = state.year >= t.year;
  });

  if (typeof updatePop === 'function') updatePop();
  updateUI();

  document.getElementById('timelineLabel').textContent =
    state.year < 0 ? Math.abs(state.year) + ' BCE' : state.year + ' CE';
});

// Buttons
document.getElementById('btnPlay').onclick = function() {
  state.running = true;
  document.getElementById('btnPlay').classList.add('active');
};

document.getElementById('btnPause').onclick = function() {
  state.running = false;
  document.getElementById('btnPlay').classList.remove('active');
};

document.getElementById('btnReset').onclick = function() {
  initWorld();
  state.running = true;
  document.getElementById('btnPlay').classList.add('active');
  cam.x = MAP_W / 2;
  cam.y = MAP_H / 2;
  cam.zoom = 1.15;
  cam.targetZoom = 1.15;
};

document.getElementById('btnZoomIn').onclick = function() {
  cam.targetZoom = Math.min(cam.maxZoom, cam.zoom * 1.45);
};

document.getElementById('btnZoomOut').onclick = function() {
  cam.targetZoom = Math.max(cam.minZoom, cam.zoom * 0.68);
};

document.getElementById('btnResetView').onclick = function() {
  cam.x = MAP_W / 2;
  cam.y = MAP_H / 2;
  cam.targetZoom = 1.15;
  state.focus = null;
  state.focusType = null;
  renderFocusPanel();
};

document.querySelectorAll('[data-speed]').forEach(function(btn) {
  btn.onclick = function() {
    document.querySelectorAll('[data-speed]').forEach(function(b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    state.speed = parseFloat(btn.dataset.speed);
  };
});

document.querySelectorAll('.tab').forEach(function(tab) {
  tab.onclick = function() {
    document.querySelectorAll('.tab').forEach(function(t) {
      t.classList.remove('active');
    });
    tab.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(function(c) {
      c.style.display = 'none';
    });
    document.getElementById('tab-' + tab.dataset.tab).style.display = 'block';
  };
});

// Camera smoothing
function updateCam() {
  cam.zoom += (cam.targetZoom - cam.zoom) * 0.15;
}

// Simple walking
function updateWalking(dt) {
  if (cam.zoom < 9) return;
  const speed = 0.22;

  state.humans.forEach(function(h) {
    if (!h.alive) return;
    h.walkTimer -= dt;
    if (h.walkTimer <= 0) {
      if (h.city && cam.zoom > 11) {
        h.city.ensureLayout();
        const b = h.city.buildings[Math.floor(Math.random() * h.city.buildings.length)];
        if (b) {
          h.targetX = h.city.x + b.lx + (Math.random() - 0.5) * 1.4;
          h.targetY = h.city.y + b.ly + (Math.random() - 0.5) * 1.4;
        }
      } else {
        h.targetX = h.x + (Math.random() - 0.5) * 5;
        h.targetY = h.y + (Math.random() - 0.5) * 5;
      }
      h.walkTimer = 3.5 + Math.random() * 6;
    }
    const dx = h.targetX - h.x;
    const dy = h.targetY - h.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.07) {
      h.x += (dx / dist) * speed * dt;
      h.y += (dy / dist) * speed * dt;
    }
  });
}

// Main loop
let last = performance.now();
let acc = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt * 1000;

  if (acc > 140) {
    acc = 0;
    tick();
  }

  updateWalking(dt);
  updateCam();
  draw();
  requestAnimationFrame(loop);
}

// Start
initWorld();
requestAnimationFrame(loop);
