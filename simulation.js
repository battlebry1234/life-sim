// simulation.js
// ===================== CORE SIMULATION =====================

const START_YEAR = -12000;
const END_YEAR = 2025;

let playerName = "Creator";

const state = {
  year: START_YEAR,
  speed: 1,
  running: false,
  humans: [],
  families: [],
  cities: [],
  nations: [],
  events: [],
  resources: {
    food: 9000,
    wood: 3500,
    stone: 2200,
    metal: 0,
    energy: 0,
    knowledge: 12
  },
  tech: {},
  era: "Paleolithic",
  population: 0,
  marriages: 0,
  wars: 0,
  discoveries: 0,
  focus: null,
  focusType: null
};

const TECH_TREE = [
  { id: "fire", name: "Fire", year: -400000 },
  { id: "tools", name: "Stone Tools", year: -300000 },
  { id: "language", name: "Language", year: -50000 },
  { id: "agriculture", name: "Agriculture", year: -10000 },
  { id: "pottery", name: "Pottery", year: -8000 },
  { id: "writing", name: "Writing", year: -3400 },
  { id: "bronze", name: "Bronze", year: -3300 },
  { id: "cities", name: "Cities", year: -4000 },
  { id: "iron", name: "Iron", year: -1200 },
  { id: "empire", name: "Empires", year: -500 },
  { id: "gunpowder", name: "Gunpowder", year: 850 },
  { id: "printing", name: "Printing", year: 1440 },
  { id: "steam", name: "Steam Engine", year: 1712 },
  { id: "electricity", name: "Electricity", year: 1831 },
  { id: "automobile", name: "Automobile", year: 1886 },
  { id: "airplane", name: "Flight", year: 1903 },
  { id: "antibiotics", name: "Antibiotics", year: 1928 },
  { id: "nuclear", name: "Nuclear", year: 1945 },
  { id: "computer", name: "Computer", year: 1946 },
  { id: "internet", name: "Internet", year: 1969 },
  { id: "smartphone", name: "Smartphone", year: 2007 },
  { id: "ai", name: "Modern AI", year: 2012 },
  { id: "fastfood", name: "Fast Food", year: 1948 },
  { id: "supermarket", name: "Supermarkets", year: 1930 },
  { id: "hospitals", name: "Hospitals", year: 1800 }
];
TECH_TREE.forEach(t => (state.tech[t.id] = false));

const MILESTONES = [
  { year: -10000, type: "discovery", msg: "Agriculture begins in multiple regions." },
  { year: -4000, type: "discovery", msg: "First true cities appear." },
  { year: -3100, type: "politics", msg: "Egypt is unified." },
  { year: -1200, type: "war", msg: "Bronze Age Collapse." },
  { year: -753, type: "politics", msg: "Rome is founded." },
  { year: -27, type: "politics", msg: "Roman Empire begins." },
  { year: 476, type: "war", msg: "Western Roman Empire falls." },
  { year: 1206, type: "war", msg: "Mongol Empire rises under Genghis Khan." },
  { year: 1347, type: "disaster", msg: "Black Death reaches Europe." },
  { year: 1492, type: "discovery", msg: "Columbus reaches the Americas." },
  { year: 1776, type: "politics", msg: "American Independence." },
  { year: 1789, type: "politics", msg: "French Revolution." },
  { year: 1914, type: "war", msg: "World War I begins." },
  { year: 1929, type: "disaster", msg: "Great Depression begins." },
  { year: 1939, type: "war", msg: "World War II begins." },
  { year: 1945, type: "war", msg: "World War II ends. UN founded. Nuclear age." },
  { year: 1948, type: "discovery", msg: "Fast-food era begins." },
  { year: 1969, type: "discovery", msg: "Moon landing. ARPANET born." },
  { year: 1989, type: "politics", msg: "Fall of the Berlin Wall." },
  { year: 1991, type: "discovery", msg: "World Wide Web goes public." },
  { year: 2001, type: "war", msg: "September 11 attacks." },
  { year: 2007, type: "discovery", msg: "Smartphone revolution." },
  { year: 2020, type: "disaster", msg: "COVID-19 pandemic." }
];

