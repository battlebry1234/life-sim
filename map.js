// map.js
// ===================== FULL FILE – Weather + House Protection =====================

let map, cityLayer, peopleLayer, hospitalLayer, historicalLayer;
let cityDiveActive = false;
let diveCanvas = null, diveCtx = null, diveCity = null;
let divePeople = [], diveTrees = [], diveBuildings = [], diveConstruction = [];
let diveResources = [];
let diveAnimationId = null, diveInfoBar = null;
let diveWarTimer = 0;
let diveFrame = 0;

// ===================== WEATHER & SURVIVAL =====================
let weather = {
  season: "summer",
  seasonTimer: 0,
  seasonLength: 2200,
  rain: 0,
  heat: 0.4,
  cold: 0
};

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];

function updateWeather() {
  weather.seasonTimer++;
  if (weather.seasonTimer >= weather.seasonLength) {
    weather.seasonTimer = 0;
    const idx = SEASON_ORDER.indexOf(weather.season);
    weather.season = SEASON_ORDER[(idx + 1) % 4];
    if (typeof logEvent === "function") {
      logEvent("weather", weather.season.charAt(0).toUpperCase() + weather.season.slice(1) + " arrives.");
    }
  }

  // Rain comes and goes
  if (Math.random() < 0.0018) weather.rain = 0.35 + Math.random() * 0.55;
  weather.rain *= 0.991;
  if (weather.rain < 0.04) weather.rain = 0;

  if (weather.season === "summer") {
    weather.heat = 0.7 + Math.random() * 0.25;
    weather.cold = 0;
  } else if (weather.season === "winter") {
    weather.cold = 0.65 + Math.random() * 0.3;
    weather.heat = 0;
  } else {
    weather.heat = 0.3;
    weather.cold = 0.25;
  }
}

function isSheltered(p) {
  if (!p.house) return false;
  const hx = p.house.x + p.house.w / 2;
  const hy = p.house.y + p.house.h / 2;
  return Math.hypot(p.x - hx, p.y - hy) < 48;
}

function applySurvival() {
  divePeople.forEach(p => {
    if (p.type === "baby" || p.state === "dead") return;

    if (p.hunger === undefined) p.hunger = 65 + Math.random() * 30;
    if (p.thirst === undefined) p.thirst = 65 + Math.random() * 30;
    if (p.health === undefined) p.health = 80 + Math.random() * 18;

    let hungerDrain = 0.038;
    let thirstDrain = 0.042;

    // Season pressure
    if (weather.season === "winter") hungerDrain *= 1.45;
    if (weather.season === "summer") thirstDrain *= 1.5;

    // HOUSE PROTECTION – big difference when inside
    const sheltered = isSheltered(p);
    if (sheltered) {
      hungerDrain *= 0.45;   // much slower drain inside
      thirstDrain *= 0.45;
      // mild health recovery when sheltered
      if (p.health < 95) p.health += 0.015;
    } else {
      // exposure damage outside in extreme weather
      if (weather.cold > 0.6) p.health -= 0.04;
      if (weather.heat > 0.75) p.health -= 0.03;
      if (weather.rain > 0.5) p.health -= 0.015;
    }

    // Rain slightly helps thirst when outside
    if (!sheltered && weather.rain > 0.3) thirstDrain *= 0.65;

    p.hunger -= hungerDrain;
    p.thirst -= thirstDrain;

    // Death
    if (p.hunger <= 0 || p.thirst <= 0 || p.health <= 0) {
      p.state = "dead";
      p.alive = false;
      if (p.house) p.house.owner = null;
      if (p.carry) {
        diveResources.push({ x: p.x, y: p.y, type: p.carry });
        p.carry = null;
      }
    }

    // Seek shelter in bad weather
    if (!sheltered && p.state === "idle" && p.house &&
        (weather.cold > 0.55 || weather.heat > 0.7 || weather.rain > 0.45)) {
      p.state = "seekingShelter";
      p.target = p.house;
      p.progress = 0;
      p.maxProgress = 200;
    }

    // Eat when hungry
    if (p.hunger < 32 && p.state === "idle") {
      const food = diveResources.find(r => r.type === "food");
      if (food && Math.hypot(p.x - food.x, p.y - food.y) < 110) {
        p.state = "eating";
        p.target = food;
        p.progress = 0;
        p.maxProgress = 40;
      }
    }
  });

  if (diveFrame % 90 === 0) {
    divePeople = divePeople.filter(p => p.state !== "dead");
  }
}

function steerAround(p, goalX, goalY) {
  let vx = (goalX - p.x) * 0.017;
  let vy = (goalY - p.y) * 0.017;

  diveBuildings.forEach(b => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const dist = Math.hypot(p.x - cx, p.y - cy);
    if (dist < 48 && dist > 6) {
      vx += (p.x - cx) / dist * 0.35;
      vy += (p.y - cy) / dist * 0.35;
    }
  });

  // slow down in rain / winter
  let speedMod = 1;
  if (weather.rain > 0.4) speedMod *= 0.75;
  if (weather.season === "winter") speedMod *= 0.7;
  p.vx = vx * speedMod;
  p.vy = vy * speedMod;
}

// ===================== HISTORICAL DATA =====================

const HISTORICAL_SITES = [
  { name: "Rome", lat: 41.9028, lng: 12.4964, year: -50, description: "Heart of the Roman Empire." },
  { name: "Memphis (Egypt)", lat: 29.8447, lng: 31.2508, year: -2500, description: "Age of the Pyramids." },
  { name: "Athens", lat: 37.9838, lng: 23.7275, year: -450, description: "Golden Age of Greece." },
  { name: "Uruk", lat: 31.3222, lng: 45.6361, year: -3500, description: "First great city of Mesopotamia." },
  { name: "Anyang", lat: 36.0996, lng: 114.3460, year: -1200, description: "Shang Dynasty capital." },
  { name: "Caral", lat: -10.8917, lng: -77.5208, year: -2200, description: "Ancient Andes civilization." }
];

