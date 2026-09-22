'use strict';
/* =====================================================================
   POEIRA VERMELHA — um pequeno faroeste inspirado em Red Dead Redemption 2
   Canvas 2D puro, sem dependências.
   ===================================================================== */

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1899);
const R = (a, b) => a + rand() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rpick = (arr) => arr[Math.floor(rand() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const lerp = (a, b, t) => a + (b - a) * t;
const fmtMoney = (v) => '$' + v.toFixed(2);
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------
const canvas = $('game');
const ctx = canvas.getContext('2d');
const lightCanvas = document.createElement('canvas');
const lctx = lightCanvas.getContext('2d');
let VW = 0, VH = 0, DPR = 1, ZOOM = 1.5;

// Modo toque (celular / tablet)
const TOUCH = { on: false, joy: null };
let MM_R = 78; // raio do minimapa

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, TOUCH.on ? 1.5 : 2);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = Math.floor(VW * DPR); canvas.height = Math.floor(VH * DPR);
  canvas.style.width = VW + 'px'; canvas.style.height = VH + 'px';
  lightCanvas.width = Math.ceil(VW / 2); lightCanvas.height = Math.ceil(VH / 2);
  if (TOUCH.on) {
    ZOOM = clamp(Math.min(VW, VH) / 430, 0.8, 1.8);
    MM_R = Math.round(clamp(Math.min(VW, VH) * 0.12, 38, 60));
    // espaço ocupado pelo minimapa + núcleos no canto superior esquerdo
    document.body.style.setProperty('--mmh', (12 + MM_R * 2 + 46) + 'px');
    document.body.style.setProperty('--mmw', (12 + MM_R * 2 + 12) + 'px');
  } else {
    ZOOM = clamp(Math.min(VW, VH) / 520, 1.0, 1.8);
    MM_R = Math.min(78, VW * 0.14);
  }
}
window.addEventListener('resize', resize);
resize();

function enableTouchMode() {
  if (TOUCH.on) return;
  TOUCH.on = true;
  document.body.classList.add('touch');
  if (typeof updateStartButton === 'function') updateStartButton();
  resize();
}
if (window.matchMedia && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches))) enableTouchMode();
window.addEventListener('touchstart', enableTouchMode, { once: true, passive: true });

// ---------------------------------------------------------------------
// Mundo
// ---------------------------------------------------------------------
const WORLD_W = 4000, WORLD_H = 2600;
const STREET = { x: 380, y: 1080, w: 3060, h: 240 };      // rua principal
const CROSS = { x: 1880, y: 380, w: 160, h: 1840 };       // rua transversal
const NORTH_EDGE = 1040, SOUTH_EDGE = 1360;               // frente das construções
const TOWN = { x: 420, y: 680, w: 3040, h: 1240 };

const BUILDINGS = [];
function addBuilding(o) {
  if (o.y === undefined) { if (o.face === 'S') o.y = NORTH_EDGE - o.h; else o.y = SOUTH_EDGE; }
  o.doorX = o.x + o.w / 2;
  o.doorY = o.face === 'S' ? o.y + o.h + 16 : o.y - 16;
  BUILDINGS.push(o);
}
// Lado norte (portas viradas para o sul)
addBuilding({ id: 'saloon', name: 'SALOON', x: 560, w: 340, h: 250, face: 'S', wall: '#8b5a36', roof: '#5b3a25', trim: '#e0c48a' });
addBuilding({ id: 'hotel', name: 'HOTEL', x: 940, w: 280, h: 290, face: 'S', wall: '#6f7b83', roof: '#3f4549', trim: '#f0e2c0' });
addBuilding({ id: 'store', name: 'ARMAZÉM', x: 1260, w: 290, h: 230, face: 'S', wall: '#9b6b3d', roof: '#654127', trim: '#f2d9a0' });
addBuilding({ id: 'house', name: '', x: 1590, w: 220, h: 200, face: 'S', wall: '#8f7a5c', roof: '#5a4c39', trim: '#d8c7a3' });
addBuilding({ id: 'bank', name: 'BANCO', x: 2090, w: 280, h: 270, face: 'S', wall: '#b09a78', roof: '#6d5d47', trim: '#3a2a1a' });
addBuilding({ id: 'barber', name: 'BARBEIRO', x: 2410, w: 210, h: 200, face: 'S', wall: '#7d8f6a', roof: '#4c5840', trim: '#f0e2c0' });
addBuilding({ id: 'church', name: 'IGREJA', x: 2680, w: 260, h: 330, face: 'S', wall: '#d8d0bd', roof: '#6a5a4a', trim: '#6a5a4a' });
// Lado sul (portas viradas para o norte)
addBuilding({ id: 'sheriff', name: 'XERIFE', x: 600, w: 280, h: 220, face: 'N', wall: '#7c5b3f', roof: '#4f3a2a', trim: '#e8d6ae' });
addBuilding({ id: 'stable', name: 'ESTÁBULO', x: 960, w: 360, h: 260, face: 'N', wall: '#8a3e2a', roof: '#5a2c1f', trim: '#efe1bf' });
addBuilding({ id: 'house', name: '', x: 1400, w: 200, h: 190, face: 'N', wall: '#96805e', roof: '#5f4e38', trim: '#d8c7a3' });
addBuilding({ id: 'house', name: '', x: 1640, w: 200, h: 190, face: 'N', wall: '#7f6a52', roof: '#50412f', trim: '#d8c7a3' });
addBuilding({ id: 'post', name: 'CORREIO', x: 2090, w: 230, h: 200, face: 'N', wall: '#6b7e8c', roof: '#434e57', trim: '#f0e2c0' });
addBuilding({ id: 'house', name: '', x: 2370, w: 200, h: 190, face: 'N', wall: '#8d7457', roof: '#584632', trim: '#d8c7a3' });
addBuilding({ id: 'house', name: '', x: 2620, w: 220, h: 200, face: 'N', wall: '#a08a67', roof: '#65563f', trim: '#d8c7a3' });
// Fazendas fora da cidade
addBuilding({ id: 'farm', name: 'FAZENDA', owner: 'Família Braithwaite', x: 2480, y: 300, w: 240, h: 200, face: 'S', wall: '#9a5a3a', roof: '#5a3526', trim: '#efe1bf' });
addBuilding({ id: 'farm', name: 'RANCHO', owner: 'Rancho Esmeralda', x: 1300, y: 2020, w: 260, h: 210, face: 'S', wall: '#8a7a5a', roof: '#4f4534', trim: '#efe1bf' });
const FARMS = BUILDINGS.filter((b) => b.id === 'farm');
const TRACK_Y = 2500; // ferrovia ao sul

const solids = [];   // retângulos sólidos {x,y,w,h}
const props = [];    // objetos decorativos / interativos
BUILDINGS.forEach((b) => solids.push({ x: b.x, y: b.y, w: b.w, h: b.h }));

function addProp(type, x, y, extra) {
  const p = Object.assign({ type, x, y }, extra || {});
  const sz = {
    barrel: [18, 12], trough: [60, 16], post: [44, 6], lamp: [8, 8], bench: [50, 10], wagon: [110, 40],
    crate: [22, 16], well: [44, 30], windmill: [24, 12], cactus: [16, 10], rock: [30, 18], tree: [18, 12], campfire: [30, 20],
    fence: [0, 0], piano: [0, 0], bush: [0, 0], bottle: [0, 0], tent: [80, 40], grave: [16, 8],
  }[type] || [0, 0];
  p.w = p.w || sz[0]; p.h = p.h || sz[1];
  const solid = p.solid !== undefined ? p.solid : !['bush', 'bottle', 'lamp'].includes(type);
  if (solid && p.w > 0) solids.push({ x: x - p.w / 2, y: y - p.h, w: p.w, h: p.h });
  props.push(p);
  return p;
}

function onRoadOrTown(x, y, pad) {
  pad = pad || 0;
  if (x > TOWN.x - pad && x < TOWN.x + TOWN.w + pad && y > TOWN.y - pad && y < TOWN.y + TOWN.h + pad) return true;
  if (Math.abs(y - trailY(x)) < 80 + pad) return true;
  if (Math.abs(x - trailX(y)) < 80 + pad) return true;
  if (Math.abs(y - TRACK_Y) < 50 + pad) return true;
  for (const f of FARMS) if (x > f.x - 120 - pad && x < f.x + f.w + 120 + pad && y > f.y - 60 - pad && y < f.y + f.h + 200 + pad) return true;
  return false;
}
function trailY(x) { return 1200 + (x > 3440 ? Math.sin((x - 3440) / 260) * 90 + (x - 3440) * 0.25 : 0) + (x < 380 ? (380 - x) * -0.12 : 0); }
function trailX(y) { return 1960 + (y < 380 ? (380 - y) * 0.3 : 0) + (y > 2220 ? Math.sin((y - 2220) / 200) * 70 : 0); }

// Adereços da cidade
for (let x = 520; x < 3000; x += 250) {
  if (!(x > 1860 && x < 2060)) { addProp('lamp', x, NORTH_EDGE + 36); addProp('lamp', x + 120, SOUTH_EDGE - 30); }
}
addProp('trough', 760, 1108, { interact: 'trough' });
addProp('post', 850, 1106);
addProp('trough', 1140, 1316, { interact: 'trough' });
addProp('post', 1240, 1318);
addProp('post', 1400, 1106);
addProp('barrel', 910, 1030); addProp('barrel', 928, 1036); addProp('barrel', 1548, 1030);
addProp('crate', 1560, 1052); addProp('crate', 1582, 1046); addProp('crate', 1250, 1052);
addProp('barrel', 1330, 1386); addProp('barrel', 590, 1385);
addProp('bench', 1030, 1068, { interact: 'bench' });
addProp('bench', 1680, 1068, { interact: 'bench' });
addProp('bench', 2230, 1068, { interact: 'bench' });
addProp('bench', 740, 1356, { interact: 'bench' });
addProp('bench', 2200, 1356, { interact: 'bench' });
addProp('wagon', 1730, 1180);
addProp('well', 1960, 820, { interact: 'well' });
addProp('barrel', 2640, 1030); addProp('barrel', 2380, 1390);

for (const f of FARMS) {
  addProp('windmill', f.x - 60, f.y + f.h - 20);
  addProp('trough', f.x + f.w + 50, f.y + f.h + 30, { interact: 'trough' });
  addProp('crate', f.x + f.w - 20, f.y + f.h + 28); addProp('barrel', f.x + 20, f.y + f.h + 26);
}

// Curral atrás do estábulo
const CORRAL = { x: 960, y: 1680, w: 360, h: 200 };
function fenceRect(x, y, w, h) { solids.push({ x, y, w, h, fence: true }); props.push({ type: 'fence', x, y, w, h }); }
fenceRect(CORRAL.x, CORRAL.y, CORRAL.w, 6);
fenceRect(CORRAL.x, CORRAL.y + CORRAL.h, CORRAL.w, 6);
fenceRect(CORRAL.x, CORRAL.y, 6, CORRAL.h);
fenceRect(CORRAL.x + CORRAL.w - 6, CORRAL.y, 6, 80);
fenceRect(CORRAL.x + CORRAL.w - 6, CORRAL.y + 140, 6, CORRAL.h - 134);

// Estande de tiro com garrafas atrás do xerife
const RANGE = { x: 580, y: 1760, w: 320 };
fenceRect(RANGE.x, RANGE.y, RANGE.w, 6);
const bottles = [];
for (let i = 0; i < 8; i++) {
  bottles.push({ x: RANGE.x + 25 + i * 38, y: RANGE.y - 2, alive: true, t: 0, color: ['#3f7a3a', '#6b4a1e', '#2f5a6b'][i % 3] });
}

// Cemitério ao lado da igreja
for (let i = 0; i < 9; i++) addProp('grave', 3000 + (i % 3) * 50, 760 + Math.floor(i / 3) * 60);
fenceRect(2970, 700, 170, 4);

// Acampamento a leste
const CAMP = { x: 3620, y: 760 };
addProp('campfire', CAMP.x, CAMP.y, { interact: 'campfire' });
addProp('tent', CAMP.x + 90, CAMP.y - 50);
addProp('rock', CAMP.x - 60, CAMP.y + 30);

// Natureza fora da cidade
function scatter(type, n, extra) {
  let placed = 0, tries = 0;
  while (placed < n && tries < n * 30) {
    tries++;
    const x = R(40, WORLD_W - 40), y = R(60, WORLD_H - 40);
    if (onRoadOrTown(x, y, 30)) continue;
    if (dist(x, y, CAMP.x, CAMP.y) < 180) continue;
    addProp(type, x, y, Object.assign({ v: rand(), s: R(0.8, 1.3) }, extra || {}));
    placed++;
  }
}
scatter('cactus', 110); scatter('rock', 80); scatter('tree', 45); scatter('bush', 220);

const HERB_KINDS = [
  { name: 'Ginseng', color: '#b8d27a' }, { name: 'Milefólio', color: '#f2efe0' },
  { name: 'Salva', color: '#9fb6a8' }, { name: 'Amora', color: '#6b2a5a' },
];
const herbs = [];
(function () {
  let n = 0;
  while (n < 45) {
    const x = R(60, WORLD_W - 60), y = R(80, WORLD_H - 60);
    if (onRoadOrTown(x, y, 10)) continue;
    herbs.push({ x, y, kind: rpick(HERB_KINDS), alive: true, t: 0 });
    n++;
  }
})();

// ---------------------------------------------------------------------
// Chão pré-renderizado
// ---------------------------------------------------------------------
const GROUND_SCALE = 0.5;
const ground = document.createElement('canvas');
ground.width = WORLD_W * GROUND_SCALE; ground.height = WORLD_H * GROUND_SCALE;
(function buildGround() {
  const c = ground.getContext('2d');
  c.scale(GROUND_SCALE, GROUND_SCALE);
  const grd = c.createLinearGradient(0, 0, WORLD_W, WORLD_H);
  grd.addColorStop(0, '#c49a62'); grd.addColorStop(0.5, '#caa36b'); grd.addColorStop(1, '#b98d57');
  c.fillStyle = grd; c.fillRect(0, 0, WORLD_W, WORLD_H);
  // manchas de terra
  for (let i = 0; i < 2600; i++) {
    const x = R(0, WORLD_W), y = R(0, WORLD_H), r = R(10, 70);
    c.fillStyle = rand() < 0.5 ? `rgba(120,80,40,${R(0.03, 0.08)})` : `rgba(240,210,160,${R(0.03, 0.08)})`;
    c.beginPath(); c.ellipse(x, y, r, r * R(0.4, 0.9), R(0, 3), 0, Math.PI * 2); c.fill();
  }
  // grama seca
  for (let i = 0; i < 7000; i++) {
    const x = R(0, WORLD_W), y = R(0, WORLD_H);
    if (onRoadOrTown(x, y, -20)) continue;
    c.strokeStyle = rand() < 0.5 ? 'rgba(110,105,50,0.55)' : 'rgba(150,130,70,0.6)';
    c.lineWidth = 1.5;
    c.beginPath();
    for (let k = 0; k < 3; k++) { c.moveTo(x + k * 2, y); c.lineTo(x + k * 2 + R(-3, 3), y - R(4, 9)); }
    c.stroke();
  }
  // trilhas
  const road = '#a8804f';
  c.strokeStyle = road; c.lineCap = 'round'; c.lineWidth = 110;
  c.beginPath(); c.moveTo(0, trailY(0));
  for (let x = 0; x <= WORLD_W; x += 40) c.lineTo(x, trailY(x));
  c.stroke();
  c.beginPath(); c.moveTo(trailX(0), 0);
  for (let y = 0; y <= WORLD_H; y += 40) c.lineTo(trailX(y), y);
  c.stroke();
  c.lineWidth = 60; c.beginPath(); c.moveTo(3440, trailY(3440)); c.quadraticCurveTo(3500, 950, CAMP.x - 30, CAMP.y + 40); c.stroke();
  // ruas da cidade
  c.fillStyle = road;
  c.fillRect(STREET.x, STREET.y, STREET.w, STREET.h);
  c.fillRect(CROSS.x, CROSS.y, CROSS.w, CROSS.h);
  // sulcos de rodas
  c.strokeStyle = 'rgba(80,55,30,0.25)'; c.lineWidth = 3;
  for (const off of [-50, -30, 30, 50]) {
    c.beginPath(); c.moveTo(0, trailY(0) + off);
    for (let x = 0; x <= WORLD_W; x += 30) c.lineTo(x, trailY(x) + off + Math.sin(x / 90) * 3);
    c.stroke();
    c.beginPath(); c.moveTo(trailX(0) + off, 0);
    for (let y = 0; y <= WORLD_H; y += 30) c.lineTo(trailX(y) + off + Math.sin(y / 80) * 3, y);
    c.stroke();
  }
  // pegadas / bosta de cavalo / poeira
  for (let i = 0; i < 400; i++) {
    const x = R(STREET.x, STREET.x + STREET.w), y = R(STREET.y, STREET.y + STREET.h);
    c.fillStyle = `rgba(70,45,25,${R(0.1, 0.25)})`;
    c.beginPath(); c.ellipse(x, y, R(2, 5), R(1.5, 3), 0, 0, Math.PI * 2); c.fill();
  }
  // calçadas de madeira
  function boardwalk(x, y, w, h) {
    c.fillStyle = '#6e4a2c'; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(30,18,8,0.55)'; c.lineWidth = 1.5;
    for (let xx = x; xx < x + w; xx += 12) { c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + h); c.stroke(); }
    c.fillStyle = 'rgba(255,220,170,0.06)';
    for (let xx = x; xx < x + w; xx += 24) c.fillRect(xx + 2, y, 8, h);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + h - 3, w, 3);
  }
  for (const b of BUILDINGS) {
    if (b.face === 'S') boardwalk(b.x - 10, NORTH_EDGE, b.w + 20, 40);
    else boardwalk(b.x - 10, SOUTH_EDGE - 40, b.w + 20, 40);
  }
  // plantações das fazendas
  for (const f of FARMS) {
    c.fillStyle = 'rgba(120,85,50,0.55)'; c.fillRect(f.x - 20, f.y + f.h + 60, f.w + 40, 130);
    c.strokeStyle = 'rgba(70,45,20,0.55)'; c.lineWidth = 4;
    for (let yy = f.y + f.h + 70; yy < f.y + f.h + 185; yy += 14) { c.beginPath(); c.moveTo(f.x - 16, yy); c.lineTo(f.x + f.w + 16, yy); c.stroke(); }
    c.fillStyle = 'rgba(120,150,60,0.8)';
    for (let yy = f.y + f.h + 66; yy < f.y + f.h + 185; yy += 14) for (let xx = f.x - 10; xx < f.x + f.w + 10; xx += 11) { c.beginPath(); c.arc(xx + R(-2, 2), yy, R(2, 3.5), 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(150,115,75,0.6)'; c.fillRect(f.x - 20, f.y + f.h, f.w + 40, 56);
  }
  // ferrovia
  c.fillStyle = '#7a6a58'; c.fillRect(0, TRACK_Y - 26, WORLD_W, 30);
  c.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 900; i++) c.fillRect(R(0, WORLD_W), R(TRACK_Y - 26, TRACK_Y + 4), 2, 2);
  c.fillStyle = '#4a3222'; for (let x = 0; x < WORLD_W; x += 16) c.fillRect(x, TRACK_Y - 24, 7, 26);
  c.fillStyle = '#8c8c8c'; c.fillRect(0, TRACK_Y - 20, WORLD_W, 3); c.fillRect(0, TRACK_Y - 4, WORLD_W, 3);
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, TRACK_Y - 20, WORLD_W, 1); c.fillRect(0, TRACK_Y - 4, WORLD_W, 1);

  // chão do curral
  c.fillStyle = '#9d7648'; c.fillRect(CORRAL.x, CORRAL.y, CORRAL.w, CORRAL.h);
  for (let i = 0; i < 160; i++) {
    c.fillStyle = `rgba(200,180,90,${R(0.2, 0.5)})`;
    c.fillRect(R(CORRAL.x, CORRAL.x + CORRAL.w), R(CORRAL.y, CORRAL.y + CORRAL.h), R(3, 8), 1.5);
  }
  // área do estande de tiro
  c.fillStyle = 'rgba(90,60,30,0.25)'; c.fillRect(RANGE.x - 10, RANGE.y, RANGE.w + 20, 160);
})();

// Minimapa pré-renderizado
const MINI_SCALE = 0.1;
const miniMap = document.createElement('canvas');
miniMap.width = WORLD_W * MINI_SCALE; miniMap.height = WORLD_H * MINI_SCALE;
(function () {
  const c = miniMap.getContext('2d');
  c.drawImage(ground, 0, 0, miniMap.width, miniMap.height);
  c.fillStyle = 'rgba(40,25,12,0.18)'; c.fillRect(0, 0, miniMap.width, miniMap.height);
  c.fillStyle = '#3a2616';
  for (const b of BUILDINGS) c.fillRect(b.x * MINI_SCALE, b.y * MINI_SCALE, b.w * MINI_SCALE, b.h * MINI_SCALE);
})();

// ---------------------------------------------------------------------
// Estado do jogo
// ---------------------------------------------------------------------
const G = {
  started: false, paused: false,
  time: 9.0, day: 1,
  money: 12.5, bank: 0, honor: 0,
  health: 100, healthCore: 80, stamina: 100, staminaCore: 80, deadEye: 60, deadEyeCore: 80,
  deadEyeOn: false, timeScale: 1,
  ammo: 6, reserve: 24, reloading: 0,
  food: 1, tonic: 0, herbs: {}, whisky: 0,
  beard: 0.4, dirt: 0.3, drunk: 0,
  wanted: 0, // valor da recompensa pela cabeça do jogador
  bounty: null, bountyReady: 0,
  prayedDay: 0, lastHit: 0,
  menu: null, sitting: null, invOpen: false,
  fading: false, shake: 0,
  wx: { kind: 'clear', t: 5, rain: 0, cloud: 0, flash: 0 },
  pelts: {}, meat: 0, hunts: 0, job: null, jobsDone: 0, event: null, muted: false,
};

const player = {
  x: 1100, y: 1200, dir: 1, phase: 0, moving: false, running: false,
  aim: 0, aiming: false, shotT: 0, tipHat: 0, mounted: false, r: 8,
  coat: '#4a3b2c', shirt: '#b9ad93', pants: '#3b3a3a', hat: '#2c2219', skin: '#d9a47c',
};

const horse = {
  name: 'Tempestade', x: 1180, y: 1300, dir: -1, phase: 0, moving: false, state: 'idle',
  bond: 1, health: 100, stamina: 100, coat: '#6b3f22', mane: '#1e140c', r: 12, tx: 0, ty: 0, stuck: 0,
  speed: 0,
};

const npcs = [];
const outlaws = [];
const bullets = [];
const particles = [];
const bubbles = [];
const tumbleweeds = [];
const corralHorses = [];
let dog = null;

