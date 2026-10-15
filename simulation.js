// simulation.js
const MAP_W = 180, MAP_H = 100;
const START_YEAR = -12000, END_YEAR = 2025;

const state = {
  year: START_YEAR,
  speed: 1,
  running: true,
  humans: [],
  families: [],
  cities: [],
  nations: [],
  events: [],
  resources: { food: 9000, wood: 3500, stone: 2200, metal: 0, energy: 0, knowledge: 12 },
  environment: { forests: 0, oceans: 0, rivers: 0, lakes: 0, mountains: 0, deserts: 0, cropland: 0 },
  tech: {},
  era: 'Paleolithic',
  population: 0,
  marriages: 0,
  wars: 0,
  discoveries: 0,
  focus: null,
  focusType: null
};

const terrain = new Uint8Array(MAP_W * MAP_H);
const elev = new Float32Array(MAP_W * MAP_H);

const TECH_TREE = [
  {id:'fire',name:'Fire',year:-400000},
  {id:'tools',name:'Stone Tools',year:-300000},
  {id:'language',name:'Language',year:-50000},
  {id:'agriculture',name:'Agriculture',year:-10000},
  {id:'pottery',name:'Pottery',year:-8000},
  {id:'writing',name:'Writing',year:-3400},
  {id:'bronze',name:'Bronze',year:-3300},
  {id:'cities',name:'Cities',year:-4000},
  {id:'iron',name:'Iron',year:-1200},
  {id:'empire',name:'Empires',year:-500},
  {id:'gunpowder',name:'Gunpowder',year:850},
  {id:'printing',name:'Printing',year:1440},
  {id:'steam',name:'Steam Engine',year:1712},
  {id:'electricity',name:'Electricity',year:1831},
  {id:'automobile',name:'Automobile',year:1886},
  {id:'airplane',name:'Flight',year:1903},
  {id:'antibiotics',name:'Antibiotics',year:1928},
  {id:'nuclear',name:'Nuclear',year:1945},
  {id:'computer',name:'Computer',year:1946},
  {id:'internet',name:'Internet',year:1969},
  {id:'smartphone',name:'Smartphone',year:2007},
  {id:'ai',name:'Modern AI',year:2012},
  {id:'fastfood',name:'Fast Food',year:1948},
  {id:'supermarket',name:'Supermarkets',year:1930}
];
TECH_TREE.forEach(t => state.tech[t.id] = false);

const MILESTONES = [
  {year:-10000,type:'discovery',msg:'Agriculture begins in multiple regions.'},
  {year:-4000,type:'discovery',msg:'First true cities appear.'},
  {year:-3100,type:'politics',msg:'Egypt is unified.'},
  {year:-1200,type:'war',msg:'Bronze Age Collapse.'},
  {year:-753,type:'politics',msg:'Rome is founded.'},
  {year:-27,type:'politics',msg:'Roman Empire begins.'},
  {year:476,type:'war',msg:'Western Roman Empire falls.'},
  {year:1206,type:'war',msg:'Mongol Empire rises under Genghis Khan.'},
  {year:1347,type:'disaster',msg:'Black Death reaches Europe.'},
  {year:1492,type:'discovery',msg:'Columbus reaches the Americas.'},
  {year:1776,type:'politics',msg:'American Independence.'},
  {year:1789,type:'politics',msg:'French Revolution.'},
  {year:1914,type:'war',msg:'World War I begins.'},
  {year:1929,type:'disaster',msg:'Great Depression begins.'},
  {year:1939,type:'war',msg:'World War II begins.'},
  {year:1945,type:'war',msg:'World War II ends. UN founded. Nuclear age.'},
  {year:1948,type:'discovery',msg:'Fast-food era begins.'},
  {year:1969,type:'discovery',msg:'Moon landing. ARPANET born.'},
  {year:1989,type:'politics',msg:'Fall of the Berlin Wall.'},
  {year:1991,type:'discovery',msg:'World Wide Web goes public.'},
  {year:2001,type:'war',msg:'September 11 attacks.'},
  {year:2007,type:'discovery',msg:'Smartphone revolution.'},
  {year:2020,type:'disaster',msg:'COVID-19 pandemic.'}
];