const FIRST_M = ["Adam","Noah","Liam","Marcus","Omar","Kenji","Raj","Carlos","Ivan","Erik","Chen","Amir","Jonas","Theo","Leo","Sam","Kai","Diego","Hassan","Yuri"];
const FIRST_F = ["Eve","Emma","Sofia","Aisha","Yuki","Priya","Maria","Anya","Freya","Mei","Layla","Nora","Isla","Zara","Lina","Hana","Ava","Elena","Sara","Maya"];
const LAST = ["Smith","Garcia","Kim","Patel","Müller","Silva","Ivanov","Nguyen","Ali","Cohen","Sato","Rossi","Andersen","Costa","Berg","Khan","Novak","Fischer","Lopez","Wang"];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function cityName() {
  return rand(["New","Old","Great","Port","Fort","Saint","Mount","River","Lake","East","West"]) +
         rand(["haven","bridge","ford","chester","ton","burg","ville","polis","grad","land","field","wood"]);
}
function nationName() {
  return rand(["Aethel","Bor","Cal","Dor","Ely","Fen","Gal","Hel","Iber","Jor","Kor","Lyr","Mer","Nor","Ost","Pel","Rav","Sol","Tor","Val","Wes","Yor"]) +
         rand(["ia","land","stan","ania","esia","aria","oria"]);
}
function personName(sex) {
  return (sex === "M" ? rand(FIRST_M) : rand(FIRST_F)) + " " + rand(LAST);
}

let nextId = 1;

// ---------- Classes ----------
class Human {
  constructor(lat, lng, year = state.year, sex = null) {
    this.id = nextId++;
    this.lat = lat;
    this.lng = lng;
    this.birth = year;
    this.sex = sex || (Math.random() < 0.5 ? "M" : "F");
    this.name = personName(this.sex);
    this.spouse = null;
    this.children = [];
    this.family = null;
    this.city = null;
    this.alive = true;
    this.health = 0.78 + Math.random() * 0.22;
    this.job = "forager";
    this.hunger = 15 + Math.random() * 25;
    this.thirst = 10 + Math.random() * 20;
    this.houseQuality = "none";
  }

  get age() {
    return Math.max(0, state.year - this.birth);
  }

  get hungerLevel() {
    if (this.hunger < 25) return "low";
    if (this.hunger < 50) return "medium";
    if (this.hunger < 75) return "high";
    return "starving";
  }

  get thirstLevel() {
    if (this.thirst < 25) return "low";
    if (this.thirst < 50) return "medium";
    if (this.thirst < 75) return "high";
    return "dehydrated";
  }

  get livingDescription() {
    let desc = "";
    if (this.houseQuality === "large") desc = "large house";
    else if (this.houseQuality === "nice") desc = "nice house";
    else if (this.houseQuality === "basic") desc = "simple house";
    else desc = "no permanent home";

    const kids = this.children.filter(c => c.alive);
    const kidCount = kids.length;

    if (this.spouse && this.spouse.alive) {
      const partnerWord = this.sex === "M" ? "wife" : "husband";
      if (kidCount === 0) {
        desc += " with a " + partnerWord + " named " + this.spouse.name;
      } else if (kidCount === 1) {
        desc += " with 1 child and a " + partnerWord + " named " + this.spouse.name;
      } else {
        desc += " with " + kidCount + " kids and a " + partnerWord + " named " + this.spouse.name;
      }
    } else if (kidCount > 0) {
      desc += " with " + kidCount + (kidCount === 1 ? " child" : " kids");
    }
    return desc;
  }
}

class Family {
  constructor(founder) {
    this.id = nextId++;
    this.members = [founder];
    this.founded = state.year;
    founder.family = this;
  }
  add(h) {
    if (!this.members.includes(h)) {
      this.members.push(h);
      h.family = this;
    }
  }
}