const COATS = ['#5c4636', '#3e4a5a', '#6a3b2a', '#4b5a3a', '#6d6a5e', '#2d2a28', '#7a5c3a', '#5a3d52'];
const DRESSES = ['#7a3b3b', '#3b5a7a', '#6b6b3b', '#8a6a8a', '#3b6b5a', '#9a7a4a'];
const SKINS = ['#e0b08a', '#c68e62', '#a8714a', '#7d5236', '#f0c7a0'];
const HATS = ['#2c2219', '#5a4630', '#6d5c44', '#1b1b1b', '#8a7658'];
const NPC_NAMES = ['Sr. Hollis', 'Sra. Grimshaw', 'Jeb', 'Tilly', 'Velho Pete', 'Sr. Pearson', 'Sadie', 'Lenny', 'Sra. Adler', 'Bill',
  'Charles', 'Mary-Beth', 'Sr. Strauss', 'Karen', 'Uncle', 'Kieran', 'Abigail', 'Hosea'];

const GREETINGS = ['Bom dia, senhor.', 'Tarde boa pra cavalgar.', 'Como vai, forasteiro?', 'Deus o abençoe.', 'Belo chapéu!',
  'Cuidado com os O\'Driscoll...', 'Dizem que há ouro nas colinas.', 'Olá, parceiro.', 'Que calor, hein?', 'Bem-vindo a Vale Esperança.'];
const INSULTS = ['Vai tomar banho, seu porco!', 'Olha o que o gato arrastou...', 'Você tem cara de ladrão de gado.', 'Sai da frente, caipira!'];
const INSULT_REPLIES = ['Como é que é?!', 'Cuide da sua vida!', 'Quer apanhar, é?', 'Seu grosseirão!', 'Hmph! Que falta de educação.'];
const DIRTY_REMARKS = ['Credo, que fedor!', 'Já ouviu falar em banho?', 'Você cheira a cavalo.'];
const WANTED_REMARKS = ['É ele! O assassino!', 'Socorro! Xerife!', 'Não atire!'];

function makeNPC(x, y) {
  const female = Math.random() < 0.4;
  const n = {
    kind: 'npc', x, y, dir: 1, phase: Math.random() * 6, moving: false, r: 8,
    female, name: pick(NPC_NAMES),
    coat: female ? pick(DRESSES) : pick(COATS), shirt: pick(['#d8ceb5', '#bfb39a', '#e6ddc8', '#a89c84']),
    pants: female ? null : pick(['#3b3a3a', '#4b3a2a', '#5a5040', '#2a2a30']),
    hat: female ? (Math.random() < 0.5 ? pick(['#6b4a5a', '#3b3b5a', '#8a7a5a']) : null) : pick(HATS),
    skin: pick(SKINS), speed: 38 + Math.random() * 18,
    tx: x, ty: y, wait: Math.random() * 3, stuck: 0, alive: true, deadT: 0, flee: 0, talkCd: 0, mood: 0,
  };
  npcs.push(n);
  return n;
}
function randomStreetPoint() {
  const r = Math.random();
  if (r < 0.55) return { x: R(STREET.x + 40, STREET.x + STREET.w - 40), y: R(STREET.y + 20, STREET.y + STREET.h - 20) };
  if (r < 0.75) return { x: R(560, 2940), y: NORTH_EDGE + R(8, 32) };
  if (r < 0.9) return { x: R(600, 2840), y: SOUTH_EDGE - R(8, 32) };
  return { x: R(CROSS.x + 20, CROSS.x + CROSS.w - 20), y: R(CROSS.y + 100, CROSS.y + CROSS.h - 100) };
}

// ---------------------------------------------------------------------
// Colisão
// ---------------------------------------------------------------------
function collides(x, y, r) {
  if (x < r || y < r + 20 || x > WORLD_W - r || y > WORLD_H - r) return true;
  const ry = r * 0.6;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (x + r > s.x && x - r < s.x + s.w && y + ry > s.y && y - ry < s.y + s.h) return true;
  }
  return false;
}
function moveEnt(e, dx, dy, r) {
  let moved = false;
  if (dx && !collides(e.x + dx, e.y, r)) { e.x += dx; moved = true; }
  if (dy && !collides(e.x, e.y + dy, r)) { e.y += dy; moved = true; }
  return moved;
}
// Balas passam entre as tábuas das cercas
function solidAt(x, y) {
  for (const s of solids) if (!s.fence && x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return s;
  return null;
}

// ---------------------------------------------------------------------
// Áudio (sintetizado)
// ---------------------------------------------------------------------
let AC = null, MASTER = null;
function initAudio() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  MASTER = AC.createGain(); MASTER.gain.value = G.muted ? 0 : 1; MASTER.connect(AC.destination);
}
function noiseBuf(dur) {
  const b = AC.createBuffer(1, Math.floor(AC.sampleRate * dur), AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function tone(freq, dur, type, vol, when, slideTo) {
  const t = AC.currentTime + (when || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(MASTER); o.start(t); o.stop(t + dur + 0.05);
}
function sfx(kind, vol) {
  if (!AC) return;
  vol = vol === undefined ? 1 : vol;
  const t = AC.currentTime;
  if (kind === 'shot' || kind === 'eshot') {
    const src = AC.createBufferSource(); src.buffer = noiseBuf(0.5);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(kind === 'shot' ? 2600 : 1400, t);
    f.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    const g = AC.createGain(); g.gain.setValueAtTime(0.7 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    src.connect(f).connect(g).connect(MASTER); src.start(t);
    tone(90, 0.18, 'sine', 0.5 * vol, 0, 40);
  } else if (kind === 'glass') {
    const src = AC.createBufferSource(); src.buffer = noiseBuf(0.25);
    const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
    const g = AC.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(f).connect(g).connect(MASTER); src.start(t);
    tone(2400, 0.2, 'triangle', 0.08, 0.02); tone(3100, 0.15, 'triangle', 0.06, 0.05);
  } else if (kind === 'coin') {
    tone(1318, 0.09, 'square', 0.06); tone(1760, 0.25, 'square', 0.06, 0.08);
  } else if (kind === 'whistle') {
    tone(1500, 0.18, 'sine', 0.15, 0, 2300); tone(1700, 0.35, 'sine', 0.15, 0.22, 2600);
  } else if (kind === 'pickup') {
    tone(660, 0.08, 'triangle', 0.12); tone(990, 0.15, 'triangle', 0.1, 0.06);
  } else if (kind === 'reload') {
    tone(300, 0.05, 'square', 0.08); tone(420, 0.05, 'square', 0.08, 0.3); tone(520, 0.05, 'square', 0.08, 0.6);
  } else if (kind === 'click') {
    tone(900, 0.03, 'square', 0.06);
  } else if (kind === 'deadeye') {
    tone(220, 0.8, 'sawtooth', 0.06, 0, 55); tone(110, 1.2, 'sine', 0.2, 0, 50);
  } else if (kind === 'hurt') {
    tone(160, 0.2, 'sawtooth', 0.12, 0, 80);
  } else if (kind === 'drink') {
    for (let i = 0; i < 3; i++) tone(300 + i * 40, 0.08, 'sine', 0.1, i * 0.15, 200);
  } else if (kind === 'bell') {
    tone(523, 1.5, 'sine', 0.15); tone(1046, 1.2, 'sine', 0.05);
  } else if (kind === 'piano') {
    const notes = [262, 330, 392, 523, 392, 330, 294, 349, 440, 587, 440, 349, 262];
    notes.forEach((n, i) => { tone(n, 0.35, 'triangle', 0.1, i * 0.16); tone(n / 2, 0.3, 'sine', 0.06, i * 0.16); });
  } else if (kind === 'neigh') {
    tone(700, 0.6, 'sawtooth', 0.05, 0, 400); tone(900, 0.4, 'sawtooth', 0.03, 0.1, 500);
  } else if (kind === 'bark') {
    tone(400, 0.08, 'sawtooth', 0.1, 0, 250); tone(420, 0.08, 'sawtooth', 0.1, 0.15, 250);
  } else if (kind === 'train') {
    for (const [f, w] of [[392, 0], [494, 0], [587, 0], [392, 1.3], [494, 1.3], [587, 1.3]]) tone(f, 1.0, 'sawtooth', 0.025 * vol, w);
  } else if (kind === 'thunder') {
    const src = AC.createBufferSource(); src.buffer = noiseBuf(3);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = AC.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
    src.connect(f).connect(g).connect(MASTER); src.start(t);
  } else if (kind === 'growl') {
    tone(110, 0.6, 'sawtooth', 0.08 * vol, 0, 85); tone(700, 0.4, 'sawtooth', 0.03 * vol, 0.5, 1100);
  } else if (kind === 'dice') {
    for (let i = 0; i < 6; i++) tone(1200 + Math.random() * 800, 0.03, 'square', 0.05, i * 0.07);
  }
}

// ---------------------------------------------------------------------
// UI (DOM)
// ---------------------------------------------------------------------
function toast(title, text, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.innerHTML = `<div class="t">${title}</div>${text ? `<div class="d">${text}</div>` : ''}`;
  const box = $('toasts');
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 4200);
}
let bannerTimer = null;
function banner(t1, t2) {
  const b = $('banner');
  b.innerHTML = `<div class="b1">${t1}</div>${t2 ? `<div class="b2">${t2}</div>` : ''}`;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 3000);
}
function fadeTransition(text, mid, dead) {
  if (G.fading) return;
  G.fading = true;
  const f = $('fade'), ft = $('fadeText');
  ft.textContent = text || ''; ft.className = dead ? 'dead' : '';
  f.classList.add('on');
  setTimeout(() => {
    mid && mid();
    setTimeout(() => { f.classList.remove('on'); G.fading = false; }, 1400);
  }, 1100);
}
function changeHonor(v, why) {
  const before = G.honor;
  G.honor = clamp(G.honor + v, -100, 100);
  if (Math.round(before) !== Math.round(G.honor) && why) toast(v > 0 ? 'Honra aumentou' : 'Honra diminuiu', why, v > 0 ? 'good' : '');
}
function spend(v) {
  if (G.money + 1e-6 < v) { toast('Dinheiro insuficiente', `Você precisa de ${fmtMoney(v)}.`); return false; }
  G.money -= v; sfx('coin'); return true;
}
function earn(v) { G.money += v; sfx('coin'); }

let lastHud = '';
function updateHUD() {
  const h = Math.floor(G.time) % 24, m = Math.floor((G.time % 1) * 60);
  const clock = `Dia ${G.day} · ${String(h).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`;
  const ammoTxt = G.reloading > 0 ? 'Recarregando...' : `${G.ammo} / ${G.reserve}`;
  const key = clock + G.money.toFixed(2) + ammoTxt + Math.round(G.honor) + G.wanted + (G.bounty ? G.bounty.stage : '') + (G.event ? G.event.type + G.event.stage : '') + (G.job ? G.job.name : '');
  if (key === lastHud) return;
  lastHud = key;
  $('clock').textContent = clock;
  $('money').textContent = fmtMoney(G.money);
  $('ammo').textContent = '🔫 ' + ammoTxt;
  $('ammo').classList.toggle('low', G.ammo === 0);
  const fill = $('honorFill');
  const hv = G.honor / 100;
  fill.style.left = hv >= 0 ? '50%' : `${50 + hv * 50}%`;
  fill.style.width = `${Math.abs(hv) * 50}%`;
  fill.style.background = hv >= 0 ? '#e8e0c8' : '#a3171b';
  let obj = '';
  if (G.wanted > 0) obj = `<div class="obj-title">PROCURADO</div>Recompensa de ${fmtMoney(G.wanted)} pela sua cabeça — pague no Xerife`;
  else if (G.bounty && G.bounty.stage === 'hunt') obj = `<div class="obj-title">CAÇADA</div>Encontre e elimine ${G.bounty.name} (marcado em vermelho no mapa)`;
  else if (G.bounty && G.bounty.stage === 'return') obj = `<div class="obj-title">CAÇADA</div>Volte ao Xerife para receber ${fmtMoney(G.bounty.reward)}`;
  const ev = G.event;
  if (!G.wanted && ev) {
    if (ev.type === 'thief' && ev.stage === 'chase') obj = `<div class="obj-title">LADRÃO</div>Alcance o ladrão da bolsa de ${ev.victim.name}`;
    else if (ev.type === 'thief') obj = `<div class="obj-title">LADRÃO</div>Devolva a bolsa para ${ev.victim.name}`;
    else obj = `<div class="obj-title">AJUDA</div>${ev.victim.name} foi picado por uma cobra. Leve um tônico ou feijão.`;
  }
  if (!obj && G.job) obj = `<div class="obj-title">ENTREGA</div>Leve a encomenda para ${G.job.name}, em ${G.job.where}`;
  $('objective').innerHTML = obj;
}

let lastPrompts = '';
function renderPrompts(list) {
  const key = list.map((p) => p.key + p.label).join('|');
  if (key === lastPrompts) return;
  lastPrompts = key;
  $('prompts').innerHTML = list.map((p) => `<div class="prompt" data-key="Key${p.key}">${p.label} <span class="key">${p.key}</span></div>`).join('');
}

// ---------------------------------------------------------------------
// Menus (lojas, saloon, etc.)
// ---------------------------------------------------------------------
function openMenu(title, sub, options) {
  G.menu = { title, sub, options, sel: 0 };
  document.body.classList.add('ui-open');
  while (G.menu.sel < options.length && options[G.menu.sel].disabled) G.menu.sel++;
  if (G.menu.sel >= options.length) G.menu.sel = 0;
  renderMenu();
  $('menu').classList.remove('hidden');
}
function closeMenu() { G.menu = null; $('menu').classList.add('hidden'); document.body.classList.toggle('ui-open', G.invOpen); }
function renderMenu() {
  const m = G.menu;
  if (!m) return;
  $('menuTitle').textContent = m.title;
  $('menuSub').innerHTML = (typeof m.sub === 'function' ? m.sub() : m.sub) + ` &nbsp;·&nbsp; Carteira: <b>${fmtMoney(G.money)}</b>`;
  $('menuList').innerHTML = m.options.map((o, i) => `
    <li class="${i === m.sel ? 'sel' : ''} ${o.disabled ? 'dis' : ''}" data-i="${i}">
      <span>${o.label}${o.desc ? `<span class="desc">${o.desc}</span>` : ''}</span>
      <span class="price">${o.price ? fmtMoney(o.price) : ''}</span>
    </li>`).join('');
}
$('menuList').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li || !G.menu) return;
  G.menu.sel = +li.dataset.i;
  chooseMenu();
});
function chooseMenu() {
  const m = G.menu;
  if (!m) return;
  const o = m.options[m.sel];
  if (!o || o.disabled) { sfx('click'); return; }
  if (o.price && !spend(o.price)) return;
  const keepOpen = o.fn();
  if (keepOpen && G.menu === m) {
    if (keepOpen.options) m.options = keepOpen.options;
    renderMenu();
  } else if (G.menu === m) closeMenu();
}

function herbCount() { return Object.values(G.herbs).reduce((a, b) => a + b, 0); }

function buildingMenu(b) {
  const close = { label: 'Sair', fn: () => false };
  switch (b.id) {
    case 'saloon': {
      const opts = () => [
        { label: 'Beber whisky', desc: 'Recupera stamina e Olho Morto. Cuidado com a bebedeira.', price: 1, fn: () => {
          sfx('drink'); G.stamina = 100; G.staminaCore = clamp(G.staminaCore + 15, 0, 100); G.deadEye = clamp(G.deadEye + 25, 0, 100);
          G.drunk = clamp(G.drunk + 25, 0, 90);
          toast('Whisky', G.drunk > 50 ? 'O mundo está girando...' : 'Desce queimando.');
          return { options: opts() };
        } },
        { label: 'Beber cerveja', desc: 'Refresca e recupera um pouco de stamina.', price: 0.5, fn: () => {
          sfx('drink'); G.stamina = clamp(G.stamina + 40, 0, 100); G.drunk = clamp(G.drunk + 8, 0, 90);
          toast('Cerveja', 'Gelada... mais ou menos.'); return { options: opts() };
        } },
        { label: 'Jogar dados', desc: 'Aposte $5 contra o croupier. Maior soma de dois dados vence.', price: 5, fn: () => {
          playDice(); return { options: opts() };
        } },
        { label: 'Tocar piano', desc: 'Toque uma música para os clientes.', fn: () => {
          sfx('piano');
          const tip = Math.random() < 0.6 ? Math.round(Math.random() * 100) / 100 + 0.25 : 0;
          if (tip) { earn(tip); toast('Aplausos!', `Os clientes deixaram ${fmtMoney(tip)} de gorjeta.`, 'gold'); }
          else toast('Silêncio constrangedor', 'Alguém tossiu no fundo do salão.');
          return false;
        } },
        { label: 'Começar uma briga', desc: 'Não é muito honrado...', fn: () => {
          G.health = clamp(G.health - 25, 1, 100); G.shake = 12; sfx('hurt');
          changeHonor(-5, 'Você começou uma briga no saloon.');
          toast('Pancadaria!', Math.random() < 0.5 ? 'Você derrubou o vaqueiro com um gancho de direita.' : 'Você levou uma garrafada na cabeça.');
          return false;
        } },
        close,
      ];
      openMenu('Saloon', 'O cheiro de fumaça e whisky barato te recebe.', opts());
      break;
    }
    case 'hotel':
      openMenu('Hotel Vale Esperança', 'Quartos limpos. Quase sempre.', [
        { label: 'Alugar quarto e dormir', desc: 'Dorme até o amanhecer. Recupera tudo.', price: 2, fn: () => { sleep(8, 'Você dormiu como uma pedra.'); return false; } },
        { label: 'Tomar banho', desc: 'Remove a sujeira. As pessoas vão agradecer.', price: 1, fn: () => {
          fadeTransition('Esfregando...', () => { G.dirt = 0; G.time += 0.5; toast('Limpinho', 'Você está limpo e cheiroso.', 'good'); });
          return false;
        } },
        { label: 'Banho de luxo', desc: 'Com sais de banho. Recupera todos os núcleos.', price: 3, fn: () => {
          fadeTransition('Relaxando...', () => { G.dirt = 0; G.healthCore = G.staminaCore = G.deadEyeCore = 100; G.time += 1; toast('Revigorado', 'Núcleos restaurados.', 'good'); });
          return false;
        } },
        close,
      ]);
      break;
    case 'store': {
      const opts = () => {
        const hc = herbCount();
        return [
          { label: 'Feijão enlatado', desc: `Comida. Use [C] para comer. Você tem ${G.food}.`, price: 0.75, fn: () => { G.food++; toast('Comprado', 'Feijão enlatado +1'); return { options: opts() }; } },
          { label: 'Munição de revólver (12)', desc: `Você tem ${G.reserve} balas de reserva.`, price: 1, fn: () => { G.reserve += 12; toast('Comprado', 'Munição +12'); return { options: opts() }; } },
          { label: 'Tônico Olho Morto', desc: `Enche o núcleo de Olho Morto. Você tem ${G.tonic}.`, price: 2, fn: () => { G.tonic++; toast('Comprado', TOUCH.on ? 'Tônico +1 (use no Alforje 🎒)' : 'Tônico +1 (use no Alforje com [Tab])'); return { options: opts() }; } },
          { label: 'Cenoura para o cavalo', desc: 'Aumenta o vínculo com seu cavalo.', price: 0.25, fn: () => { G.carrots = (G.carrots || 0) + 1; toast('Comprado', 'Cenoura +1'); return { options: opts() }; } },
          { label: `Vender ervas (${hc})`, desc: 'Ervas coletadas nos arredores. $0.40 cada.', disabled: hc === 0, fn: () => {
            earn(hc * 0.4); G.herbs = {}; toast('Vendido', `Você vendeu ${hc} ervas por ${fmtMoney(hc * 0.4)}.`, 'gold'); return { options: opts() };
          } },
          { label: `Vender peles (${peltCount()})`, desc: 'Coelho $0.75 · Coiote $1.50 · Cervo $2.50', disabled: peltCount() === 0, fn: () => {
            const v = peltValue(), n = peltCount(); earn(v); G.pelts = {}; toast('Vendido', `${n} peles por ${fmtMoney(v)}.`, 'gold'); return { options: opts() };
          } },
          close,
        ];
      };
      openMenu('Armazém Geral', 'Mercadorias finas de Saint Denis.', opts());
      break;
    }
    case 'bank': {
      const opts = () => [
        { label: 'Depositar $10', desc: 'Dinheiro no banco não se perde ao morrer.', disabled: G.money < 10, fn: () => { G.money -= 10; G.bank += 10; sfx('coin'); return { options: opts() }; } },
        { label: 'Depositar tudo', disabled: G.money <= 0, fn: () => { G.bank += G.money; G.money = 0; sfx('coin'); return { options: opts() }; } },
        { label: 'Sacar $10', disabled: G.bank < 10, fn: () => { G.bank -= 10; G.money += 10; sfx('coin'); return { options: opts() }; } },
        { label: 'Sacar tudo', disabled: G.bank <= 0, fn: () => { G.money += G.bank; G.bank = 0; sfx('coin'); return { options: opts() }; } },
        close,
      ];
      openMenu('Banco de Vale Esperança', () => `Saldo em conta: <b>${fmtMoney(G.bank)}</b>`, opts());
      break;
    }
    case 'barber':
      openMenu('Barbearia', 'Uma navalha afiada e mãos... quase firmes.', [
        { label: 'Fazer a barba', desc: G.beard > 0.2 ? 'Sua barba está crescida.' : 'Você já está bem barbeado.', price: 1, fn: () => {
          fadeTransition('Snip, snip...', () => { G.beard = 0; G.time += 0.3; toast('Barba feita', 'Que rosto bonito!', 'good'); }); return false;
        } },
        { label: 'Aparar o bigode', price: 0.5, fn: () => { G.beard = Math.min(G.beard, 0.25); toast('Bigode aparado', 'Elegante.'); return false; } },
        close,
      ]);
      break;
    case 'church':
      openMenu('Igreja', 'Um lugar de paz em terra sem lei.', [
        { label: 'Rezar', desc: G.prayedDay === G.day ? 'Você já rezou hoje.' : 'Um momento de reflexão.', disabled: G.prayedDay === G.day, fn: () => {
          G.prayedDay = G.day; sfx('bell'); fadeTransition('Amém.', () => { G.time += 0.25; changeHonor(5, 'Você rezou na igreja.'); }); return false;
        } },
        { label: 'Fazer doação', desc: 'Ajude os pobres da cidade.', price: 1, fn: () => { changeHonor(3, 'Você fez uma doação.'); return false; } },
        close,
      ]);
      break;
    case 'sheriff': {
      const opts = [];
      if (G.wanted > 0) {
        opts.push({ label: 'Pagar recompensa', desc: 'Limpe seu nome com a lei.', price: G.wanted, fn: () => { G.wanted = 0; toast('Nome limpo', 'Você não é mais procurado.', 'good'); return false; } });
      }
      if (G.bounty && G.bounty.stage === 'return') {
        opts.push({ label: `Entregar ${G.bounty.name}`, desc: 'Receber a recompensa.', fn: () => {
          const rw = G.bounty.reward; earn(rw); changeHonor(4, 'Você trouxe justiça.');
          banner('RECOMPENSA RECEBIDA', `+${fmtMoney(rw)}`); G.bounty = null; return false;
        } });
      }
      if (!G.bounty) {
        opts.push({ label: 'Ver cartazes de procurados', desc: 'Aceite um trabalho de caçador de recompensas.', fn: () => { startBounty(); return false; } });
      } else if (G.bounty.stage === 'hunt') {
        opts.push({ label: 'Desistir da caçada', fn: () => { cancelBounty(); toast('Caçada cancelada', 'O xerife balança a cabeça.'); return false; } });
      }
      opts.push({ label: 'Conversar com o xerife', fn: () => {
        toast('Xerife Malloy', pick(['"Mantenha o revólver no coldre dentro da cidade."', '"Os O\'Driscoll andam rondando o leste."', '"Garrafas lá atrás, se quiser treinar a mira."', '"Não me dê trabalho, forasteiro."']));
        return false;
      } });
      opts.push(close);
      openMenu('Gabinete do Xerife', G.wanted > 0 ? 'O xerife te olha de cara feia.' : 'Cartazes cobrem a parede.', opts);
      break;
    }
    case 'stable': {
      const near = dist(horse.x, horse.y, b.doorX, b.doorY) < 250;
      const opts = () => [
        { label: `Escovar ${horse.name}`, desc: near ? 'Deixe seu cavalo limpo e feliz.' : 'Traga seu cavalo até aqui (H para assobiar).', disabled: !near, price: 0.25, fn: () => {
          horse.bond = clamp(horse.bond + 0.5, 1, 4); horse.health = 100; toast(horse.name, 'Brilhando como nunca! Vínculo aumentou.', 'good'); sfx('neigh'); return { options: opts() };
        } },
        { label: 'Alimentar com feno', disabled: !near, price: 0.5, fn: () => {
          horse.stamina = 100; horse.bond = clamp(horse.bond + 0.25, 1, 4); toast(horse.name, 'Stamina do cavalo restaurada.'); return { options: opts() };
        } },
        close,
      ];
      openMenu('Estábulo', `${horse.name} · Vínculo nível ${Math.floor(horse.bond)}`, opts());
      break;
    }
    case 'post':
      openMenu('Correio', 'Cartas e telegramas.', [
        { label: 'Verificar correspondência', fn: () => {
          toast('Carta', pick(['"Querido filho, a fazenda vai bem. Volte logo. — Mãe"', 'Nenhuma carta hoje.', '"Devo-lhe $5. Aqui está. — Lenny"']));
          if (!G.gotLetter && Math.random() < 0.5) { G.gotLetter = true; earn(5); }
          return false;
        } },
        G.job
          ? { label: 'Cancelar entrega', desc: `Para ${G.job.name}, em ${G.job.where}.`, fn: () => { G.job = null; toast('Entrega cancelada', 'O carteiro suspira.'); return false; } }
          : { label: 'Pegar uma entrega', desc: 'Leve uma encomenda pela região e receba por isso.', fn: () => { takeJob(); return false; } },
        { label: 'Enviar telegrama', price: 0.25, fn: () => { toast('Telegrama enviado', 'Pare. Tudo bem por aqui. Pare.'); return false; } },
        close,
      ]);
      break;
    case 'farm':
      openMenu(b.owner, 'Galinhas, poeira e trabalho duro.', [
        { label: 'Ajudar na lida', desc: 'Uma hora de trabalho pesado. Paga $1.50.', disabled: G.stamina < 25, fn: () => {
          fadeTransition('Trabalhando...', () => { advanceTime(1); G.stamina = clamp(G.stamina - 30, 0, 100); G.dirt = clamp(G.dirt + 0.2, 0, 1); earn(1.5); changeHonor(1, null); toast('Trabalho feito', 'O fazendeiro te pagou $1.50.', 'gold'); });
          return false;
        } },
        { label: 'Comprar leite fresco', desc: 'Recupera o núcleo de stamina.', price: 0.3, fn: () => { sfx('drink'); G.staminaCore = 100; G.stamina = 100; toast('Leite fresco', 'Ainda morno.'); return false; } },
        { label: 'Comprar ovos', desc: 'Conta como comida (feijão +1).', price: 0.4, fn: () => { G.food++; toast('Comprado', 'Ovos frescos. Comida +1.'); return false; } },
        { label: 'Conversar', fn: () => { toast(b.owner, pick(['"Os coiotes andam atacando as galinhas à noite."', '"Tem cervo no vale ao norte, se quiser caçar."', '"Cuidado com o trem ao cruzar os trilhos."', '"Choveu pouco este ano..."'])); return false; } },
        close,
      ]);
      break;
    case 'house':
      if (Math.random() < 0.5) say(player, pick(['Tem alguém aí?', 'Olá?']));
      toast('Casa', pick(['Ninguém atende.', 'Uma voz grita: "Vá embora!"', 'Está trancada.', 'Você ouve um cachorro latindo lá dentro.']));
      break;
  }
}

