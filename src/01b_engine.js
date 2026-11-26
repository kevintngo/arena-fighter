// =====================================================================================
//  HAND-BUILT WEBGL2 ENGINE: math, scene graph, geometry, textures, PBR forward shading with
//  cube-shadowed lantern and shadowed spot, instancing, points, lines, render targets.
// =====================================================================================
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  setScalar(s) { this.x = this.y = this.z = s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  applyMatrix4(m) { const e = m.elements, x = this.x, y = this.y, z = this.z; this.x = e[0] * x + e[4] * y + e[8] * z + e[12]; this.y = e[1] * x + e[5] * y + e[9] * z + e[13]; this.z = e[2] * x + e[6] * y + e[10] * z + e[14]; return this; }
  applyQuaternion(q) { const x = this.x, y = this.y, z = this.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w, tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x); this.x = x + qw * tx + qy * tz - qz * ty; this.y = y + qw * ty + qz * tx - qx * tz; this.z = z + qw * tz + qx * ty - qy * tx; return this; }
  applyEuler(e) { return this.applyQuaternion(_qE.setFromEuler(e)); }
}
class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } set(x, y) { this.x = x; this.y = y; return this; } }
class Vector4 { constructor(x = 0, y = 0, z = 0, w = 0) { this.x = x; this.y = y; this.z = z; this.w = w; } set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; } }
class Color {
  constructor(r = 1, g = 1, b = 1) { this.r = r; this.g = g; this.b = b; }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Color(this.r, this.g, this.b); }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
}
class Euler { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; this.order = 'XYZ'; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class Quaternion {
  constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
  setFromEuler(e) {
    const c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2);
    if (e.order === 'YXZ') { this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 - s1 * s2 * c3; this.w = c1 * c2 * c3 + s1 * s2 * s3; }
    else { this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 + s1 * s2 * c3; this.w = c1 * c2 * c3 - s1 * s2 * s3; }
    return this;
  }
  setFromUnitVectors(a, b) {
    let r = a.x * b.x + a.y * b.y + a.z * b.z + 1;
    if (r < 1e-6) { r = 0; if (Math.abs(a.x) > Math.abs(a.z)) { this.x = -a.y; this.y = a.x; this.z = 0; } else { this.x = 0; this.y = -a.z; this.z = a.y; } }
    else { this.x = a.y * b.z - a.z * b.y; this.y = a.z * b.x - a.x * b.z; this.z = a.x * b.y - a.y * b.x; }
    this.w = r; const l = 1 / (Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + r * r) || 1); this.x *= l; this.y *= l; this.z *= l; this.w *= l; return this;
  }
}
class Matrix4 {
  constructor() { this.elements = new Float32Array(16); this.identity(); }
  identity() { const e = this.elements; e.fill(0); e[0] = e[5] = e[10] = e[15] = 1; return this; }
  copy(m) { this.elements.set(m.elements); return this; }
  compose(p, q, s) {
    const e = this.elements, x = q.x, y = q.y, z = q.z, w = q.w, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2, sx = s.x, sy = s.y, sz = s.z;
    e[0] = (1 - (yy + zz)) * sx; e[1] = (xy + wz) * sx; e[2] = (xz - wy) * sx; e[3] = 0; e[4] = (xy - wz) * sy; e[5] = (1 - (xx + zz)) * sy; e[6] = (yz + wx) * sy; e[7] = 0;
    e[8] = (xz + wy) * sz; e[9] = (yz - wx) * sz; e[10] = (1 - (xx + yy)) * sz; e[11] = 0; e[12] = p.x; e[13] = p.y; e[14] = p.z; e[15] = 1; return this;
  }
  multiplyMatrices(a, b) {
    const A = a.elements, Bm = b.elements, e = this.elements;
    const a11 = A[0], a21 = A[1], a31 = A[2], a41 = A[3], a12 = A[4], a22 = A[5], a32 = A[6], a42 = A[7], a13 = A[8], a23 = A[9], a33 = A[10], a43 = A[11], a14 = A[12], a24 = A[13], a34 = A[14], a44 = A[15];
    for (let c = 0; c < 4; c++) { const b1 = Bm[c * 4], b2 = Bm[c * 4 + 1], b3 = Bm[c * 4 + 2], b4 = Bm[c * 4 + 3]; e[c * 4] = a11 * b1 + a12 * b2 + a13 * b3 + a14 * b4; e[c * 4 + 1] = a21 * b1 + a22 * b2 + a23 * b3 + a24 * b4; e[c * 4 + 2] = a31 * b1 + a32 * b2 + a33 * b3 + a34 * b4; e[c * 4 + 3] = a41 * b1 + a42 * b2 + a43 * b3 + a44 * b4; }
    return this;
  }
  // camera matrices: look along f from p (r, u, f orthonormal); orthographic and perspective projections
  view(p, r, u, f) { const e = this.elements; e[0] = r.x; e[4] = r.y; e[8] = r.z; e[12] = -(r.x * p.x + r.y * p.y + r.z * p.z); e[1] = u.x; e[5] = u.y; e[9] = u.z; e[13] = -(u.x * p.x + u.y * p.y + u.z * p.z); e[2] = -f.x; e[6] = -f.y; e[10] = -f.z; e[14] = f.x * p.x + f.y * p.y + f.z * p.z; e[3] = e[7] = e[11] = 0; e[15] = 1; return this; }
  ortho(hw, hh, n, f) { const e = this.elements; e.fill(0); e[0] = 1 / hw; e[5] = 1 / hh; e[10] = -2 / (f - n); e[14] = -(f + n) / (f - n); e[15] = 1; return this; }
  persp(tanHalf, n, f) { const e = this.elements; e.fill(0); e[0] = 1 / tanHalf; e[5] = 1 / tanHalf; e[10] = -(f + n) / (f - n); e[11] = -1; e[14] = -2 * f * n / (f - n); return this; }
}
const _qE = new Quaternion(), _qO = new Quaternion();
class Group {
  constructor() {
    this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1); this.children = []; this.parent = null; this.visible = true;
    this.matrix = new Matrix4(); this.matrixWorld = new Matrix4(); this.matrixAutoUpdate = true; this.userData = {}; this.renderOrder = 0; this.frustumCulled = true; this.castShadow = false; this.receiveShadow = false;
  }
  add() { for (let i = 0; i < arguments.length; i++) { const c = arguments[i]; if (c.parent) c.parent.remove(c); c.parent = this; this.children.push(c); } return this; }
  remove(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parent = null; } return this; }
  clear() { for (const c of this.children) c.parent = null; this.children.length = 0; }
  updateMatrixWorld() {
    if (this.matrixAutoUpdate) this.matrix.compose(this.position, _qO.setFromEuler(this.rotation), this.scale);
    if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix);
    const ch = this.children; for (let i = 0; i < ch.length; i++) ch[i].updateMatrixWorld();
  }
  getWorldPosition(v) { const e = this.matrixWorld.elements; return v.set(e[12], e[13], e[14]); }
  getWorldQuaternion(q) {
    const e = this.matrixWorld.elements, sx = 1 / (Math.hypot(e[0], e[1], e[2]) || 1), sy = 1 / (Math.hypot(e[4], e[5], e[6]) || 1), sz = 1 / (Math.hypot(e[8], e[9], e[10]) || 1);
    const m11 = e[0] * sx, m21 = e[1] * sx, m31 = e[2] * sx, m12 = e[4] * sy, m22 = e[5] * sy, m32 = e[6] * sy, m13 = e[8] * sz, m23 = e[9] * sz, m33 = e[10] * sz, tr = m11 + m22 + m33;
    if (tr > 0) { const s = .5 / Math.sqrt(tr + 1); q.w = .25 / s; q.x = (m32 - m23) * s; q.y = (m13 - m31) * s; q.z = (m21 - m12) * s; }
    else if (m11 > m22 && m11 > m33) { const s = 2 * Math.sqrt(1 + m11 - m22 - m33); q.w = (m32 - m23) / s; q.x = .25 * s; q.y = (m12 + m21) / s; q.z = (m13 + m31) / s; }
    else if (m22 > m33) { const s = 2 * Math.sqrt(1 + m22 - m11 - m33); q.w = (m13 - m31) / s; q.x = (m12 + m21) / s; q.y = .25 * s; q.z = (m23 + m32) / s; }
    else { const s = 2 * Math.sqrt(1 + m33 - m11 - m22); q.w = (m21 - m12) / s; q.x = (m13 + m31) / s; q.y = (m23 + m32) / s; q.z = .25 * s; }
    return q;
  }
}
class Mesh extends Group { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; this.isMesh = true; } }
class Points extends Mesh { constructor(g, m) { super(g, m); this.mode = 0; } }
class LineSegments extends Mesh { constructor(g, m) { super(g, m); this.mode = 1; } }
class InstancedMesh extends Mesh {
  constructor(g, m, n) { super(g, m); this.count = n; this.instanceMatrix = new BufferAttribute(new Float32Array(n * 16), 16); this.instanceColor = null; this.inst = true; for (let i = 0; i < n; i++) this.instanceMatrix.array[i * 16] = this.instanceMatrix.array[i * 16 + 5] = this.instanceMatrix.array[i * 16 + 10] = this.instanceMatrix.array[i * 16 + 15] = 1; }
  setMatrixAt(i, m) { this.instanceMatrix.array.set(m.elements, i * 16); }
  setColorAt(i, c) { if (!this.instanceColor) { this.instanceColor = new BufferAttribute(new Float32Array(this.instanceMatrix.count * 3).fill(1), 3); } const a = this.instanceColor.array; a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  dispose() { GX.freeMesh(this); }
}
class BufferAttribute {
  constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; this.needsUpdate = true; this.dyn = false; this.buf = null; }
  setUsage() { this.dyn = true; return this; }
  getX(i) { return this.array[i * this.itemSize]; } getY(i) { return this.array[i * this.itemSize + 1]; }
  setX(i, v) { this.array[i * this.itemSize] = v; } setXY(i, x, y) { this.array[i * this.itemSize] = x; this.array[i * this.itemSize + 1] = y; }
}
function Float32BufferAttribute(a, n) { return new BufferAttribute(a instanceof Float32Array ? a : new Float32Array(a), n); }
class BufferGeometry {
  constructor() { this.attributes = {}; this.index = null; this.drawCount = -1; this.vao = null; this.bs = null; }
  setAttribute(n, a) { this.attributes[n] = a; return this; }
  setIndex(a) { if (!a.array) a = new BufferAttribute(a.length > 65535 || Math.max.apply(null, a.length < 60000 ? a : [70000]) > 65535 ? new Uint32Array(a) : new Uint16Array(a), 1); this.index = a; return this; }
  setDrawRange(s, n) { this.drawCount = n; }
  translate(x, y, z) { const p = this.attributes.position.array; for (let i = 0; i < p.length; i += 3) { p[i] += x; p[i + 1] += y; p[i + 2] += z; } return this; }
  rotateX(a) { const c = Math.cos(a), s = Math.sin(a); for (const n of ['position', 'normal']) { const p = this.attributes[n].array; for (let i = 0; i < p.length; i += 3) { const y = p[i + 1], z = p[i + 2]; p[i + 1] = y * c - z * s; p[i + 2] = y * s + z * c; } } return this; }
  clone() { const g = new BufferGeometry(); for (const n in this.attributes) { const a = this.attributes[n]; g.attributes[n] = new BufferAttribute(a.array.slice(), a.itemSize); } if (this.index) g.index = new BufferAttribute(this.index.array.slice(), 1); return g; }
  computeVertexNormals() {
    const p = this.attributes.position.array, ix = this.index.array; let na = this.attributes.normal; if (!na) { na = new BufferAttribute(new Float32Array(p.length), 3); na.dyn = true; this.attributes.normal = na; } const n = na.array; n.fill(0);
    for (let i = 0; i < ix.length; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3, e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2], e2x = p[c] - p[a], e2y = p[c + 1] - p[a + 1], e2z = p[c + 2] - p[a + 2], nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; n[a] += nx; n[a + 1] += ny; n[a + 2] += nz; n[b] += nx; n[b + 1] += ny; n[b + 2] += nz; n[c] += nx; n[c + 1] += ny; n[c + 2] += nz; }
    for (let i = 0; i < n.length; i += 3) { const l = 1 / (Math.hypot(n[i], n[i + 1], n[i + 2]) || 1); n[i] *= l; n[i + 1] *= l; n[i + 2] *= l; } na.needsUpdate = true;
  }
  sphere() { if (!this.bs) { const p = this.attributes.position.array; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9; for (let i = 0; i < p.length; i += 3) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); z0 = Math.min(z0, p[i + 2]); z1 = Math.max(z1, p[i + 2]); } const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2; let r = 0; for (let i = 0; i < p.length; i += 3) r = Math.max(r, (p[i] - cx) ** 2 + (p[i + 1] - cy) ** 2 + (p[i + 2] - cz) ** 2); this.bs = [cx, cy, cz, Math.sqrt(r)]; } return this.bs; }
  dispose() { GX.freeGeom(this); }
}
// ---- primitive geometry (position, normal, uv, indexed)
function geomFrom(p, n, u, ix) { const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(p), 3)); g.setAttribute('normal', new BufferAttribute(new Float32Array(n), 3)); g.setAttribute('uv', new BufferAttribute(new Float32Array(u), 2)); if (ix) g.setIndex(ix); return g; }
function PlaneGeometry(w = 1, h = 1, ws = 1, hs = 1) {
  const p = [], n = [], u = [], ix = [];
  for (let j = 0; j <= hs; j++) for (let i = 0; i <= ws; i++) { p.push((i / ws - .5) * w, (.5 - j / hs) * h, 0); n.push(0, 0, 1); u.push(i / ws, 1 - j / hs); }
  for (let j = 0; j < hs; j++) for (let i = 0; i < ws; i++) { const a = j * (ws + 1) + i, b = a + ws + 1; ix.push(a, b, a + 1, b, b + 1, a + 1); }
  return geomFrom(p, n, u, ix);
}
function BoxGeometry(w = 1, h = 1, d = 1) {
  const p = [], n = [], u = [], ix = [], f = [[1, 0, 0, 0, 0, -1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1], [0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0]];
  f.forEach((q, k) => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const a = i * 2 - 1, b = j * 2 - 1; p.push((q[0] + q[3] * a + q[6] * b) * w / 2, (q[1] + q[4] * a + q[7] * b) * h / 2, (q[2] + q[5] * a + q[8] * b) * d / 2); n.push(q[0], q[1], q[2]); u.push(i, j); } const o = k * 4; ix.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); });
  return geomFrom(p, n, u, ix);
}
function CylinderGeometry(rt = 1, rb = 1, h = 1, seg = 8) {
  const p = [], n = [], u = [], ix = [], sl = (rb - rt) / h;
  for (let j = 0; j < 2; j++) for (let i = 0; i <= seg; i++) { const a = i / seg * TAU, s = Math.sin(a), c = Math.cos(a), r = j ? rb : rt, l = 1 / Math.hypot(1, sl); p.push(r * s, (.5 - j) * h, r * c); n.push(s * l, sl * l, c * l); u.push(i / seg, 1 - j); }
  for (let i = 0; i < seg; i++) { const a = i, b = i + seg + 1; ix.push(a, b, a + 1, b, b + 1, a + 1); }
  for (const top of [1, 0]) { const r = top ? rt : rb; if (r <= 0) continue; const o = p.length / 3, y = top ? h / 2 : -h / 2; p.push(0, y, 0); n.push(0, top ? 1 : -1, 0); u.push(.5, .5); for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; p.push(r * Math.sin(a), y, r * Math.cos(a)); n.push(0, top ? 1 : -1, 0); u.push(Math.sin(a) * .5 + .5, Math.cos(a) * .5 + .5); } for (let i = 0; i < seg; i++) { if (top) ix.push(o, o + 1 + i, o + 2 + i); else ix.push(o, o + 2 + i, o + 1 + i); } }
  return geomFrom(p, n, u, ix);
}
function SphereGeometry(r = 1, ws = 12, hs = 8, p0 = 0, pl = TAU, t0 = 0, tl = PI) {
  const p = [], n = [], u = [], ix = [];
  for (let j = 0; j <= hs; j++) for (let i = 0; i <= ws; i++) { const th = t0 + j / hs * tl, ph = p0 + i / ws * pl, x = -Math.cos(ph) * Math.sin(th), y = Math.cos(th), z = Math.sin(ph) * Math.sin(th); p.push(x * r, y * r, z * r); n.push(x, y, z); u.push(i / ws, 1 - j / hs); }
  for (let j = 0; j < hs; j++) for (let i = 0; i < ws; i++) { const a = j * (ws + 1) + i, b = a + ws + 1; ix.push(a, b, a + 1, b, b + 1, a + 1); }
  return geomFrom(p, n, u, ix);
}
function TorusGeometry(r = 1, tube = .1, rs = 6, ts = 24, arc = TAU) {
  const p = [], n = [], u = [], ix = [];
  for (let j = 0; j <= rs; j++) for (let i = 0; i <= ts; i++) { const a = i / ts * arc, v = j / rs * TAU, cx = Math.cos(a) * r, cy = Math.sin(a) * r, x = (r + tube * Math.cos(v)) * Math.cos(a), y = (r + tube * Math.cos(v)) * Math.sin(a), z = tube * Math.sin(v); p.push(x, y, z); n.push((x - cx) / tube, (y - cy) / tube, z / tube); u.push(i / ts, j / rs); }
  for (let j = 1; j <= rs; j++) for (let i = 1; i <= ts; i++) { const a = (ts + 1) * j + i - 1, b = (ts + 1) * (j - 1) + i - 1, c = (ts + 1) * (j - 1) + i, d = (ts + 1) * j + i; ix.push(a, b, d, b, c, d); }
  return geomFrom(p, n, u, ix);
}
function CircleGeometry(r = 1, seg = 20) { const p = [0, 0, 0], n = [0, 0, 1], u = [.5, .5], ix = []; for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; p.push(r * Math.cos(a), r * Math.sin(a), 0); n.push(0, 0, 1); u.push(Math.cos(a) * .5 + .5, Math.sin(a) * .5 + .5); } for (let i = 1; i <= seg; i++) ix.push(i, i + 1, 0); return geomFrom(p, n, u, ix); }
function RingGeometry(ri = .5, ro = 1, seg = 28) { const p = [], n = [], u = [], ix = []; for (let j = 0; j < 2; j++) for (let i = 0; i <= seg; i++) { const a = i / seg * TAU, r = j ? ro : ri; p.push(r * Math.cos(a), r * Math.sin(a), 0); n.push(0, 0, 1); u.push(Math.cos(a) * r / ro * .5 + .5, Math.sin(a) * r / ro * .5 + .5); } for (let i = 0; i < seg; i++) { const a = i, b = i + seg + 1; ix.push(a, b, a + 1, b, b + 1, a + 1); } return geomFrom(p, n, u, ix); }
function LatheGeometry(pts, seg = 12) {
  const p = [], n = [], u = [], ix = [], m = pts.length;
  for (let i = 0; i <= seg; i++) for (let j = 0; j < m; j++) { const a = i / seg * TAU, q = pts[j], q0 = pts[Math.max(0, j - 1)], q1 = pts[Math.min(m - 1, j + 1)], dx = q1.x - q0.x, dy = q1.y - q0.y, l = 1 / (Math.hypot(dx, dy) || 1), nr = dy * l, ny = -dx * l; p.push(q.x * Math.sin(a), q.y, q.x * Math.cos(a)); n.push(nr * Math.sin(a), ny, nr * Math.cos(a)); u.push(i / seg, j / (m - 1)); }
  for (let i = 0; i < seg; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + m; ix.push(a, b, a + 1, b, b + 1, a + 1); }
  return geomFrom(p, n, u, ix);
}
function polyGeom(v, f, r = 1) {      // flat-shaded polyhedron from vertices and triangle faces
  const p = [], n = [], u = [];
  for (let i = 0; i < f.length; i += 3) { const t = [f[i], f[i + 1], f[i + 2]].map(k => { const x = v[k * 3], y = v[k * 3 + 1], z = v[k * 3 + 2], l = r / Math.hypot(x, y, z); return [x * l, y * l, z * l]; }), a = t[0], b = t[1], c = t[2];
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]), l = 1 / Math.hypot(nx, ny, nz);
    for (const q of t) { p.push(q[0], q[1], q[2]); n.push(nx * l, ny * l, nz * l); u.push(Math.atan2(q[2], -q[0]) / TAU + .5, Math.atan2(-q[1], Math.hypot(q[0], q[2])) / PI + .5); } }
  return geomFrom(p, n, u, null);
}
const _PH = (1 + Math.sqrt(5)) / 2;
function TetrahedronGeometry(r) { return polyGeom([1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1], [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1], r); }
function OctahedronGeometry(r) { return polyGeom([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1], [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2], r); }
function IcosahedronGeometry(r) { return polyGeom([-1, _PH, 0, 1, _PH, 0, -1, -_PH, 0, 1, -_PH, 0, 0, -1, _PH, 0, 1, _PH, 0, -1, -_PH, 0, 1, -_PH, _PH, 0, -1, _PH, 0, 1, -_PH, 0, -1, -_PH, 0, 1], [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1], r); }
function DodecahedronGeometry(r) { const t = _PH, q = 1 / t; return polyGeom([-1, -1, -1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, -1, -1, 1, -1, 1, 1, 1, -1, 1, 1, 1, 0, -q, -t, 0, -q, t, 0, q, -t, 0, q, t, -q, -t, 0, -q, t, 0, q, -t, 0, q, t, 0, -t, 0, -q, t, 0, -q, -t, 0, q, t, 0, q],
  [3, 11, 7, 3, 7, 15, 3, 15, 13, 7, 19, 17, 7, 17, 6, 7, 6, 15, 17, 4, 8, 17, 8, 10, 17, 10, 6, 8, 0, 16, 8, 16, 2, 8, 2, 10, 0, 12, 1, 0, 1, 18, 0, 18, 16, 6, 10, 2, 6, 2, 13, 6, 13, 15, 2, 16, 18, 2, 18, 3, 2, 3, 13, 18, 1, 9, 18, 9, 11, 18, 11, 3, 4, 14, 12, 4, 12, 0, 4, 0, 8, 11, 9, 5, 11, 5, 19, 11, 19, 7, 19, 5, 14, 19, 14, 4, 19, 4, 17, 1, 12, 14, 1, 14, 5, 1, 5, 9], r); }
