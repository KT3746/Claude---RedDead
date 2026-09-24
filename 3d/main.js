/* =====================================================================
   POEIRA VERMELHA 3D — faroeste em terceira pessoa no navegador
   Three.js (WebGL). Tudo é gerado por código: sem modelos externos.
   ===================================================================== */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtMoney = (v) => '$' + v.toFixed(2);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1899);
const R = (a, b) => a + rnd() * (b - a);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
};

// ---------------------------------------------------------------------
// Dispositivo e qualidade
// ---------------------------------------------------------------------
const IS_TOUCH = !!(window.matchMedia && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches)));
if (IS_TOUCH) document.body.classList.add('touch');
const QUALITY = {
  baixa: { pr: 1, shadow: 0, aa: false, seg: 90, props: 0.45, npcs: 7, lights: 2 },
  media: { pr: 1.5, shadow: 1024, aa: true, seg: 140, props: 0.7, npcs: 10, lights: 3 },
  alta: { pr: 2, shadow: 2048, aa: true, seg: 200, props: 1, npcs: 14, lights: 4 },
};
let qName = store.get('pv3d-quality');
if (!QUALITY[qName]) qName = IS_TOUCH ? 'media' : 'alta';
const Q = QUALITY[qName];

// ---------------------------------------------------------------------
// Renderizador, cena e câmera
// ---------------------------------------------------------------------
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, powerPreference: 'high-performance' });
} catch (e) {
  $('startBtn').textContent = 'Seu navegador não suporta 3D';
  $('loadMsg').textContent = 'Tente o Chrome ou o Safari atualizados. A versão 2D funciona em qualquer navegador.';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = Q.shadow > 0;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xcfb18a, 0.0032);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.15, 6000);