function sleep(hours, msg) {
  fadeTransition('Dormindo...', () => {
    advanceTime(hours);
    G.health = 100; G.stamina = 100; G.healthCore = 100; G.staminaCore = 100; G.deadEyeCore = 100; G.deadEye = 100;
    G.drunk = 0; G.beard = clamp(G.beard + 0.3, 0, 1);
    toast('Bom dia', msg, 'good');
  });
}
function advanceTime(h) {
  G.time += h;
  while (G.time >= 24) { G.time -= 24; G.day++; }
}

function playDice() {
  sfx('dice');
  const a = [1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0)];
  const b = [1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0)];
  const sa = a[0] + a[1], sb = b[0] + b[1];
  const face = (n) => '⚀⚁⚂⚃⚄⚅'[n - 1];
  let res;
  if (sa > sb) { res = 'Você venceu! +$10.00'; earn(10); }
  else if (sa === sb) { res = 'Empate. Aposta devolvida.'; G.money += 5; }
  else res = 'O croupier venceu.';
  toast('Dados', `Você: ${face(a[0])}${face(a[1])} (${sa}) · Croupier: ${face(b[0])}${face(b[1])} (${sb}) — ${res}`, sa > sb ? 'gold' : '');
}

// ---------------------------------------------------------------------
// Recompensas (bounties)
// ---------------------------------------------------------------------
const OUTLAW_NAMES = ['"Dentuço" McGraw', 'Josiah "Cascavel" Trent', 'Irmãos Del Lobo', 'Big Jim Colby', 'Dutch Callahan', 'Mickey "Olho Torto" Reyes'];
const HIDEOUTS = [{ x: 3700, y: 2100 }, { x: 350, y: 450 }, { x: 3650, y: 350 }, { x: 420, y: 2250 }, { x: 2900, y: 2350 }, { x: 1200, y: 250 }];

function startBounty() {
  const spot = pick(HIDEOUTS);
  const name = pick(OUTLAW_NAMES);
  const count = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
  G.bounty = { name, stage: 'hunt', x: spot.x, y: spot.y, reward: 15 + count * 10 + Math.round(Math.random() * 10) };
  outlaws.length = 0;
  for (let i = 0; i < count; i++) {
    let x, y, t = 0;
    do { x = spot.x + R(-90, 90); y = spot.y + R(-70, 70); t++; } while (collides(x, y, 10) && t < 40);
    outlaws.push({
      kind: 'outlaw', leader: i === 0, x, y, dir: -1, phase: 0, moving: false, r: 8, hp: i === 0 ? 5 : 3, alive: true, deadT: 0,
      shootT: 1 + Math.random() * 2, state: 'idle', tx: x, ty: y, stuck: 0, alert: false,
      coat: pick(['#3a2a22', '#2a2a2a', '#4a2f2a']), shirt: '#8a7a6a', pants: '#2a2622', hat: pick(['#1b1b1b', '#3a2a1a']), skin: pick(SKINS),
      bandana: '#8a1a1a', speed: 70,
    });
  }
  addProp('campfire', spot.x, spot.y + 80, { solid: false, bandit: true });
  banner('PROCURADO: ' + name.toUpperCase(), `Vivo ou morto — ${fmtMoney(G.bounty.reward)}`);
  toast('Nova caçada', 'O esconderijo foi marcado no seu mapa.', 'gold');
}
function cancelBounty() {
  G.bounty = null; outlaws.length = 0;
  for (let i = props.length - 1; i >= 0; i--) if (props[i].bandit) props.splice(i, 1);
}

// ---------------------------------------------------------------------
// Falas
// ---------------------------------------------------------------------
function say(ent, text, dur) {
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].ent === ent) bubbles.splice(i, 1);
  bubbles.push({ ent, text, t: dur || 3 });
}

// ---------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------
const keys = {};
const mouse = { x: 0, y: 0, down: false, right: false };
let pressed = {};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
  if (!G.started) {
    if (e.code === 'Enter' || e.code === 'Space') startGame(false);
    return;
  }
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (G.menu) {
    const m = G.menu;
    const move = (d) => {
      let i = m.sel;
      for (let k = 0; k < m.options.length; k++) {
        i = (i + d + m.options.length) % m.options.length;
        if (!m.options[i].disabled) break;
      }
      m.sel = i; sfx('click'); renderMenu();
    };
    if (e.code === 'ArrowUp' || e.code === 'KeyW') move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') move(1);
    else if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') chooseMenu();
    else if (e.code === 'Escape' || e.code === 'Backspace') closeMenu();
    else if (/^Digit[1-9]$/.test(e.code)) {
      const i = +e.code.slice(5) - 1;
      if (m.options[i]) { m.sel = i; chooseMenu(); }
    }
    pressed = {};
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = mouse.right = false; });
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (e.button === 0) { mouse.down = true; pressed.Mouse0 = true; }
  if (e.button === 2) mouse.right = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; if (e.button === 2) mouse.right = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
$('startBtn').addEventListener('click', () => startGame(false));
$('newGameBtn').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nada */ } startGame(true); });

function startGame(fresh) {
  if (G.started) return;
  const loaded = !fresh && loadGame();
  G.started = true;
  $('muteBtn').textContent = G.muted ? '🔇' : '🔊';
  initAudio();
  if (AC && AC.state === 'suspended') AC.resume();
  if (TOUCH.on) {
    const el = document.documentElement;
    try { const p = el.requestFullscreen && el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* sem tela cheia */ }
  }
  $('title').classList.add('hidden');
  $('hud').classList.remove('hidden');
  banner('VALE ESPERANÇA', 'Novo Hanover · 1899');
  if (loaded) {
    setTimeout(() => toast('Bem-vindo de volta', `Dia ${G.day}. Seu progresso foi carregado.`, 'good'), 1200);
    return;
  }
  setTimeout(() => toast('Bem-vindo, forasteiro', TOUCH.on ? 'Explore a cidade. Chegue perto de portas e pessoas e toque nos botões que aparecem.' : 'Explore a cidade. Aproxime-se das portas e pessoas e use [E].'), 1500);
  setTimeout(() => toast('Dica', TOUCH.on ? 'Seu cavalo Tempestade está em frente ao estábulo. Toque em "Assobiar" para chamá-lo.' : 'Seu cavalo Tempestade está em frente ao estábulo. Pressione [H] para chamá-lo.'), 6000);
  setTimeout(() => toast('Dica', 'O Xerife tem trabalhos de caçador de recompensas.'), 11000);
}

// ---------------------------------------------------------------------
// Controles de toque
// ---------------------------------------------------------------------
const JOY_MAX = 55;
function showJoy() {
  const j = TOUCH.joy, base = $('joy'), knob = $('joyKnob');
  if (!j) { base.classList.remove('active'); base.style.left = ''; base.style.top = ''; knob.style.transform = ''; return; }
  base.classList.add('active');
  base.style.left = j.ox + 'px'; base.style.top = j.oy + 'px';
  knob.style.transform = `translate(${j.vx * j.mag * JOY_MAX}px, ${j.vy * j.mag * JOY_MAX}px)`;
}
function moveJoy(t) {
  const j = TOUCH.joy;
  let dx = t.clientX - j.ox, dy = t.clientY - j.oy;
  const len = Math.hypot(dx, dy);
  if (len > JOY_MAX * 1.3) { // a base acompanha o dedo
    j.ox = t.clientX - (dx / len) * JOY_MAX * 1.3; j.oy = t.clientY - (dy / len) * JOY_MAX * 1.3;
    dx = t.clientX - j.ox; dy = t.clientY - j.oy;
  }
  const l = Math.hypot(dx, dy) || 1;
  j.vx = dx / l; j.vy = dy / l; j.mag = Math.min(1, l / JOY_MAX);
  showJoy();
}
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!G.started) return;
  for (const t of e.changedTouches) {
    if (!TOUCH.joy && t.clientX < VW * 0.55) {
      TOUCH.joy = { id: t.identifier, ox: t.clientX, oy: t.clientY, vx: 0, vy: 0, mag: 0 };
      showJoy();
    }
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) if (TOUCH.joy && t.identifier === TOUCH.joy.id) moveJoy(t);
}, { passive: false });
function endTouch(e) {
  for (const t of e.changedTouches) if (TOUCH.joy && t.identifier === TOUCH.joy.id) { TOUCH.joy = null; showJoy(); }
}
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
// Botões na tela, avisos tocáveis e itens do alforje usam data-key
$('hud').addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-key]');
  if (!el || !G.started) return;
  e.preventDefault();
  pressed[el.dataset.key] = true;
  el.classList.add('down');
  setTimeout(() => el.classList.remove('down'), 120);
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------------------------------------------------------------------
// Câmera
// ---------------------------------------------------------------------
const cam = { x: player.x, y: player.y };
function screenToWorld(sx, sy) {
  return { x: (sx - VW / 2) / ZOOM + cam.x, y: (sy - VH / 2) / ZOOM + cam.y };
}

// ---------------------------------------------------------------------
// Inicialização das entidades
// ---------------------------------------------------------------------
for (let i = 0; i < 18; i++) {
  let p, t = 0;
  do { p = randomStreetPoint(); t++; } while (collides(p.x, p.y, 8) && t < 50);
  makeNPC(p.x, p.y);
}
dog = { kind: 'dog', x: 1500, y: 1220, dir: 1, phase: 0, moving: false, r: 6, tx: 1500, ty: 1220, wait: 0, stuck: 0, bond: 0, name: 'Caipira' };
for (let i = 0; i < 3; i++) {
  corralHorses.push({ x: R(CORRAL.x + 50, CORRAL.x + CORRAL.w - 50), y: R(CORRAL.y + 50, CORRAL.y + CORRAL.h - 20), dir: 1, phase: 0,
    moving: false, coat: ['#d8c8a8', '#2a1c14', '#8a5a3a'][i], mane: ['#f0e8d8', '#0a0806', '#3a2418'][i], tx: 0, ty: 0, wait: R(0, 3), r: 12 });
}
for (let i = 0; i < 5; i++) tumbleweeds.push({ x: R(0, WORLD_W), y: R(0, WORLD_H), r: R(8, 13), rot: 0, vx: R(40, 90), vy: 0, hop: 0 });

// ---------------------------------------------------------------------
// Interações contextuais
// ---------------------------------------------------------------------
function getInteraction() {
  const px = player.x, py = player.y;
  let best = null, bestD = 1e9;
  const consider = (d, max, info) => { if (d < max && d < bestD) { bestD = d; best = info; } };

  if (G.sitting) return { e: { label: 'Levantar', fn: standUp } };
  if (player.mounted) {
    const d = 0;
    const opts = { e: { label: 'Desmontar', fn: dismount } };
    if (G.carrots) opts.f = { label: `Dar cenoura (${G.carrots})`, fn: feedCarrot };
    // mesmo montado dá para entrar em menus perto das portas? Não — precisa desmontar.
    consider(d, 1, opts);
    return best;
  }
  for (const b of BUILDINGS) {
    const d = dist(px, py, b.doorX, b.doorY);
    const label = { saloon: 'Entrar no Saloon', hotel: 'Entrar no Hotel', store: 'Entrar no Armazém', bank: 'Entrar no Banco', barber: 'Entrar na Barbearia',
      church: 'Entrar na Igreja', sheriff: 'Falar com o Xerife', stable: 'Estábulo', post: 'Entrar no Correio', house: 'Bater na porta', farm: 'Visitar a fazenda' }[b.id];
    consider(d, 42, { e: { label, fn: () => buildingMenu(b) } });
  }
  if (horse.state !== 'dead') {
    const d = dist(px, py, horse.x, horse.y);
    consider(d - 6, 48, {
      e: { label: `Montar ${horse.name}`, fn: mount },
      f: G.carrots ? { label: `Dar cenoura (${G.carrots})`, fn: feedCarrot } : { label: 'Acariciar', fn: petHorse },
    });
  }
  for (const n of npcs) {
    if (!n.alive || n.hurt) continue;
    const d = dist(px, py, n.x, n.y);
    consider(d, 44, {
      e: { label: `Cumprimentar ${n.name}`, fn: () => greet(n) },
      f: { label: 'Provocar', fn: () => antagonize(n) },
    });
  }
  for (const o of outlaws) if (!o.alive && !o.looted) consider(dist(px, py, o.x, o.y), 40, { e: { label: 'Saquear corpo', fn: () => lootBody(o) } });
  for (const n of npcs) if (!n.alive && !n.looted) consider(dist(px, py, n.x, n.y), 40, { e: { label: 'Saquear corpo', fn: () => lootBody(n) } });
  if (dog) consider(dist(px, py, dog.x, dog.y), 36, { e: { label: `Acariciar ${dog.name}`, fn: petDog } });
  for (const h of herbs) {
    if (!h.alive) continue;
    consider(dist(px, py, h.x, h.y), 34, { e: { label: `Colher ${h.kind.name}`, fn: () => pickHerb(h) } });
  }
  for (const p of props) {
    if (!p.interact) continue;
    const d = dist(px, py, p.x, p.y - p.h / 2);
    if (p.interact === 'bench') consider(d, 40, { e: { label: 'Sentar no banco', fn: () => sitDown(p) } });
    if (p.interact === 'trough') consider(d, 50, { e: { label: 'Lavar o rosto', fn: washFace } });
    if (p.interact === 'well') consider(d, 50, { e: { label: 'Beber água do poço', fn: drinkWell } });
    if (p.interact === 'campfire') consider(d, 60, {
      e: { label: 'Acampar e descansar', fn: () => { G.sitting = { x: p.x - 40, y: p.y + 10, camp: true }; player.x = p.x - 40; player.y = p.y + 10; player.dir = 1; toast('Acampamento', TOUCH.on ? 'O tempo passa mais rápido. Mexa o joystick para levantar.' : 'O tempo passa mais rápido. [E] para levantar.'); } },
      f: G.meat > 0 ? { label: `Cozinhar carne (${G.meat})`, fn: () => { G.meat--; eatFood(true); G.healthCore = 100; } }
        : G.food > 0 ? { label: 'Cozinhar feijão', fn: () => { G.food--; eatFood(true); } } : null,
    });
  }
  for (const a of animals) if (!a.alive && !a.skinned) consider(dist(px, py, a.x, a.y), 38, { e: { label: `Esfolar ${ANIMAL[a.type].name}`, fn: () => skinAnimal(a) } });
  if (G.job) consider(dist(px, py, G.job.x, G.job.y) - 25, 40, { e: { label: `Entregar encomenda a ${G.job.name}`, fn: deliverJob } });
  eventInteractions(consider, px, py);
  return best;
}

function mount() {
  player.mounted = true; horse.state = 'ridden'; player.x = horse.x; player.y = horse.y; player.dir = horse.dir;
  sfx('neigh', 0.5);
}
function dismount() {
  const tries = [[-28, 10], [28, 10], [0, 22], [0, -18], [-40, 0], [40, 0]];
  for (const [dx, dy] of tries) {
    if (!collides(horse.x + dx, horse.y + dy, player.r)) {
      player.x = horse.x + dx; player.y = horse.y + dy; player.mounted = false; horse.state = 'idle'; horse.moving = false; horse.speed = 0; return;
    }
  }
  toast('Sem espaço', 'Não há lugar para desmontar aqui.');
}
function petHorse() {
  horse.bond = clamp(horse.bond + 0.15, 1, 4); horse.stamina = clamp(horse.stamina + 15, 0, 100);
  say(player, pick(['Bom garoto.', 'Calma, calma...', 'Isso aí, Tempestade.', 'Que cavalo bonito.']), 2);
  sfx('neigh', 0.4);
}
function feedCarrot() {
  G.carrots--; horse.bond = clamp(horse.bond + 0.35, 1, 4); horse.stamina = 100; horse.health = clamp(horse.health + 30, 0, 100);
  toast(horse.name, 'Nham! Vínculo aumentou.', 'good'); sfx('neigh', 0.5);
}
function greet(n) {
  if (n.talkCd > 0) return;
  player.tipHat = 0.8;
  n.dir = player.x < n.x ? -1 : 1; n.wait = 2.5; n.tx = n.x; n.ty = n.y; n.talkCd = 3;
  say(player, pick(['Bom dia.', 'Senhor.', 'Senhora.', 'Tudo bem?', 'Como vai?']), 1.6);
  setTimeout(() => {
    if (!n.alive) return;
    if (G.wanted > 0) { say(n, pick(WANTED_REMARKS)); n.flee = 6; }
    else if (G.dirt > 0.65) say(n, pick(DIRTY_REMARKS));
    else if (n.mood < 0) say(n, pick(['...', 'Hmph.', 'Não falo com você.']));
    else say(n, pick(GREETINGS));
  }, 900);
  if (!n.greeted) { n.greeted = true; changeHonor(1, null); }
}
function antagonize(n) {
  if (n.talkCd > 0) return;
  n.dir = player.x < n.x ? -1 : 1; n.wait = 2.5; n.tx = n.x; n.ty = n.y; n.talkCd = 3; n.mood--;
  say(player, pick(INSULTS), 2);
  setTimeout(() => { if (n.alive) { say(n, pick(INSULT_REPLIES)); if (n.mood < -2) n.flee = 4; } }, 1100);
  changeHonor(-1, null);
}
function lootBody(e) {
  e.looted = true;
  const cash = Math.round((e.kind === 'outlaw' ? R(2, 9) : R(0.2, 3)) * 100) / 100;
  const ammo = Math.floor(Math.random() * 6);
  earn(cash); G.reserve += ammo;
  if (Math.random() < 0.3) G.food++;
  toast('Saqueado', `${fmtMoney(cash)}${ammo ? `, ${ammo} balas` : ''}`, 'gold');
  if (e.kind !== 'outlaw') changeHonor(-3, 'Saquear inocentes é desonroso.');
}
function petDog() {
  dog.bond++; dog.wait = 2; sfx('bark');
  say(player, pick(['Quem é um bom garoto?', 'Ei, amigão!', 'Toma um carinho.']), 2);
  if (dog.bond === 3) toast(dog.name, 'O cachorro agora te segue pela cidade.', 'good');
  changeHonor(0.5, null);
}
function pickHerb(h) {
  h.alive = false; h.t = 120;
  G.herbs[h.kind.name] = (G.herbs[h.kind.name] || 0) + 1;
  sfx('pickup'); toast('Coletado', `${h.kind.name} (venda no Armazém)`);
  G.dirt = clamp(G.dirt + 0.02, 0, 1);
}
function sitDown(p) {
  G.sitting = { x: p.x, y: p.y - 2, bench: p };
  player.x = p.x; player.y = p.y - 2;
  toast('Descansando', TOUCH.on ? 'O tempo passa mais rápido. Mexa o joystick para levantar.' : 'O tempo passa mais rápido. [E] para levantar.');
}
function standUp() {
  const s = G.sitting;
  G.sitting = null;
  const offs = [[0, 16], [0, -18], [30, 0], [-30, 0]];
  for (const [dx, dy] of offs) if (!collides(s.x + dx, s.y + dy, player.r)) { player.x = s.x + dx; player.y = s.y + dy; return; }
}
function washFace() {
  G.dirt = clamp(G.dirt - 0.4, 0, 1); sfx('drink');
  for (let i = 0; i < 10; i++) particles.push({ x: player.x, y: player.y - 30, vx: R(-40, 40), vy: R(-60, 0), life: 0.6, max: 0.6, color: 'rgba(160,200,230,0.8)', size: 2, g: 200 });
  toast('Água fresca', 'Você lavou o rosto e as mãos.');
}
function drinkWell() {
  G.stamina = clamp(G.stamina + 30, 0, 100); G.staminaCore = clamp(G.staminaCore + 5, 0, 100); G.drunk = clamp(G.drunk - 20, 0, 100);
  sfx('drink'); toast('Poço', 'Água limpa e gelada.');
}
function eatFood(cooked) {
  G.healthCore = clamp(G.healthCore + (cooked ? 50 : 35), 0, 100);
  G.staminaCore = clamp(G.staminaCore + (cooked ? 30 : 20), 0, 100);
  G.health = clamp(G.health + 20, 0, 100);
  toast(cooked ? 'Feijão quentinho' : 'Feijão frio', 'Núcleos de vida e stamina recuperados.', 'good');
  sfx('pickup');
}