const FIRST_M = ['Adam','Noah','Liam','Marcus','Omar','Kenji','Raj','Carlos','Ivan','Erik','Chen','Amir','Jonas','Theo','Leo','Sam','Kai','Diego','Hassan','Yuri'];
const FIRST_F = ['Eve','Emma','Sofia','Aisha','Yuki','Priya','Maria','Anya','Freya','Mei','Layla','Nora','Isla','Zara','Lina','Hana','Ava','Elena','Sara','Maya'];
const LAST = ['Smith','Garcia','Kim','Patel','Müller','Silva','Ivanov','Nguyen','Ali','Cohen','Sato','Rossi','Andersen','Costa','Berg','Khan','Novak','Fischer','Lopez','Wang'];

function rand(a){ return a[Math.floor(Math.random()*a.length)]; }
function cityName(){ return rand(['New','Old','Great','Port','Fort','Saint','Mount','River','Lake','East','West']) + rand(['haven','bridge','ford','chester','ton','burg','ville','polis','grad','land','field','wood']); }
function nationName(){ return rand(['Aethel','Bor','Cal','Dor','Ely','Fen','Gal','Hel','Iber','Jor','Kor','Lyr','Mer','Nor','Ost','Pel','Rav','Sol','Tor','Val','Wes','Yor']) + rand(['ia','land','stan','ania','esia','aria','oria']); }
function personName(sex){ return (sex==='M'?rand(FIRST_M):rand(FIRST_F))+' '+rand(LAST); }

let nextId = 1;

class Human {
  constructor(x, y, year = state.year, sex = null) {
    this.id = nextId++;
    this.x = x; this.y = y;
    this.birth = year;
    this.sex = sex || (Math.random() < 0.5 ? 'M' : 'F');
    this.name = personName(this.sex);
    this.spouse = null;
    this.children = [];
    this.family = null;
    this.city = null;
    this.alive = true;
    this.health = 0.78 + Math.random() * 0.22;
    this.job = 'forager';
    this.walkTimer = Math.random() * 8;
    this.targetX = x; this.targetY = y;
  }
  get age() { return Math.max(0, state.year - this.birth); }
}

class Family {
  constructor(f) {
    this.id = nextId++;
    this.members = [f];
    this.founded = state.year;
    f.family = this;
  }
  add(h) {
    if (!this.members.includes(h)) {
      this.members.push(h);
      h.family = this;
    }
  }
}

class Building {
  constructor(city, lx, ly, w, h, type) {
    this.city = city; this.lx = lx; this.ly = ly; this.w = w; this.h = h; this.type = type;
    const colors = {
      house: ['#86efac','#4ade80'],
      shop: ['#93c5fd','#60a5fa'],
      fastfood: ['#fca5a5','#f87171'],
      factory: ['#a8a29e','#78716c'],
      park: ['#bbf7d0'],
      landmark: ['#fde68a','#fbbf24']
    };
    const p = colors[type] || colors.house;
    this.color = p[Math.floor(Math.random() * p.length)];
  }
}

class City {
  constructor(x, y, name) {
    this.x = x; this.y = y; this.name = name;
    this.founded = state.year;
    this.pop = 140 + Math.floor(Math.random() * 200);
    this.level = 1;
    this.nation = null;
    this.buildings = [];
    this.streets = [];
    this.layoutReady = false;
    this.localSize = 16; // smaller so it doesn’t overwhelm the map
  }
  ensureLayout() {
    if (this.layoutReady) return;
    this.layoutReady = true;
    const size = this.localSize;
    const step = 2.3;
    for (let i = -size/2; i <= size/2; i += step) {
      this.streets.push({x1: -size/2, y1: i, x2: size/2, y2: i, main: Math.abs(i) < 0.4});
      this.streets.push({x1: i, y1: -size/2, x2: i, y2: size/2, main: Math.abs(i) < 0.4});
    }
    const count = Math.min(140, 35 + Math.floor(this.pop / 90));
    for (let i = 0; i < count; i++) {
      const lx = (Math.random() - 0.5) * (size - 3);
      const ly = (Math.random() - 0.5) * (size - 3);
      const w = 0.85 + Math.random() * 1.25;
      const h = 0.85 + Math.random() * 1.25;
      let type = 'house';
      const r = Math.random();
      if (r < 0.07 && state.tech.fastfood) type = 'fastfood';
      else if (r < 0.16 && state.tech.supermarket) type = 'shop';
      else if (r < 0.22 && state.tech.steam) type = 'factory';
      else if (r < 0.28) type = 'park';
      else if (r < 0.32) type = 'landmark';
      this.buildings.push(new Building(this, lx, ly, w, h, type));
    }
  }
}

class Nation {
  constructor(name, capital) {
    this.name = name;
    this.capital = capital;
    this.founded = state.year;
    this.cities = [capital];
    this.pop = capital.pop;
    capital.nation = this;
  }
}

