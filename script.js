// ---------- settings ----------
const W = 120, H = 170;
const NUM_PETALS = 8;
const FX = 60, FY = 72;
const GROUND = 138;

const PINK = "#ffa0c8", BLUE = "#6e96ff", RED = "#eb3250";
const WHITE = "#ebf0ff", GREEN = "#32963c", DGREEN = "#1e642d";

const HEART = [
  ".##...##.",
  "####.####",
  "#########",
  "#########",
  ".#######.",
  "..#####..",
  "...###...",
  "....#....",
];

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ---------- helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);

function petalPoints(cx, cy, angle, length, width, offset = 0, steps = 14) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (2 * Math.PI * i) / steps;
    const u = offset + length / 2 + (length / 2) * Math.cos(t);
    const v = (width / 2) * Math.sin(t);
    pts.push([
      cx + u * Math.cos(angle) - v * Math.sin(angle),
      cy + u * Math.sin(angle) + v * Math.cos(angle),
    ]);
  }
  return pts;
}

function fillPoly(pts, fill, stroke) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawHeart(x, y, cell, color, broken) {
  const mid = Math.floor(HEART[0].length / 2);
  ctx.fillStyle = color;
  HEART.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch !== "#") return;
      let dx = 0, dy = 0;
      if (broken) {
        if (c < mid) { dx = -1; dy = 0; }
        else if (c > mid) { dx = 1; dy = 2; }
        else return;
      }
      ctx.fillRect(
        Math.round(x + c * cell + (dx * cell) / 2),
        Math.round(y + r * cell + (dy * cell) / 2),
        cell, cell
      );
    });
  });
}

// ---------- petals ----------
class Petal {
  constructor(angle) {
    this.angle = angle;
    this.attached = true;
    this.landed = false;
    this.x = 0; this.y = 0; this.vy = 0;
    this.rot = angle;
    this.phase = rand(0, 6.28);
    this.rotSpeed = rand(-2, 2);
    this.landY = GROUND + rand(2, 22);
  }
  detach() {
    this.attached = false;
    this.x = FX + Math.cos(this.angle) * 14;
    this.y = FY + Math.sin(this.angle) * 14;
    this.vy = 4;
  }
  update(dt, t) {
    if (this.attached || this.landed) return;
    this.vy = Math.min(this.vy + 25 * dt, 28);
    this.y += this.vy * dt;
    this.x += Math.sin(t * 2 + this.phase) * 14 * dt;
    this.rot += this.rotSpeed * dt;
    if (this.y >= this.landY) {
      this.y = this.landY;
      this.landed = true;
      this.rot = rand(-0.3, 0.3);
    }
  }
  draw() {
    let pts;
    if (this.attached) pts = petalPoints(FX, FY, this.angle, 26, 11, 7);
    else if (this.landed) pts = petalPoints(this.x, this.y, this.rot, 11, 4, -5);
    else pts = petalPoints(this.x, this.y, this.rot, 22, 9, -11);
    fillPoly(pts, WHITE, "#aabeeb");
  }
}

// ---------- game state ----------
const stars = Array.from({ length: 40 }, () => ({
  x: Math.floor(rand(0, W)), y: Math.floor(rand(0, 95)), ph: rand(0, 6.28),
}));
const grass = [];
for (let x = 0; x < W; x += 2) grass.push({ x, h: rand(3, 9), ph: rand(0, 6.28) });

let t, petals, plucked, text, color, state, finaleT;

function reset() {
  t = 0;
  petals = Array.from({ length: NUM_PETALS }, (_, i) =>
    new Petal((2 * Math.PI * i) / NUM_PETALS - Math.PI / 2)
  );
  plucked = 0;
  text = "TAP THE FLOWER";
  color = WHITE;
  state = "playing";
  finaleT = 0;
}

function update(dt) {
  t += dt;
  petals.forEach((p) => p.update(dt, t));
  if (state === "finale") finaleT += dt;
}