function applyQuality(name) {
  const q = QUALITY[name];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const wantShadow = q.shadow > 0;
  if (renderer.shadowMap.enabled !== wantShadow) {
    renderer.shadowMap.enabled = wantShadow;
    scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.needsUpdate = true; }); } });
  }
  if (wantShadow && sun.shadow.mapSize.x !== q.shadow) {
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

// ---------------------------------------------------------------------
// Texturas geradas por código
// ---------------------------------------------------------------------
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, MAX_ANISO);
  return t;
}
const plankTex = canvasTex(256, 256, (c, w, h) => {
  const pw = 32;
  for (let x = 0; x < w; x += pw) {
    const l = 180 + Math.floor(rnd() * 60);
    c.fillStyle = `rgb(${l},${l - 6},${l - 14})`; c.fillRect(x, 0, pw, h);
    for (let i = 0; i < 14; i++) {
      c.strokeStyle = `rgba(60,40,20,${0.05 + rnd() * 0.12})`; c.lineWidth = 1;
      const gx = x + rnd() * pw; c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + 3, h * 0.3, gx - 3, h * 0.7, gx + 1, h); c.stroke();
    }
    c.fillStyle = 'rgba(30,18,8,0.55)'; c.fillRect(x, 0, 2, h);
    c.fillStyle = 'rgba(30,20,10,0.6)';
    for (const ny of [18, h - 18]) { c.beginPath(); c.arc(x + 8, ny, 1.6, 0, 7); c.arc(x + pw - 8, ny, 1.6, 0, 7); c.fill(); }
    if (rnd() < 0.5) { c.fillStyle = 'rgba(40,25,10,0.35)'; c.beginPath(); c.ellipse(x + pw / 2, rnd() * h, 3, 5, 0, 0, 7); c.fill(); }
  }
});
const shingleTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#b8b0a4'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    const off = (y / 16) % 2 ? 12 : 0;
    for (let x = -24; x < w; x += 24) {
      const l = 150 + Math.floor(rnd() * 70);
      c.fillStyle = `rgb(${l},${l - 8},${l - 16})`; c.fillRect(x + off + 1, y + 1, 22, 15);
    }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y + 14, w, 2);
  }
});
const sandTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    const v = rnd();
    c.fillStyle = v < 0.5 ? `rgba(90,60,30,${rnd() * 0.12})` : `rgba(255,245,225,${rnd() * 0.25})`;
    c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(80,55,30,${rnd() * 0.06})`;
    c.beginPath(); c.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 30, 6 + rnd() * 20, rnd() * 3, 0, 7); c.fill();
  }
});
const dirtTex = canvasTex(256, 512, (c, w, h) => {
  c.fillStyle = '#9c7650'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { c.fillStyle = rnd() < 0.5 ? `rgba(60,40,20,${rnd() * 0.18})` : `rgba(220,190,150,${rnd() * 0.15})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
  for (const rx of [0.28, 0.36, 0.64, 0.72]) {
    c.strokeStyle = 'rgba(60,38,20,0.35)'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(rx * w, 0);
    for (let y = 0; y <= h; y += 16) c.lineTo(rx * w + Math.sin(y / 60) * 3, y);
    c.stroke();
  }
  for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(70,45,25,0.3)'; c.beginPath(); c.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 4, 2 + rnd() * 3, 0, 0, 7); c.fill(); }
  // bordas suaves
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(201,163,107,1)'); g.addColorStop(0.1, 'rgba(201,163,107,0)'); g.addColorStop(0.9, 'rgba(201,163,107,0)'); g.addColorStop(1, 'rgba(201,163,107,1)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const glowTex = canvasTex(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,220,160,1)'); g.addColorStop(0.25, 'rgba(255,170,80,0.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const dotTex = canvasTex(32, 32, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
function signTex(text, trim) {
  const t = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#2a1a10'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(255,230,190,${rnd() * 0.05})`; c.fillRect(rnd() * w, rnd() * h, 20, 1); }
    c.strokeStyle = trim; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = trim; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${text.length > 7 ? 60 : 72}px Rye, Georgia, serif`;
    c.fillText(text, w / 2, h / 2 + 4);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Materiais compartilhados
const matCache = new Map();
function M(color, opts) {
  const key = color + (opts ? JSON.stringify(Object.keys(opts).map((k) => [k, typeof opts[k] === 'object' ? opts[k].uuid : opts[k]])) : '');
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0 }, opts || {})); matCache.set(key, m); }
  return m;
}
const windowMat = new THREE.MeshStandardMaterial({ color: 0x26323a, roughness: 0.15, metalness: 0.4, emissive: 0xffa94d, emissiveIntensity: 0 });
const lanternMat = new THREE.MeshStandardMaterial({ color: 0x3a3228, emissive: 0xffc070, emissiveIntensity: 0, roughness: 0.6 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 });
function plankMat(color, rx, ry) {
  const t = plankTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ color, map: t, roughness: 0.92 });
}
function roofMat(color, rx, ry) {
  const t = shingleTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ color, map: t, roughness: 0.95 });
}
const geoCache = {};
const geo = (k, make) => geoCache[k] || (geoCache[k] = make());

// ---------------------------------------------------------------------
// Terreno
// ---------------------------------------------------------------------
const WORLD = 560; // metade do tamanho jogável
function roadZ(x) {
  const ax = Math.abs(x);
  if (ax < 140) return 0;
  const t = ax - 140;
  return Math.sin(t / 90) * 18 * smoothstep(0, 60, t) * (x < 0 ? -1 : 1);
}
function height(x, z) {
  const dx = Math.max(0, Math.abs(x) - 120), dz = Math.max(0, Math.abs(z) - 55);
  const town = smoothstep(0, 70, Math.hypot(dx, dz));
  const road = smoothstep(10, 36, Math.abs(z - roadZ(x)));
  const n = Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.015) * 5 + Math.sin(x * 0.045 + z * 0.031) * 1.8
    + Math.sin(z * 0.009 - x * 0.006) * 7 + Math.cos(x * 0.004 + z * 0.004) * 4;
  return (n + 4) * town * road;
}
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: sandTex, roughness: 1 });
sandTex.repeat.set(160, 160);
(function buildTerrain() {
  const size = 1400, seg = Q.seg;
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color('#c9a26a'), cRed = new THREE.Color('#b0673e'), cTown = new THREE.Color('#a88258'), cOlive = new THREE.Color('#8f8a55'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = height(x, z);
    pos.setY(i, y);
    tmp.copy(cSand).lerp(cRed, clamp(y / 16, 0, 0.8));
    const n = Math.sin(x * 0.07) * Math.cos(z * 0.05) * 0.5 + 0.5;
    tmp.lerp(cOlive, n * 0.18 * smoothstep(40, 120, Math.abs(z)));
    const townK = 1 - smoothstep(0, 40, Math.hypot(Math.max(0, Math.abs(x) - 110), Math.max(0, Math.abs(z) - 45)));
    tmp.lerp(cTown, townK * 0.5);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, groundMat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  window.__groundMesh = mesh;
})();

// Estrada de terra (faixa que acompanha o terreno)
(function buildRoad() {
  const verts = [], uvs = [], idx = [];
  let row = 0;
  for (let x = -700; x <= 700; x += 3) {
    const z0 = roadZ(x), w = Math.abs(x) < 125 ? 17 : lerp(17, 10, smoothstep(125, 170, Math.abs(x)));
    for (const s of [-1, 1]) {
      const z = z0 + s * w / 2;
      verts.push(x, height(x, z) + 0.05, z);
      uvs.push(s < 0 ? 0 : 1, x / 7);
    }
    if (row > 0) { const a = (row - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    row++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true;
  scene.add(m);
})();

// ---------------------------------------------------------------------
// Colisão e piso
// ---------------------------------------------------------------------
const colliders = []; // {x0,x1,z0,z1}
const porches = [];   // {x0,x1,z0,z1,h}
const blockers = [];  // malhas que bloqueiam câmera e balas
function addCollider(x0, x1, z0, z1) { colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
function isBlocked(x, z, r) {
  if (Math.abs(x) > WORLD || Math.abs(z) > WORLD) return true;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return true;
  }
  return false;
}
function moveCircle(o, dx, dz, r) {
  let moved = false;
  if (dx && !isBlocked(o.x + dx, o.z, r)) { o.x += dx; moved = true; }
  if (dz && !isBlocked(o.x, o.z + dz, r)) { o.z += dz; moved = true; }
  return moved;
}
function floorY(x, z) {
  for (const p of porches) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return p.h;
  return height(x, z);
}

// ---------------------------------------------------------------------
// Construções
// ---------------------------------------------------------------------
const BUILDINGS = [
  // lado norte: frente virada para a rua (+z)
  { id: 'saloon', name: 'SALOON', x: -70, w: 16, d: 14, h: 7.4, face: 1, wall: '#a06c42', roof: '#6a4a36', trim: '#e0c48a', ff: true, two: true },
  { id: 'hotel', name: 'HOTEL', x: -50, w: 13, d: 12, h: 8.4, face: 1, wall: '#8e9aa2', roof: '#4f5559', trim: '#f0e2c0', ff: true, two: true },
  { id: 'store', name: 'ARMAZÉM', x: -32, w: 14, d: 12, h: 5.2, face: 1, wall: '#b07e4c', roof: '#6d4a2f', trim: '#f2d9a0', ff: true },
  { id: 'bank', name: 'BANCO', x: -12, w: 12, d: 12, h: 6.2, face: 1, wall: '#c9b590', roof: '#7a6a52', trim: '#3a2a1a', ff: true },
  { id: 'barber', name: 'BARBEIRO', x: 4, w: 9.5, d: 10, h: 4.8, face: 1, wall: '#879a70', roof: '#55604a', trim: '#f0e2c0', ff: true },
  { id: 'house', x: 18, w: 10, d: 10, h: 3.8, face: 1, wall: '#a08a6a', roof: '#6a5842', gable: true },
  { id: 'church', name: 'IGREJA', x: 40, w: 12, d: 18, h: 6.2, face: 1, wall: '#e8e0cc', roof: '#7a6a5a', trim: '#6a5a4a', gable: true, steeple: true },
  // lado sul: frente virada para a rua (−z)
  { id: 'sheriff', name: 'XERIFE', x: -68, w: 12, d: 10, h: 4.8, face: -1, wall: '#8e6c4a', roof: '#5a4432', trim: '#e8d6ae', ff: true },
  { id: 'stable', name: 'ESTÁBULO', x: -48, w: 16, d: 14, h: 5.2, face: -1, wall: '#a3432c', roof: '#5a2c1f', trim: '#efe1bf', barn: true },
  { id: 'house', x: -30, w: 10, d: 10, h: 3.8, face: -1, wall: '#a8926e', roof: '#6a5842', gable: true },
  { id: 'post', name: 'CORREIO', x: -14, w: 11, d: 10, h: 4.8, face: -1, wall: '#71879a', roof: '#4a5560', trim: '#f0e2c0', ff: true },
  { id: 'house', x: 2, w: 10, d: 10, h: 3.8, face: -1, wall: '#957a5a', roof: '#5f4c36', gable: true },
  { id: 'house', x: 18, w: 11, d: 10, h: 4.0, face: -1, wall: '#8a7258', roof: '#5a4834', gable: true },
  { id: 'house', x: 36, w: 10, d: 10, h: 3.8, face: -1, wall: '#a5906c', roof: '#6a5842', gable: true },
];
const FRONT = 11, PORCH = 3;
const signs = []; // frente das construções a 11 m do centro da rua; varanda de 3 m

function gableGeo(w, d, rise) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, rise); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

function makeBuilding(b) {
  b.z = b.face > 0 ? -(FRONT + b.d / 2) : FRONT + b.d / 2;
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.z);
  if (b.face < 0) g.rotation.y = Math.PI; // modelo construído com a frente em +z local
  const wallM = plankMat(b.wall, b.w / 2.6, b.h / 2.6);
  const trimM = M(b.trim || '#e8d8b0');
  const darkWood = M('#3a2616');
  const add = (mesh, shadow = true) => { if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; } g.add(mesh); return mesh; };
  const box = (w, h, d, m, x, y, z) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); return add(mesh); };
  const front = b.d / 2;

  // corpo
  const body = box(b.w, b.h, b.d, wallM, 0, b.h / 2, 0);
  blockers.push(body);
  // base de pedra
  box(b.w + 0.1, 0.35, b.d + 0.1, M('#6e6258'), 0, 0.17, 0);

  // telhado
  if (b.gable || b.barn) {
    const rise = b.barn ? 3.2 : 2.2;
    const roof = add(new THREE.Mesh(gableGeo(b.w + 0.8, b.d + 0.6, rise), roofMat(b.roof, b.w / 3, b.d / 3)));
    roof.position.y = b.h;
    if (b.barn) {
      box(3, 3.4, 0.2, M('#5a2c1f'), 0, 1.7, front + 0.08);
      for (const s of [-1, 1]) { const x = box(0.15, 4.2, 0.1, trimM, s * 0.75, 1.7, front + 0.2); x.rotation.z = s * 0.72; }
      box(2.2, 1.2, 0.15, M('#3a2010'), 0, b.h + 1.2, front + 0.35);
    }
  } else {
    const roof = box(b.w + 0.3, 0.25, b.d + 0.3, roofMat(b.roof, b.w / 3, b.d / 3), 0, b.h + 0.1, -0.1);
    roof.rotation.x = -0.05;
  }
  // fachada falsa típica do velho oeste
  if (b.ff) {
    const ffH = b.h + 1.8;
    const ffMesh = box(b.w + 0.3, ffH, 0.3, plankMat(b.wall, b.w / 2.6, ffH / 2.6), 0, ffH / 2, front + 0.12);
    blockers.push(ffMesh);
    box(b.w + 0.7, 0.25, 0.5, trimM, 0, ffH + 0.1, front + 0.15);
    box(b.w * 0.4, 0.5, 0.3, plankMat(b.wall, 2, 0.4), 0, ffH + 0.45, front + 0.12);
  }
  // placa
  if (b.name) {
    const sw = Math.min(b.w * 0.72, 9.5), sh = sw / 4;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: signTex(b.name, b.trim || '#e8d8b0'), roughness: 0.8 }));
    const sy = b.ff ? b.h + 0.7 : b.gable ? b.h - 0.9 : b.h + 1.2;
    sign.position.set(0, sy, front + (b.ff ? 0.29 : b.barn ? 0.45 : 0.03));
    g.add(sign);
    signs.push({ mat: sign.material, name: b.name, trim: b.trim || '#e8d8b0' });
  }
  // porta
  const doorY = 0.3 + 1.2;
  box(1.6, 2.5, 0.08, M('#1c120a'), 0, doorY, front + 0.04);
  if (b.id === 'saloon') {
    for (const s of [-1, 1]) box(0.72, 1.1, 0.06, M('#8a6040'), s * 0.38, doorY + 0.1, front + 0.12);
  } else if (!b.barn) {
    box(1.36, 2.3, 0.06, M(new THREE.Color(b.wall).multiplyScalar(0.55).getStyle()), 0, doorY - 0.05, front + 0.1);
  }
  // janelas
  const floors = b.two ? [1.9, 5.4] : [1.9];
  for (const fy of floors) {
    for (const s of [-1, 1]) {
      const wx = s * b.w * 0.3;
      if (Math.abs(wx) < 1.6 && fy < 3) continue;
      box(1.5, 1.6, 0.1, trimM, wx, fy, front + 0.05);
      box(1.25, 1.35, 0.06, windowMat, wx, fy, front + 0.1);
      box(0.08, 1.35, 0.1, trimM, wx, fy, front + 0.13);
      box(1.25, 0.08, 0.1, trimM, wx, fy, front + 0.13);
    }
  }
  // varanda de madeira
  const pw = b.w + 0.6;
  box(pw, 0.3, PORCH, plankMat('#8a6444', pw / 2.5, 1), 0, 0.15, front + PORCH / 2);
  const roofY = b.two ? 3.7 : 3.4;
  for (let i = 0; i <= 3; i++) {
    const px = -pw / 2 + 0.15 + (i / 3) * (pw - 0.3);
    box(0.16, roofY - 0.3, 0.16, darkWood, px, 0.3 + (roofY - 0.3) / 2, front + PORCH - 0.15);
  }
  const awning = box(pw, 0.12, PORCH + 0.3, roofMat(b.roof, pw / 3, 1), 0, roofY, front + PORCH / 2);
  if (!b.two) awning.rotation.x = 0.1;
  if (b.two) {
    for (let i = 0; i <= 12; i++) box(0.06, 0.8, 0.06, darkWood, -pw / 2 + (i / 12) * pw, roofY + 0.45, front + PORCH - 0.05);
    box(pw, 0.1, 0.1, darkWood, 0, roofY + 0.85, front + PORCH - 0.05);
    box(1.2, 2.2, 0.08, M('#1c120a'), 0, 5.0, front + 0.04);
  }
  // campanário
  if (b.steeple) {
    box(3, 5, 3, plankMat(b.wall, 1.2, 2), 0, b.h + 3.2, front - 1.8);
    const cone = add(new THREE.Mesh(new THREE.ConeGeometry(2.3, 4, 4), roofMat(b.roof, 2, 2)));
    cone.position.set(0, b.h + 7.7, front - 1.8); cone.rotation.y = Math.PI / 4;
    box(0.18, 1.6, 0.18, darkWood, 0, b.h + 10.4, front - 1.8);
    box(0.9, 0.18, 0.18, darkWood, 0, b.h + 10.7, front - 1.8);
    box(1.4, 1.4, 0.1, M('#1c120a'), 0, b.h + 3.8, front - 0.28);
  }
  scene.add(g);

  // mundo: colisão, varanda, porta
  const zFront = b.face > 0 ? -FRONT : FRONT;
  addCollider(b.x - b.w / 2, b.x + b.w / 2, b.z - b.d / 2, zFront + (b.face > 0 ? 0.3 : -0.3));
  porches.push({ x0: b.x - pw / 2, x1: b.x + pw / 2, z0: Math.min(zFront, zFront + b.face * PORCH), z1: Math.max(zFront, zFront + b.face * PORCH), h: 0.3 });
  b.doorX = b.x; b.doorZ = zFront + b.face * 1.4;
}

// Lampiões
const lamps = [];
function addLamp(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const post = new THREE.Mesh(geo('lampPost', () => new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6)), M('#2a2622'));
  post.position.y = 1.6; post.castShadow = true; g.add(post);
  const lan = new THREE.Mesh(geo('lantern', () => new THREE.BoxGeometry(0.28, 0.38, 0.28)), lanternMat);
  lan.position.y = 3.35; g.add(lan);
  const cap = new THREE.Mesh(geo('lanCap', () => new THREE.ConeGeometry(0.24, 0.2, 4)), M('#1a1a1a'));
  cap.position.y = 3.62; cap.rotation.y = Math.PI / 4; g.add(cap);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.set(2.6, 2.6, 1); glow.position.y = 3.35; g.add(glow);
  scene.add(g);
  lamps.push({ x, z, y: 3.35, glow });
  addCollider(x - 0.1, x + 0.1, z - 0.1, z + 0.1);
}

// ---------------------------------------------------------------------
// Adereços da cidade
// ---------------------------------------------------------------------
function addMesh(geom, mat, x, y, z, ry = 0, shadow = true) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z); m.rotation.y = ry;
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  scene.add(m);
  return m;
}
function barrel(x, z) {
  const y = floorY(x, z);
  addMesh(geo('barrel', () => new THREE.CylinderGeometry(0.33, 0.3, 0.9, 12)), plankMat('#8a5a32', 1.5, 0.4), x, y + 0.45, z);
  for (const hy of [0.18, 0.72]) addMesh(geo('hoop', () => new THREE.CylinderGeometry(0.345, 0.345, 0.05, 12)), M('#2a2a2a', { metalness: 0.6, roughness: 0.5 }), x, y + hy, z, 0, false);
  addCollider(x - 0.33, x + 0.33, z - 0.33, z + 0.33);
}
function crate(x, z, s = 0.8) {
  const y = floorY(x, z);
  addMesh(new THREE.BoxGeometry(s, s, s), plankMat('#a07a4c', 1, 1), x, y + s / 2, z, R(0, 1));
  addCollider(x - s / 2, x + s / 2, z - s / 2, z + s / 2);
}
function trough(x, z) {
  addMesh(new THREE.BoxGeometry(2.4, 0.6, 0.8), plankMat('#6a4424', 1, 0.3), x, 0.3, z);
  addMesh(new THREE.BoxGeometry(2.2, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: 0x3d5a66, roughness: 0.1, metalness: 0.3 }), x, 0.55, z, 0, false);
  addCollider(x - 1.2, x + 1.2, z - 0.4, z + 0.4);
  interactables.push({ x, z, r: 2.2, label: 'Lavar o rosto', fn: () => { sfx('drink'); toast('Água fresca', 'Você lavou o rosto na água do cocho.'); } });
}
function hitchPost(x, z) {
  for (const s of [-1, 1]) addMesh(geo('hp', () => new THREE.CylinderGeometry(0.07, 0.08, 1.1, 6)), M('#4a2e18'), x + s * 1.1, 0.55, z);
  addMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), M('#5a3a20'), x, 1.05, z).rotation.z = Math.PI / 2;
  addCollider(x - 1.2, x + 1.2, z - 0.1, z + 0.1);
}
function wagon(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.6), plankMat('#7a5230', 1, 1.5)); bed.position.y = 1.0; bed.castShadow = true; g.add(bed);
  // lona em arco: meio cilindro deitado ao longo da carroça
  const coverGeo = new THREE.CylinderGeometry(1.0, 1.0, 3.4, 16, 1, true, -Math.PI / 2, Math.PI);
  coverGeo.rotateX(-Math.PI / 2);
  const cover = new THREE.Mesh(coverGeo, M('#e8dcc0', { side: THREE.DoubleSide }));
  cover.position.y = 1.25; cover.castShadow = true;
  g.add(cover);
  for (const [wx, wz] of [[-1, -1.2], [1, -1.2], [-1, 1.2], [1, 1.2]]) {
    const wh = new THREE.Mesh(geo('wheel', () => new THREE.TorusGeometry(0.55, 0.06, 6, 16)), M('#3a2414'));
    wh.position.set(wx, 0.6, wz); wh.rotation.y = Math.PI / 2; wh.castShadow = true; g.add(wh);
    const hub = new THREE.Mesh(geo('hub', () => new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8)), M('#2a1a10')); hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.6, wz); g.add(hub);
    for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(geo('spoke', () => new THREE.BoxGeometry(0.04, 1.08, 0.04)), M('#3a2414')); sp.position.set(wx, 0.6, wz); sp.rotation.x = k * Math.PI / 4; g.add(sp); }
  }
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), M('#4a2e18')); tongue.position.set(0, 0.6, 2.8); g.add(tongue);
  scene.add(g);
  const c = Math.cos(ry), s = Math.sin(ry);
  const hx = Math.abs(c) * 1 + Math.abs(s) * 1.9, hz = Math.abs(s) * 1 + Math.abs(c) * 1.9;
  addCollider(x - hx, x + hx, z - hz, z + hz);
}
function waterTower(x, z) {
  for (const [lx, lz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) addMesh(geo('twLeg', () => new THREE.BoxGeometry(0.22, 6, 0.22)), M('#4a3020'), x + lx, 3, z + lz);
  addMesh(new THREE.CylinderGeometry(2.1, 2.1, 3, 16), plankMat('#7a5a3a', 4, 1), x, 7.5, z);
  addMesh(new THREE.ConeGeometry(2.4, 1.4, 16), roofMat('#4a3a2a', 3, 1), x, 9.7, z);
  addCollider(x - 1.5, x + 1.5, z - 1.5, z + 1.5);
}
function fenceLine(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 2.4));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t);
    addMesh(geo('fPost', () => new THREE.BoxGeometry(0.14, 1.3, 0.14)), M('#5a3a22'), x, floorY(x, z) + 0.65, z);
  }
  for (const ry of [0.55, 1.05]) {
    const rail = addMesh(new THREE.BoxGeometry(0.06, 0.12, len), M('#6a4628'), (x0 + x1) / 2, ry + floorY((x0 + x1) / 2, (z0 + z1) / 2), (z0 + z1) / 2, ang);
    rail.castShadow = true;
  }
  const steps = Math.ceil(len / 0.8);
  for (let i = 0; i <= steps; i++) { const t = i / steps, x = lerp(x0, x1, t), z = lerp(z0, z1, t); addCollider(x - 0.15, x + 0.15, z - 0.15, z + 0.15); }
}

const interactables = []; // {x,z,r,label,fn,f?}

// ---------------------------------------------------------------------
// Vegetação e pedras (instanciadas: muitas cópias, pouco custo)
// ---------------------------------------------------------------------
function farFromTown(x, z, pad) {
  if (Math.abs(x) < 118 + pad && Math.abs(z) < 55 + pad) return false;
  if (Math.abs(z - roadZ(x)) < 12 + pad) return false;
  return true;
}
function scatterInstanced(geom, mat, count, scaleMin, scaleMax, colR, yOff = 0, extra) {
  const inst = new THREE.InstancedMesh(geom, mat, count);
  inst.castShadow = true; inst.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  let i = 0, tries = 0;
  while (i < count && tries < count * 40) {
    tries++;
    const x = R(-WORLD + 10, WORLD - 10), z = R(-WORLD + 10, WORLD - 10);
    if (!farFromTown(x, z, 6)) continue;
    const sc = R(scaleMin, scaleMax);
    e.set(extra ? R(-0.3, 0.3) : 0, R(0, Math.PI * 2), extra ? R(-0.3, 0.3) : 0);
    q.setFromEuler(e); s.set(sc, sc * (extra ? R(0.5, 1) : 1), sc); p.set(x, height(x, z) + yOff * sc, z);
    m4.compose(p, q, s); inst.setMatrixAt(i, m4);
    if (colR) addCollider(x - colR * sc, x + colR * sc, z - colR * sc, z + colR * sc);
    i++;
  }
  inst.count = i;
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
  return inst;
}
(function nature() {
  // cacto saguaro: tronco + dois braços, fundidos numa geometria só
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.28, 0.34, 4, 10); trunk.translate(0, 2, 0); parts.push(trunk);
  const top = new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); top.translate(0, 4, 0); parts.push(top);
  for (const [s, hy, len] of [[1, 1.6, 1.4], [-1, 2.2, 1.1]]) {
    const hor = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8); hor.rotateZ(Math.PI / 2); hor.translate(s * 0.55, hy, 0); parts.push(hor);
    const up = new THREE.CylinderGeometry(0.2, 0.22, len, 8); up.translate(s * 0.9, hy + len / 2 - 0.1, 0); parts.push(up);
    const cap = new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2); cap.translate(s * 0.9, hy + len - 0.1, 0); parts.push(cap);
  }
  const cactusGeo = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  scatterInstanced(cactusGeo, new THREE.MeshStandardMaterial({ color: 0x5d7a3e, roughness: 0.8 }), Math.round(170 * Q.props), 0.7, 1.4, 0.35);

  // pedras
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) {
    v.fromBufferAttribute(rp, i);
    const k = 1 + Math.sin(v.x * 5.1 + v.y * 3.3) * 0.18 + Math.cos(v.z * 4.7 - v.y * 2.1) * 0.15;
    rp.setXYZ(i, v.x * k, v.y * k * 0.7, v.z * k);
  }
  rockGeo.computeVertexNormals();
  scatterInstanced(rockGeo, new THREE.MeshStandardMaterial({ color: 0x9a7a62, roughness: 0.95, flatShading: true }), Math.round(160 * Q.props), 0.5, 3.2, 0.7, 0.1, true);

  // arbustos secos
  const bushGeo = new THREE.IcosahedronGeometry(0.7, 0);
  bushGeo.scale(1, 0.6, 1);
  const bushes = scatterInstanced(bushGeo, new THREE.MeshStandardMaterial({ color: 0x8a8448, roughness: 1, flatShading: true }), Math.round(420 * Q.props), 0.5, 1.4, 0, 0.3);
  bushes.castShadow = false;

  // mesas e rochedos no horizonte (o cartão-postal do velho oeste)
  const mesaMat = new THREE.MeshStandardMaterial({ color: 0xa65a38, roughness: 1, flatShading: true });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x8e4a2e, roughness: 1, flatShading: true });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + R(-0.15, 0.15);
    const dist = R(380, 520);
    const x = Math.cos(a) * dist, z = Math.sin(a) * dist;
    const r = R(20, 55), h = R(35, 90);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r, h, 9, 3), mesaMat);
    m.position.set(x, height(x, z) + h / 2 - 2, z); m.rotation.y = R(0, 3); scene.add(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.78, 3, 9), capMat);
    cap.position.set(x, height(x, z) + h - 0.5, z); cap.rotation.y = m.rotation.y; scene.add(cap);
    if (rnd() < 0.5) {
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(R(3, 6), R(7, 10), h * R(0.6, 1.1), 7), mesaMat);
      const sx = x + Math.cos(a + 1.5) * (r + 25), sz = z + Math.sin(a + 1.5) * (r + 25);
      spire.position.set(sx, height(sx, sz) + spire.geometry.parameters.height / 2 - 2, sz); scene.add(spire);
    }
  }

  // árvores secas
  const treeMat = M('#4a3524');
  for (let i = 0; i < Math.round(26 * Q.props); i++) {
    let x, z, t = 0;
    do { x = R(-WORLD + 20, WORLD - 20); z = R(-WORLD + 20, WORLD - 20); t++; } while (!farFromTown(x, z, 8) && t < 50);
    const y = height(x, z);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = R(0, 6);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, 4, 6), treeMat); tr.position.y = 2; tr.castShadow = true; g.add(tr);
    for (let k = 0; k < 4; k++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, R(1.5, 2.6), 5), treeMat);
      br.position.set(0, R(2.5, 3.8), 0); br.rotation.set(R(0.5, 1.1), k * 1.6, 0); br.translateY(0.8); br.castShadow = true; g.add(br);
    }
    if (rnd() < 0.6) {
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), new THREE.MeshStandardMaterial({ color: 0x6f7a3e, roughness: 1, flatShading: true }));
      leaves.position.y = 4.4; leaves.scale.set(1.3, 0.8, 1.3); leaves.castShadow = true; g.add(leaves);
    }
    scene.add(g);
    addCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
  }
})();

// ---------------------------------------------------------------------
// Céu, sol, lua, estrelas e luzes
// ---------------------------------------------------------------------
const sky = new Sky();
sky.userData.dynamic = true;
sky.scale.setScalar(4500);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 7;
skyU.rayleigh.value = 2.2;
skyU.mieCoefficient.value = 0.006;
skyU.mieDirectionalG.value = 0.86;

const sun = new THREE.DirectionalLight(0xffe2c0, 3);
sun.castShadow = Q.shadow > 0;
sun.shadow.mapSize.set(Q.shadow || 1024, Q.shadow || 1024);
sun.shadow.camera.left = -32; sun.shadow.camera.right = 32; sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const moonLight = new THREE.DirectionalLight(0x8fa6d8, 0);
scene.add(moonLight); scene.add(moonLight.target);
const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x8a6440, 0.8);
scene.add(hemi);

const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4f0e0, fog: false }));
moon.userData.dynamic = true;
scene.add(moon);
const stars = (function () {
  const n = 1500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rnd(), vv = rnd() * 0.95;
    const th = u * Math.PI * 2, ph = Math.acos(1 - vv);
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * 2000; pos[i * 3 + 1] = Math.cos(ph) * 2000; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 2000;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(p);
  return p;
})();
// Poeira dourada flutuando no ar
const dust = (function () {
  const n = IS_TOUCH ? 160 : 320, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = R(-25, 25); pos[i * 3 + 1] = R(0, 8); pos[i * 3 + 2] = R(-25, 25); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe0b0, size: 0.045, map: dotTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(p);
  return p;
})();
// Luzes pontuais que "seguem" os lampiões mais próximos do jogador à noite
const lampLights = [];
for (let i = 0; i < Q.lights; i++) {
  const l = new THREE.PointLight(0xffb060, 0, 16, 1.6);
  scene.add(l); lampLights.push(l);
}
const muzzle = new THREE.PointLight(0xffc070, 0, 8, 2);
scene.add(muzzle);

const fogDay = new THREE.Color('#d3b690'), fogGold = new THREE.Color('#d9895a'), fogNight = new THREE.Color('#121626'), tmpC = new THREE.Color();
const sunDir = new THREE.Vector3();
let nightK = 0;
function updateSky() {
  const t = G.time;
  const dayAng = ((t - 6) / 12) * Math.PI;
  const elevRad = Math.sin(dayAng) * 1.05;
  const elev = THREE.MathUtils.radToDeg(elevRad);
  sunDir.set(-Math.cos(dayAng) * Math.cos(elevRad), Math.sin(elevRad), -0.32).normalize();
  skyU.sunPosition.value.copy(sunDir);
  const day = smoothstep(-8, 8, elev);
  const golden = smoothstep(-4, 3, elev) * (1 - smoothstep(6, 24, elev));
  nightK = 1 - smoothstep(-6, 4, elev);
  const starK = 1 - smoothstep(-12, -3, elev);

  sun.intensity = 3.2 * smoothstep(-1, 10, elev);
  sun.color.set('#ff9a50').lerp(tmpC.set('#fff3e2'), smoothstep(2, 35, elev));
  const P = anchor();
  sun.position.set(P.x + sunDir.x * 90, P.y + Math.max(sunDir.y, 0.05) * 90, P.z + sunDir.z * 90);
  sun.target.position.set(P.x, P.y, P.z);
  const moonDir = sunDir.clone().multiplyScalar(-1); moonDir.y = Math.abs(moonDir.y) * 0.8 + 0.25; moonDir.normalize();
  moonLight.intensity = 0.55 * nightK;
  moonLight.position.set(P.x + moonDir.x * 80, P.y + moonDir.y * 80, P.z + moonDir.z * 80);
  moonLight.target.position.set(P.x, P.y, P.z);
  moon.position.copy(camera.position).addScaledVector(moonDir, 2200);
  moon.visible = nightK > 0.05;

  hemi.intensity = lerp(0.22, 0.9, day);
  hemi.color.set('#40507a').lerp(tmpC.set('#bcd2f2'), day);
  hemi.groundColor.set('#1a1410').lerp(tmpC.set('#8a6440'), day);
  renderer.toneMappingExposure = lerp(0.62, 0.5, day) * (G.state === 'title' ? 1.05 : 1);

  tmpC.copy(fogNight).lerp(fogDay, day).lerp(fogGold, golden * 0.75);
  scene.fog.color.copy(tmpC);
  scene.fog.density = lerp(0.0045, 0.0032, day);
  stars.material.opacity = starK * 0.9;
  windowMat.emissiveIntensity = lerp(0, 1.4, 1 - smoothstep(-2, 10, elev));
  lanternMat.emissiveIntensity = lerp(0, 2.5, 1 - smoothstep(-2, 8, elev));
  for (const l of lamps) l.glow.material.opacity = (1 - smoothstep(-2, 8, elev)) * 0.85;
  dust.material.opacity = 0.05 + golden * 0.35;
}
let lampSortT = 0;
function updateLampLights(dt) {
  lampSortT -= dt;
  const lit = 1 - smoothstep(-2, 8, THREE.MathUtils.radToDeg(Math.asin(clamp(sunDir.y, -1, 1))));
  if (lampSortT <= 0) {
    lampSortT = 0.4;
    const P = anchor();
    const sorted = lamps.slice().sort((a, b) => (a.x - P.x) ** 2 + (a.z - P.z) ** 2 - ((b.x - P.x) ** 2 + (b.z - P.z) ** 2));
    lampLights.forEach((l, i) => { const s = sorted[i]; if (s) l.position.set(s.x, s.y - 0.1, s.z); });
  }
  const flick = 1 + Math.sin(performance.now() / 70) * 0.04;
  lampLights.forEach((l) => { l.intensity = 22 * lit * flick; });
}

// ---------------------------------------------------------------------
// Personagens (montados com formas simples)
// ---------------------------------------------------------------------
function capsule(r, len) { return geo(`cap${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10)); }
function createHuman(o) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
  const skin = M(o.skin), shirt = M(o.shirt), coat = M(o.coat), pants = M(o.pants || '#3b3a3a'), boots = M('#2a1c12');
  const meshes = [];
  const mk = (g, m, parent, x, y, z) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); meshes.push(mesh); return mesh; };
  const torso = mk(capsule(0.18, 0.34), shirt, hips, 0, 0.37, 0); torso.scale.set(1.12, 1, 0.72);
  const coatTop = mk(capsule(0.2, 0.3), coat, hips, 0, 0.4, -0.02); coatTop.scale.set(1.18, 1, 0.74);
  mk(geo('shirtFront', () => new THREE.BoxGeometry(0.14, 0.38, 0.04)), o.female ? coat : shirt, hips, 0, 0.42, 0.135);
  if (o.female) {
    mk(geo('skirt', () => new THREE.CylinderGeometry(0.19, 0.4, 0.95, 14)), coat, hips, 0, -0.4, 0);
  } else {
    const duster = mk(geo('duster', () => new THREE.CylinderGeometry(0.23, 0.3, 0.72, 12, 1, true)), M(o.coat, { side: THREE.DoubleSide }), hips, 0, 0.02, -0.01);
    duster.scale.z = 0.8;
    mk(geo('belt', () => new THREE.CylinderGeometry(0.205, 0.205, 0.06, 12)), M('#2a1a10'), hips, 0, 0.08, 0).scale.z = 0.74;
    mk(geo('holster', () => new THREE.BoxGeometry(0.07, 0.22, 0.12)), M('#3a2414'), hips, 0.22, -0.05, 0);
  }
  mk(geo('neck', () => new THREE.CylinderGeometry(0.055, 0.065, 0.12, 8)), skin, hips, 0, 0.68, 0);
  const head = new THREE.Group(); head.position.y = 0.82; hips.add(head);
  mk(geo('head', () => new THREE.SphereGeometry(0.115, 16, 12)), skin, head, 0, 0, 0).scale.set(0.95, 1.08, 1);
  mk(geo('nose', () => new THREE.BoxGeometry(0.03, 0.05, 0.04)), skin, head, 0, -0.01, 0.115);
  for (const s of [-1, 1]) mk(geo('eye', () => new THREE.SphereGeometry(0.014, 6, 4)), M('#1a0f08'), head, s * 0.042, 0.02, 0.1);
  const beard = mk(geo('beard', () => new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55)), M('#4a2e1a'), head, 0, -0.01, 0.02);
  beard.visible = !!o.beard;
  if (o.bandana) { const band = mk(geo('bandana', () => new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.32)), M(o.bandana), head, 0, 0.0, 0.01); band.scale.set(1.02, 1.1, 1.06); }
  if (o.female && !o.hat) mk(geo('hair', () => new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6)), M(o.hair || '#4a2e1a'), head, 0, 0.02, -0.01);
  const hatG = new THREE.Group(); hatG.position.y = 0.08; head.add(hatG);
  const hatMeshes = [];
  if (o.hat) {
    const hm = M(o.hat);
    if (o.female) {
      hatMeshes.push(mk(geo('bonnetBrim', () => new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16)), hm, hatG, 0, 0, 0.02));
      hatMeshes.push(mk(geo('bonnet', () => new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), hm, hatG, 0, 0, 0));
    } else {
      hatMeshes.push(mk(geo('brim', () => new THREE.CylinderGeometry(0.3, 0.3, 0.022, 20)), hm, hatG, 0, 0, 0));
      const crown = mk(geo('crown', () => new THREE.CylinderGeometry(0.12, 0.145, 0.16, 14)), hm, hatG, 0, 0.085, 0);
      crown.scale.z = 0.9; hatMeshes.push(crown);
      mk(geo('band', () => new THREE.CylinderGeometry(0.148, 0.148, 0.03, 14)), M('#1a120c'), hatG, 0, 0.03, 0).scale.z = 0.9;
    }
  }
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(side * 0.25, 0.56, 0); hips.add(sh);
    mk(capsule(0.055, 0.22), coat, sh, 0, -0.15, 0);
    const el = new THREE.Group(); el.position.y = -0.31; sh.add(el);
    mk(capsule(0.048, 0.2), coat, el, 0, -0.13, 0);
    const hand = new THREE.Group(); hand.position.y = -0.29; el.add(hand);
    mk(geo('hand', () => new THREE.SphereGeometry(0.048, 8, 6)), skin, hand, 0, 0, 0);
    return { sh, el, hand };
  }
  function leg(side) {
    const hp = new THREE.Group(); hp.position.set(side * 0.1, 0.02, 0); hips.add(hp);
    mk(capsule(0.075, 0.3), pants, hp, 0, -0.22, 0);
    const kn = new THREE.Group(); kn.position.y = -0.46; hp.add(kn);
    mk(capsule(0.064, 0.28), pants, kn, 0, -0.21, 0);
    mk(geo('boot', () => new THREE.BoxGeometry(0.12, 0.13, 0.27)), boots, kn, 0, -0.42, 0.05);
    return { hp, kn };
  }
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
  // revólver na mão direita (aparece ao mirar)
  const gun = new THREE.Group(); armR.hand.add(gun);
  const metal = M('#2b2b30', { metalness: 0.8, roughness: 0.35 });
  mk(geo('barrelG', () => new THREE.BoxGeometry(0.03, 0.2, 0.035)), metal, gun, 0, -0.1, 0.02);
  mk(geo('cyl', () => new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8)), metal, gun, 0, -0.02, 0.02);
  mk(geo('grip', () => new THREE.BoxGeometry(0.03, 0.06, 0.09)), M('#5a3a22'), gun, 0, 0.02, -0.03);
  gun.visible = false;
  return { root, body, hips, head, hatG, hatMeshes, beard, armL, armR, legL, legR, gun, meshes };
}
function poseHuman(h, p) {
  const move = p.move || 0; // 0 parado, 1 andando, 2 correndo
  const a = Math.min(move, 1) * 0.5 + Math.max(0, move - 1) * 0.35;
  const s = Math.sin(p.phase || 0);
  if (p.ride) {
    h.legL.hp.rotation.set(-1.2, 0, -0.32); h.legR.hp.rotation.set(-1.2, 0, 0.32);
    h.legL.kn.rotation.x = 1.3; h.legR.kn.rotation.x = 1.3;
    h.armL.sh.rotation.set(-0.7, 0, 0); h.armL.el.rotation.x = -0.7;
    h.armR.sh.rotation.set(-0.7, 0, 0); h.armR.el.rotation.x = -0.7;
    h.body.position.y = 0; h.hips.rotation.x = 0.05 + (p.lean || 0);
  } else if (p.sit) {
    h.legL.hp.rotation.set(-1.5, 0, 0); h.legR.hp.rotation.set(-1.5, 0, 0);
    h.legL.kn.rotation.x = 1.5; h.legR.kn.rotation.x = 1.5;
    h.armL.sh.rotation.set(-0.3, 0, 0); h.armR.sh.rotation.set(-0.3, 0, 0);
    h.body.position.y = -0.45; h.hips.rotation.x = 0;
  } else {
    h.legL.hp.rotation.set(-s * a, 0, 0); h.legR.hp.rotation.set(s * a, 0, 0);
    h.legL.kn.rotation.x = Math.max(0, Math.cos(p.phase || 0)) * a * 1.5 + 0.05;
    h.legR.kn.rotation.x = Math.max(0, -Math.cos(p.phase || 0)) * a * 1.5 + 0.05;
    h.armL.sh.rotation.set(s * a * 0.9, 0, 0.08); h.armL.el.rotation.x = -0.15 - a * 0.5;
    h.armR.sh.rotation.set(-s * a * 0.9, 0, -0.08); h.armR.el.rotation.x = -0.15 - a * 0.5;
    const breathe = Math.sin(performance.now() / 700) * 0.008;
    h.body.position.y = Math.abs(Math.cos(p.phase || 0)) * 0.035 * Math.min(move, 1.6) + breathe;
    h.hips.rotation.x = 0.14 * Math.max(0, move - 1);
  }
  if (p.kneel) {
    h.legL.hp.rotation.set(-1.6, 0, 0); h.legL.kn.rotation.x = 1.6;
    h.legR.hp.rotation.set(-0.2, 0, 0); h.legR.kn.rotation.x = 1.9;
    h.body.position.y = -0.42; h.hips.rotation.x = 0.35;
    h.armR.sh.rotation.set(-1.0 - Math.sin(performance.now() / 120) * 0.2, 0, 0); h.armR.el.rotation.x = -0.4;
  }
  if (p.tip) { h.armR.sh.rotation.set(-2.6, 0, 0.25); h.armR.el.rotation.x = -1.2; h.hatG.position.y = 0.08 + Math.sin(p.tip * Math.PI) * 0.05; }
  else h.hatG.position.y = 0.08;
  if (p.aim) {
    h.armR.sh.rotation.set(-Math.PI / 2 + (p.pitch || 0), 0.05, 0);
    h.armR.el.rotation.x = 0;
    h.armL.sh.rotation.set(-1.2, 0, 0.4); h.armL.el.rotation.x = -0.9;
  }
  h.gun.visible = !!p.aim;
}