// ---- textures and render targets
class Tex {
  constructor(src, w, h, o = {}) { this.src = src; this.w = w; this.h = h; this.srgb = !!o.srgb; this.rep = !!o.rep; this.mip = o.mip !== false; this.nearest = !!o.nearest; this.flip = !!o.flip; this.t = null; }
  get() {
    if (!this.t) {
      const gl = GX.gl, t = this.t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      const f = this.srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8; if (this.src.getContext) gl.texImage2D(gl.TEXTURE_2D, 0, f, gl.RGBA, gl.UNSIGNED_BYTE, this.src); else gl.texImage2D(gl.TEXTURE_2D, 0, f, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); const w = this.rep ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.nearest ? gl.NEAREST : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      if (this.mip) { gl.generateMipmap(gl.TEXTURE_2D); if (GX.aniso) gl.texParameterf(gl.TEXTURE_2D, GX.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4); }
    }
    return this.t;
  }
}
class RT {            // colour (+ optional depth texture) render target; type: 0 = RGBA8, 1 = RGBA16F
  constructor(w, h, hdr, linear, depth) {
    const gl = GX.gl; this.width = w; this.height = h; this.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    const mk = (ifmt, fmt, type, filt, att) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.framebufferTexture2D(gl.FRAMEBUFFER, att, gl.TEXTURE_2D, t, 0); return { t, get() { return this.t; } }; };
    this.texture = mk(hdr ? gl.RGBA16F : gl.RGBA8, gl.RGBA, hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, linear ? gl.LINEAR : gl.NEAREST, gl.COLOR_ATTACHMENT0);
    this.depthTexture = depth ? mk(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST, gl.DEPTH_ATTACHMENT) : null;
  }
  dispose() { const gl = GX.gl; gl.deleteFramebuffer(this.fb); gl.deleteTexture(this.texture.t); if (this.depthTexture) gl.deleteTexture(this.depthTexture.t); }
}
// ---- materials: plain parameter bags; shaders are chosen by kind / variant
const DoubleSide = 2; let _mid = 0;
class Material {
  constructor(kind, o) { this.kind = kind; this.id = ++_mid; this.color = new Color(1, 1, 1); this.side = 0; this.blend = 0; this.depthTest = true; this.depthWrite = true; this.opacity = 1; this.polygonOffset = false; this.vertexColors = false; Object.assign(this, o); if (this.blend) this.depthWrite = false; }
  clone() { const m = Object.assign(Object.create(Object.getPrototypeOf(this)), this); m.color = this.color.clone(); if (this.emissive) m.emissive = this.emissive.clone(); m._baseE = undefined; m.id = ++_mid; return m; }
  dispose() { }
}
class MeshStandardMaterial extends Material { constructor(o) { super(0, Object.assign({ roughness: 1, metalness: 0, emissive: new Color(0, 0, 0), envMapIntensity: 1, alphaTest: 0, variant: '' }, o)); } }
class MeshBasicMaterial extends Material { constructor(o) { super(1, o); } }
class LineBasicMaterial extends Material { constructor(o) { super(1, o); } }
class ShaderMaterial extends Material { constructor(o) { super(2, o); } }
// ---- GL core
const ATTRS = ['position', 'normal', 'uv', 'color', 'instanceMatrix', '', '', '', 'instanceColor', 'aVel', 'aT', 'aC'];
const SH_HEAD = '#version 300 es\nprecision highp float; precision highp int; precision highp sampler2D; precision highp samplerCube; precision highp sampler2DShadow;\n';
const SH_VS = SH_HEAD + '#define attribute in\n#define varying out\n#define texture2D texture\nuniform mat4 modelMatrix, viewMatrix, projectionMatrix, modelViewMatrix;\nin vec3 position; in vec3 normal; in vec2 uv; in vec3 color;\n';
const SH_FS = SH_HEAD + '#define varying in\n#define texture2D texture\nout highp vec4 pc_o;\n#define gl_FragColor pc_o\n';
const PASS_VS = SH_HEAD + 'in vec3 position; in vec2 uv; out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const STD_VS = `
in vec3 position; in vec3 normal; in vec2 uv; in vec3 color;
#ifdef INST
in mat4 instanceMatrix; in vec3 instanceColor;
#endif
uniform mat4 uM, uVP; uniform float uTime;
out vec3 vW; out vec3 vN; out vec2 vUv; out vec3 vC;
void main(){
  vec3 p = position; mat4 M = uM;
#ifdef V_BANNER
  p += normal*sin(uTime*1.3 + position.x*1.7 + position.z*1.3 + uv.y*4.0)*0.09*(1.0 - uv.y);
#endif
#ifdef V_OOZE
  p *= 1.0 + 0.06*sin(uTime*3.0 + position.y*5.0 + position.x*4.0);
#endif
#ifdef INST
  M = uM*instanceMatrix;
#endif
  vec4 w = M*vec4(p, 1.0); vW = w.xyz;
  vN = mat3(M)*(normal/vec3(dot(M[0].xyz, M[0].xyz), dot(M[1].xyz, M[1].xyz), dot(M[2].xyz, M[2].xyz)));
  vUv = uv; vC = color;
#ifdef INST
  vC *= instanceColor;
#endif
  gl_Position = uVP*w;
}`;
const DEPTH_FS = `in vec3 vW; uniform vec3 uLP; uniform float uLF; out vec4 o; void main(){ o = vec4(length(vW - uLP)/uLF); }`;
const BASIC_FS = `in vec2 vUv; in vec3 vC; uniform sampler2D map; uniform vec3 uColor; uniform vec4 uRM; out vec4 o; void main(){ vec4 t = texture(map, vUv); o = vec4(t.rgb*uColor*vC, t.a*uRM.z); }`;
const CUBE_F = [[1, 0, 0, 0, -1, 0], [-1, 0, 0, 0, -1, 0], [0, 1, 0, 0, 0, 1], [0, -1, 0, 0, 0, -1], [0, 0, 1, 0, -1, 0], [0, 0, -1, 0, -1, 0]];
const GX = {
  gl: null, progs: new Map(), aniso: null, cur: null, frame: 0, pid: 0, sk: -1, lastM: null, lastP: null, vp: new Matrix4(), view: new Matrix4(), proj: new Matrix4(), list: [], trans: [], casters: [], near: [],
  white: null, flat: null, cube: null, cubeFb: null, cubeDepth: null, cubeSize: 0, spotRT: null, spotM: new Matrix4(), tmpM: new Matrix4(), tmpV: new Matrix4(), calls: 0,
  init(canvas) {
    const gl = this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }); if (!gl) return false;
    if (!gl.getExtension('EXT_color_buffer_float')) gl.getExtension('EXT_color_buffer_half_float'); gl.getExtension('OES_texture_float_linear'); this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const px = (r, g, b) => new Tex(new Uint8Array([r, g, b, 255]), 1, 1, { mip: false, rep: true }); this.white = px(255, 255, 255); this.flat = px(128, 128, 255);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clearColor(0, 0, 0, 1); gl.vertexAttrib3f(3, 1, 1, 1); gl.vertexAttrib3f(1, 0, 1, 0); gl.vertexAttrib3f(8, 1, 1, 1); return true;
  },
  compile(vs, fs) {
    const gl = this.gl, mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n').slice(0, 6000)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); ATTRS.forEach((n, i) => { if (n) gl.bindAttribLocation(p, i, n); }); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), name = a.name.replace('[0]', ''); u[name] = { loc: gl.getUniformLocation(p, a.name), type: a.type, size: a.size, unit: -1, buf: a.size > 1 ? new Float32Array(a.size * (a.type === gl.FLOAT_VEC4 ? 4 : a.type === gl.FLOAT_VEC3 ? 3 : 1)) : null }; }
    return { p, u, nu: 0, frame: -1, pf: -1 };
  },
  prog(key, vs, fs) { let p = this.progs.get(key); if (!p) { p = this.compile(vs, fs); this.progs.set(key, p); } return p; },
  use(p) { if (this.cur !== p) { this.gl.useProgram(p.p); this.cur = p; } },
  set(p, name, v) {
    const u = p.u[name]; if (!u || v === undefined || v === null) return; const gl = this.gl, t = u.type;
    if (u.size > 1) { const b = u.buf; if (t === gl.FLOAT_VEC4) { for (let i = 0; i < v.length; i++) { b[i * 4] = v[i].x; b[i * 4 + 1] = v[i].y; b[i * 4 + 2] = v[i].z; b[i * 4 + 3] = v[i].w; } gl.uniform4fv(u.loc, b); } else if (t === gl.FLOAT_VEC3) { for (let i = 0; i < v.length; i++) { b[i * 3] = v[i].x; b[i * 3 + 1] = v[i].y; b[i * 3 + 2] = v[i].z; } gl.uniform3fv(u.loc, b); } else gl.uniform1fv(u.loc, v); return; }
    if (t === gl.FLOAT) gl.uniform1f(u.loc, v); else if (t === gl.INT || t === gl.BOOL) gl.uniform1i(u.loc, v);
    else if (t === gl.FLOAT_VEC2) gl.uniform2f(u.loc, v.x, v.y); else if (t === gl.FLOAT_VEC3) { if (v.r !== undefined) gl.uniform3f(u.loc, v.r, v.g, v.b); else gl.uniform3f(u.loc, v.x, v.y, v.z); }
    else if (t === gl.FLOAT_VEC4) gl.uniform4f(u.loc, v.x, v.y, v.z, v.w); else if (t === gl.FLOAT_MAT4) gl.uniformMatrix4fv(u.loc, false, v.elements || v);
    else { let i = u.unit; if (i < 0) { i = u.unit = name === 'tCube' ? 8 : name === 'tSpot' ? 9 : p.nu++; gl.uniform1i(u.loc, i); } gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(t === gl.SAMPLER_CUBE ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D, v.get ? v.get() : v); }
  },
  attr(a, target) { const gl = this.gl; if (!a.buf) { a.buf = gl.createBuffer(); gl.bindBuffer(target, a.buf); gl.bufferData(target, a.array, a.dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); a.needsUpdate = false; } else { gl.bindBuffer(target, a.buf); if (a.needsUpdate) { gl.bufferSubData(target, 0, a.array); a.needsUpdate = false; } } },
  bind(mesh) {
    const gl = this.gl, g = mesh.geometry, own = mesh.inst ? mesh : g; let fresh = false;
    if (!own.vao) { own.vao = gl.createVertexArray(); fresh = true; } gl.bindVertexArray(own.vao);
    for (let i = 0; i < ATTRS.length; i++) { const n = ATTRS[i]; if (!n || i === 4 || i === 8) continue; const a = g.attributes[n]; if (!a) continue; if (fresh || a.needsUpdate || !a.buf) { this.attr(a, gl.ARRAY_BUFFER); if (fresh) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, a.itemSize, gl.FLOAT, false, 0, 0); } } }
    if (g.index && (fresh || g.index.needsUpdate || !g.index.buf)) this.attr(g.index, gl.ELEMENT_ARRAY_BUFFER);
    if (mesh.inst) {
      const im = mesh.instanceMatrix; if (fresh || im.needsUpdate) { im.dyn = true; this.attr(im, gl.ARRAY_BUFFER); if (fresh) for (let k = 0; k < 4; k++) { gl.enableVertexAttribArray(4 + k); gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 64, k * 16); gl.vertexAttribDivisor(4 + k, 1); } }
      const ic = mesh.instanceColor; if (ic && (!ic.bound || ic.needsUpdate)) { ic.dyn = true; this.attr(ic, gl.ARRAY_BUFFER); if (!ic.bound) { ic.bound = true; gl.enableVertexAttribArray(8); gl.vertexAttribPointer(8, 3, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(8, 1); } }
    }
  },
  draw(mesh) {
    const gl = this.gl, g = mesh.geometry; this.calls++;
    if (mesh.mode === 0) gl.drawArrays(gl.POINTS, 0, g.attributes.position.count);
    else if (mesh.mode === 1) gl.drawArrays(gl.LINES, 0, g.drawCount >= 0 ? g.drawCount : g.attributes.position.count);
    else if (mesh.inst) { if (mesh.count > 0) { if (g.index) gl.drawElementsInstanced(gl.TRIANGLES, g.index.count, g.index.array.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0, mesh.count); else gl.drawArraysInstanced(gl.TRIANGLES, 0, g.attributes.position.count, mesh.count); } }
    else if (g.index) gl.drawElements(gl.TRIANGLES, g.index.count, g.index.array.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0); else gl.drawArrays(gl.TRIANGLES, 0, g.attributes.position.count);
  },
  freeGeom(g) { const gl = this.gl; if (g.vao) { gl.deleteVertexArray(g.vao); g.vao = null; } for (const n in g.attributes) { const a = g.attributes[n]; if (a.buf) { gl.deleteBuffer(a.buf); a.buf = null; } } if (g.index && g.index.buf) { gl.deleteBuffer(g.index.buf); g.index.buf = null; } },
  freeMesh(m) { const gl = this.gl; if (m.vao) { gl.deleteVertexArray(m.vao); m.vao = null; } for (const a of [m.instanceMatrix, m.instanceColor]) if (a && a.buf) { gl.deleteBuffer(a.buf); a.buf = null; a.bound = false; } },
  state(m, shadow) {
    const gl = this.gl, side = m.side, b = shadow ? 0 : m.blend, k = side | (m.depthTest === false ? 4 : 0) | (m.depthWrite === false ? 8 : 0) | b << 4 | (m.polygonOffset ? 64 : 0) | (shadow ? 128 : 0);
    if (k === this.sk) return; this.sk = k;
    if (side === 2) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace((side === 1) !== !!shadow ? gl.FRONT : gl.BACK); }
    if (m.depthTest === false) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST); gl.depthMask(m.depthWrite !== false);
    if (!b) gl.disable(gl.BLEND); else { gl.enable(gl.BLEND); if (b === 1) gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); else if (b === 2) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE); }
    if (m.polygonOffset) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2); } else gl.disable(gl.POLYGON_OFFSET_FILL);
  },
  target(rt, w, h) { const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.fb : null); gl.viewport(0, 0, rt ? rt.width : w, rt ? rt.height : h); },
  collect(o, cam) {
    if (!o.visible) return; const ch = o.children;
    if (o.isMesh && o.material) {
      let vis = true; const e = o.matrixWorld.elements;
      if (o.frustumCulled && o.mode === undefined && !o.inst) { const s = o.geometry.sphere(), x = e[0] * s[0] + e[4] * s[1] + e[8] * s[2] + e[12], y = e[1] * s[0] + e[5] * s[1] + e[9] * s[2] + e[13], z = e[2] * s[0] + e[6] * s[1] + e[10] * s[2] + e[14], r = s[3] * Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10])); o.wx = x; o.wy = y; o.wz = z; o.wr = r; const dx = x - cam.px, dy = y - cam.py, dz = z - cam.pz; vis = Math.abs(dx * cam.rx + dz * cam.rz) < cam.hw + r && Math.abs(dx * cam.ux + dy * cam.uy + dz * cam.uz) < cam.hh + r; } else o.wr = -1;
      if (o.castShadow && !o.material.blend) this.casters.push(o);
      if (vis) (o.material.blend ? this.trans : this.list).push(o);
    }
    for (let i = 0; i < ch.length; i++) this.collect(ch[i], cam);
  },
  stdProg(m, inst, depth) {
    const key = (depth ? 'D' : 'S' + m.variant + (m.alphaTest ? 'A' : '')) + (inst ? 'I' : '');
    let p = this.progs.get(key); if (p) return p;
    const d = (inst ? '#define INST\n' : '') + (m.variant && !depth ? '#define V_' + m.variant.toUpperCase() + '\n' : '') + (m.alphaTest && !depth ? '#define ATEST\n' : '');
    return this.prog(key, SH_HEAD + d + STD_VS, SH_HEAD + d + (depth ? DEPTH_FS : STD_FS));
  },
  shadows(L) {
    const gl = this.gl, lp = L.lantern.position, far = L.lantern.distance, S = L.cubeSize;
    if (L.cubeOn) {
      if (this.cubeSize !== S) {
        if (this.cube) { gl.deleteTexture(this.cube); gl.deleteRenderbuffer(this.cubeDepth); } else this.cubeFb = gl.createFramebuffer();
        this.cubeSize = S; this.cube = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cube); for (let f = 0; f < 6; f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, gl.R16F, S, S, 0, gl.RED, gl.HALF_FLOAT, null);
        for (const pn of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_CUBE_MAP, pn, gl.LINEAR); for (const pn of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_CUBE_MAP, pn, gl.CLAMP_TO_EDGE);
        this.cubeDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.cubeDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, S, S);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.cubeFb); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.cubeDepth); gl.viewport(0, 0, S, S); gl.clearColor(1, 1, 1, 1);
      const near = this.near; near.length = 0; for (const o of this.casters) if (o.wr < 0 || (o.wx - lp.x) ** 2 + (o.wy - lp.y) ** 2 + (o.wz - lp.z) ** 2 < (far + o.wr) ** 2) near.push(o);
      this.proj.persp(1, .08, far);
      for (let f = 0; f < 6; f++) {
        const q = CUBE_F[f], fx = q[0], fy = q[1], fz = q[2], ux = q[3], uy = q[4], uz = q[5], rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, this.cube, 0); gl.depthMask(true); this.sk = -1; gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.tmpV.view(lp, { x: rx, y: ry, z: rz }, { x: ux, y: uy, z: uz }, { x: fx, y: fy, z: fz }); this.tmpM.multiplyMatrices(this.proj, this.tmpV); this.pid++;
        for (const o of near) { if (o.wr >= 0) { const dx = o.wx - lp.x, dy = o.wy - lp.y, dz = o.wz - lp.z, a = dx * fx + dy * fy + dz * fz, r = o.wr * 1.5; if (a < -o.wr || Math.abs(dx * rx + dy * ry + dz * rz) > a + r || Math.abs(dx * ux + dy * uy + dz * uz) > a + r) continue; } this.depthDraw(o, this.tmpM, lp, far); }
      }
      gl.clearColor(0, 0, 0, 1);
    }
    const sp = L.spot;
    if (sp.intensity > 0) {
      if (!this.spotRT) { this.spotRT = new RT(512, 512, false, false, true); gl.bindTexture(gl.TEXTURE_2D, this.spotRT.depthTexture.t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); }
      const p = sp.position, t = sp.target.position; let fx = t.x - p.x, fy = t.y - p.y, fz = t.z - p.z; const fl = 1 / (Math.hypot(fx, fy, fz) || 1); fx *= fl; fy *= fl; fz *= fl;
      let rx = -fz, rz = fx; if (Math.abs(fy) > .99) { rx = 1; rz = 0; } const rl = 1 / Math.hypot(rx, rz); rx *= rl; rz *= rl; const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, tn = Math.tan(sp.angle) * 1.05;
      this.tmpV.view(p, { x: rx, y: 0, z: rz }, { x: ux, y: uy, z: uz }, { x: fx, y: fy, z: fz }); this.proj.persp(tn, .4, sp.distance); this.spotM.multiplyMatrices(this.proj, this.tmpV);
      this.target(this.spotRT); gl.depthMask(true); this.sk = -1; gl.colorMask(false, false, false, false); gl.clear(gl.DEPTH_BUFFER_BIT); this.pid++;
      for (const o of this.casters) { if (o.wr >= 0) { const dx = o.wx - p.x, dy = o.wy - p.y, dz = o.wz - p.z, a = dx * fx + dy * fy + dz * fz, r = o.wr * 1.5; if (a < -o.wr || a > sp.distance + o.wr || Math.abs(dx * rx + dz * rz) > a * tn + r || Math.abs(dx * ux + dy * uy + dz * uz) > a * tn + r) continue; } this.depthDraw(o, this.spotM, p, sp.distance); }
      gl.colorMask(true, true, true, true);
    }
  },
  depthDraw(o, vp, lp, far) { const p = this.stdProg(o.material, o.inst, true); this.use(p); if (p.pf !== this.pid) { p.pf = this.pid; this.set(p, 'uVP', vp); this.set(p, 'uLP', lp); this.set(p, 'uLF', far); } this.set(p, 'uM', o.matrixWorld); this.state(o.material, true); this.bind(o); this.draw(o); },
  scene(root, rt, L) {
    const gl = this.gl, cam = L.cam; this.frame++; this.calls = 0; this.list.length = 0; this.trans.length = 0; this.casters.length = 0; this.lastM = this.lastP = null; this.sk = -1;
    root.updateMatrixWorld(); this.collect(root, cam);
    if (!L.skipShadow) this.shadows(L);
    gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cube || this.dummyCube()); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.spotRT ? this.spotRT.depthTexture.t : this.dummyShadow());
    this.view.view(cam.pos, cam.right, cam.up, cam.fwd); this.proj.ortho(cam.hw, cam.hh, cam.near, cam.far); this.vp.multiplyMatrices(this.proj, this.view);
    this.target(rt); gl.depthMask(true); gl.disable(gl.BLEND); this.sk = -1; gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.list.sort((a, b) => a.renderOrder - b.renderOrder || a.material.id - b.material.id); this.trans.sort((a, b) => a.renderOrder - b.renderOrder || a.material.id - b.material.id);
    for (let pass = 0; pass < 2; pass++) {
      const list = pass ? this.trans : this.list;
      for (let n = 0; n < list.length; n++) {
        const o = list[n], m = o.material, inst = !!o.inst; let p;
        if (m.kind === 0) p = this.stdProg(m, inst, false);
        else if (m.kind === 1) p = this.prog(inst ? 'BI' : 'B', SH_HEAD + (inst ? '#define INST\n' : '') + STD_VS, SH_HEAD + BASIC_FS);
        else p = inst ? (m.pI || (m.pI = this.prog('I' + m.vertexShader + m.fragmentShader, SH_VS + '#define USE_INSTANCING\nin mat4 instanceMatrix;\n' + m.vertexShader, SH_FS + m.fragmentShader))) : (m.p0 || (m.p0 = this.prog(m.vertexShader + m.fragmentShader, SH_VS + m.vertexShader, SH_FS + m.fragmentShader)));
        this.use(p);
        if (p.frame !== this.frame) {
          p.frame = this.frame; this.set(p, 'uVP', this.vp); this.set(p, 'viewMatrix', this.view); this.set(p, 'projectionMatrix', this.proj); this.set(p, 'uTime', uTime.value);
          if (m.kind === 0) {
            this.set(p, 'uCamDir', L.camDir); this.set(p, 'uPLp', L.plp); this.set(p, 'uPLc', L.plc); this.set(p, 'uSky', L.sky); this.set(p, 'uGnd', L.gnd); this.set(p, 'uMoonDir', L.moonDir); this.set(p, 'uMoonCol', L.moonCol);
            this.set(p, 'uCube', L.cubeOn && this.cube ? L.lantern.distance : 0); const cu = p.u.tCube, su = p.u.tSpot; if (cu && cu.unit < 0) { cu.unit = 8; gl.uniform1i(cu.loc, 8); } if (su && su.unit < 0) { su.unit = 9; gl.uniform1i(su.loc, 9); }
            this.set(p, 'uSpotP', L.spotP); this.set(p, 'uSpotPos', L.spot.position); this.set(p, 'uSpotDir', L.spotDir); this.set(p, 'uSpotCol', L.spotCol); this.set(p, 'uSpotM', this.spotM);
          }
        }
        if (this.lastM !== m || this.lastP !== p) {
          this.lastM = m; this.lastP = p; this.state(m, false);
          if (m.kind === 0) {
            this.set(p, 'map', m.map || this.white); this.set(p, 'normalMap', m.normalMap || this.flat); this.set(p, 'orm', m.roughnessMap || this.white); this.set(p, 'emissiveMap', m.emissiveMap || this.white);
            this.set(p, 'uColor', m.color); this.set(p, 'uEmissive', m.emissive); this.set(p, 'uRM', _rm.set(m.roughness, m.metalness, m.opacity, m.envMapIntensity)); this.set(p, 'uATest', m.alphaTest);
            if (m.variant === 'floor') for (const k in FLOOR_U) this.set(p, k, FLOOR_U[k].value);
          } else if (m.kind === 1) { this.set(p, 'map', m.map || this.white); this.set(p, 'uColor', m.color); this.set(p, 'uRM', _rm.set(0, 0, m.opacity, 0)); }
          else for (const k in m.uniforms) this.set(p, k, m.uniforms[k].value);
        }
        if (m.kind === 2) { this.set(p, 'modelMatrix', o.matrixWorld); if (p.u.modelViewMatrix) this.set(p, 'modelViewMatrix', this.tmpM.multiplyMatrices(this.view, o.matrixWorld)); } else this.set(p, 'uM', o.matrixWorld);
        this.bind(o); this.draw(o);
      }
    }
    gl.bindVertexArray(null); gl.depthMask(true);
  },
  dummyShadow() { if (!this.dsh) { const gl = this.gl, t = this.dsh = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, 1, 1, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, new Uint32Array([0xffffffff])); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); } return this.dsh; },
  dummyCube() { if (!this.dcb) { const gl = this.gl, t = this.dcb = gl.createTexture(), w = new Uint8Array([255, 255, 255, 255]); gl.bindTexture(gl.TEXTURE_CUBE_MAP, t); for (let f = 0; f < 6; f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, w); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST); } return this.dcb; },
  pass(m, rt, w, h) {
    const gl = this.gl, p = m.p0 || (m.p0 = this.prog('P' + m.fragmentShader, PASS_VS, SH_FS + m.fragmentShader));
    this.target(rt, w, h); this.use(p); gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.disable(gl.POLYGON_OFFSET_FILL); this.sk = -1; this.lastM = this.lastP = null;
    for (const k in m.uniforms) this.set(p, k, m.uniforms[k].value);
    this.bind(FSQ); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
  }
};
const _rm = new Vector4();
const FSQ = { geometry: new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)).setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2)) };
const uTime = { value: 0 };
const V3 = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
const _v1 = new Vector3(), _v2 = new Vector3(), _v3 = new Vector3();
const _q1 = new Quaternion(), _e1 = new Euler(), _m1 = new Matrix4(), _m2 = new Matrix4();
const _c1 = new Color();
function removeFrom(arr, item) { const i = arr.indexOf(item); if (i >= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); } }
function pad(n, w) { let s = String(Math.floor(n)); while (s.length < w) s = '0' + s; return s; }