const CITY_DIVE_DATA = {
  "Rome": {
    year: -50, title: "Rome – Heart of the Empire",
    description: "The Forum is alive with citizens, soldiers and merchants.",
    ground: "#3d4a3a",
    maleRoles: ["Legionary", "Builder", "Builder", "Farmer", "Woodcutter", "Guard", "Merchant"],
    femaleRoles: ["Homemaker", "Childcare", "Merchant", "Priestess", "Weaver"],
    landmarks: "roman"
  },
  "Memphis (Egypt)": {
    year: -2500, title: "Memphis – Age of the Pyramids",
    description: "Sandy desert. Workers haul stone for the great pyramids.",
    ground: "#c2a36b",
    maleRoles: ["Builder", "Builder", "Stonehauler", "Stonehauler", "Soldier", "Farmer", "Overseer"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver"],
    landmarks: "egypt"
  },
  "Athens": {
    year: -450, title: "Athens – Golden Age",
    description: "The agora bustles beneath the Acropolis.",
    ground: "#3a4a3d",
    maleRoles: ["Citizen", "Soldier", "Builder", "Builder", "Woodcutter", "Farmer", "Merchant"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Merchant"],
    landmarks: "greece"
  },
  "Uruk": {
    year: -3500, title: "Uruk – First Great City",
    description: "Mud-brick temples rise in the earliest urban center.",
    ground: "#8b7355",
    maleRoles: ["Guard", "Farmer", "Builder", "Builder", "Woodcutter", "Trader"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver"],
    landmarks: "mesopotamia"
  },
  "Anyang": {
    year: -1200, title: "Anyang – Shang Capital",
    description: "Bronze workers and diviners serve the royal court.",
    ground: "#3d4a3a",
    maleRoles: ["Soldier", "Builder", "Builder", "Farmer", "Woodcutter", "Noble"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Noble"],
    landmarks: "china"
  },
  "Caral": {
    year: -2200, title: "Caral – Ancient Andes",
    description: "Pyramid builders of the Norte Chico civilization.",
    ground: "#6b5c45",
    maleRoles: ["Builder", "Builder", "Farmer", "Stonehauler", "Guard"],
    femaleRoles: ["Homemaker", "Childcare", "Farmer", "Weaver"],
    landmarks: "andes"
  }
};

// ===================== MAP =====================

function initMap() {
  map = L.map("map", { center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 18, zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap', maxZoom: 19
  }).addTo(map);

  cityLayer = L.layerGroup().addTo(map);
  peopleLayer = L.layerGroup().addTo(map);
  hospitalLayer = L.layerGroup().addTo(map);
  historicalLayer = L.layerGroup().addTo(map);

  HISTORICAL_SITES.forEach(site => {
    const marker = L.circleMarker([site.lat, site.lng], {
      radius: 9, fillColor: "#a78bfa", color: "#5b21b6", weight: 2, fillOpacity: 0.75
    });
    marker.bindPopup(`
      <strong>${site.name}</strong><br>${site.description}<br><br>
      <button onclick="zoomToHistorical('${site.name}')" style="padding:6px 12px;cursor:pointer;">Zoom into this place</button>
    `);
    historicalLayer.addLayer(marker);
  });
  map.on("zoomend", refreshMapMarkers);
}

function createCityMarker(city) {
  let radius = 6, color = "#fbbf24";
  if (city.level >= 3) { radius = 9; color = "#f59e0b"; }
  if (city.level >= 4) { radius = 12; color = "#ea580c"; }
  const marker = L.circleMarker([city.lat, city.lng], {
    radius, fillColor: color, color: "#78350f", weight: 2, opacity: 1, fillOpacity: 0.85
  });
  marker.bindPopup(`
    <strong>${city.name}</strong><br>Population: ${Math.floor(city.pop).toLocaleString()}<br>
    Level: ${["","Village","Town","City","Metropolis"][city.level]}<br>
    ${city.nation ? "Nation: " + city.nation.name : "Independent"}
    ${city.hasHospital ? "<br>🏥 Has Hospital" : ""}
  `);
  marker.on("click", () => {
    state.focus = city; state.focusType = "city";
    document.querySelector('[data-tab="focus"]').click();
    renderFocusPanel();
  });
  return marker;
}

function createPersonMarker(human) {
  const color = human.sex === "M" ? "#3b82f6" : "#ec4899";
  const marker = L.circleMarker([human.lat, human.lng], {
    radius: 4, fillColor: color, color: "#0f172a", weight: 1.5, opacity: 1, fillOpacity: 0.9
  });
  marker.bindPopup(`
    <strong style="color:${color}">${human.name}</strong><br>
    Age: ${human.age}<br>Hunger: ${human.hungerLevel} | Thirst: ${human.thirstLevel}<br>
    ${human.livingDescription}
  `);
  marker.on("click", () => {
    state.focus = human; state.focusType = "person";
    document.querySelector('[data-tab="focus"]').click();
    renderFocusPanel();
  });
  return marker;
}

function createHospitalMarker(city) {
  return L.marker([city.lat + 0.015, city.lng + 0.015], {
    icon: L.divIcon({ className: "hospital-icon", html: "🏥", iconSize: [22, 22], iconAnchor: [11, 11] })
  }).bindPopup(`<strong>Hospital</strong><br>${city.name}`);
}

function refreshMapMarkers() {
  if (!map || cityDiveActive) return;
  const zoom = map.getZoom();
  cityLayer.clearLayers(); peopleLayer.clearLayers(); hospitalLayer.clearLayers();
  state.cities.forEach(c => cityLayer.addLayer(createCityMarker(c)));
  if (zoom >= 6) state.cities.forEach(c => { if (c.hasHospital) hospitalLayer.addLayer(createHospitalMarker(c)); });
  if (zoom >= 9) {
    const alive = state.humans.filter(h => h.alive);
    alive.slice(0, zoom >= 12 ? 450 : 200).forEach(h => peopleLayer.addLayer(createPersonMarker(h)));
  }
}

// ===================== CITY DIVE =====================

function enterCityDive(siteName) {
  const data = CITY_DIVE_DATA[siteName];
  if (!data) return;

  cityDiveActive = true;
  diveCity = siteName;
  diveWarTimer = 650 + Math.random() * 700;
  diveFrame = 0;

  state.year = data.year;
  state.era = getEra(state.year);
  TECH_TREE.forEach(t => state.tech[t.id] = state.year >= t.year);
  document.getElementById("timeline").value = state.year;
  document.getElementById("timelineLabel").textContent = state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";

  document.querySelector(".timeline-bar").style.display = "none";
  document.querySelector(".god-panel").style.display = "none";
  document.getElementById("sidebar").style.display = "none";

  const addBar = document.getElementById("addBar");
  if (addBar) {
    addBar.style.display = "flex";
    addBar.style.bottom = "18px";
    addBar.style.zIndex = "3200";
  }

  if (!diveCanvas) {
    diveCanvas = document.createElement("canvas");
    diveCanvas.id = "cityDiveCanvas";
    diveCanvas.style.cssText = "position:fixed;inset:0;z-index:3000;cursor:crosshair;";
    document.body.appendChild(diveCanvas);
    diveCtx = diveCanvas.getContext("2d");

    const exitBtn = document.createElement("button");
    exitBtn.id = "exitDiveBtn";
    exitBtn.textContent = "← Exit City View";
    exitBtn.style.cssText = `position:fixed;top:16px;left:16px;z-index:3200;background:#1e293b;color:white;border:1px solid #334155;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.9rem;`;
    exitBtn.onclick = exitCityDive;
    document.body.appendChild(exitBtn);

    const title = document.createElement("div");
    title.id = "diveTitle";
    title.style.cssText = `position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:3200;background:rgba(15,23,42,0.92);color:#fbbf24;padding:10px 24px;border-radius:10px;font-weight:600;font-size:1.1rem;border:1px solid #334155;text-align:center;max-width:90%;`;
    document.body.appendChild(title);

    diveInfoBar = document.createElement("div");
    diveInfoBar.id = "diveInfoBar";
    diveInfoBar.style.cssText = `position:fixed;bottom:70px;left:0;right:0;z-index:3200;background:rgba(15,23,42,0.96);border-top:1px solid #334155;padding:12px 20px;color:white;font-size:0.9rem;display:none;align-items:center;justify-content:space-between;gap:12px;`;
    document.body.appendChild(diveInfoBar);
  }

  document.getElementById("diveTitle").innerHTML = `${data.title}<br><span style="font-size:0.75rem;color:#94a3b8;font-weight:400">${data.description}</span>`;
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
  document.getElementById("exitDiveBtn").style.display = "none";
  document.getElementById("diveTitle").style.display = "none";
  if (diveInfoBar) diveInfoBar.style.display = "none";

  document.querySelector(".timeline-bar").style.display = "flex";
  document.querySelector(".god-panel").style.display = "block";
  document.getElementById("sidebar").style.display = "flex";

  const addBar = document.getElementById("addBar");
  if (addBar) {
    addBar.style.bottom = "52px";
    addBar.style.zIndex = "1000";
  }

  updateUI();
  refreshMapMarkers();
}

function resizeDiveCanvas() {
  if (!diveCanvas) return;
  diveCanvas.width = window.innerWidth;
  diveCanvas.height = window.innerHeight;
}

function makeDiveName(sex) {
  const m = ["Marcus","Lucius","Gaius","Titus","Quintus","Appius","Publius"];
  const f = ["Julia","Livia","Cornelia","Aurelia","Octavia","Flavia","Claudia"];
  const last = ["Maximus","Severus","Varus","Cato","Flaccus","Rufus","Nero"];
  return (sex === "M" ? m : f)[Math.floor(Math.random()*7)] + " " + last[Math.floor(Math.random()*7)];
}

function generateDiveScene(data) {
  divePeople = [];
  diveTrees = [];
  diveBuildings = [];
  diveConstruction = [];
  diveResources = [];

  const w = window.innerWidth;
  const h = window.innerHeight;

  for (let i = 0; i < 13; i++) {
    diveBuildings.push({
      x: 90 + Math.random() * (w - 200),
      y: 140 + Math.random() * (h - 320),
      w: 42 + Math.random() * 45,
      h: 36 + Math.random() * 35,
      type: "house", owner: null
    });
  }

  if (data.landmarks === "egypt") {
    diveBuildings.push({ x: w*0.12, y: h*0.32, w: 100, h: 80, type: "pyramid", owner: null });
    diveBuildings.push({ x: w*0.26, y: h*0.40, w: 70, h: 55, type: "pyramid", owner: null });
    diveBuildings.push({ x: w*0.58, y: h*0.52, w: 75, h: 38, type: "sphinx", owner: null });
  } else if (data.landmarks === "roman" || data.landmarks === "greece") {
    diveBuildings.push({ x: w*0.38, y: h*0.28, w: 120, h: 55, type: "temple", owner: null });
  }

  const treeCount = data.landmarks === "egypt" ? 7 : 20;
  for (let i = 0; i < treeCount; i++) {
    diveTrees.push({
      x: 40 + Math.random() * (w - 80),
      y: 120 + Math.random() * (h - 240),
      size: 13 + Math.random() * 12,
      health: 100
    });
  }

  for (let i = 0; i < 40; i++) {
    const sex = Math.random() < 0.55 ? "M" : "F";
    let role;
    if (sex === "M" && Math.random() < 0.35) role = "Builder";
    else {
      const list = sex === "M" ? data.maleRoles : data.femaleRoles;
      role = list[Math.floor(Math.random() * list.length)];
    }

    const p = {
      x: 80 + Math.random() * (w - 160),
      y: 160 + Math.random() * (h - 300),
      sex, type: "adult", role,
      name: makeDiveName(sex),
      age: 18 + Math.floor(Math.random() * 34),
      spouse: null, children: 0, married: false,
      glowTimer: 0, house: null,
      hunger: 60 + Math.random() * 35,
      thirst: 60 + Math.random() * 35,
      health: 78 + Math.random() * 20,
      state: "idle",
      target: null,
      carry: null,
      toolAngle: 0,
      progress: 0,
      maxProgress: 0,
      vx: 0, vy: 0,
      idleTimer: 25 + Math.random() * 70
    };

    const free = diveBuildings.find(b => b.type === "house" && !b.owner);
    if (free && Math.random() < 0.42) {
      free.owner = p;
      p.house = free;
    }

    if (["Legionary","Soldier","Guard"].includes(role)) {
      p.x = w * 0.68 + (Math.random()-0.5)*85;
      p.y = h * 0.62 + (Math.random()-0.5)*55;
    }

    divePeople.push(p);
  }

  for (let i = 0; i < 10; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 80 + Math.random()*(w-160), y: 160 + Math.random()*(h-300),
      sex, type: "child", role: "Child", name: "Young " + (sex==="M"?"Boy":"Girl"),
      age: 3+Math.floor(Math.random()*9), spouse:null, children:0, married:false,
      glowTimer:0, house:null, hunger:80, thirst:80, health:90,
      state:"idle", carry:null, toolAngle:0, progress:0,
      vx:0, vy:0, idleTimer: 25+Math.random()*80
    });
  }
  for (let i = 0; i < 6; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 80 + Math.random()*(w-160), y: 160 + Math.random()*(h-300),
      sex, type: "baby", role: "Baby", name: sex==="M"?"Baby Boy":"Baby Girl",
      age:0, spouse:null, children:0, married:false, glowTimer:0, house:null,
      hunger:90, thirst:90, health:95,
      state:"idle", carry:null, toolAngle:0, progress:0, vx:0, vy:0, idleTimer:999
    });
  }
}