// ---------------------------------------------------------------------
// Tiros
// ---------------------------------------------------------------------
function shoot(target) {
  if (G.reloading > 0 || player.shotT > 0) return;
  if (G.ammo <= 0) { sfx('click'); if (G.reserve > 0) startReload(); else toast('Sem munição', 'Compre mais no Armazém.'); return; }
  G.ammo--;
  const w = target || screenToWorld(mouse.x, mouse.y);
  const ox = player.x, oy = player.y - (player.mounted ? 48 : 22);
  let ang = Math.atan2(w.y - oy, w.x - ox);
  const spread = G.deadEyeOn ? 0 : ((player.moving ? 0.07 : 0.025) + G.drunk / 1200) * (target ? 0.5 : 1);
  ang += (Math.random() - 0.5) * spread * 2;
  player.aim = ang; player.shotT = G.deadEyeOn ? 0.12 : 0.28; player.dir = Math.cos(ang) >= 0 ? 1 : -1;
  const mx = ox + Math.cos(ang) * 18, my = oy + Math.sin(ang) * 18;
  bullets.push({ x: mx, y: my, vx: Math.cos(ang) * 1500, vy: Math.sin(ang) * 1500, life: 0.5, from: 'player', dmg: G.deadEyeOn ? 3 : 1 });
  for (let i = 0; i < 6; i++) particles.push({ x: mx, y: my, vx: Math.cos(ang) * R(40, 120) + R(-30, 30), vy: Math.sin(ang) * R(40, 120) + R(-30, 30), life: 0.5, max: 0.5, color: 'rgba(200,190,170,0.5)', size: R(3, 6), smoke: true });
  particles.push({ x: mx, y: my, vx: 0, vy: 0, life: 0.06, max: 0.06, color: 'rgba(255,220,120,1)', size: 9, flash: true });
  sfx('shot'); G.shake = Math.max(G.shake, 4);
  // disparar na cidade assusta as pessoas
  if (!G.bounty || dist(player.x, player.y, G.bounty.x, G.bounty.y) > 800) {
    for (const n of npcs) if (n.alive && dist(n.x, n.y, player.x, player.y) < 380) n.flee = Math.max(n.flee, 4);
  }
  for (const a of animals) if (a.alive && a.type !== 'coyote' && dist(a.x, a.y, player.x, player.y) < 600) a.flee = 4;
  if (G.ammo === 0 && G.reserve > 0) setTimeout(startReload, 300);
}
// Mira automática para o celular: bandidos primeiro, depois garrafas.
// Nunca mira em moradores inocentes.
function autoTarget() {
  let best = null, bd = 1e9;
  const tryT = (x, y, d, max) => { if (d < max && d < bd) { bd = d; best = { x, y }; } };
  for (const o of outlaws) if (o.alive) tryT(o.x, o.y - 20, dist(player.x, player.y, o.x, o.y), 520);
  for (const a of animals) if (a.alive && a.type === 'coyote' && a.hunting) tryT(a.x, a.y - 10, dist(player.x, player.y, a.x, a.y), 420);
  const ev = G.event;
  if (ev && ev.thief && ev.thief.alive && ev.stage === 'chase') tryT(ev.thief.x, ev.thief.y - 20, dist(player.x, player.y, ev.thief.x, ev.thief.y), 420);
  if (best) return best;
  for (const a of animals) if (a.alive) tryT(a.x, a.y - ANIMAL[a.type].hh * 0.5, dist(player.x, player.y, a.x, a.y), 420);
  for (const b of bottles) if (b.alive) tryT(b.x, b.y - 9, dist(player.x, player.y, b.x, b.y), 380);
  return best;
}
function touchShoot() {
  const t = G.autoTarget;
  if (t) return shoot({ x: t.x, y: t.y });
  const fx = player.fx || player.dir, fy = player.fy || 0;
  shoot({ x: player.x + fx * 300, y: player.y - (player.mounted ? 48 : 22) + fy * 300 });
}
function useTonic() {
  if (G.tonic <= 0) { toast('Sem tônico', 'Compre no Armazém.'); return; }
  G.tonic--; G.deadEye = 100; G.deadEyeCore = 100; sfx('drink'); toast('Tônico', 'Olho Morto restaurado.', 'good');
  if (G.invOpen) renderInventory();
}
function startReload() {
  if (G.reloading > 0 || G.ammo >= 6 || G.reserve <= 0) return;
  G.reloading = 1.4; sfx('reload');
}
function enemyShoot(o) {
  const tx = player.x, ty = player.y - (player.mounted ? 40 : 18);
  const ox = o.x, oy = o.y - 22;
  let ang = Math.atan2(ty - oy, tx - ox) + (Math.random() - 0.5) * 0.22;
  o.aim = ang; o.shotT = 0.3; o.dir = Math.cos(ang) >= 0 ? 1 : -1;
  bullets.push({ x: ox + Math.cos(ang) * 16, y: oy + Math.sin(ang) * 16, vx: Math.cos(ang) * 650, vy: Math.sin(ang) * 650, life: 1.2, from: 'enemy', dmg: 1 });
  particles.push({ x: ox + Math.cos(ang) * 16, y: oy + Math.sin(ang) * 16, vx: 0, vy: 0, life: 0.06, max: 0.06, color: 'rgba(255,220,120,1)', size: 8, flash: true });
  const d = dist(o.x, o.y, player.x, player.y);
  sfx('eshot', clamp(1 - d / 900, 0.15, 1));
}

function hitPlayer(dmg) {
  G.health -= dmg * 14; G.lastHit = 0; G.shake = 10; sfx('hurt');
  for (let i = 0; i < 8; i++) particles.push({ x: player.x, y: player.y - 22, vx: R(-60, 60), vy: R(-80, 10), life: 0.5, max: 0.5, color: '#8a0f0f', size: 2.5, g: 300 });
  if (G.health <= 0) die();
}
function killEnt(e) {
  e.alive = false; e.deadT = 0; e.moving = false;
  for (let i = 0; i < 14; i++) particles.push({ x: e.x, y: e.y - 20, vx: R(-70, 70), vy: R(-90, 10), life: 0.7, max: 0.7, color: '#8a0f0f', size: 2.5, g: 300 });
  particles.push({ x: e.x + e.dir * -10, y: e.y, vx: 0, vy: 0, life: 40, max: 40, color: 'rgba(110,10,10,0.55)', size: 12, pool: true });
}
function die() {
  if (G.fading) return;
  G.health = 0;
  fadeTransition('VOCÊ MORREU', () => {
    const lost = Math.round(G.money * 0.25 * 100) / 100;
    G.money -= lost;
    G.health = 100; G.stamina = 100; G.deadEyeOn = false; G.timeScale = 1;
    G.healthCore = Math.max(G.healthCore, 50);
    player.mounted = false; G.sitting = null;
    const hotel = BUILDINGS.find((b) => b.id === 'hotel');
    player.x = hotel.doorX; player.y = hotel.doorY + 10;
    if (horse.state === 'ridden') horse.state = 'idle';
    advanceTime(6);
    if (G.bounty && G.bounty.stage === 'hunt') { for (const o of outlaws) if (o.alive) { o.hp = o.leader ? 5 : 3; o.alert = false; } }
    toast('Você sobreviveu... por pouco', lost > 0 ? `Perdeu ${fmtMoney(lost)} da carteira.` : 'Acordou na frente do hotel.');
  }, true);
}

// ---------------------------------------------------------------------
// Atualização
// ---------------------------------------------------------------------
function update(rdt) {
  const dt = rdt * G.timeScale;
  pressed.Mouse0 = pressed.Mouse0 && !G.menu;
  const blocked = G.menu || G.fading;

  // ---- tempo
  let tRate = 1 / 30; // 1 hora = 30 s
  if (G.sitting) tRate *= G.sitting.camp ? 16 : 8;
  if (!G.menu) advanceTime(dt * tRate);

  // ---- Olho Morto
  if (pressed.KeyQ && !blocked) {
    if (G.deadEyeOn) { G.deadEyeOn = false; }
    else if (G.deadEye > 15) { G.deadEyeOn = true; sfx('deadeye'); }
    else toast('Olho Morto', 'Núcleo vazio. Beba um tônico ou whisky.');
  }
  if (G.deadEyeOn) {
    G.deadEye -= rdt * 12;
    if (G.deadEye <= 0) { G.deadEye = 0; G.deadEyeOn = false; }
  } else {
    G.deadEye = clamp(G.deadEye + rdt * 0.8 * (G.deadEyeCore / 100), 0, 100);
  }
  G.timeScale = lerp(G.timeScale, G.deadEyeOn ? 0.3 : 1, clamp(rdt * 6, 0, 1));

  // ---- núcleos e atributos
  G.healthCore = clamp(G.healthCore - dt * tRate * 3, 0, 100);
  G.staminaCore = clamp(G.staminaCore - dt * tRate * 3.5, 0, 100);
  G.deadEyeCore = clamp(G.deadEyeCore - dt * tRate * 2, 0, 100);
  G.lastHit += dt;
  if (G.lastHit > 4 && G.health < 100) G.health = clamp(G.health + dt * (1 + G.healthCore / 25), 0, 100);
  G.beard = clamp(G.beard + dt * tRate * 0.015, 0, 1);
  G.dirt = clamp(G.dirt + dt * tRate * 0.01, 0, 1);
  G.drunk = clamp(G.drunk - dt * 1.2, 0, 100);
  if (G.reloading > 0) {
    G.reloading -= dt;
    if (G.reloading <= 0) { const n = Math.min(6 - G.ammo, G.reserve); G.ammo += n; G.reserve -= n; G.reloading = 0; }
  }
  player.shotT = Math.max(0, player.shotT - dt);
  player.tipHat = Math.max(0, player.tipHat - dt);

  // ---- ações de tecla
  if (!blocked) {
    const inter = getInteraction();
    const list = [];
    if (inter) {
      if (inter.e) list.push({ key: 'E', label: inter.e.label });
      if (inter.f) list.push({ key: 'F', label: inter.f.label });
    }
    if (!player.mounted && !G.sitting && dist(player.x, player.y, horse.x, horse.y) > 150) list.push({ key: 'H', label: 'Assobiar' });
    if (G.food > 0 && G.healthCore < 90) list.push({ key: 'C', label: `Comer feijão (${G.food})` });
    renderPrompts(list);

    if (pressed.KeyE && inter && inter.e) inter.e.fn();
    else if (pressed.KeyF && inter && inter.f) inter.f.fn();
    if (pressed.KeyH && !player.mounted) whistle();
    if (pressed.KeyC && G.food > 0) { G.food--; eatFood(false); if (G.invOpen) renderInventory(); }
    if (pressed.KeyR) startReload();
    if (pressed.KeyG && !G.sitting) { player.tipHat = 0.8; }
    if (pressed.Tab) toggleInventory();
    if (pressed.KeyT) useTonic();
    if (pressed.Shoot && !G.sitting) touchShoot();
    if (pressed.Escape && G.invOpen) toggleInventory();
    if (pressed.Mouse0 && !G.sitting) shoot();
  } else renderPrompts([]);

  if (pressed.KeyM) toggleMute();
  G.autoTarget = TOUCH.on ? autoTarget() : null;

  // ---- jogador
  updatePlayer(dt, blocked);
  updateHorse(dt);
  for (const n of npcs) updateNPC(n, dt);
  updateDog(dt);
  for (const o of outlaws) updateOutlaw(o, dt);
  for (const h of corralHorses) updateCorralHorse(h, dt);
  updateBullets(dt);
  updateParticles(dt);
  updateWorld(dt);
  updateAnimals(dt);
  updateTrain(dt);
  updateEvents(rdt, dt);
  updateWeather(dt, tRate);
  autosave(rdt);

  // câmera
  const lead = player.mounted ? 0.35 : 0.15;
  const tx = player.x + (player.vx || 0) * lead, ty = player.y - 20 + (player.vy || 0) * lead;
  cam.x = lerp(cam.x, tx, clamp(rdt * 4, 0, 1));
  cam.y = lerp(cam.y, ty, clamp(rdt * 4, 0, 1));
  const hw = VW / 2 / ZOOM, hh = VH / 2 / ZOOM;
  cam.x = clamp(cam.x, hw, WORLD_W - hw); cam.y = clamp(cam.y, hh, WORLD_H - hh);
  G.shake = Math.max(0, G.shake - rdt * 30);

  pressed = {};
}

function whistle() {
  sfx('whistle');
  say(player, '*assobio*', 1.2);
  if (horse.state === 'dead') return;
  const d = dist(horse.x, horse.y, player.x, player.y);
  if (d > 1400) {
    // cavalo aparece de fora da tela
    const a = Math.random() * Math.PI * 2;
    for (let k = 0; k < 20; k++) {
      const x = player.x + Math.cos(a + k) * 700, y = player.y + Math.sin(a + k) * 500;
      if (!collides(x, y, horse.r)) { horse.x = x; horse.y = y; break; }
    }
  }
  horse.state = 'coming'; horse.stuck = 0;
  setTimeout(() => sfx('neigh', 0.5), 700);
}

function updatePlayer(dt, blocked) {
  let ix = 0, iy = 0;
  if (!blocked && !G.invOpen) {
    if (keys.KeyW || keys.ArrowUp) iy -= 1;
    if (keys.KeyS || keys.ArrowDown) iy += 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (TOUCH.joy && TOUCH.joy.mag > 0.18) { ix = TOUCH.joy.vx; iy = TOUCH.joy.vy; }
  }
  if (G.sitting) {
    player.moving = false; player.vx = player.vy = 0;
    G.stamina = clamp(G.stamina + dt * 10, 0, 100);
    if (G.sitting.camp) G.health = clamp(G.health + dt * 4, 0, 100);
    if (ix || iy) standUp();
    return;
  }
  const len = Math.hypot(ix, iy) || 1;
  ix /= len; iy /= len;
  const wantRun = keys.ShiftLeft || keys.ShiftRight || (TOUCH.joy && TOUCH.joy.mag > 0.9);
  if (ix || iy) { player.fx = ix; player.fy = iy; }
  let speed;
  const drunkWobble = G.drunk > 30 ? Math.sin(performance.now() / 400) * (G.drunk / 200) : 0;
  if (player.mounted) {
    const gallop = wantRun && horse.stamina > 5;
    const target = (ix || iy) ? (gallop ? 330 : 150) : 0;
    horse.speed = lerp(horse.speed, target, clamp(dt * (target > horse.speed ? 2.2 : 4), 0, 1));
    speed = horse.speed;
    if (gallop && (ix || iy)) horse.stamina = clamp(horse.stamina - dt * (9 - horse.bond * 1.5), 0, 100);
    else horse.stamina = clamp(horse.stamina + dt * 6, 0, 100);
    if (ix || iy) { horse.hx = ix; horse.hy = iy; }
    const hx = horse.hx || 0, hy = horse.hy || 0;
    const mx = (hx + drunkWobble * 0.3) * speed * dt, my = (hy + drunkWobble * 0.3) * speed * dt;
    const moved = moveEnt(horse, mx, my, horse.r);
    if (!moved && speed > 200) { horse.speed *= 0.3; G.shake = 6; }
    horse.moving = speed > 8;
    if (hx) horse.dir = hx > 0 ? 1 : -1;
    horse.phase += dt * (speed / 18);
    player.x = horse.x; player.y = horse.y; player.dir = horse.dir; player.moving = false;
    player.vx = hx * speed; player.vy = hy * speed;
    if (speed > 200 && Math.random() < 0.5) {
      particles.push({ x: horse.x - horse.dir * 18 + R(-6, 6), y: horse.y, vx: -horse.dir * R(10, 40), vy: R(-20, 0), life: 0.8, max: 0.8, color: 'rgba(190,160,120,0.35)', size: R(4, 8), smoke: true });
    }
  } else {
    const running = wantRun && G.stamina > 3 && (ix || iy);
    speed = running ? 150 : 85;
    if (G.drunk > 60) speed *= 0.8;
    if (running) G.stamina = clamp(G.stamina - dt * 14, 0, 100);
    else G.stamina = clamp(G.stamina + dt * (4 + G.staminaCore / 12), 0, 100);
    player.running = running;
    if (ix || iy) {
      const wx = ix + drunkWobble * iy, wy = iy - drunkWobble * ix;
      moveEnt(player, wx * speed * dt, wy * speed * dt, player.r);
      player.moving = true; player.phase += dt * (running ? 14 : 9);
      if (ix) player.dir = ix > 0 ? 1 : -1;
      if (running && Math.random() < 0.15) G.dirt = clamp(G.dirt + 0.001, 0, 1);
    } else player.moving = false;
    player.vx = ix * speed; player.vy = iy * speed;
  }
  // mira
  player.aiming = (mouse.right || player.shotT > 0) && !blocked;
  if (mouse.right && !blocked) {
    const w = screenToWorld(mouse.x, mouse.y);
    player.aim = Math.atan2(w.y - (player.y - (player.mounted ? 48 : 22)), w.x - player.x);
    if (!player.mounted) player.dir = Math.cos(player.aim) >= 0 ? 1 : -1;
  }
}

function steer(e, tx, ty, speed, dt, r) {
  const d = dist(e.x, e.y, tx, ty);
  if (d < 4) { e.moving = false; return true; }
  const dx = (tx - e.x) / d, dy = (ty - e.y) / d;
  const moved = moveEnt(e, dx * speed * dt, dy * speed * dt, r);
  e.moving = true;
  if (Math.abs(dx) > 0.2) e.dir = dx > 0 ? 1 : -1;
  if (!moved) {
    e.stuck = (e.stuck || 0) + dt;
    // tenta contornar
    const side = (e.x + e.y) % 2 > 1 ? 1 : -1;
    moveEnt(e, -dy * side * speed * dt, dx * side * speed * dt, r);
  } else e.stuck = Math.max(0, (e.stuck || 0) - dt * 0.5);
  return false;
}

function updateHorse(dt) {
  if (horse.state === 'ridden') return;
  if (horse.state === 'coming') {
    const d = dist(horse.x, horse.y, player.x, player.y);
    const sp = d > 300 ? 300 : 160;
    if (d < 50 || steer(horse, player.x + (player.x < horse.x ? 34 : -34), player.y + 4, sp, dt, horse.r)) { horse.state = 'idle'; horse.moving = false; }
    horse.phase += dt * (sp / 18);
    if (horse.stuck > 2.5) {
      // teleporta para perto se ficar preso
      for (let k = 0; k < 12; k++) {
        const x = player.x + R(-60, 60), y = player.y + R(-40, 40);
        if (!collides(x, y, horse.r)) { horse.x = x; horse.y = y; break; }
      }
      horse.stuck = 0; horse.state = 'idle'; horse.moving = false;
    }
    if (sp > 200 && Math.random() < 0.4) particles.push({ x: horse.x - horse.dir * 18, y: horse.y, vx: 0, vy: R(-20, 0), life: 0.7, max: 0.7, color: 'rgba(190,160,120,0.35)', size: R(4, 8), smoke: true });
  } else {
    horse.moving = false; horse.speed = 0;
    horse.idleT = (horse.idleT || 0) + dt;
    horse.stamina = clamp(horse.stamina + dt * 4, 0, 100);
  }
}

function updateCorralHorse(h, dt) {
  h.wait -= dt;
  if (h.wait <= 0) {
    if (!h.moving) { h.tx = R(CORRAL.x + 40, CORRAL.x + CORRAL.w - 40); h.ty = R(CORRAL.y + 40, CORRAL.y + CORRAL.h - 10); }
    if (steer(h, h.tx, h.ty, 35, dt, 12) || h.stuck > 2) { h.wait = R(2, 7); h.moving = false; h.stuck = 0; }
    h.phase += dt * 2;
  }
}

