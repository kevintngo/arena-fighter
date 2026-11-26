// =====================================================================================
//  ARENA BUILDER: a procedural duelling deck floating over the void. Same materials, walls, props and lighting
//  as the dreadnought's decks; the floor plan is a platform you can be knocked off.
// =====================================================================================
let deck = null;                       // the live arena
const WALL_H = [0, .8, 3.0, 5.6], SKIRT = -2.6, CORR = -2, DX4 = [1, 0, -1, 0], DZ4 = [0, 1, 0, -1], ARENA_W = 34;
function deckSolidAt(gx, gz) { const d = deck; if (!d || gx < 0 || gz < 0 || gx >= d.W || gz >= d.H) return false; return d.solid[gz * d.W + gx] === 1; }
const D = {
  rng: null, deck: null,
  free(x, z) { const d = this.deck, i = z * d.W + x; return !d.solid[i] && !d.occ[i] && !d.keep[i] && !d.voidc[i]; },
  walk(x, z) { const d = this.deck, i = z * d.W + x; return !d.solid[i] && !d.blocked[i] && !d.voidc[i]; },
  canBlock(x, z) {            // would blocking this cell split the walkable area around it?
    const w = (dx, dz) => this.walk(x + dx, z + dz) ? 1 : 0;
    const n = w(0, -1), e = w(1, 0), s = w(0, 1), ww = w(-1, 0), orth = n + e + s + ww;
    const links = (n & e & w(1, -1)) + (e & s & w(1, 1)) + (s & ww & w(-1, 1)) + (ww & n & w(-1, -1));
    return orth === 0 || orth - links <= 1;
  },
  block(x, z) { if (!this.free(x, z) || !this.canBlock(x, z)) return false; const d = this.deck, i = z * d.W + x; d.occ[i] = 1; d.blocked[i] = 1; return true; },
  take(x, z) { const d = this.deck; d.occ[z * d.W + x] = 1; },
  spots(room, n, o = {}) {
    const d = this.deck, W = d.W, out = []; if (n <= 0) return out;
    const cand = [];
    for (const i of room.cells) {
      const x = i % W, z = (i / W) | 0; if (!this.free(x, z)) continue;
      let rot = 0;
      if (o.wall) { const nW = d.wallH[i - W] >= 2, wW = d.wallH[i - 1] >= 2; if (!nW && !wW) continue; rot = nW ? 0 : HPI; }
      if (o.inner || o.rows || o.big) { let ok = true; const rr = o.big ? 2 : 1; for (let dz = -rr; dz <= rr && ok; dz++) for (let dx = -rr; dx <= rr; dx++) if (d.solid[i + dz * W + dx]) { ok = false; break; } if (!ok) continue; }
      if (o.rows && (((x - room.x0) & 1) === 0 || ((z - room.z0) & 1) === 0)) continue;
      cand.push({ x: cellC(x), z: cellC(z), cx: x, cz: z, rot });
    }
    this.rng.shuffle(cand);
    for (const c of cand) {
      if (out.length >= n) break;
      if (o.big) { let ok = true; for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1; dx++) if (!this.free(c.cx + dx, c.cz + dz)) { ok = false; break; } if (!ok) continue; }
      if (o.block) { if (!this.block(c.cx, c.cz)) continue; } else this.take(c.cx, c.cz);
      if (o.big) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.take(c.cx + dx, c.cz + dz);
      out.push(c);
    }
    return out;
  },
  pickSlots(room, n, pred) {
    const c = room.slots.filter(s => !s.used && !s.pil && (!pred || pred(s))); this.rng.shuffle(c); const out = c.slice(0, Math.max(0, n)); for (const s of out) s.used = true; return out;
  },
  rectFree(x0, z0, w, h) {
    for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) if (!this.free(x, z)) return false;
    for (let z = z0 - 1; z <= z0 + h; z++) for (let x = x0 - 1; x <= x0 + w; x++) { if (x >= x0 && x < x0 + w && z >= z0 && z < z0 + h) continue; if (!this.walk(x, z)) return false; }
    return true;
  },
  rectBlock(x0, z0, w, h) { const d = this.deck; for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) { d.occ[z * d.W + x] = 1; d.blocked[z * d.W + x] = 1; } for (let z = z0 - 1; z <= z0 + h; z++) for (let x = x0 - 1; x <= x0 + w; x++) d.occ[z * d.W + x] = 1; },
  centerpiece(room, fn) {
    if (room.center || room.w < 5 || room.h < 5) return false;
    if (!this.rectFree(room.ax, room.az, 2, 2)) return false;
    this.rectBlock(room.ax, room.az, 2, 2); room.center = true; fn((room.ax + 1) * TILE, (room.az + 1) * TILE); return true;
  },
  area(room, w, h) {
    for (let t = 0; t < 40; t++) {
      const rot = this.rng.chance(.5), cw = rot ? h : w, ch = rot ? w : h;
      if (room.w - cw - 2 < 0 || room.h - ch - 2 < 0) continue;
      const x0 = room.x0 + 1 + this.rng.int(0, room.w - cw - 2), z0 = room.z0 + 1 + this.rng.int(0, room.h - ch - 2);
      if (!this.rectFree(x0, z0, cw, ch)) continue;
      this.rectBlock(x0, z0, cw, ch); return { x: (x0 + cw / 2) * TILE, z: (z0 + ch / 2) * TILE, rotated: rot };
    }
    return null;
  },
  backFeature(room, fn) {
    const north = room.w >= room.h;
    if (north) { const cx0 = Math.round(room.cx) - 1, z0 = room.z0; if (!this.rectFree(cx0, z0, 2, 1) && !this.rectFreeLoose(cx0, z0, 2, 1)) return false; this.rectBlock(cx0, z0, 2, 1); fn((cx0 + 1) * TILE, (z0 + .5) * TILE + .1, 0); }
    else { const cz0 = Math.round(room.cz) - 1, x0 = room.x0; if (!this.rectFree(x0, cz0, 1, 2) && !this.rectFreeLoose(x0, cz0, 1, 2)) return false; this.rectBlock(x0, cz0, 1, 2); fn((x0 + .5) * TILE + .1, (cz0 + 1) * TILE, HPI); }
    return true;
  },
  rectFreeLoose(x0, z0, w, h) {    // against a wall: only the floor-side perimeter must stay walkable
    const d = this.deck;
    for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) if (!this.free(x, z)) return false;
    for (let z = z0 - 1; z <= z0 + h; z++) for (let x = x0 - 1; x <= x0 + w; x++) { if (x >= x0 && x < x0 + w && z >= z0 && z < z0 + h) continue; if (d.solid[z * d.W + x]) continue; if (!this.walk(x, z)) return false; }
    // the walkable perimeter must be a single run: require the row/col directly in front fully walkable
    return true;
  },
  bayMouth(room) {
    const sl = room.slots.filter(s => !s.used && s.h >= 3);
    for (const s of sl) {
      const mates = sl.filter(o => o.rot === s.rot && (s.rot === 0 ? (o.cz === s.cz && Math.abs(o.cx - s.cx) === 1) : (o.cx === s.cx && Math.abs(o.cz - s.cz) === 1)));
      if (mates.length < 2) continue;
      s.used = true; for (const m of mates) m.used = true;
      const k = B.k, top = Math.min(s.h - .45, 4.6), a = B.theme.accent;
      P.viewport(k, s, 5.5, .45, top, false);
      k.at(s.x, 0, s.z, s.rot).tint(a[0] * 1.3, a[1] * 1.3, a[2] * 1.3).geo(G.plane, 'field', 0, (.45 + top) / 2, .16, 5.5, top - .45, 1).tint(1).box('hazard', 0, .25, .12, 5.9, .4, .14).box('hazard', 0, top + .22, .12, 5.9, .26, .14);
      const w = k.wp(0, 2, .8); B.light(w[0], w[1], w[2], a[0], a[1], a[2], 9, 10, .25);
      return true;
    }
    return false;
  },
  hazard(type, cx, cz, extra) { return Object.assign({ type, cx, cz, x: cellC(cx), z: cellC(cz) }, extra || {}); },
  lavaChannel(room) {
    const d = this.deck, W = d.W;
    for (let t = 0; t < 30; t++) {
      const i = this.rng.pick(room.cells), x = i % W, z = (i / W) | 0, dir = this.rng.int(0, 1), len = this.rng.int(3, 6), run = [];
      for (let s = 0; s < len; s++) { const nx = x + (dir ? 0 : s), nz = z + (dir ? s : 0); if (d.region[nz * W + nx] !== room.id || !this.block(nx, nz)) break; run.push([nx, nz]); }
      if (run.length < 3) { for (const c of run) { d.occ[c[1] * W + c[0]] = 0; d.blocked[c[1] * W + c[0]] = 0; } continue; }
      for (let s = 0; s < run.length; s++) { const c = run[s]; d.voidc[c[1] * W + c[0]] = 2; if (s % 2 === 0) B.light(cellC(c[0]), .5, cellC(c[1]), 1, .45, .1, 10, 7, .3); B.emit('ember', cellC(c[0]), .1, cellC(c[1]), 2.5, 7, 2.6, .5); }
      const m = run[run.length >> 1]; B.haze(cellC(m[0]), .3, cellC(m[1]), run.length * .8, 1); return true;
    }
    return false;
  },
  hole(room) {
    const d = this.deck, W = d.W, c = this.spots(room, 1, { big: true, block: true })[0]; if (!c) return false;
    const cells = [[c.cx, c.cz]]; d.occ[c.cz * W + c.cx] = 1;
    for (let t = 0; t < 3; t++) { const b = this.rng.pick(cells), k = this.rng.int(0, 3), nx = b[0] + DX4[k], nz = b[1] + DZ4[k]; if (d.region[nz * W + nx] !== room.id || d.keep[nz * W + nx] || d.solid[nz * W + nx] || d.blocked[nz * W + nx] || !this.canBlock(nx, nz)) continue; d.occ[nz * W + nx] = 1; d.blocked[nz * W + nx] = 1; cells.push([nx, nz]); }
    let mx = 0, mz = 0; for (const h of cells) { d.voidc[h[1] * W + h[0]] = 1; mx += cellC(h[0]); mz += cellC(h[1]); }
    P.tornEdge(B.k, mx / cells.length, mz / cells.length, 9, 1.2 + cells.length * .28);
    B.spot(mx / cells.length + 1.5, 5, mz / cells.length + 1.5, mx / cells.length, 0, mz / cells.length, .6, .4, .9, 45, .7);
    return true;
  }
};
function wallSide(bt, mat, gx, gz, dir, y0, y1, cb, ct, tr = 1, tg = 1, tb = 1) {
  const X0 = gx * TILE, X1 = X0 + TILE, Z0 = gz * TILE, Z1 = Z0 + TILE;
  if (dir === 0) bt.quad(mat, X1, y0, Z1, X1, y0, Z0, X1, y1, Z0, X1, y1, Z1, 1, 0, 0, cb, cb, ct, ct, tr, tg, tb);
  else if (dir === 1) bt.quad(mat, X0, y0, Z1, X1, y0, Z1, X1, y1, Z1, X0, y1, Z1, 0, 0, 1, cb, cb, ct, ct, tr, tg, tb);
  else if (dir === 2) bt.quad(mat, X0, y0, Z0, X0, y0, Z1, X0, y1, Z1, X0, y1, Z0, -1, 0, 0, cb, cb, ct, ct, tr, tg, tb);
  else bt.quad(mat, X1, y0, Z0, X0, y0, Z0, X0, y1, Z0, X1, y1, Z0, 0, 0, -1, cb, cb, ct, ct, tr, tg, tb);
}
// arena rules for the shared decor helpers: the fighting floor stays mostly clear, and nothing digs pits into it
{
  const spots0 = D.spots, center0 = D.centerpiece;
  D.budget = 0; D.wallBudget = 0; D.allowCenter = false; D.inner = null;
  D.spots = function (room, n, o = {}) {
    if (o.wall) { n = Math.min(n, this.wallBudget); this.wallBudget -= n; }
    else if (o.block) { n = Math.min(n, this.budget); this.budget -= n; room = this.inner; }
    else n = Math.min(n, 2);
    return spots0.call(this, room, n, o);
  };
  D.centerpiece = function (room, fn) { return this.allowCenter ? center0.call(this, room, fn) : false; };
  D.area = () => null; D.lavaChannel = () => false; D.hole = () => false;
}
const ARENA_KINDS = [['disc', 3], ['oct', 3], ['rect', 3], ['cross', 2], ['ring', 2], ['twin', 2], ['diamond', 2]];
function arenaCell(kind, hs, dx, dz, rot) {
  const ax = Math.abs(dx), az = Math.abs(dz);
  if (kind === 'disc') return dx * dx + dz * dz <= (hs + .2) * (hs + .2);
  if (kind === 'oct') return ax <= hs && az <= hs && ax + az <= hs * 1.5;
  if (kind === 'rect') return rot ? (ax <= hs - 1.5 && az <= hs + 1) : (ax <= hs + 1 && az <= hs - 1.5);
  if (kind === 'cross') return (ax <= hs + .5 && az <= 2.5) || (az <= hs + .5 && ax <= 2.5) || (ax <= 3.5 && az <= 3.5);
  if (kind === 'ring') { const r2 = dx * dx + dz * dz; return r2 <= (hs + .7) * (hs + .7) && r2 > 1.7 * 1.7; }
  if (kind === 'twin') { const o = hs * .62, s = rot ? -1 : 1, rr = hs * .66; const a = (dx - o) * (dx - o) + (dz - o * s) * (dz - o * s), b = (dx + o) * (dx + o) + (dz + o * s) * (dz + o * s); return a <= rr * rr || b <= rr * rr || (Math.abs(dx * s - dz) <= 1.5 && ax <= o && az <= o); }
  return ax + az <= hs + 1.2;        // diamond
}
function* buildArena(seed, depth, theme) {
  const W = ARENA_W, H = W, N = W * H, rng = new RNG(seed ^ 0x9e3779b9), c0 = W / 2;
  const solid = new Uint8Array(N), wallH = new Uint8Array(N), fill = new Uint8Array(N), region = new Int16Array(N).fill(-1), floor = new Uint8Array(N);
  const d = {
    L: { W, H }, W, H, N, seed, depth, theme, solid, region, wallH, fill, floor, rooms: [],
    occ: new Uint8Array(N), blocked: new Uint8Array(N), voidc: new Uint8Array(N), keep: new Uint8Array(N), doorBlock: new Uint8Array(N), doorAt: new Uint8Array(N), hazardCell: new Uint8Array(N),
    obst: new Array(N), lights: [], spots: [], emits: [], hazes: [], anim: [], ownGeoms: [], group: new Group(), slots: [], corrSlots: [],
    hazSpecs: [], cacheSpecs: [], breakSpecs: [], relics: [], keyPos: null, items: [], shots: [], zones: [], hazards: [],
    cx: c0 * TILE, cz: c0 * TILE, R: 0, blastR: 0, koY: -1.1, spawn: [], cells: [], kind: '', arch: ''
  };
  // ---- the platform
  const kind = depth <= 1 ? 'oct' : rng.weighted(ARENA_KINDS), hs = clamp(4.2 - depth * .03 + rng.range(-.45, .45), 3.6, 4.7) + (kind === 'twin' ? 1.2 : kind === 'cross' ? 1.1 : kind === 'diamond' ? 1.4 : kind === 'disc' || kind === 'ring' ? .5 : 0), rot = rng.chance(.5);
  d.kind = kind;
  for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) if (arenaCell(kind, hs, x + .5 - c0, z + .5 - c0, rot)) floor[z * W + x] = 1;
  // ---- standing walls on the far (north and west) rims: gaps between them stay open to the void
  const pat = depth <= 1 ? 'corner' : rng.weighted([['none', 2.2], ['corner', 2.5], ['north', 1.6], ['west', 1.6], ['colonnade', 2], ['both', 1.2]]), tall = rng.chance(.55) ? 3 : 2;
  d.arch = pat;
  if (pat !== 'none') {
    const rim = [];
    for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) { const i = z * W + x; if (floor[i]) continue; const n = floor[i + W], w = floor[i + 1]; if (n || w) rim.push({ i, x, z, n, w, t: Math.atan2(z + .5 - c0, x + .5 - c0) }); }
    for (const c of rim) {
      const dx = c.x + .5 - c0, dz = c.z + .5 - c0; let on = false;
      if (pat === 'corner') on = dx < -hs * .25 && dz < -hs * .25;
      else if (pat === 'north') on = c.n && Math.abs(dx) < hs * .62;
      else if (pat === 'west') on = c.w && Math.abs(dz) < hs * .62;
      else if (pat === 'both') on = (c.n && Math.abs(dx + hs * .2) < hs * .45) || (c.w && Math.abs(dz + hs * .2) < hs * .45);
      else on = ((c.n ? c.x : c.z) % 4) < 2 && (dx < hs * .3 && dz < hs * .3);
      if (on) { solid[c.i] = 1; wallH[c.i] = tall; }
    }
  }
  const cells = []; let x0 = W, z0 = H, x1 = 0, z1 = 0, R2 = 0;
  for (let i = 0; i < N; i++) { if (solid[i]) continue; if (!floor[i]) { d.voidc[i] = theme.id === 'foundry' ? 4 : 3; continue; } const x = i % W, z = (i / W) | 0; cells.push(i); region[i] = 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); R2 = Math.max(R2, dist2(cellC(x), cellC(z), d.cx, d.cz)); }
  d.cells = cells; d.R = Math.sqrt(R2) + 1; d.blastR = d.R + 8;
  // clearance: how many cells from here to the nearest drop. The CPU reads it to keep its footing; respawns use the safest spot
  const clr = d.clr = new Uint8Array(N); let safest = cells[0];
  { let fr = []; for (const i of cells) { let edge = false; for (let q = 0; q < 4; q++) { const n = i + DX4[q] + DZ4[q] * W; if (!floor[n] && !solid[n]) edge = true; } if (edge) { clr[i] = 1; fr.push(i); } }
    let lv = 1; while (fr.length) { const nx = []; lv++; for (const i of fr) for (let q = 0; q < 4; q++) { const n = i + DX4[q] + DZ4[q] * W; if (floor[n] && !solid[n] && !clr[n]) { clr[n] = lv; nx.push(n); } } if (nx.length) safest = nx[nx.length >> 1]; fr = nx; } }
  const room = { id: 0, type: kind === 'disc' || kind === 'ring' ? 'round' : kind === 'cross' ? 'cross' : kind === 'rect' || kind === 'twin' ? 'hall' : 'chamber', x0, z0, x1, z1, w: x1 - x0 + 1, h: z1 - z0 + 1, cx: c0, cz: c0, ax: c0 - 1, az: c0 - 1, cells, tags: {}, slots: [], center: false, dist: 0 };
  d.rooms.push(room); d.L.rooms = d.rooms;
  B.deck = d; B.theme = theme; B.rng = rng; B.batch = new Batcher(16); B.k = new Kit(B.batch); D.rng = rng; D.deck = d;
  const k = B.k, a = theme.accent, isFloor = (x, z) => x >= 0 && z >= 0 && x < W && z < H && floor[z * W + x] === 1 && !solid[z * W + x];
  // ---- spawn points either side of the centre (left and right on screen), kept clear
  for (const s of [-1, 1]) { let best = -1, bd = 1e9; const tx = d.cx + s * 3.2, tz = d.cz - s * 3.2; for (const i of cells) { const dd = dist2(cellC(i % W), cellC((i / W) | 0), tx, tz); if (dd < bd) { bd = dd; best = i; } } d.spawn.push([cellC(best % W), cellC((best / W) | 0)]); const bx = best % W, bz = (best / W) | 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) d.keep[(bz + dz) * W + bx + dx] = 1; }
  const centre = isFloor(c0 - 1, c0 - 1) && isFloor(c0, c0);
  if (centre) for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) d.keep[(c0 + dz) * W + c0 + dx] = 1;
  d.home = centre ? [d.cx, d.cz] : [cellC(safest % W), cellC((safest / W) | 0)];
  // ---- wall slots on every tall face that looks onto the floor
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const i = z * W + x, wh = wallH[i]; if (wh < 2) continue; const h = WALL_H[wh];
    if (floor[i + W] && !solid[i + W]) room.slots.push({ x: (x + .5) * TILE, z: (z + 1) * TILE, rot: 0, h, cx: x, cz: z + 1, pil: (x & 1) === 0, used: false });
    if (floor[i + 1] && !solid[i + 1]) room.slots.push({ x: (x + 1) * TILE, z: (z + .5) * TILE, rot: HPI, h, cx: x + 1, cz: z, pil: (z & 1) === 0, used: false });
  }
  yield;
  // ---- architecture and dressing
  const inner = cells.filter(i => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!floor[i + dz * W + dx] || solid[i + dz * W + dx]) return false; return true; });
  D.inner = Object.assign({}, room, { cells: inner });
  const style = depth <= 1 ? 'open' : rng.weighted([['open', 3], ['pillars', 3], ['center', kind === 'ring' || !centre ? 0 : 2], ['clutter', 2]]);
  d.style = style; D.allowCenter = style === 'center'; D.budget = style === 'clutter' ? rng.int(2, 3) : 0; D.wallBudget = 3;
  for (const s of room.slots) { k.at(s.x, 0, s.z, s.rot).boxB('trim', 0, 0, .04, 2, .16, .08).boxB('trim', 0, s.h - .16, .06, 2, .16, .12); if (s.pil) P.pilaster(k, s, s.h > 4); }
  for (const s of D.pickSlots(room, Math.max(1, Math.round(room.slots.length / 5)))) P.sconce(k, s, s.h > 4 ? 2.4 : 2.05);
  theme.decor(D, room); yield;
  if (style === 'center' && !room.center && centre) D.centerpiece(room, (x, z) => { P.column(k, x, z, 4.2, 2); });
  if (style === 'pillars') { const o = Math.max(2, Math.round(hs * .5)); for (const [sx, sz] of rng.chance(.5) ? [[-1, -1], [1, 1], [-1, 1], [1, -1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const gx = c0 + sx * o - (sx > 0 ? 1 : 0), gz = c0 + sz * o - (sz > 0 ? 1 : 0); if (isFloor(gx, gz) && !d.keep[gz * W + gx] && D.block(gx, gz)) P.column(k, cellC(gx), cellC(gz), 3.4, (sx + sz) & 1 ? 2 : 1); } }
  if (centre && !room.center) P.liftPad(k, d.cx, d.cz, true);
  if (rng.chance(.5)) for (const s of D.spots(room, 1, { block: true, wall: true })) P.statue(k, s.x, s.z, s.rot, rng.range(1.25, 1.7), rng.chance(.25));
  for (const s of D.pickSlots(room, rng.int(1, 3), s => s.h > 2.5)) P.banner(k, s, rng.int(0, 5), s.h - .45);
  for (const s of D.pickSlots(room, rng.int(0, 2), s => s.h >= 3)) P.viewport(k, s, 1.5, 1.25, s.h - .7);
  for (const s of D.pickSlots(room, rng.int(0, 2))) P.relief(k, s, 1.85);
  for (const s of room.slots) if (!s.used && !s.pil && rng.chance(.25)) { s.used = true; P.pipes(k, s, 2.45, false); }
  for (const s of D.spots(room, rng.int(0, 2), {})) P.bones(k, s.x + rng.range(-.4, .4), s.z + rng.range(-.4, .4));
  // ---- the rim: a kerb with a thin light line wherever the floor meets the drop, and beacons to light it
  let nb = 0;
  for (const i of cells) {
    const x = i % W, z = (i / W) | 0, X = cellC(x), Z = cellC(z);
    for (let q = 0; q < 4; q++) {
      const nx = x + DX4[q], nz = z + DZ4[q]; if (isFloor(nx, nz) || solid[nz * W + nx]) continue;
      const ox = DX4[q], oz = DZ4[q]; k.at(X + ox * .94, 0, Z + oz * .94, ox ? HPI : 0).boxB('trim', 0, 0, 0, 2, .09, .12).tint(a[0] * .5, a[1] * .5, a[2] * .5).box('gAccentDim', 0, .1, -.02, 1.7, .025, .04).tint(1);
      if ((x * 7 + z * 13 + q) % 9 === 0 && nb < 9) { nb++; k.at(X + ox * .9, 0, Z + oz * .9, 0).boxB('iron', 0, 0, 0, .22, .5, .22).box('gAccent', 0, .56, 0, .13, .1, .13); B.light(X + ox * .9, 1.1, Z + oz * .9, a[0], a[1], a[2], 6, 8, .12); }
    }
  }
  stageDress(d, rng, k);
  yield;
  // ---- floors and the drop
  const bt = B.batch, sol = solid, isS = (x, z) => x < 0 || z < 0 || x >= W || z >= H || sol[z * W + x] === 1 || d.voidc[z * W + x] !== 0;
  const water = !!theme.water;
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x; if (sol[i]) continue;
      const X0 = x * TILE, X1 = X0 + TILE, Z0 = z * TILE, Z1 = Z0 + TILE;
      if (d.voidc[i]) {
        const vt = d.voidc[i], lava = vt === 4, y = lava ? -2.3 : -3.6;
        bt.quad(lava ? 'lava' : 'portal', X0, y, Z1, X1, y, Z1, X1, y, Z0, X0, y, Z0, 0, 1, 0);
        for (let q = 0; q < 4; q++) { const nx = x + DX4[q], nz = z + DZ4[q]; if (nx < 0 || nz < 0 || nx >= W || nz >= H || d.voidc[nz * W + nx]) continue; wallSide(bt, 'wall', nx, nz, (q + 2) & 3, y, 0, lava ? 1.5 : .3, lava ? .8 : 1, lava ? 1.3 : 1, lava ? .7 : 1, lava ? .4 : 1); wallSide(bt, 'trim', nx, nz, (q + 2) & 3, -.14, 0, 1, 1); }
        continue;
      }
      const g = .9 + hash2i(x, z, seed) * .2, e = (dx, dz) => sol[(z + dz) * W + x + dx] === 1;
      const c00 = (e(-1, -1) || e(0, -1) || e(-1, 0)) ? .58 : 1, c10 = (e(1, -1) || e(0, -1) || e(1, 0)) ? .58 : 1, c01 = (e(-1, 1) || e(0, 1) || e(-1, 0)) ? .58 : 1, c11 = (e(1, 1) || e(0, 1) || e(1, 0)) ? .58 : 1;
      bt.quad('floor', X0, 0, Z1, X1, 0, Z1, X1, 0, Z0, X0, 0, Z0, 0, 1, 0, c01, c11, c10, c00, g, g, g);
      if (water) bt.quad('water', X0, .17, Z1, X1, .17, Z1, X1, .17, Z0, X0, .17, Z0, 0, 1, 0, 1, 1, 1, 1, .04 + a[0] * .05, .1 + a[1] * .1, .12 + a[2] * .1);
    }
    if ((z & 15) === 15) yield;
  }
  // ---- the standing walls
  const hAt = (x, z) => { if (x < 0 || z < 0 || x >= W || z >= H) return 0; const i = z * W + x; return sol[i] ? WALL_H[wallH[i]] : 0; };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const i = z * W + x; if (!sol[i]) continue;
    const h = hAt(x, z), X0 = x * TILE, X1 = X0 + TILE, Z0 = z * TILE, Z1 = Z0 + TILE, g = .88 + hash2i(x, z, seed + 5) * .24;
    bt.quad('cap', X0, h, Z1, X1, h, Z1, X1, h, Z0, X0, h, Z0, 0, 1, 0, 1, 1, 1, 1, g, g, g);
    for (let q = 0; q < 4; q++) { const hn = hAt(x + DX4[q], z + DZ4[q]); if (hn < h) wallSide(bt, 'wall', x, z, q, hn, h, hn < .01 ? .5 : .8, 1); }
  }
  yield;
  for (const mesh of B.batch.build(d.group)) { d.ownGeoms.push(mesh.geometry); yield; }
  return d;
}
function activateDeck(d) {
  deck = d; scene.add(d.group); Lights.clear(); Post.hazes = d.hazes;
  for (const l of d.lights) Lights.add(l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7], l[8]);
  for (const s of d.spots) Lights.addSpot(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10]);
  FX.emitters.length = 0; for (const e of d.emits) FX.emitter(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7]);
}
function disposeDeck(d) {
  if (!d) return; scene.remove(d.group);
  for (const g of d.ownGeoms) g.dispose();
  for (const it of d.items) it.dispose(); for (const h of d.hazards) if (h.dispose) h.dispose();
  d.group.clear();
}
// ------------------------------------------------------------------ where you can stand, and what you run into
function overFloor(x, z) { const d = deck, gx = cellOf(x), gz = cellOf(z); if (gx < 0 || gz < 0 || gx >= d.W || gz >= d.H) return false; const i = gz * d.W + gx; return d.floor[i] === 1 && !d.solid[i]; }
const _nf = [0, 0, 0];
function nearestFloor(x, z) {           // closest point on the fighting floor to (x, z); returns [px, pz, distance]
  const d = deck, W = d.W; let bd = 1e9, bx = d.cx, bz = d.cz;
  for (const i of d.cells) { const X0 = (i % W) * TILE, Z0 = ((i / W) | 0) * TILE, px = clamp(x, X0, X0 + TILE), pz = clamp(z, Z0, Z0 + TILE), dd = dist2(x, z, px, pz); if (dd < bd) { bd = dd; bx = px; bz = pz; } }
  _nf[0] = bx; _nf[1] = bz; _nf[2] = Math.sqrt(bd); return _nf;
}
function edgeAhead(x, z, dx, dz, max = 8) { for (let s = .5; s <= max; s += .5) if (!overFloor(x + dx * s, z + dz * s)) return s; return max; }
// push a body out of walls, props and (when below the lip) the slab itself. Returns true when something was hit; _hitN holds the push direction
const _hitN = [0, 0];
function arenaCollide(e) {
  const d = deck, r = e.r, W = d.W; let hit = false; _hitN[0] = 0; _hitN[1] = 0;
  const under = e.y < -.4, gx0 = cellOf(e.x - r), gx1 = cellOf(e.x + r), gz0 = cellOf(e.z - r), gz1 = cellOf(e.z + r);
  for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
    if (gx < 0 || gz < 0 || gx >= W || gz >= d.H) continue; const i = gz * W + gx;
    if (!(d.solid[i] === 1 ? e.y < WALL_H[d.wallH[i]] - .2 : (under && d.floor[i] === 1))) continue;
    const minx = gx * TILE, maxx = minx + TILE, minz = gz * TILE, maxz = minz + TILE, cx = clamp(e.x, minx, maxx), cz = clamp(e.z, minz, maxz), dx = e.x - cx, dz = e.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue; hit = true;
    if (d2 > 1e-8) { const dd = Math.sqrt(d2), p = r - dd; e.x += dx / dd * p; e.z += dz / dd * p; _hitN[0] += dx / dd; _hitN[1] += dz / dd; }
    else { const l = e.x - minx, rr = maxx - e.x, t = e.z - minz, b = maxz - e.z, m = Math.min(l, rr, t, b); if (m === l) { e.x = minx - r; _hitN[0] -= 1; } else if (m === rr) { e.x = maxx + r; _hitN[0] += 1; } else if (m === t) { e.z = minz - r; _hitN[1] -= 1; } else { e.z = maxz + r; _hitN[1] += 1; } }
  }
  if (e.y < 2.2 && e.y > -.4) {
    const gx = cellOf(e.x), gz = cellOf(e.z);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx, z = gz + dz; if (x < 0 || z < 0 || x >= W || z >= d.H) continue; const list = d.obst[z * W + x]; if (!list) continue;
      for (const o of list) { if (!o.on) continue; const ox = e.x - o.x, oz = e.z - o.z, rr = r + o.r, d2 = ox * ox + oz * oz; if (d2 < rr * rr && d2 > 1e-6) { const dd = Math.sqrt(d2), p = rr - dd; e.x += ox / dd * p; e.z += oz / dd * p; _hitN[0] += ox / dd; _hitN[1] += oz / dd; hit = true; } }
    }
  }
  return hit;
}
function shotBlocked(x, y, z) { const d = deck, gx = cellOf(x), gz = cellOf(z); if (gx < 0 || gz < 0 || gx >= d.W || gz >= d.H) return false; const i = gz * d.W + gx; if (d.solid[i] && y < WALL_H[d.wallH[i]]) return true; const l = d.obst[i]; if (l && y < 2.4) for (const o of l) if (o.on && dist2(x, z, o.x, o.z) < o.r * o.r) return true; return false; }
