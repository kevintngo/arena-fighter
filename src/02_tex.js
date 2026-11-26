// =====================================================================================
//  PROCEDURAL PBR TEXTURES  (colour / normal / roughness+metalness / emissive, all in code)
// =====================================================================================
const TEX = {};
const fr = x => x - Math.floor(x);
function dataTex(data, n, srgb) { return new Tex(data, n, n, { srgb, rep: true }); }
const _pl = { fx: 0, fy: 0, id: 0, dx: 0, dy: 0 };
function plateAt(x, y, nx, ny, seed, stagger) {
  const row = Math.floor(y); let xx = x; if (stagger && (row & 1)) xx += .5;
  const cx = Math.floor(xx);
  _pl.fx = xx - cx; _pl.fy = y - row; _pl.id = hash2i(wrapi(cx, nx), wrapi(row, ny), seed);
  _pl.dx = Math.min(_pl.fx, 1 - _pl.fx); _pl.dy = Math.min(_pl.fy, 1 - _pl.fy); return _pl;
}
const _vo = { f1: 0, f2: 0, id: 0, dx: 0, dy: 0 };
function voro(x, y, per, seed) {
  const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9, id = 0, ddx = 0, ddy = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, wx = wrapi(cx, per), wy = wrapi(cy, per);
    const px = cx + hash2i(wx, wy, seed), py = cy + hash2i(wx, wy, seed + 7);
    const ex = x - px, ey = y - py, d = Math.sqrt(ex * ex + ey * ey);
    if (d < f1) { f2 = f1; f1 = d; id = hash2i(wx, wy, seed + 13); ddx = ex; ddy = ey; } else if (d < f2) f2 = d;
  }
  _vo.f1 = f1; _vo.f2 = f2; _vo.id = id; _vo.dx = ddx; _vo.dy = ddy; return _vo;
}
function texSet(name, n, nStr, fn, hasE) {
  const N = n * n, H = new Float32Array(N), col = new Uint8Array(N * 4), orm = new Uint8Array(N * 4), nrm = new Uint8Array(N * 4);
  const em = hasE ? new Uint8Array(N * 4) : null;
  const o = { h: 0, r: 0, g: 0, b: 0, ro: .7, me: 0, er: 0, eg: 0, eb: 0, ao: 1 };
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    o.h = 0; o.ro = .7; o.me = 0; o.er = o.eg = o.eb = 0; o.ao = 1;
    fn((x + .5) / n, (y + .5) / n, o);
    H[i] = o.h; const j = i * 4, a = o.ao;
    col[j] = sat(o.r * a) * 255; col[j + 1] = sat(o.g * a) * 255; col[j + 2] = sat(o.b * a) * 255; col[j + 3] = 255;
    orm[j] = 255; orm[j + 1] = sat(o.ro) * 255; orm[j + 2] = sat(o.me) * 255; orm[j + 3] = 255;
    if (em) { em[j] = sat(o.er) * 255; em[j + 1] = sat(o.eg) * 255; em[j + 2] = sat(o.eb) * 255; em[j + 3] = 255; }
  }
  const sc = nStr * n / 256;
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    const xl = y * n + ((x + n - 1) % n), xr = y * n + ((x + 1) % n), yd = ((y + n - 1) % n) * n + x, yu = ((y + 1) % n) * n + x;
    const dx = (H[xr] - H[xl]) * sc, dy = (H[yu] - H[yd]) * sc, il = 1 / Math.sqrt(dx * dx + dy * dy + 1), j = i * 4;
    nrm[j] = (-dx * il * .5 + .5) * 255; nrm[j + 1] = (-dy * il * .5 + .5) * 255; nrm[j + 2] = (il * .5 + .5) * 255; nrm[j + 3] = 255;
  }
  TEX[name] = { map: dataTex(col, n, true), normalMap: dataTex(nrm, n, false), orm: dataTex(orm, n, false), emissiveMap: em ? dataTex(em, n, true) : null };
}

