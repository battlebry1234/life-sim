<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Human Evolution – Visual Simulator</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0c10;
    color: #e0e6f0;
    font-family: system-ui, sans-serif;
    overflow: hidden;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  #topBar {
    background: #12151c;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 30px;
    border-bottom: 1px solid #1e2430;
    z-index: 10;
  }
  .year {
    font-size: 28px;
    font-weight: 700;
    color: #5b9cff;
    min-width: 220px;
  }
  .stat {
    font-size: 14px;
    color: #8b93a7;
  }
  .stat b { color: #e0e6f0; font-size: 16px; }
  #canvas {
    flex: 1;
    display: block;
    background: radial-gradient(ellipse at center, #11151d 0%, #0a0c10 70%);
  }
  #overlay {
    position: absolute;
    top: 70px;
    left: 20px;
    background: rgba(18,21,28,0.85);
    padding: 16px 20px;
    border-radius: 12px;
    border: 1px solid #2a3140;
    width: 260px;
    backdrop-filter: blur(8px);
  }
  .bar-label { font-size: 12px; color: #8b93a7; margin-bottom: 4px; }
  .bar {
    height: 10px;
    background: #1e2430;
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.4s;
  }
  .tech { background: linear-gradient(90deg, #5b9cff, #3dd68c); }
  .houses { background: #ffb347; }
  .weapons { background: #ff6b6b; }
  #startScreen {
    position: absolute;
    inset: 0;
    background: #0a0c10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  #startScreen h1 {
    font-size: 42px;
    margin-bottom: 8px;
    background: linear-gradient(90deg, #5b9cff, #3dd68c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  #startScreen p {
    color: #8b93a7;
    margin-bottom: 40px;
    text-align: center;
    max-width: 400px;
  }
  #startBtn {
    background: #5b9cff;
    color: white;
    border: none;
    padding: 16px 48px;
    font-size: 18px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
  }
  #startBtn:hover { background: #4a8aef; }
  .legend {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: rgba(18,21,28,0.85);
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    border: 1px solid #2a3140;
  }
  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
  }
</style>
</head>
<body>

<div id="startScreen">
  <h1>Human Evolution</h1>
  <p>From the time of the dinosaurs to the future.<br>
     Watch people live, mate, have babies, build houses, invent weapons and form politics.</p>
  <button id="startBtn">Start Simulation</button>
</div>

<div id="topBar">
  <div class="year" id="year">Year −65,000,000</div>
  <div class="stat">People <b id="pop">0</b></div>
  <div class="stat">Married <b id="married">0</b></div>
  <div class="stat">Loners <b id="loners">0</b></div>
  <div class="stat">Babies born <b id="babies">0</b></div>
</div>

<canvas id="canvas"></canvas>

<div id="overlay">
  <div class="bar-label">Technology</div>
  <div class="bar"><div class="bar-fill tech" id="techBar" style="width:0%"></div></div>
  <div class="bar-label">Houses</div>
  <div class="bar"><div class="bar-fill houses" id="houseBar" style="width:0%"></div></div>
  <div class="bar-label">Weapons</div>
  <div class="bar"><div class="bar-fill weapons" id="weaponBar" style="width:0%"></div></div>
  <div style="margin-top:12px;font-size:13px;color:#8b93a7">
    Politics: <span id="politics" style="color:#e0e6f0">None</span>
  </div>
  <div style="margin-top:6px;font-size:13px;color:#8b93a7">
    Era: <span id="era" style="color:#3dd68c">Post-Dinosaur</span>
  </div>
</div>

<div class="legend">
  <div><span class="dot" style="background:#5b9cff"></span> Male</div>
  <div><span class="dot" style="background:#ff6b9d"></span> Female</div>
  <div><span class="dot" style="background:#3dd68c"></span> Married</div>
  <div><span class="dot" style="background:#ffb347"></span> Baby</div>
</div>

<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight - 60;
}
window.addEventListener('resize', resize);
resize();

// ===================== SIMULATION STATE =====================
let year = -65000000;
let agents = [];
let nextId = 0;
let tech = 0;
let houses = 0;
let weapons = 0;
let politics = "None";
let totalBabies = 0;
let running = false;

const TECH_NAMES = ["None","Tools","Fire","Language","Agriculture","Metal","Writing","Guns","Industry","Electricity","Computers","Internet","AI","Space","Post-Human"];

// ===================== AGENT =====================
class Agent {
  constructor(birth, parents = null) {
    this.id = nextId++;
    this.birth = birth;
    this.sex = Math.random() < 0.5 ? 'M' : 'F';
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = (Math.random() - 0.5) * 1.2;
    this.r = 5 + Math.random() * 3;
    this.marriedTo = null;
    this.isBaby = false;
    this.babyTimer = 0;
    this.alive = true;
    this.libido = 40 + Math.random() * 50;
    this.social = 30 + Math.random() * 50;
    this.health = 60 + Math.random() * 30;

    if (parents) {
      this.intelligence = (parents[0].intelligence + parents[1].intelligence) / 2 + (Math.random()-0.5)*10;
      this.isBaby = true;
      this.babyTimer = 90; // frames of glowing as baby
      this.r = 3;
    } else {
      this.intelligence = 10 + Math.random() * 20;
    }
  }

  age() { return year - this.birth; }

  update() {
    // movement
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 10 || this.x > W-10) this.vx *= -1;
    if (this.y < 10 || this.y > H-10) this.vy *= -1;

    // gentle drift toward center if too far
    const cx = W/2, cy = H/2;
    this.vx += (cx - this.x) * 0.00008;
    this.vy += (cy - this.y) * 0.00008;

    // damping
    this.vx *= 0.995;
    this.vy *= 0.995;

    if (this.isBaby) {
      this.babyTimer--;
      if (this.babyTimer <= 0) {
        this.isBaby = false;
        this.r = 5 + Math.random() * 3;
      }
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);

    if (this.isBaby) {
      ctx.fillStyle = '#ffb347';
      ctx.shadowColor = '#ffb347';
      ctx.shadowBlur = 12;
    } else if (this.marriedTo !== null) {
      ctx.fillStyle = '#3dd68c';
    } else if (this.sex === 'M') {
      ctx.fillStyle = '#5b9cff';
    } else {
      ctx.fillStyle = '#ff6b9d';
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // tiny ring if loner and older
    if (this.marriedTo === null && this.age() > 30) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 3, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();
    }
  }
}

// ===================== INIT =====================
function init() {
  agents = [];
  for (let i = 0; i < 40; i++) {
    agents.push(new Agent(year - Math.floor(Math.random()*15)));
  }
}

// ===================== CORE LOGIC (simplified for visual) =====================
function step() {
  // time jumps (accelerated early, slower later)
  let stepSize;
  if (year < -2000000) stepSize = 120000;
  else if (year < -500000) stepSize = 40000;
  else if (year < -50000) stepSize = 8000;
  else if (year < 0) stepSize = 400;
  else if (year < 1800) stepSize = 30;
  else stepSize = 8;

  year += stepSize;
  if (year > 2300) year = 2300;

  // age & die
  agents = agents.filter(a => {
    const age = a.age();
    const deathChance = 0.002 + Math.pow(age/100, 3) * 0.1;
    if (Math.random() < deathChance || age > 105) {
      if (a.marriedTo !== null) {
        const p = agents.find(x => x.id === a.marriedTo);
        if (p) p.marriedTo = null;
      }
      return false;
    }
    return true;
  });

  // marriages
  const singles = agents.filter(a => a.marriedTo === null && a.age() > 16 && a.age() < 55);
  const males = singles.filter(a => a.sex === 'M');
  const females = singles.filter(a => a.sex === 'F');
  for (let m of males) {
    if (females.length === 0) break;
    if (Math.random() < 0.08 + tech * 0.01) {
      const f = females.splice(Math.floor(Math.random()*females.length), 1)[0];
      m.marriedTo = f.id;
      f.marriedTo = m.id;
      // pull them closer
      m.vx += (f.x - m.x) * 0.02;
      m.vy += (f.y - m.y) * 0.02;
    }
  }

  // sex & babies (married)
  for (let a of agents) {
    if (a.sex !== 'F' || a.marriedTo === null) continue;
    const partner = agents.find(x => x.id === a.marriedTo);
    if (!partner) continue;
    if (a.age() > 15 && a.age() < 45 && Math.random() < 0.04) {
      if (agents.length < 350) {
        const baby = new Agent(year, [a, partner]);
        // spawn near mother
        baby.x = a.x + (Math.random()-0.5)*30;
        baby.y = a.y + (Math.random()-0.5)*30;
        agents.push(baby);
        totalBabies++;
      }
    }
  }

  // technology growth
  const avgInt = agents.reduce((s,a) => s + (a.intelligence||15), 0) / (agents.length || 1);
  tech += (avgInt / 80) * Math.log10(agents.length + 5) * 0.008;
  tech = Math.min(14, tech);

  if (tech > 1.5) houses = Math.min(100, houses + 0.3);
  if (tech > 2.5) weapons = Math.min(100, weapons + 0.25);
  if (tech > 4) houses = Math.min(100, houses + 0.5);

  // politics
  if (tech < 3) politics = "Bands";
  else if (tech < 5) politics = "Tribes";
  else if (tech < 7) politics = "Kingdoms";
  else if (tech < 9) politics = "Nations";
  else if (tech < 11) politics = "Global Order";
  else politics = "AI Age";

  // soft population control
  if (agents.length > 320) {
    agents.splice(0, agents.length - 300);
  }
}

// ===================== RENDER =====================
function draw() {
  ctx.clearRect(0, 0, W, H);

  // faint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 80) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }

  // draw agents
  for (let a of agents) {
    a.update();
    a.draw();
  }

  // connection lines for married couples (subtle)
  ctx.strokeStyle = 'rgba(61,214,140,0.15)';
  ctx.lineWidth = 1;
  for (let a of agents) {
    if (a.marriedTo !== null && a.sex === 'M') {
      const p = agents.find(x => x.id === a.marriedTo);
      if (p) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
  }
}

// ===================== UI UPDATE =====================
function updateUI() {
  document.getElementById('year').textContent = 'Year ' + year.toLocaleString();
  document.getElementById('pop').textContent = agents.length;
  const married = agents.filter(a => a.marriedTo !== null).length / 2 | 0;
  document.getElementById('married').textContent = married;
  document.getElementById('loners').textContent = agents.filter(a => a.marriedTo === null && a.age() > 28).length;
  document.getElementById('babies').textContent = totalBabies;

  document.getElementById('techBar').style.width = (tech / 14 * 100) + '%';
  document.getElementById('houseBar').style.width = houses + '%';
  document.getElementById('weaponBar').style.width = weapons + '%';
  document.getElementById('politics').textContent = politics;

  let era = "Post-Dinosaur";
  if (year > -300000) era = "Early Humans";
  if (year > -10000) era = "Agriculture";
  if (year > 0) era = "Civilizations";
  if (year > 1800) era = "Industrial";
  if (year > 1950) era = "Modern";
  if (year > 2100) era = "Future";
  document.getElementById('era').textContent = era;
}

// ===================== LOOP =====================
function loop() {
  if (running) {
    step();
    updateUI();
  }
  draw();
  requestAnimationFrame(loop);
}

// ===================== START =====================
document.getElementById('startBtn').onclick = () => {
  document.getElementById('startScreen').style.display = 'none';
  init();
  running = true;
};

loop();
</script>
</body>
</html>
