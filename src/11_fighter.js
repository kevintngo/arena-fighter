// =====================================================================================
//  FIGHTERS: one class for every duellist. Damage is a percentage that makes each hit throw you further;
//  you lose a stock when you are knocked off the deck and cannot get back.
// =====================================================================================
const GRAV = 26, DMG_K = 1.15, BKB_K = .6, KBG_K = 1.15, PARRY_T = .1, ROLL_T = .36, ROLL_D = 3.5, BTN = ['atk', 'heavy', 'spec', 'guard'];
const fighters = [];
let hero = null;                       // the player's fighter
const turnTo = (a, b, k) => a + clamp(angDiff(a, b), -k, k);
// swing trail: one ring; the shader reveals the swept sector
const ARC_GEO = (() => {
  const g = new BufferGeometry(), seg = 48, ap = [], au = [], ai = [];
  for (let i = 0; i <= seg; i++) { const th = -PI + i / seg * TAU; for (let j = 0; j < 2; j++) { const rr = j ? 1 : .42; ap.push(Math.sin(th) * rr, 0, Math.cos(th) * rr); au.push(th, j); } }
  for (let i = 0; i < seg; i++) { const a = i * 2; ai.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new Float32BufferAttribute(ap, 3)); g.setAttribute('uv', new Float32BufferAttribute(au, 2)); g.setIndex(ai); return g;
})();
const ARC_VS = 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }';
const ARC_FS = `uniform float uTail, uHead, uAlpha; uniform vec3 uCol; varying vec2 vU;
  void main(){ float t = (vU.x - uTail)/(uHead - uTail + 1e-5); if (t < 0. || t > 1.) discard; float rad = smoothstep(0., .25, vU.y)*smoothstep(1., .82, vU.y)*(.35 + .65*vU.y*vU.y);
    float edge = smoothstep(.8, .97, vU.y)*smoothstep(1., .97, vU.y)*2.; gl_FragColor = vec4(uCol*(rad*t*t*.13 + edge*t*.3)*uAlpha, 1.); }`;
const BUB_VS = 'varying vec3 vN, vP; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }';
const BUB_FS = `uniform vec3 uCol; uniform float uTime; varying vec3 vN, vP;
  void main(){ float f = 1. - abs(dot(normalize(vN), vec3(.5255, .6691, .5255))); vec2 q = vec2(vP.x + vP.z, vP.y)*2.6; vec2 h = vec2(q.x + floor(q.y)*.5, q.y); vec2 c = abs(fract(h) - .5); float hex = smoothstep(.39, .5, max(c.x, c.y));
    float band = pow(.5 + .5*sin(vP.y*5. - uTime*3.), 5.); gl_FragColor = vec4(uCol*(pow(f, 2.2)*1.25 + hex*.2 + band*.1 + .04), 1.); }`;
const CL_C = 7, CL_R = 8;
// a move: wind-up / active / recovery in seconds, a sector (or circle) hitbox, damage %, base knockback and knockback growth
function mv(o) { return Object.assign({ su: .1, act: .1, rec: .22, dmg: 4, bkb: 3, kbg: 2, reach: 1.9, half: 1.05, off: 0, lunge: 0, hits: 1, gap: .1, anim: 'slash', sd: 0, sfx: 'swing' }, o); }
const GRAB = mv({ su: .1, act: .08, rec: .34, dmg: 8, bkb: 9, kbg: 5.5, reach: 1.45, half: .75, grab: true, anim: 'grab', sfx: 'whoosh', lunge: 3 });

