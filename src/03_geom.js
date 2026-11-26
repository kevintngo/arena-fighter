// =====================================================================================
//  GEOMETRY TOOLKIT: primitive cache, chunked static batcher, modelling kit, rigs
// =====================================================================================
const G = {};
function addWhite(g) {
  if (!g.attributes.color) { const a = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new BufferAttribute(a, 3)); }
  return g;
}
const _cylT = new Map();
function cylT(seg, top) { const k = seg + '_' + top.toFixed(3); let g = _cylT.get(k); if (!g) { g = addWhite(new CylinderGeometry(top, 1, 1, seg).translate(0, .5, 0)); _cylT.set(k, g); } return g; }
function latheG(pts, seg = 12) { return addWhite(new LatheGeometry(pts.map(p => new Vector2(p[0], p[1])), seg)); }
// a box with rounded edges and smooth normals. Its uv.x carries the face axis so texturing can project per face (uvMode 2)
function roundBox(r = .2) {
  const p = [], nn = [], u = [], ix = [], h = .5 - r, L = [-.5, -h - r * .55, -h, 0, h, h + r * .55, .5], n = L.length - 1;
  const F = [[1, 0, 0, 0, 0, -1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1], [0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0]];
  F.forEach((q, k) => {
    const o = k * (n + 1) * (n + 1), ax = q[0] ? 0 : q[1] ? 1 : 2;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const a = L[i], b = L[j], c = [q[0] * .5 + q[3] * a + q[6] * b, q[1] * .5 + q[4] * a + q[7] * b, q[2] * .5 + q[5] * a + q[8] * b], e = c.map(v => clamp(v, -h, h)), d = [c[0] - e[0], c[1] - e[1], c[2] - e[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
      p.push(e[0] + d[0] / l * r, e[1] + d[1] / l * r, e[2] + d[2] / l * r); nn.push(d[0] / l, d[1] / l, d[2] / l); u.push(ax, 0);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = o + j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; ix.push(a, b, d, a, d, c); }
  });
  return geomFrom(p, nn, u, ix);
}
// a box with flat, bevelled edges: crisp planes that catch the light. uv.x carries the face axis (uvMode 2)
function chamferBox(c = .12) {
  const p = [], n = [], u = [], ix = [], h = .5, a = h - c;
  const face = vs => {
    const A = vs[0], B = vs[1], C = vs[2], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    if (nx * (A[0] + C[0]) + ny * (A[1] + C[1]) + nz * (A[2] + C[2]) < 0) { vs.reverse(); nx = -nx; ny = -ny; nz = -nz; }
    const fx = Math.abs(nx), fy = Math.abs(ny), fz = Math.abs(nz), ax = fy >= fx && fy >= fz ? 1 : fx >= fz ? 0 : 2, b = p.length / 3;
    for (const q of vs) { p.push(q[0], q[1], q[2]); n.push(nx, ny, nz); u.push(ax, 0); }
    for (let i = 1; i < vs.length - 1; i++) ix.push(b, b + i, b + i + 1);
  };
  const pt = (i, vi, j, vj, k, vk) => { const q = [0, 0, 0]; q[i] = vi; q[j] = vj; q[k] = vk; return q; };
  for (let k = 0; k < 3; k++) { const i = (k + 1) % 3, j = (k + 2) % 3; for (const s of [-1, 1]) face([pt(k, s * h, i, -a, j, -a), pt(k, s * h, i, a, j, -a), pt(k, s * h, i, a, j, a), pt(k, s * h, i, -a, j, a)]); }
  for (let k = 0; k < 3; k++) { const i = (k + 1) % 3, j = (k + 2) % 3; for (const si of [-1, 1]) for (const sj of [-1, 1]) face([pt(i, si * h, j, sj * a, k, -a), pt(i, si * h, j, sj * a, k, a), pt(i, si * a, j, sj * h, k, a), pt(i, si * a, j, sj * h, k, -a)]); }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) face([[sx * h, sy * a, sz * a], [sx * a, sy * h, sz * a], [sx * a, sy * a, sz * h]]);
  return geomFrom(p, n, u, ix);
}
// any smooth form re-cut into flat facets
function facet(g) {
  const P = g.attributes.position.array, U = g.attributes.uv ? g.attributes.uv.array : null, I = g.index ? g.index.array : null, n = I ? I.length : P.length / 3, p = [], nn = [], u = [], ix = [];
  for (let t = 0; t < n; t += 3) {
    const a = I ? I[t] : t, b = I ? I[t + 1] : t + 1, c = I ? I[t + 2] : t + 2, ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-9) continue; nx /= l; ny /= l; nz /= l;
    for (const k of [a, b, c]) { p.push(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]); nn.push(nx, ny, nz); u.push(U ? U[k * 2] : 0, U ? U[k * 2 + 1] : 0); ix.push(ix.length); }
  }
  return geomFrom(p, nn, u, ix);
}
// how densely each material is mapped onto a character (world units per texture repeat): far tighter than on walls, so nothing smears up close
const RIG_UV = { rubber: .22, rust: .9, stone: .9, bronze: .9, steel: .8, brass: .8, mirror: .8, bone: .45, cloth: .5, armor: .8, iron: 1.4, hull: .6, hazard: .42, grate: .4 };
function initGeoms() {
  G.box = new BoxGeometry(1, 1, 1);
  G.boxB = new BoxGeometry(1, 1, 1).translate(0, .5, 0);
  for (const s of [4, 5, 6, 8, 10, 12, 16]) { G['cyl' + s] = new CylinderGeometry(1, 1, 1, s).translate(0, .5, 0); G['cone' + s] = new CylinderGeometry(0, 1, 1, s).translate(0, .5, 0); }
  G.sph = new SphereGeometry(1, 12, 8); G.sphLo = new SphereGeometry(1, 7, 5); G.hemi = new SphereGeometry(1, 12, 5, 0, TAU, 0, HPI);
  G.ico = new IcosahedronGeometry(1); G.oct = new OctahedronGeometry(1); G.dod = new DodecahedronGeometry(1); G.tet = new TetrahedronGeometry(1);
  G.torus = new TorusGeometry(1, .05, 6, 28); G.torusFat = new TorusGeometry(1, .14, 7, 22);
  G.plane = new PlaneGeometry(1, 1); G.planeUp = new PlaneGeometry(1, 1).rotateX(-HPI); G.planeB = new PlaneGeometry(1, 1).translate(0, .5, 0);
  G.disc = new CircleGeometry(1, 20).rotateX(-HPI); G.ring = new RingGeometry(.8, 1, 28).rotateX(-HPI);
  // a gothic column profile, and a broad bowl
  G.column = latheG([[.5, 0], [.5, .12], [.42, .16], [.44, .24], [.36, .3], [.33, .34], [.3, 2.7], [.33, 2.74], [.4, 2.8], [.36, 2.86], [.5, 2.96], [.52, 3.06], [0, 3.06]], 12);
  G.bowl = latheG([[0, 0], [.3, .02], [.62, .16], [.85, .42], [.9, .5], [.82, .5], [.6, .26], [.3, .14], [0, .12]], 12);
  G.dome = new SphereGeometry(1, 16, 6, 0, TAU, 0, HPI);
  G.bone = new CylinderGeometry(.35, .35, 1, 5).translate(0, .5, 0);
  // character forms: a soft box, a fine sphere, and lathed limb / chest / robe profiles (all one unit tall, base at the origin)
  G.rbox = roundBox(.2); G.rboxS = roundBox(.34); G.sphHi = new SphereGeometry(1, 18, 12);
  G.limb = latheG([[0, -.03], [.5, 0], [.74, .08], [.82, .3], [1, .68], [.98, .86], [.72, .98], [0, 1.03]], 10);
  G.torso = latheG([[0, -.02], [.62, 0], [.8, .07], [.8, .28], [.9, .52], [1, .76], [.92, .92], [.56, 1.02], [0, 1.05]], 14);
  G.robe = latheG([[0, 0], [.94, 0], [1, .04], [.84, .38], [.62, .8], [.52, 1], [0, 1.02]], 14);
  // hard-surface forms: bevelled plate, and limbs / chests / helms cut into flat facets
  G.cbox = chamferBox(.13); G.cboxS = chamferBox(.26);
  G.fLimb = facet(latheG([[0, -.02], [.55, 0], [.8, .12], [.72, .46], [1, .72], [.92, .94], [.5, 1.02], [0, 1.04]], 6));
  G.fTorso = facet(latheG([[0, -.02], [.66, 0], [.8, .1], [.72, .36], [1, .66], [1, .86], [.6, 1.02], [0, 1.04]], 8));
  G.fRobe = facet(latheG([[0, 0], [.94, 0], [1, .05], [.82, .4], [.6, .82], [.5, 1], [0, 1.02]], 10));
  G.fSph = facet(new SphereGeometry(1, 10, 6)); G.fHemi = facet(new SphereGeometry(1, 10, 4, 0, TAU, 0, HPI)); G.fCyl6 = facet(new CylinderGeometry(1, 1, 1, 6).translate(0, .5, 0));
  for (const k in G) addWhite(G[k]);
}