class City {
  constructor(lat, lng, name) {
    this.id = nextId++;
    this.lat = lat;
    this.lng = lng;
    this.name = name;
    this.founded = state.year;
    this.pop = 200 + Math.floor(Math.random() * 400);
    this.level = 1;
    this.nation = null;
    this.hasHospital = false;
    this.marker = null; // Leaflet marker
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

// ---------- Helpers ----------
function logEvent(type, msg, year = state.year) {
  state.events.unshift({ year, type, msg });
  if (state.events.length > 80) state.events.pop();
  if (typeof renderEvents === "function") renderEvents();
}

function getEra(y) {
  if (y < -10000) return "Paleolithic";
  if (y < -4000) return "Neolithic";
  if (y < -500) return "Ancient";
  if (y < 500) return "Classical";
  if (y < 1400) return "Medieval";
  if (y < 1700) return "Early Modern";
  if (y < 1900) return "Industrial";
  if (y < 1970) return "Modern";
  return "Information Age";
}

function randomLandPosition() {
  // Rough land areas (approximate real continents)
  const zones = [
    { lat: [5, 35], lng: [-10, 40] },      // Africa
    { lat: [35, 70], lng: [-10, 40] },     // Europe
    { lat: [20, 60], lng: [40, 140] },     // Asia
    { lat: [25, 50], lng: [-130, -60] },   // North America
    { lat: [-40, 10], lng: [-80, -35] },   // South America
    { lat: [-40, -10], lng: [110, 155] }   // Australia
  ];
  const z = rand(zones);
  return {
    lat: z.lat[0] + Math.random() * (z.lat[1] - z.lat[0]),
    lng: z.lng[0] + Math.random() * (z.lng[1] - z.lng[0])
  };
}

// ---------- Init ----------
function initWorld() {
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
  Object.keys(state.tech).forEach(k => (state.tech[k] = false));
  state.resources = { food: 9000, wood: 3500, stone: 2200, metal: 0, energy: 0, knowledge: 12 };

  // Starting population
  for (let i = 0; i < 90; i++) {
    const pos = randomLandPosition();
    const h = new Human(pos.lat, pos.lng, START_YEAR - Math.floor(Math.random() * 50));
    state.humans.push(h);
    if (Math.random() < 0.28) {
      const f = new Family(h);
      state.families.push(f);
    }
  }

  state.population = state.humans.length;
  logEvent("discovery", "Early human bands spread across the continents.");
  if (typeof updateUI === "function") updateUI();
  if (typeof refreshMapMarkers === "function") refreshMapMarkers();
}

// ---------- Simulation systems ----------
function unlockTech() {
  TECH_TREE.forEach(t => {
    if (!state.tech[t.id] && state.year >= t.year) {
      state.tech[t.id] = true;
      state.discoveries++;
      logEvent("discovery", "Technology: " + t.name);
      if (t.id === "cities" && state.cities.length === 0) spawnFirstCities();
      if (t.id === "hospitals") {
        state.cities.forEach(c => {
          if (Math.random() < 0.4) c.hasHospital = true;
        });
      }
    }
  });
}

function spawnFirstCities() {
  const seeds = [
    { name: "Uruk", lat: 31.3, lng: 45.6 },
    { name: "Memphis", lat: 29.8, lng: 31.2 },
    { name: "Mohenjo-Daro", lat: 27.3, lng: 68.1 },
    { name: "Anyang", lat: 36.1, lng: 114.3 },
    { name: "Caral", lat: -10.9, lng: -77.5 },
    { name: "Athens", lat: 37.98, lng: 23.72 },
    { name: "Rome", lat: 41.9, lng: 12.5 }
  ];

  seeds.forEach(s => {
    const c = new City(s.lat, s.lng, s.name);
    c.pop = 3000 + Math.floor(Math.random() * 6000);
    c.level = 2;
    state.cities.push(c);

    for (let i = 0; i < 18; i++) {
      const h = new Human(
        s.lat + (Math.random() - 0.5) * 0.3,
        s.lng + (Math.random() - 0.5) * 0.3
      );
      h.city = c;
      h.job = "farmer";
      state.humans.push(h);
    }
  });

  logEvent("discovery", "First true cities rise.");
  if (typeof refreshMapMarkers === "function") refreshMapMarkers();
}

function processMarriages() {
  const singles = state.humans.filter(h => h.alive && !h.spouse && h.age >= 16 && h.age < 45);
  for (let i = 0; i < singles.length - 1; i++) {
    if (Math.random() > 0.007 * Math.min(state.speed, 6)) continue;
    const a = singles[i];
    let best = null;
    let bestD = 8;
    for (let j = i + 1; j < singles.length; j++) {
      const b = singles[j];
      if (a.sex === b.sex || b.spouse) continue;
      const d = Math.hypot(a.lat - b.lat, a.lng - b.lng);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (!best) continue;
    a.spouse = best;
    best.spouse = a;
    state.marriages++;
    if (!a.family) {
      const f = new Family(a);
      f.add(best);
      state.families.push(f);
    } else {
      a.family.add(best);
    }
    if (Math.random() < 0.12) {
      logEvent("family", a.name + " and " + best.name + " marry.");
    }
  }
}

function processBirths() {
  const mothers = state.humans.filter(
    h => h.alive && h.spouse && h.sex === "F" && h.age >= 17 && h.age < 40
  );
  mothers.forEach(m => {
    const rate = state.tech.agriculture ? 0.02 : 0.01;
    if (Math.random() < rate * (Math.min(state.speed, 5) / 12)) {
      const child = new Human(
        m.lat + (Math.random() - 0.5) * 0.05,
        m.lng + (Math.random() - 0.5) * 0.05,
        state.year
      );
      child.parents = [m, m.spouse];
      m.children.push(child);
      if (m.spouse) m.spouse.children.push(child);
      if (m.family) m.family.add(child);
      if (m.city) {
        child.city = m.city;
        m.city.pop++;
      }
      child.job = m.city ? "child" : "forager";
      state.humans.push(child);
    }
  });
}

function processNeeds() {
  state.humans.forEach(h => {
    if (!h.alive) return;
    h.hunger += 0.6 + Math.random() * 0.5;
    h.thirst += 0.9 + Math.random() * 0.7;

    if (h.city) {
      h.hunger = Math.max(0, h.hunger - 1.5);
      h.thirst = Math.max(0, h.thirst - 1.9);
      if (h.houseQuality === "none" && Math.random() < 0.02) h.houseQuality = "basic";
      if (h.houseQuality === "basic" && Math.random() < 0.008) h.houseQuality = "nice";
      if (h.houseQuality === "nice" && Math.random() < 0.003) h.houseQuality = "large";
    } else {
      h.hunger = Math.max(0, h.hunger - 0.3);
      h.thirst = Math.max(0, h.thirst - 0.4);
    }

    h.hunger = Math.min(100, h.hunger);
    h.thirst = Math.min(100, h.thirst);

    if (h.hunger > 80 || h.thirst > 85) h.health -= 0.006;
  });
}

function processDeaths() {
  state.humans.forEach(h => {
    if (!h.alive) return;
    const age = h.age;
    let chance = 0;

    if (age >= 100) chance = 1.0;
    else if (age >= 95) chance = 0.42;
    else if (age >= 90) chance = 0.16;
    else if (age >= 85) chance = 0.07;
    else if (age >= 80) chance = 0.03;
    else if (age >= 70) chance = 0.01;
    else chance = 0.0012 + (1 - h.health) * 0.0035;

    if (h.hunger > 92) chance += 0.14;
    if (h.thirst > 94) chance += 0.2;

    // Hospitals reduce death chance
    if (h.city && h.city.hasHospital && state.tech.hospitals) {
      chance *= 0.65;
    }

    if (Math.random() < chance || age >= 100) {
      h.alive = false;
      if (h.city) h.city.pop = Math.max(0, h.city.pop - 1);
      if (h.spouse) h.spouse.spouse = null;
    }
  });

  if (state.year % 10 === 0) {
    state.humans = state.humans.filter(h => h.alive);
  }
}

function growCities() {
  if (!state.tech.cities) return;

  state.cities.forEach(c => {
    const g = state.tech.agriculture ? 1.004 : 1.0015;
    c.pop = Math.floor(c.pop * g);
    if (c.pop > 40000 && c.level < 3) c.level = 3;
    if (c.pop > 400000 && c.level < 4) c.level = 4;

    // Chance to get a hospital once the tech exists
    if (state.tech.hospitals && !c.hasHospital && Math.random() < 0.002) {
      c.hasHospital = true;
      logEvent("discovery", c.name + " builds a hospital.");
    }
  });

  if (state.year > -2500 && Math.random() < 0.001 * state.speed && state.cities.length < 60) {
    const pos = randomLandPosition();
    const c = new City(pos.lat, pos.lng, cityName());
    c.pop = 250 + Math.floor(Math.random() * 600);
    state.cities.push(c);
    logEvent("politics", "New settlement: " + c.name);
    if (typeof refreshMapMarkers === "function") refreshMapMarkers();
  }
}

function formNations() {
  if (state.year < -800 && !state.tech.empire) return;
  if (state.nations.length === 0 && state.cities.length >= 3) {
    const cap = state.cities[0];
    const n = new Nation(nationName(), cap);
    state.nations.push(n);
    logEvent("politics", "Nation of " + n.name + " forms.");
  }
  state.nations.forEach(n => {
    state.cities.forEach(c => {
      if (c.nation) return;
      const d = Math.hypot(c.lat - n.capital.lat, c.lng - n.capital.lng);
      if (d < 15 && Math.random() < 0.004) {
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
  logEvent("war", "War between " + a.name + " and " + b.name + ".");
}

function processResources() {
  state.resources.food += state.tech.agriculture ? 120 : 30;
  state.resources.food -= state.population * 0.4;
  if (state.resources.food < 0) state.resources.food = 0;
  if (state.tech.steam) state.resources.energy += 3;
  if (state.tech.electricity) state.resources.energy += 10;
  if (state.year > 1900) state.resources.energy += 25;
  state.resources.knowledge += state.population * 0.00004 * (state.tech.printing ? 2 : 1) * (state.tech.internet ? 5 : 1);
}

function checkMilestones() {
  MILESTONES.forEach(m => {
    if (m.year === state.year) {
      logEvent(m.type, m.msg);
      if (m.type === "war") state.wars++;
      if (m.type === "discovery") state.discoveries++;
    }
  });
}

function updatePop() {
  let p = state.humans.filter(h => h.alive).length;
  state.cities.forEach(c => (p += Math.floor(c.pop * 0.15)));
  if (state.year < -5000) p = Math.max(p, 1500000 + (state.year + 12000) * 150);
  else if (state.year < 0) p = Math.max(p, 12000000 + state.year * 1200);
  else if (state.year < 1800) p = Math.max(p, 180000000 + state.year * 250000);
  else if (state.year < 1950) p = Math.max(p, 900000000 + (state.year - 1800) * 5000000);
  else p = Math.max(p, 2300000000 + (state.year - 1950) * 50000000);
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
      document.getElementById("btnPlay").classList.remove("active");
      logEvent("discovery", "Reached 2025.");
      break;
    }
    unlockTech();
    processMarriages();
    processBirths();
    processNeeds();
    processDeaths();
    growCities();
    formNations();
    processWars();
    processResources();
    checkMilestones();
  }
  updatePop();
  state.era = getEra(state.year);
  if (typeof updateUI === "function") updateUI();
  document.getElementById("timeline").value = state.year;
  document.getElementById("timelineLabel").textContent =
    state.year < 0 ? Math.abs(state.year) + " BCE" : state.year + " CE";
}

// ---------- Creator actions ----------
function addHumans() {
  for (let i = 0; i < 15; i++) {
    const pos = randomLandPosition();
    state.humans.push(new Human(pos.lat, pos.lng));
  }
  logEvent("discovery", playerName + " created 15 new humans.");
  if (typeof updateUI === "function") updateUI();
  if (typeof refreshMapMarkers === "function") refreshMapMarkers();
}

function addFood() {
  state.resources.food += 3000;
  logEvent("discovery", playerName + " bestowed food upon the world (+3000).");
  if (typeof updateUI === "function") updateUI();
}

function addWood() {
  state.resources.wood += 2000;
  logEvent("discovery", playerName + " created wood (+2000).");
  if (typeof updateUI === "function") updateUI();
}

function addStone() {
  state.resources.stone += 1800;
  logEvent("discovery", playerName + " created stone (+1800).");
  if (typeof updateUI === "function") updateUI();
}

function addTrees() {
  logEvent("discovery", playerName + " caused new forests to grow.");
  if (typeof updateUI === "function") updateUI();
}

function addHospitals() {
  let count = 0;
  state.cities.forEach(c => {
    if (!c.hasHospital) {
      c.hasHospital = true;
      count++;
    }
  });
  logEvent("discovery", playerName + " established hospitals in " + count + " cities.");
  if (typeof updateUI === "function") updateUI();
  if (typeof refreshMapMarkers === "function") refreshMapMarkers();
}

// Expose for other files
window.state = state;
window.initWorld = initWorld;
window.tick = tick;
window.logEvent = logEvent;
window.getEra = getEra;
window.TECH_TREE = TECH_TREE;
window.addHumans = addHumans;
window.addFood = addFood;
window.addWood = addWood;
window.addStone = addStone;
window.addTrees = addTrees;
window.addHospitals = addHospitals;
window.playerName = playerName;
