// =====================================================================================
//  EFFECTS: GPU particles, lantern-lit dust, persistent debris and decals, telegraphs, arcs
// =====================================================================================
const game = {
  t: 0, real: 0, dt: 0, state: 'boot', deckNo: 0, slain: 0, timeScale: 1, trauma: 0, hitStop: 0, slowT: 0, slowK: 1,
  manualUntil: -1, fade: 0, fadeTo: 1, hurt: 0, flash: 0, desat: 0
};
const PXU = { value: 20 };

const PART_VS = `attribute vec3 aVel; attribute vec4 aT; attribute vec4 aC; uniform float uTime, uPx; varying vec4 vCol;
void main(){ float age = uTime - aT.x; float k = age/aT.y;
  if (age < 0. || k >= 1.){ gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vCol = vec4(0.); return; }
  float dr = aT.w; float tt = dr > .001 ? (1. - exp(-dr*age))/dr : age;
  vec3 p = position + aVel*tt; p.y -= aC.a*age*age*.5;
  p.xz += sin(vec2(age*3.1 + position.x*7., age*2.7 + position.z*5.))*.07*age;
  if (aC.a > 0. && p.y < .03) p.y = .03;
  gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.);
  gl_PointSize = max(1., aT.z*uPx*(1. - k*.45)); vCol = vec4(aC.rgb, smoothstep(0., .08, k)*(1. - k*k)); }`;
class GPUParticles {
  constructor(cap, soft) {
    this.cap = cap; this.head = 0; this.dirty = false; this.soft = soft;
    const g = new BufferGeometry();
    this.aP = new Float32Array(cap * 3); this.aV = new Float32Array(cap * 3); this.aT = new Float32Array(cap * 4); this.aC = new Float32Array(cap * 4);
    for (let i = 0; i < cap; i++) { this.aT[i * 4] = -1000; this.aT[i * 4 + 1] = 1; }
    this.attrs = [new BufferAttribute(this.aP, 3), new BufferAttribute(this.aV, 3), new BufferAttribute(this.aT, 4), new BufferAttribute(this.aC, 4)];
    for (const a of this.attrs) a.setUsage();
    g.setAttribute('position', this.attrs[0]); g.setAttribute('aVel', this.attrs[1]); g.setAttribute('aT', this.attrs[2]); g.setAttribute('aC', this.attrs[3]);
    const mat = new ShaderMaterial(Object.assign({
      uniforms: { uTime, uPx: PXU }, vertexShader: PART_VS,
      fragmentShader: soft
        ? 'varying vec4 vCol; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .12, d)*vCol.a; gl_FragColor = vec4(vCol.rgb, a*.55); }'
        : 'varying vec4 vCol; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .05, d)*vCol.a; gl_FragColor = vec4(vCol.rgb*a*.38, 1.); }'
    }, soft ? SOFT_BLEND : ADD_BLEND));
    this.points = new Points(g, mat); this.points.frustumCulled = false; this.points.renderOrder = soft ? 11 : 12; scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, life, size, r, g, b, grav = 0, drag = 0) {
    const i = this.head; this.head = (i + 1) % this.cap; const i3 = i * 3, i4 = i * 4;
    this.aP[i3] = x; this.aP[i3 + 1] = y; this.aP[i3 + 2] = z; this.aV[i3] = vx; this.aV[i3 + 1] = vy; this.aV[i3 + 2] = vz;
    this.aT[i4] = uTime.value; this.aT[i4 + 1] = life; this.aT[i4 + 2] = size; this.aT[i4 + 3] = drag;
    this.aC[i4] = r; this.aC[i4 + 1] = g; this.aC[i4 + 2] = b; this.aC[i4 + 3] = grav; this.dirty = true;
  }
  flush() { if (this.dirty) { for (const a of this.attrs) a.needsUpdate = true; this.dirty = false; } }
}