// Map generation with better continent shapes
function noise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
function fbm(x, y, oct = 5) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise(x * f, y * f);
    a *= 0.5; f *= 2.1;
  }
  return v;
}

function generateMap() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const nx = x / MAP_W, ny = y / MAP_H;
      let land = 0;
      // Rough real continent masks
      if (nx > 0.42 && nx < 0.58 && ny > 0.35 && ny < 0.78) land += 0.72; // Africa
      if (nx > 0.50 && nx < 0.88 && ny > 0.18 && ny < 0.52) land += 0.78; // Eurasia
      if (nx > 0.12 && nx < 0.35 && ny > 0.15 && ny < 0.48) land += 0.70; // N America
      if (nx > 0.22 && nx < 0.38 && ny > 0.48 && ny < 0.82) land += 0.65; // S America
      if (nx > 0.72 && nx < 0.88 && ny > 0.58 && ny < 0.78) land += 0.60; // Australia
      if (nx > 0.28 && nx < 0.42 && ny > 0.08 && ny < 0.25) land += 0.45; // Greenland-ish

      let e = fbm(nx * 3.8, ny * 3.8, 5) * 0.5 + land * 0.55;
      elev[y * MAP_W + x] = e;

      if (e < 0.37) terrain[y * MAP_W + x] = 0;
      else if (e > 0.77) terrain[y * MAP_W + x] = 4;
      else if (e > 0.61 && noise(x * 0.2, y * 0.2) > 0.55) terrain[y * MAP_W + x] = 3;
      else if (noise(x * 0.15, y * 0.15) > 0.48) terrain[y * MAP_W + x] = 2;
      else terrain[y * MAP_W + x] = 1;
    }
  }
  // Rivers
  for (let i = 0; i < 16; i++) {
    let x = Math.floor(Math.random() * MAP_W), y = Math.floor(Math.random() * MAP_H);
    if (terrain[y * MAP_W + x] === 0) continue;
    for (let s = 0; s < 65; s++) {
      terrain[y * MAP_W + x] = 5;
      let best = elev[y * MAP_W + x], bx = x, by = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
        if (elev[ny * MAP_W + nx] < best) { best = elev[ny * MAP_W + nx]; bx = nx; by = ny; }
      }
      if (bx === x && by === y) break;
      x = bx; y = by;
      if (terrain[y * MAP_W + x] === 0) break;
    }
  }
  countEnv();
}

function countEnv() {
  const c = { forests:0, oceans:0, rivers:0, lakes:0, mountains:0, deserts:0, cropland:0 };
  for (let i = 0; i < terrain.length; i++) {
    const t = terrain[i];
    if (t === 0) c.oceans++;
    else if (t === 2) c.forests++;
    else if (t === 3) c.deserts++;
    else if (t === 4) c.mountains++;
    else if (t === 5) c.rivers++;
    else if (t === 7) c.cropland++;
  }
  Object.assign(state.environment, c);
}

function logEvent(type, msg, year = state.year) {
  state.events.unshift({ year, type, msg });
  if (state.events.length > 70) state.events.pop();
  if (typeof renderEvents === 'function') renderEvents();
}

function initWorld() {
  generateMap();
  state.humans = [];
  state.families = [];
  state.cities = [];
  state.nations = [];
  state.events = [];
  state.year = START_YEAR;
  state.marriages = 0;
  state.wars = 0;
  state.discoveries = 0;
  state.focus = null;
  state.focusType = null;
  Object.keys(state.tech).forEach(k => state.tech[k] = false);
  state.resources = { food: 9000, wood: 3500, stone: 2200, metal: 0, energy: 0, knowledge: 12 };

  // Start with more stable, longer-lived humans
  for (let i = 0; i < 100; i++) {
    let x, y, tries = 0;
    do {
      x = Math.random() * MAP_W;
      y = Math.random() * MAP_H;
      tries++;
    } while ((terrain[Math.floor(y) * MAP_W + Math.floor(x)] === 0 ||
              terrain[Math.floor(y) * MAP_W + Math.floor(x)] === 4) && tries < 40);
    const h = new Human(x, y, START_YEAR - Math.floor(Math.random() * 55));
    state.humans.push(h);
    if (Math.random() < 0.28) {
      const f = new Family(h);
      state.families.push(f);
    }
  }
  state.population = state.humans.length;
  logEvent('discovery', 'Early human bands spread across the continents.');
  if (typeof updateUI === 'function') updateUI();
}

