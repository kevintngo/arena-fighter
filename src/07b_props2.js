// =====================================================================================
//  SECOND PROP SET: crypt, hall of mirrors, library of ash, turbine nacelle, menagerie, clockworks
// =====================================================================================
TEX_JOBS.splice(TEX_JOBS.length - 1, 0, () => texSet('wood', 512, 4, (u, v, o) => {
  const row = Math.floor(v * 8), pv = fr(v * 8), off = hash2i(row, 3, 301) * 2, px = u * 2 + off, plank = Math.floor(px), pu = fr(px), id = hash2i(wrapi(plank, 2), row, 303);
  const seam = sstep(0, .06, Math.min(pv, 1 - pv)) * sstep(0, .012, Math.min(pu, 1 - pu)), grain = fbmT(u, v, 3, 48, 4, 305 + row), knot = sstep(.75, .9, fbmT(u, v, 6, 12, 3, 307));
  const nail = 1 - sstep(.02, .035, Math.hypot((Math.min(pu, 1 - pu)) * 2 - .1, (pv - .5) * .25));
  o.h = seam * .5 + grain * .22 - knot * .1 + nail * .15; const c = .3 + id * .14 + (grain - .5) * .16 - knot * .1 - (1 - seam) * .16;
  o.r = c * 1.22; o.g = c * .82; o.b = c * .5; o.ro = .62 + grain * .2 - nail * .2; o.me = nail * .6; o.ao = .7 + seam * .3;
}));
function initMaterials2() {
  regMat('wood', std(TEX.wood), 2);
  regMat('mirror', std(TEX.steel, { color: new Color(.5, .56, .72), roughness: .14, metalness: 1.35, envMapIntensity: 2.4 }), 2);
  regMat('fluid', new MeshStandardMaterial(Object.assign({ color: new Color(.25, .9, .45), emissive: new Color(.05, .35, .12), opacity: .34, roughness: .1, metalness: 0, vertexColors: true }, SOFT_BLEND)), 2, false, false, 4);
}
// rotating machinery helpers (dynamic objects owned by the deck)
function gearParts(r, teeth, thick = .22, mat = 'trim') {
  return B.own(buildPart(k => {
    k.cyl(mat, 0, -thick / 2, 0, r * .94, thick, 16).cyl('iron', 0, -thick / 2 - .03, 0, r * .28, thick + .06, 8).ring('iron', 0, 0, 0, r * .7, true, HPI, 0, 0, thick * .3);
    for (let i = 0; i < teeth; i++) { const a = i / teeth * TAU; k.box(mat, Math.cos(a) * r, 0, Math.sin(a) * r, r * .2, thick, TAU * r / teeth * .5, 0, -a, 0); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; k.box('iron', Math.cos(a) * r * .5, thick / 2 + .01, Math.sin(a) * r * .5, r * .7, .03, .12, 0, -a, 0); }
  }));
}
function makeGear(x, y, z, r, teeth, axis, speed, mat) {     // axis: 0 = flat (spins about Y), 1 = faces +z (wall), 2 = faces +x (wall)
  const g = new Group(), o = partObj(gearParts(r, teeth, .22, mat)); g.position.set(x, y, z); if (axis === 1) g.rotation.x = HPI; else if (axis === 2) g.rotation.z = -HPI; g.add(o);
  B.dyn(g, (dt, t) => { o.rotation.y = t * speed; }); return g;
}
P.sarcophagus = (k, x, z, rot, open) => {
  const r = B.rng, a = B.theme.accent; k.at(x, 0, z, rot);
  k.boxB('stone', 0, 0, 0, 1.15, .18, 2.2).boxB('stone', 0, .18, 0, .96, .6, 2).boxB('trim', -.48, .18, .98, .1, .62, .1).boxB('trim', .48, .18, .98, .1, .62, .1).boxB('trim', -.48, .18, -.98, .1, .62, .1).boxB('trim', .48, .18, -.98, .1, .62, .1).box('relief', 0, .48, 1.01, .5, .5, .03);
  if (!open) { k.boxB('stone', 0, .78, 0, 1.06, .15, 2.1).sph('stone', 0, 1, .62, .17, .1, .2).box('stone', 0, .98, -.1, .46, .1, 1.1).bar('steel', 0, 1.05, -.62, 0, 1.05, .4, .06, .02).box('trim', 0, 1.06, .28, .26, .03, .05); }
  else { k.box('stone', .78, .46, .1, 1.06, .15, 2.1, 0, .25, .95).sph('bone', 0, .72, .55, .13).beam('bone', 0, .68, .3, 0, .68, -.6, .04, 5); for (let i = 0; i < 3; i++) k.geo(G.torus, 'bone', 0, .7, .15 - i * .16, .16, .16, .9, 0, HPI, 0); k.box('gAccentDim', 0, .5, 0, .7, .02, 1.6); const w = k.wp(0, 1.1, 0); B.light(w[0], w[1], w[2], a[0], a[1], a[2], 5, 6, .3); B.emit('mote', w[0], .8, w[2], 3, a[0] * 4, a[1] * 4, a[2] * 4); }
  for (const dz of [-.55, .55]) { const o = k.wp(0, 0, dz); B.obst(o[0], o[2], .62); }
};
P.candles = (k, x, z, n = 7, big = false) => {
  const r = B.rng, f = B.flameCol(); k.at(x, 0, z, r.range(0, TAU));
  if (big) k.cyl('trim', 0, 0, 0, .5, .08, 10).cyl('trim', 0, .08, 0, .12, .5, 6).cyl('trim', 0, .58, 0, .42, .05, 10);
  for (let i = 0; i < n; i++) { const a = r.range(0, TAU), d = r.range(0, big ? .36 : .55), h = r.range(.12, .42), y = big ? .63 : 0; k.cyl('bone', Math.cos(a) * d, y, Math.sin(a) * d, .04, h, 5).flame(Math.cos(a) * d, y + h, Math.sin(a) * d, .11, .22, f[0], f[1], f[2]); }
  B.light(x, big ? 1.4 : .8, z, f[0] / 5, f[1] / 5, f[2] / 5, big ? 9 : 6.5, 7, .3); B.emit('ember', x, big ? 1.2 : .5, z, 2, f[0], f[1], f[2]); B.pool(x, z, 4.5, f[0] * .04, f[1] * .04, f[2] * .04); B.obst(x, z, big ? .45 : .5);
};
P.urn = (k, x, z) => { const s = B.rng.range(.8, 1.3); k.at(x, 0, z, 0, s); k.cyl('bronze', 0, 0, 0, .2, .08, 8).cyl('bronze', 0, .08, 0, .34, .5, 10, 0, 0, 1.25).cyl('bronze', 0, .58, 0, .42, .3, 10, 0, 0, .5).cyl('trim', 0, .88, 0, .22, .1, 8).sph('trim', 0, 1.02, 0, .08); B.obst(x, z, .4 * s); };
P.boneNiche = (k, s) => {
  k.at(s.x, 0, s.z, s.rot); k.tint(.2).box('stone', 0, 1.6, .03, 1.5, 1.5, .06).tint(1).box('trim', 0, 2.38, .06, 1.6, .08, .1).box('trim', 0, .82, .06, 1.6, .08, .1).box('stone', 0, 1.6, .08, 1.5, .06, .14);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) k.sph('bone', -.54 + i * .36, 1.02 + j * .76, .12, .13, .13, .12).sph('black', -.58 + i * .36, 1.05 + j * .76, .22, .03).sph('black', -.5 + i * .36, 1.05 + j * .76, .22, .03);
  k.cyl('bone', .6, 1.63, .14, .03, .16, 5).sph('gAccentDim', .6, 1.84, .14, .04);
};
P.mirrorPane = (k, s) => {
  k.at(s.x, 0, s.z, s.rot); const h = Math.min(s.h - .5, 3.6);
  k.box('mirror', 0, h / 2 + .2, .06, 1.3, h, .05).box('trim', -.7, h / 2 + .2, .08, .1, h + .2, .12).box('trim', .7, h / 2 + .2, .08, .1, h + .2, .12).box('trim', 0, .14, .08, 1.5, .1, .12).box('trim', 0, h + .28, .08, 1.5, .12, .12).geo(G.cone4, 'trim', 0, h + .34, .08, .3, .34, .05, 0, PI / 4, 0).sph('trim', 0, h + .72, .08, .06);
};
P.standMirror = (k, x, z, rot) => { k.at(x, 0, z, rot); k.box('mirror', 0, 1.3, 0, 1.15, 2.1, .05, -.1).box('trim', -.62, 1.3, 0, .09, 2.3, .1, -.1).box('trim', .62, 1.3, 0, .09, 2.3, .1, -.1).box('trim', 0, 2.42, -.11, 1.33, .1, .1).box('trim', 0, .2, .1, 1.33, .1, .1).beam('trim', -.6, .2, .1, -.6, 0, -.5, .04, 5).beam('trim', .6, .2, .1, .6, 0, -.5, .04, 5); B.obst(x, z, .6); };
P.candelabra = (k, x, z) => {
  const f = B.flameCol(); k.at(x, 0, z, B.rng.range(0, TAU)); k.cyl('trim', 0, 0, 0, .3, .1, 8, 0, 0, .5).beam('trim', 0, .1, 0, 0, 1.75, 0, .035, 6).ring('trim', 0, .9, 0, .06, true, HPI, 0, 0, .03);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, px = Math.cos(a) * .32, pz = Math.sin(a) * .32; k.beam('trim', 0, 1.5, 0, px, 1.72, pz, .02, 4).cyl('trim', px, 1.72, pz, .05, .04, 6).cyl('bone', px, 1.76, pz, .028, .14, 5).flame(px, 1.9, pz, .11, .22, f[0], f[1], f[2]); }
  k.cyl('bone', 0, 1.75, 0, .028, .2, 5).flame(0, 1.95, 0, .12, .24, f[0], f[1], f[2]);
  B.light(x, 2.2, z, f[0] / 5, f[1] / 5, f[2] / 5, 11, 9, .22); B.emit('ember', x, 2, z, 2, f[0], f[1], f[2]); B.pool(x, z, 5, f[0] * .04, f[1] * .04, f[2] * .04); B.obst(x, z, .3);
};
P.shards = (k, x, z) => { const r = B.rng; k.at(x, 0, z, 0); for (let i = 0; i < 9; i++) k.geo(G.tet, i % 2 ? 'mirror' : 'glass', r.range(-.8, .8), .05, r.range(-.8, .8), r.range(.08, .22), .03, r.range(.08, .22), 0, r.range(0, 3), 0); };
const BOOK_COLS = [[.5, .12, .1], [.14, .2, .42], [.16, .34, .2], [.42, .3, .12], [.3, .14, .34], [.5, .44, .3], [.18, .18, .2]];
function bookRow(k, x0, x1, y, z, dep) { const r = B.rng; let x = x0; while (x < x1 - .08) { if (r.chance(.16)) { x += r.range(.08, .3); continue; } const w = r.range(.05, .11), h = r.range(.24, .34), c = r.pick(BOOK_COLS), lean = r.chance(.12) ? r.range(-.4, .4) : 0; k.tint(c[0], c[1], c[2]).box('cloth', x + w / 2, y + h / 2, z, w, h, dep, 0, 0, lean); x += w + .012; } k.tint(1); }
P.bookshelf = (k, s) => {
  k.at(s.x, 0, s.z, s.rot); const h = Math.min(s.h - .2, 3.1), rows = Math.floor((h - .2) / .44);
  k.boxB('wood', -.94, 0, .26, .08, h, .5).boxB('wood', .94, 0, .26, .08, h, .5).box('wood', 0, h, .26, 1.96, .08, .54).tint(.5).box('wood', 0, h / 2, .03, 1.88, h, .04).tint(1).box('trim', 0, h + .08, .5, 1.2, .06, .04);
  for (let i = 0; i <= rows; i++) { const y = .1 + i * .44; k.box('wood', 0, y, .26, 1.84, .05, .48); if (i < rows) bookRow(k, -.86, .86, y + .03, .3, .32); }
  const o = k.wp(0, 0, .3); B.obst(o[0], o[2], .5);
};
P.freeShelf = (k, x, z, rot) => {
  k.at(x, 0, z, rot); const h = 2.6;
  k.boxB('wood', -.9, 0, 0, .08, h, .8).boxB('wood', .9, 0, 0, .08, h, .8).box('wood', 0, h, 0, 1.9, .08, .84).tint(.5).box('wood', 0, h / 2, 0, 1.76, h, .04).tint(1);
  for (let i = 0; i <= 5; i++) { const y = .1 + i * .46; k.box('wood', 0, y, 0, 1.76, .05, .78); if (i < 5) { bookRow(k, -.84, .84, y + .03, .22, .3); bookRow(k, -.84, .84, y + .03, -.22, .3); } }
  for (const dx of [-.5, .5]) { const o = k.wp(dx, 0, 0); B.obst(o[0], o[2], .56); }
};
P.desk = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.box('wood', 0, .8, 0, 1.5, .07, .8); for (const sx of [-.66, .66]) for (const sz of [-.32, .32]) k.boxB('wood', sx, 0, sz, .08, .78, .08);
  k.tint(.85, .8, .68).box('bone', -.14, .86, .05, .3, .02, .4, 0, 0, .08).box('bone', .16, .86, .05, .3, .02, .4, 0, 0, -.08).tint(1).beam('trim', .56, .84, -.22, .56, 1.3, -.22, .02, 5).geo(G.cone8, 'trim', .56, 1.28, -.22, .14, .14, .14).sph('gDim', .56, 1.3, -.22, .06).boxB('wood', 0, 0, .9, .5, .46, .5).box('wood', 0, .8, 1.13, .5, .7, .06);
  const w = k.wp(.56, 1.3, -.22); B.light(w[0], w[1], w[2], 1, .7, .35, 5, 5.5, .2); B.obst(x, z, .78);
};
P.bookPile = (k, x, z, burning) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU));
  for (let i = 0; i < 11; i++) { const c = r.pick(BOOK_COLS), d = r.range(0, .5), a = r.range(0, TAU); k.tint(c[0] * (burning ? .4 : 1), c[1] * (burning ? .4 : 1), c[2] * (burning ? .4 : 1)).box('cloth', Math.cos(a) * d, .05 + i * .035, Math.sin(a) * d, .3, .07, .4, r.range(-.3, .3), r.range(0, 3), r.range(-.3, .3)); }
  k.tint(1);
  if (burning) { k.flame(0, .3, 0, .7, 1, 6, 2.4, .5).sph('gWarm', 0, .32, 0, .3, .05, .3); B.light(x, 1, z, 1, .5, .16, 12, 9, .35); B.emit('ember', x, .7, z, 9, 6, 2.2, .4); B.emit('steam', x, 1.2, z, 1.6, .05, .045, .04); B.haze(x, 1.1, z, .6, .8); B.pool(x, z, 5.5, .05, .025, .008); }
  B.obst(x, z, .52);
};
P.ladder = (k, s) => { k.at(s.x, 0, s.z, s.rot); const x = B.rng.range(-.5, .5); k.beam('wood', x - .24, 0, .95, x - .24, 2.7, .12, .035, 5).beam('wood', x + .24, 0, .95, x + .24, 2.7, .12, .035, 5); for (let i = 1; i < 8; i++) { const t = i / 8.5; k.beam('wood', x - .24, 2.7 * t, .95 - .83 * t, x + .24, 2.7 * t, .95 - .83 * t, .025, 4); } };
P.turbine = (k, x, z, rot) => {
  k.at(x, 0, z, rot);
  k.boxB('iron', 0, 0, 0, 2.6, .4, 1.5).boxB('steel', -1.25, .4, 0, .3, 1.5, 1).boxB('steel', 1.25, .4, 0, .3, 1.5, 1).ring('steel', 0, 2, 0, 1.5, true, 0, 0, 0, .34).ring('trim', 0, 2, .19, 1.52, false, 0, 0, 0, .05).ring('trim', 0, 2, -.19, 1.52, false, 0, 0, 0, .05).box('hazard', 0, .42, .76, 2.4, .04, .04);
  k.tint(.3, .7, 1).geo(G.disc, 'pool', 0, 2, -.06, 1.3, 1, 1.3, HPI).tint(1).sph('gCold', 0, 2, 0, .22).cyl('steel', 0, 2, -.3, .28, .6, 10, HPI);
  const g = new Group(); k.wp(0, 2, .05); g.position.set(_wp[0], _wp[1], _wp[2]); g.rotation.y = rot;
  const fan = partObj(B.own(buildPart(q => { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; q.box('steel', Math.cos(a) * .72, Math.sin(a) * .72, 0, 1.15, .3, .04, 0, .5, a); } q.ring('trim', 0, 0, 0, 1.3, false, 0, 0, 0, .03); }))); g.add(fan);
  B.dyn(g, (dt, t) => { fan.rotation.z = t * 5.5; });
  B.light(x, 2.2, z, .4, .7, 1, 22, 13, .2); B.haze(x, 2.6, z, 1.2, .7); B.emit('mote', x, 2, z, 6, 1.4, 3.2, 6); B.pool(x, z, 8, .02, .04, .09);
  for (const dx of [-1, 0, 1]) { const o = k.wp(dx, 0, 0); B.obst(o[0], o[2], .82); }
};
P.pylon = (k, x, z) => {
  k.at(x, 0, z, 0); k.cyl('iron', 0, 0, 0, .46, .3, 8).cyl('trim', 0, .3, 0, .3, .08, 8).cyl('gCold', 0, .38, 0, .1, 1.7, 6).cyl('glass', 0, .38, 0, .22, 1.7, 8).cyl('iron', 0, 2.08, 0, .34, .2, 8).geo(G.oct, 'gCold', 0, 2.55, 0, .1, .18, .1);
  for (let i = 0; i < 3; i++) k.ring('trim', 0, .7 + i * .5, 0, .25, true, HPI, 0, 0, .03);
  B.light(x, 1.4, z, .4, .7, 1, 8, 8, .35); B.emit('spark', x, 2.5, z, 1, 2.5, 5, 9); B.obst(x, z, .5);
};
P.windVent = (k, s) => { k.at(s.x, 0, s.z, s.rot); k.box('iron', 0, 1.5, .06, 1.6, 1.3, .1); for (let i = 0; i < 6; i++) k.box('steel', 0, 1 + i * .2, .13, 1.4, .05, .12, .5); k.box('gAccentDim', 0, 2.24, .1, 1.2, .05, .03); const w = k.wp(0, 1.5, .5); B.emit('steam', w[0], w[1], w[2], 2.2, .14, .18, .24); B.haze(w[0], w[1], w[2], .7, .6); };
P.bioTank = (k, x, z, broken) => {
  const r = B.rng, a = B.theme.accent; k.at(x, 0, z, r.range(0, TAU));
  k.cyl('steel', 0, 0, 0, .74, .36, 12).cyl('trim', 0, .36, 0, .62, .06, 12).cyl('gAccentDim', 0, .42, 0, .5, .02, 12).cyl('steel', 0, 2.72, 0, .7, .3, 12).cyl('iron', 0, 3.02, 0, .3, .2, 8).beam('rubber', .3, 3.1, 0, .9, 3.3, .4, .05, 5).beam('rubber', -.3, 3.1, 0, -.8, 3.4, -.3, .05, 5);
  if (!broken) {
    k.cyl('fluid', 0, .44, 0, .52, 2.24, 12).cyl('glass', 0, .42, 0, .58, 2.3, 12);
    const kind = r.int(0, 2); k.tint(.16, .2, .16);
    if (kind === 0) k.sph('ooze', 0, 1.5, 0, .3, .42, .26).sph('ooze', 0, 2.02, .05, .2).beam('ooze', -.2, 1.5, 0, -.42, .9, .1, .05, 4).beam('ooze', .2, 1.5, 0, .4, 1, -.1, .05, 4).beam('ooze', 0, 1.2, 0, .1, .7, 0, .06, 4);
    else if (kind === 1) { k.tint(.5, .5, .42); for (let i = 0; i < 5; i++) k.geo(G.torus, 'bone', 0, 1 + i * .2, 0, .2 - i * .015, .2, .8, HPI, 0, 0); k.sph('bone', 0, 2.1, .05, .16); }
    else k.sph('ooze', 0, 1.6, 0, .34).beam('ooze', 0, 1.4, 0, .3, .8, .2, .04, 4).beam('ooze', 0, 1.4, 0, -.3, .7, -.1, .04, 4).beam('ooze', 0, 1.4, 0, 0, .7, -.3, .04, 4).sph('gAccentDim', .12, 1.7, .28, .05).sph('gAccentDim', -.12, 1.7, .28, .05);
    k.tint(1); B.light(x, 1.6, z, a[0], a[1], a[2], 6, 7, .15);
  } else {
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; k.geo(G.tet, 'glass', Math.cos(an) * .55, .5 + r.range(0, .5), Math.sin(an) * .55, .14, r.range(.2, .6), .05, 0, -an, r.range(-.3, .3)); }
    for (let i = 0; i < 6; i++) k.geo(G.tet, 'glass', r.range(-1.2, 1.2), .04, r.range(-1.2, 1.2), .14, .03, .14, 0, r.range(0, 3), 0);
    k.tint(a[0] * .35, a[1] * .35, a[2] * .35).geo(G.disc, 'pool', r.range(-.4, .4), .035, r.range(-.4, .4), 1.7, 1, 1.7).tint(1); B.light(x, .8, z, a[0], a[1], a[2], 3, 5, .4); B.emit('drip', x + .3, 2.7, z, 1, a[0] * 2, a[1] * 2, a[2] * 2);
  }
  B.obst(x, z, .76);
};
P.beastBones = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.beam('bone', -1.8, .9, 0, 1.5, 1.2, 0, .1, 6);
  for (let i = 0; i < 6; i++) { const px = -1.3 + i * .5, s = .75 - Math.abs(i - 2.5) * .08; k.geo(G.arc, 'bone', px, .15, 0, s, s * 1.2, 1.4, 0, HPI, 0).geo(G.arc, 'bone', px, .15, 0, s, s * 1.2, 1.4, 0, -HPI, 0); }
  k.sph('bone', 2, 1.15, 0, .5, .38, .42).box('bone', 2.5, .95, 0, .7, .1, .5).geo(G.cone5, 'bone', 1.9, 1.4, .3, .1, .7, .1, -.6, 0, -.5).geo(G.cone5, 'bone', 1.9, 1.4, -.3, .1, .7, .1, .6, 0, -.5).sph('black', 2.25, 1.25, .3, .09).sph('black', 2.25, 1.25, -.3, .09);
  for (let i = 0; i < 7; i++) k.geo(G.cone4, 'bone', 2.3 + i * .08, .88, .22 * (i % 2 ? 1 : -1), .03, .16, .03, PI);
  k.beam('bone', -1, .9, .1, -1.3, 0, .9, .08, 5).beam('bone', -1, .9, -.1, -1.4, 0, -.8, .08, 5).beam('bone', 1, 1.1, .1, 1.2, 0, 1, .08, 5).beam('bone', 1, 1.1, -.1, 1.3, 0, -.9, .08, 5).beam('bone', -1.8, .9, 0, -2.9, .2, .3, .06, 5, .3);
  for (const dx of [-1.2, 0, 1.4]) { const o = k.wp(dx, 0, 0); B.obst(o[0], o[2], .78); }
};
P.specimenTable = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.boxB('steel', 0, 0, 0, .5, .78, .9).box('steel', 0, .82, 0, 1.9, .08, 1).box('trim', 0, .87, 0, 1.94, .02, 1.04).sph('bone', .6, .98, 0, .13).beam('bone', .45, .92, 0, -.5, .92, 0, .035, 5);
  for (let i = 0; i < 4; i++) k.geo(G.torus, 'bone', .25 - i * .14, .96, 0, .15, .15, .9, 0, HPI, 0);
  k.beam('iron', -.9, .86, -.4, -.9, 2.2, -.4, .03, 5).beam('iron', -.9, 2.2, -.4, -.2, 2, 0, .025, 5).geo(G.cone8, 'steel', -.2, 1.8, 0, .2, .22, .2).sph('gAccentDim', -.2, 1.82, 0, .08).box('steel', -.7, .88, .3, .3, .02, .2).beam('steel', -.8, .9, .26, -.62, .9, .34, .012, 4);
  const a = B.theme.accent, w = k.wp(-.2, 1.8, 0); B.light(w[0], w[1], w[2], a[0] * .6 + .4, a[1] * .6 + .4, a[2] * .6 + .4, 6, 6, .25); B.obst(x, z, .85);
};
P.gearWorks = (k, x, z) => {       // a meshing pair of great gears turning on the floor
  k.at(x, 0, z, 0).cyl('iron', 0, 0, 0, .5, .5, 8).cyl('iron', 1.9, 0, 1.2, .3, .9, 8).cyl('trim', 0, .5, 0, .2, .3, 8);
  makeGear(x, .62, z, 1.75, 18, 0, .35, 'trim'); makeGear(x + 1.9, .94, z + 1.2, .78, 8, 0, -.79, 'steel'); makeGear(x - .2, 1, z - .1, .5, 8, 0, .9, 'steel');
  B.light(x, 1.6, z, 1, .7, .35, 7, 8, .1); B.emit('steam', x + 1.9, 1.1, z + 1.2, 1, .2, .19, .17); B.obst(x, z, 1.85); B.obst(x + 1.9, z + 1.2, .8);
};
P.wallGears = (k, s) => {
  const r = B.rng, y = r.range(1.5, 2.1), ax = s.rot === 0 ? 1 : 2, n = k.at(s.x, 0, s.z, s.rot), sp = r.range(.4, .9) * r.sign();
  const put = (lx, ly, rad, teeth, spd, mat) => { const w = k.wp(lx, ly, .22); makeGear(w[0], w[1], w[2], rad, teeth, ax, spd, mat); };
  put(-.3, y, .62, 10, sp, 'trim'); put(.52, y + .42, .36, 6, -sp * 1.67, 'steel'); if (r.chance(.6)) put(.35, y - .62, .3, 6, sp * 1.9, 'steel');
  k.box('iron', -.3, y, .08, .2, .2, .16).box('iron', .52, y + .42, .08, .14, .14, .16);
};
P.pendulum = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.boxB('iron', -1, 0, 0, .2, 3.5, .3).boxB('iron', 1, 0, 0, .2, 3.5, .3).box('iron', 0, 3.5, 0, 2.3, .22, .34).box('trim', 0, 3.5, .18, .5, .5, .04).boxB('trim', -1, 0, 0, .3, .2, .4).boxB('trim', 1, 0, 0, .3, .2, .4);
  const g = new Group(); k.wp(0, 3.4, 0); g.position.set(_wp[0], _wp[1], _wp[2]); g.rotation.y = rot;
  const arm = partObj(B.own(buildPart(q => { q.beam('steel', 0, 0, 0, 0, -2.5, 0, .03, 5).cyl('trim', 0, -2.75, -.04, .3, .08, 12, HPI).ring('steel', 0, -2.71, 0, .3, true, 0, 0, 0, .04).sph('trim', 0, 0, 0, .08); }))); g.add(arm);
  const ph = B.rng.range(0, TAU); B.dyn(g, (dt, t) => { arm.rotation.z = Math.sin(t * 1.7 + ph) * .55; });
  for (const dx of [-1, 1]) { const o = k.wp(dx, 0, 0); B.obst(o[0], o[2], .32); }
};
P.steamOrgan = (k, s) => {
  const r = B.rng; k.at(s.x, 0, s.z, s.rot); k.boxB('iron', 0, 0, .2, 1.8, .5, .4).box('trim', 0, .52, .2, 1.84, .05, .44);
  for (let i = 0; i < 6; i++) { const h = 1 + Math.abs(Math.sin(i * 1.3)) * (s.h - 1.9), px = -.75 + i * .3; k.cyl('trim', px, .5, .2, .1, h, 8).cyl('iron', px, .5 + h, .2, .12, .05, 8); }
  k.cyl('gDim', -.5, .3, .41, .08, .02, 8, HPI).cyl('gDim', .5, .3, .41, .08, .02, 8, HPI).ring('gRed', 0, .28, .42, .12, true, 0, 0, 0, .025);
  const w = k.wp(r.range(-.6, .6), s.h - .6, .3); B.emit('steam', w[0], w[1], w[2], 1.6, .22, .2, .18);
};
// bridge railings and guide lights over a chasm
P.bridgeRail = (k, x0, z0, x1, z1) => {
  k.at(0, 0, 0, 0); const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1));
  for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t); k.cyl('iron', x, 0, z, .045, .95, 5); if (i % 2 === 0) k.sph('gAccent', x, 1.02, z, .05); }
  k.beam('trim', x0, .93, z0, x1, .93, z1, .04, 5).beam('iron', x0, .5, z0, x1, .5, z1, .025, 4);
};
