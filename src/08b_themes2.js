// =====================================================================================
//  SIX MORE DECKS: crypt, hall of mirrors, library of ash, turbine nacelle, menagerie, clockwork deep
// =====================================================================================
THEMES.push(
  { id: 'crypt', name: "THE ADMIRALS' CRYPT", sub: 'THEY WERE BURIED WITH THEIR FLEETS', accent: [.35, 1, .55], wall: 'ashlar', wallTint: [.72, .78, .74], wallGlow: 0, floor: 'ashlar', floorTint: [.66, .7, .68], trim: 'brass', cap: [.8, 1, .9],
    sky: [.42, .56, .5], gnd: [.06, .09, .08], hemiI: .46, moonI: .4, exposure: 1.12, puddle: .12, pudCol: [.02, .04, .03], refl: .08, fx: 0, mist: .7, mistCol: [.3, .7, .45], dens: .065,
    flame: [1.4, 5, 2.2], neb: [[.1, .4, .25], [.15, .3, .45], [.5, 1, .6]], surface: 'marble', ambient: { rate: 14, y0: .1, yr: 1.2, vx: 0, vy: .3, vz: 0, j: .2, s0: .03, s1: .07, r: 1, g: 4, b: 1.8, grav: 0 },
    mobs: [['husk', 3], ['scuttler', 1], ['drone', 1], ['cryptknight', 3], ['bulwark', 2], ['captain', 1.5]], boss: 'entombed', hazards: ['laser', 'arc', 'vent'], statues: .8, chasm: .35,
    decor(D, room) {
      const k = B.k, horiz = room.w >= room.h;
      if (room.type === 'hall' || room.type === 'gallery') for (const s of D.spots(room, D.rng.int(3, 7), { block: true, rows: true })) P.sarcophagus(k, s.x, s.z, horiz ? 0 : HPI, D.rng.chance(.3));
      else if (room.type === 'round' || room.type === 'cross' || room.type === 'chamber') D.centerpiece(room, (x, z) => { P.sarcophagus(k, x, z, D.rng.int(0, 1) * HPI, false); P.candles(k, x + 1.5, z + 1.5, 6, true); P.candles(k, x - 1.5, z - 1.5, 6, true); });
      for (const s of D.spots(room, D.rng.int(1, 3), { block: true, wall: true })) P.candles(k, s.x, s.z, D.rng.int(5, 9), D.rng.chance(.4));
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true, wall: true })) P.urn(k, s.x, s.z);
      for (const s of D.pickSlots(room, 4)) P.boneNiche(k, s);
    } },
  { id: 'mirror', name: 'THE HALL OF MIRRORS', sub: 'EVERY REFLECTION IS ONE STEP BEHIND', accent: [.8, .85, 1], wall: 'gilded', wallTint: [.5, .56, .76], wallGlow: 0, floor: 'marble', floorTint: [.36, .38, .5], trim: 'brass', cap: [.8, .85, 1.2],
    sky: [.5, .52, .7], gnd: [.08, .08, .12], hemiI: .54, moonI: .46, exposure: 1.12, puddle: 0, pudCol: [.01, .01, .02], refl: .94, fx: 0, mist: .1, mistCol: [.5, .5, .8], dens: .05,
    flame: [6, 2.9, 1], neb: [[.3, .2, .5], [.2, .3, .6], [.9, .8, 1]], surface: 'glass', ambient: { rate: 9, y0: .5, yr: 3.5, vx: .04, vy: .06, vz: .04, j: .12, s0: .03, s1: .06, r: 3, g: 3.2, b: 4, grav: 0 },
    mobs: [['husk', 2], ['drone', 1.5], ['shade', 3.5], ['bulwark', 1.5], ['captain', 1], ['automaton', 1]], boss: 'reflected', hazards: ['laser', 'cutter'], statues: .5, chasm: .25,
    decor(D, room) {
      const k = B.k;
      for (const s of D.pickSlots(room, Math.max(3, (room.slots.length / 2.5) | 0))) P.mirrorPane(k, s);
      for (const s of D.spots(room, D.rng.int(2, 5), { block: true })) P.candelabra(k, s.x, s.z);
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true, inner: true })) P.standMirror(k, s.x, s.z, D.rng.range(0, TAU));
      for (const s of D.spots(room, D.rng.int(0, 2), {})) P.shards(k, s.x, s.z);
      if (room.type === 'round' || room.type === 'chamber') D.centerpiece(room, (x, z) => { for (let i = 0; i < 3; i++) P.standMirror(k, x + Math.cos(i * 2.1) * .7, z + Math.sin(i * 2.1) * .7, -i * 2.1 + HPI); P.shards(k, x, z); });
    } },
  { id: 'library', name: 'THE LIBRARY OF ASH', sub: 'A MILLION VOLUMES, STILL BURNING', accent: [1, .5, .12], wall: 'gilded', wallTint: [1.15, .82, .52], wallGlow: 0, floor: 'wood', floorTint: [.95, .88, .8], trim: 'brass', cap: [1.1, .85, .7],
    sky: [.55, .45, .4], gnd: [.13, .08, .05], hemiI: .48, moonI: .38, exposure: 1.12, puddle: .05, pudCol: [.03, .02, .01], refl: .1, fx: 0, mist: .35, mistCol: [.7, .4, .2], dens: .07,
    flame: [6, 2.4, .5], neb: [[.6, .2, .08], [.4, .25, .15], [1, .6, .25]], surface: 'soil', ambient: { rate: 34, y0: 2.5, yr: 3, vx: .2, vy: -.55, vz: .1, j: .3, s0: .03, s1: .07, r: 1.7, g: 1.3, b: 1, grav: .1 },
    mobs: [['husk', 2], ['scuttler', 1.5], ['scribe', 3], ['cinder', 1.5], ['captain', 1.5], ['bomber', 1]], boss: 'librarian', hazards: ['vent', 'arc'], statues: .3, chasm: .2,
    decor(D, room) {
      const k = B.k;
      for (const s of D.pickSlots(room, Math.max(3, (room.slots.length / 2) | 0))) P.bookshelf(k, s);
      if (room.type === 'hall' || room.type === 'gallery' || room.type === 'ell') for (const s of D.spots(room, D.rng.int(3, 6), { block: true, rows: true })) P.freeShelf(k, s.x, s.z, room.w >= room.h ? HPI : 0);
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true })) P.desk(k, s.x, s.z, D.rng.int(0, 3) * HPI);
      for (const s of D.spots(room, D.rng.int(1, 3), { block: true })) P.bookPile(k, s.x, s.z, D.rng.chance(.55));
      for (const s of D.pickSlots(room, 1)) P.ladder(k, s);
    } },
  { id: 'engine', name: 'THE TURBINE NACELLE', sub: 'THE GREAT ENGINES STILL DREAM OF FLIGHT', accent: [.3, .65, 1], wall: 'panel', wallTint: [.8, .9, 1.1], wallGlow: 1, floor: 'grate', floorTint: [1, 1.1, 1.3], trim: 'steel', cap: [.8, .95, 1.25],
    sky: [.45, .6, .9], gnd: [.06, .09, .14], hemiI: .55, moonI: .5, exposure: 1.1, puddle: .14, pudCol: [.02, .03, .05], refl: .08, fx: 0, mist: .3, mistCol: [.3, .5, .9], dens: .06,
    flame: [1.4, 3.4, 6.5], neb: [[.1, .2, .55], [.1, .45, .7], [.5, .8, 1]], surface: 'grate', ambient: { rate: 42, y0: .3, yr: 3, vx: 6, vy: 0, vz: -3, j: .4, s0: .03, s1: .06, r: 1.2, g: 2.4, b: 4, grav: 0 },
    mobs: [['husk', 2], ['drone', 2], ['dynamo', 3], ['turret', 1.5], ['bomber', 1.5], ['siege', 1]], boss: 'colossus', hazards: ['arc', 'vent', 'cutter'], statues: .1, chasm: .45,
    decor(D, room) {
      const k = B.k;
      if (room.type !== 'cabin' && room.cells.length > 24) { const a = D.area(room, 2, 1); if (a) P.turbine(k, a.x, a.z, a.rotated ? HPI : 0); }
      for (const s of D.spots(room, D.rng.int(1, 3), { block: true })) P.pylon(k, s.x, s.z);
      for (const s of D.pickSlots(room, 2)) P.windVent(k, s);
      for (const s of D.pickSlots(room, 2)) P.pipes(k, s, 2.3, true);
    } },
  { id: 'menagerie', name: 'THE MENAGERIE', sub: 'THE SPECIMENS OUTLASTED THE CURATORS', accent: [.45, 1, .3], wall: 'panel', wallTint: [.8, .92, .8], wallGlow: .6, floor: 'deck', floorTint: [.8, .95, .8], trim: 'steel', cap: [.85, 1.1, .85],
    sky: [.45, .62, .45], gnd: [.06, .1, .06], hemiI: .52, moonI: .42, exposure: 1.13, puddle: .4, pudCol: [.03, .12, .04], refl: .1, fx: 0, mist: .45, mistCol: [.3, .8, .3], dens: .06,
    flame: [5.5, 2.4, .6], neb: [[.15, .45, .2], [.1, .35, .5], [.6, 1, .4]], surface: 'metal', ambient: { rate: 14, y0: .3, yr: 2.5, vx: .1, vy: .15, vz: .05, j: .3, s0: .04, s1: .08, r: 1.4, g: 4, b: 1, grav: 0 },
    mobs: [['husk', 1.5], ['scuttler', 2], ['ooze', 2], ['hound', 3], ['horror', 2], ['bomber', 1]], boss: 'apex', hazards: ['eggs', 'vent', 'laser'], statues: .1, chasm: .25,
    decor(D, room) {
      const k = B.k;
      if (room.type === 'hall' || room.type === 'round' || room.type === 'ell') { const a = D.area(room, 2, 1); if (a) P.beastBones(k, a.x, a.z, a.rotated ? HPI : 0); }
      for (const s of D.spots(room, D.rng.int(2, 6), { block: true, rows: room.type === 'hall' || room.type === 'gallery' })) P.bioTank(k, s.x, s.z, D.rng.chance(.28));
      for (const s of D.spots(room, D.rng.int(0, 1), { block: true })) P.specimenTable(k, s.x, s.z, D.rng.int(0, 3) * HPI);
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true, wall: true, face: true })) P.cellCage(k, s.x, s.z, s.rot, 1);
    } },
  { id: 'clockwork', name: 'THE CLOCKWORK DEEP', sub: 'IT HAS NOT MISSED A SECOND IN A THOUSAND YEARS', accent: [1, .72, .3], wall: 'iron', wallTint: [1.18, 1, .8], wallGlow: 0, floor: 'deck', floorTint: [1.15, 1, .82], trim: 'brass', cap: [1.2, 1, .75],
    sky: [.55, .5, .45], gnd: [.12, .09, .06], hemiI: .5, moonI: .42, exposure: 1.13, puddle: .16, pudCol: [.04, .03, .02], refl: .1, fx: 0, mist: .3, mistCol: [.7, .55, .3], dens: .06,
    flame: [6, 2.7, .7], neb: [[.5, .3, .12], [.35, .3, .4], [1, .75, .35]], surface: 'metal', ambient: { rate: 12, y0: .2, yr: 2, vx: 0, vy: .5, vz: 0, j: .3, s0: .04, s1: .09, r: 2.6, g: 2.2, b: 1.6, grav: 0 },
    mobs: [['husk', 2], ['scuttler', 1.5], ['drone', 1.5], ['gearknight', 3], ['turret', 1.5], ['automaton', 1.5], ['bulwark', 1]], boss: 'mainspring', hazards: ['crusher', 'cutter', 'laser'], statues: .3, chasm: .4,
    decor(D, room) {
      const k = B.k;
      if (room.type === 'round' || room.type === 'cross' || room.type === 'chamber' || room.type === 'hall') D.centerpiece(room, (x, z) => P.gearWorks(k, x, z));
      let n = 0; for (const s of D.pickSlots(room, 3)) { if (n++ < 2) P.wallGears(k, s); else P.steamOrgan(k, s); }
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true, inner: true })) P.pendulum(k, s.x, s.z, D.rng.int(0, 1) * HPI);
    } }
);
// chasm / trench settings and extra foes for the first twelve decks
{
  const pits = { reactor: [.5, 'lava'], foundry: [.5, 'lava'], flooded: [0, 'sky'], breach: [.6, 'sky'], chapel: [.4, 'sky'], hangar: [.35, 'sky'], archive: [.35, 'sky'], cryo: [.3, 'sky'], hive: [.3, 'sky'], brig: [.3, 'sky'], concourse: [.3, 'sky'], hydro: [.25, 'sky'] };
  const add = { reactor: [['bomber', 1.5], ['turret', 1]], hydro: [['hound', 2]], cryo: [['bulwark', 1.5], ['turret', 1]], concourse: [['captain', 1.5], ['bulwark', 1.5]], hangar: [['siege', 1.5], ['turret', 1.5], ['bomber', 1]], hive: [['hound', 1.5], ['bomber', 1]],
    archive: [['turret', 1.5], ['siege', 1]], foundry: [['bomber', 2], ['bulwark', 1]], flooded: [['hound', 1.5]], chapel: [['captain', 1], ['bulwark', 1]], brig: [['bulwark', 2], ['turret', 1.5], ['captain', 1]], breach: [['hound', 1.5], ['siege', 1], ['bomber', 1]] };
  for (const t of THEMES) { if (pits[t.id]) { t.chasm = pits[t.id][0]; t.pit = pits[t.id][1]; } if (add[t.id]) for (const a of add[t.id]) t.mobs.push(a); }
}
// carve a spanned chasm through a great hall, or a moat around the heart of a round chamber
function carveRoom(room) {
  const d = D.deck, r = D.rng, W = d.W, th = B.theme, p = th.chasm === undefined ? .3 : th.chasm, k = B.k; if (p <= 0) return;
  const lava = th.pit === 'lava', pit = lava ? 4 : 3, cells = [];
  if (room.type === 'hall' && r.chance(p)) {
    const horiz = room.w >= room.h, len = horiz ? room.w : room.h, wid = horiz ? room.h : room.w; if (len < 10 || wid < 6) return;
    const bw = r.int(2, 3), mid = Math.floor((horiz ? room.x0 : room.z0) + len / 2 - bw / 2), c0 = horiz ? room.z0 : room.x0; let ok = false, b0 = 0, br = 0;
    for (const off of [0, -1, 1, -2, 2, 3, -3]) {
      b0 = mid + off; cells.length = 0; ok = true; br = c0 + r.int(1, wid - 3);
      for (let a = b0; a < b0 + bw && ok; a++) for (let c = c0; c < c0 + wid; c++) { const x = horiz ? a : c, z = horiz ? c : a, i = z * W + x; if (d.region[i] !== room.id) continue; if (d.keep[i] || d.occ[i]) { ok = false; break; } cells.push([x, z, c === br || c === br + 1]); }
      if (ok && cells.length > bw * 3) break; ok = false;
    }
    if (!ok) return;
    const A0 = b0 * TILE, A1 = (b0 + bw) * TILE, r0 = br * TILE, r1 = (br + 2) * TILE;
    if (horiz) { P.bridgeRail(k, A0, r0, A1, r0); P.bridgeRail(k, A0, r1, A1, r1); } else { P.bridgeRail(k, r0, A0, r0, A1); P.bridgeRail(k, r1, A0, r1, A1); }
  } else if (room.type === 'round' && room.w >= 9 && r.chance(p + .2)) {
    const cx = room.cx, cz = room.cz, r1 = room.w >= 11 ? 2.6 : 2.1, r2 = r1 + 1.32, axis = r.chance(.5);
    for (const i of room.cells) { const x = i % W, z = (i / W) | 0, dx = x + .5 - cx, dz = z + .5 - cz, dd = Math.hypot(dx, dz); if (dd < r1 || dd > r2) continue; const q = axis ? dx : dz; if (d.keep[i] || d.occ[i]) cells.push([x, z, true]); else cells.push([x, z, q > -1.6 && q < .6]); }
  } else return;
  let n = 0;
  for (const c of cells) { const i = c[1] * W + c[0]; if (c[2]) { d.keep[i] = 1; continue; } d.voidc[i] = pit; d.occ[i] = 1; d.blocked[i] = 1; n++;
    if (lava) { if (n % 3 === 0) B.light(cellC(c[0]), -.2, cellC(c[1]), 1, .45, .1, 11, 8, .3); if (n % 2 === 0) B.emit('ember', cellC(c[0]), -.5, cellC(c[1]), 2.5, 7, 2.6, .5); }
    else if (n % 4 === 0) B.light(cellC(c[0]), -1.2, cellC(c[1]), th.accent[0] * .6 + .2, th.accent[1] * .6 + .3, th.accent[2] * .6 + .5, 5, 8, .1); }
  if (lava && cells.length) { const m = cells[cells.length >> 1]; B.haze(cellC(m[0]), .2, cellC(m[1]), 2.2, 1); }
  room.chasm = true;
}