function createHorse(o) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const coat = M(o.coat), dark = M(o.mane), hoofM = M('#1a120c');
  const mk = (g, m, parent, x, y, z) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh; };
  const barrel = mk(geo('hBarrel', () => { const g = new THREE.CapsuleGeometry(0.4, 1.05, 6, 14); g.rotateX(Math.PI / 2); return g; }), coat, body, 0, 1.33, 0);
  barrel.scale.set(0.82, 1, 1);
  mk(geo('hChest', () => new THREE.SphereGeometry(0.42, 14, 10)), coat, body, 0, 1.38, 0.62).scale.set(0.8, 1, 0.9);
  mk(geo('hRump', () => new THREE.SphereGeometry(0.44, 14, 10)), coat, body, 0, 1.4, -0.6).scale.set(0.86, 0.98, 0.95);
  const neck = new THREE.Group(); neck.position.set(0, 1.55, 0.78); neck.rotation.x = 0.68; body.add(neck);
  mk(geo('hNeck', () => new THREE.CylinderGeometry(0.16, 0.29, 0.95, 12)), coat, neck, 0, 0.42, 0).scale.z = 0.8;
  mk(geo('hMane', () => new THREE.BoxGeometry(0.07, 0.95, 0.14)), dark, neck, 0, 0.45, -0.17);
  const head = new THREE.Group(); head.position.y = 0.88; head.rotation.x = 0.95; neck.add(head);
  mk(geo('hHead', () => new THREE.CapsuleGeometry(0.13, 0.42, 4, 10)), coat, head, 0, 0.24, 0).scale.set(0.85, 1, 1);
  mk(geo('hMuzzle', () => new THREE.SphereGeometry(0.12, 10, 8)), M(new THREE.Color(o.coat).multiplyScalar(0.6).getStyle()), head, 0, 0.5, 0.02);
  for (const s of [-1, 1]) {
    mk(geo('hEar', () => new THREE.ConeGeometry(0.04, 0.14, 6)), coat, head, s * 0.07, 0.02, -0.12).rotation.x = -0.9;
    mk(geo('hEye', () => new THREE.SphereGeometry(0.025, 6, 4)), M('#0a0806'), head, s * 0.1, 0.12, 0.05);
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.55, -0.98); tail.rotation.x = 0.45; body.add(tail);
  mk(geo('hTail', () => new THREE.CapsuleGeometry(0.08, 0.6, 4, 8)), dark, tail, 0, -0.38, 0).scale.set(1, 1, 0.7);
  const legs = [];
  for (const [lx, lz, front] of [[-0.2, 0.62, 1], [0.2, 0.62, 1], [-0.2, -0.6, 0], [0.2, -0.6, 0]]) {
    const hp = new THREE.Group(); hp.position.set(lx, 1.18, lz); body.add(hp);
    mk(capsule(0.1, 0.36), coat, hp, 0, -0.26, 0);
    const kn = new THREE.Group(); kn.position.y = -0.56; hp.add(kn);
    mk(capsule(0.055, 0.42), coat, kn, 0, -0.26, 0);
    mk(geo('hoof', () => new THREE.CylinderGeometry(0.07, 0.085, 0.1, 8)), hoofM, kn, 0, -0.55, 0);
    legs.push({ hp, kn, front });
  }
  if (o.saddle) {
    mk(geo('blanket', () => new THREE.BoxGeometry(0.66, 0.05, 0.78)), M('#8a2a22'), body, 0, 1.72, 0.05);
    mk(geo('saddle', () => new THREE.BoxGeometry(0.46, 0.13, 0.6)), M('#5a3218'), body, 0, 1.8, 0.05);
    mk(geo('horn', () => new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6)), M('#3a2010'), body, 0, 1.92, 0.32);
    for (const s of [-1, 1]) {
      mk(geo('strap', () => new THREE.BoxGeometry(0.03, 0.5, 0.05)), M('#2a170b'), body, s * 0.35, 1.55, 0.08);
      mk(geo('bag', () => new THREE.BoxGeometry(0.12, 0.3, 0.3)), M('#6b4a2a'), body, s * 0.38, 1.6, -0.45);
    }
    mk(geo('bedroll', () => { const g = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 10); g.rotateZ(Math.PI / 2); return g; }), M('#b8a67a'), body, 0, 1.82, -0.42);
  }
  return { root, body, neck, head, tail, legs };
}
function poseHorse(h, phase, speed) {
  // speed: 0 parado, ~1 passo, ~2 trote, 3+ galope
  const g = clamp((speed - 1.2) / 1.8, 0, 1);
  const amp = speed < 0.05 ? 0 : lerp(0.3, 0.75, g);
  const offs = g > 0.3 ? [0, 0.14, 0.52, 0.64] : [0, 0.5, 0.75, 0.25];
  h.legs.forEach((l, i) => {
    const ph = phase + offs[i] * Math.PI * 2;
    l.hp.rotation.x = Math.sin(ph) * amp;
    const bend = Math.max(0, Math.sin(ph + 1.3)) * amp * 1.4;
    l.kn.rotation.x = l.front ? bend : -bend * 0.8;
  });
  h.body.rotation.x = Math.sin(phase) * 0.05 * g;
  h.body.position.y = Math.abs(Math.sin(phase)) * 0.1 * g + Math.abs(Math.sin(phase * 2)) * 0.02 * (1 - g) * Math.min(speed, 1);
  h.neck.rotation.x = 0.68 + Math.sin(phase * (g > 0.3 ? 1 : 2)) * lerp(0.04, 0.1, g) + (speed < 0.05 ? Math.sin(performance.now() / 1300) * 0.05 : 0);
  h.tail.rotation.x = 0.45 + g * 0.5 + Math.sin(performance.now() / 400) * 0.08;
  h.tail.rotation.z = Math.sin(performance.now() / 600) * 0.15;
}

