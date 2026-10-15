// map.js
// ===================== LEAFLET MAP + UI =====================

let map;
let cityLayer;
let peopleLayer;
let hospitalLayer;

function initMap() {
  // Create the map centered on the world
  map = L.map("map", {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 18,
    zoomControl: true
  });

  // Real OpenStreetMap tiles (this is what makes it look like Google Maps)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  // Layers for our simulation objects
  cityLayer = L.layerGroup().addTo(map);
  peopleLayer = L.layerGroup().addTo(map);
  hospitalLayer = L.layerGroup().addTo(map);

  // Update markers when zoom changes
  map.on("zoomend", () => {
    refreshMapMarkers();
  });
}

// Create a city marker
function createCityMarker(city) {
  const zoom = map.getZoom();
  let radius = 6;
  let color = "#fbbf24";

  if (city.level >= 3) {
    radius = 9;
    color = "#f59e0b";
  }
  if (city.level >= 4) {
    radius = 12;
    color = "#ea580c";
  }

  const marker = L.circleMarker([city.lat, city.lng], {
    radius: radius,
    fillColor: color,
    color: "#78350f",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.85
  });

  let popupContent = `
    <strong>${city.name}</strong><br>
    Population: ${Math.floor(city.pop).toLocaleString()}<br>
    Level: ${["", "Village", "Town", "City", "Metropolis"][city.level]}<br>
    ${city.nation ? "Nation: " + city.nation.name : "Independent"}
    ${city.hasHospital ? "<br>🏥 Has Hospital" : ""}
  `;

  marker.bindPopup(popupContent);

  marker.on("click", () => {
    state.focus = city;
    state.focusType = "city";
    document.querySelector('[data-tab="focus"]').click();
    if (typeof renderFocusPanel === "function") renderFocusPanel();
  });

  city.marker = marker;
  return marker;
}

// Create a small person marker (only shown at high zoom)
function createPersonMarker(human) {
  const marker = L.circleMarker([human.lat, human.lng], {
    radius: 3.5,
    fillColor: human.sex === "M" ? "#60a5fa" : "#f472b6",
    color: "#1e293b",
    weight: 1,
    opacity: 0.9,
    fillOpacity: 0.9
  });

  marker.bindPopup(`
    <strong>${human.name}</strong><br>
    Age: ${human.age}<br>
    Hunger: ${human.hungerLevel}<br>
    Thirst: ${human.thirstLevel}<br>
    ${human.livingDescription}
  `);

  marker.on("click", () => {
    state.focus = human;
    state.focusType = "person";
    document.querySelector('[data-tab="focus"]').click();
    if (typeof renderFocusPanel === "function") renderFocusPanel();
  });

  return marker;
}

// Create hospital marker
function createHospitalMarker(city) {
  const marker = L.marker([city.lat + 0.02, city.lng + 0.02], {
    icon: L.divIcon({
      className: "hospital-icon",
      html: "🏥",
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    })
  });
  marker.bindPopup(`<strong>Hospital</strong><br>${city.name}`);
  return marker;
}

// Refresh all markers according to current zoom
function refreshMapMarkers() {
  if (!map) return;

  const zoom = map.getZoom();

  // Clear layers
  cityLayer.clearLayers();
  peopleLayer.clearLayers();
  hospitalLayer.clearLayers();

  // Cities – always shown
  state.cities.forEach(city => {
    const marker = createCityMarker(city);
    cityLayer.addLayer(marker);
  });

  // Hospitals – shown from zoom 6 upward
  if (zoom >= 6) {
    state.cities.forEach(city => {
      if (city.hasHospital) {
        hospitalLayer.addLayer(createHospitalMarker(city));
      }
    });
  }

  // People – only shown when zoomed in quite far (so it doesn't get messy)
  if (zoom >= 9) {
    // Limit how many people we draw for performance
    const alive = state.humans.filter(h => h.alive);
    const maxPeople = zoom >= 12 ? 400 : 180;
    const sample = alive.slice(0, maxPeople);

    sample.forEach(h => {
      peopleLayer.addLayer(createPersonMarker(h));
    });
  }
}