// persistent rigid debris (bones, scrap, planks, goo): instanced, simulated until it settles, then free
class DebrisPool {
  constructor(geom, matKey, cap, colored) {
    this.cap = cap; this.head = 0; this.items = new Array(cap); this.active = [];
    this.mesh = new InstancedMesh(geom, MATS[matKey].m, cap); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(); this.colored = colored;
    if (colored) { this.mesh.setColorAt(0, _c1.setRGB(1, 1, 1)); }
    scene.add(this.mesh); this.used = 0;
  }
  clear() { this.head = 0; this.used = 0; this.active.length = 0; this.mesh.count = 0; }
  spawn(x, y, z, vx, vy, vz, sx, sy, sz, r = 1, g = 1, b = 1) {
    const i = this.head; this.head = (i + 1) % this.cap; this.used = Math.min(this.cap, this.used + 1); this.mesh.count = this.used;
    let it = this.items[i]; if (!it) it = this.items[i] = { i }; else if (it.live) removeFrom(this.active, it);
    it.x = x; it.y = y; it.z = z; it.vx = vx; it.vy = vy; it.vz = vz; it.sx = sx; it.sy = sy; it.sz = sz; it.rx = R(TAU); it.ry = R(TAU); it.rz = R(TAU);
    it.wx = RS(9); it.wy = RS(9); it.wz = RS(9); it.live = true; it.rest = 0; it.h = Math.min(sx, sy, sz) * .5 + .02; this.active.push(it);
    if (this.colored) { this.mesh.setColorAt(i, _c1.setRGB(r, g, b)); this.mesh.instanceColor.needsUpdate = true; }
    this.write(it);
  }
  write(it) { _e1.set(it.rx, it.ry, it.rz); _q1.setFromEuler(_e1); _m1.compose(_v1.set(it.x, it.y, it.z), _q1, _v2.set(it.sx, it.sy, it.sz)); this.mesh.setMatrixAt(it.i, _m1); }
  update(dt) {
    if (!this.active.length) return;
    for (let k = this.active.length - 1; k >= 0; k--) {
      const it = this.active[k]; it.vy -= 16 * dt; const ox = it.x, oz = it.z;
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.rx += it.wx * dt; it.ry += it.wy * dt; it.rz += it.wz * dt;
      if (deck && deckSolidAt(cellOf(it.x), cellOf(it.z))) { it.x = ox; it.z = oz; it.vx *= -.4; it.vz *= -.4; }
      if (it.y < it.h) {
        it.y = it.h; if (it.vy < -1.5) { it.vy *= -.32; } else it.vy = 0; it.vx *= .62; it.vz *= .62; it.wx *= .5; it.wy *= .6; it.wz *= .5;
        if (Math.abs(it.vx) + Math.abs(it.vz) + Math.abs(it.vy) < .25) { it.rest += dt; if (it.rest > .15) { it.live = false; this.active[k] = this.active[this.active.length - 1]; this.active.pop(); } }
      }
      this.write(it);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
class DecalPool {
  constructor(cap, rough, order) {
    this.cap = cap; this.head = 0; this.used = 0;
    const m = new MeshStandardMaterial(Object.assign({ map: TEX.splat, roughness: rough, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }, SOFT_BLEND));
    this.mesh = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-HPI), m, cap); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.receiveShadow = true; this.mesh.renderOrder = order;
    this.mesh.setColorAt(0, _c1.setRGB(1, 1, 1)); scene.add(this.mesh);
  }
  clear() { this.head = 0; this.used = 0; this.mesh.count = 0; }
  add(x, z, size, r, g, b) {
    const i = this.head; this.head = (i + 1) % this.cap; this.used = Math.min(this.cap, this.used + 1); this.mesh.count = this.used;
    _e1.set(0, R(TAU), 0); _q1.setFromEuler(_e1); _m1.compose(_v1.set(x, .025 + (i % 7) * .0015, z), _q1, _v2.set(size, 1, size * R(.8, 1.2)));
    this.mesh.setMatrixAt(i, _m1); this.mesh.setColorAt(i, _c1.setRGB(r, g, b)); this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
}

// ground telegraphs: clear warnings for every heavy attack; the autopilot reads the matching Dangers entries
const TELE_FS = `uniform int uType; uniform float uProg, uArc, uAlpha, uInner; uniform vec3 uCol; varying vec2 vUv;
void main(){ vec2 p = vUv*2. - 1.; float r = length(p); float a = 0.;
  if (uType == 0){ float edge = smoothstep(1., .94, r)*smoothstep(.82, .94, r); a = edge + step(r, uProg)*.3*smoothstep(1., .95, r) + .07*step(r, 1.); }
  else if (uType == 1){ a = smoothstep(.1, 0., abs(r - uProg))*step(r, 1.02)*1.4; }
  else if (uType == 2){ float ang = abs(atan(p.y, p.x)); float ins = step(ang, uArc)*step(r, 1.)*step(uInner, r);
    float edge = smoothstep(.88, .97, r) + smoothstep(uArc - .07, uArc, ang); a = ins*(.1 + .5*edge + .28*step(r, uProg)); }
  else { vec2 e = abs(p); float edge = max(smoothstep(.7, .95, e.y), smoothstep(.96, .995, e.x)); a = .1 + .5*edge + .28*step(vUv.x, uProg); }
  gl_FragColor = vec4(uCol*a*uAlpha*.6, 1.); }`;
const Tele = {
  pool: [], live: [],
  get() {
    let t = this.pool.pop();
    if (!t) {
      const mat = new ShaderMaterial(Object.assign({ uniforms: { uType: { value: 0 }, uProg: { value: 0 }, uArc: { value: 1 }, uAlpha: { value: 1 }, uInner: { value: 0 }, uCol: { value: new Color() } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }', fragmentShader: TELE_FS, side: DoubleSide }, ADD_BLEND));
      const mesh = new Mesh(G.planeUp, mat); mesh.renderOrder = 6; t = { mesh, mat };
    }
    scene.add(t.mesh); this.live.push(t); return t;
  },
  // type: 0 circle, 1 expanding ring, 2 sector, 3 strip. rot: facing angle (atan2(dz,dx) convention via yaw)
  spawn(type, x, z, sx, sz, rot, dur, r, g, b, arc = 1, inner = 0) {
    const t = this.get(), u = t.mat.uniforms; u.uType.value = type; u.uProg.value = 0; u.uArc.value = arc; u.uInner.value = inner; u.uAlpha.value = 1; u.uCol.value.setRGB(r * .42, g * .42, b * .42);
    t.mesh.position.set(x, .05, z); t.mesh.scale.set(sx, 1, sz); t.mesh.rotation.set(0, rot, 0); t.t = 0; t.dur = dur; t.type = type; t.dead = false; return t;
  },
  circle(x, z, rad, dur, r = 3, g = .5, b = .2) { return this.spawn(0, x, z, rad * 2, rad * 2, 0, dur, r, g, b); },
  ring(x, z, rad, dur, r = 3, g = 1, b = .3) { return this.spawn(1, x, z, rad * 2, rad * 2, 0, dur, r, g, b); },
  sector(x, z, rad, yaw, half, dur, r = 3, g = .5, b = .2, inner = 0) { return this.spawn(2, x, z, rad * 2, rad * 2, yaw - HPI, dur, r, g, b, half, inner); },
  strip(x0, z0, x1, z1, w, dur, r = 3, g = .5, b = .2) { const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz); return this.spawn(3, (x0 + x1) / 2, (z0 + z1) / 2, len, w, -Math.atan2(dz, dx), dur, r, g, b); },
  cancel(t) { if (t && !t.dead) t.t = Math.max(t.t, t.dur); },
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const t = this.live[i]; t.t += dt; const u = t.mat.uniforms; u.uProg.value = sat(t.t / t.dur);
      u.uAlpha.value = t.type === 1 ? (1 - sat(t.t / t.dur)) * 1.2 + .1 : (t.t > t.dur ? sat(1 - (t.t - t.dur) / .14) : .65 + .35 * Math.sin(t.t * 26));
      if (t.t > t.dur + (t.type === 1 ? 0 : .14)) { t.dead = true; scene.remove(t.mesh); this.live[i] = this.live[this.live.length - 1]; this.live.pop(); this.pool.push(t); }
    }
  },
  clear() { for (const t of this.live) { t.dead = true; scene.remove(t.mesh); this.pool.push(t); } this.live.length = 0; }
};
// danger registry for the autopilot (and nothing else): where and when something will hurt
const Dangers = {
  list: [],
  circle(x, z, r, delay, linger = .15, src = null) { const d = { k: 0, x, z, r, at: game.t + delay, until: game.t + delay + linger, src }; this.list.push(d); return d; },
  sector(x, z, r, yaw, half, delay, linger = .15, src = null) { const d = { k: 1, x, z, r, yaw, half, at: game.t + delay, until: game.t + delay + linger, src }; this.list.push(d); return d; },
  strip(x0, z0, x1, z1, w, delay, linger = .15, src = null) { const d = { k: 2, x: x0, z: z0, x1, z1, w, at: game.t + delay, until: game.t + delay + linger, src }; this.list.push(d); return d; },
  ring(x, z, speed, rmax, w, delay, src = null) { const d = { k: 3, x, z, speed, r: rmax, w, at: game.t + delay, until: game.t + delay + rmax / speed, src }; this.list.push(d); return d; },
  cancel(d) { if (d) d.until = -1; },
  covers(d, x, z, pad) {
    if (d.k === 0) return dist2(x, z, d.x, d.z) < (d.r + pad) * (d.r + pad);
    if (d.k === 1) { const dx = x - d.x, dz = z - d.z, dd = dx * dx + dz * dz; if (dd > (d.r + pad) * (d.r + pad)) return false; if (dd < .2) return true; return Math.abs(angDiff(d.yaw, Math.atan2(dx, dz))) < d.half + .25; }
    if (d.k === 2) { const ex = d.x1 - d.x, ez = d.z1 - d.z, l2 = ex * ex + ez * ez || 1, t = sat(((x - d.x) * ex + (z - d.z) * ez) / l2), px = d.x + ex * t, pz = d.z + ez * t; return dist2(x, z, px, pz) < (d.w * .5 + pad) * (d.w * .5 + pad); }
    return false;
  },
  // will (x,z) be hurt at some moment in [now+t0, now+t1]?
  at(x, z, t0, t1, pad = .45) {
    const a = game.t + t0, b = game.t + t1;
    for (const d of this.list) {
      if (d.until < a || d.at > b) continue;
      if (d.k === 3) { const dd = Math.sqrt(dist2(x, z, d.x, d.z)); if (dd > d.r + pad) continue; const ta = d.at + (dd - d.w - pad) / d.speed, tb = d.at + (dd + d.w + pad) / d.speed; if (tb >= a && ta <= b) return d; continue; }
      if (this.covers(d, x, z, pad)) return d;
    }
    return null;
  },
  update() { const now = game.t; for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].until < now - .05) { this.list[i] = this.list[this.list.length - 1]; this.list.pop(); } },
  clear() { this.list.length = 0; }
};