// ---------------------------------------------------------------------
// Estado do jogo
// ---------------------------------------------------------------------
const G = {
  state: 'title', time: 17.2, day: 1, money: 12.5, ammo: 6, reserve: 36, reloading: 0,
  drunk: 0, menu: null, fading: false, muted: false, hatColor: '#2c2219', coatColor: '#4a3b2c', beard: true,
  bottleHits: 0, gotLetter: false, shake: 0, health: 100, lastHit: 99, wanted: 0, bounty: null, lock: null, valuables: {},
};

const player = {
  x: -55, z: 1, y: 0, heading: -Math.PI / 2, phase: 0, move: 0, mounted: false, aimT: 0, tipT: 0,
  h: createHuman({ skin: '#d9a47c', shirt: '#b9ad93', coat: G.coatColor, pants: '#3b3a3a', hat: G.hatColor, beard: true }),
};
scene.add(player.h.root);
player.h.root.userData.dynamic = true;
const horse = {
  name: 'Tempestade', x: -62, z: -5.2, y: 0, heading: Math.PI / 2, phase: 0, speed: 0, state: 'idle', stuck: 0,
  h: createHorse({ coat: '#6b3f22', mane: '#1e140c', saddle: true }),
};
scene.add(horse.h.root);
horse.h.root.userData.dynamic = true;

// ---------------------------------------------------------------------
// Monta a cidade
// ---------------------------------------------------------------------
BUILDINGS.forEach(makeBuilding);
for (let x = -86; x <= 58; x += 18) { addLamp(x, -7.6); addLamp(x + 9, 7.6); }
trough(-72, -6.4); hitchPost(-64, -6.9); trough(-46, 6.4); hitchPost(-38, 6.9); hitchPost(-26, -6.9);
barrel(-61.2, -9.6); barrel(-60.6, -8.9); barrel(-24.8, -9.4); crate(-24.5, -8.6, 0.7); crate(-39.5, -9.5);
barrel(-73.6, 9.6); barrel(-21, 9.4); crate(-55.5, 9.3); barrel(10.5, -9.5); crate(27, 9.4); barrel(47.5, 9.5);
wagon(-6, 3.6, Math.PI / 2 + 0.1);
wagon(62, -3, 0.4);
waterTower(-30, 26);
// curral atrás do estábulo com cavalos soltos
const CORRAL = { x0: -58, x1: -38, z0: 27, z1: 42 };
fenceLine(CORRAL.x0, CORRAL.z0, CORRAL.x0 + 7, CORRAL.z0); fenceLine(CORRAL.x0 + 11, CORRAL.z0, CORRAL.x1, CORRAL.z0);
fenceLine(CORRAL.x1, CORRAL.z0, CORRAL.x1, CORRAL.z1); fenceLine(CORRAL.x1, CORRAL.z1, CORRAL.x0, CORRAL.z1); fenceLine(CORRAL.x0, CORRAL.z1, CORRAL.x0, CORRAL.z0);
const corralHorses = [];
for (const [c, m] of [['#d8c8a8', '#f0e8d8'], ['#2a1c14', '#0a0806'], ['#8a5a3a', '#3a2418']]) {
  const hh = { x: R(CORRAL.x0 + 3, CORRAL.x1 - 3), z: R(CORRAL.z0 + 3, CORRAL.z1 - 3), heading: R(0, 6), phase: 0, speed: 0, tx: 0, tz: 0, wait: R(0, 4), h: createHorse({ coat: c, mane: m }) };
  scene.add(hh.h.root); hh.h.root.userData.dynamic = true; corralHorses.push(hh);
}
interactables.push({ x: (CORRAL.x0 + CORRAL.x1) / 2, z: CORRAL.z0 - 1, r: 3, label: 'Olhar os cavalos', fn: () => toast('Curral', pick(['Um cavalo branco relincha para você.', 'Os cavalos parecem bem cuidados.', 'Um potro curioso se aproxima da cerca.'])) });

// Estande de tiro: garrafas na cerca atrás do xerife
const bottles = [];
const RANGE_Z = 32, RANGE_X0 = -76, RANGE_X1 = -62;
fenceLine(RANGE_X0, RANGE_Z, RANGE_X1, RANGE_Z);
for (let i = 0; i < 8; i++) {
  const x = RANGE_X0 + 1 + i * ((RANGE_X1 - RANGE_X0 - 2) / 7);
  const col = ['#3f7a3a', '#6b4a1e', '#2f5a6b'][i % 3];
  const m = new THREE.Mesh(geo('bottle', () => { const g = mergeGeometries([new THREE.CylinderGeometry(0.06, 0.07, 0.24, 10).translate(0, 0.12, 0).toNonIndexed(), new THREE.CylinderGeometry(0.022, 0.05, 0.14, 8).translate(0, 0.31, 0).toNonIndexed()]); return g; }),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9 }));
  m.position.set(x, height(x, RANGE_Z) + 1.11, RANGE_Z); m.castShadow = true; m.userData.dynamic = true;
  scene.add(m);
  bottles.push({ mesh: m, alive: true, t: 0, color: col });
}
interactables.push({ x: (RANGE_X0 + RANGE_X1) / 2, z: RANGE_Z - 7, r: 4, label: 'Estande de tiro', fn: () => toast('Estande de tiro', IS_TOUCH ? 'Toque em 🔫 para atirar nas garrafas. A mira é automática.' : 'Segure o botão direito para mirar e clique para atirar.') });

// Moradores
const COATS = ['#5c4636', '#3e4a5a', '#6a3b2a', '#4b5a3a', '#6d6a5e', '#2d2a28', '#7a5c3a', '#5a3d52'];
const DRESSES = ['#7a3b3b', '#3b5a7a', '#6b6b3b', '#8a6a8a', '#3b6b5a', '#9a7a4a'];
const SKINS = ['#e0b08a', '#c68e62', '#a8714a', '#7d5236', '#f0c7a0'];
const HATS = ['#2c2219', '#5a4630', '#6d5c44', '#1b1b1b', '#8a7658'];
const NAMES = ['Sr. Hollis', 'Sra. Grimshaw', 'Jeb', 'Tilly', 'Velho Pete', 'Sr. Pearson', 'Sadie', 'Lenny', 'Sra. Adler', 'Bill', 'Charles', 'Mary-Beth', 'Sr. Strauss', 'Kieran'];
const GREETINGS = ['Bom dia, senhor.', 'Tarde boa pra cavalgar.', 'Como vai, forasteiro?', 'Deus o abençoe.', 'Belo chapéu!', 'Dizem que há ouro nas colinas.', 'Que calor, hein?', 'Bem-vindo a Vale Esperança.', 'Cuidado com os coiotes à noite.'];
const npcs = [];
function streetPoint() {
  const r = Math.random();
  if (r < 0.6) return { x: R(-90, 62), z: R(-6.5, 6.5) };
  const side = Math.random() < 0.5 ? -1 : 1;
  return { x: R(-78, 45), z: side * R(8.4, 10.6) };
}
for (let i = 0; i < Q.npcs; i++) {
  const female = Math.random() < 0.4;
  const p = streetPoint();
  const n = {
    x: p.x, z: p.z, heading: R(0, 6), phase: R(0, 6), move: 0, tx: p.x, tz: p.z, wait: R(0, 4), stuck: 0,
    name: NAMES[i % NAMES.length], talkCd: 0, alive: true, fall: 0, deadT: 0, speed: R(1.1, 1.5),
    h: createHuman({ female, skin: pick(SKINS), shirt: pick(['#d8ceb5', '#bfb39a', '#e6ddc8']), coat: female ? pick(DRESSES) : pick(COATS), pants: pick(['#3b3a3a', '#4b3a2a', '#5a5040']), hat: female ? (Math.random() < 0.5 ? pick(['#6b4a5a', '#3b3b5a', '#e8dcc0']) : null) : pick(HATS), beard: !female && Math.random() < 0.5 }),
  };
  scene.add(n.h.root); n.h.root.userData.dynamic = true;
  npcs.push(n);
}

// Bolas de feno rolando com o vento
const tumbleweeds = [];
for (let i = 0; i < 5; i++) {
  const g = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.5, 1)), new THREE.LineBasicMaterial({ color: 0x8a6a3a }));
  const inner = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.35, 1)), new THREE.LineBasicMaterial({ color: 0x6a4a2a }));
  g.add(inner);
  scene.add(g);
  tumbleweeds.push({ m: g, x: R(-150, 100), z: R(-30, 30), vx: R(2, 4), hop: R(0, 6) });
}

// ---------------------------------------------------------------------
// Áudio sintetizado
// ---------------------------------------------------------------------
let AC = null, MASTER = null;
function noiseBuf(dur) {
  const b = AC.createBuffer(1, Math.floor(AC.sampleRate * dur), AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  MASTER = AC.createGain(); MASTER.gain.value = G.muted ? 0 : 0.9; MASTER.connect(AC.destination);
  // vento ambiente
  const src = AC.createBufferSource(); src.buffer = noiseBuf(4); src.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 0.6;
  const g = AC.createGain(); g.gain.value = 0.035;
  src.connect(f).connect(g).connect(MASTER); src.start();
}
function tone(freq, dur, type, vol, when, slideTo) {
  const t = AC.currentTime + (when || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(MASTER); o.start(t); o.stop(t + dur + 0.05);
}
function sfx(kind, vol = 1) {
  if (!AC) return;
  const t = AC.currentTime;
  if (kind === 'shot') {
    const src = AC.createBufferSource(); src.buffer = noiseBuf(0.6);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.5);
    const g = AC.createGain(); g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    src.connect(f).connect(g).connect(MASTER); src.start(t);
    tone(90, 0.2, 'sine', 0.5, 0, 40);
    // eco no vale
    const e = AC.createBufferSource(); e.buffer = noiseBuf(0.8);
    const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 700;
    const eg = AC.createGain(); eg.gain.setValueAtTime(0.001, t); eg.gain.setValueAtTime(0.12, t + 0.35); eg.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    e.connect(ef).connect(eg).connect(MASTER); e.start(t);
  } else if (kind === 'glass') {
    const src = AC.createBufferSource(); src.buffer = noiseBuf(0.25);
    const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
    const g = AC.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(f).connect(g).connect(MASTER); src.start(t);
    tone(2400, 0.2, 'triangle', 0.08, 0.02); tone(3100, 0.15, 'triangle', 0.06, 0.05);
  } else if (kind === 'eshot') {
    const src = AC.createBufferSource(); src.buffer = noiseBuf(0.5);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(150, t + 0.4);
    const g = AC.createGain(); g.gain.setValueAtTime(0.6 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    src.connect(f).connect(g).connect(MASTER); src.start(t);
  } else if (kind === 'hurt') { tone(160, 0.25, 'sawtooth', 0.12, 0, 70);
  } else if (kind === 'coin') { tone(1318, 0.09, 'square', 0.05); tone(1760, 0.25, 'square', 0.05, 0.08); }
  else if (kind === 'whistle') { tone(1500, 0.18, 'sine', 0.15, 0, 2300); tone(1700, 0.35, 'sine', 0.15, 0.22, 2600); }
  else if (kind === 'neigh') { tone(700, 0.6, 'sawtooth', 0.04 * vol, 0, 400); tone(900, 0.4, 'sawtooth', 0.025 * vol, 0.1, 500); }
  else if (kind === 'drink') { for (let i = 0; i < 3; i++) tone(300 + i * 40, 0.08, 'sine', 0.1, i * 0.15, 200); }
  else if (kind === 'pickup') { tone(660, 0.08, 'triangle', 0.12); tone(990, 0.15, 'triangle', 0.1, 0.06); }
  else if (kind === 'click') tone(900, 0.03, 'square', 0.05);
  else if (kind === 'reload') { tone(300, 0.05, 'square', 0.07); tone(420, 0.05, 'square', 0.07, 0.3); tone(520, 0.05, 'square', 0.07, 0.6); }
  else if (kind === 'clop') { tone(180 + Math.random() * 40, 0.05, 'triangle', 0.06 * vol, 0, 90); }
  else if (kind === 'step') { tone(110 + Math.random() * 30, 0.04, 'sine', 0.035 * vol, 0, 60); }
  else if (kind === 'bell') { tone(523, 1.6, 'sine', 0.15); tone(1046, 1.2, 'sine', 0.05); }
  else if (kind === 'dice') { for (let i = 0; i < 6; i++) tone(1200 + Math.random() * 800, 0.03, 'square', 0.05, i * 0.07); }
  else if (kind === 'piano') {
    [262, 330, 392, 523, 392, 330, 294, 349, 440, 587, 440, 349, 262].forEach((n, i) => { tone(n, 0.35, 'triangle', 0.1, i * 0.16); tone(n / 2, 0.3, 'sine', 0.05, i * 0.16); });
  }
}

// ---------------------------------------------------------------------
// Interface (HUD, avisos, menus)
// ---------------------------------------------------------------------
function toast(title, text, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.innerHTML = `<div class="t">${title}</div>${text ? `<div class="d">${text}</div>` : ''}`;
  const box = $('toasts'); box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 4200);
}
let bannerT = null;
function banner(a, b) {
  const el = $('banner');
  el.innerHTML = `<div class="b1">${a}</div>${b ? `<div class="b2">${b}</div>` : ''}`;
  el.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('show'), 3000);
}
function fade(text, mid) {
  if (G.fading) return;
  G.fading = true;
  $('fadeText').textContent = text || ''; $('fade').classList.add('on');
  setTimeout(() => { mid && mid(); setTimeout(() => { $('fade').classList.remove('on'); G.fading = false; }, 1200); }, 1000);
}
function spend(v) { if (G.money + 1e-6 < v) { toast('Dinheiro insuficiente', `Você precisa de ${fmtMoney(v)}.`); return false; } G.money -= v; sfx('coin'); return true; }
function earn(v) { G.money += v; sfx('coin'); }
function advanceTime(h) { G.time += h; while (G.time >= 24) { G.time -= 24; G.day++; } }

let lastHud = '';
function updateHUD() {
  const h = Math.floor(G.time) % 24, m = Math.floor((G.time % 1) * 60);
  const clock = `Dia ${G.day} · ${String(h).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`;
  const ammo = G.reloading > 0 ? 'Recarregando…' : `${G.ammo} / ${G.reserve}`;
  const hp = Math.round(G.health);
  let obj = '';
  if (G.wanted > 0) obj = `<b>PROCURADO</b>Recompensa de ${fmtMoney(G.wanted)} pela sua cabeça. Pague no Xerife.`;
  else if (G.bounty && G.bounty.stage === 'hunt') obj = `<b>CAÇADA</b>Elimine ${G.bounty.name} (vermelho no minimapa).`;
  else if (G.bounty) obj = `<b>CAÇADA</b>Volte ao Xerife para receber ${fmtMoney(G.bounty.reward)}.`;
  const key = clock + G.money.toFixed(2) + ammo + hp + obj;
  if (key === lastHud) return;
  lastHud = key;
  $('hpFill').style.width = hp + '%';
  $('health').classList.toggle('low', hp < 35);
  $('objective').innerHTML = obj;
  $('clock').textContent = clock; $('money').textContent = fmtMoney(G.money);
  $('ammo').textContent = '🔫 ' + ammo; $('ammo').classList.toggle('low', G.ammo === 0);
}
let lastPrompts = '';
function renderPrompts(list) {
  const key = list.map((p) => p.key + p.label).join('|');
  if (key === lastPrompts) return;
  lastPrompts = key;
  $('prompts').innerHTML = list.map((p) => `<div class="prompt" data-key="Key${p.key}">${p.label} <span class="key">${p.key}</span></div>`).join('');
}

