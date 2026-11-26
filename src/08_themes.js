// =====================================================================================
//  THE TWELVE DECK THEMES: architecture kit, palette, lighting, props, hazards, monsters, boss, music
// =====================================================================================
B.dyn = function (obj, fn) { this.deck.group.add(obj); this.deck.anim.push({ obj, fn }); return obj; };
B.own = function (parts) { for (const p of parts) this.deck.ownGeoms.push(p.geometry); return parts; };
function makeOrrery(x, z) {
  const g = new Group(); g.position.set(x, 0, z);
  const sun = partObj(B.own(buildPart(k => { k.sph('gHot', 0, 0, 0, .46).ring('trim', 0, 0, 0, .72, true, HPI, 0, 0, .05).ring('trim', 0, 0, 0, .72, true, 0, 0, 0, .05); }))); sun.position.y = 3.4; g.add(sun);
  const rings = [], mats = ['stone', 'ice', 'crystal', 'rust'];
  [1.7, 2.5, 3.4, 4.3].forEach((r, i) => {
    const o = partObj(B.own(buildPart(k => { k.ring('trim', 0, 0, 0, r, false, HPI, 0, 0, .05).beam('trim', 0, 0, 0, r, 0, 0, .022, 4).sph(mats[i], r, 0, 0, .17 + i * .05).ring('trim', r, 0, 0, .34 + i * .05, false, HPI + .5, 0, 0, .02).sph('bone', r + .34 + i * .05, .1, 0, .05); })));
    const tilt = new Group(); tilt.position.y = 3.4; tilt.rotation.set(.22 * (i % 2 ? 1 : -1), 0, .1 * i); tilt.add(o); g.add(tilt); rings.push(o);
  });
  B.dyn(g, (dt, t) => { for (let i = 0; i < rings.length; i++) rings[i].rotation.y = t * (.55 - i * .1) + i * 1.7; sun.rotation.y = t * .3; });
}
function makeGlyphSwarm(x, y, z, n, rad) {
  const g = new Group(); g.position.set(x, y, z); const items = [];
  const parts = B.own(buildPart(k => { k.tint(.7, 2.8, 3.4); for (let i = 0; i < n; i++) { const a = i / n * TAU; k.geo(G['glyph' + (i * 3 % 16)], 'glyph', Math.cos(a) * rad, (i % 3) * .45, Math.sin(a) * rad, .5, .5, 1, 0, -a + HPI, 0); } }));
  const o = partObj(parts); g.add(o);
  B.dyn(g, (dt, t) => { o.rotation.y = t * .25; o.position.y = Math.sin(t * .7 + x) * .15; });
}
function makeDrift(room) {
  const g = new Group(), r = B.rng, items = [], x0 = room.x0 * TILE, z0 = room.z0 * TILE, w = room.w * TILE, h = room.h * TILE;
  for (let i = 0; i < 9; i++) {
    const o = partObj(B.own(buildPart(k => { k.tint(r.range(.5, .9)).box(r.chance(.5) ? 'rust' : 'iron', 0, 0, 0, r.range(.2, .6), r.range(.04, .1), r.range(.15, .5), 0, 0, 0); if (r.chance(.4)) k.beam('steel', 0, 0, 0, r.range(-.5, .5), r.range(-.3, .3), r.range(-.5, .5), .03, 4); })));
    o.position.set(x0 + r.range(0, w), r.range(3.2, 6.5), z0 + r.range(0, h)); o.userData.v = [r.range(.2, .7), r.range(-.05, .05), r.range(-.4, -.1)]; o.userData.w = [r.range(-.6, .6), r.range(-.6, .6), r.range(-.6, .6)]; g.add(o); items.push(o);
  }
  B.dyn(g, (dt) => { for (const o of items) { const v = o.userData.v, wv = o.userData.w; o.position.x += v[0] * dt; o.position.z += v[2] * dt; o.rotation.x += wv[0] * dt; o.rotation.y += wv[1] * dt; o.rotation.z += wv[2] * dt; if (o.position.x > x0 + w + 4) o.position.x = x0 - 4; if (o.position.z < z0 - 4) o.position.z = z0 + h + 4; } });
}
const THEMES = [
  { id: 'reactor', name: 'REACTOR CATHEDRAL', sub: 'THE FUSION HEARTS STILL BURN', accent: [1, .42, .08], wall: 'iron', wallTint: [1, .93, .86], wallGlow: 0, floor: 'grate', floorTint: [1.25, 1.15, 1.05], trim: 'brass', cap: [1, .9, .8],
    sky: [.5, .47, .55], gnd: [.13, .09, .07], hemiI: .5, moonI: .42, exposure: 1.12, puddle: .2, pudCol: [.05, .03, .02], refl: .06, fx: 0, mist: .22, mistCol: [.7, .4, .2], dens: .06,
    flame: [6, 2.2, .45], neb: [[.6, .16, .1], [.5, .3, .1], [1, .5, .2]], surface: 'grate', ambient: { rate: 26, y0: .2, yr: 1.5, vx: 0, vy: 1, vz: 0, j: .4, s0: .04, s1: .09, r: 5, g: 1.6, b: .3, grav: -.3 },
    mobs: [['husk', 3], ['scuttler', 2], ['drone', 2], ['ooze', 1], ['cinder', 3]], boss: 'core', hazards: ['vent', 'arc', 'laser'],
    decor(D, room) {
      if (room.type === 'round' || room.type === 'cross' || room.type === 'chamber') D.centerpiece(room, (x, z) => P.fusionCore(B.k, x, z));
      else if (room.type === 'hall') for (const s of D.spots(room, 2, { block: true, inner: true, big: true })) P.fusionCore(B.k, s.x, s.z);
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true, wall: true })) P.coolTank(B.k, s.x, s.z);
      for (const s of D.pickSlots(room, 3)) P.pipes(B.k, s, 2.3, true);
    } },
  { id: 'hydro', name: 'THE HANGING GARDENS', sub: 'THE GARDENS OUTLIVED THE GARDENERS', accent: [.2, 1, .6], wall: 'moss', wallTint: [1, 1.05, .95], wallGlow: 0, floor: 'soil', floorTint: [1.1, 1.15, 1], trim: 'brass', cap: [.8, 1, .8],
    sky: [.4, .6, .55], gnd: [.06, .11, .08], hemiI: .52, moonI: .4, exposure: 1.15, puddle: .34, pudCol: [.02, .05, .04], refl: .05, fx: 0, mist: .5, mistCol: [.3, .7, .5], dens: .065,
    flame: [5.5, 2.4, .6], neb: [[.1, .4, .3], [.15, .5, .55], [.6, 1, .5]], surface: 'soil', ambient: { rate: 22, y0: .3, yr: 2.5, vx: .1, vy: .15, vz: .05, j: .3, s0: .04, s1: .08, r: .8, g: 4, b: 2.2, grav: 0 },
    mobs: [['husk', 2], ['scuttler', 3], ['ooze', 2], ['drone', 1], ['stalker', 3]], boss: 'thornroot', hazards: ['vent', 'laser'],
    decor(D, room) {
      if (room.type === 'round' || room.type === 'cross') D.centerpiece(room, (x, z) => { P.mushroom(B.k, x, z, 2.1); P.mushroom(B.k, x + .9, z + .5, .9); P.mushroom(B.k, x - .7, z + .8, .7); });
      for (const s of D.spots(room, D.rng.int(1, 4), { block: true })) P.planter(B.k, s.x, s.z, D.rng.int(0, 1) * HPI);
      for (const s of D.spots(room, D.rng.int(1, 3), { block: true })) P.fern(B.k, s.x, s.z);
      for (const s of D.spots(room, D.rng.int(1, 3), { block: true, wall: true })) P.mushroom(B.k, s.x, s.z, D.rng.range(.7, 1.3));
      for (const s of D.pickSlots(room, 5)) P.vines(B.k, s);
    } },
  { id: 'cryo', name: 'THE CRYO VAULTS', sub: 'TEN THOUSAND SLEEPERS, NONE DREAMING', accent: [.45, .75, 1], wall: 'panel', wallTint: [.85, 1, 1.15], wallGlow: .9, floor: 'deck', floorTint: [.85, 1, 1.15], trim: 'steel', cap: [.8, .95, 1.2],
    sky: [.5, .65, .9], gnd: [.08, .1, .15], hemiI: .62, moonI: .5, exposure: 1.1, puddle: .12, pudCol: [.25, .35, .42], refl: .16, fx: 2, mist: .85, mistCol: [.55, .7, .9], dens: .07,
    flame: [1.6, 3.2, 6], neb: [[.1, .2, .5], [.1, .45, .6], [.5, .8, 1]], surface: 'frost', ambient: { rate: 34, y0: 2.5, yr: 2.5, vx: .15, vy: -.5, vz: .1, j: .25, s0: .03, s1: .07, r: 2.2, g: 2.8, b: 3.4, grav: .2 },
    mobs: [['husk', 2], ['scuttler', 2], ['drone', 2], ['ooze', 1], ['sleeper', 4]], boss: 'firstsleeper', hazards: ['vent', 'laser'],
    decor(D, room) {
      const sl = D.pickSlots(room, Math.max(2, (room.cells.length / 7) | 0)); for (const s of sl) P.cryoPod(B.k, s, D.rng.chance(.22));
      for (const s of D.pickSlots(room, 4)) P.icicles(B.k, s);
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true, wall: true })) P.nitroTank(B.k, s.x, s.z);
      if (room.type === 'round' || room.type === 'chamber') D.centerpiece(room, (x, z) => { P.holoTable(B.k, x, z); });
    } },
  { id: 'concourse', name: 'THE GILDED CONCOURSE', sub: 'THE LAST OPERA NEVER ENDED', accent: [1, .16, .22], wall: 'gilded', wallTint: [1, 1, 1], wallGlow: 0, floor: 'marble', floorTint: [1, .97, .95], trim: 'brass', cap: [1.1, .8, .7],
    sky: [.55, .48, .5], gnd: [.12, .08, .07], hemiI: .5, moonI: .4, exposure: 1.15, puddle: .1, pudCol: [.04, .02, .02], refl: .5, fx: 0, mist: .12, mistCol: [.7, .5, .3], dens: .055,
    flame: [6, 2.6, .7], neb: [[.5, .12, .25], [.45, .3, .1], [1, .7, .35]], surface: 'marble', ambient: { rate: 10, y0: .5, yr: 3, vx: .05, vy: .08, vz: .05, j: .15, s0: .03, s1: .06, r: 3, g: 2.2, b: 1, grav: 0 },
    mobs: [['husk', 3], ['scuttler', 1], ['drone', 2], ['ooze', 1], ['automaton', 3]], boss: 'regent', hazards: ['laser', 'arc'],
    decor(D, room) {
      const k = B.k;
      if (room.type === 'hall' || room.type === 'gallery') {
        const horiz = room.w >= room.h, cx = room.cx * TILE, cz = room.cz * TILE;
        k.at(cx, 0, cz, 0).tint(.5, .06, .09).box('cloth', 0, .02, 0, horiz ? room.w * TILE - 2 : 2.2, .03, horiz ? 2.2 : room.h * TILE - 2).tint(1);
        if (room.type === 'hall') D.backFeature(room, (x, z, rot) => P.throne(k, x, z, rot));
        for (const s of D.spots(room, D.rng.int(1, 3), { block: true, inner: true })) P.chandelier(k, s.x, s.z, false);
      } else if (room.type === 'round' || room.type === 'ell') { for (const s of D.spots(room, D.rng.int(2, 4), { block: true })) P.seats(k, s.x, s.z, D.rng.int(0, 3) * HPI); }
      for (const s of D.spots(room, D.rng.chance(.6) ? 1 : 0, { block: true, inner: true })) P.chandelier(k, s.x, s.z, true);
      for (const s of D.pickSlots(room, 4)) P.curtain(k, s);
    } },
  { id: 'hangar', name: 'HANGAR BAY SEVEN', sub: 'DERELICT WINGS BEHIND A DYING FIELD', accent: [.3, .9, 1], wall: 'panel', wallTint: [1, 1, 1], wallGlow: .5, floor: 'deck', floorTint: [1.05, 1.05, 1.05], trim: 'steel', cap: [.9, 1, 1.1],
    sky: [.5, .6, .8], gnd: [.09, .1, .12], hemiI: .6, moonI: .55, exposure: 1.12, puddle: .28, pudCol: [.02, .03, .04], refl: .08, fx: 0, mist: .15, mistCol: [.4, .55, .7], dens: .05,
    flame: [5.5, 2.4, .6], neb: [[.3, .15, .5], [.1, .4, .6], [.9, .6, .4]], surface: 'metal', ambient: { rate: 9, y0: .5, yr: 3, vx: .2, vy: .05, vz: -.1, j: .2, s0: .03, s1: .06, r: 1.5, g: 2.4, b: 3, grav: 0 },
    mobs: [['husk', 2], ['scuttler', 2], ['drone', 3], ['ooze', 1], ['hunter', 3]], boss: 'talon', hazards: ['cutter', 'laser', 'vent'],
    decor(D, room) {
      const k = B.k, big = room.type === 'hall' || room.type === 'round' || room.type === 'ell';
      if (big) for (let i = 0; i < 2; i++) { const a = D.area(room, 2, 3); if (!a) break; const rot = a.rotated ? HPI : 0; P.fighter(k, a.x, a.z, rot + (D.rng.chance(.5) ? PI : 0));
        k.at(a.x, 0, a.z, rot).tint(1).box('hazard', -1.9, .016, 0, .14, .02, 5.4).box('hazard', 1.9, .016, 0, .14, .02, 5.4); const ac = B.theme.accent; k.tint(ac[0] * .5, ac[1] * .5, ac[2] * .5).geo(G.ring, 'pool', 0, .034, 0, 2.6, 1, 2.6).tint(1); }
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true })) P.fuelCart(k, s.x, s.z, D.rng.int(0, 3) * HPI);
      if (big) D.bayMouth(room);
    } },
  { id: 'hive', name: 'THE HIVE DECK', sub: 'SOMETHING MADE A NEST OF THE DEAD', accent: [.8, .25, 1], wall: 'resin', wallTint: [.85, .75, .9], wallGlow: .5, floor: 'resin', floorTint: [.6, .55, .62], trim: 'resin', cap: [.9, .7, 1],
    sky: [.5, .4, .65], gnd: [.1, .06, .1], hemiI: .5, moonI: .38, exposure: 1.15, puddle: .36, pudCol: [.08, .1, .02], refl: .12, fx: 0, mist: .6, mistCol: [.5, .3, .7], dens: .07,
    flame: [3.6, 1.2, 5.5], neb: [[.4, .1, .5], [.5, .15, .3], [.9, .4, 1]], surface: 'resin', ambient: { rate: 18, y0: .2, yr: 2.5, vx: 0, vy: .2, vz: 0, j: .35, s0: .04, s1: .08, r: 3, g: 1, b: 4, grav: 0 },
    mobs: [['husk', 2], ['scuttler', 4], ['ooze', 2], ['drone', 1], ['brood', 3]], boss: 'empress', hazards: ['eggs', 'eggs', 'vent'],
    decor(D, room) {
      for (const s of D.pickSlots(room, Math.max(3, (room.cells.length / 6) | 0))) P.resinGrowth(B.k, s);
      for (const s of D.spots(room, D.rng.int(1, 4), { block: true })) P.spire(B.k, s.x, s.z);
      for (const s of D.spots(room, D.rng.int(1, 2), { block: true })) D.hazard('eggs', s.cx, s.cz);
    } },
  { id: 'archive', name: 'THE CRYSTAL ARCHIVE', sub: 'EVERY ORDER EVER GIVEN, STILL GLOWING', accent: [.2, .9, 1], wall: 'panel', wallTint: [.6, .72, .85], wallGlow: 1.6, floor: 'datafloor', floorTint: [1, 1, 1], floorGlow: .7, trim: 'steel', cap: [.7, 1, 1.2],
    sky: [.4, .6, .8], gnd: [.05, .1, .13], hemiI: .55, moonI: .45, exposure: 1.12, puddle: .06, pudCol: [.02, .05, .06], refl: .42, fx: 0, mist: .2, mistCol: [.2, .6, .8], dens: .055,
    flame: [1.2, 3.6, 5.5], neb: [[.08, .25, .5], [.1, .5, .6], [.4, .9, 1]], surface: 'glass', ambient: { rate: 18, y0: .1, yr: 1, vx: 0, vy: .7, vz: 0, j: .1, s0: .03, s1: .06, r: .6, g: 3.4, b: 4.2, grav: 0 },
    mobs: [['husk', 2], ['scuttler', 1], ['drone', 3], ['ooze', 1], ['sentinel', 3]], boss: 'archivist', hazards: ['laser', 'arc'],
    decor(D, room) {
      const k = B.k;
      if (room.type === 'round' || room.type === 'cross' || room.type === 'chamber') D.centerpiece(room, (x, z) => { P.holoTable(k, x, z); makeGlyphSwarm(x, 2.6, z, 7, 1.5); });
      const n = room.type === 'hall' || room.type === 'gallery' ? D.rng.int(4, 7) : D.rng.int(1, 3);
      for (const s of D.spots(room, n, { block: true, rows: true })) P.dataStack(k, s.x, s.z, room.w >= room.h ? 0 : HPI);
      for (const s of D.spots(room, 1, {})) makeGlyphSwarm(s.x, 2.2, s.z, 5, .9);
    } },
  { id: 'foundry', name: 'THE FOUNDRY', sub: 'THE GREAT PRESSES NEVER STOPPED', accent: [1, .6, .1], wall: 'rust', wallTint: [1, .95, .9], wallGlow: 0, floor: 'deck', floorTint: [.8, .72, .66], trim: 'iron', cap: [1.1, .85, .7],
    sky: [.55, .45, .42], gnd: [.16, .08, .04], hemiI: .48, moonI: .38, exposure: 1.1, puddle: .14, pudCol: [.05, .025, .01], refl: .05, fx: 0, mist: .3, mistCol: [.8, .4, .15], dens: .07,
    flame: [6.5, 2.4, .4], neb: [[.6, .2, .08], [.5, .25, .1], [1, .6, .2]], surface: 'grate', ambient: { rate: 30, y0: .1, yr: 1.2, vx: .1, vy: 1.2, vz: 0, j: .5, s0: .04, s1: .09, r: 6, g: 2, b: .3, grav: -.4 },
    mobs: [['husk', 3], ['scuttler', 2], ['drone', 2], ['ooze', 1], ['golem', 2]], boss: 'forgemaster', hazards: ['crusher', 'crusher', 'vent'],
    decor(D, room) {
      const k = B.k;
      if (room.type === 'round' || room.type === 'cross') D.centerpiece(room, (x, z) => P.crucible(k, x, z));
      else if (room.type !== 'cabin') { const a = D.area(room, 2, 1); if (a) P.press(k, a.x, a.z, a.rotated ? HPI : 0); }
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true, wall: true })) P.ingots(k, s.x, s.z);
      if (room.cells.length > 28) D.lavaChannel(room);
    } },
  { id: 'flooded', name: 'THE FLOODED BALLAST', sub: 'ANKLE-DEEP AND STILL RISING', accent: [.2, .85, .75], wall: 'rust', wallTint: [.7, .9, .85], wallGlow: 0, floor: 'deck', floorTint: [.6, .72, .72], trim: 'iron', cap: [.75, 1, 1],
    sky: [.4, .6, .65], gnd: [.05, .1, .11], hemiI: .55, moonI: .45, exposure: 1.15, puddle: 0, pudCol: [.01, .04, .05], refl: .72, fx: 1, mist: .45, mistCol: [.3, .6, .6], dens: .06, water: true, ripple: 1,
    flame: [5.5, 2.4, .6], neb: [[.08, .35, .4], [.1, .3, .55], [.5, .9, .8]], surface: 'water', ambient: { rate: 14, y0: 3, yr: 2, vx: 0, vy: -3, vz: 0, j: .05, s0: .03, s1: .05, r: 1, g: 2, b: 2.6, grav: 6 },
    mobs: [['husk', 2], ['scuttler', 2], ['ooze', 3], ['drone', 1], ['lurker', 3]], boss: 'leviathan', hazards: ['arc', 'vent'],
    decor(D, room) {
      const k = B.k;
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true })) P.pump(k, s.x, s.z);
      for (const s of D.pickSlots(room, 2)) P.outflow(k, s);
      for (const s of D.spots(room, D.rng.int(0, 2), { block: true })) { k.at(s.x, 0, s.z, D.rng.range(0, TAU)).box('crate', 0, .3, 0, .95, .95, .95, D.rng.range(-.3, .3), 0, D.rng.range(-.3, .3)); B.obst(s.x, s.z, .62); }
    } },
  { id: 'chapel', name: 'THE STAR CHAPEL', sub: 'AN ORRERY TURNS FOR NO ONE', accent: [.5, .55, 1], wall: 'ashlar', wallTint: [.9, .92, 1.1], wallGlow: 0, floor: 'marble', floorTint: [.62, .68, 1], trim: 'brass', cap: [.85, .9, 1.25],
    sky: [.5, .55, .85], gnd: [.07, .07, .13], hemiI: .55, moonI: .5, exposure: 1.14, puddle: .06, pudCol: [.02, .02, .05], refl: .42, fx: 0, mist: .25, mistCol: [.4, .45, .9], dens: .06,
    flame: [5.5, 2.6, .8], neb: [[.2, .15, .55], [.15, .3, .6], [.8, .7, 1]], surface: 'marble', ambient: { rate: 12, y0: .5, yr: 4, vx: 0, vy: .05, vz: 0, j: .1, s0: .03, s1: .07, r: 2, g: 2.4, b: 4.5, grav: 0 },
    mobs: [['husk', 3], ['scuttler', 1], ['drone', 2], ['ooze', 1], ['acolyte', 3]], boss: 'seraph', hazards: ['cutter', 'laser'],
    decor(D, room) {
      const k = B.k;
      if (room.type === 'round' || room.type === 'cross' || (room.type === 'chamber' && D.rng.chance(.6))) D.centerpiece(room, (x, z) => { k.at(x, 0, z, 0).cyl('stone', 0, 0, 0, .9, .5, 12, 0, 0, .8).cyl('trim', 0, .5, 0, .6, .12, 12).beam('trim', 0, .6, 0, 0, 3.4, 0, .07, 8); makeOrrery(x, z); B.light(x, 3.4, z, 1, .8, .5, 22, 13, .1); B.obst(x, z, .95); P.starGlyph(k, x, z, 3.2); });
      else if (room.type === 'hall' || room.type === 'gallery') { D.backFeature(room, (x, z, rot) => P.altar(k, x, z, rot)); for (const s of D.spots(room, D.rng.int(3, 6), { block: true, rows: true })) P.pew(k, s.x, s.z, room.w >= room.h ? HPI : 0); }
      else { for (const s of D.spots(room, 1, {})) P.starGlyph(k, s.x, s.z, 1.8); for (const s of D.spots(room, D.rng.chance(.5) ? 1 : 0, { block: true, wall: true })) P.telescope(k, s.x, s.z, D.rng.range(0, TAU)); }
    } },
  { id: 'brig', name: 'THE BRIG', sub: 'THE CELLS HELD. THE WARDENS DID NOT.', accent: [1, .3, .1], wall: 'panel', wallTint: [.75, .75, .8], wallGlow: .7, floor: 'deck', floorTint: [.9, .9, .92], trim: 'iron', cap: [1.1, .8, .75],
    sky: [.5, .5, .6], gnd: [.1, .08, .08], hemiI: .5, moonI: .42, exposure: 1.12, puddle: .25, pudCol: [.03, .02, .02], refl: .07, fx: 0, mist: .15, mistCol: [.6, .3, .2], dens: .055,
    flame: [5.5, 2.2, .5], neb: [[.5, .12, .12], [.3, .2, .4], [1, .45, .25]], surface: 'metal', ambient: { rate: 8, y0: .5, yr: 3, vx: .05, vy: .05, vz: .05, j: .15, s0: .03, s1: .06, r: 2.4, g: 1.6, b: 1.2, grav: 0 },
    mobs: [['husk', 3], ['scuttler', 2], ['drone', 2], ['ooze', 1], ['warden', 3]], boss: 'vex', hazards: ['laser', 'laser', 'crusher', 'arc'],
    decor(D, room) {
      const k = B.k;
      for (const s of D.spots(room, D.rng.int(2, 5), { block: true, wall: true, face: true })) P.cellCage(k, s.x, s.z, s.rot, D.rng.int(0, 2));
      if (room.type === 'chamber' || room.type === 'round' || room.type === 'cabin') D.centerpiece(room, (x, z) => P.interrogation(k, x, z, D.rng.int(0, 3) * HPI));
      for (const s of D.pickSlots(room, 3)) P.shackles(k, s);
    } },
  { id: 'breach', name: 'THE BREACHED HULL', sub: 'TORN OPEN TO THE NEBULA', accent: [1, .25, .55], wall: 'iron', wallTint: [.8, .78, .85], wallGlow: 0, floor: 'deck', floorTint: [.85, .82, .9], trim: 'iron', cap: [1.1, .85, 1],
    sky: [.7, .5, .8], gnd: [.1, .07, .12], hemiI: .72, moonI: .7, exposure: 1.1, puddle: .1, pudCol: [.02, .02, .03], refl: .08, fx: 0, mist: .1, mistCol: [.6, .3, .6], dens: .045, skyGain: 1.35,
    flame: [5.5, 2.2, .5], neb: [[.6, .14, .45], [.12, .4, .6], [1, .55, .3]], surface: 'metal', ambient: { rate: 16, y0: .5, yr: 5, vx: .9, vy: .05, vz: -.5, j: .3, s0: .03, s1: .08, r: 2.6, g: 2, b: 3, grav: 0 },
    mobs: [['husk', 3], ['scuttler', 2], ['drone', 2], ['ooze', 1], ['drifter', 3]], boss: 'maw', hazards: ['arc', 'vent', 'cutter'],
    decor(D, room) {
      const k = B.k;
      if (room.cells.length > 24 && !room.tags.key) D.hole(room);
      for (const s of D.spots(room, D.rng.int(1, 3), { block: true })) P.girder(k, s.x, s.z, D.rng.range(0, TAU));
      for (const s of D.spots(room, D.rng.int(0, 1), { block: true })) P.beacon(k, s.x, s.z);
      for (const s of D.pickSlots(room, 2, s => s.h > 2.5)) P.viewport(k, s, 1.7, 1, s.h - .5, true);
      if (room.cells.length > 30) makeDrift(room);
    } }
];
const ThemeBag = {
  bag: [], last: -1, rng: new RNG((Date.now() >>> 3) ^ 0x51ed),
  next() {
    if (this.force) { const f = THEMES.find(t => t.id === this.force); this.force = null; if (f) { this.last = THEMES.indexOf(f); return f; } }
    if (!this.bag.length) { this.bag = THEMES.map((t, i) => i); this.rng.shuffle(this.bag); if (this.bag[this.bag.length - 1] === this.last && this.bag.length > 1) { const t = this.bag[0]; this.bag[0] = this.bag[this.bag.length - 1]; this.bag[this.bag.length - 1] = t; } }
    this.last = this.bag.pop(); return THEMES[this.last];
  }
};
function applyTheme(th) {
  const W = MATS.wall.m, F = MATS.floor.m, C = MATS.cap.m, a = th.accent;
  const wt = TEX[th.wall], ft = TEX[th.floor];
  W.map = wt.map; W.normalMap = wt.normalMap; W.roughnessMap = W.metalnessMap = wt.orm; W.emissiveMap = wt.emissiveMap || TEX.black; W.color.setRGB(th.wallTint[0], th.wallTint[1], th.wallTint[2]);
  W.emissive.setRGB(a[0] * th.wallGlow * 1.4, a[1] * th.wallGlow * 1.4, a[2] * th.wallGlow * 1.4);
  F.map = ft.map; F.normalMap = ft.normalMap; F.roughnessMap = F.metalnessMap = ft.orm; F.emissiveMap = ft.emissiveMap || TEX.black; F.color.setRGB(th.floorTint[0], th.floorTint[1], th.floorTint[2]);
  const fg = th.floorGlow || 0; F.emissive.setRGB(a[0] * fg * 1.3, a[1] * fg * 1.3, a[2] * fg * 1.3);
  C.color.setRGB(th.cap[0], th.cap[1], th.cap[2]);
  const tt = TEX[th.trim], T = MATS.trim.m; T.map = tt.map; T.normalMap = tt.normalMap; T.roughnessMap = T.metalnessMap = tt.orm;
  FLOOR_U.uPuddle.value = th.puddle; FLOOR_U.uPudCol.value.setRGB(th.pudCol[0], th.pudCol[1], th.pudCol[2]); FLOOR_U.uBaseRefl.value = th.refl; FLOOR_U.uFx.value = th.fx; FLOOR_U.uFxCol.value.setRGB(a[0], a[1], a[2]);
  MATS.gAccent.m.color.setRGB(a[0] * 2.5 + .15, a[1] * 2.5 + .15, a[2] * 2.5 + .15); MATS.gAccentDim.m.color.setRGB(a[0] * .85 + .04, a[1] * .85 + .04, a[2] * .85 + .04);
  hemi.color.setRGB(th.sky[0], th.sky[1], th.sky[2]); hemi.groundColor.setRGB(th.gnd[0], th.gnd[1], th.gnd[2]); hemi.intensity = th.hemiI * 2.1; moon.intensity = th.moonI * 1.9;
  moon.color.setRGB(.55 + th.sky[0] * .3, .62 + th.sky[1] * .3, .8 + th.sky[2] * .2);
  FINU.uExposure.value = th.exposure * 1.07; FINU.uAccent.value.setRGB(a[0], a[1], a[2]);
  VOLU.uDensity.value = th.dens; VOLU.uMist.value = th.mist; VOLU.uMistCol.value.setRGB(th.mistCol[0], th.mistCol[1], th.mistCol[2]); RESU.uRipple.value = th.ripple || 0;
  SKYP.uNebA.value.setRGB(th.neb[0][0], th.neb[0][1], th.neb[0][2]); SKYP.uNebB.value.setRGB(th.neb[1][0], th.neb[1][1], th.neb[1][2]); SKYP.uNebC.value.setRGB(th.neb[2][0], th.neb[2][1], th.neb[2][2]); SKYP.uGain.value = th.skyGain || 1;
  FX.ambient = th.ambient; FX.moteU.uAmb.value.setRGB(th.sky[0], th.sky[1], th.sky[2]);
}