// ------------------------------------------------------------------ vertex appenders
function appendGeom(b, geom, e, cr, cg, cb, uvMode, us, vs, uvS) {
  const pa = geom.attributes.position.array, na = geom.attributes.normal.array, ua = geom.attributes.uv ? geom.attributes.uv.array : null, ia = geom.index ? geom.index.array : null;
  const base = b.p.length / 3, vc = pa.length / 3;
  const m0 = e[0], m1 = e[1], m2 = e[2], m4 = e[4], m5 = e[5], m6 = e[6], m8 = e[8], m9 = e[9], m10 = e[10], tx = e[12], ty = e[13], tz = e[14];
  // cofactor (inverse-transpose * det) for normals
  const c00 = m5 * m10 - m6 * m9, c01 = m6 * m8 - m4 * m10, c02 = m4 * m9 - m5 * m8;
  const c10 = m9 * m2 - m10 * m1, c11 = m10 * m0 - m8 * m2, c12 = m8 * m1 - m9 * m0;
  const c20 = m1 * m6 - m2 * m5, c21 = m2 * m4 - m0 * m6, c22 = m0 * m5 - m1 * m4;
  const det = m0 * c00 + m1 * c01 + m2 * c02, sg = det < 0 ? -1 : 1, inv = uvS > 0 ? 1 / uvS : 1;
  const P = b.p, N = b.n, U = b.u, C = b.c;
  for (let v = 0; v < vc; v++) {
    const x = pa[v * 3], y = pa[v * 3 + 1], z = pa[v * 3 + 2];
    const wx = m0 * x + m4 * y + m8 * z + tx, wy = m1 * x + m5 * y + m9 * z + ty, wz = m2 * x + m6 * y + m10 * z + tz;
    P.push(wx, wy, wz);
    const nx = na[v * 3], ny = na[v * 3 + 1], nz = na[v * 3 + 2];
    let ax = (c00 * nx + c10 * ny + c20 * nz) * sg, ay = (c01 * nx + c11 * ny + c21 * nz) * sg, az = (c02 * nx + c12 * ny + c22 * nz) * sg;
    const il = 1 / (Math.sqrt(ax * ax + ay * ay + az * az) || 1); ax *= il; ay *= il; az *= il;
    N.push(ax, ay, az);
    if (uvMode === 1 && uvS > 0) {
      const fx = Math.abs(ax), fy = Math.abs(ay), fz = Math.abs(az);
      if (fy >= fx && fy >= fz) U.push(wx * inv, wz * inv); else if (fx >= fz) U.push(wz * inv, wy * inv); else U.push(wx * inv, wy * inv);
    } else if (uvMode === 2 && uvS > 0) { const f = ua[v * 2]; if (f === 1) U.push(wx * inv, wz * inv); else if (f === 0) U.push(wz * inv, wy * inv); else U.push(wx * inv, wy * inv); }
    else if (ua) U.push(ua[v * 2] * us, ua[v * 2 + 1] * vs); else U.push(0, 0);
    C.push(cr, cg, cb);
  }
  const I = b.i;
  if (ia) { if (sg > 0) for (let k = 0; k < ia.length; k++) I.push(base + ia[k]); else for (let k = 0; k < ia.length; k += 3) I.push(base + ia[k], base + ia[k + 2], base + ia[k + 1]); }
  else { if (sg > 0) for (let k = 0; k < vc; k++) I.push(base + k); else for (let k = 0; k < vc; k += 3) I.push(base + k, base + k + 2, base + k + 1); }
}
function binToGeometry(b) {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(b.p), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(b.n), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(b.u), 2));
  g.setAttribute('color', new BufferAttribute(new Float32Array(b.c), 3));
  g.setIndex(new BufferAttribute(b.p.length / 3 > 65535 ? new Uint32Array(b.i) : new Uint16Array(b.i), 1));
  return g;
}
const newBin = mat => ({ mat, p: [], n: [], u: [], c: [], i: [] });
const uvOf = (mat, dense) => { const s = MATS[mat].uvS; return dense && s > 0 ? Math.min(s, RIG_UV[mat] || s) : s; };

