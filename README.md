<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Human Evolution Simulator</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;600&display=swap');

  :root {
    --bg: #0f1115;
    --panel: #1a1d24;
    --border: #2a2f3a;
    --text: #e6e9ef;
    --muted: #8b93a7;
    --accent: #5b9cff;
    --green: #3dd68c;
    --red: #ff6b6b;
    --orange: #ffb347;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 20px;
    line-height: 1.5;
  }

  h1 {
    font-size: 1.6rem;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .subtitle {
    color: var(--muted);
    font-size: 0.95rem;
    margin-bottom: 24px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
    align-items: center;
  }

  button {
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.9rem;
    transition: all 0.15s;
  }

  button:hover { background: #252a35; border-color: var(--accent); }
  button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  button:disabled { opacity: 0.4; cursor: not-allowed; }

  .speed-label { color: var(--muted); font-size: 0.85rem; }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 900px) {
    .grid { grid-template-columns: 1fr; }
  }

  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 20px;
  }

  .panel h2 {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 0.95rem;
  }

  .stat-value { font-family: 'JetBrains Mono', monospace; font-weight: 600; }

  .year-display {
    font-size: 2rem;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .tech-bar {
    height: 8px;
    background: #2a2f3a;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
  }

  .tech-fill {
    height: 100%;
    background: linear-gradient(90deg, #5b9cff, #3dd68c);
    width: 0%;
    transition: width 0.4s;
  }

  #log {
    height: 320px;
    overflow-y: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    background: #12151b;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--border);
  }

  .log-entry { margin-bottom: 4px; color: var(--muted); }
  .log-entry.important { color: var(--green); }
  .log-entry.disaster { color: var(--red); }
  .log-entry.tech { color: var(--orange); }

  .footer {
    margin-top: 20px;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
</head>
<body>

<h1>Human Evolution Simulator</h1>
<p class="subtitle">From post-dinosaur world → present → future &nbsp;|&nbsp; Sex, marriage, babies, loners, tech, weapons, houses & politics</p>

<div class="controls">
  <button id="btnStart">Start</button>
  <button id="btnPause" disabled>Pause</button>
  <button id="btnReset">Reset</button>
  <span class="speed-label">Speed:</span>
  <button class="speed-btn" data-speed="1">1×</button>
  <button class="speed-btn active" data-speed="5">5×</button>
  <button class="speed-btn" data-speed="20">20×</button>
  <button class="speed-btn" data-speed="100">100×</button>
  <button class="speed-btn" data-speed="1000">1000×</button>
</div>

<div class="grid">
  <div class="panel">
    <div class="year-display" id="yearDisplay">Year −65,000,000</div>
    <div class="stat-row"><span>Population</span><span class="stat-value" id="pop">0</span></div>
    <div class="stat-row"><span>Married pairs</span><span class="stat-value" id="married">0</span></div>
    <div class="stat-row"><span>Loners</span><span class="stat-value" id="loners">0</span></div>
    <div class="stat-row"><span>Sexual encounters</span><span class="stat-value" id="sexCount">0</span></div>
    <div class="stat-row"><span>Births / Deaths</span><span class="stat-value" id="birthsDeaths">0 / 0</span></div>
  </div>

  <div class="panel">
    <h2>Society</h2>
    <div class="stat-row"><span>Tech Level</span><span class="stat-value" id="techLevel">0.00</span></div>
    <div class="tech-bar"><div class="tech-fill" id="techBar"></div></div>
    <div class="stat-row" style="margin-top:10px"><span>Tech Era</span><span class="stat-value" id="techName">None</span></div>
    <div class="stat-row"><span>Houses</span><span class="stat-value" id="houses">0</span></div>
    <div class="stat-row"><span>Weapons</span><span class="stat-value" id="weapons">0</span></div>
    <div class="stat-row"><span>Politics</span><span class="stat-value" id="politics">None</span></div>
  </div>
</div>

<div class="panel">
  <h2>Event Log</h2>
  <div id="log"></div>
</div>

<p class="footer">Simulation runs entirely in your browser. Early deep time is accelerated; later periods slow down for readability.</p>

<script>
// ============================================================
// CONFIG
// ============================================================
const START_YEAR = -65000000;
const HUMAN_ERA  = -300000;
const END_YEAR   = 2200;
const MAX_AGENTS = 600;

const TECH_NAMES = [
  "None","Tools","Fire","Language","Agriculture",
  "Metalworking","Writing","Gunpowder","Industrial",
  "Electricity","Computers","Internet","AI","Spacefaring","Post-Human"
];

// ============================================================
// STATE
// ============================================================
let year = START_YEAR;
let agents = [];
let nextId = 0;
let techLevel = 0;
let houses = 0;
let weapons = 0;
let politicalSystem = "None";
let totalBirths = 0;
let totalDeaths = 0;
let marriages = 0;
let sexualEncounters = 0;
let loners = 0;
let running = false;
let speed = 5;               // multiplier
let lastTick = 0;
let intervalId = null;

// ============================================================
// HELPERS
// ============================================================
function clamp(v, lo=0, hi=100){ return Math.max(lo, Math.min(hi, v)); }
function mutate(v, amt=5){ return clamp(v + (Math.random()-0.5)*2*amt); }
function rand(min, max){ return min + Math.random()*(max-min); }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function techName(level){
  return TECH_NAMES[Math.min(Math.floor(level), TECH_NAMES.length-1)];
}

function log(msg, type=""){
  const el = document.getElementById("log");
  const div = document.createElement("div");
  div.className = "log-entry " + type;
  div.textContent = `[${year.toLocaleString()}] ${msg}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  // keep log reasonable
  while(el.children.length > 200) el.removeChild(el.firstChild);
}

// ============================================================
// AGENT
// ============================================================
function createAgent(birthYear, parents=null){
  const a = {
    id: nextId++,
    birthYear,
    sex: Math.random() < 0.5 ? "M" : "F",
    intelligence: parents ? mutate((parents[0].intelligence+parents[1].intelligence)/2, 5.5) : rand(8,23),
    aggression:   parents ? mutate((parents[0].aggression+parents[1].aggression)/2, 6)   : rand(20,58),
    sociality:    parents ? mutate((parents[0].sociality+parents[1].sociality)/2, 5.5)   : rand(25,75),
    libido:       parents ? mutate((parents[0].libido+parents[1].libido)/2, 7)           : rand(30,80),
    health:       parents ? mutate((parents[0].health+parents[1].health)/2 + 3, 7)       : rand(55,93),
    techAffinity: parents ? mutate((parents[0].techAffinity+parents[1].techAffinity)/2, 3.8) : rand(0,5),
    politicalLean: (Math.random()-0.5)*2,
    marriedTo: null,
    children: [],
    alive: true,
    isLoner: false,
    lastSexYear: -999999
  };
  return a;
}

// ============================================================
// CORE SIMULATION
// ============================================================
function initPopulation(n=48){
  agents = [];
  nextId = 0;
  for(let i=0;i<n;i++) agents.push(createAgent(year - Math.floor(rand(1,16))));
  log(`Initial population of ${n} early post-dinosaur mammals established.`, "important");
}

function ageAndDie(){
  const dead = [];
  for(const a of agents){
    if(!a.alive) continue;
    const age = year - a.birthYear;
    let chance = 0.0016 + Math.pow(age/112, 3)*0.13;
    chance *= Math.max(0.22, 1.18 - techLevel*0.048);
    chance *= Math.max(0.35, 1.28 - a.health/145);
    if(Math.random() < chance || age > 110){
      a.alive = false;
      dead.push(a.id);
      totalDeaths++;
      if(a.marriedTo !== null){
        const p = agents.find(x => x.id === a.marriedTo);
        if(p) p.marriedTo = null;
      }
    }
  }
  agents = agents.filter(a => a.alive);
}

function formMarriages(){
  const singles = agents.filter(a => a.alive && a.marriedTo===null && (year-a.birthYear)>=15 && (year-a.birthYear)<=55);
  const males = singles.filter(a => a.sex==="M");
  const females = singles.filter(a => a.sex==="F");
  // shuffle
  for(let i=males.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [males[i],males[j]]=[males[j],males[i]]; }

  for(const m of males){
    if(females.length===0) break;
    let best=null, bestScore=-999;
    const candidates = females.slice(0, Math.min(12, females.length));
    for(const f of candidates){
      let score = -Math.abs(m.sociality-f.sociality)*0.4
                - Math.abs(m.intelligence-f.intelligence)*0.25
                + (m.sociality+f.sociality)*0.15
                + (m.libido+f.libido)*0.05
                + rand(-10,10);
      if(score > bestScore){ bestScore=score; best=f; }
    }
    if(best && bestScore > -20 && Math.random() < 0.48 + techLevel*0.02){
      m.marriedTo = best.id;
      best.marriedTo = m.id;
      marriages++;
      females.splice(females.indexOf(best),1);
    }
  }
}

function haveSexAndBabies(){
  // Married sex
  for(const a of agents){
    if(a.sex!=="F" || a.marriedTo===null) continue;
    const partner = agents.find(x => x.id===a.marriedTo);
    if(!partner || !partner.alive) continue;

    const ageF = year - a.birthYear;
    const ageM = year - partner.birthYear;
    if(ageF<15 || ageF>48 || ageM<15 || ageM>65) continue;

    const yearsSince = year - Math.max(a.lastSexYear, partner.lastSexYear);
    let desire = (a.libido + partner.libido)/2;
    desire *= (a.health + partner.health)/180;
    desire *= Math.min(2.5, 0.6 + yearsSince*0.15);

    if(Math.random() < desire/140){
      a.lastSexYear = year;
      partner.lastSexYear = year;
      sexualEncounters++;

      let preg = 0.22 - techLevel*0.012;
      preg *= a.health/90;
      if(Math.random() < preg && agents.length < MAX_AGENTS*1.2){
        const child = createAgent(year, [a, partner]);
        agents.push(child);
        a.children.push(child.id);
        partner.children.push(child.id);
        totalBirths++;
      }
    }
  }

  // Casual sex among unmarried
  const unmarried = agents.filter(a => a.marriedTo===null && (year-a.birthYear)>=16 && (year-a.birthYear)<=50);
  for(let i=0;i<unmarried.length-1;i+=2){
    const a1 = unmarried[i], a2 = unmarried[i+1];
    if(a1.sex === a2.sex) continue;
    const male = a1.sex==="M" ? a1 : a2;
    const female = a1.sex==="F" ? a1 : a2;

    let desire = (male.libido + female.libido)/2 * 0.55;
    desire *= (male.sociality + female.sociality)/160;
    if(Math.random() < desire/160){
      male.lastSexYear = year;
      female.lastSexYear = year;
      sexualEncounters++;

      let preg = 0.11 - techLevel*0.008;
      if(Math.random() < preg && agents.length < MAX_AGENTS*1.15){
        const child = createAgent(year, [male, female]);
        agents.push(child);
        totalBirths++;
      }
    }
  }
}

function updateLoners(){
  loners = 0;
  for(const a of agents){
    if(a.alive && a.marriedTo===null && (year-a.birthYear)>26){
      a.isLoner = true;
      loners++;
      if(a.sociality>60 && a.libido>55) a.health = Math.max(15, a.health-0.6);
    } else {
      a.isLoner = false;
    }
  }
}

function advanceTechnology(){
  if(agents.length===0) return;
  const avgInt = agents.reduce((s,a)=>s+a.intelligence,0)/agents.length;
  const avgAff = agents.reduce((s,a)=>s+a.techAffinity,0)/agents.length;
  const pop = agents.length;

  let progress = (avgInt/80)*(avgAff/30)*Math.log10(pop+10)*0.011;
  progress *= (1 + rand(-0.3,0.4));
  const old = techLevel;
  techLevel = Math.min(14.2, techLevel + progress);

  if(Math.floor(old) < Math.floor(techLevel)){
    log(`*** TECHNOLOGICAL LEAP → ${techName(techLevel)} ***`, "tech");
  }

  if(techLevel>=1.0 && weapons<1){ weapons=4; log("Simple tools and weapons appear.", "important"); }
  if(techLevel>=2.6 && houses<1){ houses=10; log("First permanent shelters / houses built.", "important"); }
  if(techLevel>=4.8) houses = Math.max(houses, Math.floor(pop*0.4));
  if(techLevel>=6.5) weapons = Math.max(weapons, Math.floor(pop*0.25));
  if(techLevel>=8.5){ houses = Math.max(houses, Math.floor(pop*0.8)); weapons = Math.max(weapons, Math.floor(pop*0.5)); }
}

function evolvePolitics(){
  if(techLevel < 3) politicalSystem = "Bands / Kin groups";
  else if(techLevel < 5) politicalSystem = "Tribes / Chiefdoms";
  else if(techLevel < 7) politicalSystem = "Early States / Kingdoms";
  else if(techLevel < 9.5){
    const avg = agents.reduce((s,a)=>s+a.politicalLean,0)/Math.max(1,agents.length);
    if(Math.abs(avg)<0.2) politicalSystem = "Constitutional / Mixed";
    else if(avg>0.15) politicalSystem = "Authoritarian / Strong-state";
    else politicalSystem = "Liberal / Democratic experiments";
  }
  else if(techLevel < 12) politicalSystem = "Globalized nation-states + corporations";
  else politicalSystem = "Post-national / AI-influenced systems";
}

function disasters(){
  if(Math.random() < 0.03){
    const severity = rand(0.07,0.35) * Math.max(0.25, 1.2 - techLevel*0.06);
    let deaths = 0;
    for(const a of agents){
      if(a.alive && Math.random() < severity*(1.2 - a.health/140)){
        a.alive = false;
        deaths++;
        totalDeaths++;
      }
    }
    agents = agents.filter(a => a.alive);
    if(deaths>0) log(`Disaster struck — ${deaths} dead (tech reduced the toll)`, "disaster");
  }
}

function softCap(){
  if(agents.length > MAX_AGENTS){
    const excess = agents.length - MAX_AGENTS;
    // randomly remove some
    for(let i=0;i<excess;i++){
      const idx = Math.floor(Math.random()*agents.length);
      agents[idx].alive = false;
      totalDeaths++;
    }
    agents = agents.filter(a => a.alive);
  }
}

// ============================================================
// TICK
// ============================================================
function tick(){
  // Adaptive step size
  let step;
  if(year < -2000000) step = 80000;
  else if(year < -800000) step = 20000;
  else if(year < HUMAN_ERA) step = 4000;
  else if(year < 0) step = 200;
  else if(year < 1800) step = 20;
  else step = 5;

  // Apply speed multiplier (but keep step reasonable)
  step = Math.max(1, Math.floor(step * (speed/5)));

  year += step;
  if(year > END_YEAR){ year = END_YEAR; stopSim(); }

  ageAndDie();
  formMarriages();
  haveSexAndBabies();
  updateLoners();
  advanceTechnology();
  evolvePolitics();
  disasters();
  softCap();

  updateUI();

  if(agents.length===0){
    log("*** EXTINCTION ***", "disaster");
    stopSim();
  }
}

// ============================================================
// UI
// ============================================================
function updateUI(){
  document.getElementById("yearDisplay").textContent = "Year " + year.toLocaleString();
  document.getElementById("pop").textContent = agents.length;
  const marriedPairs = agents.filter(a=>a.marriedTo!==null).length / 2 | 0;
  document.getElementById("married").textContent = marriedPairs;
  document.getElementById("loners").textContent = loners;
  document.getElementById("sexCount").textContent = sexualEncounters;
  document.getElementById("birthsDeaths").textContent = `${totalBirths} / ${totalDeaths}`;
  document.getElementById("techLevel").textContent = techLevel.toFixed(2);
  document.getElementById("techName").textContent = techName(techLevel);
  document.getElementById("techBar").style.width = Math.min(100, (techLevel/14)*100) + "%";
  document.getElementById("houses").textContent = houses;
  document.getElementById("weapons").textContent = weapons;
  document.getElementById("politics").textContent = politicalSystem;
}

function startSim(){
  if(running) return;
  running = true;
  document.getElementById("btnStart").disabled = true;
  document.getElementById("btnPause").disabled = false;
  lastTick = performance.now();
  intervalId = setInterval(()=>{
    // run multiple ticks depending on speed for smoothness
    const ticks = Math.max(1, Math.floor(speed/5));
    for(let i=0;i<ticks;i++) tick();
  }, 100); // base 10 ticks/sec at 5×
}

function stopSim(){
  running = false;
  clearInterval(intervalId);
  document.getElementById("btnStart").disabled = false;
  document.getElementById("btnPause").disabled = true;
}

function resetSim(){
  stopSim();
  year = START_YEAR;
  techLevel = 0;
  houses = 0;
  weapons = 0;
  politicalSystem = "None";
  totalBirths = 0;
  totalDeaths = 0;
  marriages = 0;
  sexualEncounters = 0;
  loners = 0;
  document.getElementById("log").innerHTML = "";
  initPopulation();
  updateUI();
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.getElementById("btnStart").onclick = startSim;
document.getElementById("btnPause").onclick = stopSim;
document.getElementById("btnReset").onclick = resetSim;

document.querySelectorAll(".speed-btn").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".speed-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    speed = parseInt(btn.dataset.speed);
  };
});

// ============================================================
// BOOT
// ============================================================
initPopulation();
updateUI();
log("Ready. Press Start to begin the simulation.", "important");
</script>
</body>
</html>