function openMenu(title, sub, options) {
  G.menu = { title, sub, options, sel: 0 };
  while (G.menu.sel < options.length - 1 && options[G.menu.sel].disabled) G.menu.sel++;
  renderMenu(); $('menu').hidden = false; document.body.classList.add('ui-open');
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeMenu() { G.menu = null; $('menu').hidden = true; document.body.classList.remove('ui-open'); }
function renderMenu() {
  const m = G.menu; if (!m) return;
  $('menuTitle').textContent = m.title;
  $('menuSub').innerHTML = `${m.sub} · Carteira: <b>${fmtMoney(G.money)}</b>`;
  $('menuList').innerHTML = m.options.map((o, i) => `<li class="${i === m.sel ? 'sel' : ''} ${o.disabled ? 'dis' : ''}" data-i="${i}"><span>${o.label}${o.desc ? `<span class="desc">${o.desc}</span>` : ''}</span><span class="price">${o.price ? fmtMoney(o.price) : ''}</span></li>`).join('');
}
function chooseMenu() {
  const m = G.menu; if (!m) return;
  const o = m.options[m.sel];
  if (!o || o.disabled) { sfx('click'); return; }
  if (o.price && !spend(o.price)) return;
  const keep = o.fn();
  if (keep && G.menu === m) { if (keep.options) m.options = keep.options; renderMenu(); }
  else if (G.menu === m) closeMenu();
}
$('menuList').addEventListener('click', (e) => { const li = e.target.closest('li'); if (!li || !G.menu) return; G.menu.sel = +li.dataset.i; chooseMenu(); });

const HAT_COLORS = [['Preto', '#1b1b1b'], ['Marrom', '#5a4630'], ['Areia', '#b8a070'], ['Branco', '#e8e0cc']];
const COAT_COLORS = [['Marrom', '#4a3b2c'], ['Cinza', '#5a5a58'], ['Azul-marinho', '#2e3a4e'], ['Vinho', '#5a2426']];
function setPlayerHat(c) { G.hatColor = c; player.h.hatMeshes.forEach((m) => { m.material = M(c); }); }
function setPlayerCoat(c) {
  const old = M(G.coatColor), oldD = M(G.coatColor, { side: THREE.DoubleSide });
  G.coatColor = c;
  player.h.meshes.forEach((m) => { if (m.material === old) m.material = M(c); else if (m.material === oldD) m.material = M(c, { side: THREE.DoubleSide }); });
}

function buildingMenu(b) {
  const close = { label: 'Sair', fn: () => false };
  switch (b.id) {
    case 'saloon': {
      const opts = () => [
        { label: 'Beber whisky', desc: 'Desce queimando. O mundo pode girar.', price: 1, fn: () => { sfx('drink'); G.drunk = clamp(G.drunk + 30, 0, 90); toast('Whisky', G.drunk > 50 ? 'O chão está se mexendo…' : 'Desce queimando.'); return { options: opts() }; } },
        { label: 'Beber cerveja', price: 0.5, fn: () => { sfx('drink'); G.drunk = clamp(G.drunk + 10, 0, 90); toast('Cerveja', 'Gelada… mais ou menos.'); return { options: opts() }; } },
        { label: 'Jogar dados', desc: 'Aposte $5. Maior soma de dois dados vence.', price: 5, fn: () => { playDice(); return { options: opts() }; } },
        { label: 'Tocar piano', fn: () => { sfx('piano'); if (Math.random() < 0.6) { const tip = Math.round(Math.random() * 100) / 100 + 0.25; earn(tip); toast('Aplausos!', `Gorjeta de ${fmtMoney(tip)}.`, 'gold'); } else toast('Silêncio', 'Alguém tossiu no fundo do salão.'); return false; } },
        close,
      ];
      openMenu('Saloon', 'Fumaça, whisky barato e um piano desafinado.', opts());
      break;
    }
    case 'hotel':
      openMenu('Hotel Vale Esperança', 'Quartos limpos. Quase sempre.', [
        { label: 'Dormir até o amanhecer', desc: 'Pula para as 7h do dia seguinte.', price: 2, fn: () => { fade('Dormindo…', () => { const add = (24 - G.time + 7) % 24 || 24; advanceTime(add); G.drunk = 0; G.beard = true; player.h.beard.visible = true; toast('Bom dia', 'Você acordou descansado. A barba cresceu.', 'good'); }); return false; } },
        { label: 'Cochilar até o pôr do sol', desc: 'Pula para as 17h30. Ótimo para ver o céu.', price: 1, fn: () => { fade('Cochilando…', () => { const add = (24 + 17.5 - G.time) % 24 || 24; advanceTime(add); G.drunk = 0; }); return false; } },
        { label: 'Tomar banho', price: 1, fn: () => { fade('Esfregando…', () => { advanceTime(0.5); toast('Limpinho', 'Você está cheiroso.', 'good'); }); return false; } },
        close,
      ]);
      break;
    case 'store': {
      const opts = () => [
        { label: 'Munição de revólver (12)', desc: `Você tem ${G.reserve} de reserva.`, price: 1, fn: () => { G.reserve += 12; toast('Comprado', 'Munição +12'); return { options: opts() }; } },
        (() => {
          const n = Object.values(G.valuables).reduce((a, b) => a + b, 0);
          const v = Object.entries(G.valuables).reduce((a, [k, q]) => a + (VALUABLES[k] || 0) * q, 0);
          return { label: `Vender objetos de valor (${n})`, desc: n ? Object.entries(G.valuables).map(([k, q]) => `${q}× ${k}`).join(', ') : 'Revistando corpos você encontra relógios e anéis.', disabled: n === 0, fn: () => { earn(v); G.valuables = {}; toast('Vendido', `O dono do armazém pagou ${fmtMoney(v)}.`, 'gold'); return { options: opts() }; } };
        })(),
        ...HAT_COLORS.map(([n, c]) => ({ label: `Chapéu ${n.toLowerCase()}`, desc: G.hatColor === c ? 'Você está usando este.' : 'Troca o seu chapéu.', disabled: G.hatColor === c, price: 3, fn: () => { setPlayerHat(c); toast('Chapéu novo', 'Elegante!', 'good'); return { options: opts() }; } })),
        ...COAT_COLORS.map(([n, c]) => ({ label: `Casaco ${n.toLowerCase()}`, desc: G.coatColor === c ? 'Você está usando este.' : 'Troca o seu casaco.', disabled: G.coatColor === c, price: 5, fn: () => { setPlayerCoat(c); toast('Casaco novo', 'Parece um pistoleiro de verdade.', 'good'); return { options: opts() }; } })),
        close,
      ];
      openMenu('Armazém Geral', 'Roupas, munição e mercadorias de Saint Denis.', opts());
      break;
    }
    case 'barber':
      openMenu('Barbearia', 'Uma navalha afiada e mãos… quase firmes.', [
        { label: G.beard ? 'Fazer a barba' : 'Aparar o bigode', desc: G.beard ? 'Tira a barba. Ela volta a crescer depois de dormir.' : 'Você já está barbeado.', price: 1, fn: () => { fade('Snip, snip…', () => { G.beard = false; player.h.beard.visible = false; advanceTime(0.3); toast('Barba feita', 'Que rosto bonito!', 'good'); }); return false; } },
        close,
      ]);
      break;
    case 'church':
      openMenu('Igreja', 'Um lugar de paz em terra sem lei.', [
        { label: 'Rezar', fn: () => { sfx('bell'); fade('Amém.', () => advanceTime(0.25)); return false; } },
        { label: 'Fazer doação', price: 1, fn: () => { toast('Obrigado, filho', 'O pastor agradece sua generosidade.', 'good'); return false; } },
        close,
      ]);
      break;
    case 'sheriff':
      {
        const opts = [];
        if (G.wanted > 0) opts.push({ label: 'Pagar a multa', desc: 'Limpe seu nome com a lei.', price: G.wanted, fn: () => { G.wanted = 0; toast('Nome limpo', 'Você não é mais procurado.', 'good'); return false; } });
        if (G.bounty && G.bounty.stage === 'return') opts.push({ label: `Entregar ${G.bounty.name}`, desc: 'Receber a recompensa.', fn: () => { const r = G.bounty.reward; earn(r); banner('RECOMPENSA RECEBIDA', `+${fmtMoney(r)}`); G.bounty = null; clearCamp(); return false; } });
        if (!G.bounty) opts.push({ label: 'Aceitar caçada de recompensa', desc: 'Bandidos armados num esconderijo fora da cidade. Eles atiram de volta!', fn: () => { startBounty(); return false; } });
        else if (G.bounty.stage === 'hunt') opts.push({ label: 'Desistir da caçada', fn: () => { G.bounty = null; clearCamp(); toast('Caçada cancelada', 'O xerife balança a cabeça.'); return false; } });
        opts.push({ label: 'Conversar com o xerife', fn: () => { toast('Xerife Malloy', pick(['"Garrafas lá atrás, se quiser treinar a mira."', '"Mire no peito. Na cabeça, se tiver coragem."', '"Ande a cavalo e em zigue-zague: fica difícil te acertar."', '"Atirou num inocente? Vai pagar por isso."'])); return false; } });
        opts.push(close);
        openMenu('Gabinete do Xerife', G.wanted > 0 ? 'O xerife te olha de cara feia.' : 'Cartazes de procurados cobrem a parede.', opts);
      }
      break;
    case 'stable':
      openMenu('Estábulo', `${horse.name} está com você há anos.`, [
        { label: `Escovar ${horse.name}`, desc: 'Deixe seu cavalo brilhando.', price: 0.25, fn: () => { sfx('neigh'); toast(horse.name, 'Brilhando como nunca!', 'good'); return false; } },
        { label: 'Alimentar com feno', price: 0.5, fn: () => { sfx('neigh'); toast(horse.name, 'Nham. Ele parece feliz.'); return false; } },
        close,
      ]);
      break;
    case 'post':
      openMenu('Correio', 'Cartas e telegramas.', [
        { label: 'Verificar correspondência', fn: () => { if (!G.gotLetter) { G.gotLetter = true; earn(5); toast('Carta', '"Devo-lhe $5. Aqui está. — Lenny"', 'gold'); } else toast('Correio', 'Nenhuma carta hoje.'); return false; } },
        close,
      ]);
      break;
    default:
      toast(b.id === 'bank' ? 'Banco' : 'Casa', b.id === 'bank' ? 'O banco está fechado. Volte amanhã.' : pick(['Ninguém atende.', 'Uma voz grita: "Vá embora!"', 'Está trancada.']));
  }
}
function playDice() {
  sfx('dice');
  const d = () => 1 + ((Math.random() * 6) | 0);
  const a = [d(), d()], b = [d(), d()], sa = a[0] + a[1], sb = b[0] + b[1];
  const face = (n) => '⚀⚁⚂⚃⚄⚅'[n - 1];
  let res;
  if (sa > sb) { res = 'Você venceu! +$10.00'; earn(10); } else if (sa === sb) { res = 'Empate.'; G.money += 5; } else res = 'O croupier venceu.';
  toast('Dados', `Você ${face(a[0])}${face(a[1])} (${sa}) · Croupier ${face(b[0])}${face(b[1])} (${sb}) — ${res}`, sa > sb ? 'gold' : '');
}

// Balões de fala projetados do 3D para a tela
const bubbles = [];
function say(ent, text, dur = 3) {
  for (const b of bubbles) if (b.ent === ent) { b.el.textContent = text; b.t = dur; return; }
  const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text;
  $('bubbles').appendChild(el);
  bubbles.push({ ent, el, t: dur });
}
const projV = new THREE.Vector3();
function updateBubbles(dt) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.t -= dt;
    if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; }
    const e = b.ent;
    const top = e === player && player.mounted ? 3.0 : 2.15;
    projV.set(e.x, (e.y || 0) + top, e.z);
    const d = projV.distanceTo(camera.position);
    projV.project(camera);
    if (projV.z > 1 || d > 35) { b.el.style.display = 'none'; continue; }
    b.el.style.display = '';
    b.el.style.opacity = clamp(b.t * 3, 0, 1);
    b.el.style.transform = `translate(${(projV.x * 0.5 + 0.5) * window.innerWidth}px, ${(-projV.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, -130%)`;
  }
}

// ---------------------------------------------------------------------
// Entrada: teclado, mouse e toque
// ---------------------------------------------------------------------
const keys = {};
let pressed = {};
const look = { yaw: player.heading + Math.PI, pitch: 0.22, lastInput: 0 };
const mouse = { right: false, dragging: false, lx: 0, ly: 0 };
const TOUCH = { joy: null, look: null };

window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
  if (G.state === 'title') { if (e.code === 'Enter' || e.code === 'Space') startGame(); return; }
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (G.menu) {
    const m = G.menu;
    const move = (d) => { let i = m.sel; for (let k = 0; k < m.options.length; k++) { i = (i + d + m.options.length) % m.options.length; if (!m.options[i].disabled) break; } m.sel = i; sfx('click'); renderMenu(); };
    if (e.code === 'ArrowUp' || e.code === 'KeyW') move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') move(1);
    else if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') chooseMenu();
    else if (e.code === 'Escape' || e.code === 'Backspace') closeMenu();
    pressed = {};
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.right = false; });

canvas.addEventListener('mousedown', (e) => {
  if (G.state !== 'play' || G.menu) return;
  if (e.button === 2) { mouse.right = true; return; }
  if (e.button !== 0) return;
  if (document.pointerLockElement === canvas || mouse.right) { pressed.Shoot = true; return; }
  mouse.dragging = true; mouse.lx = e.clientX; mouse.ly = e.clientY; mouse.moved = 0;
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 2) mouse.right = false;
  if (e.button === 0 && mouse.dragging) {
    mouse.dragging = false;
    // clique rápido sem arrastar: trava o mouse (estilo jogo de PC)
    if (mouse.moved < 6 && !IS_TOUCH && G.state === 'play' && !G.menu && canvas.requestPointerLock) {
      try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* sem trava */ }
    }
  }
});
window.addEventListener('mousemove', (e) => {
  if (G.state !== 'play' || G.menu) return;
  if (document.pointerLockElement === canvas) { rotateLook(e.movementX, e.movementY, 0.0024); }
  else if (mouse.dragging) {
    const dx = e.clientX - mouse.lx, dy = e.clientY - mouse.ly;
    mouse.moved += Math.abs(dx) + Math.abs(dy);
    rotateLook(dx, dy, 0.005); mouse.lx = e.clientX; mouse.ly = e.clientY;
  }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
function rotateLook(dx, dy, k) {
  look.yaw -= dx * k;
  look.pitch = clamp(look.pitch + dy * k, -0.35, 1.1);
  look.lastInput = performance.now();
}

// toque: esquerda = joystick, direita = girar câmera
const JOY_MAX = 55;
function showJoy() {
  const j = TOUCH.joy, base = $('joy'), knob = $('joyKnob');
  if (!j) { base.classList.remove('active'); base.style.left = ''; base.style.top = ''; knob.style.transform = ''; return; }
  base.classList.add('active'); base.style.left = j.ox + 'px'; base.style.top = j.oy + 'px';
  knob.style.transform = `translate(${j.vx * j.mag * JOY_MAX}px, ${j.vy * j.mag * JOY_MAX}px)`;
}
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (G.state !== 'play') return;
  for (const t of e.changedTouches) {
    if (!TOUCH.joy && t.clientX < window.innerWidth * 0.45) { TOUCH.joy = { id: t.identifier, ox: t.clientX, oy: t.clientY, vx: 0, vy: 0, mag: 0 }; showJoy(); }
    else if (!TOUCH.look) { TOUCH.look = { id: t.identifier, x: t.clientX, y: t.clientY }; $('lookHint').classList.add('gone'); }
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (TOUCH.joy && t.identifier === TOUCH.joy.id) {
      const j = TOUCH.joy;
      let dx = t.clientX - j.ox, dy = t.clientY - j.oy;
      const len = Math.hypot(dx, dy);
      if (len > JOY_MAX * 1.3) { j.ox = t.clientX - (dx / len) * JOY_MAX * 1.3; j.oy = t.clientY - (dy / len) * JOY_MAX * 1.3; dx = t.clientX - j.ox; dy = t.clientY - j.oy; }
      const l = Math.hypot(dx, dy) || 1;
      j.vx = dx / l; j.vy = dy / l; j.mag = Math.min(1, l / JOY_MAX);
      showJoy();
    } else if (TOUCH.look && t.identifier === TOUCH.look.id) {
      rotateLook(t.clientX - TOUCH.look.x, t.clientY - TOUCH.look.y, 0.0065);
      TOUCH.look.x = t.clientX; TOUCH.look.y = t.clientY;
    }
  }
}, { passive: false });
function endTouch(e) {
  for (const t of e.changedTouches) {
    if (TOUCH.joy && t.identifier === TOUCH.joy.id) { TOUCH.joy = null; showJoy(); }
    if (TOUCH.look && t.identifier === TOUCH.look.id) TOUCH.look = null;
  }
}
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
$('hud').addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-key]');
  if (!el || G.state !== 'play') return;
  e.preventDefault();
  pressed[el.dataset.key] = true;
  el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 120);
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------------------------------------------------------------------
// Interações
// ---------------------------------------------------------------------
// Saque de corpos (bandidos e moradores)
const VALUABLES = { 'Relógio de bolso': 3, 'Anel de ouro': 5, 'Dente de ouro': 2, 'Maço de cartas': 0.5 };
function lootable() {
  const list = [];
  for (const b of bandits) if (!b.alive && !b.looted) list.push(b);
  for (const n of npcs) if (n.alive === false && !n.looted) list.push(n);
  return list;
}
function lootBody(e) {
  if (e.looted) return;
  e.looted = true;
  player.lootT = 1.0;
  const bandit = e.kind === 'bandit';
  const cash = Math.round(R(bandit ? 2 : 0.3, bandit ? 9 : 3) * 100) / 100;
  const ammo = bandit ? 3 + Math.floor(Math.random() * 6) : Math.random() < 0.3 ? 2 : 0;
  const found = [];
  if (cash > 0) { earn(cash); found.push(fmtMoney(cash)); }
  if (ammo) { G.reserve += ammo; found.push(`${ammo} balas`); }
  const r = Math.random();
  const item = r < (bandit ? 0.18 : 0.08) ? 'Anel de ouro' : r < (bandit ? 0.45 : 0.25) ? 'Relógio de bolso' : r < (bandit ? 0.6 : 0.35) ? 'Dente de ouro' : r < 0.5 ? 'Maço de cartas' : null;
  if (item) { G.valuables[item] = (G.valuables[item] || 0) + 1; found.push(item.toLowerCase()); }
  sfx('pickup');
  toast('Corpo revistado', found.length ? `Você encontrou: ${found.join(', ')}.` + (item ? ' Venda objetos no Armazém.' : '') : 'Os bolsos estavam vazios.', 'gold');
}
function getInteraction() {
  if (player.mounted) {
    const near = lootable().some((e) => Math.hypot(horse.x - e.x, horse.z - e.z) < 4);
    return { e: { label: near ? 'Desmontar (para revistar o corpo)' : 'Desmontar', fn: dismount } };
  }
  let best = null, bd = 1e9;
  const consider = (d, max, info) => { if (d < max && d < bd) { bd = d; best = info; } };
  const labels = { saloon: 'Entrar no Saloon', hotel: 'Entrar no Hotel', store: 'Entrar no Armazém', bank: 'Entrar no Banco', barber: 'Entrar na Barbearia', church: 'Entrar na Igreja', sheriff: 'Falar com o Xerife', stable: 'Estábulo', post: 'Entrar no Correio', house: 'Bater na porta' };
  for (const b of BUILDINGS) consider(Math.hypot(player.x - b.doorX, player.z - b.doorZ), 2.2, { e: { label: labels[b.id], fn: () => buildingMenu(b) } });
  consider(Math.hypot(player.x - horse.x, player.z - horse.z) - 0.4, 2.6, { e: { label: `Montar ${horse.name}`, fn: mount }, f: { label: 'Acariciar', fn: petHorse } });
  for (const n of npcs) if (n.alive !== false) consider(Math.hypot(player.x - n.x, player.z - n.z), 2.2, { e: { label: `Cumprimentar ${n.name}`, fn: () => greet(n) } });
  // o corpo cai para trás: o ponto de revista fica no meio do corpo, não nos pés
  for (const e of lootable()) {
    const cx = e.x - Math.sin(e.heading) * 0.8, cz = e.z - Math.cos(e.heading) * 0.8;
    consider(Math.min(Math.hypot(player.x - cx, player.z - cz), Math.hypot(player.x - e.x, player.z - e.z)) - 0.3, 2.6, { e: { label: 'Revistar o corpo', fn: () => lootBody(e) } });
  }
  for (const it of interactables) consider(Math.hypot(player.x - it.x, player.z - it.z) + 0.3, it.r, { e: { label: it.label, fn: it.fn } });
  return best;
}
function mount() {
  player.mounted = true; horse.state = 'ridden';
  horse.h.body.add(player.h.root);
  player.h.root.position.set(0, 0.86, 0.02); player.h.root.rotation.set(0, 0, 0);
  sfx('neigh', 0.6);
}
function dismount() {
  const side = [[-1.2, 0], [1.2, 0], [0, -1.6], [0, 1.6]];
  const c = Math.cos(horse.heading), s = Math.sin(horse.heading);
  for (const [lx, lz] of side) {
    const x = horse.x + lx * c + lz * s, z = horse.z - lx * s + lz * c;
    if (!isBlocked(x, z, 0.35)) {
      player.mounted = false; horse.state = 'idle'; horse.speed = 0;
      scene.add(player.h.root); player.x = x; player.z = z; player.heading = horse.heading; return;
    }
  }
  toast('Sem espaço', 'Não dá para desmontar aqui.');
}
function petHorse() { sfx('neigh', 0.5); say(player, pick(['Bom garoto.', 'Calma, calma…', 'Isso aí, Tempestade.']), 2); }
function greet(n) {
  if (n.talkCd > 0) return;
  player.tipT = 0.8; n.talkCd = 4; n.wait = 3; n.tx = n.x; n.tz = n.z;
  n.heading = Math.atan2(player.x - n.x, player.z - n.z);
  say(player, pick(['Bom dia.', 'Senhor.', 'Senhora.', 'Como vai?']), 1.6);
  setTimeout(() => say(n, pick(GREETINGS)), 800);
}
function whistle() {
  sfx('whistle'); say(player, '*assobio*', 1.2);
  const d = Math.hypot(horse.x - player.x, horse.z - player.z);
  if (d > 120) {
    for (let k = 0; k < 16; k++) {
      const a = Math.random() * Math.PI * 2, x = player.x + Math.cos(a) * 40, z = player.z + Math.sin(a) * 40;
      if (!isBlocked(x, z, 0.9)) { horse.x = x; horse.z = z; break; }
    }
  }
  horse.state = 'coming'; horse.stuck = 0;
  setTimeout(() => sfx('neigh', 0.6), 700);
}