// each entry builds one texture set; run one per frame during boot
const TEX_JOBS = [
  () => texSet('iron', 512, 4.5, (u, v, o) => {
    const p = plateAt(u * 2, v * 4, 2, 4, 11, true);
    const dx = p.dx * 2, dy = p.dy, d = Math.min(dx, dy), seam = sstep(0, .045, d);
    const cy = dy - .13, rv = 1 - sstep(.035, .06, Math.hypot(dx - .13, cy));
    const ex = Math.abs(fr(p.fx * 4) - .5) * .5, rv2 = 1 - sstep(.03, .05, Math.hypot(ex, cy));
    const riv = Math.max(rv, rv2), nz = fbmT(u, v, 6, 6, 4, 3), fine = vnoise(u * 96, v * 96, 5, 96, 96), streak = fbmT(u, v, 28, 2, 3, 9);
    o.h = seam * .55 + riv * .45 + nz * .3 + fine * .06;
    let base = .36 + p.id * .07 + (nz - .5) * .16 - (1 - seam) * .2 + riv * .05; base *= 1 - sstep(.45, .9, streak) * .3;
    const rust = sstep(.6, .85, fbmT(u, v, 5, 5, 4, 21)) * (1 - sstep(0, .5, d));
    o.r = base * .92 + rust * .12; o.g = base * .97 + rust * .03; o.b = base * 1.12 - rust * .04;
    o.ro = .5 + nz * .32 + (1 - seam) * .15 - riv * .15 + rust * .2; o.me = .6 - rust * .3; o.ao = .7 + .3 * seam;
  }),
  () => texSet('deck', 512, 5, (u, v, o) => {
    const p = plateAt(u * 2, v * 2, 2, 2, 31, false), d = Math.min(p.dx, p.dy) * 2, seam = sstep(0, .06, d), pid = p.id, pdx = p.dx, pdy = p.dy;
    const q = plateAt(u * 4, v * 4, 4, 4, 37, false), groove = sstep(0, .03, Math.min(q.dx, q.dy));
    let tread = 0;
    if (pid > .45) {
      const tx = u * 40, ty = v * 40, cxn = Math.floor(tx), cyn = Math.floor(ty), lx = tx - cxn - .5, ly = ty - cyn - .5, flip = (cxn + cyn) & 1;
      const a = flip ? lx + ly : lx - ly, b = flip ? lx - ly : lx + ly;
      tread = (1 - sstep(.12, .2, Math.abs(a))) * (1 - sstep(.5, .62, Math.abs(b))) * sstep(.1, .2, d);
    }
    const bolt = 1 - sstep(.04, .07, Math.hypot(pdx * 2 - .16, pdy * 2 - .16));
    const nz = fbmT(u, v, 5, 5, 4, 41), fine = vnoise(u * 128, v * 128, 43, 128, 128);
    const scorch = sstep(.6, .8, fbmT(u, v, 3, 3, 4, 47)), oil = sstep(.66, .8, fbmT(u, v, 4, 4, 3, 53));
    o.h = seam * .5 + groove * .12 + tread * .3 + bolt * .35 + nz * .22 + fine * .05;
    let base = .38 + (pid - .5) * .08 + (nz - .5) * .14 - (1 - seam) * .22 - (1 - groove) * .06 + tread * .04;
    base *= 1 - scorch * .5; base *= 1 - oil * .25;
    const grime = (1 - sstep(0, .35, d)) * fbmT(u, v, 9, 9, 3, 59);
    o.r = base * .98 + grime * .05; o.g = base * .98 + grime * .03; o.b = base * 1.06;
    o.ro = .58 + nz * .25 + scorch * .2 - oil * .4 - tread * .1; o.me = .5 - scorch * .2; o.ao = .68 + .32 * seam * groove;
  }),
  () => texSet('brass', 256, 3.5, (u, v, o) => {
    const pat = fbmT(u, v, 4, 4, 5, 61), pt = sstep(.42, .7, pat);
    const dia = Math.abs(fr(u * 4) - .5) + Math.abs(fr(v * 4) - .5), emb = .5 + .5 * Math.cos(dia * TAU * 2), fine = vnoise(u * 80, v * 80, 63, 80, 80);
    o.h = emb * .35 + pat * .25 + fine * .08; const g0 = .62 + emb * .16 + fine * .06;
    o.r = lerp(g0 * 1.25, .2, pt * .85); o.g = lerp(g0 * .92, .22 + pat * .1, pt * .85); o.b = lerp(g0 * .38, .16 + pat * .1, pt * .85);
    o.ro = lerp(.28, .78, pt) + fine * .1; o.me = lerp(1, .55, pt); o.ao = .8 + emb * .2;
  }),
  () => texSet('relief', 256, 6, (u, v, o) => {
    const x = u - .5, y = v - .5, r = Math.hypot(x, y), a = Math.atan2(y, x), border = Math.max(Math.abs(x), Math.abs(y));
    let h = sstep(.47, .44, border) * .3 - (sstep(.40, .385, border) - sstep(.37, .355, border)) * .25;
    h += sstep(.35, .7, Math.cos(a * 12) * .5 + .5) * sstep(.33, .3, r) * sstep(.1, .14, r) * .35;
    h += sstep(.12, .1, r) * .5 - sstep(.06, .04, r) * .2;
    const st = Math.cos(a * 5 + HPI) * .5 + .5; h += sstep(.085 - st * .05, .07 - st * .05, r) * .25;
    h += sstep(.035, .01, Math.abs(r - .3)) * sstep(.2, .8, Math.sin(a * 24) * .5 + .5) * .3;
    h += sstep(.035, .02, Math.hypot(Math.abs(x) - .42, Math.abs(y) - .42)) * .4;
    const pat = fbmT(u, v, 4, 4, 4, 71), pt = sstep(.5, .78, pat) * (1 - sat(h) * .8);
    o.h = h + pat * .1; const g0 = .5 + h * .55;
    o.r = lerp(g0 * 1.25, .17, pt * .8); o.g = lerp(g0 * .92, .19, pt * .8); o.b = lerp(g0 * .36, .13, pt * .8);
    o.ro = lerp(.25, .75, pt); o.me = lerp(1, .6, pt); o.ao = .6 + sat(h) * .4;
  }),
  () => texSet('cloth', 128, 3, (u, v, o) => {
    const x = u * 32, y = v * 32, cx = Math.floor(x), cy = Math.floor(y), wx = Math.sin((x - cx) * PI), wy = Math.sin((y - cy) * PI);
    const h = ((cx + cy) & 1) ? wx * (.6 + .4 * wy) : wy * (.6 + .4 * wx) * .8, nz = fbmT(u, v, 6, 6, 3, 81);
    o.h = h * .7 + nz * .2; const c = .72 + h * .22 + (nz - .5) * .2; o.r = c; o.g = c; o.b = c; o.ro = .93; o.me = 0; o.ao = .75 + h * .25;
  }),
  () => texSet('stone', 256, 4, (u, v, o) => {
    const nz = fbmT(u, v, 4, 4, 5, 91), vr = voro(u * 5, v * 5, 5, 93), crack = sstep(0, .05, vr.f2 - vr.f1), fine = vnoise(u * 64, v * 64, 95, 64, 64);
    o.h = nz * .5 + crack * .3 + fine * .12; const c = .40 + (nz - .5) * .25 + fine * .06 - (1 - crack) * .16;
    o.r = c * .98; o.g = c * .98; o.b = c * 1.05; o.ro = .72 + nz * .2; o.me = .12; o.ao = .7 + crack * .3;
  }),
  () => texSet('rust', 256, 4.5, (u, v, o) => {
    const p = plateAt(u * 2, v * 2, 2, 2, 101, true), seam = sstep(0, .04, Math.min(p.dx, p.dy)), pid = p.id;
    const nz = fbmT(u, v, 5, 5, 5, 103), r2 = fbmT(u, v, 9, 9, 4, 105), rust = sstep(.38, .68, nz * .6 + r2 * .4 + (1 - seam) * .2), pit = vnoise(u * 90, v * 90, 107, 90, 90);
    o.h = seam * .4 + nz * .3 - rust * pit * .25; const m = .32 + pid * .05 + (nz - .5) * .1 - (1 - seam) * .15;
    o.r = lerp(m * .95, .50 + r2 * .14, rust); o.g = lerp(m, .25 + r2 * .1, rust); o.b = lerp(m * 1.1, .12 + r2 * .05, rust);
    o.ro = lerp(.55, .92, rust); o.me = lerp(.65, .15, rust); o.ao = .72 + seam * .28;
  }),
  () => texSet('resin', 256, 5, (u, v, o) => {
    const vr = voro(u * 6, v * 6, 6, 111), edge = vr.f2 - vr.f1, ridge = 1 - sstep(0, .16, edge), dome = 1 - sstep(0, .75, vr.f1), nz = fbmT(u, v, 8, 8, 4, 113);
    o.h = ridge * .6 + dome * .35 + nz * .15; const c = .22 + dome * .16 + nz * .1;
    o.r = c * 1.35 + ridge * .12; o.g = c * .75 + ridge * .08; o.b = c * .7 + ridge * .1;
    o.ro = .22 + ridge * .35 + nz * .15; o.me = .05; o.ao = .65 + dome * .35;
    const vein = sstep(.05, 0, edge); o.er = vein * .8; o.eg = vein * .8; o.eb = vein * .8;
  }, true),
  () => texSet('ice', 256, 4, (u, v, o) => {
    const nz = fbmT(u, v, 4, 4, 5, 121), rd = 1 - Math.abs(fbmT(u, v, 6, 6, 4, 123) * 2 - 1), vr = voro(u * 4, v * 4, 4, 125), crack = sstep(0, .03, vr.f2 - vr.f1);
    const sp = vnoise(u * 110, v * 110, 127, 110, 110);
    o.h = rd * .4 + nz * .3 + crack * .2 + sp * .1; const c = .6 + rd * .2 + (1 - crack) * .15 + (sp > .93 ? .15 : 0);
    o.r = c * .9; o.g = c * 1.02; o.b = c * 1.12; o.ro = .12 + nz * .4; o.me = 0; o.ao = .85 + crack * .15;
  }),
  () => texSet('crystal', 256, 5, (u, v, o) => {
    const vr = voro(u * 5, v * 5, 5, 131), ang = vr.id * TAU, tilt = Math.cos(ang) * vr.dx + Math.sin(ang) * vr.dy, edge = sstep(0, .05, vr.f2 - vr.f1), vid = vr.id;
    o.h = tilt * .5 + vid * .3 + edge * .2; const c = .16 + vid * .12;
    o.r = c * .55; o.g = c * 1.15; o.b = c * 1.4; o.ro = .1 + vid * .15; o.me = .25; o.ao = .7 + edge * .3;
    const gx = u * 16, gy = v * 16, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy; let t = 0;
    if (hash2i(ix, iy, 133) > .55 && Math.abs(fy - .5) < .07) t = 1; if (hash2i(ix, iy, 135) > .6 && Math.abs(fx - .5) < .07) t = 1;
    if (hash2i(ix, iy, 137) > .8 && Math.hypot(fx - .5, fy - .5) < .2) t = 1;
    o.er = t * .5; o.eg = t; o.eb = t;
  }, true),
  () => texSet('leaf', 256, 4, (u, v, o) => {
    const vr = voro(u * 7, v * 7, 7, 141), a = vr.id * TAU, lx = Math.cos(a) * vr.dx + Math.sin(a) * vr.dy, ly = -Math.sin(a) * vr.dx + Math.cos(a) * vr.dy;
    const rib = 1 - sstep(0, .05, Math.abs(ly)), veins = 1 - sstep(0, .12, Math.abs(fr(lx * 6 + Math.abs(ly) * 4) - .5));
    const edge = sstep(0, .1, vr.f2 - vr.f1), vid = vr.id, f1 = vr.f1, nz = fbmT(u, v, 6, 6, 3, 143);
    o.h = edge * .5 + rib * .25 + veins * .08 * edge + nz * .1 + (1 - f1) * .2; const c = .2 + vid * .16 + nz * .1, k = edge * .7 + .3;
    o.r = (c * .5 + rib * .06) * k; o.g = (c * 1.25 + rib * .1) * k; o.b = c * .55 * k; o.ro = .55 + nz * .2; o.me = 0; o.ao = .6 + edge * .4;
    const glow = vid > .8 ? sstep(.3, 0, f1) : 0; o.er = glow * .4; o.eg = glow; o.eb = glow * .8;
  }, true),
  () => texSet('bone', 128, 3, (u, v, o) => {
    const nz = fbmT(u, v, 5, 5, 4, 271), pore = vnoise(u * 50, v * 50, 273, 50, 50) > .8 ? 1 : 0;
    o.h = nz * .5 - pore * .3; const c = .74 + (nz - .5) * .2 - pore * .15; o.r = c; o.g = c * .95; o.b = c * .8; o.ro = .6 + nz * .2; o.me = 0;
  }),
  () => texSet('rubber', 64, 3, (u, v, o) => { const nz = fbmT(u, v, 4, 4, 3, 275); o.h = .5 + .5 * Math.sin(v * 16 * TAU); const c = .075 + nz * .03 + o.h * .02; o.r = c; o.g = c; o.b = c * 1.1; o.ro = .8; o.me = 0; }),
  () => texSet('hazard', 256, 3, (u, v, o) => {
    const stripe = fr((u + v) * 4) < .5, nz = fbmT(u, v, 6, 6, 4, 151), chip = sstep(.62, .7, nz), fine = vnoise(u * 64, v * 64, 153, 64, 64);
    o.h = nz * .3 + fine * .1 - chip * .2;
    let r = stripe ? .85 : .09, g = stripe ? .62 : .09, b = stripe ? .08 : .1;
    r = lerp(r, .32, chip); g = lerp(g, .32, chip); b = lerp(b, .36, chip); const dirt = .75 + nz * .35;
    o.r = r * dirt; o.g = g * dirt; o.b = b * dirt; o.ro = .6 - chip * .15 + fine * .1; o.me = .2 + chip * .5;
  }),
  () => texSet('grate', 256, 6, (u, v, o) => {
    const gx = fr(u * 8), gy = fr(v * 8), bx = Math.min(gx, 1 - gx), by = Math.min(gy, 1 - gy);
    const bar = Math.max(1 - sstep(.1, .2, bx), (1 - sstep(.06, .14, by)) * .8);
    const fd = Math.min(Math.min(u, 1 - u), Math.min(v, 1 - v)), frm = 1 - sstep(.03, .05, fd), top = Math.max(bar, frm), nz = fbmT(u, v, 6, 6, 3, 163);
    o.h = top * .9 + nz * .1; const c = lerp(.035, .36 + (nz - .5) * .12, top);
    o.r = c * .97; o.g = c; o.b = c * 1.1; o.ro = lerp(.9, .5 + nz * .2, top); o.me = lerp(.1, .65, top); o.ao = .4 + top * .6;
  }),
  () => texSet('crate', 256, 5, (u, v, o) => {
    const bx = Math.min(u, 1 - u), by = Math.min(v, 1 - v), b = Math.min(bx, by), frame = 1 - sstep(.09, .11, b);
    const diag = (1 - sstep(.04, .06, Math.abs(u - v) * .707)) * (1 - frame), corner = (bx < .2 && by < .2) ? 1 : 0;
    const plank = sstep(.5, .46, Math.abs(fr(v * 4) - .5)), nz = fbmT(u, v, 5, 5, 4, 171), grain = fbmT(u, v, 2, 24, 3, 173);
    const rivet = 1 - sstep(.1, .16, Math.hypot(fr(u * 8) - .5, fr(v * 8) - .5)), metal = Math.max(frame, diag, corner);
    o.h = metal * .55 + (1 - metal) * plank * .25 + nz * .12 + (metal > .5 ? rivet * .2 : 0);
    const pc = .32 + grain * .14 + (nz - .5) * .08, mc = .28 + (nz - .5) * .12;
    o.r = lerp(pc * 1.02, corner ? .62 : mc * .95, metal); o.g = lerp(pc, corner ? .46 : mc, metal); o.b = lerp(pc * .78, corner ? .2 : mc * 1.12, metal);
    if (metal < .5 && u > .55 && u < .85 && v > .58 && v < .78 && hash2i(Math.floor(u * 40), Math.floor(v * 40), 177) > .35) { o.r = .75; o.g = .7; o.b = .55; }
    o.ro = lerp(.85, .5, metal); o.me = lerp(0, corner ? .95 : .7, metal); o.ao = .75 + .25 * plank;
  }),
  () => texSet('drum', 256, 4, (u, v, o) => {
    const rib = Math.max(1 - sstep(0, .03, Math.abs(v - .33)), 1 - sstep(0, .03, Math.abs(v - .67)), 1 - sstep(0, .04, Math.min(v, 1 - v)));
    const nz = fbmT(u, v, 6, 6, 4, 181), chip = sstep(.6, .68, nz + rib * .1), band = v > .42 && v < .58, st = fr(u * 8 + v * 3) < .5;
    o.h = rib * .6 + nz * .2 - chip * .12; let r = .52, g = .16, b = .1; if (band) { r = st ? .85 : .08; g = st ? .62 : .08; b = st ? .08 : .09; }
    r = lerp(r, .3, chip); g = lerp(g, .3, chip); b = lerp(b, .33, chip); const dirt = .7 + nz * .4;
    o.r = r * dirt; o.g = g * dirt; o.b = b * dirt; o.ro = .55 - chip * .15; o.me = .3 + chip * .5; o.ao = .8 + rib * .2;
  }),
  () => texSet('marble', 512, 2.5, (u, v, o) => {
    const p = plateAt(u * 2, v * 2, 2, 2, 191, false), d = Math.min(p.dx, p.dy) * 2, joint = sstep(0, .03, d);
    const dark = (Math.floor(u * 2) + Math.floor(v * 2)) & 1, w = fbmT(u, v, 3, 3, 4, 193);
    const vein = 1 - sstep(0, .08, Math.abs(Math.sin((u * 3 + v * 2 + w * 2.2) * TAU))), vein2 = 1 - sstep(0, .04, Math.abs(Math.sin((u * 5 - v * 4 + w * 3) * TAU + 1.3)));
    const inlay = (1 - sstep(.05, .07, d)) * joint, nz = fbmT(u, v, 8, 8, 3, 195);
    o.h = joint * .3 + nz * .04; let r, g, b;
    if (dark) { const c = .11 + nz * .05 + vein * .16 + vein2 * .08; r = c * 1.05; g = c * .95; b = c * 1.1; }
    else { const c = .5 + nz * .1 - vein * .2 - vein2 * .08; r = c * 1.05; g = c * .98; b = c * .88; }
    if (inlay > .5) { r = .7; g = .5; b = .2; }
    const k = joint * .8 + .2; o.r = r * k; o.g = g * k; o.b = b * k;
    o.ro = inlay > .5 ? .3 : .1 + nz * .12 + vein * .05; o.me = inlay > .5 ? 1 : .05;
  }),
  () => texSet('hull', 256, 3, (u, v, o) => {
    const hatch = fr((u + v) * 12) < .16 ? 1 : 0, nz = fbmT(u, v, 5, 5, 4, 197); o.h = nz * .3 + hatch * .12;
    const c = .17 + hatch * .09 + nz * .05; o.r = c * .92; o.g = c; o.b = c * 1.22; o.ro = .85; o.me = .2;
  }),
  () => texSet('panel', 512, 4.5, (u, v, o) => {
    const p = plateAt(u * 2, v * 2, 2, 2, 201, false), dx = p.dx * 2, dy = p.dy * 2, d = Math.min(dx, dy), seam = sstep(0, .05, d), inset = sstep(.22, .26, d), pid = p.id, lx = p.fx, ly = p.fy;
    const lou = (pid > .55 && inset > .5 && dx > .45) ? (fr(v * 20) < .5 ? 1 : 0) : 0;
    const nz = fbmT(u, v, 6, 6, 4, 203), fine = vnoise(u * 100, v * 100, 205, 100, 100), bolt = 1 - sstep(.035, .06, Math.hypot(dx - .12, dy - .12));
    o.h = seam * .5 - inset * .18 + lou * .22 + bolt * .3 + nz * .15 + fine * .04;
    const c = .35 + (pid - .5) * .06 + (nz - .5) * .1 - (1 - seam) * .2 - inset * .05 - lou * .1;
    o.r = c * .93; o.g = c * .99; o.b = c * 1.1; o.ro = .45 + nz * .25 + lou * .2; o.me = .55; o.ao = .7 + seam * .3 - lou * .15;
    let e = 0; if (pid < .5 && ly > .8 && ly < .86 && lx > .12 && lx < .4 && fr(lx * 14) < .6) e = 1; if (pid > .75 && Math.hypot(lx - .5, ly - .5) < .035) e = 1;
    o.er = e; o.eg = e; o.eb = e;
  }, true),
  () => texSet('gilded', 512, 4, (u, v, o) => {
    const p = plateAt(u * 2, v * 2, 2, 2, 211, false), d = Math.min(p.dx, p.dy) * 2, frame = 1 - sstep(.1, .13, d), inner = sstep(.2, .22, d) - sstep(.25, .27, d);
    const x = p.fx - .5, y = p.fy - .5, r = Math.hypot(x, y), a = Math.atan2(y, x);
    const rose = (1 - sstep(0, .02, Math.abs(r - (.2 + .05 * Math.cos(a * 8))))) + (1 - sstep(.05, .07, r)), gold = sat(Math.max(frame, inner, rose));
    const nz = fbmT(u, v, 5, 5, 4, 213), dam = fbmT(u, v, 10, 10, 3, 215), damask = sstep(.45, .6, Math.sin(u * 16 * TAU) * Math.sin(v * 16 * TAU) * .5 + .5) * .06;
    o.h = gold * .5 + nz * .12 + frame * .15; const pt = sstep(.5, .8, dam);
    const gr = lerp(.72, .2, pt * .7), gg = lerp(.52, .2, pt * .7), gb = lerp(.2, .14, pt * .7), vc = .14 + nz * .06 + damask;
    o.r = lerp(vc * 1.9, gr, gold); o.g = lerp(vc * .5, gg, gold); o.b = lerp(vc * .6, gb, gold);
    o.ro = lerp(.55, .3 + pt * .4, gold); o.me = lerp(0, 1 - pt * .4, gold); o.ao = .75 + gold * .25;
  }),
  () => texSet('ashlar', 512, 4.5, (u, v, o) => {
    const p = plateAt(u * 2, v * 4, 2, 4, 221, true), d = Math.min(p.dx * 2, p.dy), mortar = sstep(0, .05, d), pid = p.id, pfx = p.fx, pfy = p.fy;
    const nz = fbmT(u, v, 6, 6, 5, 223), fine = vnoise(u * 90, v * 90, 225, 90, 90), chip = sstep(.7, .8, fbmT(u, v, 12, 12, 3, 227)) * (1 - sstep(0, .2, d));
    const star = pid > .8 ? (1 - sstep(.04, .06, Math.hypot(pfx - .5, (pfy - .5) * .5))) : 0;
    o.h = mortar * .55 + nz * .3 + fine * .08 - chip * .3 + star * .2; const c = .38 + (pid - .5) * .1 + (nz - .5) * .2 - (1 - mortar) * .2;
    o.r = lerp(c * .95, .75, star); o.g = lerp(c * .97, .56, star); o.b = lerp(c * 1.12, .25, star);
    o.ro = lerp(.8, .3, star); o.me = lerp(.05, 1, star); o.ao = .68 + mortar * .32;
  }),
  () => texSet('moss', 256, 4.5, (u, v, o) => {
    const p = plateAt(u * 2, v * 2, 2, 2, 231, true), seam = sstep(0, .04, Math.min(p.dx, p.dy)), pid = p.id;
    const nz = fbmT(u, v, 5, 5, 5, 233), m2 = fbmT(u, v, 10, 10, 4, 235), moss = sstep(.4, .62, nz * .55 + m2 * .45 + (1 - seam) * .25), tuft = vnoise(u * 70, v * 70, 237, 70, 70);
    o.h = seam * .4 + nz * .2 + moss * tuft * .5; const m = .32 + pid * .05 - (1 - seam) * .15;
    o.r = lerp(m * .94, .1 + tuft * .1, moss); o.g = lerp(m, .26 + tuft * .2, moss); o.b = lerp(m * 1.1, .1 + tuft * .06, moss);
    o.ro = lerp(.55, .95, moss); o.me = lerp(.6, 0, moss); o.ao = .72 + seam * .28;
  }),
  () => texSet('datafloor', 512, 3.5, (u, v, o) => {
    const p = plateAt(u * 2, v * 2, 2, 2, 241, false), seam = sstep(0, .04, Math.min(p.dx, p.dy) * 2), pid = p.id, nz = fbmT(u, v, 6, 6, 4, 243);
    const gx = u * 32, gy = v * 32, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy; let t = 0;
    const gx2 = u * 8, gy2 = v * 8, jx = Math.floor(gx2), jy = Math.floor(gy2), hx = gx2 - jx, hy = gy2 - jy;
    if (hash2i(jx, jy, 245) > .62 && Math.abs(hy - .5) < .035) t = 1; if (hash2i(jx, jy, 247) > .66 && Math.abs(hx - .5) < .035) t = 1;
    if (hash2i(ix, iy, 249) > .965 && Math.hypot(fx - .5, fy - .5) < .3) t = 1; t *= seam;
    o.h = seam * .4 + nz * .08 - t * .1; const c = .14 + (pid - .5) * .04 + (nz - .5) * .05 - (1 - seam) * .08;
    o.r = c * .8; o.g = c * 1.05; o.b = c * 1.3; o.ro = .14 + nz * .15; o.me = .4; o.ao = .8 + seam * .2; o.er = t * .5; o.eg = t; o.eb = t;
  }, true),
  () => texSet('soil', 256, 4.5, (u, v, o) => {
    const nz = fbmT(u, v, 4, 4, 5, 251), m2 = fbmT(u, v, 9, 9, 4, 253), vr = voro(u * 6, v * 6, 6, 255), vid = vr.id;
    const stone = vid > .55 ? sstep(.04, .1, vr.f2 - vr.f1) : 0, moss = sstep(.45, .62, m2) * (1 - stone * .6), tuft = vnoise(u * 80, v * 80, 257, 80, 80);
    o.h = stone * .5 + nz * .3 + moss * tuft * .3; let r = .2 + nz * .1, g = .15 + nz * .07, b = .1 + nz * .05;
    if (stone > 0) { const c = .32 + vid * .1; r = lerp(r, c, stone); g = lerp(g, c, stone); b = lerp(b, c * 1.08, stone); }
    o.r = lerp(r, .09 + tuft * .08, moss); o.g = lerp(g, .24 + tuft * .16, moss); o.b = lerp(b, .09 + tuft * .05, moss);
    o.ro = .85 - stone * .2; o.me = 0; o.ao = .75 + stone * .25;
  }),
  () => texSet('ooze', 128, 3, (u, v, o) => {
    const nz = fbmT(u, v, 4, 4, 4, 261), vr = voro(u * 5, v * 5, 5, 263), bub = 1 - sstep(.1, .3, vr.f1);
    o.h = nz * .5 + bub * .5; const c = .55 + nz * .3 + bub * .2; o.r = c; o.g = c; o.b = c; o.ro = .12 + nz * .15; o.me = 0;
  }),
  () => texSet('steel', 256, 3, (u, v, o) => {
    const nz = fbmT(u, v, 5, 5, 4, 281), scr = fbmT(u, v, 3, 60, 3, 283), fine = vnoise(u * 120, v * 120, 285, 120, 120);
    o.h = nz * .3 + scr * .15 + fine * .08; const c = .4 + (nz - .5) * .14 + (scr - .5) * .08; o.r = c * .95; o.g = c * .98; o.b = c * 1.08; o.ro = .38 + nz * .25 + scr * .1; o.me = .72;
  }),
  () => texSet('armor', 256, 4, (u, v, o) => {
    const nz = fbmT(u, v, 5, 5, 5, 291), chip = sstep(.55, .63, nz), p = plateAt(u * 3, v * 3, 3, 3, 293, true), seam = sstep(0, .05, Math.min(p.dx, p.dy)), fine = vnoise(u * 100, v * 100, 295, 100, 100);
    o.h = seam * .5 + nz * .2 - chip * .12 + fine * .05; const pc = .66 + (nz - .5) * .12, s2 = .55 + seam * .45;
    o.r = lerp(pc, .3, chip) * s2; o.g = lerp(pc * .96, .31, chip) * s2; o.b = lerp(pc * .86, .35, chip) * s2; o.ro = lerp(.42, .3, chip) + fine * .1; o.me = lerp(.25, .9, chip);
  }),
  () => makeCanvasTextures()
];

