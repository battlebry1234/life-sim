// map.js
// ===================== LEAFLET MAP + FULL CITY DIVE MODE =====================

let map;
let cityLayer;
let peopleLayer;
let hospitalLayer;
let historicalLayer;

// City Dive variables
let cityDiveActive = false;
let diveCanvas = null;
let diveCtx = null;
let diveCity = null;
let divePeople = [];
let diveTrees = [];
let diveBuildings = [];
let diveAnimationId = null;
let diveInfoBar = null;

const HISTORICAL_SITES = [
  {
    name: "Rome",
    lat: 41.9028,
    lng: 12.4964,
    year: -50,
    description: "The heart of the Roman Empire. Forum, temples, and later the Colosseum."
  },
  {
    name: "Memphis (Egypt)",
    lat: 29.8447,
    lng: 31.2508,
    year: -2500,
    description: "Capital of ancient Egypt. The Pyramids of Giza and the Great Sphinx rise nearby."
  },
  {
    name: "Athens",
    lat: 37.9838,
    lng: 23.7275,
    year: -450,
    description: "Birthplace of democracy and classical Greek culture. The Acropolis dominates the skyline."
  },
  {
    name: "Uruk",
    lat: 31.3222,
    lng: 45.6361,
    year: -3500,
    description: "One of the world’s first true cities in Mesopotamia."
  },
  {
    name: "Anyang",
    lat: 36.0996,
    lng: 114.3460,
    year: -1200,
    description: "Shang Dynasty capital – early Chinese civilization and oracle bones."
  },
  {
    name: "Caral",
    lat: -10.8917,
    lng: -77.5208,
    year: -2200,
    description: "One of the oldest cities in the Americas (Norte Chico civilization)."
  }
];