function getEra(y) {
  if (y < -10000) return 'Paleolithic';
  if (y < -4000) return 'Neolithic';
  if (y < -500) return 'Ancient';
  if (y < 500) return 'Classical';
  if (y < 1400) return 'Medieval';
  if (y < 1700) return 'Early Modern';
  if (y < 1900) return 'Industrial';
  if (y < 1970) return 'Modern';
  return 'Information Age';
}

function unlockTech() {
  TECH_TREE.forEach(t => {
    if (!state.tech[t.id] && state.year >= t.year) {
      state.tech[t.id] = true;
      state.discoveries++;
      logEvent('discovery', `Technology: ${t.name}`);
      if (t.id === 'agriculture') {
        for (let i = 0; i < 35; i++) {
          const idx = Math.floor(Math.random() * terrain.length);
          if (terrain[idx] === 1 || terrain[idx] === 2) terrain[idx] = 7;
        }
        countEnv();
      }
      if (t.id === 'cities' && state.cities.length === 0) spawnFirstCities();
    }
  });
}

function spawnFirstCities() {
  const names = ['Uruk', 'Memphis', 'Mohenjo-Daro', 'Anyang', 'Caral', 'Athens', 'Rome'];
  for (let i = 0; i < 6; i++) {
    let x, y, tries = 0;
    do {
      x = 22 + Math.random() * (MAP_W - 44);
      y = 16 + Math.random() * (MAP_H - 32);
      tries++;
    } while (terrain[Math.floor(y) * MAP_W + Math.floor(x)] === 0 && tries < 25);
    const c = new City(x, y, names[i] || cityName());
    c.pop = 2200 + Math.floor(Math.random() * 4500);
    c.level = 2;
    state.cities.push(c);
    for (let j = 0; j < 22; j++) {
      const h = new Human(x + (Math.random() - 0.5) * 3.5, y + (Math.random() - 0.5) * 3.5);
      h.city = c;
      h.job = 'farmer';
      state.humans.push(h);
    }
  }
  logEvent('discovery', 'First true cities rise.');
}