class Fighter {
  constructor(def, side, cpu) {
    this.def = def; this.side = side; this.cpu = cpu; this.I = { mx: 0, mz: 0, atk: false, heavy: false, spec: false, guard: false };
    this.P = { atk: false, heavy: false, spec: false, guard: false, stick: false }; this.buf = { atk: 0, heavy: 0, spec: 0, guard: 0 }; this.ai = null;
    this.r = def.r; this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.kx = 0; this.kz = 0; this.yaw = 0; this.air = false;
    this.pct = 0; this.stocks = 3; this.sh = 100; this.state = 'idle'; this.st = 0; this.inv = 0; this.armorT = 0; this.ht = 0; this.lagT = 0;
    this.move = null; this.mt = 0; this.ji = -1; this.pow = 1; this.hitWin = false; this.hitI = 0; this.hitSet = new Set(); this.queued = false; this.didHit = false;
    this.chT = 0; this.runT = 0; this.airDodged = false; this.ledgeCd = 0; this.rollN = 0; this.rollCool = 0; this.techT = 0;
    this.hold = null; this.heldBy = null; this.throwT = 0; this.counterT = 0; this.item = null; this.over = 0; this.aegis = 0; this.tether = false; this.slowT = 0;
    this.lastBy = null; this.lastHitT = -9; this.kos = 0; this.dmgDone = 0; this.store = 0; this.mark = 0; this.float = 0; this.teeter = false;
    this.ph = 0; this.moveAmt = 0; this.flash = 0; this.pop = 0; this.rX = 0; this.rY = 0; this.arcA = 0; this.arcFrom = 0; this.arcTo = 0; this.speedNow = 0; this.lastStep = 0; this.trailT = 0; this.fallSc = 1; this.fallTr = []; this.fallTrT = 0;
    const tp = RIGS[def.rig](); this.rig = rigInstance(tp, true); this.root = this.rig.root; this.root.scale.setScalar(def.scale); scene.add(this.root);
    for (const n of ['armL', 'armR', 'torso', 'head', 'blade']) if (this.rig.b[n]) this.rig.b[n].rotation.order = 'YXZ';
    if (this.rig.mats.cloth) this.rig.mats.cloth.side = DoubleSide;
    const c = def.col;
    if (def.blade) {
      this.bladeMat = new MeshBasicMaterial(); this.bladeMat.color.setRGB(c[0] * .2 + .5, c[1] * .2 + .5, c[2] * .2 + .5); const gl = new MeshBasicMaterial(Object.assign({}, ADD_BLEND)); gl.color.setRGB(c[0] * .045, c[1] * .045, c[2] * .045);
      const bm = new Mesh(new BoxGeometry(.034, .012, 1).translate(0, 0, .5), this.bladeMat); bm.position.z = .15; bm.scale.set(1.2, 1, 1.1); this.sheath = new Mesh(new BoxGeometry(.11, .05, 1.04).translate(0, 0, .5), gl); this.sheath.position.z = .14; this.sheath.scale.set(1.3, 1, 1.1);
      this.rig.b.blade.add(bm, this.sheath); this.ownG = [bm.geometry, this.sheath.geometry];
    }
    this.arcU = { uTail: { value: 0 }, uHead: { value: 0 }, uAlpha: { value: 0 }, uCol: { value: new Color(c[0], c[1], c[2]) } };
    this.arc = new Mesh(ARC_GEO, new ShaderMaterial(Object.assign({ uniforms: this.arcU, side: DoubleSide, vertexShader: ARC_VS, fragmentShader: ARC_FS }, ADD_BLEND))); this.arc.frustumCulled = false; this.arc.renderOrder = 14; this.arc.position.y = 1.05; this.arc.visible = false; this.root.add(this.arc);
    // shield bubble and the ring of light that says whose fighter this is
    this.bubU = { uCol: { value: new Color(c[0], c[1], c[2]) }, uTime }; this.bub = new Mesh(G.sph, new ShaderMaterial(Object.assign({ uniforms: this.bubU, side: DoubleSide, vertexShader: BUB_VS, fragmentShader: BUB_FS }, ADD_BLEND))); this.bub.renderOrder = 15; this.bub.visible = false; this.bub.frustumCulled = false; scene.add(this.bub);
    this.ringM = new MeshBasicMaterial(Object.assign({ map: TEX.soft, polygonOffset: true }, { blend: 3 })); const rc = side ? [1, .16, .12] : [1, .62, .16]; this.ringM.color.setRGB(rc[0] * .5, rc[1] * .5, rc[2] * .5);
    this.ring = new Mesh(G.planeUp, this.ringM); this.ring.renderOrder = 4; this.ring.frustumCulled = false; scene.add(this.ring);
    if (def.cloak) {
      const n = CL_C * CL_R; this.cp = new Float32Array(n * 3); this.cq = new Float32Array(n * 3); const cg = new BufferGeometry(), cu = [], ci = [];
      for (let r = 0; r < CL_R; r++) for (let q = 0; q < CL_C; q++) cu.push(q / (CL_C - 1) * 1.5, r / (CL_R - 1) * 2);
      for (let r = 0; r < CL_R - 1; r++) for (let q = 0; q < CL_C - 1; q++) { const a = r * CL_C + q; ci.push(a, a + CL_C, a + 1, a + 1, a + CL_C, a + CL_C + 1); }
      this.cPos = new BufferAttribute(new Float32Array(n * 3), 3).setUsage(); cg.setAttribute('position', this.cPos); cg.setAttribute('uv', new Float32BufferAttribute(cu, 2)); cg.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3)); cg.setIndex(ci);
      this.cloakMat = cloneMat(MATS.cloth.m); this.cloakMat.color.setRGB(def.cloak[0], def.cloak[1], def.cloak[2]); this.cloakMat.side = DoubleSide;
      this.cloak = new Mesh(cg, this.cloakMat); this.cloak.frustumCulled = false; this.cloak.castShadow = true; scene.add(this.cloak);
    }
    this.place(0, 0, 0);
  }
  dispose() { scene.remove(this.root); scene.remove(this.bub); scene.remove(this.ring); if (this.cloak) { scene.remove(this.cloak); this.cloak.geometry.dispose(); } if (this.ownG) for (const g of this.ownG) g.dispose(); rigDispose(this.rig); if (this.def.drop) this.def.drop(this); }
  fresh() {
    this.cancel(); if (this.def.drop) this.def.drop(this); this.pct = 0; this.sh = 100; this.inv = 0; this.armorT = 0; this.item = null; this.over = 0; this.aegis = 0; this.tether = false; this.slowT = 0; this.store = 0; this.heldBy = null; this.lastBy = null;
    this.airDodged = false; this.runT = 0; this.flash = 0; this.pop = 0; this.rX = 0; this.fallSc = 1; this.fallTr.length = 0; this.root.scale.setScalar(this.def.scale); for (const k of BTN) { this.I[k] = this.P[k] = false; this.buf[k] = 0; } this.I.mx = this.I.mz = 0;
    this.root.visible = true; this.ring.visible = true; if (this.cloak) this.cloak.visible = true;
  }
  place(x, z, yaw) { this.x = x; this.z = z; this.y = 0; this.yaw = yaw; this.vx = this.vy = this.vz = this.kx = this.kz = 0; this.air = false; this.root.position.set(x, 0, z); this.root.rotation.set(0, yaw, 0); this.root.updateMatrixWorld(true); if (this.cloak) this.resetCloak(); }
  setState(s) { this.state = s; this.st = 0; }
  get fx() { return Math.sin(this.yaw); } get fz() { return Math.cos(this.yaw); }
  get foe() { for (const f of fighters) if (f !== this && f.side !== this.side) return f; return null; }
  get busy() { const s = this.state; return s === 'dead' || s === 'respawn' || s === 'ride' || s === 'win' || s === 'intro' || s === 'out' || s === 'fall'; }
  take(k) { if (this.buf[k] > 0) { this.buf[k] = 0; return true; } return false; }
  dmgMul() { return (this.over > 0 ? 1.25 : 1) * (this.def.dmgMul ? this.def.dmgMul(this) : 1); }
  // aim along the stick, with a little help toward a nearby foe
  aim() {
    const I = this.I, sm = Math.hypot(I.mx, I.mz); let a = sm > .3 ? Math.atan2(I.mx, I.mz) : this.yaw; const o = this.foe;
    if (o && !o.busy) { const dx = o.x - this.x, dz = o.z - this.z, dd = Math.hypot(dx, dz), oa = Math.atan2(dx, dz), df = angDiff(a, oa); if (dd < 7 && Math.abs(df) < (sm > .3 ? .7 : 1.5)) a += df * (this.cpu ? 1 : .8); }
    this.yaw = a;
  }
  // ------------------------------------------------------------------ per-tick
  update(dt) {
    const I = this.I, P = this.P, B = this.buf, d = this.def;
    for (const k of BTN) { if (I[k] && !P[k]) B[k] = .15; else B[k] = Math.max(0, B[k] - dt); }
    const sm = Math.min(1, Math.hypot(I.mx, I.mz)), stickP = sm > .55 && !P.stick;
    this.st += dt; this.inv = Math.max(0, this.inv - dt); this.armorT = Math.max(0, this.armorT - dt); this.ledgeCd -= dt; this.counterT = Math.max(0, this.counterT - dt); this.techT -= dt;
    this.over = Math.max(0, this.over - dt); this.aegis = Math.max(0, this.aegis - dt); this.slowT = Math.max(0, this.slowT - dt); this.flash = Math.max(0, this.flash - dt * 5); this.pop = Math.max(0, this.pop - dt * 4);
    this.rollCool -= dt; if (this.rollCool <= 0) this.rollN = 0;
    if (this.state !== 'shield' && this.state !== 'sstun' && this.state !== 'dizzy') this.sh = Math.min(100, this.sh + 8 * dt);
    if (this.aegis > 0) this.armorT = Math.max(this.armorT, .05);
    if (I.guard && !P.guard) this.techT = .16;
    if (d.tick) d.tick(this, dt);
    const S = this.state;
    if (S === 'idle') this.ground(dt, sm);
    else if (S === 'air') this.airborne(dt, sm);
    else if (S === 'attack') this.moveStep(dt, sm);
    else if (S === 'charge') {
      this.vx = damp(this.vx, 0, 14, dt); this.vz = damp(this.vz, 0, 14, dt); this.chT += dt; if (sm > .3) this.yaw = turnTo(this.yaw, Math.atan2(I.mx, I.mz), 5 * dt);
      if (d.chargeArmor) this.armorT = Math.max(this.armorT, .08);
      if (R() < dt * 30) { const a = R(TAU), c = d.col; FX.add.spawn(this.x + Math.cos(a) * 1.3, R(.3, 1.8), this.z + Math.sin(a) * 1.3, -Math.cos(a) * 3, R(-.3, .6), -Math.sin(a) * 3, .35, .07, c[0], c[1], c[2], 0, 0); }
      if (!I.heavy || this.chT >= 1.05) { const c = sat(this.chT / 1); this.startMove(d.moves.smash, -1, 1 + c * .5); }
    } else if (S === 'shield') {
      this.vx = damp(this.vx, 0, 18, dt); this.vz = damp(this.vz, 0, 18, dt); this.sh -= 13 * dt; const o = this.foe; if (o && this.st < .3) this.yaw = turnTo(this.yaw, Math.atan2(o.x - this.x, o.z - this.z), 12 * dt);
      if (this.sh <= 0) this.shieldBreak();
      else if (this.take('atk')) { this.aim(); this.startMove(GRAB, -1, 1); }
      else if (stickP && this.st > .05) this.roll(I.mx / sm, I.mz / sm);
      else if (!I.guard && this.st > .09) this.lag(.07);
    } else if (S === 'sstun') { this.vx = damp(this.vx, 0, 10, dt); this.vz = damp(this.vz, 0, 10, dt); if (this.st >= this.lagT) { if (I.guard && this.sh > 0) { this.state = 'shield'; this.st = PARRY_T + .01; } else this.setState('idle'); } }
    else if (S === 'lag') { this.vx = damp(this.vx, 0, 12, dt); this.vz = damp(this.vz, 0, 12, dt); if (this.st >= this.lagT) this.setState(this.air ? 'air' : 'idle'); }
    else if (S === 'roll') {
      const p = this.st / ROLL_T, v = ROLL_D / ROLL_T * 1.7 * (1 - p * .82) * (d.rollK || 1); if (d.rollK) ghost(this, 1); this.vx = this.rdx * v; this.vz = this.rdz * v;
      if (this.st >= ROLL_T) { this.vx *= .3; this.vz *= .3; this.lag(.06); }
    } else if (S === 'hurt') {
      this.ht -= dt; if (!this.air) { this.vx = damp(this.vx, 0, 10, dt); this.vz = damp(this.vz, 0, 10, dt); }
      if (this.ht <= 0) { this.setState(this.air ? 'air' : 'idle'); }
    } else if (S === 'down') { if (this.st > .46) { this.setState('idle'); this.inv = Math.max(this.inv, .18); } }
    else if (S === 'dizzy') { this.vx = damp(this.vx, 0, 10, dt); this.vz = damp(this.vz, 0, 10, dt); if (R() < dt * 9) FX.add.spawn(this.x + RS(.5), 1.9 * d.scale, this.z + RS(.5), RS(.5), .4, RS(.5), .5, .08, 3, 3, 1, 0, 0); if (this.st > 2.3) { this.sh = 40; this.setState('idle'); } }
    else if (S === 'held') { const g = this.heldBy; if (!g || g.hold !== this) { this.heldBy = null; this.setState(this.air ? 'air' : 'idle'); } }
    else if (S === 'fall') {             // over the edge: plummeting and shrinking into the abyss, leaving a clean arc trail
      this.vx = damp(this.vx, 0, .9, dt); this.vz = damp(this.vz, 0, .9, dt); const c = d.col, cm = Math.max(c[0], c[1], c[2], 1), nr = c[0] / cm, ng = c[1] / cm, nb = c[2] / cm, tr = this.fallTr;
      this.fallTrT -= dt;
      if (this.fallTrT <= 0) { this.fallTrT = .022; tr.push(this.x, this.y + .9 * d.scale * this.fallSc, this.z); if (tr.length > 36) tr.splice(0, 3); }
      const n = tr.length / 3;
      for (let i = 1; i < n; i++) { const a = (i / n) * (i / n) * .85, j = i * 3; Arcs.line(tr[j - 3], tr[j - 2], tr[j - 1], tr[j], tr[j + 1], tr[j + 2], nr * a + .2 * a, ng * a + .2 * a, nb * a + .2 * a); }
      if (R() < dt * 16) FX.add.spawn(this.x + RS(.25 * this.fallSc), this.y + .7 * d.scale * this.fallSc, this.z + RS(.25 * this.fallSc), RS(.4), R(.6, 2.2), RS(.4), .35, .07 * this.fallSc + .02, c[0] * .6, c[1] * .6, c[2] * .6, 0, 1.5);
    } else if (S === 'dead') { if (this.stocks > 0 && this.st > .95) this.respawn(); }
    else if (S === 'respawn') { const p = sat(this.st / .9); this.y = 7 * (1 - p) * (1 - p); const c = d.col; if (R() < dt * 40) FX.add.spawn(this.x + RS(.5), this.y + R(0, 5), this.z + RS(.5), 0, R(2, 6), 0, .4, .07, c[0], c[1], c[2], 0, 0); if (p >= 1) { this.y = 0; this.setState('idle'); this.inv = 1.7; SFX.play('rise', this.x, this.z, .5, 1.4); } }
    this.physics(dt);
    this.animate(dt);
    for (const k of BTN) P[k] = I[k]; P.stick = sm > .55;
  }
  lag(t) { this.setState('lag'); this.lagT = t; }
  ground(dt, sm) {
    const d = this.def, I = this.I, sp = d.speed * (this.slowT > 0 ? .55 : 1) * (d.rage ? 1 + Math.min(this.pct, 150) / 420 : 1);
    this.vx = damp(this.vx, I.mx * sp, 13, dt); this.vz = damp(this.vz, I.mz * sp, 13, dt);
    if (sm > .2) { this.yaw = turnTo(this.yaw, Math.atan2(I.mx, I.mz), 15 * dt); if (sm > .8) this.runT += dt; } else this.runT = 0;
    if (this.take('guard')) { if (sm > .5) this.roll(I.mx / sm, I.mz / sm); else this.setState('shield'); return; }
    if (this.item && this.item.use && this.take('atk')) { this.aim(); this.item.use(this); return; }
    if (this.take('heavy')) { this.aim(); this.setState('charge'); this.chT = 0; SFX.play('charge', this.x, this.z, .5, 1.2); return; }
    if (this.take('spec')) { this.aim(); this.startMove(d.moves.spec, -1, 1); return; }
    if (this.take('atk')) { this.aim(); if (this.runT > .32 && d.moves.dash) this.startMove(d.moves.dash, -1, 1); else this.startMove(d.moves.jab[0], 0, 1); }
  }
  airborne(dt, sm) {
    const d = this.def, I = this.I, sp = d.air;
    this.vx = damp(this.vx, I.mx * sp, 4.5, dt); this.vz = damp(this.vz, I.mz * sp, 4.5, dt);
    if (sm > .3) this.yaw = turnTo(this.yaw, Math.atan2(I.mx, I.mz), 10 * dt);
    if (this.take('guard')) { if (!this.airDodged) { this.airDodged = true; this.inv = .28; if (sm > .3) { this.vx = I.mx * 5; this.vz = I.mz * 5; } FX.puff(this.x, this.y + .8, this.z, 4, .3, 2, .5, .35); SFX.play('dash', this.x, this.z, .5, 1.5); } return; }
    if (this.take('atk') || this.take('heavy') || this.take('spec')) { this.aim(); this.startMove(d.moves.air, -1, 1); }
  }
  roll(dx, dz) {
    this.setState('roll'); this.rdx = dx; this.rdz = dz; this.yaw = Math.atan2(dx, dz); this.inv = Math.max(this.inv, Math.max(.1, .27 - this.rollN * .07)); this.rollN++; this.rollCool = 1.1;
    FX.puff(this.x, .15, this.z, 4, .25, 2, .6, .4); SFX.play('dash', this.x, this.z, .5, 1.2);
  }
  shieldBreak() {
    this.sh = 0; this.setState('dizzy'); this.inv = 0; this.vy = 7; this.air = true; this.y = .05; const c = this.def.col;
    FX.gibs('shard', this.x, 1, this.z, 12, 5, .8, c[0] * .3, c[1] * .3, c[2] * .3); FX.burst(this.x, 1, this.z, 26, c[0], c[1], c[2], 6, .6, .12); FX.shake(.4); SFX.play('smash', this.x, this.z, 1, .8); Tele.ring(this.x, this.z, 3, .35, 3, 3, 3);
    Duel.banner('SHIELD BREAK', .9, '#ff5a3c');
  }
  // ------------------------------------------------------------------ moves
  startMove(m, ji, pow) {
    this.setState('attack'); this.move = m; this.mt = 0; this.ji = ji; this.pow = pow; this.hitI = 0; this.hitSet.clear(); this.hitWin = false; this.queued = false; this.didHit = false; this.hold = null;
    const sw = m.arc || (ji % 2 ? [1.25, -1.1] : [-1.25, 1.1]); this.arcFrom = sw[0]; this.arcTo = sw[1]; this.arc.scale.setScalar((m.reach + .25) / this.def.scale); this.arc.visible = m.anim === 'slash' || m.anim === 'spin';
    if (m.armor) this.armorT = Math.max(this.armorT, m.su + m.act);
    if (m.on) m.on(this, 0);
  }
  moveStep(dt, sm) {
    const m = this.move, t0 = this.mt, d = this.def; this.mt += dt; const t = this.mt, a0 = m.su, a1 = m.su + m.act;
    if (!this.air) { this.vx = damp(this.vx, 0, 16, dt); this.vz = damp(this.vz, 0, 16, dt); } else { this.vx = damp(this.vx, this.I.mx * d.air * .6, 3, dt); this.vz = damp(this.vz, this.I.mz * d.air * .6, 3, dt); }
    if (m.lunge && t >= (m.l0 === undefined ? a0 * .4 : m.l0) && t < a1) { this.vx = this.fx * m.lunge; this.vz = this.fz * m.lunge; }
    if (t0 < a0 && t >= a0) { SFX.play(m.sfx, this.x, this.z, .7, (m.pitch || 1) * (.95 + R(.1))); if (m.on) m.on(this, 1); if (this.state !== 'attack' || this.move !== m) return; }
    if (t >= a0 && t < a1) { this.hitWin = true; const k = Math.min(m.hits - 1, Math.floor((t - a0) / m.gap)); if (k > this.hitI) { this.hitI = k; this.hitSet.clear(); } if (m.on) m.on(this, 2, dt); if (this.state !== 'attack' || this.move !== m) return; } else this.hitWin = false;
    if (this.hold) {
      const v = this.hold; v.x = this.x + this.fx * (this.r + v.r); v.z = this.z + this.fz * (this.r + v.r); v.y = this.y + .15; v.vx = v.vz = v.kx = v.kz = v.vy = 0; this.throwT -= dt; if (sm > .4) this.yaw = turnTo(this.yaw, Math.atan2(this.I.mx, this.I.mz), 9 * dt);
      if (this.throwT <= 0) { this.hold = null; v.heldBy = null; v.state = 'idle'; const c = this.def.col; v.takeHit(this, { dmg: m.dmg * this.dmgMul(), bkb: m.bkb, kbg: m.kbg, thrown: true }, this.fx, this.fz); if (d.onHit) d.onHit(this, v, m, m.dmg); FX.sparkDir(v.x, 1, v.z, this.fx, this.fz, 10, c[0], c[1], c[2], 8, .6); SFX.play('swingBig', this.x, this.z, .8, .9); this.mt = a1 + m.rec - .22; }
      return;
    }
    if (this.ji >= 0 && t >= a0 && this.take('atk')) this.queued = true;
    if (this.queued && t >= a1 + m.rec * .2 && d.moves.jab[this.ji + 1]) { this.aim(); this.startMove(d.moves.jab[this.ji + 1], this.ji + 1, 1); return; }
    if (t >= a1 + m.rec) { if (m.on) m.on(this, 3); if (this.state === 'attack' && this.move === m) { this.move = null; this.arc.visible = false; this.setState(this.air ? 'air' : 'idle'); } }
  }
  recoil() { this.move = null; this.hitWin = false; this.hold = null; this.setState('lag'); this.lagT = .5; this.kx = -this.fx * 5; this.kz = -this.fz * 5; this.flash = 1; }
  // ------------------------------------------------------------------ being hit
  // h: { dmg, bkb, kbg, pop?, sd?, grab?, proj?, unblock?, thrown? }; (dx, dz) is the unit direction the hit pushes
  takeHit(src, h, dx, dz) {
    const S = this.state, d = this.def;
    if (this.busy || (S === 'held' && !h.thrown) || this.inv > 0) return 0;
    if (h.grab) { if (S === 'roll') return 0; this.cancel(); this.setState('held'); this.heldBy = src; src.hold = this; src.throwT = .3; SFX.play('chain', this.x, this.z, .7, 1.2); return 5; }
    if (S === 'shield' && !h.unblock && !h.thrown) {
      const c = d.col;
      if (this.st < PARRY_T + (d.parry || 0)) {
        FX.hitStop(.11); FX.shake(.25); Tele.ring(this.x, this.z, 2.4, .3, 4, 4, 4); FX.spark(this.x + dx * -.6, 1.1, this.z + dz * -.6, 16, 5, 5, 5, 7, .4, .09); SFX.play('deflect', this.x, this.z, 1, 1.2); Lights.flash(this.x, 1.3, this.z, 1, 1, 1, 16, .2, 8);
        this.sh = Math.min(100, this.sh + 15); this.setState('idle'); this.inv = .18; this.parried = game.t; Duel.banner('PARRY', .6, '#ffffff'); return 3;
      }
      this.sh -= h.dmg * 1.15 + (h.sd || 0); this.kx += dx * (2.5 + h.dmg * .12); this.kz += dz * (2.5 + h.dmg * .12); this.setState('sstun'); this.lagT = .05 + h.dmg * .011; this.flash = .5;
      FX.spark(this.x - dx * .7, 1.1, this.z - dz * .7, 6, c[0], c[1], c[2], 4, .3, .08); SFX.play('clank', this.x, this.z, .6, 1.3); if (this.sh <= 0) this.shieldBreak(); return 2;
    }
    if (this.counterT > 0 && src && !h.proj && !h.thrown) { this.counterT = 0; if (d.onCounter) d.onCounter(this, src, h); return 4; }
    const dm = h.dmg * DMG_K * (this.aegis > 0 ? .7 : 1); this.pct = Math.min(999, this.pct + dm); this.lastBy = src || this.lastBy; this.lastHitT = game.t; this.flash = 1; this.pop = 1; if (src) src.dmgDone += dm;
    let kb = (h.bkb * BKB_K + h.kbg * KBG_K * this.pct / 100) * (2 / (1 + d.weight)) * (S === 'dizzy' ? 1.15 : 1);
    if (this.armorT > 0 && !h.thrown && kb < (d.armorK || 13)) { FX.spark(this.x - dx * .5, 1.1, this.z - dz * .5, 5, 4, 4, 4, 4, .25, .07); return 1; }
    // directional influence: leaning across the hit bends where you are sent
    const I = this.I, perp = clamp(I.mx * -dz + I.mz * dx, -1, 1), rot = perp * .24, cs = Math.cos(rot), sn = Math.sin(rot), ndx = dx * cs - dz * sn, ndz = dx * sn + dz * cs;
    this.launch(ndx, ndz, kb, h.pop);
    return 1;
  }
  cancel() { if (this.hold) { const v = this.hold; this.hold = null; v.heldBy = null; if (v.state === 'held') v.setState(v.air ? 'air' : 'idle'); } this.move = null; this.hitWin = false; this.arc.visible = false; this.counterT = 0; this.float = 0; if (this.def.onCancel) this.def.onCancel(this); }
  launch(dx, dz, kb, pop) {
    this.cancel(); const sp = kb * 1.12; this.kx = dx * sp; this.kz = dz * sp; this.vx = this.vz = 0; this.ht = .14 + kb * .03; this.kb = kb;
    const wasAir = this.air, up = pop !== undefined ? pop : (kb > 5.5 ? 2.2 + kb * .25 : 0);
    if (up < 0) { if (wasAir) this.vy = up; }
    else if (up > 0 || wasAir) { this.air = true; this.vy = Math.max(up, wasAir ? 2 : 0); this.y = Math.max(this.y, .03); }
    this.setState('hurt'); this.yaw = Math.atan2(-dx, -dz);
  }
  ko(mode = 'void') {
    if (this.busy && this.state !== 'fall') return; if (game.state !== 'fight') { this.rescue(true); return; } this.cancel(); this.stocks--; this.lastPct = this.pct; this.koMode = mode; VoidFX.burst(this, mode); this.flash = 1; this.setState('dead'); this.root.visible = false; this.bub.visible = false; this.ring.visible = false; if (this.cloak) this.cloak.visible = false;
    this.fallSc = 1; this.fallTr.length = 0; this.root.scale.setScalar(this.def.scale);
    this.pct = 0; this.over = 0; this.aegis = 0; this.item = null; this.air = false; this.vx = this.vz = this.kx = this.kz = this.vy = 0; if (this.lastBy && game.t - this.lastHitT < 9) this.lastBy.kos++;
    Duel.onKO(this, mode);
  }
  respawn() { const h = deck.home; this.x = h[0]; this.z = h[1]; this.y = 7; this.yaw = 0; this.fallSc = 1; this.fallTr.length = 0; this.root.scale.setScalar(this.def.scale); this.root.visible = true; this.ring.visible = true; if (this.cloak) { this.cloak.visible = true; this.root.position.set(this.x, this.y, this.z); this.root.updateMatrixWorld(true); this.resetCloak(); } this.sh = 100; this.setState('respawn'); this.inv = 3; }
  land(soft) {
    const S = this.state; this.air = false; this.y = 0; this.vy = 0; this.airDodged = false; this.float = 0;
    if (S === 'hurt' && !soft) {
      const sp = Math.hypot(this.kx, this.kz);
      if (sp > 8) { if (this.techT > 0 && !this.cpuNoTech) { const I = this.I, sm = Math.hypot(I.mx, I.mz); this.kx *= .2; this.kz *= .2; if (sm > .4) this.roll(I.mx / sm, I.mz / sm); else { this.setState('idle'); this.inv = .25; } FX.puff(this.x, .1, this.z, 6, .3, 3, .6, .4); SFX.play('dash', this.x, this.z, .6, 1.6); } else { this.setState('down'); this.kx *= .55; this.kz *= .55; FX.puff(this.x, .1, this.z, 8, .3, 3, .8, .5); SFX.play('slam', this.x, this.z, .5, 1.3); FX.shake(.12); } }
      return;
    }
    if (S === 'attack') { if (this.move && this.move.air) { this.move = null; this.arc.visible = false; this.lag(.1); } return; }
    if (S === 'dizzy' || S === 'held') return;
    this.setState('idle'); if (!soft) FX.puff(this.x, .08, this.z, 3, .2, 1.5, .5, .35);
  }
  physics(dt) {
    const S = this.state, d = this.def; if (!deck || S === 'held' || S === 'dead' || S === 'respawn' || S === 'ride' || S === 'intro' || S === 'out') return;
    const ox = this.x, oz = this.z; this.teeter = false;
    if (!this.air) {
      let nx = this.x + (this.vx + this.kx) * dt, nz = this.z + (this.vz + this.kz) * dt;
      if (!overFloor(nx, nz)) {
        if (Math.hypot(this.kx, this.kz) > 5) { FX.puff(this.x, .1, this.z, 4, .25, 2, .6, .4); SFX.play('clank', this.x, this.z, .4, .7); }
        this.teeter = true; this.kx *= .35; this.kz *= .35; if (overFloor(nx, this.z)) nz = this.z; else if (overFloor(this.x, nz)) nx = this.x; else { nx = this.x; nz = this.z; }
      }
      this.x = nx; this.z = nz; arenaCollide(this); const kd = Math.exp(-7 * dt); this.kx *= kd; this.kz *= kd;
      if (!overFloor(this.x, this.z)) { const nf = nearestFloor(this.x, this.z); this.x = nf[0]; this.z = nf[1]; }
    } else {
      const py = this.y; if (this.float > 0) { this.float -= dt; this.vy = damp(this.vy, .6, 6, dt); } else this.vy = Math.max(S === 'fall' ? -23 : -19, this.vy - GRAV * d.fall * dt);
      this.x += (this.vx + this.kx) * dt; this.z += (this.vz + this.kz) * dt; this.y += this.vy * dt;
      if (py >= -.02 && this.y <= 0 && this.vy <= 0 && overFloor(this.x, this.z)) this.land(false);
      else {
        if (arenaCollide(this)) { const sp = Math.hypot(this.kx, this.kz), nl = Math.hypot(_hitN[0], _hitN[1]) || 1, nx = _hitN[0] / nl, nz = _hitN[1] / nl, dn = this.kx * nx + this.kz * nz; if (dn < 0) { this.kx -= 1.75 * dn * nx; this.kz -= 1.75 * dn * nz; if (sp > 9 && S === 'hurt') { FX.puff(this.x, this.y + .8, this.z, 6, .3, 3, .7, .4); FX.shake(.15); SFX.play('slam', this.x, this.z, .6, 1.1); } } const vn = this.vx * nx + this.vz * nz; if (vn < 0) { this.vx -= vn * nx; this.vz -= vn * nz; } }
        if (this.y < -.45 && S !== 'fall') this.doom();
      }
      const kd = Math.exp((S === 'fall' ? -1.15 : -2.25) * dt); this.kx *= kd; this.kz *= kd;
      const od = Math.hypot(this.x - deck.cx, this.z - deck.cz), outR = od > deck.blastR;
      if (this.air && this.tether && (this.y < Math.max(deck.koY, -2.4) || outR)) { this.rescue(); }
      else if (this.air && (this.y < deck.koY || outR)) {
        const mode = deck.theme.id === 'foundry' && !outR ? 'lava' : (outR || (od > deck.R + 3.2 && Math.hypot(this.kx, this.kz) > 7.5)) ? 'blast' : 'void';
        this.ko(mode);
      }
    }
    this.speedNow = Math.hypot(this.x - ox, this.z - oz) / Math.max(dt, 1e-4);
    // a comet tail while you are flying
    if (S === 'hurt' && this.air && this.speedNow > 9) { this.trailT -= dt; if (this.trailT <= 0) { this.trailT = .022; const c = d.col; FX.add.spawn(this.x, this.y + .9 * d.scale, this.z, RS(.5), RS(.5), RS(.5), .4, .2, c[0] * .5, c[1] * .5, c[2] * .5, 0, 1); FX.smoke(this.x, this.y + .8, this.z, 1, .2, .7, .3, .5, .2); } }
  }
  doom() {
    this.cancel(); this.setState('fall'); this.fallTr.length = 0; this.fallTrT = 0; const nf = nearestFloor(this.x, this.z); SFX.play('fall', this.x, this.z, 1, 1); Duel.onFall(this, nf[0], nf[1]);
  }
  rescue(quiet) { this.tether = false; this.cancel(); const h = deck.home, c = [1.2, 3, 6.5]; Arcs.bolt(this.x, this.y + 1, this.z, h[0], 6, h[1], c[0], c[1], c[2], .5, 8); this.x = h[0]; this.z = h[1]; this.y = 5; this.vy = 0; this.kx = this.kz = this.vx = this.vz = 0; this.fallSc = 1; this.fallTr.length = 0; this.root.scale.setScalar(this.def.scale); this.setState('air'); this.inv = 1.2; FX.burst(this.x, 5, this.z, 24, c[0], c[1], c[2], 4, .6, .12); SFX.play('blink', this.x, this.z, 1, 1); if (!quiet) Duel.banner('TETHER', .7, '#8fd6ff'); }
  // ------------------------------------------------------------------ cloak (verlet cloth pinned across the shoulders)
  pin(c, out) { const u = c / (CL_C - 1) * 2 - 1; return out.set(u * .27, 1.5 - Math.abs(u) * .05, -.13 - (1 - u * u) * .07).applyMatrix4(this.root.matrixWorld); }
  resetCloak() {
    for (let r = 0; r < CL_R; r++) for (let c = 0; c < CL_C; c++) { const u = c / (CL_C - 1) * 2 - 1, i = (r * CL_C + c) * 3; _v1.set(u * (.27 + r * .025), 1.5 - Math.abs(u) * .05 - r * .16, -.13 - (1 - u * u) * .07 - r * .035).applyMatrix4(this.root.matrixWorld); this.cp[i] = this.cq[i] = _v1.x; this.cp[i + 1] = this.cq[i + 1] = _v1.y; this.cp[i + 2] = this.cq[i + 2] = _v1.z; }
  }
  link(a, b, rest, pinA) {
    const p = this.cp, ja = a * 3, jb = b * 3, dx = p[jb] - p[ja], dy = p[jb + 1] - p[ja + 1], dz = p[jb + 2] - p[ja + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4, f = (d - rest) / d;
    if (pinA === 2) return; if (pinA === 1) { p[jb] -= dx * f; p[jb + 1] -= dy * f; p[jb + 2] -= dz * f; return; }
    const h = f * .5; p[ja] += dx * h; p[ja + 1] += dy * h; p[ja + 2] += dz * h; p[jb] -= dx * h; p[jb + 1] -= dy * h; p[jb + 2] -= dz * h;
  }
  simCloak(dt) {
    const p = this.cp, q = this.cq, n = CL_C * CL_R, t = uTime.value, fx = this.fx, fz = this.fz, gy = this.y + .06, h = Math.min(dt, 1 / 40), dm = .965, wx = Math.sin(t * 1.7) * .6, wz = Math.cos(t * 1.3) * .6, fs = this.fallSc, gyA = this.state === 'fall' ? 10 : -7.5;
    if (dist2(p[0], p[2], this.x, this.z) > 9) { this.resetCloak(); }
    for (let i = CL_C; i < n; i++) { const j = i * 3, nx = p[j] + (p[j] - q[j]) * dm + (wx + Math.sin(t * 5 + i) * .8) * h * h, ny = p[j + 1] + (p[j + 1] - q[j + 1]) * dm + gyA * h * h, nz = p[j + 2] + (p[j + 2] - q[j + 2]) * dm + (wz + Math.cos(t * 4 + i * 1.3) * .8) * h * h; q[j] = p[j]; q[j + 1] = p[j + 1]; q[j + 2] = p[j + 2]; p[j] = nx; p[j + 1] = ny; p[j + 2] = nz; }
    for (let c = 0; c < CL_C; c++) { this.pin(c, _v1); const j = c * 3; p[j] = q[j] = _v1.x; p[j + 1] = q[j + 1] = _v1.y; p[j + 2] = q[j + 2] = _v1.z; }
    for (let it = 0; it < 3; it++) {
      for (let r = 0; r < CL_R; r++) for (let c = 0; c < CL_C; c++) { const i = r * CL_C + c; if (c < CL_C - 1) this.link(i, i + 1, (.09 + r * .0085) * fs, r === 0 ? 2 : 0); if (r < CL_R - 1) this.link(i, i + CL_C, .16 * fs, r === 0 ? 1 : 0); }
      if (this.rX === 0) for (let i = CL_C; i < n; i++) { const j = i * 3, dx = p[j] - this.x, dz = p[j + 2] - this.z, lz = dx * fx + dz * fz; if (lz > -.11 && p[j + 1] < this.y + 1.5) { const push = lz + .11; p[j] -= fx * push; p[j + 2] -= fz * push; } if (!this.air && p[j + 1] < gy) p[j + 1] = gy; }
    }
    this.cPos.array.set(p); this.cPos.needsUpdate = true; this.cloak.geometry.computeVertexNormals();
  }
}
// ------------------------------------------------------------------ a lost stock: Voidlight Flare (vertical lance / angled blast-beam + 4-point star-glint + shock rings) or Foundry lava plunge
const LANCE_FS = `uniform float uProg, uTime; uniform vec3 uCol; varying vec2 vUv;
  void main(){
    float t = uProg, open = smoothstep(0., .06, t), pinch = max(.045, pow(max(0., 1. - t), 1.4));
    float x = abs(vUv.x - .5)*2. / pinch;
    float core = exp(-x*x*18.)*smoothstep(1.5, 0., x), sheath = exp(-x*x*3.2)*smoothstep(1.3, 0., x);
    float grow = smoothstep(0., .14, t), head = smoothstep(grow + .09, max(0., grow - .22), vUv.y);
    float yFade = smoothstep(0., .06, vUv.y)*smoothstep(1., .22, vUv.y), band = .82 + .18*sin(vUv.y*22. - uTime*26.);
    float env = open*pow(max(0., 1. - t), 1.12);
    vec3 col = (uCol*sheath*.62 + mix(uCol, vec3(1.75, 1.7, 1.65), .72)*core*1.55)*yFade*head*band*env;
    gl_FragColor = vec4(col, 1.);
  }`;
