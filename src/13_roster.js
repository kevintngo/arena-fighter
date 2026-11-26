// =====================================================================================
//  THE ROSTER: ten duellists. Shared rules, very different answers to them.
//  Every fighter has a jab string, a dash attack, a chargeable smash, a special, an aerial and a recovery.
// =====================================================================================
function stickDir(f, toFloor) {            // unit direction from the stick; with none held, toward the deck (or straight ahead)
  const I = f.I, sm = Math.hypot(I.mx, I.mz); if (sm > .3) { _sd[0] = I.mx / sm; _sd[1] = I.mz / sm; return _sd; }
  if (toFloor) { const nf = nearestFloor(f.x, f.z); if (nf[2] > .4) { _sd[0] = (nf[0] - f.x) / nf[2]; _sd[1] = (nf[1] - f.z) / nf[2]; return _sd; } }
  _sd[0] = f.fx; _sd[1] = f.fz; return _sd;
}
const _sd = [0, 0];
function ghost(f, n = 10) { const c = f.def.col; for (let i = 0; i < n; i++) FX.add.spawn(f.x + RS(.3), f.y + R(.2, 1.7) * f.def.scale, f.z + RS(.3), RS(.6), R(0, .8), RS(.6), R(.25, .5), R(.1, .2), c[0] * .5, c[1] * .5, c[2] * .5, 0, 1); }
function blinkTo(f, x, z) { ghost(f, 14); f.x = x; f.z = z; f.root.position.set(x, f.y, z); f.root.updateMatrixWorld(true); if (f.cloak) f.resetCloak(); ghost(f, 14); SFX.play('blink', x, z, .8, 1.2); }
const COUNTER_HIT = mv({ su: .05, act: .1, rec: .3, dmg: 10, bkb: 9, kbg: 9.5, reach: 3.5, half: 1.3, arc: [-1.8, 1.8], sfx: 'swingBig' });
const ROSTER = [
  { id: 'knight', name: 'THE STAR-KNIGHT', title: 'LAST LIGHT OF THE ORDER', blurb: 'A BALANCED BLADE. NO WEAKNESS, NO EXCUSES.', rig: 'knight', anim: 'biped', scale: 1, r: .4, weight: 1.05, speed: 6.6, air: 5, jv: 10.5, jh: 8, fall: 1,
    col: [5.5, 2.8, .9], hue: '#ffb347', alt: [1.5, .8, .7], stats: [3, 3, 3, 3], cloak: [.17, .22, .42], blade: true, pose: { aRx: -.3, fRx: -.45 }, kit: ['BLADE COMBO', 'GREAT CLEAVE', 'BLADE DASH', 'LAST LIGHT: HITS HARDER ON THE FINAL STOCK'], dmgMul: f => (f.stocks === 1 ? 1.12 : 1), ai: { r: 1.9, spec: (f, o, dd) => dd > 2.6 && dd < 4.4 },
    moves: {
      jab: [mv({ su: .065, act: .09, rec: .14, dmg: 4.5, bkb: 2, kbg: .5, reach: 2.2 }), mv({ su: .065, act: .09, rec: .14, dmg: 4.5, bkb: 2, kbg: .5, reach: 2.2 }), mv({ su: .08, act: .1, rec: .22, dmg: 7, bkb: 6.5, kbg: 4.4, reach: 2.3, arc: [-1.6, 1.5], sfx: 'swingBig' })],
      dash: mv({ su: .1, act: .14, rec: .28, dmg: 8, bkb: 7, kbg: 4.5, reach: 2.1, half: .7, lunge: 9, anim: 'thrust' }),
      smash: mv({ su: .24, act: .12, rec: .4, dmg: 16, bkb: 8.5, kbg: 15.5, reach: 2.4, half: 1.6, arc: [-2.3, 2.3], sfx: 'swingBig', sd: 8 }),
      spec: mv({ su: .14, act: .16, rec: .24, dmg: 10, bkb: 7, kbg: 6.5, reach: 1.7, half: 1.2, lunge: 21, l0: .15, anim: 'thrust', sfx: 'dash', on: (f, e) => { if (e === 1) f.inv = Math.max(f.inv, .1); if (e === 2) ghost(f, 2); } }),
      air: mv({ su: .08, act: .16, rec: .2, dmg: 7, bkb: 5.5, kbg: 5, reach: 2.05, half: PI, anim: 'spin', air: true }),
    } },
  { id: 'colossus', name: 'SLAG COLOSSUS', title: 'THE FOUNDRY THAT WALKED', blurb: 'SUPER-HEAVY. SHRUGS OFF LIGHT HITS, ENDS STOCKS IN ONE.', rig: 'golem', anim: 'biped', scale: 1.22, r: .62, weight: 1.24, speed: 4.3, air: 3.5, jv: 9.2, jh: 6, fall: 1.22,
    col: [6, 2.2, .5], hue: '#ff7a33', alt: [.7, .9, 1.5], stats: [5, 1, 5, 2], armorK: 14, chargeArmor: true, kit: ['IRON FISTS', 'MOLTEN HAMMER', 'QUAKE', 'IRON HIDE: LIGHT BLOWS DO NOT MOVE IT'], ai: { r: 1.8, spec: (f, o, dd) => dd > 2.2 && dd < 5.5 && !o.air },
    moves: {
      jab: [mv({ su: .12, act: .1, rec: .22, dmg: 6, bkb: 3.5, kbg: 1.5, reach: 1.95, half: .9, anim: 'punch' }), mv({ su: .13, act: .1, rec: .34, dmg: 9, bkb: 7.5, kbg: 5, reach: 2.05, half: .9, anim: 'punch', sfx: 'swingBig' })],
      dash: mv({ su: .14, act: .22, rec: .36, dmg: 11, bkb: 8, kbg: 6, reach: 1.7, half: 1, lunge: 9, anim: 'bite', armor: true, sfx: 'whoosh' }),
      smash: mv({ su: .42, act: .12, rec: .5, dmg: 22, bkb: 10, kbg: 15.5, reach: 2.5, half: 1, anim: 'over', sd: 28, sfx: 'swingBig', on: (f, e) => { if (e === 1) { FX.shake(.3); FX.puff(f.x + f.fx * 1.6, .1, f.z + f.fz * 1.6, 10, .4, 4, .9, .6); SFX.play('slam', f.x, f.z, 1, .7); } } }),
      spec: mv({ su: .34, act: .1, rec: .56, dmg: 12, bkb: 8, kbg: 7, reach: 2, half: PI, anim: 'slam', armor: true, sfx: 'slam', on: (f, e) => { if (e === 1) { FX.shake(.45); quake(f, f.x, f.z, 6.2, 14, { dmg: 8, bkb: 7, kbg: 6, pop: 9, col: f.def.col }); } } }),
      air: mv({ su: .16, act: .2, rec: .3, dmg: 12, bkb: 7, kbg: 8, reach: 2, half: 1.3, anim: 'over', air: true, pop: -9, sfx: 'swingBig', on: (f, e) => { if (e === 1) f.vy = Math.min(f.vy, -6); } }),
    } },
  { id: 'shade', name: 'THE SHADE', title: 'WHAT THE MIRRORS KEPT', blurb: 'FRAGILE AND FAST. BLINKS BEHIND YOU. STABS HARDER FROM THE BACK.', rig: 'shade', anim: 'biped', scale: .98, r: .36, weight: .84, speed: 7.9, air: 6.4, jv: 11, jh: 9.5, fall: .95,
    col: [3.2, 3.4, 5], hue: '#b9c4ff', alt: [1.6, .7, .7], stats: [2, 5, 1, 2], kit: ['RAZOR FLURRY', 'VEIL PIERCER', 'BLINK', 'BACKSTAB: +25% FROM BEHIND'], back: 1.25, ai: { r: 1.6, spec: (f, o, dd) => dd > 3 && dd < 7 },
    moves: {
      jab: [0, 1, 2].map(() => mv({ su: .05, act: .06, rec: .1, dmg: 2.7, bkb: 1.6, kbg: .3, reach: 1.8, anim: 'punch' })).concat([mv({ su: .06, act: .08, rec: .24, dmg: 4.5, bkb: 6, kbg: 3.8, reach: 1.85, anim: 'punch', sfx: 'swingBig' })]),
      dash: mv({ su: .07, act: .16, rec: .26, dmg: 7, bkb: 6, kbg: 4, reach: 1.7, half: 1.2, lunge: 13, anim: 'slash', sfx: 'dash' }),
      smash: mv({ su: .2, act: .1, rec: .38, dmg: 13, bkb: 8, kbg: 13.5, reach: 2, half: .7, lunge: 12, l0: .12, anim: 'thrust', sfx: 'swingBig', sd: 6 }),
      spec: mv({ su: .1, act: .05, rec: .2, dmg: 0, reach: 0, anim: 'cast', sfx: 'blink', on: (f, e) => { if (e !== 1) return; const d = stickDir(f, false); let tx = f.x, tz = f.z; for (let s = .5; s <= 5.6; s += .5) { const x = f.x + d[0] * s, z = f.z + d[1] * s; if (!overFloor(x, z) || shotBlocked(x, 1, z)) break; tx = x; tz = z; } blinkTo(f, tx, tz); f.inv = Math.max(f.inv, .16); const o = f.foe; if (o && !o.busy) f.yaw = Math.atan2(o.x - f.x, o.z - f.z); } }),
      air: mv({ su: .06, act: .14, rec: .18, dmg: 6, bkb: 5, kbg: 4.5, reach: 1.8, half: PI, anim: 'spin', air: true }),
    } },
  { id: 'corsair', name: 'THE CORSAIR', title: 'ADMIRAL OF NO FLEET', blurb: 'KEEPS YOU AT RANGE WITH SHOT AFTER SHOT, THEN ONE BROADSIDE.', rig: 'corsair', anim: 'biped', scale: 1, r: .4, weight: 1, speed: 6.3, air: 5, jv: 10.5, jh: 8, fall: 1,
    col: [1.2, 5, 1.6], hue: '#7dff9a', alt: [.6, .8, 1.7], stats: [3, 3, 2, 5], pose: { aRx: -.6, fRx: -.9, aLx: -.3, fLx: -.5 }, kit: ['PISTOL WHIP', 'BROADSIDE', 'QUICKDRAW', 'SHIELD BREAKER: SHOTS SHRED GUARDS'], ai: { r: 6.5, zone: true, spec: (f, o, dd) => dd > 3.5, smashR: 9 },
    moves: {
      jab: [mv({ su: .07, act: .08, rec: .15, dmg: 3.5, bkb: 2, kbg: .5, reach: 1.8, anim: 'punch' }), mv({ su: .08, act: .1, rec: .16, dmg: 4.5, bkb: 2.5, kbg: .8, reach: 2.1, anim: 'slash' }), mv({ su: .1, act: .08, rec: .3, dmg: 6, bkb: 7, kbg: 3.8, reach: 2.2, half: .6, anim: 'shoot', sfx: 'bolt', on: (f, e) => { if (e === 1) FX.sparkDir(f.x + f.fx, 1.2, f.z + f.fz, f.fx, f.fz, 12, 1.2, 5, 1.6, 9, .5); } })],
      dash: mv({ su: .1, act: .14, rec: .3, dmg: 8, bkb: 7, kbg: 4.5, reach: 2.1, half: .7, lunge: 9, anim: 'thrust' }),
      smash: mv({ su: .26, act: .06, rec: .4, dmg: 0, reach: 0, anim: 'shoot', sfx: 'bolt', pitch: .6, on: (f, e) => { if (e !== 1) return; const p = f.pow; shoot(f, { speed: 19, r: .46, life: .8, sd: 34, dmg: 16 * p * f.dmgMul(), bkb: 8.5 * (1 + (p - 1) * .7), kbg: 16.5 * (1 + (p - 1) * .7) }); f.kx = -f.fx * 4; f.kz = -f.fz * 4; FX.shake(.25); FX.sparkDir(f.x + f.fx, 1.2, f.z + f.fz, f.fx, f.fz, 20, 1.2, 5, 1.6, 10, .5); Lights.flash(f.x + f.fx, 1.2, f.z + f.fz, .3, 1, .4, 16, .2, 8); } }),
      spec: mv({ su: .09, act: .05, rec: .15, dmg: 0, reach: 0, anim: 'shoot', sfx: 'bolt', on: (f, e) => { if (e === 1) shoot(f, { speed: 21, r: .18, life: .6, sd: 7, dmg: 6.5 * f.dmgMul(), bkb: 3.6, kbg: 3.6 }); } }),
      air: mv({ su: .07, act: .14, rec: .2, dmg: 6.5, bkb: 5.5, kbg: 4.5, reach: 1.8, half: 1.2, anim: 'kick', air: true }),
    } },
  { id: 'lancer', name: 'THE GILDED LANCER', title: 'HONOUR GUARD, STILL ON DUTY', blurb: 'OUT-REACHES EVERYONE. PUNISHES A RECKLESS BLOW WITH A RIPOSTE.', rig: 'automaton', anim: 'biped', scale: 1.12, r: .46, weight: 1.12, speed: 5.2, air: 4.4, jv: 10, jh: 7.5, fall: 1.05,
    col: [6, 4.2, 1.2], hue: '#ffd76a', alt: [.75, .85, 1.5], stats: [4, 2, 4, 5], parry: .06, shR: 1.25, pose: { aRx: -.9, fRx: -.5 }, kit: ['PIKE THRUSTS', 'HALBERD SWEEP', 'RIPOSTE', 'TRUE PARRY: A WIDER PARRY WINDOW'], ai: { r: 2.9, spec: (f, o, dd) => dd < 3.4 && o.state === 'attack' && o.mt < o.move.su && !o.move.grab },
    onCounter: (f, src, h) => { f.inv = .3; FX.hitStop(.12); Tele.ring(f.x, f.z, 2.6, .3, 5, 4, 2); SFX.play('deflect', f.x, f.z, 1, .9); f.yaw = Math.atan2(src.x - f.x, src.z - f.z); f.startMove(COUNTER_HIT, -1, Math.max(1, h.dmg * 1.4 / 10)); if (window.Duel) Duel.banner('RIPOSTE', .6, '#ffd76a'); },
    moves: {
      jab: [mv({ su: .09, act: .08, rec: .19, dmg: 5, bkb: 3, kbg: 1.2, reach: 3.1, half: .34, anim: 'thrust' }), mv({ su: .1, act: .09, rec: .28, dmg: 7, bkb: 7, kbg: 4.5, reach: 3.3, half: .32, anim: 'thrust', sfx: 'swingBig' })],
      dash: mv({ su: .12, act: .14, rec: .32, dmg: 9, bkb: 7, kbg: 5, reach: 3.2, half: .35, lunge: 10, anim: 'thrust' }),
      smash: mv({ su: .32, act: .14, rec: .46, dmg: 17, bkb: 8.5, kbg: 13.5, reach: 3.35, half: 1.7, arc: [-2.4, 2.4], sfx: 'swingBig', sd: 10 }),
      spec: mv({ su: .06, act: .5, rec: .36, dmg: 0, reach: 0, anim: 'counter', sfx: 'charge', on: (f, e) => { if (e === 1) f.counterT = .5; } }),
      air: mv({ su: .1, act: .16, rec: .22, dmg: 8, bkb: 6, kbg: 5, reach: 2.8, half: PI, anim: 'spin', air: true }),
    } },
  { id: 'acolyte', name: 'THE VOID ACOLYTE', title: 'SHE HEARD THE DARK ANSWER', blurb: 'FLOATS. BENDS GRAVITY: ORBS THAT DRAG YOU IN, WELLS THAT CRUSH.', rig: 'acolyte', anim: 'biped', scale: 1, r: .4, weight: 1, speed: 6, air: 5.6, jv: 9.5, jh: 7, fall: 1, hover: true, rollK: 1.55,
    col: [2, 3.4, 8], hue: '#8fa8ff', alt: [1.7, .7, 1.1], stats: [3, 2, 2, 4], pose: { aRx: -.7, fRx: -.3 }, kit: ['STAFF AND SPARK', 'COLLAPSE', 'GRAVITON ORB', 'VOID STEP: HER DODGE CARRIES TWICE AS FAR'], ai: { r: 5, zone: true, spec: (f, o, dd) => dd > 3 && !deck.shots.some(s => s.owner === f && s.orb), smashR: 7.5 },
    moves: {
      jab: [mv({ su: .08, act: .09, rec: .16, dmg: 4, bkb: 2.5, kbg: .6, reach: 2.3, half: .5, anim: 'thrust' }), mv({ su: .12, act: .08, rec: .3, dmg: 6, bkb: 6.5, kbg: 3.6, reach: 1.9, half: PI, anim: 'cast', sfx: 'zap', on: (f, e) => { if (e === 1) { Tele.ring(f.x, f.z, 2, .25, 1, 1.7, 4); } } })],
      dash: mv({ su: .1, act: .2, rec: .28, dmg: 7, bkb: 6, kbg: 4.5, reach: 2, half: PI, lunge: 7, anim: 'spin', hits: 2, gap: .1 }),
      smash: mv({ su: .3, act: .05, rec: .5, dmg: 0, reach: 0, anim: 'cast', sfx: 'chant', on: (f, e) => { if (e !== 1) return; const o = f.foe, p = f.pow; let r = 3.2 + (p - 1) * 6; if (f.cpu && o) r = clamp(Math.hypot(o.x - f.x, o.z - f.z), 2.5, 7.5); gravWell(f, f.x + f.fx * r, f.z + f.fz * r, 2.5, .66, { dmg: 15 * p * f.dmgMul(), bkb: 8 * (1 + (p - 1) * .7), kbg: 14.5 * (1 + (p - 1) * .7), col: f.def.col, away: true }); } }),
      spec: mv({ su: .22, act: .05, rec: .3, dmg: 0, reach: 0, anim: 'cast', sfx: 'chant', pitch: 1.4, on: (f, e) => { if (e === 1) shoot(f, { speed: 5.2, r: .45, life: 3, orb: true, pull: 3.8, dmg: 9 * f.dmgMul(), bkb: 6, kbg: 7 }); } }),
      air: mv({ su: .08, act: .16, rec: .2, dmg: 6, bkb: 5, kbg: 4.5, reach: 2.1, half: PI, anim: 'spin', air: true }),
    } },
  { id: 'hound', name: 'THE VOID HOUND', title: 'A WAR-DRONE THAT OUTLIVED ITS FLEET', blurb: 'FASTEST THING ON THE DECK. POUNCES, MAULS, NEVER LETS GO.', pf: [.2, 1.1], rig: 'hound', anim: 'quad', scale: 1.15, r: .5, weight: .92, speed: 8.6, air: 6, jv: 10, jh: 10.5, fall: 1.1, gait: 1.7,
    col: [3.5, 1, 6], hue: '#c98bff', alt: [1.6, .6, .5], stats: [3, 5, 2, 2], shR: .95, kit: ['SNAP SNAP BITE', 'SAVAGE POUNCE', 'MAUL', 'FERAL: NOTHING OUTRUNS IT'], ai: { r: 1.5, spec: (f, o, dd) => dd > 2 && dd < 4.5 && (o.state === 'shield' || R() < .3) },
    moves: {
      jab: [mv({ su: .06, act: .07, rec: .12, dmg: 3.5, bkb: 1.8, kbg: .4, reach: 1.75, half: .9, anim: 'bite' }), mv({ su: .06, act: .07, rec: .12, dmg: 3.5, bkb: 1.8, kbg: .4, reach: 1.75, half: .9, anim: 'bite' }), mv({ su: .08, act: .09, rec: .26, dmg: 6, bkb: 6.5, kbg: 4, reach: 1.85, half: .9, anim: 'bite', sfx: 'growl' })],
      dash: mv({ su: .08, act: .18, rec: .28, dmg: 9, bkb: 7.5, kbg: 5, reach: 1.7, half: 1, lunge: 13, anim: 'bite', sfx: 'growl' }),
      smash: mv({ su: .26, act: .2, rec: .38, dmg: 15, bkb: 8.5, kbg: 14.5, reach: 1.9, half: 1.2, lunge: 15, l0: .28, anim: 'over', sfx: 'growl', pitch: .8, sd: 6 }),
      spec: mv({ su: .13, act: .2, rec: .4, dmg: 11, bkb: 8.5, kbg: 7.5, reach: 1.7, half: 1, lunge: 14, l0: .14, grab: true, anim: 'bite', sfx: 'growl', pitch: 1.2 }),
      air: mv({ su: .06, act: .14, rec: .18, dmg: 6, bkb: 5, kbg: 4.5, reach: 1.7, half: 1.3, anim: 'bite', air: true }),
    } },
  { id: 'gear', name: 'THE GEARKNIGHT', title: 'WOUND TIGHT FOR A THOUSAND YEARS', blurb: 'BANKS TORQUE WITH EVERY HIT, THEN SPENDS IT ALL IN ONE SPIN.', rig: 'gearknight', anim: 'biped', scale: 1.02, r: .42, weight: 1.06, speed: 6, air: 4.8, jv: 10.5, jh: 8, fall: 1,
    col: [6, 3, .8], hue: '#ffc266', alt: [.6, 1, 1.4], stats: [4, 3, 3, 3], kit: ['SAW STRING', 'MAINSPRING', 'WIND-UP', 'TORQUE: EVERY HIT WINDS THE SPRING'], ai: { r: 1.8, spec: (f, o, dd) => dd > 6 && f.store < 3 },
    hud: f => 'TORQUE ' + '***'.slice(0, Math.floor(f.store)) + '---'.slice(0, 3 - Math.floor(f.store)),
    onHit: (f, v, m) => { if (m !== f.def.moves.smash) f.store = Math.min(3, f.store + .34); },
    moves: {
      jab: [mv({ su: .07, act: .08, rec: .14, dmg: 3.5, bkb: 2, kbg: .5, reach: 1.9 }), mv({ su: .07, act: .08, rec: .14, dmg: 3.5, bkb: 2, kbg: .5, reach: 1.9 }), mv({ su: .09, act: .14, rec: .26, dmg: 5.5, bkb: 6, kbg: 3.8, reach: 1.95, half: PI, anim: 'spin', sfx: 'swingBig' })],
      dash: mv({ su: .09, act: .24, rec: .28, dmg: 8, bkb: 6.5, kbg: 4.5, reach: 1.9, half: PI, lunge: 8.5, anim: 'spin', hits: 2, gap: .12 }),
      smash: mv({ su: .24, act: .36, rec: .42, dmg: 10, bkb: 8.5, kbg: 12.5, reach: 2.15, half: PI, anim: 'spin', spins: 3, hits: 3, gap: .12, sfx: 'swingBig', sd: 6, mul: f => 1 + f.spent * .14, on: (f, e) => { if (e === 0) { f.spent = Math.floor(f.store); f.pow *= 1 + f.spent * .08; f.store -= f.spent; } if (e === 2 && f.spent) ghost(f, 1); } }),
      spec: mv({ su: .1, act: 1.5, rec: .16, dmg: 0, reach: 0, anim: 'counter', sfx: 'clank', on: (f, e, dt) => { if (e === 1) f.wT = 0; if (e !== 2) return; f.wT += dt; if (f.wT > .42 && f.store < 3) { f.wT = 0; f.store = Math.min(3, f.store + 1); SFX.play('clank', f.x, f.z, .7, 1 + f.store * .25); FX.spark(f.x, 1.3, f.z, 8, 6, 3, .8, 4, .3, .08); } if (!f.I.spec || f.store >= 3) f.mt = Math.max(f.mt, f.move.su + f.move.act); } }),
      air: mv({ su: .07, act: .16, rec: .2, dmg: 7, bkb: 5.5, kbg: 5, reach: 1.95, half: PI, anim: 'spin', air: true }),
    } },
  { id: 'storm', name: 'THE STORM ENGINE', title: 'A REACTOR THAT LEARNED TO HATE', blurb: 'PLANTS PYLONS, THEN FIGHTS INSIDE ITS OWN LIGHTNING.', rig: 'dynamo', anim: 'orb', scale: 1.3, r: .5, weight: 1.12, speed: 6.8, air: 5.2, jv: 10, jh: 8.5, fall: 1.05,
    col: [1.2, 3, 6.5], hue: '#6fd0ff', alt: [2.2, 1, .5], stats: [3, 4, 3, 4], kit: ['ARC PRODS', 'CHAIN LIGHTNING', 'TESLA PYLON', 'OVERCLOCK: FASTER AS DAMAGE RISES'], rage: true, ai: { r: 2, spec: (f, o, dd) => dd > 4 && (!f.pyl || f.pyl.length < 2 || R() < .1), smashR: 5.6 },
    tick: (f, dt) => {
      const P = f.pyl; if (!P || !P.length) return; f.pT = (f.pT || 0) - dt; const c = f.def.col, zap = f.pT <= 0; if (zap) f.pT = .7;
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.t += dt; if (p.t > 16 || f.state === 'dead') { deck.group.remove(p.o); for (const m of p.o.children) m.geometry.dispose(); P.splice(i, 1); } }
      if (!P.length || f.busy) return; const a = P[0], b = P[1] || f, bx = b.x, bz = b.z, by = P[1] ? 1.5 : f.y + .8, ex = bx - a.x, ez = bz - a.z, l2 = ex * ex + ez * ez; if (l2 > 15 * 15) return;
      Arcs.line(a.x, 1.5, a.z, bx, by, bz, c[0] * .14, c[1] * .14, c[2] * .14);
      if (zap) { Arcs.bolt(a.x, 1.5, a.z, bx, by, bz, c[0] * .5, c[1] * .5, c[2] * .5, .5, 0); for (const v of fighters) { if (v.busy || v.side === f.side || v.y > 2.4 || v.y < -.5) continue; const u = sat(((v.x - a.x) * ex + (v.z - a.z) * ez) / (l2 || 1)), px = a.x + ex * u, pz = a.z + ez * u, dd = Math.hypot(v.x - px, v.z - pz); if (dd < .6 + v.r) { const hx = dd > .05 ? (v.x - px) / dd : 0, hz = dd > .05 ? (v.z - pz) / dd : 1; if (v.takeHit(f, { dmg: 4.5, bkb: 2.8, kbg: 1.6, proj: true }, hx, hz) === 1) hitFx(v, hx, hz, 3, c, 4.5); } } }
    },
    drop: f => { if (f.pyl) for (const p of f.pyl) { if (deck) deck.group.remove(p.o); for (const m of p.o.children) m.geometry.dispose(); } f.pyl = null; },
    moves: {
      jab: [mv({ su: .07, act: .08, rec: .15, dmg: 4, bkb: 2, kbg: .5, reach: 2, half: .6, anim: 'thrust', sfx: 'zap' }), mv({ su: .07, act: .08, rec: .15, dmg: 4, bkb: 2, kbg: .5, reach: 2, half: .6, anim: 'thrust', sfx: 'zap' }), mv({ su: .1, act: .1, rec: .28, dmg: 6, bkb: 6.5, kbg: 3.8, reach: 2.05, half: PI, anim: 'slam', sfx: 'zap', pitch: .7, on: (f, e) => { if (e === 1) Tele.ring(f.x, f.z, 2.1, .25, .6, 1.5, 3.2); } })],
      dash: mv({ su: .08, act: .18, rec: .28, dmg: 9, bkb: 7.5, kbg: 5, reach: 1.6, half: 1.1, lunge: 11, anim: 'thrust', sfx: 'whoosh' }),
      smash: mv({ su: .28, act: .1, rec: .42, dmg: 15, bkb: 8, kbg: 14, reach: 6.4, half: .2, anim: 'slash', arc: [-.3, .3], sfx: 'zap', pitch: .6, sd: 8, on: (f, e) => { if (e === 2) { const c = f.def.col; Arcs.bolt(f.x, 1, f.z, f.x + f.fx * 6, 1, f.z + f.fz * 6, c[0] * .5, c[1] * .5, c[2] * .5, .5, 0); } if (e === 1) { FX.shake(.25); Lights.flash(f.x + f.fx * 3, 1.2, f.z + f.fz * 3, .2, .5, 1, 18, .25, 10); } } }),
      spec: mv({ su: .16, act: .05, rec: .25, dmg: 0, reach: 0, anim: 'slam', sfx: 'clank', on: (f, e) => { if (e !== 1) return; let x = f.x + f.fx * 1.3, z = f.z + f.fz * 1.3; if (!overFloor(x, z)) { x = f.x; z = f.z; } const o = partObj(buildPart(k => { k.cyl('iron', 0, 0, 0, .3, .16, 8).cyl('steel', 0, .16, 0, .1, 1.2, 6).ring('brass', 0, .9, 0, .2, true, HPI, 0, 0, .04).sph('gCold', 0, 1.5, 0, .15); })); o.position.set(x, 0, z); deck.group.add(o); f.pyl = f.pyl || []; if (f.pyl.length >= 2) f.pyl[0].t = 99; f.pyl.push({ x, z, o, t: 0 }); FX.spark(x, 1.4, z, 10, 1.2, 3, 6.5, 4, .35, .08); } }),
      air: mv({ su: .08, act: .14, rec: .2, dmg: 7, bkb: 5.5, kbg: 5, reach: 1.95, half: PI, anim: 'slam', air: true, sfx: 'zap' }),
    } },
  { id: 'apex', name: 'THE APEX', title: 'SPECIMEN ZERO, UNCAGED', blurb: 'A BRUISER THAT HEALS BY BITING AND ROTS THE FLOOR UNDER YOU.', rig: 'horror', anim: 'biped', scale: 1.12, r: .55, weight: 1.2, speed: 6.4, air: 4.6, jv: 8.5, jh: 6.5, fall: 1.05,
    col: [1, 5, 1.5], hue: '#8dff7a', alt: [1.5, .6, 1.4], stats: [4, 3, 4, 3], kit: ['CLAW AND BITE', 'TAIL HAMMER', 'ACID SPIT', 'LEECH: BITES HEAL'], ai: { r: 2, spec: (f, o, dd) => dd > 3.2 && dd < 8 && R() < .5 },
    onHit: (f, v, m, dealt) => { if (m.bite) { f.pct = Math.max(0, f.pct - dealt * .6); FX.burst(f.x, 1.2, f.z, 6, .6, 5, 1.6, 2, .6, .1); } },
    moves: {
      jab: [mv({ su: .075, act: .09, rec: .16, dmg: 5, bkb: 2.5, kbg: .8, reach: 2.15 }), mv({ su: .075, act: .09, rec: .16, dmg: 5, bkb: 2.5, kbg: .8, reach: 2.15 }), mv({ su: .1, act: .1, rec: .28, dmg: 8, bkb: 7, kbg: 4.5, reach: 1.9, half: .8, anim: 'bite', bite: true, sfx: 'growl', pitch: .7 })],
      dash: mv({ su: .11, act: .16, rec: .3, dmg: 10, bkb: 7.5, kbg: 5, reach: 1.8, half: .9, lunge: 10, anim: 'bite', bite: true, armor: true, sfx: 'growl', pitch: .7 }),
      smash: mv({ su: .3, act: .12, rec: .44, dmg: 20, bkb: 9.5, kbg: 15, reach: 2.9, half: .8, anim: 'over', sfx: 'swingBig', sd: 18, on: (f, e) => { if (e === 1) { FX.shake(.3); FX.puff(f.x + f.fx * 2, .1, f.z + f.fz * 2, 10, .4, 4, .9, .6); SFX.play('slam', f.x, f.z, 1, .8); } } }),
      spec: mv({ su: .2, act: .05, rec: .32, dmg: 0, reach: 0, anim: 'bite', sfx: 'lob', on: (f, e) => { if (e !== 1) return; const o = f.foe, dd = o ? clamp(Math.hypot(o.x - f.x, o.z - f.z), 3, 8) : 5.5, T = .6, c = f.def.col; shoot(f, { speed: dd / T, grav: 22, vy: 22 * T / 2 - 1.1 / T, r: .26, life: 3, dmg: 6 * f.dmgMul(), bkb: 4, kbg: 3, onLand: s => { puddle(f, s.x, s.z, 2.1, 5, c); SFX.play('splat', s.x, s.z, .8, 1); FX.burst(s.x, .3, s.z, 14, c[0], c[1], c[2], 3, .5, .12); } }); } }),
      air: mv({ su: .08, act: .15, rec: .2, dmg: 7, bkb: 5.5, kbg: 5, reach: 2, half: 1.4, anim: 'slash', air: true }),
    } }
];
['KNIGHT', 'COLOSSUS', 'SHADE', 'CORSAIR', 'LANCER', 'ACOLYTE', 'HOUND', 'GEARKNIGHT', 'STORM', 'APEX'].forEach((n, i) => { ROSTER[i].short = n; });
// the Shade's passive: blows that land on a turned back hit harder
{ const sh = ROSTER[2]; for (const k of ['jab', 'dash', 'smash', 'air']) for (const m of [].concat(sh.moves[k])) m.mul = (f, v) => (f.fx * v.fx + f.fz * v.fz > .35 ? sh.back : 1); }