// ------------------------------------------------------------------ canvas-drawn textures
function makeCanvasTextures() {
  const r = new RNG(90210);
  { // 4x4 black / white placeholders
    const b = new Uint8Array(64); for (let i = 0; i < 64; i += 4) b[i + 3] = 255; TEX.black = dataTex(b, 4, true);
    const w = new Uint8Array(64).fill(255); TEX.white = dataTex(w, 4, true);
  }
  { // banners of the fallen houses: 6 x (128x256)
    const c = document.createElement('canvas'); c.width = 768; c.height = 256; const g = c.getContext('2d');
    const houses = [['#7a1218', '#d9a441'], ['#16254f', '#b9c4d6'], ['#141416', '#c9973a'], ['#3b1d5a', '#d8cfb4'], ['#0f4a4a', '#c08a3a'], ['#b8ae98', '#7a1218']];
    houses.forEach((hc, i) => {
      const x0 = i * 128; g.save(); g.translate(x0, 0); g.beginPath();
      g.moveTo(4, 0); g.lineTo(124, 0); g.lineTo(124, 214);
      if (i % 2 === 0) { g.lineTo(64, 248); g.lineTo(4, 214); } else { g.lineTo(94, 250); g.lineTo(64, 216); g.lineTo(34, 250); g.lineTo(4, 214); }
      g.closePath(); g.clip();
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, hc[0]); gr.addColorStop(1, '#0a0a0c'); g.fillStyle = hc[0]; g.fillRect(0, 0, 128, 256);
      g.globalAlpha = .55; g.fillStyle = gr; g.fillRect(0, 0, 128, 256); g.globalAlpha = 1;
      g.strokeStyle = hc[1]; g.lineWidth = 5; g.strokeRect(12, 8, 104, 196); g.lineWidth = 2; g.strokeRect(19, 15, 90, 182);
      g.fillStyle = hc[1]; g.strokeStyle = hc[1]; g.translate(64, 96);
      if (i === 0) { g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill(); g.lineWidth = 4; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 23, Math.sin(a) * 23); g.lineTo(Math.cos(a) * (k % 2 ? 31 : 38), Math.sin(a) * (k % 2 ? 31 : 38)); g.stroke(); } }
      else if (i === 1) { g.beginPath(); g.moveTo(0, -46); g.lineTo(7, -30); g.lineTo(5, 28); g.lineTo(-5, 28); g.lineTo(-7, -30); g.closePath(); g.fill(); g.fillRect(-20, 28, 40, 6); g.fillRect(-4, 34, 8, 16); g.beginPath(); g.arc(0, 54, 6, 0, TAU); g.fill(); }
      else if (i === 2) { g.beginPath(); g.moveTo(-30, 18); g.lineTo(-34, -22); g.lineTo(-17, -4); g.lineTo(0, -32); g.lineTo(17, -4); g.lineTo(34, -22); g.lineTo(30, 18); g.closePath(); g.fill(); g.fillRect(-30, 23, 60, 7); }
      else if (i === 3) { g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, 36, 19, 0, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.fillRect(Math.cos(a) * 46 - 2, Math.sin(a) * 34 - 2, 4, 4); } }
      else if (i === 4) { g.lineWidth = 7; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-34, -24 + k * 22); g.lineTo(0, 0 + k * 22 - 6); g.lineTo(34, -24 + k * 22); g.stroke(); } }
      else { g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.fill(); g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 40, 10, -.4, 0, TAU); g.stroke(); }
      g.translate(-64, -96);
      for (let k = 0; k < 26; k++) { g.globalAlpha = r.range(.06, .22); g.fillStyle = '#000'; g.beginPath(); g.ellipse(r.range(0, 128), r.range(0, 256), r.range(5, 26), r.range(8, 44), r.range(0, 3), 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out';
      const tat = i === 5 ? 16 : 8;
      for (let k = 0; k < tat; k++) { const tx = r.range(4, 124), th = r.range(18, i === 5 ? 110 : 64), tw = r.range(4, 13); g.beginPath(); g.moveTo(tx - tw, 256); g.lineTo(tx + r.range(-5, 5), 256 - th - 30); g.lineTo(tx + tw, 256); g.fill(); }
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(r.range(20, 108), r.range(40, 200), r.range(2, 8), r.range(3, 13), r.range(0, 3), 0, TAU); g.fill(); }
      g.restore();
    });
    TEX.banners = new Tex(c, 0, 0, { srgb: true, flip: true });
  }
  { // console screens: 4 x (64x64)
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    const cols = ['#ffb347', '#59e0ff', '#7dff9a', '#ff5a4a'];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#030a0d'; g.fillRect(i * 64, 0, 64, 64); g.fillStyle = cols[i];
      for (let y = 5; y < 44; y += 5) { let x = 4; while (x < 56) { const w = r.int(2, 11); if (r.chance(.75)) { g.globalAlpha = r.range(.45, 1); g.fillRect(i * 64 + x, y, Math.min(w, 60 - x), 2); } x += w + 2; } }
      g.globalAlpha = 1; g.beginPath(); g.strokeStyle = cols[i]; g.lineWidth = 1.5;
      for (let x = 4; x < 60; x += 4) { const y = 54 - r.range(0, 9) - (x > 30 && x < 42 ? 6 : 0); if (x === 4) g.moveTo(i * 64 + x, y); else g.lineTo(i * 64 + x, y); } g.stroke();
      g.globalAlpha = .35; for (let y = 0; y < 64; y += 2) { g.fillStyle = '#000'; g.fillRect(i * 64, y, 64, 1); } g.globalAlpha = 1;
    }
    TEX.screens = new Tex(c, 0, 0, { srgb: true, flip: true, nearest: true });
  }
  { // star-glyph atlas 4x4 of 64px
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 16; i++) {
      const ox = (i % 4) * 64 + 32, oy = Math.floor(i / 4) * 64 + 32; g.lineWidth = 4;
      const pts = []; for (let k = 0; k < 9; k++) pts.push([ox + ((k % 3) - 1) * 17, oy + (Math.floor(k / 3) - 1) * 17]);
      let cur = r.int(0, 8); g.beginPath(); g.moveTo(pts[cur][0], pts[cur][1]);
      for (let k = 0; k < r.int(3, 5); k++) { let nx = r.int(0, 8); if (nx === cur) nx = (nx + 4) % 9; g.lineTo(pts[nx][0], pts[nx][1]); cur = nx; } g.stroke();
      if (r.chance(.6)) { g.lineWidth = 3; g.beginPath(); g.arc(ox, oy, 25, r.range(0, 3), r.range(3.5, 6)); g.stroke(); }
      for (let k = 0; k < 2; k++) { const p = r.pick(pts); g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill(); }
    }
    TEX.glyphs = new Tex(c, 0, 0, { srgb: true, flip: true });
  }
  { // goo / scorch splat
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const blob = (x, y, rad) => { const gr = g.createRadialGradient(x, y, rad * .35, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.8, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); };
    blob(64, 64, 34); for (let k = 0; k < 9; k++) { const a = r.range(0, TAU), d = r.range(18, 34); blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r.range(9, 20)); }
    for (let k = 0; k < 12; k++) { const a = r.range(0, TAU), d = r.range(40, 58); blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r.range(2, 6)); }
    TEX.splat = new Tex(c, 0, 0, { srgb: true, flip: true });
  }
  { // soft radial falloff
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(.7, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); TEX.soft = new Tex(c, 0, 0, { srgb: true, flip: true });
  }
}

