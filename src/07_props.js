// =====================================================================================
//  PROP LIBRARY  (every set piece is modelled in code with the Kit; lights/emitters register via B)
// =====================================================================================
const _wp = [0, 0, 0];
Kit.prototype.wp = function (x, y, z) { _v3.set(x, y, z).applyMatrix4(this.base); _wp[0] = _v3.x; _wp[1] = _v3.y; _wp[2] = _v3.z; return _wp; };
function initPropGeoms() {
  for (let i = 0; i < 6; i++) { const g = new PlaneGeometry(1, 1, 3, 8).translate(0, -.5, 0), uv = g.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setX(v, (i + uv.getX(v) * .96 + .02) / 6); G['banner' + i] = addWhite(g); }
  for (let i = 0; i < 4; i++) { const g = new PlaneGeometry(1, 1), uv = g.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setX(v, (i + uv.getX(v)) / 4); G['screen' + i] = addWhite(g); }
  for (let i = 0; i < 16; i++) {
    const g = new PlaneGeometry(1, 1), uv = g.attributes.uv;
    for (let v = 0; v < uv.count; v++) uv.setXY(v, ((i % 4) + uv.getX(v)) / 4, (3 - Math.floor(i / 4) + uv.getY(v)) / 4);
    G['glyph' + i] = addWhite(g); G['glyphUp' + i] = addWhite(g.clone().rotateX(-HPI));
  }
  G.arc = addWhite(new TorusGeometry(1, .07, 5, 10, HPI));          // quarter arc in XY, from +x to +y
}
// build context for the deck under construction
const B = {
  batch: null, k: null, rng: null, deck: null, theme: null,
  light(x, y, z, r, g, b, i, range = 9, flick = .25) { this.deck.lights.push([x, y, z, r, g, b, i, range, flick]); },
  spot(x, y, z, tx, ty, tz, r, g, b, i, ang = .5) { this.deck.spots.push([x, y, z, tx, ty, tz, r, g, b, i, ang]); },
  emit(type, x, y, z, rate, r, g, b) { this.deck.emits.push([type, x, y, z, rate, r, g, b]); },
  haze(x, y, z, r, s) { this.deck.hazes.push({ x, y, z, r, s }); },
  obst(x, z, r) { const d = this.deck, c = cellOf(z) * d.W + cellOf(x); const o = { x, z, r, on: true }; (d.obst[c] || (d.obst[c] = [])).push(o); return o; },
  pool(x, z, size, r, g, b) { const k = this.k, c = k.col; k.col = [r, g, b]; _m2.copy(k.base); k.base.identity(); k.geo(G.planeUp, 'pool', x, .03, z, size, 1, size); k.base.copy(_m2); k.col = c; },
  flameCol() { return this.theme.flame; }
};
const P = {};
// ---- shared architecture
P.column = (k, x, z, h = 3.2, top = 0) => {
  const s = h / 3.06; k.at(x, 0, z, 0);
  k.boxB('iron', 0, 0, 0, 1, .2, 1).geo(G.column, 'stone', 0, .2, 0, 1, s, 1).ring('trim', 0, .2 + .32 * s, 0, .37, true, HPI, 0, 0, .05).ring('trim', 0, .2 + 2.72 * s, 0, .35, true, HPI, 0, 0, .05);
  k.boxB('trim', 0, .2 + h, 0, 1.08, .14, 1.08);
  if (top === 1) { const f = B.flameCol(); k.geo(G.bowl, 'trim', 0, h + .34, 0, .5, .5, .5).flame(0, h + .5, 0, .6, .9, f[0], f[1], f[2]); const w = k.wp(0, h + 1, 0); B.light(w[0], w[1], w[2], f[0] / 5, f[1] / 5, f[2] / 5, 15, 11); B.emit('ember', w[0], w[1] - .3, w[2], 6, f[0], f[1], f[2]); }
  else if (top === 2) { k.geo(G.oct, 'gAccent', 0, h + .75, 0, .22, .36, .22); const w = k.wp(0, h + .7, 0), a = B.theme.accent; B.light(w[0], w[1], w[2], a[0], a[1], a[2], 7, 8, .1); }
  else if (top === 3) { k.tint(.8).geo(G.dod, 'stone', .1, h + .4, .05, .3, .22, .3, .3, .5, .2).tint(1); }
  B.obst(x, z, .5);
};
P.pilaster = (k, s, grand) => {
  const h = s.h; k.at(s.x, 0, s.z, s.rot);
  k.boxB('wall', 0, 0, .1, .46, h, .22).boxB('trim', 0, 0, .13, .56, .22, .3).boxB('trim', 0, h - .34, .13, .58, .16, .3).boxB('trim', 0, h - .14, .16, .66, .14, .36);
  if (grand) {     // a cut vault rib springing from the capital: the cathedral, sectioned
    for (let i = 0; i < 5; i++) { const a0 = i / 5 * 1.25, a1 = (i + 1) / 5 * 1.25, r = 1.9; k.bar('wall', 0, h - .1 + Math.sin(a0) * r, .2 + (1 - Math.cos(a0)) * r, 0, h - .1 + Math.sin(a1) * r, .2 + (1 - Math.cos(a1)) * r, .26, .2); }
    k.box('trim', 0, h - .1 + Math.sin(1.25) * 1.9 + .02, .2 + (1 - Math.cos(1.25)) * 1.9 + .1, .34, .12, .3);
    k.boxB('trim', 0, h * .55, .13, .52, .1, .28);
  }
};
P.sconce = (k, s, y = 2.05) => {
  const f = B.flameCol(); k.at(s.x, 0, s.z, s.rot);
  k.box('iron', 0, y - .15, .05, .16, .5, .08).bar('trim', 0, y - .3, .06, 0, y - .04, .34, .06, .06).cyl('trim', 0, y - .06, .34, .15, .13, 8, 0, 0, .6).ring('trim', 0, y + .08, .34, .15, true, HPI, 0, 0, .03);
  k.flame(0, y + .05, .34, .34, .55, f[0], f[1], f[2]);
  const w = k.wp(0, y + .35, .5); B.light(w[0], w[1], w[2], f[0] / 5, f[1] / 5, f[2] / 5, 10, 8.5); B.emit('ember', w[0], w[1] - .1, w[2], 3.5, f[0], f[1], f[2]);
  const p = k.wp(0, 0, 1.3); B.pool(p[0], p[2], 4.2, f[0] * .05, f[1] * .05, f[2] * .05);
};
P.brazier = (k, x, z, big = 1) => {
  const f = B.flameCol(); k.at(x, 0, z, B.rng.range(0, TAU), big);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.beam('iron', Math.cos(a) * .46, 0, Math.sin(a) * .46, Math.cos(a) * .12, .92, Math.sin(a) * .12, .045, 5); }
  k.ring('trim', 0, .45, 0, .3, true, HPI, 0, 0, .03).geo(G.bowl, 'trim', 0, .86, 0, .66, .66, .66).sph('gWarm', 0, 1.14, 0, .42, .07, .42).flame(0, 1.12, 0, .8, 1.25, f[0], f[1], f[2]);
  const w = k.wp(0, 1.7, 0); B.light(w[0], w[1], w[2], f[0] / 5, f[1] / 5, f[2] / 5, 18 * big, 11, .3); B.emit('ember', w[0], w[1] - .4, w[2], 10, f[0], f[1], f[2]);
  B.haze(w[0], w[1] + .3, w[2], .7, .9); B.pool(x, z, 6.5, f[0] * .05, f[1] * .05, f[2] * .05); B.obst(x, z, .5 * big);
};
P.banner = (k, s, idx, top) => {
  k.at(s.x, 0, s.z, s.rot); const w = 1.15, len = Math.min(2.5, top - .5);
  k.cyl('trim', -w / 2 - .1, top, .16, .035, w + .2, 6, 0, -HPI).sph('trim', -w / 2 - .12, top, .16, .06).sph('trim', w / 2 + .12, top, .16, .06);
  k.bar('iron', -w / 2, top, 0, -w / 2, top, .16, .04).bar('iron', w / 2, top, 0, w / 2, top, .16, .04);
  k.geo(G['banner' + idx], 'banner', 0, top - .02, .17, w, len, 1);
};
P.relief = (k, s, y) => {
  k.at(s.x, 0, s.z, s.rot); k.box('relief', 0, y, .05, 1.3, 1.3, .08).box('trim', 0, y + .7, .06, 1.5, .1, .12).box('trim', 0, y - .7, .06, 1.5, .1, .12).box('trim', -.72, y, .06, .1, 1.5, .12).box('trim', .72, y, .06, .1, 1.5, .12);
};
P.viewport = (k, s, w, y0, y1, tear) => {
  k.at(s.x, 0, s.z, s.rot); const hgt = y1 - y0, ym = (y0 + y1) / 2;
  k.geo(G.plane, 'portal', 0, ym, .035, w, hgt, 1);
  k.box('trim', 0, y1 + .08, .08, w + .34, .16, .2).box('trim', 0, y0 - .08, .1, w + .34, .16, .26).box('trim', -w / 2 - .09, ym, .08, .16, hgt + .3, .2).box('trim', w / 2 + .09, ym, .08, .16, hgt + .3, .2);
  if (tear) { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + B.rng.range(0, .5), ex = Math.cos(a) * w * .5, ey = ym + Math.sin(a) * hgt * .5; k.geo(G.tet, 'wall', ex, ey, .06, B.rng.range(.3, .6), B.rng.range(.3, .7), .1, B.rng.range(0, 3), 0, a); } }
  else { const n = Math.max(1, Math.round(w / 1.1)); for (let i = 1; i < n; i++) k.box('iron', -w / 2 + i * w / n, ym, .06, .06, hgt, .08); k.box('iron', 0, y0 + hgt * .62, .06, w, .06, .08); }
  k.tint(.16, .26, .55); const zb = 3.4, len = Math.hypot(y1, zb - .1); k.geo(G.planeB, 'shaft', 0, .03, zb, w * 1.25, len, 1, Math.atan2(.1 - zb, y1), 0, 0);
  const zb2 = 1.5, len2 = Math.hypot(y0, zb2 - .1); k.geo(G.planeB, 'shaft', 0, .03, zb2, w * 1.1, len2, 1, Math.atan2(.1 - zb2, y0), 0, 0); k.tint(1);
  const a = k.wp(0, ym + .4, .3), t = k.wp(0, 0, 3.3); B.spot(a[0], a[1], a[2], t[0], 0, t[2], .5, .68, 1, 70, .62);
  const p = k.wp(0, 0, 2.4); B.pool(p[0], p[2], w * 2.4, .03, .05, .11);
};
P.console = (k, s, variant = 0) => {
  k.at(s.x, 0, s.z, s.rot); const a = B.theme.accent;
  k.boxB('steel', 0, 0, .3, 1.3, .82, .5).box('iron', 0, .88, .36, 1.34, .08, .6, -.45).box('iron', 0, 1.28, .12, 1.1, .62, .08, -.12);
  k.geo(G['screen' + variant], 'screen', 0, 1.29, .17, .94, .5, 1, -.12).boxB('trim', -.6, 0, .3, .08, .86, .54).boxB('trim', .6, 0, .3, .08, .86, .54);
  for (let i = 0; i < 5; i++) k.box(i % 2 ? 'gAccent' : 'gDim', -.4 + i * .2, .93, .42, .08, .03, .06, -.45);
  const w = k.wp(0, 1.4, .7); B.light(w[0], w[1], w[2], a[0], a[1], a[2], 3.2, 5, .35);
  const o = k.wp(0, 0, .3); B.obst(o[0], o[2], .52);
};
P.pipes = (k, s, y, glow) => {
  k.at(s.x, 0, s.z, s.rot);
  k.cyl('steel', -1.01, y, .15, .1, 2.02, 8, 0, -HPI).cyl('trim', -.95, y, .15, .135, .07, 8, 0, -HPI).cyl('trim', .55, y, .15, .135, .07, 8, 0, -HPI).box('iron', .2, y, .07, .08, .3, .14);
  k.cyl(glow ? 'gAccent' : 'rubber', -1.01, y - .26, .1, .045, 2.02, 6, 0, -HPI);
  if (glow) { const a = B.theme.accent, w = k.wp(0, y - .2, .5); B.light(w[0], w[1], w[2], a[0], a[1], a[2], 3.5, 5, .15); }
};
P.cables = (k, x0, y0, z0, x1, y1, z1, sag = .7, frayed = true) => {
  k.at(0, 0, 0, 0); let px = x0, py = y0, pz = z0; const n = 6;
  for (let i = 1; i <= n; i++) { const t = i / n, nx = lerp(x0, x1, t), ny = lerp(y0, y1, t) - Math.sin(t * PI) * sag, nz = lerp(z0, z1, t); k.beam('rubber', px, py, pz, nx, ny, nz, .035, 5); px = nx; py = ny; pz = nz; }
  if (frayed) {
    const t = B.rng.range(.3, .7), fx = lerp(x0, x1, t), fy = lerp(y0, y1, t) - Math.sin(t * PI) * sag, fz = lerp(z0, z1, t), dl = B.rng.range(.4, 1);
    k.beam('rubber', fx, fy, fz, fx + B.rng.range(-.2, .2), fy - dl, fz + B.rng.range(-.2, .2), .028, 4).sph('gCold', fx, fy - dl - .03, fz, .035);
    B.emit('spark', fx, fy - dl, fz, 1, 2.5, 5, 9);
  }
};
P.bones = (k, x, z) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU));
  k.sph('bone', .1, .13, .2, .14, .13, .16).box('bone', .1, .05, .32, .13, .05, .1).beam('bone', -.05, .06, .05, -.5, .06, -.3, .035, 5);
  for (let i = 0; i < 4; i++) k.geo(G.torus, 'bone', -.1 - i * .11, .1, -.02 - i * .07, .16, .16, .9, 0, -.6, 0);
  for (let i = 0; i < 4; i++) { const a = r.range(0, TAU), d = r.range(.3, .8), l = r.range(.2, .42); k.beam('bone', Math.cos(a) * d, .04, Math.sin(a) * d, Math.cos(a) * d + Math.cos(a + 1.3) * l, .04, Math.sin(a) * d + Math.sin(a + 1.3) * l, .032, 5); }
  if (r.chance(.4)) k.tint(.3, .33, .42).box('cloth', -.3, .03, -.15, .7, .02, .5, 0, .4).tint(1);
};
P.droid = (k, x, z) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU));
  k.box('steel', 0, .28, 0, .62, .5, .44, .5, 0, .25).geo(G.hemi, 'steel', .34, .5, .18, .22, .22, .22, .6, 0, -.6).sph('gDim', .46, .56, .3, .05);
  k.beam('steel', -.25, .3, .2, -.75, .06, .5, .055, 5).beam('steel', -.75, .06, .5, -1, .05, .2, .045, 5).beam('steel', .1, .2, -.25, .3, .05, -.8, .055, 5);
  k.box('rubber', -.2, .1, -.42, .5, .2, .22, 0, .5).beam('rubber', .2, .3, .2, .7, .03, .6, .03, 4).beam('rubber', 0, .3, .2, .2, .03, .9, .025, 4).box('iron', -.5, .04, -.2, .3, .04, .22, 0, 1);
  if (r.chance(.5)) { const w = k.wp(.2, .4, .2); B.emit('spark', w[0], w[1], w[2], 1, 6, 3.5, 1.2); }
  B.obst(x, z, .45);
};
P.wreckage = (k, x, z) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU));
  for (let i = 0; i < 6; i++) k.tint(r.range(.6, 1)).box(r.chance(.5) ? 'rust' : 'iron', r.range(-.6, .6), r.range(.1, .5), r.range(-.6, .6), r.range(.4, 1.1), r.range(.05, .14), r.range(.3, .9), r.range(-.6, .6), r.range(0, 3), r.range(-.5, .5));
  k.tint(1).beam('steel', -.8, .05, -.3, .6, 1.1, .2, .07, 5).beam('steel', .7, .05, -.6, -.3, .8, .5, .06, 5);
  for (let i = 0; i < 3; i++) k.geo(G.dod, 'stone', r.range(-.7, .7), .15, r.range(-.7, .7), r.range(.15, .3), r.range(.12, .22), r.range(.15, .3), r.range(0, 3), r.range(0, 3), 0);
  B.obst(x, z, .78);
};
P.statue = (k, x, z, rot, s = 1.45, broken = false) => {
  k.at(x, 0, z, rot, s);
  k.boxB('stone', 0, 0, 0, 1.5, .35, 1.5).boxB('stone', 0, .35, 0, 1.2, .3, 1.2).box('trim', 0, .5, .61, .7, .18, .04);
  k.cyl('bronze', 0, .65, 0, .5, .9, 12, 0, 0, .68).cyl('bronze', 0, .65, 0, .42, 1.72, 12, 0, 0, .72).cyl('bronze', 0, 2.35, 0, .32, .78, 12, 0, 0, 1.18);
  k.box('bronze', 0, 3.14, 0, .98, .2, .42).sph('trim', .5, 3.25, 0, .18, .08, .18).sph('trim', -.5, 3.25, 0, .18, .08, .18).box('bronze', 0, 2.0, -.33, .82, 1.9, .1, .06);
  for (let i = 0; i < 3; i++) k.sph('trim', -.12 + i * .1, 2.86, .36, .035);
  k.beam('bronze', .46, 3.1, 0, .4, 2.34, .3, .1, 6).beam('bronze', .4, 2.34, .3, .1, 2.08, .48, .09, 6).beam('bronze', -.46, 3.1, 0, -.42, 2.34, .3, .1, 6).beam('bronze', -.42, 2.34, .3, -.1, 2.08, .48, .09, 6);
  k.bar('steel', 0, .68, .52, 0, 2.3, .52, .1, .035).box('trim', 0, 2.2, .52, .44, .06, .09).sph('trim', 0, 2.36, .52, .06);
  if (!broken) k.sph('bronze', 0, 3.5, 0, .19).box('bronze', 0, 3.68, 0, .52, .1, .24).box('trim', 0, 3.8, 0, .05, .26, .4);
  else k.tint(.8).sph('bronze', 1.1, .19, .7, .19).tint(1);
  B.obst(x, z, .95 * s);
};
P.liftPad = (k, x, z, exit) => {
  k.at(x, 0, z, PI / 6);
  k.cyl('steel', 0, 0, 0, 1.75, .12, 6).cyl('grate', 0, .121, 0, 1.4, .02, 6).ring('trim', 0, .13, 0, 1.56, true, HPI, 0, 0, .06).ring(exit ? 'gAccent' : 'gAccentDim', 0, .14, 0, 1.3, false, HPI, 0, 0, .04);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.boxB('iron', Math.cos(a) * 1.62, 0, Math.sin(a) * 1.62, .2, .5, .2, 0, -a).box(exit ? 'gAccent' : 'gDim', Math.cos(a) * 1.62, .55, Math.sin(a) * 1.62, .12, .1, .12, 0, -a); }
  k.at(x, 0, z, 0); k.beam('steel', -1.9, 0, -.9, -1.9, 4.2, -.9, .07, 6).beam('steel', -.9, 0, -1.9, -.9, 4.2, -1.9, .07, 6).beam('steel', -1.9, 4.2, -.9, -.9, 4.2, -1.9, .05, 5).box('gAccentDim', -1.4, 3.4, -1.4, .5, .12, .08, 0, PI / 4);
  const a = B.theme.accent; B.light(x, 1.4, z, a[0], a[1], a[2], exit ? 9 : 5, 8, .08); B.pool(x, z, 5, a[0] * .04, a[1] * .04, a[2] * .04);
};
P.doorFrame = (k, d, x, z, rot) => {      // posts + lintel; the two sliding leaves are dynamic
  k.at(x, 0, z, rot);
  k.boxB('iron', -2.1, 0, 0, .5, 2.75, .9).boxB('iron', 2.1, 0, 0, .5, 2.75, .9).boxB('trim', -2.1, 0, 0, .58, .2, .98).boxB('trim', 2.1, 0, 0, .58, .2, .98);
  k.boxB('iron', 0, 2.62, 0, 4.7, .42, .8).boxB('trim', 0, 3.02, 0, 4.9, .1, .9).box('relief', 0, 2.83, .42, .5, .5, .06).box('relief', 0, 2.83, -.42, .5, .5, .06);
  k.box('hazard', -1.82, 1.3, 0, .08, 2.5, .5).box('hazard', 1.82, 1.3, 0, .08, 2.5, .5);
};
// ---- reactor cathedral
P.fusionCore = (k, x, z) => {
  k.at(x, 0, z, 0);
  k.cyl('iron', 0, 0, 0, 1.15, .5, 12).cyl('trim', 0, .5, 0, .8, .12, 12).cyl('gHot', 0, .6, 0, .3, 3.1, 8).cyl('glass', 0, .6, 0, .62, 3.1, 12);
  for (let i = 0; i < 4; i++) k.ring('trim', 0, 1 + i * .8, 0, .68, true, HPI, 0, 0, .07);
  k.cyl('iron', 0, 3.7, 0, .92, .42, 12).cyl('trim', 0, 4.12, 0, .5, .2, 12);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + .5; k.beam('steel', Math.cos(a) * .8, 3.9, Math.sin(a) * .8, Math.cos(a) * 1.35, 2.6, Math.sin(a) * 1.35, .09, 6).beam('steel', Math.cos(a) * 1.35, 2.6, Math.sin(a) * 1.35, Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35, .09, 6).cyl('gWarm', Math.cos(a) * 1.35, .6, Math.sin(a) * 1.35, .1, .5, 6); }
  B.light(x, 2.2, z, 1, .5, .16, 34, 13, .15); B.haze(x, 4, z, 1.3, 1.3); B.emit('ember', x, 4.2, z, 7, 6, 2.4, .5); B.pool(x, z, 9, .09, .04, .01); B.obst(x, z, 1.2);
};
P.coolTank = (k, x, z) => {
  k.at(x, 0, z, B.rng.range(0, TAU)); k.cyl('steel', 0, 0, 0, .62, 1.8, 12).sph('steel', 0, 1.8, 0, .62, .25, .62, G.hemi);
  k.ring('trim', 0, .4, 0, .64, true, HPI, 0, 0, .04).ring('trim', 0, 1.4, 0, .64, true, HPI, 0, 0, .04).cyl('iron', .62, .9, 0, .05, .3, 6, 0, -HPI).ring('gRed', .95, .9, 0, .16, true, 0, HPI, 0, .03).box('hazard', 0, 1, .63, .5, .3, .02);
  B.obst(x, z, .68);
};
// ---- hydroponic jungle
P.planter = (k, x, z, rot) => {
  const r = B.rng; k.at(x, 0, z, rot); k.boxB('steel', 0, 0, 0, 1.7, .42, .95).boxB('trim', 0, .38, 0, 1.76, .06, 1.01).tint(.6, .5, .4).boxB('stone', 0, .4, 0, 1.56, .06, .82).tint(1);
  for (let i = 0; i < 9; i++) { const px = r.range(-.7, .7), pz = r.range(-.3, .3), h = r.range(.5, 1.3); k.tint(r.range(.7, 1.2), r.range(.8, 1.3), r.range(.6, 1)).geo(G.cone4, 'leaf', px, .45, pz, .13, h, .03, r.range(-.5, .5), r.range(0, 3), r.range(-.5, .5)); }
  k.tint(1); for (let i = 0; i < 3; i++) { const px = r.range(-.6, .6), pz = r.range(-.25, .25), h = r.range(.7, 1.2); k.beam('leaf', px, .45, pz, px + .1, .45 + h, pz, .025, 4).sph(i % 2 ? 'gCyan' : 'gGreen', px + .1, .5 + h, pz, .07); }
  const w = k.wp(0, 1.3, 0); B.light(w[0], w[1], w[2], .3, 1, .7, 4.5, 6, .2); B.emit('mote', w[0], .6, w[2], 2.5, .6, 4, 2.4); B.obst(x, z, .82);
};
P.fern = (k, x, z) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU));
  k.tint(.5, .4, .3).beam('stone', 0, 0, 0, .1, 1.3, .05, .16, 6, .7).beam('stone', .1, 1.3, .05, -.05, 2.3, 0, .11, 6, .7).tint(1);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + r.range(0, .4), l = r.range(1.2, 1.9); k.tint(r.range(.7, 1.1), r.range(.9, 1.3), r.range(.6, .9)).geo(G.cone4, 'leaf', Math.cos(a) * .12, 2.25, Math.sin(a) * .12, .34, l, .05, 0, -a + HPI, -1.15 - r.range(0, .5)); }
  k.tint(1).sph('gGreen', 0, 2.5, 0, .1); B.light(x, 2.4, z, .35, 1, .5, 3.5, 6, .15); B.obst(x, z, .34);
};
P.mushroom = (k, x, z, s = 1) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU), s);
  k.tint(.9, .85, .75).cyl('bone', 0, 0, 0, .16, 1.1, 8, r.range(-.1, .1), r.range(-.1, .1), .7).tint(.5, .3, .8).geo(G.hemi, 'leaf', 0, 1.02, 0, .6, .36, .6).tint(1);
  for (let i = 0; i < 6; i++) { const a = r.range(0, TAU), d = r.range(.15, .45); k.sph('gCyan', Math.cos(a) * d, 1.05 + .32 * (1 - d * d * 2.5), Math.sin(a) * d, .05, .03, .05); }
  k.sph('gCyan', 0, .98, 0, .34, .02, .34); B.light(x, 1.1 * s, z, .3, .85, 1, 5 * s, 6.5, .12); B.emit('mote', x, .9 * s, z, 2, .5, 3.4, 4.2); B.obst(x, z, .3 * s);
};
P.vines = (k, s) => {
  const r = B.rng; k.at(s.x, 0, s.z, s.rot);
  for (let i = 0; i < 6; i++) { const px = r.range(-.9, .9), l = r.range(.8, s.h - .6); k.tint(r.range(.6, 1), r.range(.8, 1.2), r.range(.5, .8)).beam('leaf', px, s.h, .08, px + r.range(-.2, .2), s.h - l, .12, .03, 4); for (let j = 0; j < 3; j++) k.geo(G.cone4, 'leaf', px + r.range(-.1, .1), s.h - l * (j + 1) / 3.5, .13, .12, .32, .03, r.range(1, 2), r.range(-1, 1), r.range(-1, 1)); }
  k.tint(1); if (r.chance(.5)) k.sph('gGreen', r.range(-.6, .6), r.range(1, 2), .16, .06);
};
// ---- cryo vaults
P.cryoPod = (k, s, broken) => {
  k.at(s.x, 0, s.z, s.rot);
  k.boxB('steel', 0, 0, .5, 1, .32, .9).boxB('trim', 0, .3, .5, 1.06, .05, .96).box('steel', 0, 1.35, .12, .96, 2.1, .14, -.2);
  if (!broken) k.tint(.08).cyl('black', 0, .42, .58, .2, 1.5, 6, -.2, 0, .8).sph('black', 0, 1.98, .2, .15).tint(1).cyl('glass', 0, .32, .56, .4, 1.9, 10, -.2, 0, .85).sph('ice', 0, 2.12, .19, .34, .12, .34);
  else { for (let i = 0; i < 5; i++) k.geo(G.tet, 'ice', B.rng.range(-.4, .4), B.rng.range(.3, .6), .5 + B.rng.range(0, .6), .14, .22, .1, B.rng.range(0, 3), B.rng.range(0, 3), 0); }
  k.ring('steel', 0, .7, .52, .42, true, HPI - .2, 0, 0, .05).ring('steel', 0, 1.7, .31, .42, true, HPI - .2, 0, 0, .05).box(broken ? 'gRed' : 'gCold', .42, .5, .94, .1, .06, .03);
  const w = k.wp(0, 1.3, .9); B.light(w[0], w[1], w[2], .45, .72, 1, broken ? 1.5 : 3, 5, .1); if (B.rng.chance(.4)) B.emit('steam', w[0], .15, w[2], 1.2, .2, .26, .3);
  const o = k.wp(0, 0, .5); B.obst(o[0], o[2], .55);
};
P.icicles = (k, s) => { const r = B.rng; k.at(s.x, 0, s.z, s.rot); for (let i = 0; i < 7; i++) { const l = r.range(.3, 1); k.geo(G.cone5, 'ice', r.range(-.95, .95), s.h + .02, r.range(.02, .2), .07, l, .07, PI, 0, 0); } k.sph('ice', r.range(-.5, .5), s.h - .05, .1, .5, .12, .16); };
P.nitroTank = (k, x, z) => {
  k.at(x, 0, z, B.rng.range(0, TAU)); k.tint(.8, .9, 1).cyl('steel', 0, 0, 0, .5, 1.5, 10).tint(1).sph('ice', 0, 1.5, 0, .52, .22, .52, G.hemi).ring('trim', 0, .3, 0, .52, true, HPI, 0, 0, .04).cyl('iron', 0, 1.6, 0, .08, .3, 6).box('gCold', 0, .9, .5, .2, .1, .03);
  B.emit('steam', x, 1.9, z, 2, .22, .28, .33); B.light(x, 1.4, z, .45, .7, 1, 2.5, 5, .1); B.obst(x, z, .55);
};
// ---- gilded concourse
P.chandelier = (k, x, z, fallen) => {
  const r = B.rng, f = B.flameCol(); k.at(x, 0, z, r.range(0, TAU));
  const y = fallen ? .3 : 2.9, tilt = fallen ? .35 : 0;
  if (!fallen) { k.cyl('trim', 0, 0, 0, .34, .14, 8, 0, 0, .6).beam('trim', 0, .1, 0, 0, 3.6, 0, .05, 6).geo(G.arc, 'trim', 0, 3.0, 0, .62, .62, 1, 0, 0, 0).beam('iron', .62, 3.0, 0, .62, 2.98, 0, .02, 4); }
  const cx = fallen ? 0 : .62;
  k.ring('trim', cx, y, 0, .62, true, HPI + tilt, 0, 0, .04).ring('trim', cx, y - .22, 0, .36, true, HPI + tilt, 0, 0, .03);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, px = cx + Math.cos(a) * .62, pz = Math.sin(a) * .62, py = y + Math.sin(a) * tilt * .6; k.cyl('bone', px, py, pz, .03, .16, 5); if (!fallen || i % 3 === 0) k.flame(px, py + .14, pz, .12, .24, f[0], f[1], f[2]); k.geo(G.oct, 'glass', px * .96 + cx * .04, py - .2, pz * .96, .05, .1, .05); }
  if (fallen) { for (let i = 0; i < 6; i++) k.geo(G.oct, 'glass', r.range(-1, 1), .06, r.range(-1, 1), .06, .06, .06, r.range(0, 3), 0, 0); }
  const w = k.wp(cx, y + .5, 0); B.light(w[0], w[1], w[2], f[0] / 5, f[1] / 5, f[2] / 5, fallen ? 7 : 20, fallen ? 7 : 12, .2); B.emit('ember', w[0], w[1], w[2], 3, f[0], f[1], f[2]);
  B.pool(w[0], w[2], fallen ? 4 : 8, f[0] * .04, f[1] * .04, f[2] * .04); B.obst(x, z, fallen ? .6 : .32);
};
P.throne = (k, x, z, rot) => {
  k.at(x, 0, z, rot);
  k.boxB('marble', 0, 0, 0, 2.6, .22, 2.2).boxB('marble', 0, .22, -.1, 2, .2, 1.7).boxB('trim', 0, .42, -.2, 1.1, .5, .9).tint(.7, .1, .12).boxB('cloth', 0, .92, -.14, .86, .1, .7).tint(1);
  k.boxB('trim', 0, .42, -.62, 1.2, 2.7, .2).box('relief', 0, 2.3, -.5, .8, .8, .06).tint(.7, .1, .12).box('cloth', 0, 1.45, -.5, .78, .8, .06).tint(1).geo(G.cone4, 'trim', 0, 3.12, -.62, .5, .9, .14, 0, PI / 4);
  k.boxB('trim', -.58, .92, -.2, .16, .34, .8).boxB('trim', .58, .92, -.2, .16, .34, .8).sph('trim', -.58, 1.32, .2, .11).sph('trim', .58, 1.32, .2, .11).sph('trim', -.6, 3.16, -.62, .1).sph('trim', .6, 3.16, -.62, .1);
  B.obst(x, z, 1.05);
};
P.curtain = (k, s) => {
  k.at(s.x, 0, s.z, s.rot); const h = s.h - .2;
  for (let i = 0; i < 7; i++) k.tint(.55 + (i % 2) * .15, .08, .1).box('cloth', -.84 + i * .28, h / 2, .1 + (i % 2) * .09, .3, h, .08);
  k.tint(1).cyl('trim', -1.05, h + .05, .14, .04, 2.1, 6, 0, -HPI).box('trim', 0, 1.1, .2, 2, .08, .06);
};
P.seats = (k, x, z, rot) => {
  k.at(x, 0, z, rot);
  for (let i = -1; i <= 1; i++) k.tint(.6, .1, .12).boxB('cloth', i * .58, .3, .05, .5, .16, .5).box('cloth', i * .58, .85, -.2, .5, .7, .1, -.15).tint(1).boxB('trim', i * .58 - .28, 0, 0, .05, .7, .56).boxB('trim', i * .58 + .28, 0, 0, .05, .7, .56);
  B.obst(x, z, .8);
};
// ---- hangar bay
P.fighter = (k, x, z, rot) => {
  const r = B.rng; k.at(x, 0, z, rot);
  k.cyl('steel', 0, .85, -1.4, .46, 2.9, 10, HPI, 0, .72).geo(G.cone8, 'steel', 0, .85, 1.5, .33, 1.1, .33, HPI).geo(G.hemi, 'glass', 0, 1.05, .55, .3, .34, .62).tint(.1).sph('black', 0, 1, .55, .24, .2, .5).tint(1);
  k.box('steel', 1.15, .78, -.5, 1.9, .07, 1.15, 0, -.32, .06).box('steel', -1.1, .5, -.55, 1.9, .07, 1.15, 0, .32, -.35).box('hazard', 1.9, .82, -.9, .34, .08, .5, 0, -.32, .06);
  k.cyl('iron', .52, .78, -1.9, .26, 1.1, 8, HPI).cyl('iron', -.52, .78, -1.9, .26, 1.1, 8, HPI).tint(.05).cyl('black', .52, .78, -1.93, .2, .1, 8, HPI).cyl('black', -.52, .78, -1.93, .2, .1, 8, HPI).tint(1);
  k.box('steel', 0, 1.35, -1.5, .06, .7, .8, .3).beam('iron', .5, .7, .3, .6, 0, .4, .04, 5).beam('iron', -.4, .5, .3, -.6, 0, .4, .04, 5).beam('iron', 0, .7, -1.2, 0, 0, -1.3, .04, 5).box('gRed', 1.98, .88, -.6, .06, .05, .06);
  for (let i = 0; i < 3; i++) k.tint(.35).box('steel', r.range(-.3, .3), 1.1, r.range(-1, .2), r.range(.2, .4), .04, r.range(.2, .5), r.range(-.2, .2), r.range(0, 3), 1.2).tint(1);
  if (r.chance(.6)) { const w = k.wp(-.5, .8, -1.2); B.emit('spark', w[0], w[1], w[2], 1, 6, 4, 1.5); B.emit('steam', w[0], w[1], w[2], .8, .06, .06, .07); }
  for (const dz of [-1.5, -.2, 1.1]) { const o = k.wp(0, 0, dz); B.obst(o[0], o[2], .85); }
};
P.fuelCart = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.boxB('iron', 0, .22, 0, 1.6, .12, .8).cyl('drum', -.7, .72, 0, .38, 1.4, 10, 0, -HPI);
  for (const sx of [-.6, .6]) for (const sz of [-.42, .42]) k.cyl('rubber', sx, .2, sz - .06, .2, .12, 8, HPI);
  k.beam('rubber', .75, .6, 0, 1.1, .05, .3, .035, 4).box('hazard', 0, .36, .41, 1.2, .14, .02); B.obst(x, z, .8);
};
// ---- hive
P.resinGrowth = (k, s) => {
  const r = B.rng; k.at(s.x, 0, s.z, s.rot);
  for (let i = 0; i < 7; i++) { const y = r.range(0, s.h * .8); k.tint(r.range(.7, 1.1)).sph('resin', r.range(-.9, .9), y, r.range(0, .2), r.range(.25, .55), r.range(.25, .6), r.range(.14, .3)); }
  k.tint(1); for (let i = 0; i < 3; i++) { const px = r.range(-.8, .8); k.beam('resin', px, s.h, .1, px + r.range(-.3, .3), r.range(.2, 1.4), r.range(.3, .8), .06, 5, .4); }
  if (r.chance(.4)) { k.sph('resin', 0, 1.5, .25, .32, .6, .26).sph('bone', .05, 1.98, .42, .1); }
};
P.spire = (k, x, z) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU));
  k.geo(G.cone6, 'resin', 0, 0, 0, .5, r.range(1.6, 2.6), .5, r.range(-.12, .12), 0, r.range(-.12, .12)).geo(G.cone6, 'resin', .3, 0, .2, .3, r.range(.8, 1.4), .3, .2, 0, -.2).geo(G.cone6, 'resin', -.25, 0, -.3, .26, r.range(.6, 1.1), .26, -.25, 0, .15).sph('resin', 0, .1, 0, .7, .2, .7);
  B.obst(x, z, .55);
};
// ---- crystal archive
P.dataStack = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.boxB('steel', 0, 0, 0, .8, .22, 1.6).boxB('crystal', 0, .22, 0, .5, 3.1, 1.3).boxB('steel', 0, 3.32, 0, .7, .14, 1.5);
  for (const sz of [-.66, .66]) k.box('gCyan', .26, 1.77, sz, .02, 3.1, .03).box('gCyan', -.26, 1.77, sz, .02, 3.1, .03);
  for (let i = 0; i < 5; i++) k.box('gCyan', .26, .6 + i * .55, 0, .012, .03, B.rng.range(.4, 1.1));
  B.light(x, 1.8, z, .25, .85, 1, 6, 7, .1); B.obst(x, z, .78);
};
P.holoTable = (k, x, z) => {
  k.at(x, 0, z, 0); k.cyl('steel', 0, 0, 0, .86, .7, 12, 0, 0, .8).cyl('trim', 0, .7, 0, .9, .06, 12).cyl('gCyan', 0, .76, 0, .5, .02, 12);
  k.tint(.2, 1.1, 1.4).geo(G.cone12, 'holo', 0, 2.3, 0, .62, 1.5, .62, PI).tint(.8, 3, 3.6);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.geo(G['glyph' + B.rng.int(0, 15)], 'glyph', Math.cos(a) * .5, 1.5 + (i % 2) * .4, Math.sin(a) * .5, .42, .42, 1, 0, -a + HPI, 0); }
  k.tint(1); B.light(x, 1.7, z, .25, .85, 1, 8, 8, .2); B.emit('mote', x, 1.2, z, 3, .4, 3.4, 4.4); B.obst(x, z, .9);
};
// ---- foundry
P.press = (k, x, z, rot) => {
  k.at(x, 0, z, rot);
  k.boxB('rust', -1.15, 0, 0, .6, 4, .85).boxB('rust', 1.15, 0, 0, .6, 4, .85).boxB('rust', 0, 3.5, 0, 2.9, .85, 1.05).boxB('iron', 0, 0, 0, 1.7, .62, 1.05).box('hazard', 0, .64, 0, 1.72, .04, 1.07);
  k.cyl('steel', 0, 2.5, 0, .22, 1, 10).boxB('steel', 0, 1.9, 0, 1.4, .62, .9).box('gWarm', .1, .76, 0, .7, .16, .32);
  for (const sx of [-1.15, 1.15]) for (let i = 0; i < 4; i++) k.sph('trim', sx, .6 + i * .9, .44, .07);
  B.light(x, 1.2, z, 1, .5, .15, 11, 8, .3); B.emit('ember', x, .9, z, 4, 6, 2.6, .6);
  for (const dx of [-1.15, 0, 1.15]) { const o = k.wp(dx, 0, 0); B.obst(o[0], o[2], .62); }
};
P.crucible = (k, x, z) => {
  k.at(x, 0, z, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .78; k.beam('iron', Math.cos(a) * .9, 0, Math.sin(a) * .9, Math.cos(a) * .7, 1.1, Math.sin(a) * .7, .08, 5); }
  k.geo(G.bowl, 'rust', 0, .7, 0, 1.15, 1.3, 1.15).geo(G.disc, 'lava', 0, 1.28, 0, .92, 1, .92).ring('iron', 0, 1.36, 0, 1.03, true, HPI, 0, 0, .08);
  B.light(x, 2, z, 1, .45, .12, 26, 12, .25); B.haze(x, 1.6, z, 1.1, 1.2); B.emit('ember', x, 1.4, z, 9, 7, 2.8, .5); B.pool(x, z, 8, .08, .035, .01); B.obst(x, z, 1.05);
};
P.ingots = (k, x, z) => {
  const r = B.rng; k.at(x, 0, z, r.range(0, TAU));
  for (let l = 0; l < 3; l++) for (let i = 0; i < 3 - l; i++) k.box(l === 2 && r.chance(.5) ? 'gDim' : 'steel', -.45 + i * .45 + l * .22, .09 + l * .17, 0, .4, .16, .9, 0, (l % 2) * HPI);
  B.obst(x, z, .7);
};
// ---- flooded ballast
P.pump = (k, x, z) => {
  k.at(x, 0, z, B.rng.range(0, TAU)); k.boxB('rust', 0, 0, 0, 1.1, .7, .9).cyl('steel', 0, .7, 0, .36, .8, 10).ring('trim', 0, 1.5, 0, .36, true, HPI, 0, 0, .04).cyl('iron', 0, 1.5, 0, .05, .3, 5).ring('gRed', 0, 1.82, 0, .22, true, HPI, 0, 0, .03);
  k.cyl('steel', .5, .4, 0, .14, 1, 8, 0, -HPI).beam('steel', 1.5, .4, 0, 1.5, 0, 0, .14, 8); B.emit('drip', x, 1.3, z + .5, 1, .5, 1.2, 1.6); B.obst(x, z, .7);
};
P.outflow = (k, s) => {
  k.at(s.x, 0, s.z, s.rot); k.cyl('rust', 0, 1.1, 0, .45, .5, 10, HPI).cyl('iron', 0, 1.1, .46, .5, .1, 10, HPI).tint(.05).cyl('black', 0, 1.1, .5, .38, .04, 10, HPI).tint(1);
  for (let i = 0; i < 3; i++) k.tint(.5, .55, .5).geo(G.cone5, 'stone', B.rng.range(-.8, .8), B.rng.range(.2, 2), .05, .08, .16, .08, HPI).tint(1);
  const w = k.wp(0, .9, .7); B.emit('steam', w[0], w[1], w[2], 3, .1, .18, .22); B.emit('drip', w[0], w[1], w[2], 1, .5, 1.2, 1.6);
};
// ---- star chapel
P.pew = (k, x, z, rot) => { k.at(x, 0, z, rot); k.boxB('stone', 0, 0, 0, 1.8, .42, .5).tint(.15, .2, .5).boxB('cloth', 0, .42, 0, 1.7, .06, .44).tint(1).box('stone', 0, .75, -.24, 1.8, .7, .1, -.1).boxB('trim', -.92, 0, 0, .06, .95, .56).boxB('trim', .92, 0, 0, .06, .95, .56); B.obst(x - Math.cos(rot) * .45, z + Math.sin(rot) * .45, .5); B.obst(x + Math.cos(rot) * .45, z - Math.sin(rot) * .45, .5); };
P.altar = (k, x, z, rot) => {
  const f = B.flameCol(); k.at(x, 0, z, rot); k.boxB('marble', 0, 0, 0, 2.2, .2, 1.2).boxB('stone', 0, .2, 0, 1.7, .8, .8).boxB('marble', 0, 1, 0, 1.9, .1, .95).box('relief', 0, .6, .41, .6, .6, .04);
  k.geo(G.oct, 'gCold', 0, 1.55, 0, .16, .3, .16).ring('trim', 0, 1.55, 0, .32, false, 0, 0, 0, .03).ring('trim', 0, 1.55, 0, .32, false, 0, HPI, 0, .03);
  for (const sx of [-.7, .7]) k.cyl('bone', sx, 1.1, 0, .04, .3, 6).flame(sx, 1.4, 0, .12, .25, f[0], f[1], f[2]);
  B.light(x, 1.9, z, .5, .7, 1, 9, 9, .1); B.obst(x, z, 1);
};
P.starGlyph = (k, x, z, s = 2.4) => {
  k.at(x, 0, z, 0); k.tint(.25, .5, 1.3).geo(G.ring, 'pool', 0, .035, 0, s, 1, s).geo(G.ring, 'pool', 0, .035, 0, s * .62, 1, s * .62);
  k.tint(.5, 1.2, 3); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.geo(G['glyphUp' + ((i * 5) % 16)], 'glyph', Math.cos(a) * s * .8, .04, Math.sin(a) * s * .8, .6, 1, .6, 0, -a, 0); }
  k.tint(1); B.light(x, .8, z, .3, .5, 1, 4, 6, .05);
};
P.telescope = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.cyl('iron', 0, 0, 0, .5, .2, 10).beam('trim', 0, .2, 0, 0, 1.3, 0, .09, 8).beam('trim', 0, 1.1, -.5, 0, 2.6, .9, .2, 10, .7).ring('trim', 0, 1.6, -.07, .24, true, .75, 0, 0, .05).cyl('steel', 0, 2.58, .88, .2, .06, 10, .75).ring('trim', .4, 1.3, 0, .3, true, 0, HPI, 0, .03);
  B.obst(x, z, .55);
};
// ---- brig
P.cellCage = (k, x, z, rot, occupant) => {
  const a = B.theme.accent, r = B.rng; k.at(x, 0, z, rot);
  for (const sx of [-.9, .9]) for (const sz of [-.9, .9]) k.boxB('iron', sx, 0, sz, .16, 2.5, .16);
  k.boxB('iron', 0, 2.42, -.9, 1.96, .14, .16).boxB('iron', 0, 2.42, .9, 1.96, .14, .16).boxB('iron', -.9, 2.42, 0, .16, .14, 1.96).boxB('iron', .9, 2.42, 0, .16, .14, 1.96).boxB('grate', 0, 0, 0, 1.9, .05, 1.9);
  for (let i = -3; i <= 3; i++) { k.cyl('steel', i * .25, 0, -.9, .03, 2.45, 5).cyl('steel', -.9, 0, i * .25, .03, 2.45, 5).cyl('steel', .9, 0, i * .25, .03, 2.45, 5); }
  k.tint(a[0] * 1.6, a[1] * 1.6, a[2] * 1.6).geo(G.plane, 'field', 0, 1.22, .9, 1.7, 2.36, 1).tint(1);
  if (occupant === 1) { k.at(x, 0, z, rot + r.range(-1, 1)); k.sph('bone', .2, .13, 0, .14, .13, .16).beam('bone', -.1, .06, .1, -.6, .06, -.2, .035, 5).beam('bone', 0, .05, .3, .4, .05, .5, .03, 5); for (let i = 0; i < 3; i++) k.geo(G.torus, 'bone', -.1 - i * .11, .1, -.05, .16, .16, .9, 0, -.6, 0); }
  else if (occupant === 2) { k.tint(.5, .52, .6).cyl('cloth', 0, 0, -.3, .26, 1.2, 8, 0, 0, .6).tint(1).sph('bone', 0, 1.36, -.3, .15).beam('steel', -.3, 2.4, -.5, -.2, 1.1, -.3, .02, 4).beam('steel', .3, 2.4, -.5, .2, 1.1, -.3, .02, 4); }
  const w = k.wp(0, 1.4, 1.3); B.light(w[0], w[1], w[2], a[0], a[1], a[2], 3, 5, .2); B.obst(x, z, .98);
};
P.interrogation = (k, x, z, rot) => {
  k.at(x, 0, z, rot); k.boxB('steel', 0, 0, 0, .7, .5, .7).box('steel', 0, 1, -.3, .7, 1.1, .1, -.2).box('rubber', 0, .9, -.22, .74, .08, .04).box('rubber', 0, 1.3, -.3, .74, .08, .04).boxB('steel', -.4, .5, .1, .1, .22, .5).boxB('steel', .4, .5, .1, .1, .22, .5);
  k.beam('iron', -.9, 0, -.6, -.9, 2.6, -.6, .05, 5).beam('iron', -.9, 2.6, -.6, -.1, 2.4, .1, .04, 5).geo(G.cone8, 'steel', -.1, 2.12, .1, .26, .3, .26).sph('gWhite', -.1, 2.14, .1, .1);
  k.boxB('steel', .9, 0, .2, .5, .8, .4).box('steel', .9, .84, .2, .56, .04, .46).beam('steel', .8, .87, .1, .95, .87, .3, .015, 4).box('gRed', .9, .5, .41, .2, .05, .02);
  const a = k.wp(-.1, 2.1, .1), t = k.wp(0, 0, .1); B.spot(a[0], a[1], a[2], t[0], 0, t[2], 1, .97, .9, 55, .55); B.light(a[0], a[1] - .3, a[2], 1, .95, .85, 6, 6, .25); B.obst(x, z, .7);
};
P.shackles = (k, s) => { const r = B.rng; k.at(s.x, 0, s.z, s.rot); k.box('iron', 0, 2.3, .06, 1.6, .16, .1); for (const sx of [-.5, .5]) { let y = 2.25; for (let i = 0; i < 5; i++) { k.geo(G.torusFat, 'steel', sx + r.range(-.03, .03), y, .12, .06, .08, .6, 0, (i % 2) * HPI); y -= .14; } k.ring('steel', sx, y - .04, .12, .1, true, 0, 0, 0, .025); } };
// ---- breached hull
P.girder = (k, x, z, rot) => {
  const r = B.rng; k.at(x, 0, z, rot); const lean = r.range(-.35, .35);
  k.bar('rust', 0, 0, 0, lean * 3, 3.2, .2, .3, .26).bar('rust', lean * 3, 3.2, .2, lean * 3 + 1.1, 3.9, .5, .26, .22).box('rust', lean * 1.5, 1.6, .1, .5, .06, .4, 0, 0, -lean);
  for (let i = 0; i < 3; i++) k.beam('rubber', lean * 3 + .5 + i * .2, 3.6, .4, lean * 3 + .5 + i * .2 + r.range(-.2, .2), r.range(2.2, 3), .4 + r.range(-.2, .2), .025, 4);
  const w = k.wp(lean * 3 + .9, 2.6, .4); B.emit('spark', w[0], w[1], w[2], 1, 2.5, 5, 9); B.obst(x, z, .34);
};
P.beacon = (k, x, z) => {
  k.at(x, 0, z, 0); k.cyl('iron', 0, 0, 0, .22, .2, 8).beam('iron', 0, .2, 0, 0, 1.5, 0, .05, 6).cyl('steel', 0, 1.5, 0, .14, .08, 8).sph('gRed', 0, 1.7, 0, .13).cyl('steel', 0, 1.82, 0, .14, .05, 8);
  B.light(x, 1.9, z, 1, .12, .08, 9, 9, .95); B.obst(x, z, .25);
};
P.tornEdge = (k, x, z, n = 7, rad = 1) => {    // jagged plates curling up around a breach in the deck
  const r = B.rng; k.at(x, 0, z, 0);
  for (let i = 0; i < n; i++) { const a = i / n * TAU + r.range(0, .5); k.tint(r.range(.5, .9)).geo(G.tet, 'floor', Math.cos(a) * rad, .1, Math.sin(a) * rad, r.range(.3, .55), r.range(.3, .6), .08, r.range(.3, 1.1), -a, r.range(-.4, .4)); }
  k.tint(1);
};