function updateNPC(n, dt) {
  n.talkCd = Math.max(0, n.talkCd - dt);
  if (!n.alive) {
    n.deadT += dt;
    if (n.deadT > 45 && dist(n.x, n.y, player.x, player.y) > 700) {
      // substitui por um novo morador
      npcs.splice(npcs.indexOf(n), 1);
      const edge = Math.random() < 0.5 ? STREET.x + 20 : STREET.x + STREET.w - 20;
      makeNPC(edge, R(STREET.y + 30, STREET.y + STREET.h - 30));
    }
    return;
  }
  if (n.hurt) { n.moving = false; return; }
  // medo do jogador procurado ou de tiros
  if (G.wanted > 0 && dist(n.x, n.y, player.x, player.y) < 200) n.flee = Math.max(n.flee, 2);
  if (n.flee > 0) {
    n.flee -= dt;
    const a = Math.atan2(n.y - player.y, n.x - player.x);
    steer(n, n.x + Math.cos(a) * 60, n.y + Math.sin(a) * 60, n.speed * 2.6, dt, n.r);
    n.phase += dt * 16;
    if (!n.screamed) { n.screamed = true; if (Math.random() < 0.4) say(n, pick(['Aaah!', 'Socorro!', 'Tiros!', 'Corram!']), 1.5); }
    if (n.flee <= 0) { n.screamed = false; n.wait = 1; }
    return;
  }
  if (n.wait > 0) { n.wait -= dt; n.moving = false; return; }
  const arrived = steer(n, n.tx, n.ty, n.speed, dt, n.r);
  n.phase += dt * 8;
  if (arrived || n.stuck > 1.8) {
    const p = n.home ? { x: n.home.x + R(-130, 130), y: n.home.y + R(-10, 90) } : randomStreetPoint();
    n.tx = p.x; n.ty = p.y; n.wait = Math.random() < 0.5 ? R(1, 6) : 0; n.stuck = 0; n.moving = false;
    // conversa ambiente entre moradores
    if (Math.random() < 0.1 && dist(n.x, n.y, player.x, player.y) < 500) say(n, pick(['Que dia...', 'Hmm hmm hmm...', 'Preciso ir ao armazém.', 'Ouviu falar do assalto ao trem?', 'Vai chover, eu sinto nos ossos.']), 2.5);
  }
  // comenta quando o jogador passa sujo ou bêbado
  if (n.talkCd <= 0 && dist(n.x, n.y, player.x, player.y) < 50 && Math.random() < 0.004) {
    n.talkCd = 10;
    if (G.drunk > 50) say(n, pick(['Bêbado a essa hora?', 'Vá dormir, homem!']));
    else if (G.dirt > 0.75) say(n, pick(DIRTY_REMARKS));
    else if (G.honor > 50) say(n, pick(['É um prazer, senhor!', 'Obrigado pelo que fez pela cidade.']));
    else if (G.honor < -50) say(n, pick(['Fique longe de mim.', 'Canalha...']));
  }
}

function updateDog(dt) {
  if (!dog) return;
  const d = dist(dog.x, dog.y, player.x, player.y);
  if (dog.wait > 0) { dog.wait -= dt; dog.moving = false; return; }
  if (dog.bond >= 3 && d > 60 && d < 900 && !player.mounted) {
    steer(dog, player.x - player.dir * 24, player.y + 6, d > 150 ? 170 : 90, dt, dog.r);
    dog.phase += dt * 14;
    return;
  }
  const arrived = steer(dog, dog.tx, dog.ty, 60, dt, dog.r);
  dog.phase += dt * 12;
  if (arrived || dog.stuck > 1.5) {
    const p = randomStreetPoint(); dog.tx = p.x; dog.ty = p.y; dog.wait = R(0.5, 4); dog.stuck = 0;
    if (Math.random() < 0.15 && d < 400) sfx('bark');
  }
}

function updateOutlaw(o, dt) {
  if (!o.alive) { o.deadT += dt; return; }
  const d = dist(o.x, o.y, player.x, player.y);
  o.shotT = Math.max(0, (o.shotT || 0) - dt);
  if (!o.alert && d < 420) {
    o.alert = true;
    if (o.leader) say(o, pick(['Um caçador de recompensas!', 'Peguem ele, rapazes!', 'Você não vai me levar vivo!']), 2.5);
    for (const q of outlaws) q.alert = true;
  }
  if (!o.alert) { o.moving = false; o.phase += dt; return; }
  o.coolT = (o.coolT || R(0.8, 2)) - dt;
  // manter distância média, se mover lateralmente
  if (!o.tx || dist(o.x, o.y, o.tx, o.ty) < 8 || o.stuck > 1) {
    const a = Math.atan2(o.y - player.y, o.x - player.x) + R(-0.9, 0.9);
    const want = clamp(d, 180, 300);
    o.tx = player.x + Math.cos(a) * want; o.ty = player.y + Math.sin(a) * want; o.stuck = 0;
  }
  if (d < 900) {
    steer(o, o.tx, o.ty, o.speed, dt, o.r);
    o.phase += dt * 10;
    if (o.coolT <= 0 && d < 520) {
      enemyShoot(o); o.coolT = R(0.9, 2.1);
    }
  } else o.moving = false;
  if (Math.abs(Math.cos(Math.atan2(player.y - o.y, player.x - o.x))) > 0.1) o.dir = player.x > o.x ? 1 : -1;
}

function entsForHit() {
  const list = [];
  for (const n of npcs) if (n.alive) list.push(n);
  for (const o of outlaws) if (o.alive) list.push(o);
  if (G.event && G.event.thief && G.event.thief.alive) list.push(G.event.thief);
  return list;
}
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8);
    let dead = false;
    for (let s = 0; s < steps && !dead; s++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      // garrafas
      if (b.from === 'player') {
        for (const bt of bottles) {
          if (bt.alive && Math.abs(b.x - bt.x) < 6 && b.y > bt.y - 16 && b.y < bt.y + 2) {
            bt.alive = false; bt.t = 25; dead = true; sfx('glass');
            G.bottleHits = (G.bottleHits || 0) + 1;
            for (let k = 0; k < 12; k++) particles.push({ x: bt.x, y: bt.y - 8, vx: R(-90, 90), vy: R(-120, 20), life: 0.8, max: 0.8, color: bt.color, size: 2, g: 400 });
            if (bottles.every((q) => !q.alive)) { earn(2); banner('PONTARIA PERFEITA', 'Todas as garrafas! +$2.00'); G.deadEye = 100; }
          }
        }
        // entidades
        for (const e of entsForHit()) {
          if (Math.abs(b.x - e.x) < 9 && b.y > e.y - 36 && b.y < e.y) {
            dead = true;
            if (e.kind === 'outlaw') {
              e.hp -= b.dmg; e.alert = true; for (const q of outlaws) q.alert = true;
              for (let k = 0; k < 5; k++) particles.push({ x: b.x, y: b.y, vx: R(-50, 50), vy: R(-60, 10), life: 0.4, max: 0.4, color: '#8a0f0f', size: 2, g: 300 });
              if (e.hp <= 0) outlawDown(e);
            } else {
              killEnt(e);
              if (e.kind === 'thief') thiefShot();
              if (e.kind === 'npc') {
                G.wanted += 15; changeHonor(-20, 'Você matou um inocente.');
                toast('Crime testemunhado', 'Assassinato. Recompensa por sua cabeça aumentou.');
                for (const n of npcs) if (n.alive && dist(n.x, n.y, e.x, e.y) < 500) n.flee = 8;
              }
            }
            break;
          }
        }
        if (!dead) for (const a of animals) {
          if (!a.alive) continue;
          const sp = ANIMAL[a.type];
          if (Math.abs(b.x - a.x) < sp.hw && b.y > a.y - sp.hh && b.y < a.y + 3) { dead = true; hitAnimal(a, b.dmg); break; }
        }
        if (dog && Math.abs(b.x - dog.x) < 8 && b.y > dog.y - 16 && b.y < dog.y) {
          dead = true; toast('Ei!', 'O cachorro fugiu assustado. (A bala raspou nele.)'); dog.x += 60 * Math.sign(b.vx); changeHonor(-3, 'Atirou em um cachorro.');
        }
      } else if (b.from === 'enemy') {
        const pyTop = player.y - (player.mounted ? 60 : 36);
        if (Math.abs(b.x - player.x) < (player.mounted ? 18 : 9) && b.y > pyTop && b.y < player.y) {
          dead = true; hitPlayer(b.dmg);
        }
      }
      const s2 = solidAt(b.x, b.y);
      if (s2) {
        dead = true;
        for (let k = 0; k < 4; k++) particles.push({ x: b.x, y: b.y, vx: R(-40, 40), vy: R(-50, 0), life: 0.4, max: 0.4, color: 'rgba(160,120,80,0.8)', size: 2, g: 200 });
      }
    }
    b.life -= dt;
    if (dead || b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H) bullets.splice(i, 1);
  }
}
function outlawDown(o) {
  killEnt(o);
  G.deadEye = clamp(G.deadEye + 20, 0, 100);
  if (o.leader && G.bounty) {
    say(player, 'Fim da linha.', 2);
    G.bounty.stage = 'return';
    toast('Alvo eliminado', `${G.bounty.name} está morto. Volte ao Xerife.`, 'gold');
  }
  if (outlaws.every((q) => !q.alive)) changeHonor(2, 'Você limpou o esconderijo dos bandidos.');
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.g) p.vy += p.g * dt;
    if (p.smoke) { p.vx *= 0.96; p.vy *= 0.96; p.vy -= 10 * dt; p.size += dt * 6; }
  }
  for (let i = bubbles.length - 1; i >= 0; i--) { bubbles[i].t -= dt; if (bubbles[i].t <= 0) bubbles.splice(i, 1); }
}

function updateWorld(dt) {
  for (const b of bottles) if (!b.alive) { b.t -= dt; if (b.t <= 0) b.alive = true; }
  for (const h of herbs) if (!h.alive) { h.t -= dt; if (h.t <= 0) h.alive = true; }
  for (const t of tumbleweeds) {
    t.x += t.vx * dt; t.hop += dt * 6;
    t.y += Math.sin(t.hop) * 0.4;
    t.rot += t.vx * dt / t.r;
    if (t.x > WORLD_W + 40) { t.x = -40; t.y = R(100, WORLD_H - 100); t.vx = R(40, 90); }
  }
  // sol forte sem chapéu cansa... e o fogo do acampamento solta fumaça
  for (const p of props) {
    if (p.type === 'campfire' && Math.random() < 0.3 && dist(p.x, p.y, cam.x, cam.y) < 900) {
      particles.push({ x: p.x + R(-6, 6), y: p.y - 10, vx: R(-6, 6), vy: R(-30, -15), life: 1.6, max: 1.6, color: 'rgba(90,90,90,0.25)', size: R(4, 7), smoke: true });
    }
  }
}

function toggleInventory() {
  G.invOpen = !G.invOpen;
  const el = $('inventory');
  el.classList.toggle('hidden', !G.invOpen);
  document.body.classList.toggle('ui-open', G.invOpen || !!G.menu);
  if (!G.invOpen) return;
  renderInventory();
}
function renderInventory() {
  const el = $('inventory');
  const herbsList = Object.entries(G.herbs).map(([k, v]) => `<div class="row"><span>${k}</span><span>${v}</span></div>`).join('');
  el.innerHTML = `<h3>Alforje</h3>
    <div class="row"><span>Dinheiro</span><span>${fmtMoney(G.money)}</span></div>
    <div class="row"><span>No banco</span><span>${fmtMoney(G.bank)}</span></div>
    <div class="row use" data-key="KeyC"><span>Feijão enlatado [C]</span><span>${G.food}</span></div>
    <div class="row use" data-key="KeyT"><span>Tônico Olho Morto [T]</span><span>${G.tonic}</span></div>
    <div class="row"><span>Cenouras</span><span>${G.carrots || 0}</span></div>
    <div class="row"><span>Carne crua (cozinhe na fogueira)</span><span>${G.meat}</span></div>
    ${Object.entries(G.pelts).map(([k, v]) => `<div class="row"><span>${k}</span><span>${v}</span></div>`).join('')}
    <div class="row"><span>Munição</span><span>${G.ammo + G.reserve}</span></div>
    ${herbsList}
    <div class="row"><span>Vínculo c/ ${horse.name}</span><span>Nível ${Math.floor(horse.bond)}</span></div>
    <div class="row"><span>Barba</span><span>${G.beard < 0.2 ? 'Feita' : G.beard < 0.6 ? 'Por fazer' : 'Longa'}</span></div>
    <div class="row"><span>Higiene</span><span>${G.dirt < 0.3 ? 'Limpo' : G.dirt < 0.65 ? 'Empoeirado' : 'Imundo'}</span></div>
    <div class="row"><span>Garrafas acertadas</span><span>${G.bottleHits || 0}</span></div>
    <div class="row"><span>Animais caçados</span><span>${G.hunts}</span></div>
    <div class="row"><span>Entregas feitas</span><span>${G.jobsDone}</span></div>
    <button class="inv-close" data-key="Tab">Fechar</button>`;
}
window.addEventListener('keydown', (e) => {
  if (!G.started || G.menu) return;
  // (o tônico é tratado em update() via pressed.KeyT)
});

// ---------------------------------------------------------------------
// Desenho — personagens
// ---------------------------------------------------------------------
function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fill(); }

function drawPerson(c, p, opts) {
  opts = opts || {};
  c.save();
  c.translate(p.x, p.y + (opts.oy || 0));
  if (!opts.riding) { c.fillStyle = 'rgba(0,0,0,0.28)'; ellipse(c, 0, 0, 10, 3.6); }
  if (p.alive === false) {
    // corpo caído
    c.rotate((p.dir || 1) * -Math.PI / 2);
    c.translate(0, -2);
  }
  const moving = p.moving && p.alive !== false;
  const sw = moving ? Math.sin(p.phase) * 4 : 0;
  const bob = moving ? Math.abs(Math.cos(p.phase)) * 1.2 : 0;
  const sitting = opts.sitting;
  c.save();
  c.scale(p.dir || 1, 1);
  c.translate(0, -bob);

  const legTop = sitting ? -12 : -14;
  // pernas
  if (opts.riding) {
    c.fillStyle = p.pants || p.coat;
    rrect(c, -1, -12, 5, 14, 2);
    c.fillStyle = '#231710'; rrect(c, -1, 0, 7, 3.5, 1.5);
  } else if (sitting) {
    c.fillStyle = p.pants || p.coat;
    rrect(c, -3, -12, 11, 5, 2);
    rrect(c, 5, -12, 4, 11, 2);
    c.fillStyle = '#231710'; rrect(c, 5, -2, 7, 3, 1.5);
  } else if (p.female) {
    c.fillStyle = '#231710';
    rrect(c, -4 + sw * 0.4, -3, 4, 3, 1); rrect(c, 1 - sw * 0.4, -3, 4, 3, 1);
    c.fillStyle = p.coat;
    c.beginPath(); c.moveTo(-6, -18); c.lineTo(6, -18); c.lineTo(8 + sw * 0.3, -2); c.lineTo(-8 + sw * 0.3, -2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(-7, -6, 15, 2);
  } else {
    c.fillStyle = p.pants || '#333';
    rrect(c, -4 + sw, legTop, 4, 12, 1.5);
    rrect(c, 0.5 - sw, legTop, 4, 12, 1.5);
    c.fillStyle = '#231710';
    rrect(c, -5 + sw, -3, 6, 3.5, 1.5);
    rrect(c, 0 - sw, -3, 6, 3.5, 1.5);
  }
  // tronco
  const ty = sitting ? -26 : -28;
  c.fillStyle = p.shirt || '#ccc';
  rrect(c, -6, ty, 12, 15, 3);
  c.fillStyle = p.coat;
  if (!p.female) {
    rrect(c, -7, ty, 5, 16, 2.5); rrect(c, 2, ty, 5, 16, 2.5);
    c.fillRect(-7, ty, 14, 4);
    c.fillStyle = '#2a1a10'; c.fillRect(-6, ty + 12, 12, 2.2); // cinto
    c.fillStyle = '#c9a54a'; c.fillRect(-1, ty + 12, 2, 2.2);
    c.fillStyle = '#3a2414'; rrect(c, 3, ty + 12, 4, 7, 1); // coldre
  } else {
    rrect(c, -6, ty, 12, 12, 3);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-2, ty + 1, 4, 3);
  }
  if (p.bandana) { c.fillStyle = p.bandana; c.fillRect(-4, ty - 2, 8, 3); }
  // braços
  const armSw = moving ? -sw * 0.8 : 0;
  c.fillStyle = p.coat;
  const aiming = opts.aiming;
  if (!aiming) {
    rrect(c, -9 + armSw * 0.3, ty + 1, 3.5, 12, 1.5);
    if (!(opts.tipHat > 0)) rrect(c, 6 - armSw * 0.3, ty + 1, 3.5, 12, 1.5);
    c.fillStyle = p.skin;
    ellipse(c, -7.3 + armSw * 0.3, ty + 13.5, 1.8, 1.8);
    if (!(opts.tipHat > 0)) ellipse(c, 7.7 - armSw * 0.3, ty + 13.5, 1.8, 1.8);
  } else {
    rrect(c, -9, ty + 1, 3.5, 12, 1.5);
  }
  if (opts.tipHat > 0) {
    c.fillStyle = p.coat;
    c.save(); c.translate(6, ty + 2); c.rotate(-2.4); rrect(c, -1.5, 0, 3.5, 11, 1.5); c.restore();
  }
  // cabeça
  const hy = ty - 6;
  c.fillStyle = p.skin;
  ellipse(c, 0, hy, 5.2, 5.6);
  if (p.female && !p.hat) {
    c.fillStyle = '#4a2e1a'; ellipse(c, -1.5, hy - 2.5, 5.5, 4); ellipse(c, -4, hy + 1, 2.5, 4);
  }
  // barba
  if (opts.beard > 0.15) {
    c.fillStyle = `rgba(60,38,22,${0.3 + opts.beard * 0.6})`;
    c.beginPath(); c.ellipse(1, hy + 2.6, 4.4, 2.6 + opts.beard * 1.4, 0, 0, Math.PI); c.fill();
  }
  if (opts.dirt > 0.4) { c.fillStyle = `rgba(90,60,30,${(opts.dirt - 0.4) * 0.6})`; ellipse(c, 0, hy, 5.2, 5.6); }
  c.fillStyle = '#1a0f08'; c.fillRect(2.4, hy - 1.2, 1.3, 1.5); // olho
  if (p.bandana && p.kind === 'outlaw') { c.fillStyle = p.bandana; c.beginPath(); c.moveTo(-5, hy + 0.5); c.lineTo(5.5, hy + 0.5); c.lineTo(3, hy + 6); c.lineTo(-4, hy + 5); c.fill(); }
  // chapéu
  if (p.hat) {
    const tip = opts.tipHat > 0 ? Math.sin((0.8 - opts.tipHat) / 0.8 * Math.PI) * 4 : 0;
    c.save(); c.translate(0, -tip);
    c.fillStyle = p.hat;
    if (p.female) {
      ellipse(c, 0, hy - 4.5, 8, 2.4); rrect(c, -4, hy - 9, 8, 5, 2);
      c.fillStyle = '#e8d8b0'; c.fillRect(-4, hy - 5.5, 8, 1.2);
    } else {
      ellipse(c, 0, hy - 4, 10.5, 3.2);
      c.beginPath(); c.moveTo(-5, hy - 4); c.lineTo(-4.5, hy - 11); c.quadraticCurveTo(0, hy - 9, 4.5, hy - 11); c.lineTo(5, hy - 4); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-5, hy - 6, 10, 1.6);
    }
    c.restore();
  }
  c.restore();

  // braço com revólver
  if (aiming && p.alive !== false) {
    const ang = opts.aimAngle;
    c.save();
    c.translate(0, ty + 3);
    c.rotate(ang);
    c.fillStyle = p.coat; rrect(c, 0, -1.8, 11, 3.6, 1.5);
    c.fillStyle = p.skin; ellipse(c, 11.5, 0, 2, 2);
    c.fillStyle = '#2b2b2e'; c.fillRect(11, -1.4, 9, 2.4); c.fillStyle = '#5a3a22'; c.fillRect(10, 0, 3, 4);
    c.restore();
  }
  c.restore();
}

function drawHorse(c, h, opts) {
  opts = opts || {};
  c.save();
  c.translate(h.x, h.y);
  c.fillStyle = 'rgba(0,0,0,0.28)'; ellipse(c, 0, 0, 26, 6);
  c.scale(h.dir, 1);
  const moving = h.moving;
  const gait = moving ? h.phase : 0;
  const amp = moving ? (opts.fast ? 7 : 4) : 0;
  const bob = moving ? Math.abs(Math.sin(gait)) * (opts.fast ? 3 : 1.2) : 0;
  c.translate(0, -bob);
  const legs = [[-15, 0], [-10, Math.PI], [11, Math.PI * 0.5], [16, Math.PI * 1.5]];
  for (let i = 0; i < 4; i++) {
    const [lx, ph] = legs[i];
    const s = Math.sin(gait + ph) * amp;
    c.strokeStyle = i % 2 ? h.coat : shade(h.coat, -18);
    c.lineWidth = 3.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(lx, -20); c.lineTo(lx + s * 0.5, -10); c.lineTo(lx + s, -2 + bob); c.stroke();
    c.fillStyle = '#1a120c'; c.fillRect(lx + s - 2, -2.5 + bob, 4, 2.5);
  }
  // cauda
  c.strokeStyle = h.mane; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-21, -27); c.quadraticCurveTo(-30 - (moving ? Math.sin(gait) * 3 : 0), -20, -27, -8); c.stroke();
  // corpo
  c.fillStyle = h.coat;
  ellipse(c, 0, -24, 22, 9.5);
  c.fillStyle = 'rgba(255,255,255,0.08)'; ellipse(c, 2, -28, 16, 4);
  // pescoço e cabeça
  const nod = moving ? Math.sin(gait * 2) * 1.5 : Math.sin(performance.now() / 900) * 0.8;
  c.fillStyle = h.coat;
  c.beginPath(); c.moveTo(12, -30); c.lineTo(22, -44 + nod); c.lineTo(28, -40 + nod); c.lineTo(20, -20); c.closePath(); c.fill();
  c.save(); c.translate(27, -41 + nod); c.rotate(0.55);
  ellipse(c, 3, 0, 9, 4.5);
  c.fillStyle = shade(h.coat, -25); ellipse(c, 10, 0.5, 3, 3.4);
  c.restore();
  c.fillStyle = h.coat; c.beginPath(); c.moveTo(23, -46 + nod); c.lineTo(22, -51 + nod); c.lineTo(26, -46 + nod); c.fill(); // orelha
  c.fillStyle = '#0a0806'; c.fillRect(27.5, -43 + nod, 1.8, 1.8);
  // crina
  c.strokeStyle = h.mane; c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(12, -32); c.lineTo(22, -46 + nod); c.stroke();
  if (opts.saddle) {
    c.fillStyle = '#4a2a16'; rrect(c, -8, -35, 16, 8, 3);
    c.fillStyle = '#2a170b'; c.fillRect(-10, -29, 20, 3);
    c.fillStyle = '#6b4a2a'; c.fillRect(-12, -26, 6, 9); // alforje
    c.fillStyle = '#b8a67a'; rrect(c, -14, -36, 8, 4, 2); // saco de dormir
  }
  c.restore();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function drawDog(c, d) {
  c.save(); c.translate(d.x, d.y);
  c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, 0, 0, 10, 3);
  c.scale(d.dir, 1);
  const s = d.moving ? Math.sin(d.phase) * 3 : 0;
  c.strokeStyle = '#6a4a2a'; c.lineWidth = 2.2; c.lineCap = 'round';
  for (const [lx, sg] of [[-6, 1], [-3, -1], [4, -1], [7, 1]]) { c.beginPath(); c.moveTo(lx, -8); c.lineTo(lx + s * sg, -1); c.stroke(); }
  c.fillStyle = '#7a5530'; ellipse(c, 0, -10, 9, 4.5);
  c.fillStyle = '#f0e0c0'; ellipse(c, 3, -8, 4, 2);
  c.fillStyle = '#7a5530'; ellipse(c, 10, -14, 4.5, 3.8);
  c.fillStyle = '#4a3018'; ellipse(c, 8.5, -16, 1.8, 3);
  c.fillStyle = '#1a0f08'; c.fillRect(13.5, -14.5, 1.5, 1.5);
  c.strokeStyle = '#7a5530'; c.lineWidth = 2;
  const wag = Math.sin(performance.now() / (d.bond >= 3 ? 70 : 200)) * 3;
  c.beginPath(); c.moveTo(-8, -12); c.lineTo(-13, -17 + wag); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------------