function processMarriages() {
  const singles = state.humans.filter(h => h.alive && !h.spouse && h.age >= 16 && h.age < 44);
  for (let i = 0; i < singles.length - 1; i++) {
    if (Math.random() > 0.006 * Math.min(state.speed, 6)) continue;
    const a = singles[i];
    let best = null, bestD = 8;
    for (let j = i + 1; j < singles.length; j++) {
      const b = singles[j];
      if (a.sex === b.sex || b.spouse) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (!best) continue;
    a.spouse = best;
    best.spouse = a;
    state.marriages++;
    if (!a.family) {
      const f = new Family(a);
      f.add(best);
      state.families.push(f);
    } else a.family.add(best);
    if (Math.random() < 0.10) logEvent('family', `${a.name} and ${best.name} marry.`);
  }
}

function processBirths() {
  const mothers = state.humans.filter(h => h.alive && h.spouse && h.sex === 'F' && h.age >= 17 && h.age < 39);
  mothers.forEach(m => {
    const rate = state.tech.agriculture ? 0.025 : 0.012;
    if (Math.random() < rate * (Math.min(state.speed, 5) / 12)) {
      const child = new Human(m.x + (Math.random() - 0.5) * 0.4, m.y + (Math.random() - 0.5) * 0.4, state.year);
      child.parents = [m, m.spouse];
      m.children.push(child);
      if (m.spouse) m.spouse.children.push(child);
      if (m.family) m.family.add(child);
      if (m.city) {
        child.city = m.city;
        m.city.pop++;
      }
      child.job = m.city ? 'child' : 'forager';
      state.humans.push(child);
    }
  });
}

function processDeaths() {
  // Significantly gentler death rate so people actually stay around
  const baseLife = state.tech.antibiotics ? 75 : state.tech.agriculture ? 50 : 36;
  state.humans.forEach(h => {
    if (!h.alive) return;
    const over = Math.max(0, h.age - baseLife);
    const chance = 0.00025 + over * 0.0032 + (1 - h.health) * 0.004;
    if (Math.random() < chance * (Math.min(state.speed, 4) / 18) || h.age > 102) {
      h.alive = false;
      if (h.city) h.city.pop = Math.max(0, h.city.pop - 1);
      if (h.spouse) h.spouse.spouse = null;
    }
  });
  if (state.year % 80 === 0) {
    state.humans = state.humans.filter(h => h.alive);
  }
}

function growCities() {
  if (!state.tech.cities) return;
  state.cities.forEach(c => {
    const g = state.tech.agriculture ? 1.005 : 1.0015;
    c.pop = Math.floor(c.pop * g);
    if (c.pop > 35000 && c.level < 3) c.level = 3;
    if (c.pop > 350000 && c.level < 4) c.level = 4;
  });
  if (state.year > -2400 && Math.random() < 0.0009 * state.speed && state.cities.length < 50) {
    let x = Math.random() * MAP_W, y = Math.random() * MAP_H;
    if (terrain[Math.floor(y) * MAP_W + Math.floor(x)] !== 0) {
      const c = new City(x, y, cityName());
      c.pop = 180 + Math.floor(Math.random() * 500);
      state.cities.push(c);
      logEvent('politics', `New settlement: ${c.name}`);
    }
  }
}

function formNations() {
  if (state.year < -750 && !state.tech.empire) return;
  if (state.nations.length === 0 && state.cities.length >= 3) {
    const cap = state.cities[0];
    const n = new Nation(nationName(), cap);
    state.nations.push(n);
    logEvent('politics', `Nation of ${n.name} forms.`);
  }
  state.nations.forEach(n => {
    state.cities.forEach(c => {
      if (c.nation) return;
      if (Math.hypot(c.x - n.capital.x, c.y - n.capital.y) < 24 && Math.random() < 0.004) {
        c.nation = n;
        n.cities.push(c);
        n.pop += c.pop;
      }
    });
  });
}

function processWars() {
  if (state.nations.length < 2 || Math.random() > 0.0012 * state.speed) return;
  const a = state.nations[Math.floor(Math.random() * state.nations.length)];
  const b = state.nations[Math.floor(Math.random() * state.nations.length)];
  if (a === b) return;
  state.wars++;
  logEvent('war', `War between ${a.name} and ${b.name}.`);
}

function processResources() {
  const farm = state.environment.cropland * (state.tech.agriculture ? 5.5 : 0);
  state.resources.food += farm + state.environment.forests * 0.008;
  state.resources.food -= state.population * 0.45;
  if (state.resources.food < 0) state.resources.food = 0;
  if (state.tech.steam) state.resources.energy += 2.5;
  if (state.tech.electricity) state.resources.energy += 9;
  if (state.year > 1900) state.resources.energy += 22;
  state.resources.knowledge += state.population * 0.00004 * (state.tech.printing ? 2 : 1) * (state.tech.internet ? 5 : 1);
}

function checkMilestones() {
  MILESTONES.forEach(m => {
    if (m.year === state.year) {
      logEvent(m.type, m.msg);
      if (m.type === 'war') state.wars++;
      if (m.type === 'discovery') state.discoveries++;
    }
  });
}

function updatePop() {
  let p = state.humans.filter(h => h.alive).length;
  state.cities.forEach(c => p += Math.floor(c.pop * 0.18));
  if (state.year < -5000) p = Math.max(p, 1800000 + (state.year + 12000) * 180);
  else if (state.year < 0) p = Math.max(p, 14000000 + state.year * 1400);
  else if (state.year < 1800) p = Math.max(p, 190000000 + state.year * 280000);
  else if (state.year < 1950) p = Math.max(p, 950000000 + (state.year - 1800) * 5500000);
  else p = Math.max(p, 2400000000 + (state.year - 1950) * 55000000);
  state.population = Math.floor(p);
}

function tick() {
  if (!state.running) return;
  const steps = Math.max(1, Math.floor(state.speed));
  for (let s = 0; s < steps; s++) {
    state.year++;
    if (state.year > END_YEAR) {
      state.year = END_YEAR;
      state.running = false;
      document.getElementById('btnPlay').classList.remove('active');
      logEvent('discovery', 'Reached 2025.');
      break;
    }
    unlockTech();
    processMarriages();
    processBirths();
    processDeaths();
    growCities();
    formNations();
    processWars();
    processResources();
    checkMilestones();
  }
  updatePop();
  state.era = getEra(state.year);
  if (typeof updateUI === 'function') updateUI();
  const tl = document.getElementById('timeline');
  if (tl) {
    tl.value = state.year;
    document.getElementById('timelineLabel').textContent =
      state.year < 0 ? Math.abs(state.year) + ' BCE' : state.year + ' CE';
  }
}

// Expose for renderer
window.state = state;
window.MAP_W = MAP_W;
window.MAP_H = MAP_H;
window.terrain = terrain;
window.initWorld = initWorld;
window.tick = tick;
window.TECH_TREE = TECH_TREE;
window.getEra = getEra;
