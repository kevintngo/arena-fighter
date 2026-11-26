// =====================================================================================
//  THE STAGE: projectiles, lingering zones, items that drop mid-duel, and the deck's own hazards
// =====================================================================================
const Bolts = {
  cap: 96, mesh: null,
  init() { const m = new MeshBasicMaterial(); this.mesh = new InstancedMesh(G.sphLo, m, this.cap); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.instanceMatrix.setUsage(); this.mesh.setColorAt(0, _c1.setRGB(1, 1, 1)); scene.add(this.mesh); },
  draw(list) {
    const n = Math.min(this.cap, list.length); this.mesh.count = n;
    for (let i = 0; i < n; i++) { const p = list[i], s = p.r * (1 + .15 * Math.sin(uTime.value * 30 + i)); _e1.set(0, Math.atan2(p.vx, p.vz), 0); _q1.setFromEuler(_e1); _m1.compose(_v1.set(p.x, p.y, p.z), _q1, _v2.set(s * .8, s * .8, s * (p.grav || p.orb ? .8 : 1.8))); this.mesh.setMatrixAt(i, _m1); this.mesh.setColorAt(i, _c1.setRGB(p.col[0] * .42, p.col[1] * .42, p.col[2] * .42)); }
    if (n) { this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; }
  }
};
// ---- projectiles
function shoot(f, o) {
  const s = Object.assign({ x: f.x + f.fx * (f.r + .5), y: f.y + 1.05 * f.def.scale, z: f.z + f.fz * (f.r + .5), vx: f.fx * (o.speed || 12), vz: f.fz * (o.speed || 12), vy: 0, r: .2, life: 1.2, col: f.def.col, owner: f, side: f.side, t: 0, dmg: 4, bkb: 3, kbg: 2 }, o);
  deck.shots.push(s); return s;
}
function updateShots(dt) {
  const L = deck.shots;
  for (let i = L.length - 1; i >= 0; i--) {
    const s = L[i]; let dead = false; s.t += dt; s.x += s.vx * dt; s.z += s.vz * dt; if (s.grav) { s.vy -= s.grav * dt; s.y += s.vy * dt; }
    const c = s.col; if (R() < dt * (s.orb ? 30 : 60)) FX.add.spawn(s.x + RS(s.r), s.y + RS(s.r), s.z + RS(s.r), RS(.4), RS(.4), RS(.4), s.orb ? .5 : .25, s.r * .5, c[0] * .6, c[1] * .6, c[2] * .6, 0, 1);
    for (const v of fighters) {
      if (v.busy) continue; const dx = v.x - s.x, dz = v.z - s.z, dd = Math.hypot(dx, dz);
      if (s.pull && v.side !== s.side && dd < s.pull && dd > .3 && v.state !== 'hurt') { v.kx -= dx / dd * 9 * dt; v.kz -= dz / dd * 9 * dt; }
      if (v.side === s.side || dd > s.r + v.r || Math.abs(s.y - v.y - 1) > 1.5) continue;
      const sp = Math.hypot(s.vx, s.vz) || 1, hx = s.grav || s.orb ? (dd > .05 ? dx / dd : 0) : s.vx / sp, hz = s.grav || s.orb ? (dd > .05 ? dz / dd : 1) : s.vz / sp, res = v.takeHit(s.owner, { dmg: s.dmg, bkb: s.bkb, kbg: s.kbg, pop: s.pop, sd: s.sd, proj: true }, hx, hz);
      if (res === 3) { s.side = v.side; s.owner = v; s.vx *= -1.25; s.vz *= -1.25; s.t = 0; s.dmg *= 1.3; continue; }
      if (res === 1) hitFx(v, hx, hz, v.state === 'hurt' ? v.kb : 3, c, s.dmg);
      if (res && !s.pierce) dead = true;
    }
    if (s.grav && s.y <= .1) { dead = true; if (s.onLand && overFloor(s.x, s.z)) s.onLand(s); }
    if (!dead && (s.t > s.life || shotBlocked(s.x, s.y, s.z))) { dead = true; if (s.onEnd) s.onEnd(s); }
    if (dead) { FX.spark(s.x, s.y, s.z, 6, c[0], c[1], c[2], 4, .3, .08); L[i] = L[L.length - 1]; L.pop(); }
  }
  Bolts.draw(L);
}
// ---- zones: anything that lingers on the deck and acts over time. Each is { upd(dt) -> false when finished }
function hitAround(owner, x, z, r, h, self, dirIn) {
  let n = 0;
  for (const v of fighters) { if (v.busy || (v === owner && !self) || (owner && v.side === owner.side && v !== owner)) continue; const dx = v.x - x, dz = v.z - z, dd = Math.hypot(dx, dz); if (dd > r + v.r || v.y > 2.6 || v.y < -1.2) continue; const k = dirIn ? -1 : 1; let hx = dd > .05 ? dx / dd * k : 0, hz = dd > .05 ? dz / dd * k : 1;
    if (h.away && owner) { const ax = v.x - owner.x, az = v.z - owner.z, al = Math.hypot(ax, az); if (al > .3) { hx = ax / al; hz = az / al; } } const res = v.takeHit(v === owner ? null : owner, Object.assign({ proj: true }, h), hx, hz); if (res === 1) { hitFx(v, hx, hz, v.state === 'hurt' ? v.kb : 3, h.col || [6, 3, 1], h.dmg); n++; } }
  return n;
}
function blast(owner, x, z, r, h, delay = 0, self = false) {
  const c = h.col || [6, 3, 1]; let t = 0; if (delay > 0) Tele.circle(x, z, r, delay, c[0] * .5, c[1] * .5, c[2] * .5);
  deck.zones.push({ upd(dt) { t += dt; if (t < delay) return true; FX.explosion(x, .6, z, r * .45, c[0], c[1], c[2]); Tele.ring(x, z, r * 1.3, .3, c[0] * .5, c[1] * .5, c[2] * .5); FX.shake(.3); SFX.play('boom', x, z, .8, 1.1); FX.burn(x, z, r * 1.2); hitAround(owner, x, z, r, h, self); return false; } });
}
function puddle(owner, x, z, r, dur, c) {
  let t = 0, acc = 0; Tele.circle(x, z, r, dur, c[0] * .25, c[1] * .25, c[2] * .25); FX.splat(x, z, r * 2.3, c[0] * .05, c[1] * .05, c[2] * .05);
  deck.zones.push({ upd(dt) { t += dt; acc += dt; if (R() < dt * 14) FX.add.spawn(x + RS(r * .8), .1, z + RS(r * .8), 0, R(.4, 1.2), 0, .5, .08, c[0] * .5, c[1] * .5, c[2] * .5, 0, 0);
    if (acc > .4) { acc = 0; for (const v of fighters) if (!v.busy && v.side !== owner.side && !v.air && dist2(v.x, v.z, x, z) < r * r) { v.slowT = .6; if (v.inv <= 0 && v.state !== 'roll') { v.pct = Math.min(999, v.pct + 2.2); v.pop = .6; v.flash = .4; owner.dmgDone += 2.2; v.lastBy = owner; v.lastHitT = game.t; } } }
    return t < dur; } });
}
function gravWell(owner, x, z, r, delay, h) {
  let t = 0; const c = h.col; Tele.circle(x, z, r, delay, c[0] * .5, c[1] * .5, c[2] * .5); SFX.play('charge', x, z, .7, .7);
  deck.zones.push({ upd(dt) { t += dt;
    if (t < delay) { for (const v of fighters) { if (v.busy || v.side === owner.side) continue; const dx = x - v.x, dz = z - v.z, dd = Math.hypot(dx, dz); if (dd < r * 2.2 && dd > .25 && v.state !== 'hurt') { v.kx += dx / dd * 11 * dt; v.kz += dz / dd * 11 * dt; } }
      for (let i = 0; i < 2; i++) { const a = R(TAU), rr = r * R(.6, 1.6); FX.add.spawn(x + Math.cos(a) * rr, R(.2, 1.6), z + Math.sin(a) * rr, -Math.cos(a) * rr * 3, 0, -Math.sin(a) * rr * 3, .3, .08, c[0], c[1], c[2], 0, 0); } return true; }
    FX.burst(x, 1, z, 40, c[0], c[1], c[2], 9, .6, .14); Tele.ring(x, z, r * 1.5, .35, c[0], c[1], c[2]); FX.shake(.35); SFX.play('boom', x, z, .9, .7); Lights.flash(x, 1.2, z, c[0] / 6, c[1] / 6, c[2] / 6, 20, .3, 10); hitAround(owner, x, z, r, h, false); return false; } });
}
function quake(owner, x, z, rmax, speed, h) {
  let rad = .6; const c = h.col, done = new Set(); Tele.ring(x, z, rmax, rmax / speed, c[0] * .6, c[1] * .6, c[2] * .6);
  deck.zones.push({ upd(dt) { rad += speed * dt;
    for (let i = 0; i < 3; i++) { const a = R(TAU); if (overFloor(x + Math.cos(a) * rad, z + Math.sin(a) * rad)) FX.puff(x + Math.cos(a) * rad, .1, z + Math.sin(a) * rad, 1, .2, 2, .6, .4); }
    for (const v of fighters) { if (v.busy || v.side === owner.side || done.has(v) || v.air) continue; const dx = v.x - x, dz = v.z - z, dd = Math.hypot(dx, dz); if (Math.abs(dd - rad) < .7 + v.r) { done.add(v); const res = v.takeHit(owner, Object.assign({ proj: true }, h), dx / (dd || 1), dz / (dd || 1)); if (res === 1) hitFx(v, dx / (dd || 1), dz / (dd || 1), v.kb || 3, c, h.dmg); } }
    return rad < rmax; } });
}
function mine(owner, x, z) {
  let t = 0; const o = partObj(buildPart(k => { k.cyl('iron', 0, 0, 0, .34, .1, 8).cyl('hazard', 0, .1, 0, .24, .04, 8).sph('gRed', 0, .16, 0, .07); })); o.position.set(x, 0, z); deck.group.add(o); SFX.play('clank', x, z, .6, 1.5);
  deck.zones.push({ upd(dt) { t += dt; o.children[o.children.length - 1].visible = t < .9 ? Math.sin(t * 30) > 0 : Math.sin(t * 6) > -.6;
    let go = t > 14; if (t > .9) for (const v of fighters) if (!v.busy && !v.air && (v !== owner || t > 3) && dist2(v.x, v.z, x, z) < (1.1 + v.r) * (1.1 + v.r)) go = true;
    if (go) { deck.group.remove(o); for (const m of o.children) m.geometry.dispose(); blast(owner, x, z, 2.5, { dmg: 13, bkb: 8.5, kbg: 9.5, col: [7, 1.5, .6] }, 0, true); return false; } return true; } });
}
// ---- items
const ITEMS = {
  med: { name: 'MED-CELL', w: 3, c: [.6, 5, 1.2], build: k => { k.cyl('steel', 0, 0, 0, .13, .42, 8).cyl('gGreen', 0, .06, 0, .135, .3, 8).box('gGreen', 0, .55, 0, .26, .08, .08).box('gGreen', 0, .55, 0, .08, .26, .08); }, pick: f => { f.pct = Math.max(0, f.pct - 30); FX.burst(f.x, 1, f.z, 16, .6, 5, 1.6, 2.2, .8, .13); SFX.play('heal', f.x, f.z, 1); } },
  core: { name: 'OVERCHARGE', w: 2, c: [6, 2.6, .7], build: k => { k.geo(G.oct, 'gWarm', 0, .3, 0, .2, .32, .2).ring('brass', 0, .3, 0, .3, false, HPI, 0, 0, .02).ring('brass', 0, .3, 0, .3, false, 0, 0, 0, .02); }, pick: f => { f.over = 9; SFX.play('relic', f.x, f.z, 1, .8); FX.burst(f.x, 1, f.z, 20, 6, 2.6, .7, 4, .7, .13); } },
  aegis: { name: 'AEGIS', w: 2, c: [1.2, 3, 6.5], build: k => { k.geo(G.hemi, 'steel', 0, .1, 0, .3, .12, .3).sph('gCold', 0, .26, 0, .12).ring('gCold', 0, .12, 0, .36, false, HPI, 0, 0, .02); }, pick: f => { f.aegis = 6; f.sh = 100; SFX.play('unseal', f.x, f.z, .8, 1.4); FX.burst(f.x, 1, f.z, 20, 1.2, 3, 6.5, 4, .7, .13); } },
  tether: { name: 'RESCUE TETHER', w: 1.5, c: [.5, 4, 5], build: k => { k.sph('steel', 0, .3, 0, .16, .13, .18).ring('gCyan', 0, .3, 0, .28, false, HPI, 0, 0, .02).box('gCyan', 0, .3, .17, .08, .04, .04); }, pick: f => { f.tether = true; SFX.play('key', f.x, f.z, 1, 1.2); } },
  nade: { name: 'PLASMA GRENADE', w: 2.5, c: [6, 1.4, .5], build: k => { k.sph('iron', 0, .22, 0, .2).ring('gRed', 0, .22, 0, .205, false, HPI, 0, 0, .02).cyl('steel', 0, .4, 0, .05, .08, 6); },
    pick: f => { f.item = { id: 'nade', use: g => { g.item = null; const o = g.foe, dd = o ? clamp(Math.hypot(o.x - g.x, o.z - g.z), 3, 9) : 6, T = .62; shoot(g, { speed: dd / T, grav: 22, vy: 22 * T / 2 - 1.4 / T, r: .22, life: 3, dmg: 3, bkb: 2, kbg: 1, col: [7, 1.5, .6], onLand: s => blast(g, s.x, s.z, 2.5, { dmg: 13, bkb: 8.5, kbg: 9.5, col: [7, 1.5, .6] }, 0, true) }); g.lag(.28); SFX.play('lob', g.x, g.z, .9, 1); } }; SFX.play('pickup', f.x, f.z, 1); } },
  mine: { name: 'PROXIMITY MINE', w: 1.5, c: [6, .5, .3], build: k => { k.cyl('iron', 0, .05, 0, .3, .1, 8).cyl('hazard', 0, .15, 0, .22, .04, 8).sph('gRed', 0, .22, 0, .07); }, pick: f => { f.item = { id: 'mine', use: g => { g.item = null; mine(g, g.x, g.z); g.lag(.3); } }; SFX.play('pickup', f.x, f.z, 1); } }
};
class Item {
  constructor(id, x, z) {
    this.id = id; this.def = ITEMS[id]; this.x = x; this.z = z; this.y = 9; this.t = 0; this.dead = false;
    this.obj = partObj(buildPart(this.def.build)); for (const m of this.obj.children) m.castShadow = false; this.obj.scale.setScalar(1.25); scene.add(this.obj); const c = this.def.c; Tele.circle(x, z, .8, .9, c[0] * .4, c[1] * .4, c[2] * .4); SFX.play('blink', x, z, .5, 1.6);
  }
  update(dt) {
    this.t += dt; const c = this.def.c, t = this.t;
    if (this.y > .35) { this.y = Math.max(.35, this.y - 11 * dt); Arcs.line(this.x, this.y, this.z, this.x, this.y + 3, this.z, c[0] * .12, c[1] * .12, c[2] * .12); if (this.y <= .35) { FX.puff(this.x, .1, this.z, 5, .2, 2, .6, .4); SFX.play('clank', this.x, this.z, .4, 1.8); } }
    this.obj.position.set(this.x, this.y + Math.sin(t * 3) * .08, this.z); this.obj.rotation.y = t * 1.6; this.obj.visible = t < 13 || Math.sin(t * 22) > 0;
    if (R() < dt * 5) FX.add.spawn(this.x + RS(.3), this.y + R(0, .6), this.z + RS(.3), 0, R(.4, 1), 0, .6, .06, c[0] * .5, c[1] * .5, c[2] * .5, 0, 0);
    if (this.y <= .4) for (const f of fighters) { if (f.busy || f.air || f.state === 'hurt' || f.state === 'held' || (f.item && this.def.pick.length && ITEMS[this.id].w && (this.id === 'nade' || this.id === 'mine'))) continue; if (dist2(f.x, f.z, this.x, this.z) < (f.r + .65) * (f.r + .65)) { this.def.pick(f); if (window.Duel) Duel.note(f, this.def.name); this.dead = true; break; } }
    if (t > 16) this.dead = true;
    if (this.dead) this.dispose();
  }
  dispose() { scene.remove(this.obj); for (const m of this.obj.children) m.geometry.dispose(); }
}
const Stage = {
  itemT: 9,
  reset() { this.itemT = R(7, 11); },
  update(dt) {
    const d = deck; updateShots(dt);
    for (let i = d.zones.length - 1; i >= 0; i--) if (!d.zones[i].upd(dt)) { d.zones[i] = d.zones[d.zones.length - 1]; d.zones.pop(); }
    for (let i = d.items.length - 1; i >= 0; i--) { const it = d.items[i]; it.update(dt); if (it.dead) { d.items[i] = d.items[d.items.length - 1]; d.items.pop(); } }
    for (const h of d.hazards) h.upd(dt);
    for (const a of d.anim) a.fn(dt, uTime.value);
    this.itemT -= dt;
    if (this.itemT <= 0 && d.items.length < 2) {
      this.itemT = R(11, 17);
      for (let t = 0; t < 30; t++) { const i = d.cells[(R() * d.cells.length) | 0]; if (d.blocked[i]) continue; const x = cellC(i % d.W), z = cellC((i / d.W) | 0); if (edgeAhead(x, z, 1, 0, 3) < 2 || edgeAhead(x, z, -1, 0, 3) < 2 || edgeAhead(x, z, 0, 1, 3) < 2 || edgeAhead(x, z, 0, -1, 3) < 2) continue; let near = false; for (const f of fighters) if (dist2(f.x, f.z, x, z) < 6) near = true; if (near) continue; const ks = Object.keys(ITEMS); d.items.push(new Item(rnd.weighted(ks.map(k => [k, ITEMS[k].w])), x, z)); break; }
    }
  }
};
// ---- deck hazards: built into the arena from depth 3 on. Each telegraphs on the floor before it bites.
function stageDress(d, rng, k) {
  if (d.depth < 3) return; const W = d.W, th = d.theme, kinds = th.hazards || ['vent'], n = Math.min(3, 1 + Math.floor((d.depth - 3) / 4));
  for (let q = 0; q < n; q++) {
    const kind = rng.pick(kinds.filter(h => h === 'vent' || h === 'arc' || h === 'laser')) || 'vent';
    if (kind === 'vent') { for (let t = 0; t < 30; t++) { const i = rng.pick(D.inner.cells); if (d.keep[i] || d.occ[i]) continue; d.occ[i] = 1; const x = cellC(i % W), z = cellC((i / W) | 0); k.at(x, 0, z, 0).cyl('iron', 0, 0, 0, .8, .05, 8).cyl('grate', 0, .05, 0, .62, .02, 8).ring('hazard', 0, .06, 0, .72, false, HPI, 0, 0, .05); d.hazSpecs.push({ kind, x, z, ph: rng.range(0, 5) }); break; } }
    else {
      // a pair of pylons across the floor; lightning (or a cutting beam) runs between them on a cycle
      for (let t = 0; t < 40; t++) { const a = rng.pick(d.cells), b = rng.pick(d.cells), ax = cellC(a % W), az = cellC((a / W) | 0), bx = cellC(b % W), bz = cellC((b / W) | 0), dd = Math.hypot(ax - bx, az - bz); if (dd < 8 || dd > 20 || d.keep[a] || d.keep[b] || d.occ[a] || d.occ[b] || !D.block(a % W, (a / W) | 0)) continue; if (!D.block(b % W, (b / W) | 0)) { d.occ[a] = 0; d.blocked[a] = 0; continue; }
        for (const [x, z] of [[ax, az], [bx, bz]]) { k.at(x, 0, z, 0).cyl('iron', 0, 0, 0, .34, .2, 8).cyl('steel', 0, .2, 0, .14, 1.3, 6).ring('brass', 0, .8, 0, .2, true, HPI, 0, 0, .04).sph(kind === 'laser' ? 'gRed' : 'gCold', 0, 1.62, 0, .16); B.obst(x, z, .4); }
        d.hazSpecs.push({ kind, x: ax, z: az, x2: bx, z2: bz, ph: rng.range(0, 5) }); break; }
    }
  }
}
function makeHazards(d) {
  for (const s of d.hazSpecs) {
    let t = s.ph, warned = false;
    if (s.kind === 'vent') { const f = d.theme.flame; d.hazards.push({ upd(dt) { t += dt; const c = t % 7.5;
      if (c > 5.4 && !warned) { warned = true; Tele.circle(s.x, s.z, 1.45, 1.1, 3, .8, .2); SFX.play('fuse', s.x, s.z, .5, 1); }
      if (c > 6.5) { if (warned) { warned = false; SFX.play('vent', s.x, s.z, .9, 1); Lights.flash(s.x, 1.5, s.z, f[0] / 6, f[1] / 6, f[2] / 6, 26, .7, 9); hitAround(null, s.x, s.z, 1.45, { dmg: 9, bkb: 8, kbg: 5.5, pop: 10, col: f }, true); }
        for (let i = 0; i < 4; i++) FX.add.spawn(s.x + RS(.5), R(.1, .5), s.z + RS(.5), RS(.8), R(6, 13), RS(.8), R(.25, .5), R(.14, .26), f[0], f[1], f[2], 0, .5); } } }); }
    else { const las = s.kind === 'laser', c = las ? [7, .8, .4] : [1.2, 3, 6.5], hit = { dmg: las ? 10 : 7, bkb: las ? 7.5 : 6, kbg: las ? 6 : 4, col: c }, cm = Math.max(c[0], c[1], c[2]), cn = [c[0] / cm, c[1] / cm, c[2] / cm]; let acc = 0;
      d.hazards.push({ upd(dt) { t += dt; const cy = t % 8.5;
        if (cy > 6.2 && !warned) { warned = true; Tele.strip(s.x, s.z, s.x2, s.z2, .07, 1, cn[0] * 1.3, cn[1] * 1.3, cn[2] * 1.3); SFX.play('charge', (s.x + s.x2) / 2, (s.z + s.z2) / 2, .5, 1.3); }
        if (cy > 7.2) { if (warned) { warned = false; SFX.play(las ? 'laser' : 'zap', (s.x + s.x2) / 2, (s.z + s.z2) / 2, .8, 1); }
          const fk = las ? 1.5 : .9 + .5 * R(); Arcs.line(s.x, 1.6, s.z, s.x2, 1.6, s.z2, cn[0] * fk, cn[1] * fk, cn[2] * fk);          // one thin line, pylon to pylon, kept under the bloom threshold so it stays thin
          acc -= dt; if (acc <= 0) { acc = .3; const ex = s.x2 - s.x, ez = s.z2 - s.z, l2 = ex * ex + ez * ez; for (const v of fighters) { if (v.busy || v.y > 2.3 || v.y < -.5) continue; const u = sat(((v.x - s.x) * ex + (v.z - s.z) * ez) / l2), px = s.x + ex * u, pz = s.z + ez * u, dd = Math.hypot(v.x - px, v.z - pz); if (dd < .2 + v.r) { const hx = dd > .05 ? (v.x - px) / dd : 0, hz = dd > .05 ? (v.z - pz) / dd : 1; if (v.takeHit(null, Object.assign({ proj: true }, hit), hx, hz) === 1) hitFx(v, hx, hz, v.kb || 3, c, hit.dmg); } } } } } }); }
  }
}