// called when you click/tap the canvas
function pluck(mx, my) {
  if (state !== "playing") return;

  // only react if you clicked on the flower
  if (Math.hypot(mx - FX, my - FY) > 36) return;

  const attached = petals.filter((p) => p.attached);
  if (attached.length === 0) return;

  let best;
  if (Math.hypot(mx - FX, my - FY) < 10) {
    // clicked the middle: a random petal falls
    best = attached[Math.floor(Math.random() * attached.length)];
  } else {
    // clicked a petal: the closest one falls
    let bestD = Infinity;
    attached.forEach((p) => {
      const px = FX + Math.cos(p.angle) * 20;
      const py = FY + Math.sin(p.angle) * 20;
      const d = Math.hypot(px - mx, py - my);
      if (d < bestD) { bestD = d; best = p; }
    });
  }

  best.detach();
  plucked++;

  if (plucked === NUM_PETALS) {
    text = "LOSE ME";
    color = RED;
    state = "finale";
    finaleT = 0;
  } else if (plucked % 2 === 1) {
    text = "LOVES ME";
    color = PINK;
  } else {
    text = "LOVES ME NOT";
    color = BLUE;
  }
}

// ---------- drawing ----------
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, 140);
  g.addColorStop(0, "#12165a");
  g.addColorStop(0.7, "#323caa");
  g.addColorStop(1, "#965ab4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#e6e6ff";
  stars.forEach((s) => {
    if (Math.sin(t * 2 + s.ph) > -0.3) ctx.fillRect(s.x, s.y, 1, 1);
  });

  ctx.fillStyle = "#f0ebbe";
  ctx.beginPath(); ctx.arc(98, 36, 7, 0, 6.283); ctx.fill();
  ctx.fillStyle = "#d7d2a0";
  ctx.beginPath(); ctx.arc(96, 34, 2, 0, 6.283); ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#19236e";
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, 118 + Math.sin(x / 18) * 6);
  ctx.lineTo(W, H);
  ctx.fill();

  ctx.fillStyle = DGREEN;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 1;
  grass.forEach((g) => {
    const sway = Math.sin(t * 2 + g.ph) * 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x + 0.5, GROUND + 2);
    ctx.lineTo(g.x + 0.5 + sway, GROUND - g.h);
    ctx.stroke();
  });
}

function drawFlower() {
  const sway = Math.sin(t * 1.5);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(FX, FY + 8);
  ctx.lineTo(FX + sway, GROUND);
  ctx.stroke();

  fillPoly(petalPoints(FX, 108, (210 * Math.PI) / 180, 20, 8), GREEN, DGREEN);
  fillPoly(petalPoints(FX, 120, (-30 * Math.PI) / 180, 20, 8), GREEN, DGREEN);

  petals.forEach((p) => p.attached && p.draw());

  ctx.fillStyle = "#e6a028";
  ctx.beginPath(); ctx.arc(FX, FY, 9, 0, 6.283); ctx.fill();
  ctx.fillStyle = "#965a14";
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4, r = (i % 4) * 2 + 1;
    ctx.fillRect(Math.round(FX + Math.cos(a) * r), Math.round(FY + Math.sin(a) * r), 1, 1);
  }
}

function drawText() {
  if (!text) return;
  let size = 13;
  ctx.font = `bold ${size}px monospace`;
  while (ctx.measureText(text).width > W - 8 && size > 6) {
    size--;
    ctx.font = `bold ${size}px monospace`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#0a0a28";
  ctx.fillText(text, W / 2 + 1, 11);
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, 10);
}

function drawFinale() {
  if (state !== "finale" || finaleT < 0.8) return;
  const ft = finaleT - 0.8;
  const pulse = Math.floor(ft * 3) % 2;
  const cell = 3;
  const hw = HEART[0].length * cell;
  const cx = Math.round((W - hw) / 2);
  const broken = ft > 0.9;
  drawHeart(cx, 28 + pulse, cell, RED, broken);

  if (broken) {
    ctx.fillStyle = "#ff788c";
    for (let i = 0; i < 6; i++) {
      const sx = cx + 4 + i * 4 + Math.sin(i * 2.1) * 3;
      const sy = 54 + (((ft - 0.9) * 22 + i * 7) % 45);
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
  }
}

function draw() {
  drawSky();
  drawGround();
  drawFlower();
  petals.forEach((p) => !p.attached && p.draw());
  drawText();
  drawFinale();
}

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ---------- input ----------
canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  const mx = ((e.clientX - r.left) / r.width) * W;
  const my = ((e.clientY - r.top) / r.height) * H;

  if (state === "finale" && finaleT > 2.5) reset();   // tap again to restart
  else pluck(mx, my);
});

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") reset();
});

reset();
requestAnimationFrame(loop);  