// ---------------------------------------------------------------------
// Tiro
// ---------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const shards = [];
for (let i = 0; i < 60; i++) {
  const m = new THREE.Mesh(geo('shard', () => new THREE.BoxGeometry(0.04, 0.04, 0.015)), glassMat);
  m.visible = false; m.userData.dynamic = true; scene.add(m);
  shards.push({ m, vx: 0, vy: 0, vz: 0, life: 0 });
}
let shardI = 0;
function breakBottle(b) {
  b.alive = false; b.t = 20; b.mesh.visible = false; sfx('glass');
  G.bottleHits++;
  for (let i = 0; i < 12; i++) {
    const s = shards[shardI++ % shards.length];
    s.m.visible = true; s.m.position.copy(b.mesh.position).add(new THREE.Vector3(0, 0.15, 0));
    s.vx = R(-2, 2); s.vy = R(1, 4); s.vz = R(-2, 2); s.life = 1.2;
    s.m.rotation.set(R(0, 6), R(0, 6), R(0, 6));
  }
  if (bottles.every((q) => !q.alive)) { earn(2); banner('PONTARIA PERFEITA', 'Todas as garrafas! +$2.00'); }
}
// ---------------------------------------------------------------------
// Combate: mira, balas, efeitos, bandidos e consequências
// ---------------------------------------------------------------------
const TMP = new THREE.Vector3(), TMP2 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// Rastro de bala (traçante)
const tracers = [];
for (let i = 0; i < 10; i++) {
  const m = new THREE.Mesh(geo('tracer', () => new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true)),
    new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.visible = false; m.userData.dynamic = true; scene.add(m);
  tracers.push({ m, t: 0 });
}
let tracerI = 0;
function spawnTracer(from, to, color) {
  const tr = tracers[tracerI++ % tracers.length];
  const len = from.distanceTo(to);
  if (len < 0.2) return;
  tr.m.position.copy(from).lerp(to, 0.5);
  tr.m.quaternion.setFromUnitVectors(UP, TMP.copy(to).sub(from).normalize());
  tr.m.scale.set(1, len, 1);
  tr.m.material.color.set(color || 0xffe6a0);
  tr.m.material.opacity = 0.9; tr.m.visible = true; tr.t = 0.09;
}
// Nuvens de poeira / sangue no ponto de impacto
const puffs = [];
for (let i = 0; i < 24; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xc8a878, transparent: true, opacity: 0, depthWrite: false }));
  s.visible = false; s.userData.dynamic = true; scene.add(s);
  puffs.push({ s, t: 0, max: 0.5, grow: 1 });
}
let puffI = 0;
function spawnPuff(pos, color, size = 0.5, life = 0.5) {
  for (let k = 0; k < 3; k++) {
    const p = puffs[puffI++ % puffs.length];
    p.s.position.copy(pos).add(TMP.set(R(-0.08, 0.08), R(0, 0.12), R(-0.08, 0.08)));
    p.s.material.color.set(color); p.s.material.opacity = 0.85;
    p.s.scale.setScalar(size * 0.3); p.grow = size; p.t = life * R(0.8, 1.2); p.max = p.t; p.s.visible = true;
  }
}
function updateEffects(dt) {
  for (const tr of tracers) if (tr.t > 0) { tr.t -= dt; tr.m.material.opacity = Math.max(0, tr.t / 0.09) * 0.9; if (tr.t <= 0) tr.m.visible = false; }
  for (const p of puffs) {
    if (p.t <= 0) continue;
    p.t -= dt;
    const k = 1 - p.t / p.max;
    p.s.scale.setScalar(p.grow * (0.3 + k * 0.9));
    p.s.material.opacity = (1 - k) * 0.85;
    p.s.position.y += dt * 0.3;
    if (p.t <= 0) p.s.visible = false;
  }
}
let hitmarkT = null;
function showHitmark(kill, sx, sy) {
  const el = $('hitmark');
  el.className = kill ? 'kill show' : 'show';
  el.style.left = (sx !== undefined ? sx : window.innerWidth / 2) + 'px';
  el.style.top = (sy !== undefined ? sy : window.innerHeight / 2) + 'px';
  clearTimeout(hitmarkT); hitmarkT = setTimeout(() => { el.className = ''; }, 180);
}