const CITY_DIVE_DATA = {
  "Rome": {
    year: -50,
    title: "Rome – Heart of the Empire",
    description: "The Forum is alive. Soldiers, senators, merchants and families fill the streets.",
    maleRoles: ["Legionary", "Builder", "Farmer", "Merchant", "Senator", "Guard"],
    femaleRoles: ["Homemaker", "Childcare", "Merchant", "Priestess", "Weaver"]
  },
  "Memphis (Egypt)": {
    year: -2500,
    title: "Memphis – Age of the Pyramids",
    description: "Workers, priests and overseers move around the great building projects.",
    maleRoles: ["Builder", "Overseer", "Soldier", "Farmer", "Scribe"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver", "Farmer"]
  },
  "Athens": {
    year: -450,
    title: "Athens – Golden Age",
    description: "Philosophers, citizens and artisans fill the agora beneath the Acropolis.",
    maleRoles: ["Citizen", "Soldier", "Philosopher", "Merchant", "Artisan"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Merchant"]
  },
  "Uruk": {
    year: -3500,
    title: "Uruk – First Great City",
    description: "The earliest urban life. Temples rise and trade begins.",
    maleRoles: ["Guard", "Farmer", "Craftsman", "Trader", "Builder"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver"]
  },
  "Anyang": {
    year: -1200,
    title: "Anyang – Shang Capital",
    description: "Bronze workers, diviners and royal attendants move through the city.",
    maleRoles: ["Soldier", "Bronze Worker", "Farmer", "Diviner", "Noble"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Noble"]
  },
  "Caral": {
    year: -2200,
    title: "Caral – Ancient Andes",
    description: "Pyramid builders and farmers of the Norte Chico civilization.",
    maleRoles: ["Builder", "Farmer", "Fisher", "Guard"],
    femaleRoles: ["Homemaker", "Childcare", "Farmer", "Weaver"]
  }
};

function initMap() {
  map = L.map("map", {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 18,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  cityLayer = L.layerGroup().addTo(map);
  peopleLayer = L.layerGroup().addTo(map);
  hospitalLayer = L.layerGroup().addTo(map);
  historicalLayer = L.layerGroup().addTo(map);

  HISTORICAL_SITES.forEach(site => {
    const marker = L.circleMarker([site.lat, site.lng], {
      radius: 9,
      fillColor: "#a78bfa",
      color: "#5b21b6",
      weight: 2,
      fillOpacity: 0.75
    });

    marker.bindPopup(`
      <strong>${site.name}</strong><br>
      Important from ~${site.year < 0 ? Math.abs(site.year) + " BCE" : site.year + " CE"}<br>
      ${site.description}<br><br>
      <button onclick="zoomToHistorical('${site.name}')" style="padding:6px 12px;cursor:pointer;">
        Zoom into this place
      </button>
    `);

    historicalLayer.addLayer(marker);
  });

  map.on("zoomend", () => {
    refreshMapMarkers();
  });
}

// ---------- Normal map markers ----------
function createCityMarker(city) {
  let radius = 6;
  let color = "#fbbf24";
  if (city.level >= 3) { radius = 9; color = "#f59e0b"; }
  if (city.level >= 4) { radius = 12; color = "#ea580c"; }

  const marker = L.circleMarker([city.lat, city.lng], {
    radius: radius,
    fillColor: color,
    color: "#78350f",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.85
  });

  marker.bindPopup(`
    <strong>${city.name}</strong><br>
    Population: ${Math.floor(city.pop).toLocaleString()}<br>
    Level: ${["", "Village", "Town", "City", "Metropolis"][city.level]}<br>
    ${city.nation ? "Nation: " + city.nation.name : "Independent"}
    ${city.hasHospital ? "<br>🏥 Has Hospital" : ""}
  `);

  marker.on("click", () => {
    state.focus = city;
    state.focusType = "city";
    document.querySelector('[data-tab="focus"]').click();
    renderFocusPanel();
  });

  return marker;
}

function createPersonMarker(human) {
  const color = human.sex === "M" ? "#3b82f6" : "#ec4899";

  const marker = L.circleMarker([human.lat, human.lng], {
    radius: 4,
    fillColor: color,
    color: "#0f172a",
    weight: 1.5,
    opacity: 1,
    fillOpacity: 0.9
  });

  marker.bindPopup(`
    <strong style="color:${color}">${human.name}</strong><br>
    Age: ${human.age}<br>
    Hunger: ${human.hungerLevel} | Thirst: ${human.thirstLevel}<br>
    ${human.livingDescription}
  `);

  marker.on("click", () => {
    state.focus = human;
    state.focusType = "person";
    document.querySelector('[data-tab="focus"]').click();
    renderFocusPanel();
  });

  return marker;
}

function createHospitalMarker(city) {
  const marker = L.marker([city.lat + 0.015, city.lng + 0.015], {
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

function refreshMapMarkers() {
  if (!map || cityDiveActive) return;

  const zoom = map.getZoom();
  cityLayer.clearLayers();
  peopleLayer.clearLayers();
  hospitalLayer.clearLayers();

  state.cities.forEach(city => {
    cityLayer.addLayer(createCityMarker(city));
  });

  if (zoom >= 6) {
    state.cities.forEach(city => {
      if (city.hasHospital) {
        hospitalLayer.addLayer(createHospitalMarker(city));
      }
    });
  }

  if (zoom >= 9) {
    const alive = state.humans.filter(h => h.alive);
    const maxPeople = zoom >= 12 ? 450 : 200;
    alive.slice(0, maxPeople).forEach(h => {
      peopleLayer.addLayer(createPersonMarker(h));
    });
  }
}

// ========== CITY DIVE MODE ==========
function enterCityDive(siteName) {
  const data = CITY_DIVE_DATA[siteName];
  if (!data) return;

  cityDiveActive = true;
  diveCity = siteName;

  // Jump time to the thriving period
  state.year = data.year;
  state.era = getEra(state.year);
  TECH_TREE.forEach(t => {
    state.tech[t.id] = state.year >= t.year;
  });
  document.getElementById("timeline").value = state.year;
  document.getElementById("timelineLabel").textContent =
    state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";

  // Hide normal UI
  document.querySelector(".timeline-bar").style.display = "none";
  document.querySelector(".add-bar").style.display = "none";
  document.querySelector(".god-panel").style.display = "none";
  document.getElementById("sidebar").style.display = "none";

  // Create elements if needed
  if (!diveCanvas) {
    diveCanvas = document.createElement("canvas");
    diveCanvas.id = "cityDiveCanvas";
    diveCanvas.style.cssText = "position:fixed;inset:0;z-index:3000;background:#1a2e1a;cursor:crosshair;";
    document.body.appendChild(diveCanvas);
    diveCtx = diveCanvas.getContext("2d");

    const exitBtn = document.createElement("button");
    exitBtn.id = "exitDiveBtn";
    exitBtn.textContent = "← Exit City View";
    exitBtn.style.cssText = `
      position:fixed;top:16px;left:16px;z-index:3001;
      background:#1e293b;color:white;border:1px solid #334155;
      padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.9rem;
    `;
    exitBtn.onclick = exitCityDive;
    document.body.appendChild(exitBtn);

    const title = document.createElement("div");
    title.id = "diveTitle";
    title.style.cssText = `
      position:fixed;top:16px;left:50%;transform:translateX(-50%);
      z-index:3001;background:rgba(15,23,42,0.92);color:#fbbf24;
      padding:10px 24px;border-radius:10px;font-weight:600;font-size:1.1rem;
      border:1px solid #334155;text-align:center;max-width:90%;
    `;
    document.body.appendChild(title);

    // Bottom info bar
    diveInfoBar = document.createElement("div");
    diveInfoBar.id = "diveInfoBar";
    diveInfoBar.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:3001;
      background:rgba(15,23,42,0.96);border-top:1px solid #334155;
      padding:12px 20px;color:white;font-size:0.9rem;
      display:none;align-items:center;justify-content:space-between;gap:12px;
    `;
    document.body.appendChild(diveInfoBar);
  }

  document.getElementById("diveTitle").innerHTML = `
    ${data.title}<br>
    <span style="font-size:0.75rem;color:#94a3b8;font-weight:400">${data.description}</span>
  `;

  diveCanvas.style.display = "block";
  document.getElementById("exitDiveBtn").style.display = "block";
  document.getElementById("diveTitle").style.display = "block";
  diveInfoBar.style.display = "none";

  generateDiveScene(data);
  resizeDiveCanvas();
  startDiveLoop();
}

function exitCityDive() {
  cityDiveActive = false;
  if (diveAnimationId) cancelAnimationFrame(diveAnimationId);

  if (diveCanvas) diveCanvas.style.display = "none";
  const exitBtn = document.getElementById("exitDiveBtn");
  const title = document.getElementById("diveTitle");
  if (exitBtn) exitBtn.style.display = "none";
  if (title) title.style.display = "none";
  if (diveInfoBar) diveInfoBar.style.display = "none";

  document.querySelector(".timeline-bar").style.display = "flex";
  document.querySelector(".add-bar").style.display = "flex";
  document.querySelector(".god-panel").style.display = "block";
  document.getElementById("sidebar").style.display = "flex";

  updateUI();
  refreshMapMarkers();
}

function resizeDiveCanvas() {
  if (!diveCanvas) return;
  diveCanvas.width = window.innerWidth;
  diveCanvas.height = window.innerHeight;
}

function makeDiveName(sex) {
  const maleFirst = ["Marcus","Lucius","Gaius","Titus","Quintus","Appius","Publius"];
  const femaleFirst = ["Julia","Livia","Cornelia","Aurelia","Octavia","Flavia","Claudia"];
  const last = ["Maximus","Severus","Varus","Cato","Flaccus","Rufus","Nero"];
  const first = sex === "M" ? maleFirst : femaleFirst;
  return first[Math.floor(Math.random() * first.length)] + " " + last[Math.floor(Math.random() * last.length)];
}

function generateDiveScene(data) {
  divePeople = [];
  diveTrees = [];
  diveBuildings = [];

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Buildings
  for (let i = 0; i < 18; i++) {
    diveBuildings.push({
      x: 60 + Math.random() * (w - 140),
      y: 110 + Math.random() * (h - 260),
      w: 36 + Math.random() * 70,
      h: 32 + Math.random() * 55,
      type: Math.random() > 0.72 ? "temple" : "house"
    });
  }

  // Trees
  for (let i = 0; i < 38; i++) {
    diveTrees.push({
      x: Math.random() * w,
      y: 90 + Math.random() * (h - 180),
      size: 11 + Math.random() * 17
    });
  }

  // Adults
  for (let i = 0; i < 52; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    const roleList = sex === "M" ? data.maleRoles : data.femaleRoles;
    divePeople.push({
      x: 50 + Math.random() * (w - 100),
      y: 130 + Math.random() * (h - 240),
      sex: sex,
      type: "adult",
      role: roleList[Math.floor(Math.random() * roleList.length)],
      name: makeDiveName(sex),
      age: 18 + Math.floor(Math.random() * 40),
      spouse: null,
      children: 0,
      married: false,
      glowTimer: 0,
      goingHome: false,
      homeX: null,
      homeY: null,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5
    });
  }

  // Children
  for (let i = 0; i < 18; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 50 + Math.random() * (w - 100),
      y: 130 + Math.random() * (h - 240),
      sex: sex,
      type: "child",
      role: "Child",
      name: "Young " + (sex === "M" ? "Boy" : "Girl"),
      age: 3 + Math.floor(Math.random() * 10),
      spouse: null,
      children: 0,
      married: false,
      glowTimer: 0,
      goingHome: false,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8
    });
  }

  // Babies
  for (let i = 0; i < 12; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 50 + Math.random() * (w - 100),
      y: 130 + Math.random() * (h - 240),
      sex: sex,
      type: "baby",
      role: "Baby",
      name: sex === "M" ? "Baby Boy" : "Baby Girl",
      age: Math.floor(Math.random() * 2),
      spouse: null,
      children: 0,
      married: false,
      glowTimer: 0,
      goingHome: false,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3
    });
  }
}

function drawDiveScene() {
  if (!diveCtx || !cityDiveActive) return;

  const w = diveCanvas.width;
  const h = diveCanvas.height;
  const ctx = diveCtx;

  // Ground
  ctx.fillStyle = "#243c24";
  ctx.fillRect(0, 0, w, h);

  // Roads
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.52);
  ctx.lineTo(w, h * 0.52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.38, 0);
  ctx.lineTo(w * 0.38, h);
  ctx.stroke();

  // Buildings
  diveBuildings.forEach(b => {
    ctx.fillStyle = b.type === "temple" ? "#a78bfa" : "#94a3b8";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(b.x - 5, b.y);
    ctx.lineTo(b.x + b.w / 2, b.y - 16);
    ctx.lineTo(b.x + b.w + 5, b.y);
    ctx.fill();
  });

  // Trees
  diveTrees.forEach(t => {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(t.x - 3, t.y, 6, t.size * 0.55);
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.arc(t.x, t.y - 5, t.size * 0.65, 0, Math.PI * 2);
    ctx.fill();
  });

  // People + marriage logic
  for (let i = 0; i < divePeople.length; i++) {
    const p = divePeople[i];

    // Movement
    if (!p.goingHome) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 25 || p.x > w - 25) p.vx *= -1;
      if (p.y < 90 || p.y > h - 30) p.vy *= -1;
    } else {
      const dx = p.homeX - p.x;
      const dy = p.homeY - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        p.x += (dx / dist) * 1.1;
        p.y += (dy / dist) * 1.1;
      }
    }

    if (p.glowTimer > 0) p.glowTimer--;

    // Marriage chance when adults of opposite sex get close
    if (p.type === "adult" && !p.married && Math.random() < 0.0018) {
      for (let j = i + 1; j < divePeople.length; j++) {
        const other = divePeople[j];
        if (other.type !== "adult" || other.married || other.sex === p.sex) continue;

        const dist = Math.hypot(p.x - other.x, p.y - other.y);
        if (dist < 26 && Math.random() < 0.5) {
          // Get married
          p.married = true;
          other.married = true;
          p.spouse = other.name;
          other.spouse = p.name;
          p.glowTimer = 100;
          other.glowTimer = 100;

          // Go home together
          const homeX = 80 + Math.random() * (w - 160);
          const homeY = 140 + Math.random() * (h - 280);
          p.goingHome = true;
          other.goingHome = true;
          p.homeX = homeX;
          p.homeY = homeY;
          other.homeX = homeX;
          other.homeY = homeY;

          // Often have a baby
          if (Math.random() < 0.7) {
            p.children++;
            other.children++;
            const babySex = Math.random() < 0.5 ? "M" : "F";
            divePeople.push({
              x: homeX + (Math.random() - 0.5) * 18,
              y: homeY + (Math.random() - 0.5) * 18,
              sex: babySex,
              type: "baby",
              role: "Baby",
              name: babySex === "M" ? "Baby Boy" : "Baby Girl",
              age: 0,
              spouse: null,
              children: 0,
              married: false,
              glowTimer: 0,
              goingHome: false,
              vx: 0,
              vy: 0
            });
          }
          break;
        }
      }
    }

    // Draw person
    if (p.type === "adult") {
      const color = p.sex === "M" ? "#3b82f6" : "#ec4899";

      // Yellow marriage glow
      if (p.glowTimer > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y - 12, 17, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${p.glowTimer / 100 * 0.5})`;
        ctx.fill();
      }

      // Body
      ctx.fillStyle = color;
      ctx.fillRect(p.x - 5, p.y - 17, 10, 15);
      // Head
      ctx.beginPath();
      ctx.arc(p.x, p.y - 23, 6.5, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillRect(p.x - 5, p.y - 2, 3.5, 9);
      ctx.fillRect(p.x + 1.5, p.y - 2, 3.5, 9);
    } else if (p.type === "child") {
      ctx.fillStyle = p.sex === "M" ? "#60a5fa" : "#f472b6";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Baby – smaller and lighter
      ctx.fillStyle = p.sex === "M" ? "#93c5fd" : "#f9a8d4";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function showDivePersonInfo(p) {
  if (!diveInfoBar) return;

  const status = p.married ? `Married to ${p.spouse}` : "Single";
  const kids = p.children > 0 ? `${p.children} child${p.children > 1 ? "ren" : ""}` : "No children";
  const typeLabel = p.type === "adult" ? "Adult" : p.type === "child" ? "Child" : "Baby";
  const color = p.sex === "M" ? "#3b82f6" : "#ec4899";

  diveInfoBar.innerHTML = `
    <div>
      <strong style="color:${color}">${p.name}</strong>
      &nbsp;•&nbsp; ${typeLabel}
      &nbsp;•&nbsp; Age ${p.age}
      &nbsp;•&nbsp; Role: <strong>${p.role}</strong>
      &nbsp;•&nbsp; ${status}
      &nbsp;•&nbsp; ${kids}
    </div>
    <button onclick="document.getElementById('diveInfoBar').style.display='none'"
            style="background:#334155;border:none;color:white;padding:5px 12px;border-radius:5px;cursor:pointer;">
      Close
    </button>
  `;
  diveInfoBar.style.display = "flex";
}

function startDiveLoop() {
  function loop() {
    if (!cityDiveActive) return;
    drawDiveScene();
    diveAnimationId = requestAnimationFrame(loop);
  }
  loop();
}

// Click people in dive mode → show bottom info bar
document.addEventListener("click", (e) => {
  if (!cityDiveActive || !diveCanvas) return;
  if (e.target.id === "exitDiveBtn" || e.target.closest("#diveTitle") || e.target.closest("#diveInfoBar")) return;

  const rect = diveCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (const p of divePeople) {
    const dist = Math.hypot(p.x - mx, p.y - my);
    const hitRadius = p.type === "adult" ? 18 : p.type === "child" ? 12 : 9;
    if (dist < hitRadius) {
      showDivePersonInfo(p);
      break;
    }
  }
});

window.addEventListener("resize", () => {
  if (cityDiveActive) resizeDiveCanvas();
});

// ---------- Historical zoom ----------
window.zoomToHistorical = function (name) {
  const site = HISTORICAL_SITES.find(s => s.name === name);
  if (!site) return;

  if (map) {
    map.setView([site.lat, site.lng], 8);
  }

  setTimeout(() => {
    enterCityDive(name);
  }, 700);
};

// ---------- UI ----------
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

  document.getElementById("envList").innerHTML = `
    <div class="res-item"><span>Food</span><span>${Math.floor(state.resources.food)}</span></div>
    <div class="res-item"><span>Wood</span><span>${Math.floor(state.resources.wood)}</span></div>
    <div class="res-item"><span>Stone</span><span>${Math.floor(state.resources.stone)}</span></div>
    <div class="res-item"><span>Energy</span><span>${Math.floor(state.resources.energy)}</span></div>
    <div class="res-item"><span>Knowledge</span><span>${Math.floor(state.resources.knowledge)}</span></div>
  `;

  let techHtml = "";
  TECH_TREE.forEach(t => {
    const y = t.year < 0 ? Math.abs(t.year) + " BCE" : t.year + " CE";
    const cls = state.tech[t.id] ? "unlocked" : "locked";
    const mark = state.tech[t.id] ? "✓" : "○";
    techHtml += `<div class="tech-item ${cls}"><span>${mark} ${t.name}</span><span>${y}</span></div>`;
  });
  document.getElementById("techList").innerHTML = techHtml;

  const alive = state.humans.filter(h => h.alive);
  alive.sort((a, b) => b.age - a.age);
  const sample = alive.slice(0, 18);

  let peopleHtml = "";
  if (sample.length === 0) {
    peopleHtml = '<div style="color:var(--muted)">No living people right now.</div>';
  } else {
    sample.forEach(h => {
      const color = h.sex === "M" ? "#3b82f6" : "#ec4899";
      peopleHtml += `
        <div class="person-card" onclick="focusPerson(${h.id})">
          <div class="name" style="color:${color}">${h.name}</div>
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
        Click a city, person, or purple historical marker.<br>
        Click “Zoom into this place” on Rome, Egypt, Athens etc. to enter City Dive mode.
      </div>`;
    return;
  }

  if (state.focusType === "person") {
    const h = state.focus;
    const color = h.sex === "M" ? "#3b82f6" : "#ec4899";
    panel.innerHTML = `
      <div style="font-size:1.15rem;font-weight:600;color:${color};margin-bottom:8px">${h.name}</div>
      <div class="res-item"><span>Age</span><span>${h.age}</span></div>
      <div class="res-item"><span>Hunger</span><span>${h.hungerLevel}</span></div>
      <div class="res-item"><span>Thirst</span><span>${h.thirstLevel}</span></div>
      <div class="res-item"><span>Health</span><span>${Math.round(h.health * 100)}%</span></div>
      <div class="res-item"><span>Job</span><span>${h.job}</span></div>
      <div class="res-item"><span>Living</span><span>${h.livingDescription}</span></div>
      <div class="res-item"><span>Spouse</span><span>${h.spouse && h.spouse.alive ? h.spouse.name : "None"}</span></div>
      <div class="res-item"><span>Children</span><span>${h.children.filter(c => c.alive).length}</span></div>
      <button onclick="zoomToPerson(${h.id})" style="width:100%;margin-top:8px;background:var(--accent);border:none;color:white;padding:8px;border-radius:6px;cursor:pointer">Zoom to Person</button>
    `;
  } else if (state.focusType === "city") {
    const c = state.focus;
    panel.innerHTML = `
      <div style="font-size:1.15rem;font-weight:600;color:#fbbf24;margin-bottom:6px">${c.name}</div>
      <div class="res-item"><span>Population</span><span>${Math.floor(c.pop).toLocaleString()}</span></div>
      <div class="res-item"><span>Level</span><span>${["", "Village", "Town", "City", "Metropolis"][c.level]}</span></div>
      <div class="res-item"><span>Nation</span><span>${c.nation ? c.nation.name : "Independent"}</span></div>
      <div class="res-item"><span>Hospital</span><span>${c.hasHospital ? "Yes 🏥" : "No"}</span></div>
      <button onclick="zoomToCity()" style="width:100%;margin-top:8px;background:var(--accent);border:none;color:white;padding:8px;border-radius:6px;cursor:pointer">Zoom to City</button>
    `;
  }
}

// Global helpers
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
  map.setView([state.focus.lat, state.focus.lng], 10);
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
  if (tab.id === "btnCollapseSidebar") return;
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".tab-content").forEach(c => (c.style.display = "none"));
    document.getElementById("tab-" + tab.dataset.tab).style.display = "block";
  };
});

document.getElementById("btnCollapseSidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
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
  refreshMapMarkers();
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
    if (!cityDiveActive) tick();
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