// Desenho — cenário
// ---------------------------------------------------------------------
function drawBuilding(c, b, night) {
  const { x, y, w, h } = b;
  // sombra projetada
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(x + 10, y + 12, w, h);
  if (b.face === 'S') {
    const wallH = 74;
    const roofH = h - wallH;
    // telhado
    c.fillStyle = b.roof; c.fillRect(x, y, w, roofH);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1;
    for (let yy = y + 10; yy < y + roofH; yy += 10) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x, y, w, roofH / 2);
    // chaminé
    c.fillStyle = '#5a4030'; c.fillRect(x + w * 0.75, y + 20, 18, 26); c.fillStyle = '#2a1a10'; c.fillRect(x + w * 0.75, y + 18, 18, 5);
    if (b.id === 'church') {
      const cx = x + w / 2;
      c.fillStyle = '#e8e0cc'; c.fillRect(cx - 26, y - 40, 52, 70);
      c.fillStyle = b.roof; c.beginPath(); c.moveTo(cx - 32, y - 40); c.lineTo(cx, y - 90); c.lineTo(cx + 32, y - 40); c.fill();
      c.fillStyle = '#3a2a1a'; c.fillRect(cx - 2, y - 118, 4, 30); c.fillRect(cx - 10, y - 108, 20, 4);
      c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(cx, y - 10, 10, Math.PI, 0); c.fill(); c.fillRect(cx - 10, y - 10, 20, 14);
    }
    // fachada falsa (false front)
    const fy = y + roofH - 40;
    if (b.name && b.id !== 'church') {
      c.fillStyle = shade(b.wall, -10); c.fillRect(x - 4, fy, w + 8, 44);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x - 4, fy + 40, w + 8, 4);
    }
    // parede frontal
    c.fillStyle = b.wall; c.fillRect(x, y + roofH, w, wallH);
    c.strokeStyle = 'rgba(0,0,0,0.18)';
    for (let yy = y + roofH + 8; yy < y + h; yy += 8) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); }
    // placa
    if (b.name) {
      const sy = b.id === 'church' ? y + roofH + 4 : fy + 6;
      c.font = `${b.name.length > 7 ? 20 : 24}px Rye, Georgia, serif`;
      const tw = c.measureText(b.name).width;
      c.fillStyle = b.id === 'bank' ? '#1d2a1d' : '#2a1a10';
      c.fillRect(x + w / 2 - tw / 2 - 14, sy, tw + 28, 30);
      c.strokeStyle = b.trim; c.lineWidth = 2; c.strokeRect(x + w / 2 - tw / 2 - 11, sy + 3, tw + 22, 24);
      c.fillStyle = b.trim; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(b.name, x + w / 2, sy + 16);
    }
    // porta
    const dx = x + w / 2;
    c.fillStyle = '#23150c'; c.fillRect(dx - 17, y + h - 52, 34, 52);
    if (b.id === 'saloon') {
      c.fillStyle = '#8a6040';
      c.fillRect(dx - 16, y + h - 42, 15, 24); c.fillRect(dx + 1, y + h - 42, 15, 24);
    } else {
      c.fillStyle = shade(b.wall, -35); c.fillRect(dx - 14, y + h - 49, 28, 49);
      c.fillStyle = '#c9a54a'; c.fillRect(dx + 8, y + h - 26, 3, 3);
    }
    // janelas
    const winColor = night ? '#f5c46a' : '#3b4a52';
    for (const wx of [x + 24, x + w - 64]) {
      c.fillStyle = b.trim; c.fillRect(wx - 3, y + h - 58, 46, 38);
      c.fillStyle = winColor; c.fillRect(wx, y + h - 55, 40, 32);
      c.fillStyle = b.trim; c.fillRect(wx + 19, y + h - 55, 2, 32); c.fillRect(wx, y + h - 40, 40, 2);
      if (!night) { c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(wx + 2, y + h - 53, 8, 14); }
    }
    // toldo/varanda
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x - 10, y + h, w + 20, 16);
    c.fillStyle = '#3a2414';
    for (const px of [x - 6, x + w / 3, x + (2 * w) / 3, x + w + 2]) c.fillRect(px, y + h, 5, 38);
  } else {
    // prédio do lado sul: vemos o telhado de cima com a frente ao norte
    c.fillStyle = b.roof; c.fillRect(x, y, w, h);
    c.fillStyle = shade(b.roof, 14); c.fillRect(x, y, w, h / 2);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
    for (let xx = x + 12; xx < x + w; xx += 12) { c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + h); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y + h / 2 - 2, w, 4);
    if (b.id === 'stable') {
      c.fillStyle = '#d8c080'; c.fillRect(x + w - 60, y + h - 40, 40, 30); // fardos de feno
      c.fillStyle = '#b8a060'; c.fillRect(x + w - 60, y + h - 26, 40, 2);
    }
    c.fillStyle = '#5a4030'; c.fillRect(x + 30, y + h * 0.7, 16, 16);
    // parede frontal (ao norte) — faixa estreita
    c.fillStyle = b.wall; c.fillRect(x, y - 10, w, 14);
    c.fillStyle = '#23150c'; c.fillRect(x + w / 2 - 16, y - 10, 32, 14);
    // placa
    if (b.name) {
      c.font = '20px Rye, Georgia, serif';
      const tw = c.measureText(b.name).width;
      c.fillStyle = '#2a1a10'; c.fillRect(x + w / 2 - tw / 2 - 12, y + 12, tw + 24, 28);
      c.strokeStyle = b.trim; c.lineWidth = 2; c.strokeRect(x + w / 2 - tw / 2 - 9, y + 15, tw + 18, 22);
      c.fillStyle = b.trim; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(b.name, x + w / 2, y + 27);
      if (b.id === 'sheriff') {
        c.fillStyle = '#d9b35c'; star(c, x + 30, y + 26, 10, 4.5);
      }
    }
    if (night) {
      c.fillStyle = 'rgba(245,196,106,0.9)';
      c.fillRect(x + 20, y - 8, 22, 10); c.fillRect(x + w - 42, y - 8, 22, 10);
    } else {
      c.fillStyle = '#3b4a52'; c.fillRect(x + 20, y - 8, 22, 10); c.fillRect(x + w - 42, y - 8, 22, 10);
    }
  }
}
function star(c, x, y, r1, r2) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath(); c.fill();
}

function drawProp(c, p) {
  const { x, y } = p;
  switch (p.type) {
    case 'barrel':
      c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, x + 2, y, 10, 4);
      c.fillStyle = '#7a4e2a'; rrect(c, x - 9, y - 24, 18, 24, 4);
      c.fillStyle = '#3a2a1a'; c.fillRect(x - 9, y - 19, 18, 2); c.fillRect(x - 9, y - 7, 18, 2);
      c.fillStyle = '#5a381e'; ellipse(c, x, y - 24, 9, 3.5);
      break;
    case 'crate':
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x - 9, y - 3, 22, 5);
      c.fillStyle = '#9a7244'; c.fillRect(x - 11, y - 20, 22, 20);
      c.strokeStyle = '#5a3a1e'; c.lineWidth = 2; c.strokeRect(x - 10, y - 19, 20, 18);
      c.beginPath(); c.moveTo(x - 10, y - 19); c.lineTo(x + 10, y - 1); c.stroke();
      break;
    case 'trough':
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x - 28, y - 2, 60, 5);
      c.fillStyle = '#5a3a20'; c.fillRect(x - 30, y - 16, 60, 16);
      c.fillStyle = '#4a6a78'; c.fillRect(x - 26, y - 14, 52, 7);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x - 20 + Math.sin(performance.now() / 700) * 4, y - 13, 10, 2);
      break;
    case 'post':
      c.fillStyle = '#4a2e18'; c.fillRect(x - 22, y - 16, 4, 16); c.fillRect(x + 18, y - 16, 4, 16);
      c.fillStyle = '#5a3a20'; c.fillRect(x - 24, y - 18, 48, 4);
      break;
    case 'lamp':
      c.fillStyle = '#2a2a2a'; c.fillRect(x - 1.5, y - 44, 3, 44);
      c.fillStyle = isNight() ? '#ffd27a' : '#6a6a5a'; rrect(c, x - 5, y - 54, 10, 11, 2);
      c.fillStyle = '#1a1a1a'; c.fillRect(x - 6, y - 56, 12, 3);
      break;
    case 'bench':
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x - 24, y - 2, 50, 4);
      c.fillStyle = '#6a4424'; c.fillRect(x - 25, y - 12, 50, 5);
      c.fillStyle = '#4a2e18'; c.fillRect(x - 22, y - 7, 3, 7); c.fillRect(x + 19, y - 7, 3, 7);
      c.fillStyle = '#5a3a1e'; c.fillRect(x - 25, y - 22, 50, 4);
      break;
    case 'wagon':
      c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, x, y, 60, 8);
      c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(x - 50, y - 26); c.quadraticCurveTo(x - 45, y - 70, x, y - 72); c.quadraticCurveTo(x + 45, y - 70, x + 50, y - 26); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.15)'; for (let i = -30; i <= 30; i += 20) { c.beginPath(); c.moveTo(x + i, y - 26); c.quadraticCurveTo(x + i, y - 60, x + i * 0.5, y - 71); c.stroke(); }
      c.fillStyle = '#6a4424'; c.fillRect(x - 55, y - 30, 110, 12);
      c.strokeStyle = '#3a2414'; c.lineWidth = 3;
      for (const wx of [x - 36, x + 36]) { c.beginPath(); c.arc(wx, y - 12, 12, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(wx - 12, y - 12); c.lineTo(wx + 12, y - 12); c.moveTo(wx, y - 24); c.lineTo(wx, y); c.stroke(); }
      c.lineWidth = 1;
      break;
    case 'well':
      c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, x + 3, y, 24, 7);
      c.fillStyle = '#8a8070'; ellipse(c, x, y - 12, 22, 12);
      c.fillStyle = '#1a2a30'; ellipse(c, x, y - 14, 15, 7);
      c.fillStyle = '#4a2e18'; c.fillRect(x - 20, y - 50, 4, 40); c.fillRect(x + 16, y - 50, 4, 40);
      c.fillStyle = '#6a3a24'; c.beginPath(); c.moveTo(x - 28, y - 46); c.lineTo(x, y - 64); c.lineTo(x + 28, y - 46); c.fill();
      break;
    case 'cactus': {
      const s = p.s || 1;
      c.fillStyle = 'rgba(0,0,0,0.22)'; ellipse(c, x + 6, y, 12 * s, 3.5);
      c.fillStyle = '#4f6b35';
      rrect(c, x - 5 * s, y - 44 * s, 10 * s, 44 * s, 5 * s);
      rrect(c, x - 16 * s, y - 30 * s, 6 * s, 16 * s, 3 * s); rrect(c, x - 16 * s, y - 18 * s, 12 * s, 5 * s, 2.5 * s);
      if (p.v > 0.4) { rrect(c, x + 10 * s, y - 36 * s, 6 * s, 18 * s, 3 * s); rrect(c, x + 4 * s, y - 22 * s, 12 * s, 5 * s, 2.5 * s); }
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x - 2 * s, y - 42 * s, 2 * s, 38 * s);
      if (p.v > 0.8) { c.fillStyle = '#e06a8a'; ellipse(c, x, y - 45 * s, 3, 2.5); }
      break;
    }
    case 'rock': {
      const s = p.s || 1;
      c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, x + 4, y, 18 * s, 5);
      c.fillStyle = '#8a7a6a'; c.beginPath(); c.moveTo(x - 16 * s, y); c.lineTo(x - 12 * s, y - 14 * s); c.lineTo(x - 2 * s, y - 20 * s); c.lineTo(x + 12 * s, y - 14 * s); c.lineTo(x + 16 * s, y); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(x - 12 * s, y - 14 * s); c.lineTo(x - 2 * s, y - 20 * s); c.lineTo(x + 2 * s, y - 10 * s); c.fill();
      break;
    }
    case 'tree': {
      const s = p.s || 1;
      c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, x + 14, y, 26 * s, 7);
      c.strokeStyle = '#4a3322'; c.lineCap = 'round'; c.lineWidth = 6 * s;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 40 * s); c.stroke();
      c.lineWidth = 3 * s;
      c.beginPath(); c.moveTo(x, y - 30 * s); c.lineTo(x - 16 * s, y - 50 * s); c.moveTo(x, y - 38 * s); c.lineTo(x + 18 * s, y - 58 * s); c.moveTo(x, y - 40 * s); c.lineTo(x - 4 * s, y - 64 * s); c.stroke();
      if (p.v > 0.35) {
        c.fillStyle = 'rgba(90,100,50,0.9)';
        ellipse(c, x - 14 * s, y - 56 * s, 16 * s, 11 * s); ellipse(c, x + 14 * s, y - 62 * s, 18 * s, 12 * s); ellipse(c, x, y - 70 * s, 18 * s, 13 * s);
        c.fillStyle = 'rgba(130,140,70,0.6)'; ellipse(c, x + 4 * s, y - 74 * s, 12 * s, 7 * s);
      }
      break;
    }
    case 'bush': {
      const s = p.s || 1;
      c.fillStyle = p.v > 0.5 ? '#7a7a42' : '#8a7f4a';
      ellipse(c, x - 6 * s, y - 5 * s, 8 * s, 6 * s); ellipse(c, x + 5 * s, y - 6 * s, 9 * s, 7 * s); ellipse(c, x, y - 9 * s, 7 * s, 6 * s);
      break;
    }
    case 'fence':
      c.fillStyle = '#5a3a20';
      if (p.w > p.h) {
        c.fillRect(p.x, p.y - 14, p.w, 3); c.fillRect(p.x, p.y - 6, p.w, 3);
        for (let xx = p.x; xx <= p.x + p.w; xx += 40) c.fillRect(xx, p.y - 18, 4, 20);
      } else {
        c.fillRect(p.x, p.y, 3, p.h); c.fillRect(p.x + 4, p.y, 2, p.h);
        for (let yy = p.y; yy <= p.y + p.h; yy += 40) c.fillRect(p.x - 1, yy - 14, 5, 16);
      }
      break;
    case 'campfire': {
      c.fillStyle = '#5a5048';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ellipse(c, x + Math.cos(a) * 13, y - 6 + Math.sin(a) * 6, 4, 3); }
      c.strokeStyle = '#3a2414'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 8, y - 4); c.lineTo(x + 8, y - 9); c.moveTo(x + 8, y - 4); c.lineTo(x - 8, y - 9); c.stroke();
      const t = performance.now() / 120;
      c.fillStyle = '#e8661a'; c.beginPath(); c.moveTo(x - 7, y - 6); c.quadraticCurveTo(x - 4 + Math.sin(t) * 2, y - 24, x, y - 28 + Math.sin(t * 1.3) * 3); c.quadraticCurveTo(x + 4, y - 20, x + 7, y - 6); c.fill();
      c.fillStyle = '#ffd05a'; c.beginPath(); c.moveTo(x - 4, y - 6); c.quadraticCurveTo(x, y - 18 + Math.sin(t * 1.7) * 2, x + 4, y - 6); c.fill();
      break;
    }
    case 'tent':
      c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, x + 6, y, 44, 8);
      c.fillStyle = '#cdbf9a'; c.beginPath(); c.moveTo(x - 40, y); c.lineTo(x, y - 50); c.lineTo(x + 40, y); c.fill();
      c.fillStyle = '#3a2a1a'; c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x, y - 30); c.lineTo(x + 10, y); c.fill();
      break;
    case 'windmill': {
      c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, x + 16, y, 26, 6);
      c.strokeStyle = '#5a4a3a'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x - 2, y - 90); c.moveTo(x + 12, y); c.lineTo(x + 2, y - 90);
      c.moveTo(x - 9, y - 25); c.lineTo(x + 9, y - 25); c.moveTo(x - 6, y - 55); c.lineTo(x + 6, y - 55); c.stroke();
      const rot = performance.now() / 600;
      c.save(); c.translate(x, y - 94); c.rotate(rot);
      c.fillStyle = '#d8d0c0';
      for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillRect(2, -2, 22, 4); }
      c.restore();
      c.fillStyle = '#3a3a3a'; ellipse(c, x, y - 94, 4, 4);
      c.fillStyle = '#8a3a2a'; c.beginPath(); c.moveTo(x - 4, y - 94); c.lineTo(x - 26, y - 100); c.lineTo(x - 26, y - 88); c.fill();
      break;
    }
    case 'grave':
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x - 6, y - 1, 16, 4);
      c.fillStyle = '#8a8478'; rrect(c, x - 7, y - 20, 14, 20, 5);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x - 1, y - 16, 2, 8); c.fillRect(x - 4, y - 13, 8, 2);
      break;
  }
}

function drawHerb(c, h) {
  if (!h.alive) return;
  const pulse = 0.5 + Math.sin(performance.now() / 300 + h.x) * 0.5;
  c.fillStyle = '#5a6a2a';
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ellipse(c, h.x + Math.cos(a) * 4, h.y - 4 + Math.sin(a) * 2, 3.5, 2); }
  c.fillStyle = h.kind.color; ellipse(c, h.x, h.y - 7, 3, 3);
  c.fillStyle = `rgba(255,250,220,${0.25 + pulse * 0.35})`; ellipse(c, h.x, h.y - 7, 1.2, 1.2);
}

function drawBottle(c, b) {
  if (!b.alive) return;
  c.fillStyle = b.color; rrect(c, b.x - 3, b.y - 16, 6, 12, 2);
  c.fillRect(b.x - 1.2, b.y - 21, 2.4, 6);
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(b.x - 2, b.y - 14, 1.2, 7);
}

function drawTumbleweed(c, t) {
  c.save(); c.translate(t.x, t.y - t.r - Math.abs(Math.sin(t.hop)) * 6);
  c.rotate(t.rot);
  c.strokeStyle = 'rgba(120,90,50,0.9)'; c.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(0, 0, t.r * (0.5 + (i % 3) * 0.25), i, i + 4); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgba(0,0,0,0.15)'; ellipse(c, t.x, t.y, t.r, 3);
}

// ---------------------------------------------------------------------
// Iluminação / ciclo de dia
// ---------------------------------------------------------------------
function darkness() {
  return Math.min(0.8, baseDarkness() + G.wx.cloud * 0.08 + G.wx.rain * 0.08);
}
function baseDarkness() {
  const t = G.time;
  // 0 = dia, ~0.75 = noite
  if (t >= 7 && t <= 18) return 0;
  if (t > 18 && t < 21) return ((t - 18) / 3) * 0.72;
  if (t >= 21 || t < 5) return 0.72;
  return (1 - (t - 5) / 2) * 0.72;
}
function isNight() { return darkness() > 0.3; }
function skyTint() {
  const t = G.time;
  if (t > 17 && t < 20) return `rgba(255,120,40,${Math.sin(((t - 17) / 3) * Math.PI) * 0.18})`;
  if (t > 5 && t < 8) return `rgba(255,170,90,${Math.sin(((t - 5) / 3) * Math.PI) * 0.14})`;
  return null;
}