const STAR_FS = `uniform float uProg; uniform vec3 uCol; varying vec2 vUv;
  void main(){
    vec2 p = vUv*2. - 1.; float t = uProg, pop = smoothstep(0., .1, t);
    float sc = mix(.3, 1., pop)*(1. - smoothstep(.16, 1., t)*.76); vec2 q = p / max(.06, sc); float r = length(q);
    float h = exp(-abs(q.y)*24.)*smoothstep(1., 0., abs(q.x)), v = exp(-abs(q.x)*24.)*smoothstep(1., 0., abs(q.y));
    vec2 d = vec2(q.x + q.y, q.x - q.y)*.7071;
    float dg = (exp(-abs(d.y)*30.)*smoothstep(.52, 0., abs(d.x)) + exp(-abs(d.x)*30.)*smoothstep(.52, 0., abs(d.y)))*.55;
    float core = exp(-r*r*26.)*1.5, env = smoothstep(0., .05, t)*pow(max(0., 1. - t), 1.35);
    vec3 col = mix(uCol*1.4, vec3(2.2, 2.15, 2.1), clamp(core*.7 + (h + v)*.45, 0., 1.))*(h + v + dg + core)*env;
    gl_FragColor = vec4(col, 1.);
  }`;
const KRING_FS = `uniform float uProg; uniform vec3 uCol; varying vec2 vUv;
  void main(){
    float r = length(vUv*2. - 1.), t = uProg, rad = .1 + .88*(1. - (1. - t)*(1. - t)), w = mix(.085, .022, t);
    float ring = smoothstep(w, 0., abs(r - rad))*step(r, 1.), env = (1. - t)*(1. - t*.35);
    gl_FragColor = vec4(mix(uCol*1.25, vec3(1.85), ring*.45)*ring*env, 1.);
  }`;