// =====================================================================================
//  MATERIAL LIBRARY
// =====================================================================================
const MATS = {};      // key -> { m, uvS (world units per repeat; 0 = keep mesh uv), cast, recv, order }
function regMat(key, m, uvS = 2, cast = true, recv = true, order = 0) { MATS[key] = { m, uvS, cast, recv, order }; return m; }
function std(tex, opts = {}) {
  return new MeshStandardMaterial(Object.assign({ map: tex.map, normalMap: tex.normalMap, roughnessMap: tex.orm, roughness: 1, metalness: 1, vertexColors: true, envMapIntensity: .55 }, tex.emissiveMap ? { emissiveMap: tex.emissiveMap } : {}, opts));
}
const GLSL_NOISE = `
float fh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float fn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(fh(i),fh(i+vec2(1.,0.)),f.x), mix(fh(i+vec2(0.,1.)),fh(i+vec2(1.,1.)),f.x), f.y); }
float ffbm(vec2 p){ return fn(p)*.5 + fn(p*2.13+7.)*.3 + fn(p*4.7+19.)*.2; }
`;
// floor uniforms are shared so a theme switch is just a uniform update
const FLOOR_U = { uPuddle: { value: .3 }, uPudCol: { value: new Color(.02, .03, .04) }, uBaseRefl: { value: .05 }, uFx: { value: 0 }, uFxCol: { value: new Color(.3, .8, 1) } };
// forward PBR: GGX direct light (8 point lights, shadowed lantern + spot, moon), hemisphere + analytic environment
const STD_FS = `
in vec3 vW; in vec3 vN; in vec2 vUv; in vec3 vC;
uniform sampler2D map, normalMap, orm, emissiveMap; uniform samplerCube tCube; uniform sampler2DShadow tSpot;
uniform vec3 uColor, uEmissive, uCamDir, uSky, uGnd, uMoonDir, uMoonCol, uSpotPos, uSpotDir, uSpotCol, uPudCol, uFxCol;
uniform vec4 uRM, uPLp[8], uPLc[8], uSpotP; uniform mat4 uSpotM; uniform float uCube, uTime, uATest, uPuddle, uBaseRefl, uFx;
out vec4 o;
${GLSL_NOISE}
vec3 N, V, dif, F0; float a2, nv;
vec3 lit(vec3 L, vec3 rad){
  float nl = dot(N, L); if (nl <= 0.) return vec3(0.);
  vec3 H = normalize(L + V); float nh = max(dot(N, H), 0.), vh = max(dot(V, H), 0.), d = nh*nh*(a2 - 1.) + 1.;
  float vis = .5/max(nl*sqrt(a2 + (1. - a2)*nv*nv) + nv*sqrt(a2 + (1. - a2)*nl*nl), 1e-5), f = exp2((-5.55473*vh - 6.98316)*vh);
  return (dif*.31831 + (F0*(1. - f) + f)*(a2/(3.14159*d*d))*vis)*rad*nl;
}
float cubeSh(vec3 lv, float dl){
  float r = dl*.985 - .05, s = dl*.011; vec3 e1 = normalize(cross(lv, vec3(.31, .93, .2))), e2 = normalize(cross(lv, e1));
  return (step(r, texture(tCube, lv).r*uCube) + step(r, texture(tCube, lv + (e1 + e2)*s).r*uCube) + step(r, texture(tCube, lv + (e1 - e2)*s).r*uCube) + step(r, texture(tCube, lv - (e1 + e2)*s).r*uCube) + step(r, texture(tCube, lv - (e1 - e2)*s).r*uCube))*.2;
}
vec3 envC(vec3 d, float r){
  return mix(vec3(.018, .02, .028), vec3(.15, .19, .3), pow(d.y*.5 + .5, 1.5)) + vec3(.385, .224, .084)*pow(max(0., dot(d, vec3(.7317, .3049, .6097))), mix(5., 1., r))*mix(1., .4, r)
    + vec3(.2, .3, .55)*pow(max(0., dot(d, vec3(-.8137, .465, -.3487))), mix(9., 1.5, r))*mix(1., .3, r);
}
void main(){
  vec4 tx = texture(map, vUv); float al = tx.a*uRM.z;
#ifdef ATEST
  if (tx.a < uATest) discard; al = 1.;
#endif
  vec3 alb = tx.rgb*uColor*vC, mr = texture(orm, vUv).rgb; float ro = uRM.x*mr.g, me = clamp(uRM.y*mr.b, 0., 1.), fd = gl_FrontFacing ? 1. : -1.;
  vec3 Ng = normalize(vN)*fd, q0 = dFdx(vW), q1 = dFdy(vW); vec2 s0 = dFdx(vUv), s1 = dFdy(vUv); vec3 q1p = cross(q1, Ng), q0p = cross(Ng, q0), T = q1p*s0.x + q0p*s1.x, B = q1p*s0.y + q0p*s1.y;
  float det = max(dot(T, T), dot(B, B)), sc = det == 0. ? 0. : fd*inversesqrt(det); vec3 nt = texture(normalMap, vUv).xyz*2. - 1.;
  N = normalize(T*(nt.x*sc) + B*(nt.y*sc) + Ng*nt.z);
#ifdef V_FLOOR
  alb *= .8 + .4*ffbm(vW.xz*.13 + 11.);
  float pud = uPuddle <= .001 ? 0. : smoothstep(.8 - uPuddle*.6, .86 - uPuddle*.6, ffbm(vW.xz*.21 + 3.7));
  alb = mix(alb, uPudCol, pud*.8);
  if (uFx > .5 && uFx < 1.5){ vec2 cp = vW.xz*1.3; float ca = pow(abs(sin(cp.x*1.7 + sin(cp.y*1.3 + uTime*.9)*1.6 + uTime*.5)), 8.) + pow(abs(sin(cp.y*1.9 + sin(cp.x*1.1 - uTime*.7)*1.8 - uTime*.4)), 8.); alb *= 1. + ca*1.4; alb += uFxCol*ca*.012; }
  else if (uFx > 1.5 && uFx < 2.5){ float fr = smoothstep(.42, .75, ffbm(vW.xz*.6 + 40.)), sp = step(.965, fh(floor(vW.xz*22.))); alb = mix(alb, vec3(.55, .68, .78), fr*.6) + sp*fr*.25; }
  ro = mix(ro, .035, pud); me = mix(me, 0., pud*.7); N = normalize(mix(N, Ng, pud));
  al = 1. - clamp(max(pud*.85, uBaseRefl*(1. - ro)), 0., .95);
#endif
#ifdef V_WALL
  alb *= (.78 + .44*ffbm(vec2(vW.x + vW.z, vW.y*1.7)*.16 + 5.))*(.62 + .38*smoothstep(0., .9, vW.y));
#endif
  ro = clamp(ro, .0525, 1.); a2 = ro*ro; a2 *= a2; V = uCamDir; nv = clamp(dot(N, V), .001, 1.); dif = alb*(1. - me); F0 = mix(vec3(.04), alb, me);
  vec3 col = dif*.31831*mix(uGnd, uSky, N.y*.5 + .5) + lit(uMoonDir, uMoonCol), ps = vW + Ng*.035;
  for (int i = 0; i < 8; i++){
    vec4 lc = uPLc[i]; if (lc.r + lc.g + lc.b <= 0.) continue;
    vec3 d = uPLp[i].xyz - vW; float dl = length(d), w = dl/uPLp[i].w; w *= w; w = clamp(1. - w*w, 0., 1.); if (w <= 0.) continue;
    float att = w*w/max(pow(dl, lc.a), .01); if (i == 0 && uCube > 0.){ vec3 lv = ps - uPLp[0].xyz; att *= cubeSh(lv, length(lv)); }
    col += lit(d/dl, lc.rgb*att);
  }
  if (uSpotP.w > .5){
    vec3 d = uSpotPos - vW; float dl = length(d); vec3 L = d/dl; float w = dl/uSpotP.z; w *= w; w = clamp(1. - w*w, 0., 1.)*smoothstep(uSpotP.x, uSpotP.y, dot(-L, uSpotDir));
    if (w > 0.){ vec4 s4 = uSpotM*vec4(ps, 1.); vec3 sp = s4.xyz/s4.w*.5 + .5; float sh = sp.x < 0. || sp.x > 1. || sp.y < 0. || sp.y > 1. ? 1. : texture(tSpot, vec3(sp.xy, sp.z - .0006)); col += lit(L, uSpotCol*(w*w*sh/max(pow(dl, 1.2), .01))); }
  }
  vec4 r4 = ro*vec4(-1., -.0275, -.572, .022) + vec4(1., .0425, 1.04, -.04); vec2 ab = vec2(-1.04, 1.04)*(min(r4.x*r4.x, exp2(-9.28*nv))*r4.x + r4.y) + r4.zw;
  col += (dif*envC(N, 1.) + (F0*ab.x + ab.y)*envC(reflect(-V, N), ro))*uRM.w;
  vec3 em = uEmissive*texture(emissiveMap, vUv).rgb;
#ifdef V_PULSE
  em *= .55 + .45*sin(uTime*2.2 + vW.x*.9 + vW.z*.7);
#endif
  o = vec4(col + em, al);
}`;
function patchMaterial(m, kind) { m.variant = kind; return m; }
const GLOW = .4;
function glowMat(r, g, b) { const m = new MeshBasicMaterial({ vertexColors: true }); m.color.setRGB(r * GLOW, g * GLOW, b * GLOW); return m; }
const ADD_BLEND = { blend: 1 }, SOFT_BLEND = { blend: 2 };
const SKY_U = { tSky: { value: null }, uInvRes: { value: new Vector2(1, 1) } };

