// =====================================================================================
//  VOIDLIGHT DEPTHS  —  a self-playing isometric space-opera descent
//  Everything (geometry, textures, shaders, sound, music, levels) is generated in code.
// =====================================================================================

function fatal(msg) {
  const el = document.getElementById('fatal');
  if (el) { el.style.display = 'block'; el.textContent = msg; }
}
// ------------------------------------------------------------------ math helpers
const PI = Math.PI, TAU = Math.PI * 2, HPI = Math.PI / 2;
const TILE = 2;                                   // world units per grid cell
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sat = v => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angNorm = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
const angDiff = (a, b) => angNorm(b - a);
const angDamp = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const cellOf = v => Math.floor(v / TILE);
const cellC = g => (g + .5) * TILE;

class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() { let t = this.s += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  sign() { return this.next() < .5 ? -1 : 1; }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  weighted(pairs) { let tot = 0; for (const p of pairs) tot += p[1]; let r = this.next() * tot; for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; } return pairs[pairs.length - 1][0]; }
}
const rnd = new RNG((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);   // non-deterministic effects rng
const R = (a = 1, b) => b === undefined ? rnd.next() * a : rnd.range(a, b);
const RS = (a = 1) => (rnd.next() * 2 - 1) * a;

function hash2i(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const wrapi = (i, p) => p ? ((i % p) + p) % p : i;
function vnoise(x, y, seed = 0, px = 0, py = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = wrapi(xi, px), x1 = wrapi(xi + 1, px), y0 = wrapi(yi, py), y1 = wrapi(yi + 1, py);
  const a = hash2i(x0, y0, seed), b = hash2i(x1, y0, seed), c = hash2i(x0, y1, seed), d = hash2i(x1, y1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// tileable fbm over the unit square: fx, fy integer base frequencies
function fbmT(u, v, fx, fy, oct, seed) {
  let a = .5, sum = 0, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) { sum += a * vnoise(u * fx * f, v * fy * f, seed + i * 31, fx * f, fy * f); norm += a; a *= .5; f *= 2; }
  return sum / norm;
}
function fbm2(x, y, oct, seed) {
  let a = .5, sum = 0, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) { sum += a * vnoise(x * f, y * f, seed + i * 31); norm += a; a *= .5; f *= 2; }
  return sum / norm;
}

// ------------------------------------------------------------------ pixel font (5x7)
const FONT = {
  'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11], 'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E], 'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
  'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E], 'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F], 'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F], 'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11], 'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C], 'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], 'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11], 'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11], 'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10], 'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D], 'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  'S': [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E], 'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04], 'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04], 'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11], 'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04], 'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
  '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E], '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E], '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
  '3': [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E], '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02], '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E], '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08], '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
  '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
  ' ': [0, 0, 0, 0, 0, 0, 0], '-': [0, 0, 0, 0x1F, 0, 0, 0], '.': [0, 0, 0, 0, 0, 0x0C, 0x0C], ',': [0, 0, 0, 0, 0x0C, 0x04, 0x08],
  ':': [0, 0x0C, 0x0C, 0, 0x0C, 0x0C, 0], '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04], '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0], '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10], '+': [0, 0x04, 0x04, 0x1F, 0x04, 0x04, 0],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03], '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02], ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '*': [0, 0x04, 0x15, 0x0E, 0x15, 0x04, 0], '=': [0, 0, 0x1F, 0, 0x1F, 0, 0], '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02], '_': [0, 0, 0, 0, 0, 0, 0x1F], '#': [0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A],
  '~': [0, 0, 0x08, 0x15, 0x02, 0, 0], '|': [0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04]
};
const FONT_CHARS = Object.keys(FONT);
const FONT_IDX = {}; FONT_CHARS.forEach((c, i) => FONT_IDX[c] = i);
const _fontAtlases = new Map();
function fontAtlas(color) {
  let a = _fontAtlases.get(color);
  if (a) return a;
  a = document.createElement('canvas'); a.width = FONT_CHARS.length * 6; a.height = 7;
  const g = a.getContext('2d'); g.fillStyle = color;
  FONT_CHARS.forEach((c, i) => { const rows = FONT[c]; for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y] & (16 >> x)) g.fillRect(i * 6 + x, y, 1, 1); });
  _fontAtlases.set(color, a); return a;
}
function textW(str, scale = 1) { return str.length * 6 * scale - scale; }
function drawText(g, str, x, y, color = '#fff', scale = 1, align = 0) {
  const atlas = fontAtlas(color);
  str = String(str).toUpperCase();
  x = Math.round(x); y = Math.round(y);
  if (align === 1) x -= Math.round(textW(str, scale) / 2); else if (align === 2) x -= textW(str, scale);
  for (let i = 0; i < str.length; i++) {
    const gi = FONT_IDX[str[i]];
    if (gi === undefined || str[i] === ' ') continue;
    g.drawImage(atlas, gi * 6, 0, 5, 7, x + i * 6 * scale, y, 5 * scale, 7 * scale);
  }
}
const _OUTLINE = [[1, 1], [1, 0], [0, 1], [-1, 0], [0, -1]];
function drawTextShadow(g, str, x, y, color, scale = 1, align = 0, shadow = '#000') {
  for (const o of _OUTLINE) drawText(g, str, x + o[0] * scale, y + o[1] * scale, shadow, scale, align);
  drawText(g, str, x, y, color, scale, align);
}