function drawLighting(dk) {
  if (dk <= 0.01) return;
  const s = 0.5 * ZOOM;
  const w = lightCanvas.width, h = lightCanvas.height;
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, w, h);
  lctx.fillStyle = `rgba(8,12,35,${dk})`;
  lctx.fillRect(0, 0, w, h);
  lctx.globalCompositeOperation = 'destination-out';
  const ox = cam.x - VW / 2 / ZOOM, oy = cam.y - VH / 2 / ZOOM;
  const light = (x, y, r, a) => {
    const sx = (x - ox) * s, sy = (y - oy) * s, sr = r * s;
    if (sx < -sr || sy < -sr || sx > w + sr || sy > h + sr) return;
    const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.arc(sx, sy, sr, 0, Math.PI * 2); lctx.fill();
  };
  const flick = 1 + Math.sin(performance.now() / 90) * 0.04;
  for (const p of props) {
    if (p.type === 'lamp') light(p.x, p.y - 40, 110 * flick, 0.9);
    if (p.type === 'campfire') light(p.x, p.y - 10, 170 * flick, 1);
  }
  for (const b of BUILDINGS) {
    if (b.face === 'S') { light(b.x + 44, b.y + b.h + 10, 70, 0.7); light(b.x + b.w - 44, b.y + b.h + 10, 70, 0.7); }
    else { light(b.x + 31, b.y - 10, 55, 0.6); light(b.x + b.w - 31, b.y - 10, 55, 0.6); }
  }
  light(player.x, player.y - 20, 70, 0.35); // lanterna / luz ambiente
  lctx.globalCompositeOperation = 'source-over';
  // brilho quente
  ctx.drawImage(lightCanvas, 0, 0, VW, VH);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of props) {
    if (p.type !== 'lamp' && p.type !== 'campfire') continue;
    const sx = (p.x - ox) * ZOOM, sy = (p.y - (p.type === 'lamp' ? 48 : 12) - oy) * ZOOM;
    if (sx < -100 || sy < -100 || sx > VW + 100 || sy > VH + 100) continue;
    const r = (p.type === 'lamp' ? 55 : 110) * ZOOM * flick;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, `rgba(255,170,70,${0.35 * dk})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#1a120b'; ctx.fillRect(0, 0, VW, VH);

  ctx.save();
  ctx.translate(VW / 2, VH / 2);
  if (G.drunk > 20) {
    const k = (G.drunk - 20) / 80;
    ctx.rotate(Math.sin(performance.now() / 900) * 0.04 * k);
    ctx.scale(1 + Math.sin(performance.now() / 700) * 0.02 * k, 1);
  }
  ctx.scale(ZOOM, ZOOM);
  const shx = G.shake ? (Math.random() - 0.5) * G.shake : 0, shy = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  ctx.translate(-cam.x + shx, -cam.y + shy);

  const vx0 = cam.x - VW / 2 / ZOOM - 40, vy0 = cam.y - VH / 2 / ZOOM - 40;
  const vx1 = cam.x + VW / 2 / ZOOM + 40, vy1 = cam.y + VH / 2 / ZOOM + 120;
  const visible = (x, y, pad) => x > vx0 - (pad || 0) && x < vx1 + (pad || 0) && y > vy0 - (pad || 0) && y < vy1 + (pad || 0);

  // chão
  const sx = clamp(vx0, 0, WORLD_W), sy = clamp(vy0, 0, WORLD_H);
  const sw = clamp(vx1, 0, WORLD_W) - sx, sh = clamp(vy1, 0, WORLD_H) - sy;
  if (sw > 0 && sh > 0) ctx.drawImage(ground, sx * GROUND_SCALE, sy * GROUND_SCALE, sw * GROUND_SCALE, sh * GROUND_SCALE, sx, sy, sw, sh);

  // poças de sangue / decalques
  for (const p of particles) if (p.pool && visible(p.x, p.y)) {
    ctx.fillStyle = p.color; ellipse(ctx, p.x, p.y, Math.min(p.size, 4 + (p.max - p.life) * 4), Math.min(p.size, 4 + (p.max - p.life) * 4) * 0.45);
  }
  for (const h of herbs) if (visible(h.x, h.y)) drawHerb(ctx, h);

  // objetos ordenados por y
  const night = isNight();
  const draw = [];
  for (const b of BUILDINGS) if (visible(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) draw.push({ y: b.y + b.h, f: () => drawBuilding(ctx, b, night) });
  for (const p of props) if (visible(p.x, p.y, p.w || 200)) draw.push({ y: p.type === 'fence' ? p.y + p.h : p.y, f: () => drawProp(ctx, p) });
  for (const b of bottles) if (visible(b.x, b.y)) draw.push({ y: b.y + 1, f: () => drawBottle(ctx, b) });
  for (const n of npcs) if (visible(n.x, n.y)) draw.push({ y: n.alive ? n.y : n.y - 30, f: () => drawPerson(ctx, n, n.hurt ? { sitting: true } : undefined) });
  for (const o of outlaws) if (visible(o.x, o.y)) draw.push({ y: o.alive ? o.y : o.y - 30, f: () => drawPerson(ctx, o, { aiming: o.shotT > 0 && o.alive, aimAngle: o.aim }) });
  for (const h of corralHorses) if (visible(h.x, h.y)) draw.push({ y: h.y, f: () => drawHorse(ctx, h) });
  for (const t of tumbleweeds) if (visible(t.x, t.y)) draw.push({ y: t.y, f: () => drawTumbleweed(ctx, t) });
  if (dog && visible(dog.x, dog.y)) draw.push({ y: dog.y, f: () => drawDog(ctx, dog) });
  for (const a of animals) if (visible(a.x, a.y)) draw.push({ y: a.y, f: () => drawAnimal(ctx, a) });
  if (G.event && G.event.thief && visible(G.event.thief.x, G.event.thief.y)) { const t = G.event.thief; draw.push({ y: t.alive ? t.y : t.y - 30, f: () => drawPerson(ctx, t) }); }
  if (train.active) draw.push({ y: TRACK_Y + 4, f: () => drawTrain(ctx) });
  // aro discreto sob o jogador para diferenciá-lo dos moradores
  draw.push({ y: -1e9, f: () => {
    ctx.strokeStyle = 'rgba(255,240,200,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(player.x, player.y, player.mounted ? 30 : 13, player.mounted ? 8 : 5, 0, 0, Math.PI * 2); ctx.stroke();
  } });
  const popts = { aiming: player.aiming, aimAngle: player.aim, beard: G.beard, dirt: G.dirt, tipHat: player.tipHat };
  if (player.mounted) {
    draw.push({ y: horse.y, f: () => {
      drawHorse(ctx, horse, { saddle: true, fast: horse.speed > 200 });
      drawPerson(ctx, player, Object.assign({ riding: true, oy: -30 }, popts));
    } });
  } else {
    draw.push({ y: horse.y, f: () => drawHorse(ctx, horse, { saddle: true, fast: horse.state === 'coming' && dist(horse.x, horse.y, player.x, player.y) > 300 }) });
    draw.push({ y: G.sitting && G.sitting.bench ? G.sitting.y + 4 : player.y, f: () => drawPerson(ctx, player, Object.assign({ sitting: !!G.sitting, oy: G.sitting && G.sitting.bench ? -6 : 0 }, popts)) });
  }
  draw.sort((a, b) => a.y - b.y);
  for (const d of draw) d.f();

  // balas
  for (const b of bullets) {
    ctx.strokeStyle = b.from === 'player' ? 'rgba(255,240,190,0.9)' : 'rgba(255,200,140,0.9)';
    ctx.lineWidth = 1.6;
    const l = 0.012;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // partículas
  for (const p of particles) {
    if (p.pool || !visible(p.x, p.y)) continue;
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.smoke ? a : Math.min(1, a * 1.5);
    ctx.fillStyle = p.color;
    if (p.flash) { ellipse(ctx, p.x, p.y, p.size, p.size); }
    else if (p.smoke) { ellipse(ctx, p.x, p.y, p.size, p.size); }
    else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // marcador de caçada no mundo
  if (G.bounty && G.bounty.stage === 'hunt') {
    for (const o of outlaws) if (o.alive && o.leader && dist(o.x, o.y, player.x, player.y) < 600) {
      ctx.fillStyle = '#c21d1d';
      ctx.beginPath(); ctx.moveTo(o.x, o.y - 52); ctx.lineTo(o.x - 5, o.y - 60); ctx.lineTo(o.x + 5, o.y - 60); ctx.fill();
    }
  }

  // marcadores de evento
  if (G.event) {
    const ev = G.event;
    const tgt = ev.type === 'thief' ? (ev.stage === 'chase' ? ev.thief : ev.victim) : ev.victim;
    if (tgt && (tgt.alive || ev.stage === 'chase')) {
      const bob = Math.sin(performance.now() / 200) * 2;
      ctx.fillStyle = '#e8c040'; ctx.font = 'bold 18px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', tgt.x, tgt.y - 60 + bob);
    }
  }
  if (G.job && visible(G.job.x, G.job.y)) {
    ctx.strokeStyle = 'rgba(232,192,64,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(G.job.x, G.job.y, 18 + Math.sin(performance.now() / 250) * 3, 7, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // balões de fala
  ctx.font = `${TOUCH.on ? 15 : 13}px "Crimson Text", Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of bubbles) {
    const e = b.ent;
    const top = e === player && player.mounted ? e.y - 92 : e.y - 58;
    if (!visible(e.x, top)) continue;
    const tw = ctx.measureText(b.text).width + 14;
    ctx.globalAlpha = clamp(b.t * 3, 0, 1);
    ctx.fillStyle = 'rgba(20,12,6,0.82)';
    rrect(ctx, e.x - tw / 2, top - 10, tw, 20, 4);
    ctx.beginPath(); ctx.moveTo(e.x - 4, top + 10); ctx.lineTo(e.x + 4, top + 10); ctx.lineTo(e.x, top + 15); ctx.fill();
    ctx.fillStyle = '#f1e6cf'; ctx.fillText(b.text, e.x, top + 1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // iluminação
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const tint = skyTint();
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, VW, VH); }
  drawLighting(darkness());
  drawWeather();

  // filtro de cor quente (tom RDR)
  ctx.fillStyle = 'rgba(255,190,120,0.06)'; ctx.fillRect(0, 0, VW, VH);

  // Olho Morto
  const de = clamp((1 - G.timeScale) / 0.7, 0, 1);
  if (de > 0.02) {
    ctx.fillStyle = `rgba(170,90,20,${0.28 * de})`; ctx.fillRect(0, 0, VW, VH);
    const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.25, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(40,10,0,${0.75 * de})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  // vinheta
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.45, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  // dano
  if (G.health < 45) {
    const a = (1 - G.health / 45) * (0.5 + Math.sin(performance.now() / 250) * 0.15);
    const rg = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.3, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, `rgba(140,0,0,${a})`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, VW, VH);
  }

  if (G.started) {
    drawMinimap();
    drawCrosshair();
  }
}