// ---------- UI functions ----------
function renderEvents() {
  const el = document.getElementById("eventLog");
  if (!el) return;
  let html = "";
  state.events.slice(0, 30).forEach(e => {
    const y = e.year < 0 ? Math.abs(e.year) + " BCE" : e.year + " CE";
    html += `<div class="event ${e.type}"><span class="year">${y}</span><span class="msg">${e.msg}</span></div>`;
  });
  el.innerHTML = html;
}

function updateUI() {
  document.getElementById("yearDisplay").textContent =
    state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";
  document.getElementById("eraDisplay").textContent = state.era;
  document.getElementById("popDisplay").textContent = state.population.toLocaleString();
  document.getElementById("cityDisplay").textContent = state.cities.length;
  document.getElementById("aliveDisplay").textContent = state.humans.filter(h => h.alive).length;

  // Stats
  document.getElementById("statGrid").innerHTML = `
    <div class="stat-card"><div class="label">Population</div><div class="value">${state.population.toLocaleString()}</div></div>
    <div class="stat-card"><div class="label">Living Agents</div><div class="value">${state.humans.filter(h => h.alive).length}</div></div>
    <div class="stat-card"><div class="label">Marriages</div><div class="value">${state.marriages}</div></div>
    <div class="stat-card"><div class="label">Families</div><div class="value">${state.families.length}</div></div>
    <div class="stat-card"><div class="label">Wars</div><div class="value">${state.wars}</div></div>
    <div class="stat-card"><div class="label">Cities</div><div class="value">${state.cities.length}</div></div>
    <div class="stat-card"><div class="label">Nations</div><div class="value">${state.nations.length}</div></div>
    <div class="stat-card"><div class="label">Discoveries</div><div class="value">${state.discoveries}</div></div>
  `;

  // Resources
  document.getElementById("envList").innerHTML = `
    <div class="res-item"><span>Food</span><span>${Math.floor(state.resources.food)}</span></div>
    <div class="res-item"><span>Wood</span><span>${Math.floor(state.resources.wood)}</span></div>
    <div class="res-item"><span>Stone</span><span>${Math.floor(state.resources.stone)}</span></div>
    <div class="res-item"><span>Energy</span><span>${Math.floor(state.resources.energy)}</span></div>
    <div class="res-item"><span>Knowledge</span><span>${Math.floor(state.resources.knowledge)}</span></div>
  `;

  // Tech
  let techHtml = "";
  TECH_TREE.forEach(t => {
    const y = t.year < 0 ? Math.abs(t.year) + " BCE" : t.year + " CE";
    const cls = state.tech[t.id] ? "unlocked" : "locked";
    const mark = state.tech[t.id] ? "✓" : "○";
    techHtml += `<div class="tech-item ${cls}"><span>${mark} ${t.name}</span><span>${y}</span></div>`;
  });
  document.getElementById("techList").innerHTML = techHtml;

  // People list
  const alive = state.humans.filter(h => h.alive);
  alive.sort((a, b) => b.age - a.age);
  const sample = alive.slice(0, 18);

  let peopleHtml = "";
  if (sample.length === 0) {
    peopleHtml = '<div style="color:var(--muted)">No living people right now.</div>';
  } else {
    sample.forEach(h => {
      peopleHtml += `
        <div class="person-card" onclick="focusPerson(${h.id})">
          <div class="name">${h.name}</div>
          <div class="meta">age ${h.age}, hunger ${h.hungerLevel}, thirst ${h.thirstLevel}, ${h.livingDescription}</div>
        </div>`;
    });
  }
  document.getElementById("peopleList").innerHTML = peopleHtml;

  renderFocusPanel();
}