function drawDiveScene() {
  if (!diveCtx || !cityDiveActive) return;
  const w = diveCanvas.width, h = diveCanvas.height;
  const ctx = diveCtx;
  const data = CITY_DIVE_DATA[diveCity];
  diveFrame++;

  // Ground
  ctx.fillStyle = data.ground || "#243c24";
  ctx.fillRect(0, 0, w, h);

  // Road
  ctx.strokeStyle = data.landmarks === "egypt" ? "#a89060" : "#475569";
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(0, h*0.55); ctx.lineTo(w, h*0.55); ctx.stroke();

  // Buildings
  diveBuildings.forEach(b => {
    if (b.type === "pyramid") {
      ctx.fillStyle = "#d4b483";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y+b.h);
      ctx.lineTo(b.x+b.w/2, b.y);
      ctx.lineTo(b.x+b.w, b.y+b.h);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#b8956a"; ctx.stroke();
    } else if (b.type === "sphinx") {
      ctx.fillStyle = "#c9a66b";
      ctx.fillRect(b.x, b.y+12, b.w, b.h-12);
      ctx.beginPath(); ctx.arc(b.x+20, b.y+14, 17, 0, Math.PI*2); ctx.fill();
    } else if (b.type === "temple") {
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#c4b5fd";
      for (let c=0; c<5; c++) ctx.fillRect(b.x+12+c*20, b.y-16, 9, 16);
    } else {
      // House – slightly warmer color if occupied
      ctx.fillStyle = b.owner ? "#a8b4c4" : "#94a3b8";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(b.x-3, b.y); ctx.lineTo(b.x+b.w/2, b.y-13); ctx.lineTo(b.x+b.w+3, b.y); ctx.fill();
      if (b.owner) {
        ctx.fillStyle = "rgba(251,191,36,0.85)";
        ctx.fillRect(b.x+4, b.y+4, 8, 8);
      }
    }
  });

  // Resources
  diveResources.forEach(r => {
    if (r.type === "wood") {
      ctx.fillStyle = "#92400e";
      ctx.fillRect(r.x-6, r.y-3, 12, 6);
    } else if (r.type === "stone") {
      ctx.fillStyle = "#78716c";
      ctx.fillRect(r.x-5, r.y-5, 10, 10);
    } else if (r.type === "food") {
      ctx.fillStyle = "#86efac";
      ctx.beginPath(); ctx.arc(r.x, r.y, 5, 0, Math.PI*2); ctx.fill();
    }
  });

  // Construction sites
  diveConstruction.forEach(c => {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.setLineDash([]);
    const pct = c.progress / c.max;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(c.x, c.y - 16, c.w, 12);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(c.x, c.y - 16, c.w * pct, 12);
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil((c.max - c.progress) / 60) + "s", c.x + c.w/2, c.y - 6);
  });

  // Trees
  diveTrees.forEach(t => {
    if (t.health <= 0) return;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(t.x-3, t.y, 6, t.size*0.5*(t.health/100));
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.arc(t.x, t.y-4, t.size*0.55*(t.health/100), 0, Math.PI*2);
    ctx.fill();
  });

  // ===== WEATHER VISUALS =====
  if (weather.rain > 0.12) {
    ctx.strokeStyle = `rgba(147,197,253,${weather.rain * 0.5})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < weather.rain * 70; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1.5, y + 9);
      ctx.stroke();
    }
  }
  if (weather.cold > 0.5) {
    ctx.fillStyle = `rgba(147,197,253,${(weather.cold - 0.5) * 0.22})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (weather.heat > 0.7) {
    ctx.fillStyle = `rgba(251,191,36,${(weather.heat - 0.7) * 0.14})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Season + weather text
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "right";
  let weatherText = weather.season.charAt(0).toUpperCase() + weather.season.slice(1);
  if (weather.rain > 0.35) weatherText += " • Raining";
  if (weather.cold > 0.6) weatherText += " • Cold";
  if (weather.heat > 0.75) weatherText += " • Hot";
  ctx.fillText(weatherText, w - 18, 38);

  // War trigger
  diveWarTimer--;
  if (diveWarTimer <= 0) {
    diveWarTimer = 750 + Math.random() * 900;
    const fighters = divePeople.filter(p => p.type === "adult" && ["Legionary","Soldier","Guard"].includes(p.role) && p.state === "idle");
    if (fighters.length >= 2) {
      const a = fighters[Math.floor(Math.random()*fighters.length)];
      let b = fighters[Math.floor(Math.random()*fighters.length)];
      if (a !== b) {
        a.state = "fighting"; b.state = "fighting";
        a.target = b; b.target = a;
        a.progress = 0; a.maxProgress = 140;
        b.progress = 0; b.maxProgress = 140;
      }
    }
  }

  // Tick survival + weather
  if (diveFrame % 3 === 0) {
    updateWeather();
    applySurvival();
  }

  // People
  for (let i = 0; i < divePeople.length; i++) {
    const p = divePeople[i];
    if (p.state === "dead") continue;

    if (p.type === "adult") {
      if (p.state === "idle") {
        p.idleTimer--;
        if (p.idleTimer <= 0) {
          if (p.role === "Woodcutter" || (p.role === "Builder" && Math.random() < 0.4)) {
            const tree = diveTrees.find(t => t.health > 28);
            if (tree) {
              p.state = "chopping";
              p.target = tree;
              p.progress = 0;
              p.maxProgress = 105 + Math.random() * 45;
            } else p.idleTimer = 45;
          } else if (p.role === "Stonehauler") {
            p.state = "mining";
            p.target = { x: 120 + Math.random()*(w-240), y: 180 + Math.random()*(h-360) };
            p.progress = 0;
            p.maxProgress = 115 + Math.random() * 45;
          } else if (p.role === "Farmer") {
            p.state = "farming";
            p.target = { x: 100 + Math.random()*(w-200), y: 170 + Math.random()*(h-340) };
            p.progress = 0;
            p.maxProgress = 90 + Math.random() * 40;
          } else if (p.role === "Builder") {
            tryStartBuilding(p, data);
            if (p.state === "idle") p.idleTimer = 35 + Math.random() * 40;
          } else {
            p.vx = (Math.random()-0.5) * 0.11;
            p.vy = (Math.random()-0.5) * 0.11;
            p.idleTimer = 60 + Math.random() * 80;
          }
        }
      }

      // Seeking shelter
      if (p.state === "seekingShelter" && p.house) {
        const hx = p.house.x + p.house.w / 2;
        const hy = p.house.y + p.house.h / 2;
        const dist = Math.hypot(p.x - hx, p.y - hy);
        if (dist > 20) {
          steerAround(p, hx, hy);
        } else {
          p.vx = 0; p.vy = 0;
          p.state = "idle";
          p.idleTimer = 80;
        }
      }

      // Other actions
      if (p.target && ["chopping","mining","farming","building","fighting","eating"].includes(p.state)) {
        let goalX = p.x, goalY = p.y;
        if (p.state === "chopping" && p.target.health !== undefined) {
          goalX = p.target.x; goalY = p.target.y;
        } else if (p.state === "building" && p.target.w) {
          goalX = p.target.x + p.target.w/2;
          goalY = p.target.y + p.target.h/2;
        } else if (p.target.x !== undefined) {
          goalX = p.target.x; goalY = p.target.y;
        }

        const dist = Math.hypot(p.x - goalX, p.y - goalY);
        if (dist > 20) {
          steerAround(p, goalX, goalY);
        } else {
          p.vx = 0; p.vy = 0;

          if (p.state === "chopping") {
            p.toolAngle = Math.sin(diveFrame * 0.22) * 0.9;
            p.progress++;
            if (p.progress >= p.maxProgress) {
              p.target.health = 0;
              diveResources.push({ x: p.target.x, y: p.target.y, type: "wood" });
              diveResources.push({ x: p.target.x+8, y: p.target.y+3, type: "wood" });
              p.state = "idle"; p.target = null; p.idleTimer = 20;
            }
          } else if (p.state === "mining") {
            p.toolAngle = Math.sin(diveFrame * 0.2) * 0.85;
            p.progress++;
            if (p.progress >= p.maxProgress) {
              diveResources.push({ x: p.x, y: p.y, type: "stone" });
              diveResources.push({ x: p.x+7, y: p.y+4, type: "stone" });
              p.state = "idle"; p.target = null; p.idleTimer = 30;
            }
          } else if (p.state === "farming") {
            p.toolAngle = Math.sin(diveFrame * 0.17) * 0.7;
            p.progress++;
            if (p.progress >= p.maxProgress) {
              diveTrees.push({
                x: p.x + (Math.random()-0.5)*22,
                y: p.y + (Math.random()-0.5)*22,
                size: 7 + Math.random()*5,
                health: 100
              });
              if (Math.random() < 0.45) {
                diveResources.push({ x: p.x, y: p.y, type: "food" });
              }
              p.state = "idle"; p.target = null; p.idleTimer = 40;
            }
          } else if (p.state === "building") {
            p.progress++;
            p.target.progress = p.progress;
            if (p.progress >= p.maxProgress) {
              diveBuildings.push({
                x: p.target.x, y: p.target.y,
                w: p.target.w, h: p.target.h,
                type: p.target.buildType, owner: null
              });
              diveConstruction = diveConstruction.filter(c => c !== p.target);
              p.state = "idle"; p.target = null; p.idleTimer = 55;
            }
          } else if (p.state === "fighting") {
            p.progress++;
            if (p.progress >= p.maxProgress) {
              p.state = "idle"; p.target = null; p.idleTimer = 70;
            }
          } else if (p.state === "eating") {
            p.progress++;
            if (p.progress >= p.maxProgress) {
              p.hunger = Math.min(100, p.hunger + 50);
              diveResources = diveResources.filter(r => r !== p.target);
              p.state = "idle"; p.target = null; p.idleTimer = 25;
            }
          }
        }
      }

      // Homemakers prefer house
      if ((p.role === "Homemaker" || p.role === "Childcare") && p.house && p.state === "idle") {
        const hx = p.house.x + p.house.w/2;
        const hy = p.house.y + p.house.h/2;
        if (Math.hypot(p.x - hx, p.y - hy) > 45) {
          steerAround(p, hx, hy);
        }
      }
    }

    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 40 || p.x > w-40) p.vx *= -1;
    if (p.y < 130 || p.y > h-60) p.vy *= -1;

    if (p.glowTimer > 0) p.glowTimer--;

    // Marriage
    if (p.type === "adult" && !p.married && p.state === "idle" && Math.random() < 0.0005) {
      for (let j = i+1; j < divePeople.length; j++) {
        const o = divePeople[j];
        if (o.type !== "adult" || o.married || o.sex === p.sex || o.state === "dead") continue;
        if (Math.hypot(p.x-o.x, p.y-o.y) < 26 && Math.random() < 0.4) {
          p.married = true; o.married = true;
          p.spouse = o.name; o.spouse = p.name;
          p.glowTimer = 90; o.glowTimer = 90;
          let house = p.house || o.house || diveBuildings.find(b => b.type === "house" && !b.owner);
          if (house) {
            house.owner = p; p.house = house; o.house = house;
          }
          if (Math.random() < 0.5) {
            p.children++; o.children++;
            const bs = Math.random() < 0.5 ? "M" : "F";
            divePeople.push({
              x: (p.x+o.x)/2, y: (p.y+o.y)/2, sex: bs, type: "baby", role: "Baby",
              name: bs === "M" ? "Baby Boy" : "Baby Girl", age: 0,
              spouse: null, children: 0, married: false, glowTimer: 0, house,
              hunger: 90, thirst: 90, health: 95,
              state: "idle", carry: null, toolAngle: 0, progress: 0,
              vx: 0, vy: 0, idleTimer: 999
            });
          }
          break;
        }
      }
    }

    // Draw person
    if (p.type === "adult") {
      const color = p.sex === "M" ? "#3b82f6" : "#ec4899";

      // Red pulse when low on needs
      if (p.hunger < 22 || p.thirst < 22 || p.health < 35) {
        ctx.fillStyle = "rgba(239,68,68,0.4)";
        ctx.beginPath(); ctx.arc(p.x, p.y - 12, 15, 0, Math.PI*2); ctx.fill();
      }

      // Soft green when safely sheltered
      if (isSheltered(p)) {
        ctx.fillStyle = "rgba(34,197,94,0.2)";
        ctx.beginPath(); ctx.arc(p.x, p.y - 12, 13, 0, Math.PI*2); ctx.fill();
      }

      if (p.glowTimer > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y-12, 15, 0, Math.PI*2);
        ctx.fillStyle = `rgba(250,204,21,${p.glowTimer/90*0.5})`;
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.fillRect(p.x-5, p.y-16, 10, 14);
      ctx.beginPath(); ctx.arc(p.x, p.y-22, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(p.x-5, p.y-2, 3.5, 8);
      ctx.fillRect(p.x+1.5, p.y-2, 3.5, 8);

      // Tools
      ctx.save();
      ctx.translate(p.x, p.y-8);
      if (p.state === "chopping") {
        ctx.rotate(p.toolAngle);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(6, -2, 16, 4);
        ctx.fillStyle = "#a1a1aa";
        ctx.fillRect(18, -6, 8, 10);
      } else if (p.state === "mining") {
        ctx.rotate(p.toolAngle);
        ctx.fillStyle = "#44403c";
        ctx.fillRect(5, -2, 15, 4);
        ctx.fillStyle = "#a8a29e";
        ctx.fillRect(16, -7, 9, 12);
      } else if (p.state === "farming") {
        ctx.rotate(p.toolAngle * 0.7);
        ctx.fillStyle = "#78716c";
        ctx.fillRect(5, -1, 14, 3);
        ctx.fillStyle = "#a8a29e";
        ctx.beginPath(); ctx.moveTo(16,-4); ctx.lineTo(22,0); ctx.lineTo(16,4); ctx.fill();
      } else if (p.state === "fighting") {
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath(); ctx.arc(-11, 0, 7, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(17, -14); ctx.stroke();
      }
      ctx.restore();

      if (p.state === "building" && p.target) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x-20, p.y-42, 40, 18);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(p.x-18, p.y-40, 36, 14);
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        const left = Math.max(0, Math.ceil((p.maxProgress - p.progress)/60));
        ctx.fillText(left + "s", p.x, p.y-28);
      }
    } else if (p.type === "child") {
      ctx.fillStyle = p.sex === "M" ? "#60a5fa" : "#f472b6";
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.8, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = p.sex === "M" ? "#93c5fd" : "#f9a8d4";
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI*2); ctx.fill();
    }
  }
}

function tryStartBuilding(builder, data) {
  const woods = diveResources.filter(r => r.type === "wood");
  const stones = diveResources.filter(r => r.type === "stone");

  const wantPyramid = data.landmarks === "egypt" && Math.random() < 0.32;
  const needWood = wantPyramid ? 0 : 7;
  const needStone = wantPyramid ? 15 : 2;

  if (woods.length >= needWood && stones.length >= needStone) {
    for (let i = 0; i < needWood; i++) {
      const idx = diveResources.findIndex(r => r.type === "wood");
      if (idx !== -1) diveResources.splice(idx, 1);
    }
    for (let i = 0; i < needStone; i++) {
      const idx = diveResources.findIndex(r => r.type === "stone");
      if (idx !== -1) diveResources.splice(idx, 1);
    }

    const site = {
      x: 110 + Math.random() * (window.innerWidth - 240),
      y: 160 + Math.random() * (window.innerHeight - 340),
      w: wantPyramid ? 75 + Math.random()*35 : 48 + Math.random()*28,
      h: wantPyramid ? 60 + Math.random()*30 : 40 + Math.random()*22,
      progress: 0,
      max: wantPyramid ? 360 : 200,
      buildType: wantPyramid ? "pyramid" : "house"
    };
    diveConstruction.push(site);
    builder.state = "building";
    builder.target = site;
    builder.progress = 0;
    builder.maxProgress = site.max;
  }
}

function showDivePersonInfo(p) {
  if (!diveInfoBar) return;
  const status = p.married ? `Married to ${p.spouse}` : "Single";
  const kids = p.children > 0 ? `${p.children} child${p.children > 1 ? "ren" : ""}` : "No children";
  const typeLabel = p.type === "adult" ? "Adult" : p.type === "child" ? "Child" : "Baby";
  const color = p.sex === "M" ? "#3b82f6" : "#ec4899";
  const houseText = p.house ? (isSheltered(p) ? "Inside house ✓" : "Has a house") : "No house";
  const work = p.state !== "idle" ? ` • ${p.state}` : "";
  const needs = p.type === "adult" ? ` • Hunger ${Math.round(p.hunger)} • Thirst ${Math.round(p.thirst)} • Health ${Math.round(p.health)}` : "";

  diveInfoBar.innerHTML = `
    <div>
      <strong style="color:${color}">${p.name}</strong>
      &nbsp;•&nbsp; ${typeLabel} &nbsp;•&nbsp; Age ${p.age}
      &nbsp;•&nbsp; Role: <strong>${p.role}</strong>
      &nbsp;•&nbsp; ${status} &nbsp;•&nbsp; ${kids} &nbsp;•&nbsp; ${houseText}${work}${needs}
    </div>
    <button onclick="document.getElementById('diveInfoBar').style.display='none'"
            style="background:#334155;border:none;color:white;padding:5px 12px;border-radius:5px;cursor:pointer;">Close</button>
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

document.addEventListener("click", (e) => {
  if (!cityDiveActive || !diveCanvas) return;
  if (e.target.id === "exitDiveBtn" || e.target.closest("#diveTitle") || e.target.closest("#diveInfoBar") || e.target.closest("#addBar")) return;
  const rect = diveCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  for (const p of divePeople) {
    if (p.state === "dead") continue;
    const dist = Math.hypot(p.x - mx, p.y - my);
    const hit = p.type === "adult" ? 18 : p.type === "child" ? 12 : 9;
    if (dist < hit) { showDivePersonInfo(p); break; }
  }
});

window.addEventListener("resize", () => { if (cityDiveActive) resizeDiveCanvas(); });

window.zoomToHistorical = function(name) {
  const site = HISTORICAL_SITES.find(s => s.name === name);
  if (!site) return;
  if (map) map.setView([site.lat, site.lng], 8);
  setTimeout(() => enterCityDive(name), 700);
};

// ===================== ADD BAR =====================

window.addHumans = function() {
  if (cityDiveActive) {
    for (let i = 0; i < 6; i++) {
      const sex = Math.random() < 0.5 ? "M" : "F";
      const role = sex === "M" ? (Math.random() < 0.4 ? "Builder" : "Farmer") : "Homemaker";
      divePeople.push({
        x: 100 + Math.random() * (window.innerWidth - 200),
        y: 160 + Math.random() * (window.innerHeight - 300),
        sex, type: "adult", role,
        name: makeDiveName(sex),
        age: 18 + Math.floor(Math.random()*28),
        spouse: null, children: 0, married: false,
        glowTimer: 0, house: null,
        hunger: 70 + Math.random()*25, thirst: 70 + Math.random()*25, health: 85,
        state: "idle", target: null, carry: null,
        toolAngle: 0, progress: 0, maxProgress: 0,
        vx: 0, vy: 0, idleTimer: 12 + Math.random()*25
      });
    }
  } else if (typeof randomLandPosition === "function") {
    for (let i = 0; i < 10; i++) {
      const pos = randomLandPosition();
      state.humans.push(new Human(pos.lat, pos.lng));
    }
    if (typeof logEvent === "function") logEvent("discovery", playerName + " created new humans.");
    updateUI();
    refreshMapMarkers();
  }
};

window.addTrees = function() {
  if (cityDiveActive) {
    for (let i = 0; i < 5; i++) {
      diveTrees.push({
        x: 50 + Math.random() * (window.innerWidth - 100),
        y: 130 + Math.random() * (window.innerHeight - 250),
        size: 12 + Math.random()*11,
        health: 100
      });
    }
  } else {
    if (typeof logEvent === "function") logEvent("discovery", playerName + " caused new forests to grow.");
    updateUI();
  }
};

window.addStone = function() {
  if (cityDiveActive) {
    for (let i = 0; i < 8; i++) {
      diveResources.push({
        x: 80 + Math.random() * (window.innerWidth - 160),
        y: 150 + Math.random() * (window.innerHeight - 280),
        type: "stone"
      });
    }
  } else {
    state.resources.stone += 1400;
    if (typeof logEvent === "function") logEvent("discovery", playerName + " created stone.");
    updateUI();
  }
};

window.addWood = function() {
  if (cityDiveActive) {
    for (let i = 0; i < 7; i++) {
      diveResources.push({
        x: 80 + Math.random() * (window.innerWidth - 160),
        y: 150 + Math.random() * (window.innerHeight - 280),
        type: "wood"
      });
    }
  } else {
    state.resources.wood += 1600;
    if (typeof logEvent === "function") logEvent("discovery", playerName + " created wood.");
    updateUI();
  }
};

window.addFood = function() {
  if (cityDiveActive) {
    for (let i = 0; i < 6; i++) {
      diveResources.push({
        x: 80 + Math.random() * (window.innerWidth - 160),
        y: 150 + Math.random() * (window.innerHeight - 280),
        type: "food"
      });
    }
  } else {
    state.resources.food += 2200;
    if (typeof logEvent === "function") logEvent("discovery", playerName + " bestowed food.");
    updateUI();
  }
};

// ===================== UI =====================

function renderEvents() {
  const el = document.getElementById("eventLog");
  if (!el) return;
  let html = "";
  state.events.slice(0, 28).forEach(e => {
    const y = e.year < 0 ? Math.abs(e.year) + " BCE" : e.year + " CE";
    html += `<div class="event ${e.type}"><span class="year">${y}</span><span class="msg">${e.msg}</span></div>`;
  });
  el.innerHTML = html;
}

function updateUI() {
  document.getElementById("yearDisplay").textContent = state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";
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
    <div class="stat-card"><div class="label">Discoveries</div><div class="value">${state.discoveries}</div></div>`;

  document.getElementById("envList").innerHTML = `
    <div class="res-item"><span>Food</span><span>${Math.floor(state.resources.food)}</span></div>
    <div class="res-item"><span>Wood</span><span>${Math.floor(state.resources.wood)}</span></div>
    <div class="res-item"><span>Stone</span><span>${Math.floor(state.resources.stone)}</span></div>
    <div class="res-item"><span>Energy</span><span>${Math.floor(state.resources.energy)}</span></div>
    <div class="res-item"><span>Knowledge</span><span>${Math.floor(state.resources.knowledge)}</span></div>`;

  let techHtml = "";
  TECH_TREE.forEach(t => {
    const y = t.year < 0 ? Math.abs(t.year) + " BCE" : t.year + " CE";
    techHtml += `<div class="tech-item ${state.tech[t.id] ? "unlocked" : "locked"}"><span>${state.tech[t.id] ? "✓" : "○"} ${t.name}</span><span>${y}</span></div>`;
  });
  document.getElementById("techList").innerHTML = techHtml;

  const alive = state.humans.filter(h => h.alive).sort((a,b) => b.age - a.age).slice(0, 16);
  let peopleHtml = alive.length === 0 ? '<div style="color:var(--muted)">No living people.</div>' : "";
  alive.forEach(h => {
    const color = h.sex === "M" ? "#3b82f6" : "#ec4899";
    peopleHtml += `<div class="person-card" onclick="focusPerson(${h.id})">
      <div class="name" style="color:${color}">${h.name}</div>
      <div class="meta">age ${h.age}, hunger ${h.hungerLevel}, thirst ${h.thirstLevel}, ${h.livingDescription}</div>
    </div>`;
  });
  document.getElementById("peopleList").innerHTML = peopleHtml;
  renderFocusPanel();
}

function renderFocusPanel() {
  const panel = document.getElementById("focusPanel");
  if (!panel) return;
  if (!state.focus) {
    panel.innerHTML = `<div style="color:var(--muted);font-size:0.85rem">Click a purple historical marker → “Zoom into this place”.</div>`;
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
      <div class="res-item"><span>Job</span><span>${h.job}</span></div>
      <div class="res-item"><span>Living</span><span>${h.livingDescription}</span></div>
      <div class="res-item"><span>Spouse</span><span>${h.spouse && h.spouse.alive ? h.spouse.name : "None"}</span></div>
      <div class="res-item"><span>Children</span><span>${h.children.filter(c => c.alive).length}</span></div>
      <button onclick="zoomToPerson(${h.id})" style="width:100%;margin-top:8px;background:var(--accent);border:none;color:white;padding:8px;border-radius:6px;cursor:pointer">Zoom to Person</button>`;
  } else if (state.focusType === "city") {
    const c = state.focus;
    panel.innerHTML = `
      <div style="font-size:1.15rem;font-weight:600;color:#fbbf24;margin-bottom:6px">${c.name}</div>
      <div class="res-item"><span>Population</span><span>${Math.floor(c.pop).toLocaleString()}</span></div>
      <div class="res-item"><span>Level</span><span>${["","Village","Town","City","Metropolis"][c.level]}</span></div>
      <div class="res-item"><span>Nation</span><span>${c.nation ? c.nation.name : "Independent"}</span></div>
      <div class="res-item"><span>Hospital</span><span>${c.hasHospital ? "Yes 🏥" : "No"}</span></div>
      <button onclick="zoomToCity()" style="width:100%;margin-top:8px;background:var(--accent);border:none;color:white;padding:8px;border-radius:6px;cursor:pointer">Zoom to City</button>`;
  }
}

window.focusPerson = function(id) {
  const h = state.humans.find(p => p.id === id);
  if (!h) return;
  state.focus = h; state.focusType = "person";
  document.querySelector('[data-tab="focus"]').click();
  renderFocusPanel();
};
window.zoomToPerson = function(id) {
  const h = state.humans.find(p => p.id === id);
  if (!h || !map) return;
  map.setView([h.lat, h.lng], 12);
  state.focus = h; state.focusType = "person";
};
window.zoomToCity = function() {
  if (state.focusType !== "city" || !map) return;
  map.setView([state.focus.lat, state.focus.lng], 10);
};

document.getElementById("btnPlay").onclick = () => { state.running = true; document.getElementById("btnPlay").classList.add("active"); };
document.getElementById("btnPause").onclick = () => { state.running = false; document.getElementById("btnPlay").classList.remove("active"); };
document.getElementById("btnReset").onclick = () => {
  initWorld(); state.running = true;
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
    document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
    document.getElementById("tab-" + tab.dataset.tab).style.display = "block";
  };
});

document.getElementById("btnCollapseSidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});

document.getElementById("timeline").addEventListener("input", e => {
  const target = parseInt(e.target.value, 10);
  state.year = target;
  state.era = getEra(state.year);
  TECH_TREE.forEach(t => state.tech[t.id] = state.year >= t.year);
  updatePop(); updateUI(); refreshMapMarkers();
  document.getElementById("timelineLabel").textContent = state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";
});

const nameInput = document.getElementById("nameInput");
const startBtn = document.getElementById("startBtn");
nameInput.addEventListener("input", () => startBtn.disabled = nameInput.value.trim().length < 1);
nameInput.addEventListener("keydown", e => { if (e.key === "Enter" && !startBtn.disabled) startBtn.click(); });

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

let last = performance.now(), acc = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; acc += dt * 1000;
  if (acc > 160) {
    acc = 0;
    if (!cityDiveActive) tick();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
