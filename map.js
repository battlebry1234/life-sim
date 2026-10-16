// map.js
// ===================== FULL FILE WITH WORK ANIMATIONS + RESOURCES =====================

let map, cityLayer, peopleLayer, hospitalLayer, historicalLayer;
let cityDiveActive = false;
let diveCanvas = null, diveCtx = null, diveCity = null;
let divePeople = [], diveTrees = [], diveBuildings = [], diveConstruction = [];
let diveResources = [];          // wood logs & stone on the ground
let diveAnimationId = null, diveInfoBar = null;
let diveWarTimer = 0;
let diveFrame = 0;

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
    maleRoles: ["Legionary", "Builder", "Farmer", "Merchant", "Guard", "Woodcutter"],
    femaleRoles: ["Homemaker", "Childcare", "Merchant", "Priestess", "Weaver"],
    landmarks: "roman"
  },
  "Memphis (Egypt)": {
    year: -2500, title: "Memphis – Age of the Pyramids",
    description: "Sandy desert. Workers haul stone for the great pyramids.",
    ground: "#c2a36b",
    maleRoles: ["Builder", "Stonehauler", "Soldier", "Farmer", "Scribe", "Overseer"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver"],
    landmarks: "egypt"
  },
  "Athens": {
    year: -450, title: "Athens – Golden Age",
    description: "The agora bustles beneath the Acropolis.",
    ground: "#3a4a3d",
    maleRoles: ["Citizen", "Soldier", "Builder", "Merchant", "Woodcutter", "Farmer"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Merchant"],
    landmarks: "greece"
  },
  "Uruk": {
    year: -3500, title: "Uruk – First Great City",
    description: "Mud-brick temples rise in the earliest urban center.",
    ground: "#8b7355",
    maleRoles: ["Guard", "Farmer", "Builder", "Trader", "Woodcutter"],
    femaleRoles: ["Homemaker", "Childcare", "Priestess", "Weaver"],
    landmarks: "mesopotamia"
  },
  "Anyang": {
    year: -1200, title: "Anyang – Shang Capital",
    description: "Bronze workers and diviners serve the royal court.",
    ground: "#3d4a3a",
    maleRoles: ["Soldier", "Builder", "Farmer", "Woodcutter", "Noble"],
    femaleRoles: ["Homemaker", "Childcare", "Weaver", "Noble"],
    landmarks: "china"
  },
  "Caral": {
    year: -2200, title: "Caral – Ancient Andes",
    description: "Pyramid builders of the Norte Chico civilization.",
    ground: "#6b5c45",
    maleRoles: ["Builder", "Farmer", "Stonehauler", "Guard"],
    femaleRoles: ["Homemaker", "Childcare", "Farmer", "Weaver"],
    landmarks: "andes"
  }
};

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
  diveWarTimer = 500 + Math.random() * 600;
  diveFrame = 0;

  state.year = data.year;
  state.era = getEra(state.year);
  TECH_TREE.forEach(t => state.tech[t.id] = state.year >= t.year);
  document.getElementById("timeline").value = state.year;
  document.getElementById("timelineLabel").textContent = state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";

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
  diveResources = [];

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Houses
  for (let i = 0; i < 12; i++) {
    diveBuildings.push({
      x: 90 + Math.random() * (w - 200),
      y: 140 + Math.random() * (h - 320),
      w: 42 + Math.random() * 45,
      h: 36 + Math.random() * 35,
      type: "house", owner: null
    });
  }

  // Landmarks
  if (data.landmarks === "egypt") {
    diveBuildings.push({ x: w*0.12, y: h*0.32, w: 100, h: 80, type: "pyramid", owner: null });
    diveBuildings.push({ x: w*0.26, y: h*0.40, w: 70, h: 55, type: "pyramid", owner: null });
    diveBuildings.push({ x: w*0.58, y: h*0.52, w: 75, h: 38, type: "sphinx", owner: null });
  } else if (data.landmarks === "roman" || data.landmarks === "greece") {
    diveBuildings.push({ x: w*0.38, y: h*0.28, w: 120, h: 55, type: "temple", owner: null });
  }

  // Trees
  const treeCount = data.landmarks === "egypt" ? 6 : 26;
  for (let i = 0; i < treeCount; i++) {
    diveTrees.push({
      x: 40 + Math.random() * (w - 80),
      y: 120 + Math.random() * (h - 240),
      size: 13 + Math.random() * 13,
      health: 100
    });
  }

  // Adults
  for (let i = 0; i < 40; i++) {
    const sex = Math.random() < 0.52 ? "M" : "F";
    const roleList = sex === "M" ? data.maleRoles : data.femaleRoles;
    const role = roleList[Math.floor(Math.random() * roleList.length)];

    const p = {
      x: 80 + Math.random() * (w - 160),
      y: 160 + Math.random() * (h - 300),
      sex, type: "adult", role,
      name: makeDiveName(sex),
      age: 18 + Math.floor(Math.random() * 35),
      spouse: null, children: 0, married: false,
      glowTimer: 0, house: null,
      // work state
      state: "idle",          // idle | walking | chopping | mining | farming | delivering | building | fighting
      target: null,
      carry: null,            // "wood" | "stone" | null
      toolAngle: 0,
      progress: 0,
      maxProgress: 0,
      vx: 0, vy: 0,
      idleTimer: 60 + Math.random() * 120
    };

    // Assign some houses
    const free = diveBuildings.find(b => b.type === "house" && !b.owner);
    if (free && Math.random() < 0.45) {
      free.owner = p;
      p.house = free;
    }

    // Group soldiers
    if (["Legionary","Soldier","Guard"].includes(role)) {
      p.x = w * 0.68 + (Math.random()-0.5)*100;
      p.y = h * 0.62 + (Math.random()-0.5)*70;
    }

    divePeople.push(p);
  }

  // Children + babies
  for (let i = 0; i < 12; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 80 + Math.random()*(w-160), y: 160 + Math.random()*(h-300),
      sex, type: "child", role: "Child", name: "Young " + (sex==="M"?"Boy":"Girl"),
      age: 3+Math.floor(Math.random()*9), spouse:null, children:0, married:false,
      glowTimer:0, house:null, state:"idle", carry:null, toolAngle:0, progress:0,
      vx:0, vy:0, idleTimer: 40+Math.random()*100
    });
  }
  for (let i = 0; i < 8; i++) {
    const sex = Math.random() < 0.5 ? "M" : "F";
    divePeople.push({
      x: 80 + Math.random()*(w-160), y: 160 + Math.random()*(h-300),
      sex, type: "baby", role: "Baby", name: sex==="M"?"Baby Boy":"Baby Girl",
      age:0, spouse:null, children:0, married:false, glowTimer:0, house:null,
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

  // Buildings & landmarks
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
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(b.x-3, b.y); ctx.lineTo(b.x+b.w/2, b.y-13); ctx.lineTo(b.x+b.w+3, b.y); ctx.fill();
      if (b.owner) {
        ctx.fillStyle = "rgba(251,191,36,0.8)";
        ctx.fillRect(b.x+4, b.y+4, 8, 8);
      }
    }
  });

  // Resources on ground
  diveResources.forEach(r => {
    if (r.type === "wood") {
      ctx.fillStyle = "#92400e";
      ctx.fillRect(r.x-6, r.y-3, 12, 6);
    } else {
      ctx.fillStyle = "#78716c";
      ctx.fillRect(r.x-5, r.y-5, 10, 10);
    }
  });

  // Construction sites with timer
  diveConstruction.forEach(c => {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.setLineDash([]);

    // Timer bar
    const pct = c.progress / c.max;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(c.x, c.y - 14, c.w, 10);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(c.x, c.y - 14, c.w * pct, 10);
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil((c.max - c.progress)/60) + "s", c.x + c.w/2, c.y - 5);
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

  // War trigger
  diveWarTimer--;
  if (diveWarTimer <= 0) {
    diveWarTimer = 600 + Math.random()*800;
    const fighters = divePeople.filter(p => p.type==="adult" && ["Legionary","Soldier","Guard"].includes(p.role));
    if (fighters.length >= 2) {
      const a = fighters[Math.floor(Math.random()*fighters.length)];
      let b = fighters[Math.floor(Math.random()*fighters.length)];
      if (a !== b) {
        a.state = "fighting"; b.state = "fighting";
        a.target = b; b.target = a;
        a.progress = 0; a.maxProgress = 150;
        b.progress = 0; b.maxProgress = 150;
      }
    }
  }

  // ===== PEOPLE LOGIC & DRAW =====
  for (let i = 0; i < divePeople.length; i++) {
    const p = divePeople[i];

    // --- AI / State machine (slowed down) ---
    if (p.type === "adult") {
      if (p.state === "idle") {
        p.idleTimer--;
        if (p.idleTimer <= 0) {
          // Decide next action based on role
          if (p.role === "Woodcutter" || p.role === "Builder") {
            const tree = diveTrees.find(t => t.health > 40);
            if (tree) {
              p.state = "chopping";
              p.target = tree;
              p.progress = 0;
              p.maxProgress = 90 + Math.random()*40;
            }
          } else if (p.role === "Stonehauler") {
            p.state = "mining";
            p.target = { x: 100 + Math.random()*(w-200), y: 180 + Math.random()*(h-350) };
            p.progress = 0;
            p.maxProgress = 100 + Math.random()*50;
          } else if (p.role === "Farmer") {
            p.state = "farming";
            p.target = { x: 80 + Math.random()*(w-160), y: 160 + Math.random()*(h-300) };
            p.progress = 0;
            p.maxProgress = 80 + Math.random()*40;
          } else if (p.role === "Builder" && Math.random() < 0.4) {
            // try to start a building if we have resources nearby
            startBuilding(p, data);
          } else {
            // small wander
            p.vx = (Math.random()-0.5)*0.18;
            p.vy = (Math.random()-0.5)*0.18;
            p.idleTimer = 90 + Math.random()*120;
          }
        }
      }

      // Movement toward target
      if (p.target && (p.state === "chopping" || p.state === "mining" || p.state === "farming" || p.state === "delivering" || p.state === "building")) {
        const tx = p.target.x || (p.target.x === undefined ? p.target.x : p.target.x);
        const ty = p.target.y || (p.target.y === undefined ? p.target.y : p.target.y);
        const realTx = p.target.x !== undefined ? p.target.x : (p.target.x || p.x);
        const realTy = p.target.y !== undefined ? p.target.y : (p.target.y || p.y);

        // For trees/buildings we use the object position
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
        if (dist > 18) {
          p.vx = (goalX - p.x) * 0.02;
          p.vy = (goalY - p.y) * 0.02;
        } else {
          p.vx = 0; p.vy = 0;
          // Perform action
          if (p.state === "chopping") {
            p.toolAngle = Math.sin(diveFrame * 0.25) * 0.9;
            p.progress++;
            if (p.progress >= p.maxProgress) {
              p.target.health = 0;
              // drop wood
              diveResources.push({ x: p.target.x, y: p.target.y, type: "wood" });
              diveResources.push({ x: p.target.x+8, y: p.target.y+4, type: "wood" });
              p.state = "idle";
              p.target = null;
              p.idleTimer = 40;
            }
          } else if (p.state === "mining") {
            p.toolAngle = Math.sin(diveFrame * 0.22) * 0.85;
            p.progress++;
            if (p.progress >= p.maxProgress) {
              diveResources.push({ x: p.x, y: p.y, type: "stone" });
              diveResources.push({ x: p.x+6, y: p.y+5, type: "stone" });
              p.state = "idle";
              p.target = null;
              p.idleTimer = 50;
            }
          } else if (p.state === "farming") {
            p.toolAngle = Math.sin(diveFrame * 0.2) * 0.7;
            p.progress++;
            if (p.progress >= p.maxProgress) {
              // plant a new tree
              diveTrees.push({
                x: p.x + (Math.random()-0.5)*30,
                y: p.y + (Math.random()-0.5)*30,
                size: 8 + Math.random()*6,
                health: 100
              });
              p.state = "idle";
              p.target = null;
              p.idleTimer = 60;
            }
          } else if (p.state === "building") {
            p.progress++;
            p.target.progress = p.progress;
            if (p.progress >= p.maxProgress) {
              // finish building
              diveBuildings.push({
                x: p.target.x, y: p.target.y,
                w: p.target.w, h: p.target.h,
                type: p.target.buildType, owner: null
              });
              diveConstruction = diveConstruction.filter(c => c !== p.target);
              p.state = "idle";
              p.target = null;
              p.idleTimer = 80;
            }
          }
        }
      }

      // Homemakers stay near house
      if ((p.role === "Homemaker" || p.role === "Childcare") && p.house && p.state === "idle") {
        const hx = p.house.x + p.house.w/2;
        const hy = p.house.y + p.house.h/2;
        if (Math.hypot(p.x-hx, p.y-hy) > 55) {
          p.vx = (hx - p.x) * 0.012;
          p.vy = (hy - p.y) * 0.012;
        }
      }

      // Fighting
      if (p.state === "fighting" && p.target) {
        const dist = Math.hypot(p.x - p.target.x, p.y - p.target.y);
        if (dist > 22) {
          p.vx = (p.target.x - p.x) * 0.02;
          p.vy = (p.target.y - p.y) * 0.02;
        } else {
          p.vx = 0; p.vy = 0;
          p.progress++;
          if (p.progress >= p.maxProgress) {
            p.state = "idle";
            p.target = null;
            p.idleTimer = 100;
          }
        }
      }
    }

    // Apply velocity
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 40 || p.x > w-40) p.vx *= -1;
    if (p.y < 130 || p.y > h-50) p.vy *= -1;

    if (p.glowTimer > 0) p.glowTimer--;

    // Marriage (rare)
    if (p.type === "adult" && !p.married && p.state === "idle" && Math.random() < 0.0007) {
      for (let j = i+1; j < divePeople.length; j++) {
        const o = divePeople[j];
        if (o.type !== "adult" || o.married || o.sex === p.sex) continue;
        if (Math.hypot(p.x-o.x, p.y-o.y) < 30 && Math.random() < 0.45) {
          p.married = true; o.married = true;
          p.spouse = o.name; o.spouse = p.name;
          p.glowTimer = 90; o.glowTimer = 90;
          let house = p.house || o.house || diveBuildings.find(b => b.type==="house" && !b.owner);
          if (house) {
            house.owner = p; p.house = house; o.house = house;
          }
          if (Math.random() < 0.55) {
            p.children++; o.children++;
            const bs = Math.random()<0.5 ? "M" : "F";
            divePeople.push({
              x:(p.x+o.x)/2, y:(p.y+o.y)/2, sex:bs, type:"baby", role:"Baby",
              name: bs==="M"?"Baby Boy":"Baby Girl", age:0, spouse:null, children:0,
              married:false, glowTimer:0, house, state:"idle", carry:null,
              toolAngle:0, progress:0, vx:0, vy:0, idleTimer:999
            });
          }
          break;
        }
      }
    }

    // ===== DRAW PERSON =====
    if (p.type === "adult") {
      const color = p.sex === "M" ? "#3b82f6" : "#ec4899";

      if (p.glowTimer > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y-12, 15, 0, Math.PI*2);
        ctx.fillStyle = `rgba(250,204,21,${p.glowTimer/90*0.5})`;
        ctx.fill();
      }

      // body
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
        ctx.fillRect(6, -2, 16, 4);           // axe handle
        ctx.fillStyle = "#a1a1aa";
        ctx.fillRect(18, -6, 8, 10);          // axe head
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
        // shield + sword
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath(); ctx.arc(-11, 0, 7, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(17, -14); ctx.stroke();
      }
      ctx.restore();

      // Carrying resource
      if (p.carry === "wood") {
        ctx.fillStyle = "#92400e";
        ctx.fillRect(p.x+7, p.y-14, 10, 5);
      } else if (p.carry === "stone") {
        ctx.fillStyle = "#78716c";
        ctx.fillRect(p.x+7, p.y-15, 9, 9);
      }

      // Building timer box around builder
      if (p.state === "building" && p.target) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x-18, p.y-38, 36, 20);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(p.x-16, p.y-36, 32, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        const left = Math.max(0, Math.ceil((p.maxProgress - p.progress)/60));
        ctx.fillText(left + "s", p.x, p.y-24);
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

// Helper: try to start a construction if enough resources exist
function startBuilding(builder, data) {
  const woods = diveResources.filter(r => r.type === "wood");
  const stones = diveResources.filter(r => r.type === "stone");

  const isPyramid = data.landmarks === "egypt" && Math.random() < 0.35;
  const needWood = isPyramid ? 0 : 7;
  const needStone = isPyramid ? 15 : 2;

  if (woods.length >= needWood && stones.length >= needStone) {
    // consume resources
    for (let i = 0; i < needWood; i++) {
      const idx = diveResources.findIndex(r => r.type === "wood");
      if (idx !== -1) diveResources.splice(idx, 1);
    }
    for (let i = 0; i < needStone; i++) {
      const idx = diveResources.findIndex(r => r.type === "stone");
      if (idx !== -1) diveResources.splice(idx, 1);
    }

    const site = {
      x: 100 + Math.random() * (window.innerWidth - 220),
      y: 150 + Math.random() * (window.innerHeight - 320),
      w: isPyramid ? 70 + Math.random()*40 : 45 + Math.random()*30,
      h: isPyramid ? 55 + Math.random()*30 : 38 + Math.random()*25,
      progress: 0,
      max: isPyramid ? 320 : 180,          // longer for pyramid
      buildType: isPyramid ? "pyramid" : "house"
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
  const houseText = p.house ? "Has a house" : "No house";
  const work = p.state !== "idle" ? ` • Currently: ${p.state}` : "";

  diveInfoBar.innerHTML = `
    <div>
      <strong style="color:${color}">${p.name}</strong>
      &nbsp;•&nbsp; ${typeLabel} &nbsp;•&nbsp; Age ${p.age}
      &nbsp;•&nbsp; Role: <strong>${p.role}</strong>
      &nbsp;•&nbsp; ${status} &nbsp;•&nbsp; ${kids} &nbsp;•&nbsp; ${houseText}${work}
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
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  for (const p of divePeople) {
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

// ---------- UI (unchanged core) ----------
function renderEvents() {
  const el = document.getElementById("eventLog");
  if (!el) return;
  let html = "";
  state.events.slice(0,30).forEach(e => {
    const y = e.year < 0 ? Math.abs(e.year)+" BCE" : e.year+" CE";
    html += `<div class="event ${e.type}"><span class="year">${y}</span><span class="msg">${e.msg}</span></div>`;
  });
  el.innerHTML = html;
}

function updateUI() {
  document.getElementById("yearDisplay").textContent = state.year < 0 ? Math.abs(state.year)+" BCE" : state.year+" CE";
  document.getElementById("eraDisplay").textContent = state.era;
  document.getElementById("popDisplay").textContent = state.population.toLocaleString();
  document.getElementById("cityDisplay").textContent = state.cities.length;
  document.getElementById("aliveDisplay").textContent = state.humans.filter(h => h.alive).length;

  document.getElementById("statGrid").innerHTML = `
    <div class="stat-card"><div class="label">Population</div><div class="value">${state.population.toLocaleString()}</div></div>
    <div class="stat-card"><div class="label">Living Agents</div><div class="value">${state.humans.filter(h=>h.alive).length}</div></div>
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
    const y = t.year < 0 ? Math.abs(t.year)+" BCE" : t.year+" CE";
    techHtml += `<div class="tech-item ${state.tech[t.id]?"unlocked":"locked"}"><span>${state.tech[t.id]?"✓":"○"} ${t.name}</span><span>${y}</span></div>`;
  });
  document.getElementById("techList").innerHTML = techHtml;

  const alive = state.humans.filter(h => h.alive).sort((a,b)=>b.age-a.age).slice(0,18);
  let peopleHtml = alive.length === 0 ? '<div style="color:var(--muted)">No living people.</div>' : "";
  alive.forEach(h => {
    const color = h.sex==="M" ? "#3b82f6" : "#ec4899";
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
    const color = h.sex==="M" ? "#3b82f6" : "#ec4899";
    panel.innerHTML = `
      <div style="font-size:1.15rem;font-weight:600;color:${color};margin-bottom:8px">${h.name}</div>
      <div class="res-item"><span>Age</span><span>${h.age}</span></div>
      <div class="res-item"><span>Hunger</span><span>${h.hungerLevel}</span></div>
      <div class="res-item"><span>Thirst</span><span>${h.thirstLevel}</span></div>
      <div class="res-item"><span>Job</span><span>${h.job}</span></div>
      <div class="res-item"><span>Living</span><span>${h.livingDescription}</span></div>
      <div class="res-item"><span>Spouse</span><span>${h.spouse&&h.spouse.alive?h.spouse.name:"None"}</span></div>
      <div class="res-item"><span>Children</span><span>${h.children.filter(c=>c.alive).length}</span></div>
      <button onclick="zoomToPerson(${h.id})" style="width:100%;margin-top:8px;background:var(--accent);border:none;color:white;padding:8px;border-radius:6px;cursor:pointer">Zoom to Person</button>`;
  } else if (state.focusType === "city") {
    const c = state.focus;
    panel.innerHTML = `
      <div style="font-size:1.15rem;font-weight:600;color:#fbbf24;margin-bottom:6px">${c.name}</div>
      <div class="res-item"><span>Population</span><span>${Math.floor(c.pop).toLocaleString()}</span></div>
      <div class="res-item"><span>Level</span><span>${["","Village","Town","City","Metropolis"][c.level]}</span></div>
      <div class="res-item"><span>Nation</span><span>${c.nation?c.nation.name:"Independent"}</span></div>
      <div class="res-item"><span>Hospital</span><span>${c.hasHospital?"Yes 🏥":"No"}</span></div>
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
  if (map) map.setView([20,0], 2);
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
  document.getElementById("timelineLabel").textContent = state.year < 0 ? Math.abs(state.year)+" BCE" : state.year+" CE";
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
  const dt = Math.min(0.05, (now - last)/1000);
  last = now; acc += dt*1000;
  if (acc > 160) {
    acc = 0;
    if (!cityDiveActive) tick();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