function initMaterials() {
  regMat('iron', std(TEX.iron), 4);
  regMat('steel', std(TEX.steel), 2);
  regMat('brass', std(TEX.brass, { envMapIntensity: .9 }), 2);
  regMat('relief', std(TEX.relief, { envMapIntensity: .9 }), 0);
  regMat('stone', std(TEX.stone), 3);
  regMat('bronze', std(TEX.stone, { color: new Color(.75, .6, .42), metalness: 5, roughness: .7 }), 3);
  regMat('rust', std(TEX.rust), 3);
  regMat('bone', std(TEX.bone), 1);
  regMat('rubber', std(TEX.rubber), 1);
  regMat('hazard', std(TEX.hazard), 2);
  regMat('grate', std(TEX.grate), 2);
  regMat('crate', std(TEX.crate), 0);
  regMat('drum', std(TEX.drum), 0);
  regMat('cloth', std(TEX.cloth, { side: DoubleSide }), .8);
  regMat('hull', std(TEX.hull), 2);
  regMat('ice', std(TEX.ice, { envMapIntensity: 1.1 }), 2.5);
  regMat('leaf', patchMaterial(std(TEX.leaf, { side: DoubleSide, emissive: new Color(.3, 1.5, 1.1) }), 'pulse'), 1.6);
  regMat('resin', patchMaterial(std(TEX.resin, { emissive: new Color(1, .32, 1.4) }), 'pulse'), 2.5);
  regMat('crystal', std(TEX.crystal, { emissive: new Color(.3, 1.6, 2), envMapIntensity: 1.2 }), 2);
  regMat('armor', std(TEX.armor), 1.2);
  regMat('ooze', patchMaterial(std(TEX.ooze, { emissive: new Color(0, 0, 0) }), 'ooze'), 1.2);
  regMat('marble', std(TEX.marble), 4);
  regMat('banner', patchMaterial(new MeshStandardMaterial({ map: TEX.banners, normalMap: TEX.cloth.normalMap, roughness: .95, metalness: 0, alphaTest: .5, side: DoubleSide, vertexColors: true }), 'banner'), 0);
  regMat('screen', new MeshStandardMaterial({ map: TEX.screens, emissiveMap: TEX.screens, emissive: new Color(1.5, 1.5, 1.5), roughness: .25, metalness: 0, vertexColors: true }), 0, false);
  regMat('glass', new MeshStandardMaterial(Object.assign({ color: new Color(.55, .75, .85), opacity: .2, roughness: .06, metalness: 0, vertexColors: true, envMapIntensity: 1.5 }, SOFT_BLEND)), 2, false, false, 5);
  // theme-mutated materials (textures / tints swapped per deck, programs shared)
  const wall = patchMaterial(std(TEX.panel, { emissive: new Color(0, 0, 0) }), 'wall'); regMat('wall', wall, 4);
  const floor = patchMaterial(std(TEX.datafloor, { emissive: new Color(0, 0, 0) }), 'floor'); regMat('floor', floor, 4, false);
  regMat('cap', std(TEX.hull), 2, false);
  regMat('trim', std(TEX.brass, { envMapIntensity: .9 }), 2);
  regMat('themeA', std(TEX.steel), 2);
  // glow materials (HDR unlit)
  regMat('gWarm', glowMat(6, 2.6, .7), 0, false, false);
  regMat('gHot', glowMat(9, 6, 2.6), 0, false, false);
  regMat('gCold', glowMat(1.2, 3, 6.5), 0, false, false);
  regMat('gCyan', glowMat(.5, 4, 5), 0, false, false);
  regMat('gRed', glowMat(6, .45, .25), 0, false, false);
  regMat('gGreen', glowMat(.6, 5, 1.2), 0, false, false);
  regMat('gViolet', glowMat(3.5, 1, 6), 0, false, false);
  regMat('gWhite', glowMat(4.5, 4.5, 4.5), 0, false, false);
  regMat('gDim', glowMat(1.5, .85, .3), 0, false, false);
  regMat('gAccent', glowMat(3, 3, 3), 0, false, false);
  regMat('gAccentDim', glowMat(1, 1, 1), 0, false, false);
  regMat('black', new MeshBasicMaterial({ color: new Color(0, 0, 0), vertexColors: true }), 0, false, false);
  // shader materials
  const vsCommon = `varying vec2 vUv; varying vec3 vCol; varying vec3 vWPos; uniform float uTime;`;
  regMat('flame', new ShaderMaterial(Object.assign({
    uniforms: { uTime }, vertexColors: true, side: DoubleSide,
    vertexShader: vsCommon + `void main(){ vUv = uv; vCol = color; vec3 p = position; vec4 w = modelMatrix*vec4(p,1.0);
      w.x += sin(uTime*7.0 + w.z*3.0 + w.y*2.0)*0.05*uv.y; w.z += cos(uTime*6.0 + w.x*3.0)*0.05*uv.y; vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: vsCommon + GLSL_NOISE + `void main(){ vec2 p = vUv; p.x = (p.x - .5)*2.; float sd = floor(vWPos.x*2.0) + floor(vWPos.z*2.0)*7.0;
      float n = fn(vec2(p.x*2.5 + sd, p.y*3. - uTime*3.4)); float n2 = fn(vec2(p.x*5. - sd, p.y*6. - uTime*5.5));
      float w = (1. - p.y)*(0.72 + 0.4*n); float d = abs(p.x + (n2 - .5)*0.55*p.y)/max(w, 0.001);
      float a = smoothstep(1., .15, d)*smoothstep(0., .1, p.y)*smoothstep(1., .5, p.y + (1. - n)*.32);
      vec3 col = vCol*.34*mix(vec3(1.7,1.5,1.2), vec3(1.), sat(d))*(1. + (1. - p.y)*1.4);
      gl_FragColor = vec4(col*a, 1.); }`.replace(/sat\(/g, 'clamp01(').replace('void main', 'float clamp01(float x){ return clamp(x,0.,1.); }\nvoid main')
  }, ADD_BLEND)), 0, false, false, 8);
  regMat('holo', new ShaderMaterial(Object.assign({
    uniforms: { uTime }, vertexColors: true, side: DoubleSide,
    vertexShader: vsCommon + `void main(){ vUv = uv; vCol = color; vec4 w = modelMatrix*vec4(position,1.0); vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: vsCommon + `void main(){ float a = (0.5 + 0.5*sin(vWPos.y*60. - uTime*7.))*(0.82 + 0.18*sin(uTime*23. + vWPos.x*3.));
      float e = smoothstep(0., .12, vUv.x)*smoothstep(1., .88, vUv.x); gl_FragColor = vec4(vCol*a*(0.35 + 0.65*e), 1.); }`
  }, ADD_BLEND)), 0, false, false, 8);
  regMat('field', new ShaderMaterial(Object.assign({
    uniforms: { uTime }, vertexColors: true, side: DoubleSide,
    vertexShader: vsCommon + `void main(){ vUv = uv; vCol = color; vec4 w = modelMatrix*vec4(position,1.0); vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: vsCommon + GLSL_NOISE + `void main(){ vec2 q = vec2(vWPos.x + vWPos.z, vWPos.y)*2.2; vec2 h = vec2(q.x + floor(q.y)*0.5, q.y);
      vec2 c = abs(fract(h) - .5); float hex = smoothstep(.36, .5, max(c.x, c.y));
      float sh = fn(q*0.7 + vec2(uTime*0.6, -uTime*0.9)); float band = pow(0.5 + 0.5*sin(vWPos.y*5.0 - uTime*2.4), 6.0);
      float e = 1.0 - smoothstep(0., .08, min(vUv.y, 1. - vUv.y));
      gl_FragColor = vec4(vCol*.65*(0.12 + hex*0.5 + sh*0.25 + band*0.5 + e*0.9), 1.); }`
  }, ADD_BLEND)), 0, false, false, 8);
  regMat('shaft', new ShaderMaterial(Object.assign({
    uniforms: { uTime }, vertexColors: true, side: DoubleSide,
    vertexShader: vsCommon + `void main(){ vUv = uv; vCol = color; vec4 w = modelMatrix*vec4(position,1.0); vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: vsCommon + GLSL_NOISE + `void main(){ float a = pow(vUv.y, 1.3)*sin(vUv.x*3.14159);
      a *= 0.45 + 0.55*fn(vec2(vWPos.x*0.9 + vWPos.z*0.7 + uTime*0.12, vWPos.y*0.7 - uTime*0.08)); a *= 0.6 + 0.4*fn(vWPos.xz*3.0 + uTime*0.3);
      gl_FragColor = vec4(vCol*a, 1.); }`
  }, ADD_BLEND)), 0, false, false, 7);
  regMat('portal', new ShaderMaterial({
    uniforms: SKY_U, vertexColors: true, side: DoubleSide,
    vertexShader: `varying vec3 vCol; void main(){ vCol = color; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tSky; uniform vec2 uInvRes; varying vec3 vCol; void main(){ vec3 c = texture2D(tSky, gl_FragCoord.xy*uInvRes).rgb; gl_FragColor = vec4(c*vCol*1.25 + vCol*0.012, 1.); }`
  }), 0, false, false);
  regMat('lava', new ShaderMaterial({
    uniforms: { uTime }, vertexColors: true,
    vertexShader: vsCommon + `void main(){ vUv = uv; vCol = color; vec4 w = modelMatrix*vec4(position,1.0); vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: vsCommon + GLSL_NOISE + `void main(){ vec2 q = vWPos.xz*0.9; float n = ffbm(q + vec2(uTime*0.08, uTime*0.05) + ffbm(q*1.7 - uTime*0.06)*1.2);
      float crust = smoothstep(.42, .62, n); vec3 hot = mix(vec3(4.5,1.6,.25), vec3(6.,4.,1.2), smoothstep(.2,.0,n));
      vec3 col = mix(hot, vec3(.25,.05,.02), crust)*vCol; gl_FragColor = vec4(col, 1.); }`
  }), 0, false, false);
  regMat('water', new ShaderMaterial(Object.assign({
    uniforms: { uTime }, vertexColors: true,
    vertexShader: vsCommon + `void main(){ vUv = uv; vCol = color; vec4 w = modelMatrix*vec4(position,1.0); vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: vsCommon + GLSL_NOISE + `void main(){ vec2 q = vWPos.xz; float r1 = fn(q*1.4 + vec2(uTime*0.35, uTime*0.2)); float r2 = fn(q*3.1 - vec2(uTime*0.4, -uTime*0.3));
      float glint = pow(r1*r2, 3.0)*1.6; vec3 col = vCol*(0.35 + 0.3*r1) + vec3(0.25,0.45,0.5)*glint; gl_FragColor = vec4(col, 0.42 + 0.2*r2); }`
  }, SOFT_BLEND)), 0, false, false, 4);
  regMat('pool', new MeshBasicMaterial(Object.assign({ map: TEX.soft, vertexColors: true, polygonOffset: true }, { blend: 3 })), 0, false, false, 3);
  regMat('glyph', new MeshBasicMaterial(Object.assign({ map: TEX.glyphs, vertexColors: true, side: DoubleSide }, { blend: 3 })), 0, false, false, 8);
}