// Bandidos
const bandits = [];
const campMeshes = [];
const BOUNTY_SPOTS = [{ x: 175, z: -80 }, { x: -190, z: 85 }, { x: 75, z: 165 }, { x: -70, z: -175 }];
const OUTLAW_NAMES = ['"Dentuço" McGraw', 'Josiah "Cascavel" Trent', 'Big Jim Colby', 'Dutch Callahan', 'Mickey "Olho Torto" Reyes'];
const BANDIT_LINES = ['Um caçador de recompensas!', 'Peguem ele, rapazes!', 'Você não vai me levar vivo!', 'Fogo nele!'];
function makeBandit(x, z, leader) {
  const h = createHuman({ skin: pick(SKINS), shirt: '#7a6a5a', coat: leader ? '#2a2420' : pick(['#3a2a22', '#2d2a28', '#4a2f2a']), pants: '#2a2622', hat: leader ? '#1b1b1b' : pick(['#3a2a1a', '#2c2219']), bandana: '#8a1a1a', beard: true });
  h.root.userData.dynamic = true; scene.add(h.root);
  return { kind: 'bandit', x, z, y: height(x, z), heading: R(0, 6), phase: 0, move: 0, h, hp: leader ? 4 : 2, alive: true, alert: false, leader, shootT: R(1.2, 2.2), tx: 0, tz: 0, stuck: 0, fall: 0, looted: false, aimT: 0 };
}
function addCampMesh(m) { m.userData.dynamic = true; scene.add(m); campMeshes.push(m); return m; }
function startBounty() {
  let spot = pick(BOUNTY_SPOTS), sx = spot.x, sz = spot.z;
  for (let k = 0; k < 30 && isBlocked(sx, sz, 3); k++) { sx = spot.x + R(-12, 12); sz = spot.z + R(-12, 12); }
  const name = pick(OUTLAW_NAMES);
  const count = 2 + (Math.random() < 0.5 ? 1 : 0);
  G.bounty = { name, x: sx, z: sz, stage: 'hunt', reward: 20 + count * 10 };
  // acampamento: fogueira e barraca
  const y = height(sx, sz);
  for (let i = 0; i < 6; i++) { const log = addCampMesh(new THREE.Mesh(geo('log', () => new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6)), M('#3a2414'))); log.position.set(sx + Math.cos(i) * 0.2, y + 0.1, sz + Math.sin(i) * 0.2); log.rotation.set(Math.PI / 2, i, 0); }
  const flame = addCampMesh(new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 7), new THREE.MeshBasicMaterial({ color: 0xff8a2a })));
  flame.position.set(sx, y + 0.45, sz); flame.userData.flame = true;
  const glow = addCampMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a4a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })));
  glow.position.set(sx, y + 0.6, sz); glow.scale.set(4, 4, 1);
  const tent = addCampMesh(new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), M('#cdbf9a')));
  tent.position.set(sx + 4, y + 1.1, sz - 2); tent.rotation.y = 0.5; tent.castShadow = true;
  bandits.length = 0;
  for (let i = 0; i < count; i++) {
    let bx = sx + Math.cos(i * 2.1) * 3, bz = sz + Math.sin(i * 2.1) * 3;
    for (let k = 0; k < 20 && isBlocked(bx, bz, 0.4); k++) { bx += R(-1, 1); bz += R(-1, 1); }
    const b = makeBandit(bx, bz, i === 0);
    b.heading = Math.atan2(sx - bx, sz - bz);
    bandits.push(b);
  }
  banner('PROCURADO: ' + name.toUpperCase(), `Vivo ou morto · ${fmtMoney(G.bounty.reward)}`);
  toast('Caçada aceita', 'O esconderijo está marcado em vermelho no minimapa. Chame seu cavalo (H).', 'gold');
}
function clearCamp() {
  for (const m of campMeshes) scene.remove(m);
  campMeshes.length = 0;
  for (const b of bandits) scene.remove(b.h.root);
  bandits.length = 0;
}
function hasLOS(fx, fy, fz, tx, ty, tz) {
  TMP.set(fx, fy, fz); TMP2.set(tx - fx, ty - fy, tz - fz);
  const d = TMP2.length(); TMP2.normalize();
  raycaster.set(TMP, TMP2); raycaster.far = d;
  return raycaster.intersectObjects(blockers, false).length === 0;
}
function updateBandits(dt) {
  const A = anchor();
  for (const b of bandits) {
    if (!b.alive) {
      b.fall = Math.min(1, b.fall + dt * 3);
      b.h.root.rotation.x = -b.fall * Math.PI / 2;
      b.h.root.position.y = b.y + b.fall * 0.12;
      continue;
    }
    const d = Math.hypot(A.x - b.x, A.z - b.z);
    b.aimT = Math.max(0, b.aimT - dt);
    if (!b.alert && d < 40) {
      for (const q of bandits) q.alert = true;
      if (b.leader || bandits.every((q) => !q.leader || !q.alive)) say(b, pick(BANDIT_LINES), 2.5);
    }
    if (b.alert && d < 90) {
      if (!b.tx || Math.hypot(b.tx - b.x, b.tz - b.z) < 0.8 || b.stuck > 1.2) {
        const a = Math.atan2(b.x - A.x, b.z - A.z) + R(-0.9, 0.9);
        const want = clamp(d, 12, 22);
        b.tx = A.x + Math.sin(a) * want; b.tz = A.z + Math.cos(a) * want; b.stuck = 0;
      }
      const dx = b.tx - b.x, dz = b.tz - b.z, dd = Math.hypot(dx, dz) || 1;
      const moved = moveCircle(b, (dx / dd) * 3.2 * dt, (dz / dd) * 3.2 * dt, 0.3);
      b.stuck = moved ? 0 : b.stuck + dt;
      b.move = lerp(b.move, 1.4, clamp(dt * 5, 0, 1));
      b.phase += dt * 9;
      // encara o jogador enquanto atira
      b.heading += angDiff(b.heading, Math.atan2(A.x - b.x, A.z - b.z)) * clamp(dt * 8, 0, 1);
      b.shootT -= dt;
      if (b.shootT <= 0 && d < 45 && G.state === 'play' && !G.fading) {
        b.shootT = R(1.3, 2.5);
        const tyA = (A.y || 0) + (player.mounted ? 2.2 : 1.3);
        if (hasLOS(b.x, b.y + 1.5, b.z, A.x, tyA, A.z)) banditShoot(b, d);
      }
    } else b.move = lerp(b.move, 0, clamp(dt * 5, 0, 1));
    b.y = height(b.x, b.z);
    b.h.root.position.set(b.x, b.y, b.z);
    b.h.root.rotation.y = b.heading;
    poseHuman(b.h, { phase: b.phase, move: b.move, aim: b.alert && b.aimT > 0 || (b.alert && d < 45), pitch: 0 });
  }
  const flame = campMeshes.find((m) => m.userData.flame);
  if (flame) { const s = 1 + Math.sin(performance.now() / 90) * 0.12; flame.scale.set(s, 1 + Math.sin(performance.now() / 70) * 0.18, s); }
}
function banditShoot(b, d) {
  b.aimT = 0.6;
  const hand = new THREE.Vector3(); b.h.armR.hand.getWorldPosition(hand);
  const A = anchor();
  const moving = player.mounted ? horse.speed > 6 : player.move > 1.2;
  let chance = clamp(0.72 - d * 0.014 - (moving ? 0.22 : 0), 0.12, 0.65);
  const target = new THREE.Vector3(A.x, (A.y || 0) + (player.mounted ? 2.2 : 1.3), A.z);
  const hit = Math.random() < chance;
  if (!hit) target.add(TMP.set(R(-1.3, 1.3), R(-0.4, 0.9), R(-1.3, 1.3)));
  spawnTracer(hand, target, 0xffc080);
  const vol = clamp(1 - d / 70, 0.25, 1);
  sfx('eshot', vol);
  if (hit) hurtPlayer(14);
  else spawnPuff(new THREE.Vector3(target.x, height(target.x, target.z) + 0.05, target.z), 0xc8a878, 0.4, 0.4);
}
function hurtPlayer(dmg) {
  G.health -= dmg; G.lastHit = 0; G.shake = 0.2; sfx('hurt');
  const el = $('hurt'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  if (G.health <= 0) die();
}
function die() {
  if (G.fading) return;
  G.health = 0;
  fade('VOCÊ MORREU', () => {
    const lost = Math.round(G.money * 0.2 * 100) / 100;
    G.money -= lost; G.health = 100;
    if (player.mounted) { player.mounted = false; horse.state = 'idle'; scene.add(player.h.root); }
    const hotel = BUILDINGS.find((b) => b.id === 'hotel');
    player.x = hotel.doorX; player.z = hotel.doorZ + 2.5;
    look.yaw = player.heading + Math.PI;
    for (const b of bandits) if (b.alive) { b.alert = false; b.hp = b.leader ? 4 : 2; }
    advanceTime(4);
    toast('Você sobreviveu… por pouco', lost > 0 ? `O médico cobrou ${fmtMoney(lost)}.` : 'Você acordou na frente do hotel.');
  });
}
function banditDown(b) {
  b.alive = false; b.fall = 0;
  if (!G.lootTip) { G.lootTip = true; setTimeout(() => toast('Dica', 'Chegue perto do corpo e toque em "Revistar o corpo" para pegar dinheiro, balas e objetos.'), 1200); }
  if (b.leader && G.bounty) {
    G.bounty.stage = 'return';
    say(player, 'Fim da linha.', 2);
    toast('Alvo eliminado', `${G.bounty.name} está morto. Volte ao Xerife para receber.`, 'gold');
  }
}
function killNPC(n) {
  n.alive = false; n.fall = 0; n.deadT = 0;
  G.wanted += 15;
  toast('Crime testemunhado', `Você matou ${n.name}. Há uma recompensa de ${fmtMoney(G.wanted)} pela sua cabeça — pague no Xerife.`);
  for (const q of npcs) if (q.alive && Math.hypot(q.x - n.x, q.z - n.z) < 40) { q.flee = 10; if (Math.random() < 0.4) say(q, pick(['Assassino!', 'Socorro! Xerife!', 'Corram!']), 2); }
}

// Mira: acha o alvo mais perto do centro da tela (celular) — nunca moradores
function targetPoint(t) {
  if (t.kind === 'bottle') return TMP2.copy(t.mesh.position).add(TMP.set(0, 0.15, 0)).clone();
  return new THREE.Vector3(t.x, t.y + 1.25, t.z);
}
const camFwd = new THREE.Vector3();
let lockT = 0;
function updateLock(dt) {
  lockT -= dt;
  if (lockT > 0) return;
  lockT = 0.1;
  G.lock = null;
  if (!IS_TOUCH || G.state !== 'play' || G.menu) return;
  camera.getWorldDirection(camFwd);
  const cands = [];
  for (const b of bandits) if (b.alive) cands.push({ t: b, hostile: true, max: 55 });
  for (const b of bottles) if (b.alive) { b.kind = 'bottle'; cands.push({ t: b, hostile: false, max: 32 }); }
  const scored = [];
  for (const c of cands) {
    const p = targetPoint(c.t);
    TMP.copy(p).sub(camera.position);
    const d = TMP.length();
    if (d > c.max + 5) continue;
    const ang = Math.acos(clamp(TMP.normalize().dot(camFwd), -1, 1));
    if (ang > 0.55) continue;
    scored.push({ c, p, score: ang + d * 0.004 - (c.hostile ? 0.35 : 0) });
  }
  scored.sort((a, b) => a.score - b.score);
  for (const s of scored.slice(0, 4)) {
    if (hasLOS(camera.position.x, camera.position.y, camera.position.z, s.p.x, s.p.y, s.p.z)) { G.lock = s.c.t; G.lockHostile = s.c.hostile; break; }
  }
}
function drawLock() {
  const el = $('lock');
  if (!G.lock) { el.className = ''; return; }
  const p = targetPoint(G.lock).project(camera);
  if (p.z > 1) { el.className = ''; return; }
  el.className = 'show' + (G.lockHostile ? ' hostile' : '');
  el.style.left = ((p.x * 0.5 + 0.5) * window.innerWidth) + 'px';
  el.style.top = ((-p.y * 0.5 + 0.5) * window.innerHeight) + 'px';
}

// Teste de acerto em pessoas: corpo como uma "coluna" de esferas
function rayHitHuman(ray, e, maxD) {
  let best = null;
  for (let h = 0.3; h <= 1.8; h += 0.15) {
    TMP.set(e.x, e.y + h, e.z);
    const along = TMP.clone().sub(ray.origin).dot(ray.direction);
    if (along < 0.5 || along > maxD) continue;
    const r = h > 1.55 ? 0.17 : 0.3;
    if (ray.distanceSqToPoint(TMP) < r * r && (!best || along < best.along)) best = { along, head: h > 1.55 };
  }
  return best;
}
const groundRef = window.__groundMesh;
groundRef.userData.dynamic = true; // fica fora do agrupamento (usado nos impactos)
function shoot() {
  if (G.reloading > 0 || player.aimT > 0.62) return;
  if (G.ammo <= 0) { sfx('click'); startReload(); return; }
  G.ammo--;
  player.aimT = 0.9; G.shake = 0.12;
  sfx('shot');
  const hand = new THREE.Vector3(); player.h.armR.hand.getWorldPosition(hand);
  muzzle.position.copy(hand); muzzle.intensity = 40;
  spawnPuff(hand, 0xfff0c0, 0.25, 0.12);
  G.shotsFired = (G.shotsFired || 0) + 1;

  const from = camera.position.clone();
  let dir;
  const lock = IS_TOUCH ? G.lock : null;
  if (lock) {
    const tp = targetPoint(lock);
    player.heading = Math.atan2(tp.x - player.x, tp.z - player.z);
    const d = tp.distanceTo(from);
    const moving = player.mounted ? horse.speed > 6 : player.move > 1.2;
    const chance = clamp(0.97 - d * 0.006 - (moving ? 0.12 : 0) - G.drunk / 250, 0.45, 0.97);
    if (Math.random() > chance) tp.add(TMP.set(R(-0.9, 0.9), R(-0.5, 0.7), R(-0.9, 0.9)));
    dir = tp.sub(from).normalize();
  } else {
    const spread = (mouse.right ? 0.0015 : IS_TOUCH ? 0.01 : 0.006) + G.drunk / 3000;
    raycaster.setFromCamera(new THREE.Vector2(R(-spread, spread), R(-spread, spread)), camera);
    dir = raycaster.ray.direction.clone();
    if (IS_TOUCH && !G.tipShown) { G.tipShown = true; toast('Dica de mira', 'Gire a câmera até o alvo: um círculo aparece em cima de quem você vai acertar.'); }
  }
  raycaster.set(from, dir); raycaster.far = 150;
  const walls = raycaster.intersectObjects(groundRef ? blockers.concat([groundRef]) : blockers, false);
  const wallD = walls.length ? walls[0].distance : 150;
  let best = { d: wallD, kind: walls.length ? 'wall' : 'none', point: walls.length ? walls[0].point : from.clone().addScaledVector(dir, 150) };
  // garrafas (com uma leve ajuda de mira)
  for (const b of bottles) {
    if (!b.alive) continue;
    const c = TMP2.copy(b.mesh.position); c.y += 0.15;
    const along = c.clone().sub(from).dot(dir);
    if (along < 0 || along > best.d) continue;
    const tol = 0.12 + along * 0.004;
    if (raycaster.ray.distanceSqToPoint(c) < tol * tol) best = { d: along, kind: 'bottle', t: b, point: c.clone() };
  }
  for (const b of bandits) if (b.alive) { const h = rayHitHuman(raycaster.ray, b, best.d); if (h) best = { d: h.along, kind: 'bandit', t: b, head: h.head }; }
  for (const n of npcs) if (n.alive) { const h = rayHitHuman(raycaster.ray, n, best.d); if (h) best = { d: h.along, kind: 'npc', t: n, head: h.head }; }
  if (!best.point || best.kind === 'bandit' || best.kind === 'npc') best.point = from.clone().addScaledVector(dir, best.d);

  spawnTracer(hand, best.point);
  const scr = best.point.clone().project(camera);
  const sx = (scr.x * 0.5 + 0.5) * window.innerWidth, sy = (-scr.y * 0.5 + 0.5) * window.innerHeight;
  if (best.kind === 'bottle') { breakBottle(best.t); showHitmark(false, sx, sy); }
  else if (best.kind === 'bandit') {
    const b = best.t;
    b.hp -= best.head ? 4 : 1.5; b.alert = true; for (const q of bandits) q.alert = true;
    spawnPuff(best.point, 0x8a1010, 0.35, 0.5);
    if (b.hp <= 0) { banditDown(b); showHitmark(true, sx, sy); if (best.head) toast('Tiro na cabeça!', '', 'gold'); }
    else showHitmark(false, sx, sy);
  } else if (best.kind === 'npc') {
    spawnPuff(best.point, 0x8a1010, 0.35, 0.5);
    killNPC(best.t); showHitmark(true, sx, sy);
  } else if (best.kind === 'wall') {
    spawnPuff(best.point, walls[0].object === groundRef ? 0xc8a878 : 0x9a7a58, 0.45, 0.5);
  }
  if (best.kind !== 'npc') for (const n of npcs) if (n.alive && Math.hypot(n.x - player.x, n.z - player.z) < 12 && Math.random() < 0.5) { say(n, pick(['Cuidado com isso!', 'Ei! Guarde essa arma!', 'Jesus!']), 2); n.flee = 3; }
  if (G.ammo === 0 && G.reserve > 0) setTimeout(startReload, 350);
}
function startReload() {
  if (G.reloading > 0 || G.ammo >= 6 || G.reserve <= 0) { if (G.reserve <= 0 && G.ammo === 0) toast('Sem munição', 'Compre mais no Armazém.'); return; }
  G.reloading = 1.5; sfx('reload');
}

// ---------------------------------------------------------------------
// Atualização
// ---------------------------------------------------------------------
function anchor() { return player.mounted ? horse : player; }
let stepAcc = 0;
function updatePlayer(dt) {
  const blocked = !!G.menu || G.fading;
  let fwd = 0, right = 0, run = false;
  if (!blocked) {
    if (keys.KeyW || keys.ArrowUp) fwd += 1;
    if (keys.KeyS || keys.ArrowDown) fwd -= 1;
    if (keys.KeyD || keys.ArrowRight) right += 1;
    if (keys.KeyA || keys.ArrowLeft) right -= 1;
    run = keys.ShiftLeft || keys.ShiftRight;
    if (TOUCH.joy && TOUCH.joy.mag > 0.15) { fwd = -TOUCH.joy.vy * TOUCH.joy.mag; right = TOUCH.joy.vx * TOUCH.joy.mag; run = TOUCH.joy.mag > 0.92; }
  }
  const mag = Math.min(1, Math.hypot(fwd, right));
  const fx = -Math.sin(look.yaw), fz = -Math.cos(look.yaw), rx = Math.cos(look.yaw), rz = -Math.sin(look.yaw);
  let mx = fx * fwd + rx * right, mz = fz * fwd + rz * right;
  const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
  if (G.drunk > 30) { const w = Math.sin(performance.now() / 500) * G.drunk / 200; const c = Math.cos(w), s = Math.sin(w); [mx, mz] = [mx * c - mz * s, mx * s + mz * c]; }
  const aiming = !IS_TOUCH && mouse.right && !blocked;

  if (player.mounted) {
    const target = mag > 0.1 ? (run ? 13 : mag > 0.6 ? 6 : 2.5) : 0;
    horse.speed = lerp(horse.speed, target, clamp(dt * (target > horse.speed ? 1.4 : 3), 0, 1));
    if (mag > 0.1) {
      const want = Math.atan2(mx, mz);
      const turnRate = lerp(3.2, 1.8, clamp(horse.speed / 13, 0, 1));
      horse.heading += clamp(angDiff(horse.heading, want), -turnRate * dt, turnRate * dt);
    }
    const vx = Math.sin(horse.heading) * horse.speed * dt, vz = Math.cos(horse.heading) * horse.speed * dt;
    const moved = moveCircle(horse, vx, vz, 0.8);
    if (!moved && horse.speed > 4) { horse.speed *= 0.3; G.shake = 0.15; sfx('neigh', 0.5); }
    horse.phase += dt * lerp(4, 11, clamp(horse.speed / 13, 0, 1)) * (horse.speed > 0.1 ? 1 : 0);
    // câmera acompanha o cavalo sozinha quando você não mexe nela
    if (performance.now() - look.lastInput > 1500 && horse.speed > 2) look.yaw += angDiff(look.yaw, horse.heading + Math.PI) * clamp(dt * 1.5, 0, 1);
    player.x = horse.x; player.z = horse.z; player.y = horse.y;
    stepAcc += horse.speed * dt;
    if (stepAcc > (horse.speed > 8 ? 1.6 : 1.1)) { stepAcc = 0; sfx('clop', horse.speed > 8 ? 1 : 0.6); }
  } else {
    const speed = mag > 0.1 ? (run ? 5.2 : 1.8 + mag * 0.8) : 0;
    player.move = lerp(player.move, mag > 0.1 ? (run ? 2 : 1) : 0, clamp(dt * 8, 0, 1));
    if (mag > 0.1) {
      moveCircle(player, mx * speed * dt, mz * speed * dt, 0.3);
      if (!aiming) player.heading += angDiff(player.heading, Math.atan2(mx, mz)) * clamp(dt * 10, 0, 1);
      player.phase += dt * (run ? 11 : 7);
      stepAcc += speed * dt;
      if (stepAcc > (run ? 1.6 : 1.3)) { stepAcc = 0; sfx('step', run ? 1 : 0.6); }
    }
    if (aiming || player.aimT > 0) player.heading += angDiff(player.heading, look.yaw + Math.PI) * clamp(dt * 14, 0, 1);
  }
  player.aimT = Math.max(0, player.aimT - dt);
  player.tipT = Math.max(0, player.tipT - dt);
  player.lootT = Math.max(0, (player.lootT || 0) - dt);
  if (G.reloading > 0) { G.reloading -= dt; if (G.reloading <= 0) { const n = Math.min(6 - G.ammo, G.reserve); G.ammo += n; G.reserve -= n; G.reloading = 0; } }

  // aplica ao modelo
  if (player.mounted) {
    poseHuman(player.h, { ride: true, lean: horse.speed > 8 ? 0.25 : 0, aim: aiming || player.aimT > 0, pitch: look.pitch - 0.2 });
  } else {
    player.y = floorY(player.x, player.z);
    player.h.root.position.set(player.x, player.y, player.z);
    player.h.root.rotation.y = player.heading;
    poseHuman(player.h, { kneel: player.lootT > 0, phase: player.phase, move: player.lootT > 0 ? 0 : player.move, aim: aiming || player.aimT > 0, pitch: look.pitch - 0.2, tip: player.tipT > 0 ? 1 - player.tipT / 0.8 : 0 });
  }
  $('cross').classList.toggle('aim', aiming);
  $('cross').classList.toggle('dim', IS_TOUCH && !!G.lock);
  return aiming;
}
function updateHorse(dt) {
  if (horse.state === 'coming') {
    const d = Math.hypot(player.x - horse.x, player.z - horse.z);
    const want = Math.atan2(player.x - horse.x, player.z - horse.z);
    horse.heading += angDiff(horse.heading, want) * clamp(dt * 4, 0, 1);
    horse.speed = d > 20 ? 12 : d > 4 ? 5 : 0;
    const moved = moveCircle(horse, Math.sin(horse.heading) * horse.speed * dt, Math.cos(horse.heading) * horse.speed * dt, 0.8);
    if (!moved) horse.stuck += dt; else horse.stuck = 0;
    if (horse.stuck > 2) {
      for (let k = 0; k < 12; k++) { const x = player.x + R(-4, 4), z = player.z + R(-4, 4); if (!isBlocked(x, z, 0.9)) { horse.x = x; horse.z = z; break; } }
      horse.stuck = 0;
    }
    if (d < 3.5) { horse.state = 'idle'; horse.speed = 0; }
    horse.phase += dt * lerp(4, 11, clamp(horse.speed / 13, 0, 1));
  } else if (horse.state === 'idle') { horse.speed = lerp(horse.speed, 0, clamp(dt * 3, 0, 1)); }
  horse.y = height(horse.x, horse.z);
  horse.h.root.position.set(horse.x, horse.y, horse.z);
  horse.h.root.rotation.y = horse.heading;
  poseHorse(horse.h, horse.phase, horse.speed / 4.3);
}
function updateNPCs(dt) {
  for (const n of npcs) {
    if (n.alive === false) {
      n.fall = Math.min(1, n.fall + dt * 3); n.deadT += dt;
      n.h.root.rotation.x = -n.fall * Math.PI / 2; n.h.root.position.y = n.y + n.fall * 0.12;
      if (n.deadT > 45 && Math.hypot(n.x - player.x, n.z - player.z) > 60) {
        // um novo morador chega à cidade
        const p = streetPoint(); n.x = p.x; n.z = p.z; n.alive = true; n.looted = false; n.h.root.rotation.x = 0; n.flee = 0; n.wait = 2;
      }
      continue;
    }
    if (G.wanted > 0 && Math.hypot(n.x - player.x, n.z - player.z) < 10) n.flee = Math.max(n.flee || 0, 2);
    n.talkCd = Math.max(0, n.talkCd - dt);
    if (n.flee > 0) n.flee -= dt;
    if (n.wait > 0) { n.wait -= dt; n.move = lerp(n.move, 0, clamp(dt * 6, 0, 1)); }
    else {
      const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
      if (d < 0.5 || n.stuck > 2) {
        const p = streetPoint(); n.tx = p.x; n.tz = p.z; n.wait = Math.random() < 0.5 ? R(1, 5) : 0; n.stuck = 0;
      } else {
        const sp = n.speed * (n.flee > 0 ? 2.8 : 1);
        const moved = moveCircle(n, (dx / d) * sp * dt, (dz / d) * sp * dt, 0.3);
        n.stuck = moved ? 0 : n.stuck + dt;
        n.heading += angDiff(n.heading, Math.atan2(dx, dz)) * clamp(dt * 6, 0, 1);
        n.move = lerp(n.move, n.flee > 0 ? 2 : 1, clamp(dt * 6, 0, 1));
        n.phase += dt * (n.flee > 0 ? 11 : 6.5);
      }
    }
    // não atravessar o jogador
    const pd = Math.hypot(n.x - player.x, n.z - player.z);
    if (pd < 0.6 && pd > 0.001) { n.x += (n.x - player.x) / pd * 0.05; n.z += (n.z - player.z) / pd * 0.05; }
    const far = Math.hypot(n.x - camera.position.x, n.z - camera.position.z) > 90;
    n.h.root.visible = !far;
    if (far) continue;
    n.y = floorY(n.x, n.z);
    n.h.root.position.set(n.x, n.y, n.z);
    n.h.root.rotation.y = n.heading;
    poseHuman(n.h, { phase: n.phase, move: n.move });
  }
}
function updateWorld(dt) {
  for (const hh of corralHorses) {
    hh.wait -= dt;
    if (hh.wait <= 0) {
      if (!hh.tx) { hh.tx = R(CORRAL.x0 + 3, CORRAL.x1 - 3); hh.tz = R(CORRAL.z0 + 3, CORRAL.z1 - 3); }
      const dx = hh.tx - hh.x, dz = hh.tz - hh.z, d = Math.hypot(dx, dz);
      if (d < 0.5) { hh.wait = R(3, 9); hh.tx = 0; hh.speed = 0; }
      else { hh.speed = 1.1; hh.heading += angDiff(hh.heading, Math.atan2(dx, dz)) * clamp(dt * 2, 0, 1); hh.x += Math.sin(hh.heading) * hh.speed * dt; hh.z += Math.cos(hh.heading) * hh.speed * dt; hh.phase += dt * 4; }
    } else hh.speed = 0;
    hh.h.root.position.set(hh.x, height(hh.x, hh.z), hh.z); hh.h.root.rotation.y = hh.heading;
    poseHorse(hh.h, hh.phase, hh.speed);
  }
  for (const b of bottles) if (!b.alive) { b.t -= dt; if (b.t <= 0) { b.alive = true; b.mesh.visible = true; } }
  for (const s of shards) {
    if (s.life <= 0) continue;
    s.life -= dt; s.vy -= 9.8 * dt;
    s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
    s.m.rotation.x += dt * 8;
    const gy = height(s.m.position.x, s.m.position.z);
    if (s.m.position.y < gy) { s.m.position.y = gy; s.vx *= 0.3; s.vz *= 0.3; s.vy = 0; }
    if (s.life <= 0) s.m.visible = false;
  }
  for (const t of tumbleweeds) {
    t.x += t.vx * dt; t.hop += dt * 5;
    if (t.x > 160) { t.x = -160; t.z = R(-30, 30); }
    const y = height(t.x, t.z) + 0.5 + Math.abs(Math.sin(t.hop)) * 0.5;
    t.m.position.set(t.x, y, t.z); t.m.rotation.z -= t.vx * dt / 0.5;
  }
  // poeira ao redor da câmera
  const dp = dust.geometry.attributes.position, P = anchor();
  for (let i = 0; i < dp.count; i++) {
    let x = dp.getX(i) + dt * 0.6, y = dp.getY(i) + Math.sin(performance.now() / 1000 + i) * dt * 0.1, z = dp.getZ(i);
    if (x - P.x > 25) x -= 50; if (x - P.x < -25) x += 50;
    if (z - P.z > 25) z -= 50; if (z - P.z < -25) z += 50;
    dp.setXYZ(i, x, y, z);
  }
  dp.needsUpdate = true;
  muzzle.intensity = Math.max(0, muzzle.intensity - dt * 600);
  G.drunk = Math.max(0, G.drunk - dt * 1.1);
}

// Câmera em terceira pessoa com colisão
const camTarget = new THREE.Vector3(), camWant = new THREE.Vector3(), camDir = new THREE.Vector3();
let camDist = 4.6;
function updateCamera(dt, aiming) {
  if (G.state === 'title') {
    const t = performance.now() / 1000;
    const a = t * 0.05 + 2.2;
    camera.position.set(-20 + Math.cos(a) * 58, 14 + Math.sin(t * 0.1) * 2, Math.sin(a) * 58);
    camera.lookAt(-20, 4, 0);
    return;
  }
  const A = anchor();
  const baseY = (A.y || 0) + (player.mounted ? 2.55 : 1.6);
  const shoulder = aiming || player.aimT > 0 ? 0.55 : IS_TOUCH ? 0.6 : 0.28;
  const rx = Math.cos(look.yaw), rz = -Math.sin(look.yaw);
  camTarget.set(A.x + rx * shoulder, baseY, A.z + rz * shoulder);
  const want = aiming ? 2.1 : player.mounted ? 6.8 : 4.4;
  camDir.set(Math.sin(look.yaw) * Math.cos(look.pitch), Math.sin(look.pitch), Math.cos(look.yaw) * Math.cos(look.pitch));
  // colisão da câmera com prédios
  raycaster.set(camTarget, camDir); raycaster.far = want + 0.3;
  const hit = raycaster.intersectObjects(blockers, false)[0];
  const allowed = hit ? Math.max(0.8, hit.distance - 0.35) : want;
  camDist = allowed < camDist ? allowed : lerp(camDist, allowed, clamp(dt * 4, 0, 1));
  camWant.copy(camTarget).addScaledVector(camDir, camDist);
  const gy = height(camWant.x, camWant.z) + 0.4;
  if (camWant.y < gy) camWant.y = gy;
  camera.position.copy(camWant);
  camera.lookAt(camTarget);
  if (G.shake > 0) { camera.rotation.x += R(-1, 1) * G.shake * 0.05; camera.rotation.y += R(-1, 1) * G.shake * 0.05; G.shake = Math.max(0, G.shake - dt); }
  if (G.drunk > 15) {
    const k = (G.drunk - 15) / 75;
    camera.rotation.z += Math.sin(performance.now() / 900) * 0.06 * k;
  }
  const fov = aiming ? 48 : player.mounted && horse.speed > 9 ? 68 : 60;
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = lerp(camera.fov, fov, clamp(dt * 6, 0, 1)); camera.updateProjectionMatrix(); }
}