const VoidFX = {
  list: [],
  mkMat(fs, nr, ng, nb) {
    return new ShaderMaterial(Object.assign({
      uniforms: { uProg: { value: 0 }, uTime, uCol: { value: new Color(nr, ng, nb) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }',
      fragmentShader: fs, side: DoubleSide
    }, ADD_BLEND));
  },
  addLance(x, y, z, dx, dy, dz, w, len, dur, nr, ng, nb) {
    const g = new Group(), mat = this.mkMat(LANCE_FS, nr, ng, nb);
    for (const ry of [PI / 4, -PI / 4]) { const m = new Mesh(G.planeB, mat); m.scale.set(w, len, 1); m.rotation.y = ry; m.frustumCulled = false; m.renderOrder = 15; g.add(m); }
    g.position.set(x, y, z); _q1.setFromUnitVectors(_Y, _v1.set(dx, dy, dz)); g.matrixAutoUpdate = false; g.matrix.compose(g.position, _q1, _v2.set(1, 1, 1));
    scene.add(g); this.list.push({ obj: g, mat, t: 0, dur, delay: 0, kind: 0 });
  },
  addStar(x, y, z, size, dur, nr, ng, nb) {
    const mat = this.mkMat(STAR_FS, nr, ng, nb), m = new Mesh(G.plane, mat);
    m.frustumCulled = false; m.renderOrder = 16; m.matrixAutoUpdate = false;
    scene.add(m); this.list.push({ obj: m, mat, t: 0, dur, delay: 0, kind: 1, x, y, z, size });
  },
  addRing(x, y, z, nx, ny, nz, rad, dur, nr, ng, nb, delay = 0) {
    const mat = this.mkMat(KRING_FS, nr, ng, nb), m = new Mesh(G.planeUp, mat);
    m.frustumCulled = false; m.renderOrder = 14; m.matrixAutoUpdate = false; m.visible = delay <= 0;
    _q1.setFromUnitVectors(_Y, _v1.set(nx, ny, nz)); m.matrix.compose(_v2.set(x, y, z), _q1, _v3.set(rad * 2, 1, rad * 2));
    scene.add(m); this.list.push({ obj: m, mat, t: 0, dur, delay, kind: 2 });
  },
  burst(f, mode) {
    const c = f.def.col, cm = Math.max(c[0], c[1], c[2], 1), nr = c[0] / cm, ng = c[1] / cm, nb = c[2] / cm;
    const x = f.x, y = mode === 'lava' ? -2.22 : f.y + .4 * f.def.scale * f.fallSc, z = f.z;
    if (mode === 'lava') {
      // Foundry magma plunge: volcanic ash billow for dark contrast + incandescent splash + surface ripples
      this.addRing(x, -2.14, z, 0, 1, 0, 4.2, .52, 1, .38, .06, 0);
      this.addRing(x, -2.12, z, 0, 1, 0, 2.5, .4, 1, .75, .25, .07);
      this.addLance(x, -2.25, z, 0, 1, 0, 1.5, 11, .44, 1, .35, .08);
      FX.smoke(x, -2.0, z, 18, .05, 1.85, 3.2, 1.6, .85, .5, .28, .22);
      FX.puff(x, -1.9, z, 12, .06, 3.2, 1.35, .95);
      FX.spark(x, -2.05, z, 42, 9, 3.2, .5, 10, .95, .17, 17);
      FX.embers(x, -2.0, z, 28, 8, 2.2, .3, 1.1);
      Lights.flash(x, -.4, z, 1, .35, .08, 60, .48, 17);
      return;
    }
    if (mode === 'blast') {
      // High-speed Smash launch: angled Voidlight Streak shooting back toward the deck + crisp Star-KO glint
      const ox = deck.cx - x, oz = deck.cz - z, oy = Math.max(.4 - y, .3), ol = Math.hypot(ox, oy, oz) || 1, dx = ox / ol, dy = oy / ol, dz = oz / ol;
      this.addLance(x, y, z, dx, dy, dz, 1.45, 13.5, .54, nr, ng, nb);
      this.addStar(x, y, z, 4.8, .48, nr, ng, nb);
      this.addRing(x, y, z, dx, dy, dz, 3.4, .4, nr, ng, nb, 0);
      this.addRing(x + dx * 1.5, y + dy * 1.5, z + dz * 1.5, dx, dy, dz, 2.0, .32, nr, ng, nb, .05);
      for (let i = 0; i < 24; i++) {
        const s = R(3, 14);
        FX.add.spawn(x + RS(.4), y + RS(.4), z + RS(.4), dx * s + RS(2.2), dy * s + RS(2.2), dz * s + RS(2.2), R(.35, .75), R(.06, .13), c[0] * .75, c[1] * .75, c[2] * .75, 0, 2.2);
      }
      Lights.flash(x + dx * 2, Math.max(y, -.5), z + dz * 2, nr, ng, nb, 42, .35, 16);
      return;
    }
    // Space Void Plummet: distant 4-point Star-Glint + tall vertical Voidlight Lance rising past the rim + crisp rings
    this.addLance(x, y - .4, z, 0, 1, 0, 1.35, 18.5, .6, nr, ng, nb);
    this.addStar(x, y, z, 4.6, .5, nr, ng, nb);
    this.addRing(x, y, z, 0, 1, 0, 3.2, .44, nr, ng, nb, 0);
    this.addRing(x, -.18, z, 0, 1, 0, 2.2, .38, nr, ng, nb, .06);
    for (let i = 0; i < 26; i++) {
      const a = R(TAU), rr = R(.15, .95);
      FX.add.spawn(x + Math.cos(a) * rr, y + R(0, 4.5), z + Math.sin(a) * rr, Math.cos(a) * R(.2, 1.1), R(3, 10), Math.sin(a) * R(.2, 1.1), R(.45, .95), R(.05, .11), c[0] * .75, c[1] * .75, c[2] * .75, -.6, 1.2);
    }
    Lights.flash(x, .5, z, nr, ng, nb, 38, .35, 15);
  },
  update(dt, raw) {
    const L = this.list, step = Math.max(dt, (raw || dt) * .45);
    for (let i = L.length - 1; i >= 0; i--) {
      const it = L[i];
      if (it.delay > 0) { it.delay -= step; if (it.delay <= 0) it.obj.visible = true; continue; }
      it.t += step;
      if (it.t >= it.dur) { scene.remove(it.obj); L[i] = L[L.length - 1]; L.pop(); continue; }
      it.mat.uniforms.uProg.value = it.t / it.dur;
      if (it.kind === 1) {
        const e = it.obj.matrix.elements, s = it.size;
        e[0] = CAM.right.x * s; e[1] = CAM.right.y * s; e[2] = CAM.right.z * s; e[3] = 0;
        e[4] = CAM.up.x * s; e[5] = CAM.up.y * s; e[6] = CAM.up.z * s; e[7] = 0;
        e[8] = -CAM.fwd.x; e[9] = -CAM.fwd.y; e[10] = -CAM.fwd.z; e[11] = 0;
        e[12] = it.x; e[13] = it.y; e[14] = it.z; e[15] = 1;
      }
    }
  },
  clear() { for (const it of this.list) scene.remove(it.obj); this.list.length = 0; }
};
// ------------------------------------------------------------------ hit resolution: gather every blow that lands this tick, then apply, so trades are possible
function inHit(f, m, v) {
  if (Math.abs(f.y - v.y) > 1.9) return false;
  const hx = f.x + f.fx * m.off, hz = f.z + f.fz * m.off, dx = v.x - hx, dz = v.z - hz, dd = Math.hypot(dx, dz), reach = m.reach + v.r;
  if (dd > reach) return false; if (m.half >= PI || dd < .8) return true;
  return Math.abs(angDiff(f.yaw, Math.atan2(dx, dz))) <= m.half + Math.asin(Math.min(1, v.r / Math.max(dd, v.r)));
}
function hitDir(f, v, mode) {            // unit direction a blow sends its victim
  let dx = v.x - f.x, dz = v.z - f.z; const dd = Math.hypot(dx, dz); if (dd < .05) { dx = f.fx; dz = f.fz; } else { dx /= dd; dz /= dd; }
  if (mode === 'f') { dx = f.fx; dz = f.fz; } else if (mode === 'in') { dx = -dx; dz = -dz; } else if (mode !== 'a') { dx = dx * .6 + f.fx * .4; dz = dz * .6 + f.fz * .4; }
  const l = Math.hypot(dx, dz) || 1; _hd[0] = dx / l; _hd[1] = dz / l; return _hd;
}
const _hd = [0, 0];
function hitFx(v, dx, dz, kb, c, dm) {
  const x = v.x - dx * v.r * .6, y = v.y + 1.05 * v.def.scale, z = v.z - dz * v.r * .6, big = kb > 15;
  FX.hitStop(clamp(.03 + dm * .005 + (big ? .04 : 0), .04, .15)); FX.shake(clamp(kb / 50, .05, .6));
  FX.sparkDir(x, y, z, dx, dz, 6 + Math.round(kb * .9), c[0], c[1], c[2], 6 + kb * .35, .7); FX.spark(x, y, z, 5, 4, 4, 4, 5, .3, .07);
  Tele.ring(v.x, v.z, 1 + kb * .09, .22, c[0] * .5, c[1] * .5, c[2] * .5); Lights.flash(x, y, z, c[0] / 6, c[1] / 6, c[2] / 6, 8 + kb * .5, .2, 8);
  SFX.play(big ? 'smash' : 'hit', v.x, v.z, clamp(.5 + kb * .03, .5, 1.2), big ? .8 : 1.1 - dm * .01);
  if (big) { FX.slowmo(.14, .35); FX.puff(x, y, z, 8, .4, 5, .9, .5); SFX.play('boom', v.x, v.z, .5, 1.3); }
}
const Combat = {
  hits: [],
  step() {
    const hits = this.hits; hits.length = 0;
    for (const f of fighters) { if (f.state !== 'attack' || !f.hitWin || !f.move || f.move.reach <= 0) continue; const m = f.move; for (const v of fighters) { if (v === f || v.side === f.side || f.hitSet.has(v) || v.busy) continue; if (inHit(f, m, v)) { f.hitSet.add(v); hits.push(f, v, m); } } }
    for (let i = 0; i < hits.length; i += 3) {
      const f = hits[i], v = hits[i + 1], m = hits[i + 2]; if (f.state !== 'attack' && f.state !== 'hurt') continue;
      const dir = hitDir(f, v, m.dir), dx = dir[0], dz = dir[1], dm = m.dmg * f.pow * f.dmgMul() * (m.mul ? m.mul(f, v) : 1), kbm = f.pow > 1 ? 1 + (f.pow - 1) * .7 : 1, weak = m.hits > 1 && f.hitI < m.hits - 1, ok = f.over > 0 ? 1.15 : 1, h = weak ? { dmg: dm * .35, bkb: 1.3, kbg: .2, pop: 0, sd: 0 } : { dmg: dm, bkb: m.bkb * kbm * ok, kbg: m.kbg * kbm * ok, pop: m.pop, sd: m.sd, grab: m.grab, unblock: m.unblock }, p0 = v.pct, res = v.takeHit(f, h, dx, dz);
      if (res === 1) { f.didHit = true; hitFx(v, dx, dz, v.state === 'hurt' ? v.kb : 3, f.def.col, dm); if (m.on) m.on(f, 4, v); if (f.def.onHit) f.def.onHit(f, v, m, v.pct - p0); }
      else if (res === 3) f.recoil();
      else if (res === 2) { f.kx -= dx * 3; f.kz -= dz * 3; FX.hitStop(.05); }
      else if (res === 5) { f.mt = Math.max(f.mt, m.su + m.act); f.hitWin = false; }
    }
    // bodies do not overlap on the ground
    for (let i = 0; i < fighters.length; i++) for (let j = i + 1; j < fighters.length; j++) {
      const a = fighters[i], b = fighters[j]; if (a.busy || b.busy || a.air || b.air || a.state === 'roll' || b.state === 'roll' || a.state === 'held' || b.state === 'held') continue;
      const dx = b.x - a.x, dz = b.z - a.z, dd = Math.hypot(dx, dz), rr = a.r + b.r; if (dd >= rr || dd < 1e-4) continue; const p = (rr - dd) / dd * .5, wa = b.def.weight / (a.def.weight + b.def.weight);
      const ax = a.x - dx * p * wa * 2, az = a.z - dz * p * wa * 2, bx = b.x + dx * p * (1 - wa) * 2, bz = b.z + dz * p * (1 - wa) * 2; if (overFloor(ax, az)) { a.x = ax; a.z = az; } if (overFloor(bx, bz)) { b.x = bx; b.z = bz; }
    }
  }
};