// static world geometry, merged per material per spatial chunk so the lantern's cube shadow pass culls well
class Batcher {
  constructor(chunk = 16) { this.cs = chunk; this.bins = new Map(); }
  bin(mat, x, z) {
    const k = mat + '|' + Math.floor(x / this.cs) + '|' + Math.floor(z / this.cs);
    let b = this.bins.get(k); if (!b) { b = newBin(mat); this.bins.set(k, b); } return b;
  }
  add(geom, mat, m, cr = 1, cg = 1, cb = 1, uvMode = 0, us = 1, vs = 1) {
    const e = m.elements; appendGeom(this.bin(mat, e[12], e[14]), geom, e, cr, cg, cb, uvMode, us, vs, MATS[mat].uvS);
  }
  // a,b,c,d counter-clockwise seen from the normal side
  quad(mat, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, nx, ny, nz, c0 = 1, c1 = 1, c2 = 1, c3 = 1, tr = 1, tg = 1, tb = 1) {
    const b = this.bin(mat, (ax + cx) * .5, (az + cz) * .5), base = b.p.length / 3, uvS = MATS[mat].uvS, inv = uvS > 0 ? 1 / uvS : 1;
    b.p.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
    b.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    const fx = Math.abs(nx), fy = Math.abs(ny), fz = Math.abs(nz);
    if (uvS <= 0) b.u.push(0, 0, 1, 0, 1, 1, 0, 1);
    else if (fy >= fx && fy >= fz) b.u.push(ax * inv, az * inv, bx * inv, bz * inv, cx * inv, cz * inv, dx * inv, dz * inv);
    else if (fx >= fz) b.u.push(az * inv, ay * inv, bz * inv, by * inv, cz * inv, cy * inv, dz * inv, dy * inv);
    else b.u.push(ax * inv, ay * inv, bx * inv, by * inv, cx * inv, cy * inv, dx * inv, dy * inv);
    b.c.push(c0 * tr, c0 * tg, c0 * tb, c1 * tr, c1 * tg, c1 * tb, c2 * tr, c2 * tg, c2 * tb, c3 * tr, c3 * tg, c3 * tb);
    b.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  *build(group) {
    for (const b of this.bins.values()) {
      if (!b.p.length) continue;
      const def = MATS[b.mat], mesh = new Mesh(binToGeometry(b), def.m);
      mesh.castShadow = def.cast; mesh.receiveShadow = def.recv; mesh.renderOrder = def.order; mesh.matrixAutoUpdate = false;
      group.add(mesh); b.p = b.n = b.u = b.c = b.i = null; yield mesh;
    }
    this.bins.clear();
  }
}
// collects one rigid part (in local space) for rigs
class PartSink {
  constructor(dense) { this.bins = new Map(); this.dense = dense; }
  add(geom, mat, m, cr = 1, cg = 1, cb = 1, uvMode = 0, us = 1, vs = 1) {
    let b = this.bins.get(mat); if (!b) { b = newBin(mat); this.bins.set(mat, b); }
    appendGeom(b, geom, m.elements, cr, cg, cb, uvMode, us, vs, uvOf(mat, this.dense));
  }
  finish() { const out = []; for (const b of this.bins.values()) out.push({ mat: b.mat, geometry: binToGeometry(b) }); return out; }
}

// ------------------------------------------------------------------ modelling kit
const _Y = new Vector3(0, 1, 0);
class Kit {
  constructor(sink) {
    this.sink = sink; this.base = new Matrix4(); this.m = new Matrix4(); this.l = new Matrix4();
    this.q = new Quaternion(); this.e = new Euler(); this.p = new Vector3(); this.s = new Vector3(); this.d = new Vector3(); this.col = [1, 1, 1];
  }
  at(x, y, z, ry = 0, sc = 1) { this.e.set(0, ry, 0); this.q.setFromEuler(this.e); this.base.compose(this.p.set(x, y, z), this.q, this.s.set(sc, sc, sc)); return this; }
  tint(r = 1, g, b) { this.col[0] = r; this.col[1] = g === undefined ? r : g; this.col[2] = b === undefined ? r : b; return this; }
  geo(g, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, uvMode = 0, us = 1, vs = 1) {
    this.e.set(rx, ry, rz); this.q.setFromEuler(this.e); this.l.compose(this.p.set(x, y, z), this.q, this.s.set(sx, sy, sz)); this.m.multiplyMatrices(this.base, this.l);
    this.sink.add(g, mat, this.m, this.col[0], this.col[1], this.col[2], uvMode, us, vs); return this;
  }
  box(mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) { return this.geo(G.box, mat, x, y, z, sx, sy, sz, rx, ry, rz, 1); }
  boxB(mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) { return this.geo(G.boxB, mat, x, y, z, sx, sy, sz, rx, ry, rz, 1); }
  // soft-edged box (soft = true rounds it further), and a lathed form of radius (rx_, rz_) and height h standing on (x, y, z)
  cbox(mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, deep = false) { return this.geo(deep ? G.cboxS : G.cbox, mat, x, y, z, sx, sy, sz, rx, ry, rz, 2); }
  rbox(mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, soft = false) { return this.geo(soft ? G.rboxS : G.rbox, mat, x, y, z, sx, sy, sz, rx, ry, rz, 2); }
  lathe(g, mat, x, y, z, rx_, h, rz_ = rx_, rx = 0, rz = 0, ry = 0) { this._uvs(mat, Math.max(rx_, rz_), h); return this.geo(g, mat, x, y, z, rx_, h, rz_, rx, ry, rz, 0, this._us, this._vs); }
  _uvs(mat, r, h) { const s = uvOf(mat, this.sink.dense); this._us = s > 0 ? Math.max(1, Math.round(TAU * r / s)) : 1; this._vs = s > 0 ? Math.max(.25, h / s) : 1; }
  cyl(mat, x, y, z, r, h, seg = 8, rx = 0, rz = 0, top = 1, ry = 0) { this._uvs(mat, r, h); return this.geo(top === 1 ? G['cyl' + seg] : cylT(seg, top), mat, x, y, z, r, h, r, rx, ry, rz, 0, this._us, this._vs); }
  cone(mat, x, y, z, r, h, seg = 8, rx = 0, rz = 0) { this._uvs(mat, r, h); return this.geo(G['cone' + seg], mat, x, y, z, r, h, r, rx, 0, rz, 0, this._us, this._vs); }
  sph(mat, x, y, z, rx_, ry_ = rx_, rz_ = rx_, g = G.sph, rotY = 0) { this._uvs(mat, rx_, ry_ * 2); return this.geo(g, mat, x, y, z, rx_, ry_, rz_, 0, rotY, 0, 0, this._us, this._vs); }
  // flat torus ring of radius r (tube scales with r unless thick given)
  ring(mat, x, y, z, r, fat = false, rx = HPI, ry = 0, rz = 0, thick = 0) { const t = thick ? thick / (fat ? .14 : .05) : r; return this.geo(fat ? G.torusFat : G.torus, mat, x, y, z, r, r, t, rx, ry, rz); }
  // cylinder strut between two points
  beam(mat, x0, y0, z0, x1, y1, z1, r, seg = 6, top = 1, g = null) {
    this.d.set(x1 - x0, y1 - y0, z1 - z0); const len = this.d.length() || .001; this.d.multiplyScalar(1 / len); this.q.setFromUnitVectors(_Y, this.d);
    this.l.compose(this.p.set(x0, y0, z0), this.q, this.s.set(r, len, r)); this.m.multiplyMatrices(this.base, this.l); this._uvs(mat, r, len);
    this.sink.add(g || (top === 1 ? G['cyl' + seg] : cylT(seg, top)), mat, this.m, this.col[0], this.col[1], this.col[2], 0, this._us, this._vs); return this;
  }
  // box bar between two points (w x d cross-section)
  bar(mat, x0, y0, z0, x1, y1, z1, w, dd = w) {
    this.d.set(x1 - x0, y1 - y0, z1 - z0); const len = this.d.length() || .001; this.d.multiplyScalar(1 / len); this.q.setFromUnitVectors(_Y, this.d);
    this.l.compose(this.p.set(x0, y0, z0), this.q, this.s.set(w, len, dd)); this.m.multiplyMatrices(this.base, this.l);
    this.sink.add(G.boxB, mat, this.m, this.col[0], this.col[1], this.col[2], 1); return this;
  }
  // crossed flame quads: w wide, h tall, colour is HDR
  flame(x, y, z, w, h, r = 5, g = 2.2, b = .5) {
    const c = this.col; this.col = [r, g, b];
    this.geo(G.planeB, 'flame', x, y, z, w, h, 1, 0, PI / 4, 0); this.geo(G.planeB, 'flame', x, y, z, w, h, 1, 0, -PI / 4, 0);
    this.col = c; return this;
  }
}
const _kitSink = { add() { } };
function buildPart(fn, dense) { const sink = new PartSink(dense), k = new Kit(sink); fn(k); return sink.finish(); }
const cloneMat = m => m.clone();
function partObj(parts, mats) {
  const g = new Group();
  for (const p of parts) {
    const def = MATS[p.mat], mesh = new Mesh(p.geometry, (mats && mats[p.mat]) || def.m);
    mesh.castShadow = def.cast; mesh.receiveShadow = def.recv; mesh.renderOrder = def.order; g.add(mesh);
  }
  return g;
}
// ------------------------------------------------------------------ rigs: named bone hierarchy with merged part meshes
const RIG_CACHE = new Map();
function rigTemplate(key, defFn) {
  let t = RIG_CACHE.get(key);
  if (!t) { const bones = []; defFn((name, parent, x, y, z, fn) => bones.push({ name, parent, x, y, z, parts: fn ? buildPart(fn, true) : [] })); t = { bones }; RIG_CACHE.set(key, t); }
  return t;
}
function rigInstance(t, cloneMats = true) {
  const b = {}, mats = {}, root = new Group();
  for (const bone of t.bones) {
    if (cloneMats) for (const p of bone.parts) { const def = MATS[p.mat]; if (!mats[p.mat] && !def.m.kind) mats[p.mat] = cloneMat(def.m); }
    const o = partObj(bone.parts, mats); o.position.set(bone.x, bone.y, bone.z); b[bone.name] = o;
    (bone.parent ? b[bone.parent] : root).add(o);
  }
  return { root, b, mats, flash: 0 };
}
function rigFlash(rig, v, r = 1, g = 1, b = 1) {       // v: 0..1 white-hot hit flash
  for (const k in rig.mats) { const m = rig.mats[k]; if (m._baseE === undefined) m._baseE = m.emissive.clone(); m.emissive.setRGB(m._baseE.r + v * .9 * r, m._baseE.g + v * .9 * g, m._baseE.b + v * .9 * b); }
}
function rigDispose(rig) { for (const k in rig.mats) rig.mats[k].dispose(); }