// immediate-mode additive line batch: lightning, lasers, aim lines
const Arcs = {
  cap: 2400, n: 0, pos: null, col: null, obj: null,
  init() {
    this.pos = new Float32Array(this.cap * 6); this.col = new Float32Array(this.cap * 6);
    const g = new BufferGeometry(); this.pa = new BufferAttribute(this.pos, 3).setUsage(); this.ca = new BufferAttribute(this.col, 3).setUsage();
    g.setAttribute('position', this.pa); g.setAttribute('color', this.ca);
    this.obj = new LineSegments(g, new LineBasicMaterial(Object.assign({ vertexColors: true }, ADD_BLEND))); this.obj.material.color.setRGB(.65, .65, .65); this.obj.frustumCulled = false; this.obj.renderOrder = 13; scene.add(this.obj);
  },
  begin() { this.n = 0; },
  seg(x0, y0, z0, x1, y1, z1, r, g, b) {
    if (this.n >= this.cap) return; const i = this.n++ * 6, p = this.pos, c = this.col;
    p[i] = x0; p[i + 1] = y0; p[i + 2] = z0; p[i + 3] = x1; p[i + 4] = y1; p[i + 5] = z1; c[i] = r; c[i + 1] = g; c[i + 2] = b; c[i + 3] = r; c[i + 4] = g; c[i + 5] = b;
  },
  line(x0, y0, z0, x1, y1, z1, r, g, b, thick = 1) { this.seg(x0, y0, z0, x1, y1, z1, r, g, b); for (let k = 1; k < thick; k++) { const o = k * .035; this.seg(x0, y0 + o, z0, x1, y1 + o, z1, r * .6, g * .6, b * .6); this.seg(x0, y0 - o, z0, x1, y1 - o, z1, r * .6, g * .6, b * .6); } },
  bolt(x0, y0, z0, x1, y1, z1, r, g, b, jag = .35, steps = 0) {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0), n = steps || Math.max(3, Math.ceil(len / .55)); let px = x0, py = y0, pz = z0;
    for (let i = 1; i <= n; i++) {
      const t = i / n, e = i === n ? 0 : jag * Math.sin(t * PI); const nx = lerp(x0, x1, t) + RS(e), ny = lerp(y0, y1, t) + RS(e), nz = lerp(z0, z1, t) + RS(e);
      this.seg(px, py, pz, nx, ny, nz, r, g, b); if (R() < .18 && i < n) this.seg(nx, ny, nz, nx + RS(jag * 1.6), ny + RS(jag * 1.6), nz + RS(jag * 1.6), r * .5, g * .5, b * .5);
      px = nx; py = ny; pz = nz;
    }
  },
  end() { this.obj.geometry.setDrawRange(0, this.n * 2); this.pa.needsUpdate = true; this.ca.needsUpdate = true; }
};

