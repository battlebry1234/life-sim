// map.js
// ===================== FULL UPDATED FILE =====================

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
let diveConstruction = [];   // things currently being built
let diveAnimationId = null;
let diveInfoBar = null;
let diveWarTimer = 0;

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
    year: -50,
    title: "Rome – Heart of the Empire",
    description: "The Forum is alive with citizens, soldiers and merchants.",
    ground: "#3d4a3a",
    maleRoles: ["Legionary", "Builder", "Farmer", "Merchant", "Senator", "Guard"],
    femaleRoles: ["Homemaker", "Childcare", "Merchant", "Priestess", "Weaver"],
    landmarks: "roman"
  },
  "Memphis (Egypt)": {
    year: -2500,
    title: "Memphis – Age of the Pyramids",
    description: "Sandy desert. Workers haul stone for the great pyramids and the Sphinx watches.",
    ground: "#c2a36b",          // sandy
    maleRoles: ["Builder", "Overseer", "Soldier", "Farmer", "Scribe", "Stonehauler"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver", "Farmer"],
    landmarks: "egypt"
  },
  "Athens": {
    year: -450,
    title: "Athens – Golden Age",
    description: "The agora bustles beneath the Acropolis.",
    ground: "#3a4a3d",
    maleRoles: ["Citizen", "Soldier", "Philosopher", "Merchant", "Artisan", "Builder"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Merchant"],
    landmarks: "greece"
  },
  "Uruk": {
    year: -3500,
    title: "Uruk – First Great City",
    description: "Mud-brick temples rise in the earliest urban center.",
    ground: "#8b7355",
    maleRoles: ["Guard", "Farmer", "Craftsman", "Trader", "Builder"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver"],
    landmarks: "mesopotamia"
  },
  "Anyang": {
    year: -1200,
    title: "Anyang – Shang Capital",
    description: "Bronze workers and diviners serve the royal court.",
    ground: "#3d4a3a",
    maleRoles: ["Soldier", "Bronze Worker", "Farmer", "Diviner", "Noble", "Builder"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Noble"],
    landmarks: "china"
  },
  "Caral": {
    year: -2200,
    title: "Caral – Ancient Andes",
    description: "Pyramid builders of the Norte Chico civilization.",
    ground: "#6b5c45",
    maleRoles: ["Builder", "Farmer", "Fisher", "Guard"],
    femaleRoles: ["Homemaker", "Childcare", "Farmer", "Weaver"],
    landmarks: "andes"
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
    attribution: '&copy; OpenStreetMap',
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
      ${site.description}<br><br>
      <button onclick="zoomToHistorical('${site.name}')" style="padding:6px 12px;cursor:pointer;">
        Zoom into this place
      </button>
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
    <strong>${city.name}</strong><br>
    Population: ${Math.floor(city.pop).toLocaleString()}<br>
    Level: ${["","Village","Town","City","Metropolis"][city.level]}<br>
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
    radius: 4, fillColor: color, color: "#0f172a", weight: 1.5, opacity: 1, fillOpacity: 0.9
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
  return L.marker([city.lat + 0.015, city.lng + 0.015], {
    icon: L.divIcon({ className: "hospital-icon", html: "🏥", iconSize: [22, 22], iconAnchor: [11, 11] })
  }).bindPopup(`<strong>Hospital</strong><br>${city.name}`);
}

function refreshMapMarkers() {
  if (!map || cityDiveActive) return;
  const zoom = map.getZoom();
  cityLayer.clearLayers();
  peopleLayer.clearLayers();
  hospitalLayer.clearLayers();

  state.cities.forEach(c => cityLayer.addLayer(createCityMarker(c)));
  if (zoom >= 6) {
    state.cities.forEach(c => { if (c.hasHospital) hospitalLayer.addLayer(createHospitalMarker(c)); });
  }
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
  diveWarTimer = 400 + Math.random() * 600;

  state.year = data.year;
  state.era = getEra(state.year);
  TECH_TREE.forEach(t => state.tech[t.id] = state.year >= t.year);
  document.getElementById("timeline").value = state.year;
  document.getElementById("timelineLabel").textContent =
    state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";

  document.querySelector(".timeline-bar").style.display = "none";
  document.querySelector(".add-bar").style.display = "none";
  document.querySelector(".god-panel").style.display = "none";
  document.getElementById("sidebar").style.display = "none";

  if (!diveCanvas) {
    diveCanvas = document.createElement("canvas");
    diveCanvas.id = "cityDiveCanvas";
    diveCanvas.style.cssText = "position:fixed;inset:0;z-index:3000;cursor:crosshair;";
    document.body.appendChild(diveCanvas);
    diveCtx = diveCanvas.getContext("2d");

    const exitBtn = document.createElement("button");
    exitBtn.id = "exitDiveBtn";
    exitBtn.textContent = "← Exit City View";
    exitBtn.style.cssText = `position:fixed;top:16px;left:16px;z-index:3001;background:#1e293b;color:white;border:1px solid #334155;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.9rem;`;
    exitBtn.onclick = exitCityDive;
    document.body.appendChild(exitBtn);

    const title = document.createElement("div");
    title.id = "diveTitle";
    title.style.cssText = `position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:3001;background:rgba(15,23,42,0.92);color:#fbbf24;padding:10px 24px;border-radius:10px;font-weight:600;font-size:1.1rem;border:1px solid #334155;text-align:center;max-width:90%;`;
    document.body.appendChild(title);

    diveInfoBar = document.createElement("div");
    diveInfoBar.id = "diveInfoBar";
    diveInfoBar.style.cssText = `position:fixed;bottom:0;left:0;right:0;z-index:3001;background:rgba(15,23,42,0.96);border-top:1px solid #334155;padding:12px 20px;color:white;font-size:0.9rem;display:none;align-items:center;justify-content:space-between;gap:12px;`;
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

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Houses
  for (let i = 0; i < 14; i++) {
    diveBuildings.push({
      x: 80 + Math.random() * (w - 180),
      y: 130 + Math.random() * (h - 300),
      w: 40 + Math.random() * 50,
      h: 34 + Math.random() * 40,
      type: "house",
      owner: null
    });
  }

  // Location-specific landmarks
  if (data.landmarks === "egypt") {
    // Pyramids
    diveBuildings.push({ x: w*0.15, y: h*0.35, w: 90, h: 70, type: "pyramid", owner: null });
    diveBuildings.push({ x: w*0.28, y: h*0.42, w: 60, h: 48, type: "pyramid", owner: null });
    // Sphinx
    diveBuildings.push({ x: w*0.55, y: h*0.55, w: 70, h: 35, type: "sphinx", owner: null });
  } else if (data.landmarks === "roman") {
    diveBuildings.push({ x: w*0.4, y: h*0.3, w: 110, h: 55, type: "temple", owner: null });
  } else if (data.landmarks === "greece") {
    diveBuildings.push({ x: w*0.42, y: h*0.28, w: 100, h: 50, type: "temple", owner: null });
  }

  // Trees (fewer in Egypt)
  const treeCount = data.landmarks === "egypt" ? 8 : 28;
  for (let i = 0; i < treeCount; i++) {
    diveTrees.push({
      x: Math.random() * w,
      y: 110 + Math.random() * (h - 220),
      size: 12 + Math.random() * 14,
      health: 100
    });
  }

  // Adults – slower and more stationary
  for (let i = 0; i < 42; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    const roleList = sex === "M" ? data.maleRoles : data.femaleRoles;
    const role = roleList[Math.floor(Math.random() * roleList.length)];

    const person = {
      x: 70 + Math.random() * (w - 140),
      y: 150 + Math.random() * (h - 280),
      sex, type: "adult", role,
      name: makeDiveName(sex),
      age: 18 + Math.floor(Math.random() * 36),
      spouse: null, children: 0, married: false,
      glowTimer: 0, house: null,
      goingHome: false, chopping: false, building: false,
      fighting: false, fightTarget: null, fightTimer: 0,
      targetTree: null, buildTarget: null, buildProgress: 0,
      vx: 0, vy: 0,
      idleTimer: Math.random() * 200
    };

    // Assign house
    const free = diveBuildings.find(b => b.type === "house" && !b.owner);
    if (free && Math.random() < 0.5) {
      free.owner = person;
      person.house = free;
    }

    // Soldiers start more grouped
    if (role === "Legionary" || role === "Soldier" || role === "Guard") {
      person.x = w * 0.65 + (Math.random() - 0.5) * 120;
      person.y = h * 0.6 + (Math.random() - 0.5) * 80;
    }

    divePeople.push(person);
  }

  // Children + babies
  for (let i = 0; i < 14; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 70 + Math.random() * (w - 140),
      y: 150 + Math.random() * (h - 280),
      sex, type: "child", role: "Child",
      name: "Young " + (sex === "M" ? "Boy" : "Girl"),
      age: 3 + Math.floor(Math.random() * 9),
      spouse: null, children: 0, married: false, glowTimer: 0, house: null,
      vx: 0, vy: 0, idleTimer: Math.random() * 150
    });
  }
  for (let i = 0; i < 9; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 70 + Math.random() * (w - 140),
      y: 150 + Math.random() * (h - 280),
      sex, type: "baby", role: "Baby",
      name: sex === "M" ? "Baby Boy" : "Baby Girl",
      age: 0, spouse: null, children: 0, married: false, glowTimer: 0, house: null,
      vx: 0, vy: 0, idleTimer: 999
    });
  }
}

function drawDiveScene() {
  if (!diveCtx || !cityDiveActive) return;
  const w = diveCanvas.width;
  const h = diveCanvas.height;
  const ctx = diveCtx;
  const data = CITY_DIVE_DATA[diveCity];

  // Custom ground color
  ctx.fillStyle = data.ground || "#243c24";
  ctx.fillRect(0, 0, w, h);

  // Simple roads
  ctx.strokeStyle = data.landmarks === "egypt" ? "#a89060" : "#475569";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55);
  ctx.lineTo(w, h * 0.55);
  ctx.stroke();

  // Buildings + landmarks
  diveBuildings.forEach(b => {
    if (b.type === "pyramid") {
      ctx.fillStyle = "#d4b483";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.h);
      ctx.lineTo(b.x + b.w / 2, b.y);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#b8956a";
      ctx.stroke();
    } else if (b.type === "sphinx") {
      ctx.fillStyle = "#c9a66b";
      ctx.fillRect(b.x, b.y + 10, b.w, b.h - 10);
      ctx.beginPath();
      ctx.arc(b.x + 18, b.y + 12, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === "temple") {
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // columns
      ctx.fillStyle = "#c4b5fd";
      for (let c = 0; c < 5; c++) {
        ctx.fillRect(b.x + 10 + c * 18, b.y - 18, 8, 18);
      }
    } else {
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(b.x - 3, b.y);
      ctx.lineTo(b.x + b.w / 2, b.y - 14);
      ctx.lineTo(b.x + b.w + 3, b.y);
      ctx.fill();
      if (b.owner) {
        ctx.fillStyle = "rgba(251,191,36,0.75)";
        ctx.fillRect(b.x + 4, b.y + 4, 8, 8);
      }
    }
  });

  // Construction sites
  diveConstruction.forEach(c => {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    // progress bar
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(c.x, c.y - 8, c.w * (c.progress / c.max), 5);
  });

  // Trees
  diveTrees.forEach(t => {
    if (t.health <= 0) return;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(t.x - 3, t.y, 6, t.size * 0.5 * (t.health / 100));
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.arc(t.x, t.y - 4, t.size * 0.55 * (t.health / 100), 0, Math.PI * 2);
    ctx.fill();
  });

  // War timer
  diveWarTimer--;
  if (diveWarTimer <= 0) {
    diveWarTimer = 500 + Math.random() * 700;
    // trigger a small fight
    const fighters = divePeople.filter(p => p.type === "adult" && (p.role === "Legionary" || p.role === "Soldier" || p.role === "Guard"));
    if (fighters.length >= 2) {
      const a = fighters[Math.floor(Math.random() * fighters.length)];
      const b = fighters[Math.floor(Math.random() * fighters.length)];
      if (a !== b) {
        a.fighting = true; b.fighting = true;
        a.fightTarget = b; b.fightTarget = a;
        a.fightTimer = 180; b.fightTimer = 180;
      }
    }
  }

  // People update + draw
  for (let i = 0; i < divePeople.length; i++) {
    const p = divePeople[i];

    // Much slower idle movement
    p.idleTimer--;
    if (p.idleTimer <= 0 && !p.chopping && !p.building && !p.fighting && !p.goingHome) {
      p.vx = (Math.random() - 0.5) * 0.25;   // very slow
      p.vy = (Math.random() - 0.5) * 0.25;
      p.idleTimer = 80 + Math.random() * 160;
    }

    // Homemakers stay near house
    if (p.type === "adult" && (p.role === "Homemaker" || p.role === "Childcare") && p.house) {
      const hx = p.house.x + p.house.w / 2;
      const hy = p.house.y + p.house.h / 2;
      if (Math.hypot(p.x - hx, p.y - hy) > 50) {
        p.vx = (hx - p.x) * 0.015;
        p.vy = (hy - p.y) * 0.015;
      }
    }

    // Builders gather then build
    if (p.type === "adult" && (p.role === "Builder" || p.role === "Stonehauler") && !p.chopping && !p.building && Math.random() < 0.003) {
      const tree = diveTrees.find(t => t.health > 30);
      if (tree) {
        p.chopping = true;
        p.targetTree = tree;
      } else {
        // start a construction
        const site = {
          x: 100 + Math.random() * (w - 200),
          y: 140 + Math.random() * (h - 300),
          w: 50 + Math.random() * 40,
          h: 40 + Math.random() * 30,
          progress: 0,
          max: 180 + Math.random() * 120,   // ~3–5 seconds at 60fps → feels like 20-40s
          type: data.landmarks === "egypt" ? "pyramid" : "house"
        };
        diveConstruction.push(site);
        p.building = true;
        p.buildTarget = site;
        p.buildProgress = 0;
      }
    }

    if (p.chopping && p.targetTree) {
      const t = p.targetTree;
      const dist = Math.hypot(p.x - t.x, p.y - t.y);
      if (dist > 20) {
        p.vx = (t.x - p.x) * 0.02;
        p.vy = (t.y - p.y) * 0.02;
      } else {
        t.health -= 0.25;
        p.vx = 0; p.vy = 0;
        if (t.health <= 0) {
          p.chopping = false;
          p.targetTree = null;
        }
      }
    }

    if (p.building && p.buildTarget) {
      const site = p.buildTarget;
      const dist = Math.hypot(p.x - (site.x + site.w/2), p.y - (site.y + site.h/2));
      if (dist > 25) {
        p.vx = ((site.x + site.w/2) - p.x) * 0.02;
        p.vy = ((site.y + site.h/2) - p.y) * 0.02;
      } else {
        p.vx = 0; p.vy = 0;
        site.progress++;
        if (site.progress >= site.max) {
          // finished – turn into real building
          diveBuildings.push({
            x: site.x, y: site.y, w: site.w, h: site.h,
            type: site.type, owner: null
          });
          diveConstruction = diveConstruction.filter(c => c !== site);
          p.building = false;
          p.buildTarget = null;
        }
      }
    }

    // Fighting
    if (p.fighting && p.fightTarget) {
      const t = p.fightTarget;
      const dist = Math.hypot(p.x - t.x, p.y - t.y);
      if (dist > 24) {
        p.vx = (t.x - p.x) * 0.025;
        p.vy = (t.y - p.y) * 0.025;
      } else {
        p.vx = 0; p.vy = 0;
      }
      p.fightTimer--;
      if (p.fightTimer <= 0) {
        p.fighting = false;
        p.fightTarget = null;
      }
    }

    // Apply movement (slow)
    if (!p.chopping && !p.building && !p.fighting && !p.goingHome) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 40 || p.x > w - 40) p.vx *= -1;
      if (p.y < 120 || p.y > h - 50) p.vy *= -1;
    } else if (p.goingHome && p.house) {
      const hx = p.house.x + p.house.w / 2;
      const hy = p.house.y + p.house.h / 2;
      if (Math.hypot(p.x - hx, p.y - hy) > 10) {
        p.x += (hx - p.x) * 0.03;
        p.y += (hy - p.y) * 0.03;
      }
    }

    if (p.glowTimer > 0) p.glowTimer--;

    // Marriage (slowed)
    if (p.type === "adult" && !p.married && Math.random() < 0.0009) {
      for (let j = i + 1; j < divePeople.length; j++) {
        const o = divePeople[j];
        if (o.type !== "adult" || o.married || o.sex === p.sex) continue;
        if (Math.hypot(p.x - o.x, p.y - o.y) < 28 && Math.random() < 0.5) {
          p.married = true; o.married = true;
          p.spouse = o.name; o.spouse = p.name;
          p.glowTimer = 100; o.glowTimer = 100;

          let house = p.house || o.house;
          if (!house) house = diveBuildings.find(b => b.type === "house" && !b.owner);
          if (house) {
            house.owner = p;
            p.house = house; o.house = house;
            p.goingHome = true; o.goingHome = true;
          }
          if (Math.random() < 0.6) {
            p.children++; o.children++;
            const bs = Math.random() < 0.5 ? "M" : "F";
            divePeople.push({
              x: (p.x + o.x)/2, y: (p.y + o.y)/2,
              sex: bs, type: "baby", role: "Baby",
              name: bs === "M" ? "Baby Boy" : "Baby Girl",
              age: 0, spouse: null, children: 0, married: false,
              glowTimer: 0, house, vx: 0, vy: 0, idleTimer: 999
            });
          }
          break;
        }
      }
    }

    // DRAW
    if (p.type === "adult") {
      const color = p.sex === "M" ? "#3b82f6" : "#ec4899";
      if (p.glowTimer > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y - 12, 15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250,204,21,${p.glowTimer/100*0.5})`;
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.fillRect(p.x - 5, p.y - 16, 10, 14);
      ctx.beginPath();
      ctx.arc(p.x, p.y - 22, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(p.x - 5, p.y - 2, 3.5, 8);
      ctx.fillRect(p.x + 1.5, p.y - 2, 3.5, 8);

      if (p.fighting) {
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(p.x - 10, p.y - 9, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(p.x + 7, p.y - 7);
        ctx.lineTo(p.x + 16, p.y - 20);
        ctx.stroke();
      }
    } else if (p.type === "child") {
      ctx.fillStyle = p.sex === "M" ? "#60a5fa" : "#f472b6";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.sex === "M" ? "#93c5fd" : "#f9a8d4";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.1, 0, Math.PI * 2);
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
  const houseText = p.house ? "Has a house" : "No house";

  diveInfoBar.innerHTML = `
    <div>
      <strong style="color:${color}">${p.name}</strong>
      &nbsp;•&nbsp; ${typeLabel} &nbsp;•&nbsp; Age ${p.age}
      &nbsp;•&nbsp; Role: <strong>${p.role}</strong>
      &nbsp;•&nbsp; ${status} &nbsp;•&nbsp; ${kids} &nbsp;•&nbsp; ${houseText}
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
  if (e.target.id === "exitDiveBtn" || e.target.closest("#diveTitle") || e.target.closest("#diveInfoBar")) return;

  const rect = diveCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (const p of divePeople) {
    const dist = Math.hypot(p.x - mx, p.y - my);
    const hit = p.type === "adult" ? 18 : p.type === "child" ? 12 : 9;
    if (dist < hit) {
      showDivePersonInfo(p);
      break;
    }
  }
});

window.addEventListener("resize", () => { if (cityDiveActive) resizeDiveCanvas(); });

window.zoomToHistorical = function (name) {
  const site = HISTORICAL_SITES.find(s => s.name === name);
  if (!site) return;
  if (map) map.setView([site.lat, site.lng], 8);
  setTimeout(() => enterCityDive(name), 700);
};

// ---------- UI (same as before) ----------
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

  const alive = state.humans.filter(h => h.alive).sort((a,b) => b.age - a.age).slice(0, 18);
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
    panel.innerHTML = `<div style="color:var(--muted);font-size:0.85rem">Click a purple historical marker and choose “Zoom into this place”.</div>`;
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