function drawCrosshair() {
  if (G.menu) return;
  if (TOUCH.on) {
    const t = G.autoTarget;
    if (!t) return;
    const x = (t.x - cam.x) * ZOOM + VW / 2, y = (t.y - cam.y) * ZOOM + VH / 2;
    const r = 11 + Math.sin(performance.now() / 150) * 2;
    ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r - 5, y); ctx.lineTo(x - r + 4, y); ctx.moveTo(x + r - 4, y); ctx.lineTo(x + r + 5, y); ctx.stroke();
    return;
  }
  const x = mouse.x, y = mouse.y;
  ctx.strokeStyle = player.aiming ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  const g = player.aiming ? 4 : 6;
  ctx.beginPath();
  ctx.moveTo(x - g - 6, y); ctx.lineTo(x - g, y); ctx.moveTo(x + g, y); ctx.lineTo(x + g + 6, y);
  ctx.moveTo(x, y - g - 6); ctx.lineTo(x, y - g); ctx.moveTo(x, y + g); ctx.lineTo(x, y + g + 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawCore(x, y, r, outer, inner, color, icon) {
  ctx.fillStyle = 'rgba(10,6,3,0.75)'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(outer / 100, 0, 1)); ctx.stroke();
  // núcleo (preenchimento de baixo para cima)
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 3.5, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const hgt = (r * 2 - 7) * clamp(inner / 100, 0, 1);
  ctx.fillStyle = inner < 20 ? 'rgba(200,40,30,0.6)' : 'rgba(230,220,200,0.35)';
  ctx.fillRect(x - r, y + r - 3.5 - hgt, r * 2, hgt);
  ctx.restore();
  ctx.fillStyle = '#f1e6cf'; ctx.font = `${Math.round(r * 0.9)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y + 1);
}

function drawMinimap() {
  const R0 = MM_R;
  // no celular o minimapa vai para o canto superior esquerdo (o joystick fica embaixo)
  const cx = (TOUCH.on ? 12 : 24) + R0, cy = TOUCH.on ? 12 + R0 : VH - 24 - R0;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = 'rgba(10,6,3,0.8)'; ctx.fill();
  ctx.clip();
  const zoom = 1.6;
  ctx.translate(cx, cy); ctx.scale(zoom, zoom);
  ctx.drawImage(miniMap, -player.x * MINI_SCALE, -player.y * MINI_SCALE);
  const mp = (x, y) => [(x - player.x) * MINI_SCALE, (y - player.y) * MINI_SCALE];
  // ícones
  const icons = { saloon: '🍺', hotel: '🛏', store: '🛒', bank: '$', barber: '✂', church: '✝', sheriff: '★', stable: '🐴', post: '✉', farm: '⌂' };
  ctx.font = '7px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of BUILDINGS) {
    if (!icons[b.id]) continue;
    const [x, y] = mp(b.doorX, b.doorY);
    ctx.fillStyle = 'rgba(241,230,207,0.95)'; ctx.fillText(icons[b.id], x, y);
  }
  // cavalo
  if (!player.mounted) { const [hx, hy] = mp(horse.x, horse.y); ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2); ctx.fill(); }
  // alvo
  if (G.bounty && G.bounty.stage === 'hunt') {
    let [bx, by] = mp(G.bounty.x, G.bounty.y);
    const d = Math.hypot(bx, by), maxd = R0 / zoom - 6;
    if (d > maxd) { bx *= maxd / d; by *= maxd / d; }
    ctx.strokeStyle = '#c21d1d'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(194,29,29,0.35)'; ctx.fill();
  }
  if (G.bounty && G.bounty.stage === 'return') {
    const sh = BUILDINGS.find((b) => b.id === 'sheriff');
    let [bx, by] = mp(sh.doorX, sh.doorY);
    const d = Math.hypot(bx, by), maxd = R0 / zoom - 6;
    if (d > maxd) { bx *= maxd / d; by *= maxd / d; }
    ctx.fillStyle = '#d9b35c'; star(ctx, bx, by, 5, 2.2);
  }
  const edgeMark = (x, y) => {
    let [bx, by] = mp(x, y);
    const d = Math.hypot(bx, by), maxd = R0 / zoom - 6;
    if (d > maxd) { bx *= maxd / d; by *= maxd / d; }
    return [bx, by];
  };
  if (G.job) { const [jx, jy] = edgeMark(G.job.x, G.job.y); ctx.fillStyle = '#e8c040'; ctx.fillRect(jx - 3, jy - 3, 6, 6); ctx.strokeStyle = '#3a2616'; ctx.lineWidth = 1; ctx.strokeRect(jx - 3, jy - 3, 6, 6); }
  if (G.event) {
    const ev = G.event, t = ev.type === 'thief' && ev.stage === 'chase' ? ev.thief : ev.victim;
    if (t) { const [ex, ey] = edgeMark(t.x, t.y); ctx.fillStyle = '#e8c040'; ctx.font = 'bold 9px Georgia'; ctx.fillText('!', ex, ey); }
  }
  if (train.active) { const [tx, ty] = mp(train.x, TRACK_Y); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(tx - 4, ty - 2, 8, 4); }
  for (const o of outlaws) if (o.alive && o.alert) { const [ox, oy] = mp(o.x, o.y); ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.arc(ox, oy, 1.8, 0, Math.PI * 2); ctx.fill(); }
  // jogador (seta)
  const a = player.vx || player.vy ? Math.atan2(player.vy, player.vx) : (player.dir > 0 ? 0 : Math.PI);
  G.lastArrow = player.vx || player.vy ? a : (G.lastArrow !== undefined ? G.lastArrow : a);
  ctx.rotate(G.lastArrow);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3.5, -3.5); ctx.lineTo(-1.5, 0); ctx.lineTo(-3.5, 3.5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(241,230,207,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.stroke();
  // N
  ctx.fillStyle = '#f1e6cf'; ctx.font = 'bold 12px Georgia'; ctx.textAlign = 'center'; ctx.fillText('N', cx, cy - R0 + 10);

  // núcleos
  const cr = TOUCH.on ? 12 : 15, gap = TOUCH.on ? 32 : 42;
  const gy = TOUCH.on ? cy + R0 + 22 : cy - R0 - 26;
  drawCore(cx - gap, gy, cr, G.health, G.healthCore, '#e8e0c8', '♥');
  drawCore(cx, gy, cr, G.stamina, G.staminaCore, '#e8e0c8', '⚡');
  drawCore(cx + gap, gy, cr, G.deadEye, G.deadEyeCore, G.deadEyeOn ? '#e8a040' : '#e8e0c8', '◎');
  if (player.mounted || dist(horse.x, horse.y, player.x, player.y) < 200) {
    const hr = TOUCH.on ? 11 : 13, hx = cx + R0 + (TOUCH.on ? 22 : 34);
    drawCore(hx, cy - hr - 4, hr, horse.health, 100, '#c9a86a', '♞');
    drawCore(hx, cy + hr + 4, hr, horse.stamina, 100, '#c9a86a', '⚡');
  }
}

// ---------------------------------------------------------------------
// Vida selvagem (caça)
// ---------------------------------------------------------------------
const ANIMAL = {
  rabbit: { name: 'coelho', hp: 1, speed: 160, flee: 150, pelt: 'Pele de coelho', price: 0.75, meat: 1, r: 5, hw: 8, hh: 12 },
  deer: { name: 'cervo', hp: 2, speed: 175, flee: 230, pelt: 'Pele de cervo', price: 2.5, meat: 2, r: 10, hw: 14, hh: 38 },
  coyote: { name: 'coiote', hp: 2, speed: 150, flee: 0, pelt: 'Pele de coiote', price: 1.5, meat: 0, r: 7, hw: 11, hh: 20 },
};
const animals = [];
function wildPoint(minFromPlayer) {
  for (let k = 0; k < 60; k++) {
    const x = 80 + Math.random() * (WORLD_W - 160), y = 100 + Math.random() * (WORLD_H - 250);
    if (onRoadOrTown(x, y, 60) || collides(x, y, 12)) continue;
    if (minFromPlayer && dist(x, y, player.x, player.y) < minFromPlayer) continue;
    return { x, y };
  }
  return { x: 200, y: 300 };
}
function spawnAnimal(type, far) {
  const p = wildPoint(far ? 900 : 0);
  const sp = ANIMAL[type];
  return { type, x: p.x, y: p.y, dir: Math.random() < 0.5 ? -1 : 1, phase: 0, moving: false, alive: true, hp: sp.hp,
    tx: p.x, ty: p.y, wait: Math.random() * 3, stuck: 0, flee: 0, deadT: 0, skinned: false, biteT: 0,
    buck: type === 'deer' && Math.random() < 0.45, hunting: false };
}
for (let i = 0; i < 16; i++) animals.push(spawnAnimal('rabbit'));
for (let i = 0; i < 9; i++) animals.push(spawnAnimal('deer'));
for (let i = 0; i < 4; i++) animals.push(spawnAnimal('coyote'));

function updateAnimals(dt) {
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i], sp = ANIMAL[a.type];
    const d = dist(a.x, a.y, player.x, player.y);
    if (!a.alive) {
      a.deadT += dt;
      if ((a.skinned || a.deadT > 120) && d > 900) animals[i] = spawnAnimal(a.type, true);
      continue;
    }
    if (d > 1700) { a.moving = false; continue; } // longe demais: congela
    a.biteT = Math.max(0, a.biteT - dt);
    if (a.type === 'coyote') {
      const hungry = isNight() || d < 240;
      if (hungry && d < 430 && !G.sitting) {
        if (!a.hunting) { a.hunting = true; sfx('growl', clamp(1 - d / 500, 0.2, 1)); }
        steer(a, player.x - a.dir * 4, player.y, player.mounted ? sp.speed * 0.9 : sp.speed, dt, sp.r);
        a.phase += dt * 16;
        if (d < (player.mounted ? 34 : 22) && a.biteT <= 0) {
          a.biteT = 1.3;
          if (player.mounted) { horse.health = clamp(horse.health - 10, 0, 100); G.shake = 5; sfx('neigh', 0.6); }
          else hitPlayer(0.6);
        }
        continue;
      }
      a.hunting = false;
    } else {
      const scare = sp.flee * (player.running || player.mounted ? 1.5 : 1);
      if (d < scare) a.flee = Math.max(a.flee, 2.5);
      if (a.flee > 0) {
        a.flee -= dt;
        const ang = Math.atan2(a.y - player.y, a.x - player.x) + Math.sin(performance.now() / 300 + i) * 0.4;
        steer(a, a.x + Math.cos(ang) * 50, a.y + Math.sin(ang) * 50, sp.speed, dt, sp.r);
        a.phase += dt * (a.type === 'rabbit' ? 14 : 12);
        continue;
      }
    }
    // pastando / vagando
    if (a.wait > 0) { a.wait -= dt; a.moving = false; continue; }
    const arrived = steer(a, a.tx, a.ty, sp.speed * 0.25, dt, sp.r);
    a.phase += dt * 5;
    if (arrived || a.stuck > 1.5) {
      a.tx = clamp(a.x + R(-160, 160), 60, WORLD_W - 60); a.ty = clamp(a.y + R(-120, 120), 80, WORLD_H - 140);
      if (onRoadOrTown(a.tx, a.ty, 20)) { a.tx = a.x; a.ty = a.y; }
      a.wait = Math.random() * 5; a.stuck = 0;
    }
  }
}
function hitAnimal(a, dmg) {
  a.hp -= dmg;
  for (let k = 0; k < 6; k++) particles.push({ x: a.x, y: a.y - ANIMAL[a.type].hh / 2, vx: R(-50, 50), vy: R(-60, 10), life: 0.5, max: 0.5, color: '#8a0f0f', size: 2, g: 300 });
  if (a.hp > 0) { a.flee = 4; return; }
  a.alive = false; a.moving = false; a.deadT = 0;
  particles.push({ x: a.x, y: a.y + 2, vx: 0, vy: 0, life: 40, max: 40, color: 'rgba(110,10,10,0.5)', size: ANIMAL[a.type].r + 4, pool: true });
  G.deadEye = clamp(G.deadEye + 5, 0, 100);
  G.hunts++;
  if (G.hunts === 1) toast('Primeira caça', TOUCH.on ? 'Chegue perto do animal e toque em "Esfolar".' : 'Chegue perto do animal e use [E] para esfolar.', 'gold');
}
function skinAnimal(a) {
  const sp = ANIMAL[a.type];
  a.skinned = true;
  G.pelts[sp.pelt] = (G.pelts[sp.pelt] || 0) + 1;
  G.meat += sp.meat;
  G.dirt = clamp(G.dirt + 0.08, 0, 1);
  sfx('pickup');
  toast('Esfolado', `${sp.pelt}${sp.meat ? ` e ${sp.meat} carne` : ''}. Venda peles no Armazém.`);
}
function peltCount() { return Object.values(G.pelts).reduce((a, b) => a + b, 0); }
function peltValue() {
  let v = 0;
  for (const k in G.pelts) for (const t in ANIMAL) if (ANIMAL[t].pelt === k) v += ANIMAL[t].price * G.pelts[k];
  return v;
}

function drawAnimal(c, a) {
  const moving = a.moving && a.alive;
  c.save();
  c.translate(a.x, a.y);
  c.fillStyle = 'rgba(0,0,0,0.22)'; ellipse(c, 0, 0, ANIMAL[a.type].r + 4, 3);
  if (!a.alive) {
    c.translate(0, -ANIMAL[a.type].hh * 0.35); c.scale(1, -1); c.translate(0, -ANIMAL[a.type].hh * 0.35);
    if (a.skinned) c.filter = 'saturate(0.3) brightness(0.7)';
  }
  c.scale(a.dir || 1, 1);
  if (a.type === 'rabbit') {
    const hop = moving ? Math.abs(Math.sin(a.phase)) * 4 : 0;
    c.translate(0, -hop);
    c.fillStyle = '#8a7560'; ellipse(c, 0, -5, 6, 4.2);
    c.fillStyle = '#9a8570'; ellipse(c, 5, -8, 3.2, 3);
    c.fillStyle = '#7a6550'; ellipse(c, 3.5, -13, 1.2, 4); ellipse(c, 5.5, -13, 1.2, 4);
    c.fillStyle = '#f0e8dc'; ellipse(c, -6, -5, 2, 2);
    c.fillStyle = '#1a0f08'; c.fillRect(6, -9, 1.2, 1.2);
  } else if (a.type === 'deer') {
    const g = moving ? a.phase : 0, amp = moving ? (a.flee > 0 ? 6 : 2.5) : 0;
    c.strokeStyle = '#7a5434'; c.lineWidth = 2.4; c.lineCap = 'round';
    for (const [lx, ph] of [[-10, 0], [-6, Math.PI], [7, Math.PI / 2], [11, Math.PI * 1.5]]) {
      const sw = Math.sin(g + ph) * amp;
      c.beginPath(); c.moveTo(lx, -18); c.lineTo(lx + sw, 0); c.stroke();
    }
    c.fillStyle = '#a0724a'; ellipse(c, 0, -21, 15, 7);
    c.fillStyle = '#d8c0a0'; ellipse(c, 1, -17, 10, 2.8);
    c.fillStyle = '#f4ece0'; ellipse(c, -14, -23, 3, 3.5);
    c.fillStyle = '#a0724a';
    c.beginPath(); c.moveTo(9, -24); c.lineTo(15, -36); c.lineTo(19, -34); c.lineTo(15, -20); c.closePath(); c.fill();
    ellipse(c, 19, -36, 5.5, 3.2);
    c.fillStyle = '#1a0f08'; c.fillRect(21, -37.5, 1.4, 1.4); ellipse(c, 24, -35.5, 1.3, 1.1);
    c.fillStyle = '#8a6040'; ellipse(c, 15, -40, 1.5, 3);
    if (a.buck) {
      c.strokeStyle = '#d8c8a8'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(17, -39); c.lineTo(13, -48); c.lineTo(9, -51); c.moveTo(14, -46); c.lineTo(17, -52);
      c.moveTo(19, -39); c.lineTo(21, -48); c.lineTo(19, -53); c.moveTo(21, -46); c.lineTo(25, -50); c.stroke();
    }
  } else {
    const s = moving ? Math.sin(a.phase) * 3 : 0;
    c.strokeStyle = '#6a5a44'; c.lineWidth = 2.2; c.lineCap = 'round';
    for (const [lx, sg] of [[-6, 1], [-3, -1], [4, -1], [7, 1]]) { c.beginPath(); c.moveTo(lx, -8); c.lineTo(lx + s * sg, -1); c.stroke(); }
    c.fillStyle = '#9a8a70'; ellipse(c, 0, -10, 10, 4.5);
    c.fillStyle = '#d8ccb0'; ellipse(c, 2, -8, 5, 2);
    c.fillStyle = '#9a8a70'; ellipse(c, 11, -14, 5, 3.5);
    c.beginPath(); c.moveTo(14, -14); c.lineTo(19, -12); c.lineTo(14, -11); c.fill();
    c.fillStyle = '#6a5a44'; c.beginPath(); c.moveTo(9, -17); c.lineTo(10, -22); c.lineTo(12, -17); c.fill();
    c.fillStyle = a.hunting ? '#e8c040' : '#1a0f08'; c.fillRect(13, -15, 1.6, 1.4);
    c.strokeStyle = '#8a7a60'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-9, -11); c.quadraticCurveTo(-15, -9, -16, -4); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------------
// Trem
// ---------------------------------------------------------------------
// Fazendeiros que ficam perto das fazendas
for (const f of FARMS) {
  const n = makeNPC(f.doorX + 40, f.doorY + 30);
  n.home = { x: f.doorX, y: f.doorY + 30 };
  n.name = f.id === 'farm' && f.name === 'RANCHO' ? 'Rancheiro Clem' : 'Sr. Braithwaite';
  n.female = false; n.coat = '#6a5a3a'; n.pants = '#3a4a6a'; n.hat = '#b8a070';
}

const TRAIN_CARS = ['loco', 'tender', 'passenger', 'passenger', 'box', 'box', 'caboose'];
const CAR_W = 104;
const TRAIN_LEN = TRAIN_CARS.length * (CAR_W + 8);
const train = { active: false, t: 25, x: 0, dir: 1, speed: 300, whistled: false, hitT: 0 };
function updateTrain(dt) {
  train.hitT = Math.max(0, train.hitT - dt);
  if (!train.active) {
    train.t -= dt;
    if (train.t <= 0) {
      train.active = true; train.dir = Math.random() < 0.5 ? 1 : -1; train.whistled = false;
      train.x = train.dir > 0 ? -300 : WORLD_W + 300;
    }
    return;
  }
  train.x += train.dir * train.speed * dt;
  const back = train.x - train.dir * TRAIN_LEN;
  const lo = Math.min(train.x, back), hi = Math.max(train.x, back);
  if (!train.whistled && Math.abs(player.y - TRACK_Y) < 800 && Math.abs(train.x - player.x) < 1100) { train.whistled = true; sfx('train'); }
  // fumaça da locomotiva
  if (Math.abs(train.x - cam.x) < 1400 && Math.random() < 0.7) {
    particles.push({ x: train.x - train.dir * 30, y: TRACK_Y - 62, vx: -train.dir * R(40, 90), vy: R(-50, -25), life: 2.2, max: 2.2, color: 'rgba(70,70,70,0.4)', size: R(6, 10), smoke: true });
  }
  // atropelamento
  const onTrack = (e, pad) => e.x > lo - pad && e.x < hi + pad && e.y > TRACK_Y - 34 && e.y < TRACK_Y + 10;
  if (onTrack(player, player.mounted ? 24 : 8) && train.hitT <= 0) {
    train.hitT = 1.2;
    const up = player.y < TRACK_Y - 12;
    const ny = up ? TRACK_Y - 44 : TRACK_Y + 24;
    if (player.mounted) { horse.y = ny; horse.health = clamp(horse.health - 30, 0, 100); } else player.y = ny;
    player.y = ny;
    hitPlayer(2.6);
    toast('Cuidado com o trem!', 'Olhe para os dois lados antes de cruzar os trilhos.');
  }
  for (const a of animals) if (a.alive && onTrack(a, 6)) { a.y += a.y < TRACK_Y - 12 ? -30 : 30; }
  if ((train.dir > 0 && back > WORLD_W + 200) || (train.dir < 0 && back < -200)) { train.active = false; train.t = R(70, 140); }
}
function drawTrain(c) {
  if (!train.active) return;
  const y = TRACK_Y - 6;
  for (let i = 0; i < TRAIN_CARS.length; i++) {
    const kind = TRAIN_CARS[i];
    const cx = train.x - train.dir * (i * (CAR_W + 8) + CAR_W / 2);
    const x0 = cx - CAR_W / 2;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x0 + 6, y - 2, CAR_W, 8);
    // rodas
    c.fillStyle = '#1a1a1a';
    for (const wx of [x0 + 16, x0 + 34, x0 + CAR_W - 34, x0 + CAR_W - 16]) { c.beginPath(); c.arc(wx, y - 6, 7, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#6a2a1a'; for (const wx of [x0 + 16, x0 + CAR_W - 16]) { c.beginPath(); c.arc(wx, y - 6, 2.5, 0, Math.PI * 2); c.fill(); }
    if (kind === 'loco') {
      c.save(); c.translate(cx, 0); c.scale(train.dir, 1); c.translate(-cx, 0);
      c.fillStyle = '#1e1e22'; rrect(c, x0 + 6, y - 44, 64, 30, 12);
      c.fillStyle = '#b8902a'; c.fillRect(x0 + 20, y - 44, 3, 30); c.fillRect(x0 + 44, y - 44, 3, 30);
      c.fillStyle = '#2a2a2e'; c.fillRect(x0 + 50, y - 70, 12, 26); c.fillRect(x0 + 46, y - 74, 20, 6);
      c.fillStyle = '#6a1a14'; c.fillRect(x0 - 2, y - 58, 34, 44); c.fillStyle = '#2a0a08'; c.fillRect(x0 - 4, y - 62, 38, 6);
      c.fillStyle = isNight() ? '#ffd27a' : '#9aa8b0'; c.fillRect(x0 + 6, y - 52, 16, 12);
      c.fillStyle = '#b8902a'; c.beginPath(); c.moveTo(x0 + CAR_W, y - 6); c.lineTo(x0 + 70, y - 14); c.lineTo(x0 + 70, y); c.fill();
      c.fillStyle = '#f0e0a0'; ellipse(c, x0 + 74, y - 34, 5, 5);
      c.restore();
    } else {
      const col = { tender: '#2a2a2e', passenger: '#3a5a3a', box: '#7a3a22', caboose: '#9a2a1e' }[kind];
      c.fillStyle = col; c.fillRect(x0 + 2, y - (kind === 'tender' ? 34 : 50), CAR_W - 4, kind === 'tender' ? 22 : 38);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x0, y - (kind === 'tender' ? 36 : 54), CAR_W, 4);
      if (kind === 'passenger' || kind === 'caboose') {
        c.fillStyle = isNight() ? '#f5c46a' : '#c8d4d8';
        for (let wx = x0 + 10; wx < x0 + CAR_W - 14; wx += 18) c.fillRect(wx, y - 44, 10, 12);
      }
      if (kind === 'box') { c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; for (let wx = x0 + 8; wx < x0 + CAR_W; wx += 8) { c.beginPath(); c.moveTo(wx, y - 50); c.lineTo(wx, y - 12); c.stroke(); } }
      if (kind === 'tender') { c.fillStyle = '#111'; ellipse(c, cx, y - 36, CAR_W / 2 - 8, 6); }
      if (kind === 'caboose') { c.fillStyle = '#7a1a14'; c.fillRect(cx - 16, y - 64, 32, 12); }
    }
  }
}

// ---------------------------------------------------------------------
// Eventos aleatórios na cidade
// ---------------------------------------------------------------------
let eventTimer = 45;
function inTown(x, y) { return x > TOWN.x && x < TOWN.x + TOWN.w && y > TOWN.y && y < TOWN.y + TOWN.h; }
function updateEvents(rdt, dt) {
  const ev = G.event;
  if (!ev) {
    if (!inTown(player.x, player.y) || G.menu || G.sitting || G.wanted > 0) return;
    eventTimer -= rdt;
    if (eventTimer <= 0) { eventTimer = R(70, 150); startEvent(); }
    return;
  }
  const v = ev.victim;
  if (!v || !v.alive) {
    if (ev.type === 'hurt' || ev.stage !== 'done') toast('Evento encerrado', 'Tarde demais para ajudar.');
    return endEvent();
  }
  if (ev.type === 'thief') {
    const t = ev.thief;
    if (ev.stage === 'chase' && t.alive) {
      const d = dist(t.x, t.y, player.x, player.y);
      if (!ev.goal || dist(t.x, t.y, ev.goal.x, ev.goal.y) < 30 || t.stuck > 1) {
        const ex = t.x < player.x ? STREET.x - 250 : STREET.x + STREET.w + 250;
        ev.goal = { x: ex, y: R(STREET.y + 30, STREET.y + STREET.h - 30) };
        t.stuck = 0;
      }
      steer(t, ev.goal.x, ev.goal.y, t.speed, dt, t.r);
      t.phase += dt * 15;
      if (d < (player.mounted ? 36 : 24)) {
        t.caught = true; ev.stage = 'return';
        say(t, pick(['Tá bom, tá bom! Toma!', 'Não me machuque!', 'Droga!']), 2);
        say(player, 'Te peguei!', 1.5);
        toast('Bolsa recuperada', `Devolva a bolsa para ${v.name}.`, 'gold');
        t.speed = 110;
      } else if (d > 1100 || t.x < STREET.x - 200 || t.x > STREET.x + STREET.w + 200) {
        toast('O ladrão escapou', 'Ele sumiu no deserto.');
        return endEvent();
      }
    } else if (t.caught && t.alive) {
      // foge sem a bolsa
      steer(t, t.x < 2000 ? -200 : WORLD_W + 200, t.y, 120, dt, t.r); t.phase += dt * 14;
    }
  } else if (ev.type === 'hurt') {
    ev.t -= rdt;
    if (ev.t <= 0) { v.hurt = false; say(v, 'Acho que consigo andar...'); toast('Evento encerrado', 'Alguém levou o ferido ao médico.'); return endEvent(); }
    if (Math.random() < rdt * 0.2 && dist(v.x, v.y, player.x, player.y) < 400) say(v, pick(['Socorro... fui picado por uma cobra!', 'Alguém me ajude...', 'Senhor! Por favor!']), 3);
  }
}
function startEvent() {
  const cands = npcs.filter((n) => n.alive && !n.hurt && !n.home && dist(n.x, n.y, player.x, player.y) > 150 && dist(n.x, n.y, player.x, player.y) < 520);
  if (!cands.length) return;
  const v = pick(cands);
  if (Math.random() < 0.55) {
    const t = {
      kind: 'thief', x: v.x + 14, y: v.y, dir: 1, phase: 0, moving: false, r: 8, alive: true, deadT: 0, speed: 138, stuck: 0,
      coat: '#3a3530', shirt: '#7a6a5a', pants: '#2a2622', hat: '#4a3a2a', skin: pick(SKINS), bandana: '#6a5a2a',
    };
    for (let k = 0; k < 10 && collides(t.x, t.y, 8); k++) t.x += 10;
    G.event = { type: 'thief', victim: v, thief: t, stage: 'chase' };
    v.flee = 2; v.wait = 0;
    say(v, 'Socorro! Ladrão! Ele levou minha bolsa!', 3);
    toast('Ladrão!', `Alguém roubou a bolsa de ${v.name}. ${TOUCH.on ? 'Corra atrás dele!' : 'Corra atrás dele (Shift)!'}`, 'gold');
  } else {
    v.hurt = true; v.moving = false; v.flee = 0;
    G.event = { type: 'hurt', victim: v, t: 150 };
    say(v, 'Socorro... fui picado por uma cobra!', 3.5);
    toast('Alguém precisa de ajuda', `${v.name} está caído na rua.`, 'gold');
  }
}
function endEvent() {
  const ev = G.event;
  if (ev && ev.victim) ev.victim.hurt = false;
  G.event = null;
}
function thiefShot() {
  const ev = G.event;
  if (!ev) return;
  changeHonor(-2, 'Havia jeitos mais gentis de parar um ladrão de bolsas.');
}
function eventInteractions(consider, px, py) {
  const ev = G.event;
  if (!ev) return;
  const v = ev.victim;
  if (ev.type === 'thief') {
    const t = ev.thief;
    if (!t.alive && ev.stage === 'chase') consider(dist(px, py, t.x, t.y) - 10, 40, { e: { label: 'Pegar a bolsa', fn: () => { ev.stage = 'return'; sfx('pickup'); toast('Bolsa recuperada', `Devolva a bolsa para ${v.name}.`, 'gold'); } } });
    if (ev.stage === 'return') consider(dist(px, py, v.x, v.y) - 15, 50, {
      e: { label: `Devolver a bolsa a ${v.name}`, fn: () => {
        const r = Math.round(R(2, 5) * 100) / 100;
        v.wait = 3; v.dir = player.x < v.x ? -1 : 1;
        say(v, pick(['Muito obrigado, senhor! Tome, é seu.', 'Deus lhe pague! Aceite isto.', 'Um herói de verdade!']), 3);
        earn(r); changeHonor(6, 'Você devolveu a bolsa roubada.');
        banner('BOLSA DEVOLVIDA', `+${fmtMoney(r)} de recompensa`);
        endEvent();
      } },
      f: { label: 'Ficar com a bolsa', fn: () => {
        say(v, pick(['Ei! Essa bolsa é minha!', 'Você é tão ladrão quanto ele!']), 3);
        earn(6); changeHonor(-8, 'Você ficou com a bolsa roubada.');
        endEvent();
      } },
    });
  } else if (ev.type === 'hurt') {
    consider(dist(px, py, v.x, v.y) - 15, 50, {
      e: { label: `Ajudar ${v.name}`, fn: () => {
        if (G.tonic > 0) G.tonic--;
        else if (G.food > 0) G.food--;
        else { toast('Sem remédio', 'Você precisa de um tônico ou de feijão para ajudar (compre no Armazém).'); return; }
        sfx('drink');
        say(v, pick(['Obrigado... já me sinto melhor.', 'O senhor salvou minha vida!']), 3);
        changeHonor(6, `Você ajudou ${v.name}.`);
        if (Math.random() < 0.6) { const r = Math.round(R(1, 4) * 100) / 100; earn(r); toast('Gratidão', `${v.name} te deu ${fmtMoney(r)}.`, 'gold'); }
        v.hurt = false; v.wait = 2;
        endEvent();
      } },
      f: { label: 'Roubar', fn: () => {
        say(v, 'Não... por favor...', 3);
        earn(2.5); changeHonor(-10, 'Você roubou um homem ferido.');
      } },
    });
  }
}

// ---------------------------------------------------------------------
// Trabalhos de entrega (Correio)
// ---------------------------------------------------------------------
const RECIPIENTS = ['Sra. O\'Shea', 'Sr. Downes', 'Viúva Harper', 'Doutor Barnes', 'Pastor Swanson', 'Família Braithwaite', 'Tio Abe', 'Srta. Kate'];
function takeJob() {
  const post = BUILDINGS.find((b) => b.id === 'post');
  const spots = [];
  for (const b of BUILDINGS) if ((b.id === 'house' || b.id === 'farm' || b.id === 'church') && dist(b.doorX, b.doorY, post.doorX, post.doorY) > 300) spots.push({ x: b.doorX, y: b.doorY, where: b.id === 'farm' ? b.owner : b.id === 'church' ? 'a igreja' : 'uma casa na rua principal' });
  spots.push({ x: CAMP.x - 40, y: CAMP.y + 20, where: 'o acampamento a leste' });
  const s = pick(spots);
  const d = dist(s.x, s.y, post.doorX, post.doorY);
  G.job = { x: s.x, y: s.y, where: s.where, name: pick(RECIPIENTS), reward: Math.round((1 + d / 700) * 100) / 100 };
  toast('Encomenda', `Entregue para ${G.job.name} em ${G.job.where}. Pagamento: ${fmtMoney(G.job.reward)}.`, 'gold');
}
function deliverJob() {
  const j = G.job;
  G.job = null; G.jobsDone++;
  earn(j.reward); changeHonor(1, null);
  say(player, 'Encomenda para você.', 2);
  banner('ENTREGA FEITA', `+${fmtMoney(j.reward)}`);
}

// ---------------------------------------------------------------------
// Clima
// ---------------------------------------------------------------------
const drops = [];
let rainNode = null;
function updateWeather(dt, tRate) {
  const w = G.wx;
  w.t -= dt * tRate;
  if (w.t <= 0) {
    const r = Math.random();
    const prev = w.kind;
    w.kind = r < 0.55 ? 'clear' : r < 0.78 ? 'cloudy' : 'rain';
    w.t = R(3, 7);
    if (w.kind === 'rain' && prev !== 'rain' && G.started) toast('O tempo virou', 'Começou a chover. A chuva lava a poeira.');
  }
  w.rain = lerp(w.rain, w.kind === 'rain' ? 1 : 0, clamp(dt * 0.25, 0, 1));
  w.cloud = lerp(w.cloud, w.kind === 'clear' ? 0 : 1, clamp(dt * 0.2, 0, 1));
  w.flash = Math.max(0, w.flash - dt * 3);
  if (w.rain > 0.7 && Math.random() < dt * 0.05) { w.flash = 1; setTimeout(() => sfx('thunder'), 400 + Math.random() * 1500); }
  if (w.rain > 0.05) G.dirt = clamp(G.dirt - dt * 0.004 * w.rain, 0, 1);
  // som da chuva
  if (AC && MASTER) {
    if (!rainNode) {
      const src = AC.createBufferSource(); src.buffer = noiseBuf(2); src.loop = true;
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      const g = AC.createGain(); g.gain.value = 0;
      src.connect(f).connect(g).connect(MASTER); src.start();
      rainNode = g;
    }
    rainNode.gain.value = w.rain * 0.1;
  }
}
function drawWeather() {
  const w = G.wx;
  if (w.cloud > 0.02) { ctx.fillStyle = `rgba(40,48,64,${0.22 * w.cloud})`; ctx.fillRect(0, 0, VW, VH); }
  if (w.rain > 0.02) {
    const n = Math.floor(260 * w.rain);
    while (drops.length < n) drops.push({ x: Math.random() * VW, y: Math.random() * VH, s: 700 + Math.random() * 500, l: 10 + Math.random() * 14 });
    ctx.strokeStyle = `rgba(190,205,225,${0.45 * w.rain})`; ctx.lineWidth = 1;
    ctx.beginPath();
    const dt = 1 / 60;
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      d.y += d.s * dt; d.x -= d.s * dt * 0.18;
      if (d.y > VH) { d.y = -20; d.x = Math.random() * (VW + 100); }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.18, d.y + d.l);
    }
    ctx.stroke();
  }
  if (w.flash > 0) { ctx.fillStyle = `rgba(230,235,255,${w.flash * 0.35})`; ctx.fillRect(0, 0, VW, VH); }
}

// ---------------------------------------------------------------------
// Som liga/desliga
// ---------------------------------------------------------------------
function toggleMute() {
  G.muted = !G.muted;
  if (MASTER) MASTER.gain.value = G.muted ? 0 : 1;
  $('muteBtn').textContent = G.muted ? '🔇' : '🔊';
  toast(G.muted ? 'Som desligado' : 'Som ligado', '');
}

// ---------------------------------------------------------------------
// Salvar / carregar (fica só neste navegador)
// ---------------------------------------------------------------------
const SAVE_KEY = 'poeira-vermelha-save-v1';
const SAVE_FIELDS = ['time', 'day', 'money', 'bank', 'honor', 'healthCore', 'staminaCore', 'deadEyeCore', 'ammo', 'reserve', 'food', 'tonic',
  'herbs', 'carrots', 'beard', 'dirt', 'wanted', 'bottleHits', 'pelts', 'meat', 'hunts', 'prayedDay', 'gotLetter', 'job', 'jobsDone', 'muted'];
function hasSave() { try { return !!localStorage.getItem('poeira-vermelha-save-v1'); } catch (e) { return false; } }
function saveGame() {
  if (!G.started || G.fading) return;
  const data = { v: 1, p: { x: Math.round(player.x), y: Math.round(player.y) }, horse: { bond: horse.bond, x: Math.round(horse.x), y: Math.round(horse.y) }, dogBond: dog ? dog.bond : 0 };
  for (const k of SAVE_FIELDS) data[k] = G[k];
  if (G.bounty && G.bounty.stage === 'return') data.bounty = { name: G.bounty.name, reward: G.bounty.reward, stage: 'return', x: 0, y: 0 };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* armazenamento indisponível */ }
}
function loadGame() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { data = null; }
  if (!data || data.v !== 1) return false;
  for (const k of SAVE_FIELDS) if (data[k] !== undefined) G[k] = data[k];
  if (data.bounty) G.bounty = data.bounty;
  if (data.p && !collides(data.p.x, data.p.y, player.r)) { player.x = data.p.x; player.y = data.p.y; }
  if (data.horse) {
    horse.bond = data.horse.bond || 1;
    if (!collides(data.horse.x, data.horse.y, horse.r)) { horse.x = data.horse.x; horse.y = data.horse.y; }
  }
  if (dog && data.dogBond) dog.bond = data.dogBond;
  cam.x = player.x; cam.y = player.y;
  return true;
}
let saveTimer = 0;
function autosave(rdt) {
  saveTimer += rdt;
  if (saveTimer > 20) { saveTimer = 0; saveGame(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);
function updateStartButton() {
  const btn = document.getElementById('startBtn');
  const nb = document.getElementById('newGameBtn');
  if (!btn) return;
  const saved = hasSave();
  btn.textContent = saved ? 'Continuar jornada' : TOUCH.on ? 'Toque para começar' : 'Pressione ENTER para começar';
  if (nb) nb.hidden = !saved;
}
updateStartButton();

// ---------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const rdt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G.started) {
    update(rdt);
    updateHUD();
  } else {
    // câmera de apresentação
    cam.x = 1600 + Math.sin(now / 8000) * 500; cam.y = 1150;
    G.time = 18.2 + Math.sin(now / 10000) * 0.3;
    for (const n of npcs) updateNPC(n, rdt);
    updateWorld(rdt); updateParticles(rdt);
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposto para depuração / testes
window.__game = { G, player, horse, npcs, outlaws, BUILDINGS, cam, startGame, animals, train, startEvent, TRACK_Y, FARMS, saveGame };