const FX = {
  add: null, soft: null, motes: null, debris: {}, goo: null, scorch: null, emitters: [], ambient: null, ambAcc: 0,
  init() {
    this.add = new GPUParticles(7000, false); this.soft = new GPUParticles(1600, true);
    // dust motes that only show where the lantern (or a brazier) lights them
    const n = 1400, seed = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) seed[i] = Math.random();
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(seed, 3));
    this.moteU = { uTime, uPx: PXU, uCenter: { value: new Vector3() }, uLPos: { value: new Vector3() }, uLCol: { value: new Color() }, uAmb: { value: new Color(.3, .4, .6) } };
    const mat = new ShaderMaterial(Object.assign({
      uniforms: this.moteU,
      vertexShader: `uniform vec3 uCenter, uLPos, uLCol, uAmb; uniform float uTime, uPx; varying vec3 vCol;
        void main(){ vec3 box = vec3(38., 5., 38.); vec3 s = position;
          vec3 p = s*box + vec3(sin(uTime*.21 + s.y*40.)*.5 + uTime*.12*(s.z - .5), 0., cos(uTime*.17 + s.x*30.)*.5 + uTime*.1*(s.x - .5));
          p.xz = mod(p.xz - uCenter.xz + box.xz*.5, box.xz) - box.xz*.5 + uCenter.xz; p.y = mod(s.y*box.y + uTime*(.03 + s.x*.09), box.y) + .12;
          float d = length(p - uLPos); float lit = 1./(1. + d*d*.3)*smoothstep(14., 5., d);
          vCol = uLCol*lit*.05 + uAmb*.012; gl_PointSize = max(1., (.03 + s.z*.05)*uPx); gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.); }`,
      fragmentShader: 'varying vec3 vCol; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vCol*smoothstep(.5, .1, d), 1.); }'
    }, ADD_BLEND));
    this.motes = new Points(g, mat); this.motes.frustumCulled = false; this.motes.renderOrder = 10; scene.add(this.motes);
    this.debris.bone = new DebrisPool(G.bone, 'bone', 360); this.debris.skull = new DebrisPool(G.sphLo, 'bone', 60);
    this.debris.scrap = new DebrisPool(G.box, 'steel', 320); this.debris.plank = new DebrisPool(G.box, 'crate', 220);
    this.debris.shard = new DebrisPool(G.tet, 'crystal', 200); this.debris.gib = new DebrisPool(G.sphLo, 'ooze', 240, true); this.debris.chunk = new DebrisPool(G.dod, 'stone', 200, true);
    this.goo = new DecalPool(420, .22, 2); this.scorch = new DecalPool(220, 1, 1);
    // wreckage of the fleet drifting through the void beneath and around the deck
    const wn = 54; this.wreck = new InstancedMesh(G.box, MATS.hull.m, wn); this.wreck.frustumCulled = false; this.wreck.instanceMatrix.setUsage(); this.wrk = [];
    for (let i = 0; i < wn; i++) { const big = i % 9 === 0; this.wrk.push({ x: RS(70), y: R(-38, -7), z: RS(70), sx: R(.6, 3.5) * (big ? 3 : 1), sy: R(.12, .9) * (big ? 2 : 1), sz: R(.5, 3) * (big ? 2.5 : 1), rx: R(TAU), ry: R(TAU), rz: R(TAU), wx: RS(.22), wy: RS(.22), wz: RS(.22), vx: R(.25, 1), vz: R(-.6, -.1) }); this.wreck.setColorAt(i, _c1.setRGB(R(1.2, 3), R(1.1, 2.4), R(1.2, 2.8))); }
    scene.add(this.wreck);
    Arcs.init();
  },
  clearDeck() { for (const k in this.debris) this.debris[k].clear(); this.goo.clear(); this.scorch.clear(); this.emitters.length = 0; Tele.clear(); Dangers.clear(); },
  n(c) { return Math.max(1, Math.round(c * Q.part)); },
  spark(x, y, z, n, r = 6, g = 3, b = 1, speed = 5, life = .5, size = .1, grav = 14) {
    n = this.n(n); for (let i = 0; i < n; i++) { const a = R(TAU), e = R(-.3, 1.2), s = speed * R(.3, 1), c = Math.cos(e); this.add.spawn(x, y, z, Math.cos(a) * c * s, Math.sin(e) * s, Math.sin(a) * c * s, life * R(.5, 1.2), size * R(.6, 1.3), r, g, b, grav, 1.2); }
  },
  sparkDir(x, y, z, dx, dz, n, r = 6, g = 3, b = 1, speed = 7, spread = .7) {
    n = this.n(n); const ba = Math.atan2(dz, dx); for (let i = 0; i < n; i++) { const a = ba + RS(spread), s = speed * R(.3, 1); this.add.spawn(x, y, z, Math.cos(a) * s, R(-1, 4), Math.sin(a) * s, R(.2, .6), R(.06, .13), r, g, b, 14, 1.5); }
  },
  embers(x, y, z, n, r = 5, g = 1.8, b = .4, spread = .3) {
    n = this.n(n); for (let i = 0; i < n; i++) this.add.spawn(x + RS(spread), y + R(.2), z + RS(spread), RS(.35), R(.5, 1.7), RS(.35), R(.9, 2.6), R(.045, .1), r, g, b, -.5, .5);
  },
  glow(x, y, z, size, r, g, b, life = .25) { this.add.spawn(x, y, z, 0, 0, 0, life, size, r, g, b, 0, 0); },
  burst(x, y, z, n, r, g, b, speed = 3, life = .7, size = .16) {
    n = this.n(n); for (let i = 0; i < n; i++) { const a = R(TAU), e = RS(1.3), s = speed * R(.4, 1), c = Math.cos(e); this.add.spawn(x, y, z, Math.cos(a) * c * s, Math.sin(e) * s, Math.sin(a) * c * s, life * R(.5, 1.1), size * R(.5, 1.2), r, g, b, 0, 2.5); }
  },
  smoke(x, y, z, n, sh = .1, size = 1, rise = .9, life = 1.6, spread = .3, tr = 1, tg = 1, tb = 1) {
    n = this.n(n); for (let i = 0; i < n; i++) this.soft.spawn(x + RS(spread), y + R(.3), z + RS(spread), RS(.5), rise * R(.5, 1.2), RS(.5), life * R(.6, 1.2), size * R(.6, 1.3), sh * tr, sh * tg, sh * tb, 0, .8);
  },
  puff(x, y, z, n, sh = .2, speed = 2.5, size = .7, life = .6) {
    n = this.n(n); for (let i = 0; i < n; i++) { const a = R(TAU); this.soft.spawn(x, y, z, Math.cos(a) * speed * R(.4, 1), R(.2, .9), Math.sin(a) * speed * R(.4, 1), life * R(.6, 1.2), size * R(.6, 1.2), sh, sh, sh * 1.1, 0, 3); }
  },
  gibs(kind, x, y, z, n, speed = 4, sc = 1, r = 1, g = 1, b = 1) {
    const p = this.debris[kind]; if (!p) return;
    for (let i = 0; i < n; i++) {
      const a = R(TAU), s = speed * R(.3, 1); let sx, sy, sz;
      if (kind === 'bone') { sx = sz = .09 * sc * R(.7, 1.3); sy = R(.22, .5) * sc; } else if (kind === 'skull') { sx = sy = sz = .15 * sc; }
      else if (kind === 'scrap') { sx = R(.12, .34) * sc; sy = .04 * sc; sz = R(.1, .26) * sc; } else if (kind === 'plank') { sx = R(.3, .6) * sc; sy = .06; sz = R(.1, .18) * sc; }
      else if (kind === 'shard') { sx = sy = sz = R(.08, .2) * sc; } else if (kind === 'gib') { sx = sz = R(.08, .2) * sc; sy = sx * .7; } else { sx = sy = sz = R(.1, .24) * sc; }
      p.spawn(x + RS(.2), y + R(.2, .7), z + RS(.2), Math.cos(a) * s, R(2, 6) * (speed / 4), Math.sin(a) * s, sx, sy, sz, r, g, b);
    }
  },
  splat(x, z, size, r, g, b) { this.goo.add(x, z, size, r, g, b); },
  burn(x, z, size) { this.scorch.add(x, z, size, .02, .018, .016); },
  shake(a) { game.trauma = Math.min(1, game.trauma + a); },
  hitStop(t) { game.hitStop = Math.max(game.hitStop, t); },
  slowmo(dur, k = .2) { game.slowT = dur; game.slowK = k; },
  explosion(x, y, z, size = 1, r = 8, g = 4, b = 1.2) {
    this.glow(x, y, z, 3.2 * size, r, g, b, .22); this.spark(x, y, z, 26 * size, r, g, b, 9 * size, .7, .12); this.burst(x, y, z, 14 * size, r * .7, g * .5, b * .4, 4 * size, .5, .5);
    this.smoke(x, y + .3, z, 8 * size, .09, 1.4 * size, 1.4, 1.8, .5 * size); Lights.flash(x, y + .5, z, r / 8, g / 8, b / 8, 60 * size, .3, 12 * size); this.burn(x, z, 2.2 * size); this.shake(.35 * size);
  },
  // continuous emitters registered by props (flames, severed cables, vents...)
  emitter(type, x, y, z, rate, r = 5, g = 1.8, b = .4) { const e = { type, x, y, z, rate, r, g, b, acc: R(), t: R(3) }; this.emitters.push(e); return e; },
  update(dt, cx, cz) {
    PXU.value = VIEW.ih / CAM.h;
    for (const e of this.emitters) {
      if (dist2(e.x, e.z, cx, cz) > 26 * 26 || e.off) continue;
      if (e.type === 'ember') { e.acc += e.rate * dt * Q.part; while (e.acc > 1) { e.acc--; this.add.spawn(e.x + RS(.12), e.y, e.z + RS(.12), RS(.3), R(.5, 1.6), RS(.3), R(.9, 2.4), R(.04, .09), e.r, e.g, e.b, -.5, .5); } }
      else if (e.type === 'spark') { e.t -= dt; if (e.t <= 0) { e.t = R(.4, 3.2); this.spark(e.x, e.y, e.z, 9, e.r, e.g, e.b, 3.5, .7, .07, 12); this.glow(e.x, e.y, e.z, .7, e.r, e.g, e.b, .08); if (dist2(e.x, e.z, cx, cz) < 150) SFX.play('zap', e.x, e.z, .25); } }
      else if (e.type === 'steam') { e.acc += e.rate * dt * Q.part; while (e.acc > 1) { e.acc--; this.soft.spawn(e.x + RS(.1), e.y, e.z + RS(.1), RS(.3), R(1, 2.2), RS(.3), R(.9, 1.8), R(.5, 1.1), e.r, e.g, e.b, 0, 1.2); } }
      else if (e.type === 'drip') { e.t -= dt; if (e.t <= 0) { e.t = R(.5, 2.5); this.add.spawn(e.x, e.y, e.z, 0, 0, 0, .7, .07, e.r, e.g, e.b, 16, 0); } }
      else if (e.type === 'mote') { e.acc += e.rate * dt * Q.part; while (e.acc > 1) { e.acc--; this.add.spawn(e.x + RS(.8), e.y + R(1.6), e.z + RS(.8), RS(.15), R(.1, .5), RS(.15), R(1.5, 3.5), R(.04, .08), e.r, e.g, e.b, 0, .3); } }
    }
    // deck-wide ambient weather around the camera
    const am = this.ambient;
    if (am) { this.ambAcc += am.rate * dt * Q.part; while (this.ambAcc > 1) { this.ambAcc--; const x = cx + RS(19), z = cz + RS(19); this.add.spawn(x, am.y0 + R(am.yr), z, am.vx + RS(am.j), am.vy + RS(am.j * .5), am.vz + RS(am.j), R(2, 4.5), R(am.s0, am.s1), am.r, am.g, am.b, am.grav, .2); } }
    for (const k in this.debris) this.debris[k].update(dt);
    for (let i = 0; i < this.wrk.length; i++) { const w = this.wrk[i]; w.x += w.vx * dt; w.z += w.vz * dt; w.rx += w.wx * dt; w.ry += w.wy * dt; w.rz += w.wz * dt; if (w.x - cx > 70) w.x -= 140; else if (w.x - cx < -70) w.x += 140; if (w.z - cz > 70) w.z -= 140; else if (w.z - cz < -70) w.z += 140; _e1.set(w.rx, w.ry, w.rz); _q1.setFromEuler(_e1); _m1.compose(_v1.set(w.x, w.y, w.z), _q1, _v2.set(w.sx, w.sy, w.sz)); this.wreck.setMatrixAt(i, _m1); }
    this.wreck.instanceMatrix.needsUpdate = true;
    Tele.update(dt); Dangers.update();
    this.moteU.uCenter.value.set(cx, 0, cz); this.moteU.uLPos.value.copy(lantern.position); this.moteU.uLCol.value.copy(lantern.color).multiplyScalar(lantern.intensity);
    this.add.flush(); this.soft.flush();
  }
};