// Minimapa
const mini = $('mini'), mctx = mini.getContext('2d');
function drawMinimap() {
  const s = 150, c = s / 2, k = 1.05; // px por metro
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, s, s);
  mctx.save();
  mctx.beginPath(); mctx.arc(c, c, c, 0, Math.PI * 2); mctx.clip();
  mctx.fillStyle = '#b89464'; mctx.fillRect(0, 0, s, s);
  mctx.translate(c, c);
  // gira o mapa com a câmera (para frente é para cima)
  mctx.rotate(look.yaw);
  const A = anchor();
  const wx = (x) => (x - A.x) * k, wz = (z) => (z - A.z) * k;
  mctx.fillStyle = '#9c7650';
  mctx.fillRect(wx(-700), wz(-8.5), 1400 * k, 17 * k);
  mctx.fillStyle = '#3a2616';
  for (const b of BUILDINGS) mctx.fillRect(wx(b.x - b.w / 2), wz(b.z - b.d / 2), b.w * k, b.d * k);
  mctx.fillStyle = '#e8d8b0';
  if (!player.mounted) { mctx.beginPath(); mctx.arc(wx(horse.x), wz(horse.z), 3, 0, 7); mctx.fill(); }
  if (G.bounty && G.bounty.stage === 'hunt') {
    let bx = wx(G.bounty.x), bz = wz(G.bounty.z); const d = Math.hypot(bx, bz), max = c - 10;
    if (d > max) { bx *= max / d; bz *= max / d; }
    mctx.strokeStyle = '#c21d1d'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(bx, bz, 6, 0, 7); mctx.stroke();
    mctx.fillStyle = 'rgba(194,29,29,0.35)'; mctx.fill();
  }
  if (G.bounty && G.bounty.stage === 'return') {
    const sh = BUILDINGS.find((b) => b.id === 'sheriff');
    let bx = wx(sh.doorX), bz = wz(sh.doorZ); const d = Math.hypot(bx, bz), max = c - 10;
    if (d > max) { bx *= max / d; bz *= max / d; }
    mctx.fillStyle = '#d9b35c'; mctx.beginPath(); mctx.arc(bx, bz, 5, 0, 7); mctx.fill();
  }
  mctx.fillStyle = '#e02020';
  for (const b of bandits) if (b.alive && b.alert) { mctx.beginPath(); mctx.arc(wx(b.x), wz(b.z), 2.5, 0, 7); mctx.fill(); }
  mctx.fillStyle = '#c21d1d';
  const rb = bottles.some((b) => b.alive);
  if (rb) { mctx.beginPath(); mctx.arc(wx((RANGE_X0 + RANGE_X1) / 2), wz(RANGE_Z), 3, 0, 7); mctx.fill(); }
  mctx.restore();
  // jogador (seta fixa apontando para cima = direção da câmera)
  mctx.save(); mctx.translate(c, c);
  const facing = (A === horse ? horse.heading : player.heading);
  mctx.rotate(-(facing - (look.yaw + Math.PI)));
  mctx.fillStyle = '#fff';
  mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 5); mctx.lineTo(0, 2); mctx.lineTo(-5, 5); mctx.closePath(); mctx.fill();
  mctx.restore();
  // norte
  mctx.save(); mctx.translate(c, c); mctx.rotate(look.yaw);
  mctx.fillStyle = '#f1e6cf'; mctx.font = 'bold 12px Georgia'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
  mctx.fillText('N', 0, -c + 11);
  mctx.restore();
}

// ---------------------------------------------------------------------
// Laço principal
// ---------------------------------------------------------------------
const clock = new THREE.Clock();
let saveT = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  if (G.state === 'play') {
    if (!G.menu) advanceTime(dt / 40); // 1 hora de jogo = 40 s
    const inter = (!G.menu && !G.fading) ? getInteraction() : null;
    const list = [];
    if (inter) { if (inter.e) list.push({ key: 'E', label: inter.e.label }); if (inter.f) list.push({ key: 'F', label: inter.f.label }); }
    if (!player.mounted && !G.menu && Math.hypot(horse.x - player.x, horse.z - player.z) > 12) list.push({ key: 'H', label: 'Assobiar' });
    renderPrompts(G.menu ? [] : list);
    if (!G.menu && !G.fading) {
      if (pressed.KeyE && inter && inter.e) inter.e.fn();
      else if (pressed.KeyF && inter && inter.f) inter.f.fn();
      if (pressed.KeyH && !player.mounted) whistle();
      if (pressed.KeyR) startReload();
      if (pressed.KeyG) player.tipT = 0.8;
      if (pressed.Shoot) shoot();
    }
    if (pressed.KeyM) toggleMute();
    const aiming = updatePlayer(dt);
    updateHorse(dt);
    updateNPCs(dt);
    updateBandits(dt);
    updateWorld(dt);
    updateEffects(dt);
    updateCamera(dt, aiming);
    updateLock(dt);
    drawLock();
    G.lastHit += dt;
    if (G.lastHit > 5 && G.health < 100) G.health = Math.min(100, G.health + dt * 8);
    updateBubbles(dt);
    updateHUD();
    drawMinimap();
    saveT += dt; if (saveT > 15) { saveT = 0; saveGame(); }
  } else {
    updateHorse(dt); updateNPCs(dt); updateWorld(dt); updateEffects(dt); updateCamera(dt, false);
  }
  updateSky();
  updateLampLights(dt);
  pressed = {};
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function toggleMute() {
  G.muted = !G.muted;
  if (MASTER) MASTER.gain.value = G.muted ? 0 : 0.9;
  $('muteBtn').textContent = G.muted ? '🔇' : '🔊';
}

// ---------------------------------------------------------------------
// Salvar / carregar (fica só neste navegador)
// ---------------------------------------------------------------------
const SAVE_KEY = 'pv3d-save-v1';
function saveGame() {
  if (G.state !== 'play') return;
  const A = anchor();
  store.set(SAVE_KEY, JSON.stringify({ v: 1, time: G.time, day: G.day, money: G.money, ammo: G.ammo, reserve: G.reserve, hat: G.hatColor, coat: G.coatColor, beard: G.beard, muted: G.muted, gotLetter: G.gotLetter, wanted: G.wanted, valuables: G.valuables, x: A.x, z: A.z }));
}
function loadGame() {
  let d = null;
  try { d = JSON.parse(store.get(SAVE_KEY)); } catch (e) { d = null; }
  if (!d || d.v !== 1) return false;
  Object.assign(G, { time: d.time, day: d.day, money: d.money, ammo: d.ammo, reserve: d.reserve, muted: !!d.muted, gotLetter: !!d.gotLetter, beard: d.beard !== false, wanted: d.wanted || 0, valuables: d.valuables || {} });
  setPlayerHat(d.hat || G.hatColor); setPlayerCoat(d.coat || G.coatColor); player.h.beard.visible = G.beard;
  if (!isBlocked(d.x, d.z, 0.4)) { player.x = d.x; player.z = d.z; }
  return true;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);

// ---------------------------------------------------------------------
// Título e início
// ---------------------------------------------------------------------
function markQuality() { document.querySelectorAll('.quality button').forEach((b) => b.classList.toggle('on', b.dataset.q === qName)); }
document.querySelectorAll('.quality button').forEach((b) => b.addEventListener('click', () => {
  qName = b.dataset.q; store.set('pv3d-quality', qName); markQuality(); applyQuality(qName);
  $('loadMsg').textContent = qName === 'baixa' ? 'Modo leve: sem sombras, ideal para celulares mais simples.' : qName === 'alta' ? 'Modo alto: sombras nítidas. Pode esquentar o celular.' : 'Modo médio: equilíbrio entre beleza e desempenho.';
}));
markQuality();

function startGame() {
  if (G.state !== 'title' || !window.__pv3dReady) return;
  initAudio();
  const loaded = loadGame();
  G.state = 'play';
  $('title').hidden = true; $('hud').hidden = false;
  $('muteBtn').textContent = G.muted ? '🔇' : '🔊';
  if (MASTER) MASTER.gain.value = G.muted ? 0 : 0.9;
  look.yaw = player.heading + Math.PI; look.pitch = 0.2;
  if (IS_TOUCH) { const el = document.documentElement; try { const p = el.requestFullscreen && el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* sem tela cheia */ } }
  banner('VALE ESPERANÇA', loaded ? `Dia ${G.day} · bem-vindo de volta` : 'Novo Hanover · 1899');
  if (!loaded) {
    setTimeout(() => toast('Bem-vindo, forasteiro', IS_TOUCH ? 'Arraste à esquerda para andar e à direita para olhar em volta.' : 'Use WASD para andar. Clique na tela para controlar a câmera com o mouse.'), 1400);
    setTimeout(() => toast('Seu cavalo', `${horse.name} está amarrado em frente ao saloon. Chegue perto para montar.`), 6000);
    setTimeout(() => toast('Dica', 'Durma no hotel ou espere o pôr do sol: o céu muda com as horas.'), 11500);
  }
}
$('startBtn').addEventListener('click', startGame);

// Espera a fonte das placas antes de desenhá-las (sem travar se ela não vier)
function buildReady() {
  window.__pv3dReady = true;
  $('startBtn').disabled = false;
  $('startBtn').textContent = IS_TOUCH ? 'Toque para começar' : 'Começar (Enter)';
  $('loadMsg').textContent = store.get(SAVE_KEY) ? 'Seu progresso salvo será carregado.' : '';
}
// ---------------------------------------------------------------------
// Otimização: junta as peças paradas da cidade por material.
// Menos "chamadas de desenho" = mais quadros por segundo no celular.
// ---------------------------------------------------------------------
(function batchStatic() {
  scene.updateMatrixWorld(true);
  const byMat = new Map();
  const toRemove = [];
  (function walk(o) {
    if (o.userData.dynamic) return;
    for (const ch of o.children.slice()) walk(ch);
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.vertexColors) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!g.attributes.uv) return;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld);
    const e = byMat.get(o.material) || { geos: [], shadow: false };
    e.geos.push(g); e.shadow = e.shadow || o.castShadow;
    byMat.set(o.material, e);
    toRemove.push(o);
  })(scene);
  if (toRemove.length < 20) return;
  for (const o of toRemove) o.parent.remove(o);
  for (const [mat, e] of byMat) {
    const merged = mergeGeometries(e.geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = e.shadow; mesh.receiveShadow = true;
    scene.add(mesh);
  }
  // os "bloqueadores" (paredes) saem da cena mas guardam a posição calculada acima,
  // então continuam valendo para a colisão da câmera e das balas
  for (const b of blockers) b.matrixAutoUpdate = false;
})();

// Redesenha as placas quando a fonte de faroeste (Rye) terminar de carregar
if (document.fonts && document.fonts.load) {
  document.fonts.load('72px Rye').then((faces) => {
    if (!faces || !faces.length) return;
    for (const sg of signs) { const old = sg.mat.map; sg.mat.map = signTex(sg.name, sg.trim); sg.mat.needsUpdate = true; if (old) old.dispose(); }
  }).catch(() => {});
}
requestAnimationFrame(frame);
buildReady();

// Exposto para testes automatizados
window.__pv3d = { G, player, horse, npcs, bottles, bandits, BUILDINGS, look, camera, scene, renderer, startGame, shoot, applyQuality, startBounty, banditShoot, hurtPlayer, lootBody, lootable };