function renderFocusPanel() {
  const panel = document.getElementById("focusPanel");
  if (!panel) return;

  if (!state.focus) {
    panel.innerHTML = `
      <div style="color:var(--muted);font-size:0.85rem">
        Click a city or person on the map.<br>
        Zoom in to see more detail (countries → cities → people).
      </div>`;
    return;
  }

  if (state.focusType === "person") {
    const h = state.focus;
    panel.innerHTML = `
      <div style="font-size:1.15rem;font-weight:600;color:#f472b6;margin-bottom:8px">${h.name}</div>
      <div class="res-item"><span>Age</span><span>${h.age}</span></div>
      <div class="res-item"><span>Hunger</span><span>${h.hungerLevel}</span></div>
      <div class="res-item"><span>Thirst</span><span>${h.thirstLevel}</span></div>
      <div class="res-item"><span>Health</span><span>${Math.round(h.health * 100)}%</span></div>
      <div class="res-item"><span>Job</span><span>${h.job}</span></div>
      <div class="res-item"><span>Living</span><span>${h.livingDescription}</span></div>
      <div class="res-item"><span>Spouse</span><span>${h.spouse && h.spouse.alive ? h.spouse.name : "None"}</span></div>
      <div class="res-item"><span>Children</span><span>${h.children.filter(c => c.alive).length}</span></div>
      <button class="focus-btn" onclick="zoomToPerson(${h.id})">Zoom to Person</button>
    `;
  } else if (state.focusType === "city") {
    const c = state.focus;
    panel.innerHTML = `
      <div style="font-size:1.15rem;font-weight:600;color:#fbbf24;margin-bottom:6px">${c.name}</div>
      <div class="res-item"><span>Population</span><span>${Math.floor(c.pop).toLocaleString()}</span></div>
      <div class="res-item"><span>Level</span><span>${["", "Village", "Town", "City", "Metropolis"][c.level]}</span></div>
      <div class="res-item"><span>Nation</span><span>${c.nation ? c.nation.name : "Independent"}</span></div>
      <div class="res-item"><span>Hospital</span><span>${c.hasHospital ? "Yes 🏥" : "No"}</span></div>
      <button class="focus-btn" onclick="zoomToCity()">Zoom to City</button>
    `;
  }
}

// Global helpers used by HTML
window.focusPerson = function (id) {
  const h = state.humans.find(p => p.id === id);
  if (!h) return;
  state.focus = h;
  state.focusType = "person";
  document.querySelector('[data-tab="focus"]').click();
  renderFocusPanel();
};

window.zoomToPerson = function (id) {
  const h = state.humans.find(p => p.id === id);
  if (!h || !map) return;
  map.setView([h.lat, h.lng], 12);
  state.focus = h;
  state.focusType = "person";
};

window.zoomToCity = function () {
  if (state.focusType !== "city" || !map) return;
  const c = state.focus;
  map.setView([c.lat, c.lng], 10);
};

// ---------- Controls ----------
document.getElementById("btnPlay").onclick = () => {
  state.running = true;
  document.getElementById("btnPlay").classList.add("active");
};
document.getElementById("btnPause").onclick = () => {
  state.running = false;
  document.getElementById("btnPlay").classList.remove("active");
};
document.getElementById("btnReset").onclick = () => {
  initWorld();
  state.running = true;
  document.getElementById("btnPlay").classList.add("active");
  if (map) map.setView([20, 0], 2);
  refreshMapMarkers();
};

document.querySelectorAll("[data-speed]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("[data-speed]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.speed = parseFloat(btn.dataset.speed);
  };
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".tab-content").forEach(c => (c.style.display = "none"));
    document.getElementById("tab-" + tab.dataset.tab).style.display = "block";
  };
});

// Timeline
document.getElementById("timeline").addEventListener("input", e => {
  const target = parseInt(e.target.value, 10);
  state.year = target;
  state.era = getEra(state.year);
  TECH_TREE.forEach(t => {
    state.tech[t.id] = state.year >= t.year;
  });
  updatePop();
  updateUI();
  document.getElementById("timelineLabel").textContent =
    state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";
});

// ---------- Start screen ----------
const nameInput = document.getElementById("nameInput");
const startBtn = document.getElementById("startBtn");

nameInput.addEventListener("input", () => {
  startBtn.disabled = nameInput.value.trim().length < 1;
});
nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !startBtn.disabled) startBtn.click();
});

startBtn.addEventListener("click", () => {
  playerName = nameInput.value.trim() || "Creator";
  window.playerName = playerName;

  document.getElementById("godName").textContent = playerName;
  document.getElementById("godPanel").style.display = "block";
  document.getElementById("addBar").style.display = "flex";
  document.getElementById("startScreen").style.display = "none";

  // Initialize map and world
  initMap();
  initWorld();
  state.running = true;
  document.getElementById("btnPlay").classList.add("active");
  logEvent("discovery", playerName + " has begun shaping the world.");
  refreshMapMarkers();
});

// Main loop
let last = performance.now();
let acc = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt * 1000;

  if (acc > 160) {
    acc = 0;
    tick();
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
