// =====================================================================================
//  INPUT (keyboard, gamepad, touch) and the CPU DUELLIST. Both only ever fill a fighter's input struct,
//  so the computer plays by exactly the rules you do.
// =====================================================================================
const Input = {
  down: {}, tap: {}, pp: {}, I: { mx: 0, mz: 0, atk: false, heavy: false, spec: false, guard: false }, nav: { lf: false, rt: false, up: false, dn: false, ok: false, back: false, pause: false, any: false }, kb: false, pad: false,
  map: {
    'KeyW': 'up', 'ArrowUp': 'up', 'w': 'up', 'KeyS': 'dn', 'ArrowDown': 'dn', 's': 'dn', 'KeyA': 'lf', 'ArrowLeft': 'lf', 'a': 'lf', 'KeyD': 'rt', 'ArrowRight': 'rt', 'd': 'rt',
    'KeyJ': 'atk', 'j': 'atk', 'KeyZ': 'atk', 'z': 'atk', 'KeyK': 'heavy', 'k': 'heavy', 'KeyX': 'heavy', 'x': 'heavy', 'KeyL': 'spec', 'l': 'spec', 'KeyC': 'spec', 'c': 'spec',
    'Space': 'guard', ' ': 'guard', 'ShiftLeft': 'guard', 'ShiftRight': 'guard', 'Shift': 'guard', 'Enter': 'ok', 'NumpadEnter': 'ok', 'Escape': 'back', 'KeyP': 'pause', 'p': 'pause'
  },
  look(e) { if (e.ctrlKey || e.metaKey || e.altKey) return null; return this.map[e.code] || this.map[e.key] || (e.key && e.key.length === 1 ? this.map[e.key.toLowerCase()] : null) || null; },
  init() {
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') { if (!e.repeat) AudioSys.toggleMute(); return; }
      const a = this.look(e); if (!a) return; e.preventDefault(); if (e.repeat) return; this.down[a] = true; this.tap[a] = true; this.kb = true; AudioSys.enable();
    });
    window.addEventListener('keyup', e => { const a = this.map[e.code] || this.map[e.key] || (e.key && e.key.length === 1 ? this.map[e.key.toLowerCase()] : null); if (a) this.down[a] = false; });
    window.addEventListener('blur', () => { this.down = {}; });
  },
  poll() {
    const D = this.down, T = this.tap, I = this.I, on = k => !!(D[k] || T[k]);
    let nx = (on('rt') ? 1 : 0) - (on('lf') ? 1 : 0), ny = (on('up') ? 1 : 0) - (on('dn') ? 1 : 0), atk = on('atk'), heavy = on('heavy'), spec = on('spec'), guard = on('guard'), ok = on('ok'), back = on('back'), pause = on('pause');
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i]; if (!p || !p.connected || !p.buttons || p.buttons.length < 4) continue; const b = n => !!(p.buttons[n] && p.buttons[n].pressed);
      let px = p.axes[0] || 0, py = -(p.axes[1] || 0); const l = Math.hypot(px, py); if (l < .25) px = py = 0; else if (l > 1) { px /= l; py /= l; }
      if (b(14)) px = -1; if (b(15)) px = 1; if (b(12)) py = 1; if (b(13)) py = -1; if (px || py) { nx = px; ny = py; }
      atk = atk || b(0); spec = spec || b(1); heavy = heavy || b(2); guard = guard || b(3) || b(4) || b(5) || b(6) || b(7); pause = pause || b(9); back = back || b(8);
      if (px || py || b(0) || b(1) || b(2) || b(3)) this.pad = true; break;
    }
    if (Touch.stickId >= 0) { nx = Touch.sx; ny = Touch.sy; }
    atk = atk || Touch.atk; heavy = heavy || Touch.heavy; spec = spec || Touch.spec; guard = guard || Touch.guard;
    const l = Math.hypot(nx, ny); if (l > 1) { nx /= l; ny /= l; }
    I.mx = (nx - ny) * Math.SQRT1_2; I.mz = (-nx - ny) * Math.SQRT1_2; I.atk = atk; I.heavy = heavy; I.spec = spec; I.guard = guard;
    const N = this.nav, P = this.pp, e = (k, v) => { const was = P[k]; P[k] = v; return v && !was; };
    N.lf = e('lf', nx < -.5); N.rt = e('rt', nx > .5); N.up = e('up', ny > .5); N.dn = e('dn', ny < -.5); N.ok = e('ok', ok || atk || guard); N.back = e('back', back); N.pause = e('pause', pause);
    N.any = N.ok || N.back || N.lf || N.rt || N.up || N.dn || e('any', heavy || spec);
    this.tap = {};
    return I;
  }
};
// how far a blow of this move would carry a fighter at that damage, and how far it is to a drop in a given direction (walls do not count)
function flight(m, pct, w) { const kb = (m.bkb * BKB_K + m.kbg * KBG_K * pct / 100) * (2 / (1 + w)); if (kb <= 5.5) return 0; return kb * 1.12 / 2.25 * (1 - Math.exp(-2.25 * 2 * (2.2 + kb * .25) / GRAV)); }
function dropAhead(x, z, dx, dz, max = 12) { for (let s = .5; s <= max; s += .5) { const px = x + dx * s, pz = z + dz * s; if (!overFloor(px, pz)) return deckSolidAt(cellOf(px), cellOf(pz)) ? 99 : s; } return 99; }
// which way the deck gets deeper from here (toward more clearance from any drop); _sf[2] is the clearance underfoot
const _sf = [0, 0, 0];
function saferDir(x, z) {
  const d = deck, gx = cellOf(x), gz = cellOf(z), c0 = d.clr[gz * d.W + gx] || 0; let bx = 0, bz = 0, bc = c0;
  for (let a = 0; a < 8; a++) { const dx = Math.round(Math.cos(a * PI / 4)), dz = Math.round(Math.sin(a * PI / 4)), c = d.clr[(gz + dz) * d.W + gx + dx] || 0; if (c > bc) { bc = c; bx = dx; bz = dz; } }
  const l = Math.hypot(bx, bz); _sf[0] = l ? bx / l : 0; _sf[1] = l ? bz / l : 0; _sf[2] = c0; return _sf;
}
// ---- the computer. lv runs from 0 (a sparring dummy that swings) to 1 (parries, punishes, guards the edge)
class CPU {
  constructor(f, lv) {
    this.f = f; this.lv = lv; this.h = { atk: 0, heavy: 0, spec: 0, guard: 0 }; this.cd = R(.5, 1.1); this.plan = ''; this.pt = 0; this.strafe = 1; this.strT = 0; this.seen = null; this.resp = ''; this.teched = false;
  }
  press(k, dur = .07) { const f = this.f; if (this.h[k] > 0 || f.P[k]) return false; this.h[k] = dur; f.I[k] = true; return true; }
  fetch(go) {
    const f = this.f, o = f.foe; if (this.lv < .2) return false; let best = null, bd = 144;
    for (const it of deck.items) { if (it.y > .5 || it.dead || it.t > 14) continue; if (f.item && (it.id === 'nade' || it.id === 'mine')) continue; if (it.id === 'med' && f.pct < 25) continue; const a = dist2(f.x, f.z, it.x, it.z); if (a < bd && (a < 20 || !o || o.busy || a < dist2(o.x, o.z, it.x, it.z))) { bd = a; best = it; } }
    if (!best) return false; go(best.x - f.x, best.z - f.z); return true;
  }
  update(dt) {
    this.think(dt); const f = this.f, I = f.I;
    // do not walk into a gap in the deck: slide around it
    if (!f.air && f.state === 'idle' && (I.mx || I.mz)) {
      const l = Math.hypot(I.mx, I.mz), a0 = Math.atan2(I.mx, I.mz);
      if (edgeAhead(f.x, f.z, I.mx / l, I.mz / l, 1.6) < 1.3) for (const t of [.8, -.8, 1.5, -1.5]) { const a = a0 + t * this.strafe; if (edgeAhead(f.x, f.z, Math.sin(a), Math.cos(a), 1.6) >= 1.3) { I.mx = Math.sin(a) * l; I.mz = Math.cos(a) * l; break; } }
    }
  }
  think(dt) {
    const f = this.f, I = f.I, o = f.foe, lv = this.lv, d = f.def, A = d.ai, S = f.state;
    for (const k of BTN) { this.h[k] -= dt; I[k] = this.h[k] > 0; }
    I.mx = I.mz = 0; this.cd -= dt; this.pt += dt; this.strT -= dt; if (this.strT <= 0) { this.strT = R(.7, 1.9); this.strafe = R() < .5 ? 1 : -1; }
    if (S !== 'hurt') this.teched = false;
    if (!o || f.busy || S === 'held' || S === 'dizzy' || S === 'down') return;
    const go = (x, z, k = 1) => { const l = Math.hypot(x, z); if (l > .01) { I.mx = x / l * k; I.mz = z / l * k; } };
    const dx = o.x - f.x, dz = o.z - f.z, dd = Math.hypot(dx, dz) || .01, ux = dx / dd, uz = dz / dd;
    // ---- knocked off the deck: all that is left is to steer for the lip
    if (f.air && !overFloor(f.x, f.z)) { const nf = nearestFloor(f.x, f.z); go(nf[0] - f.x, nf[1] - f.z); return; }
    if (f.air) {
      if (S === 'hurt') { go(deck.cx - f.x, deck.cz - f.z); if (f.vy < 0 && f.y < .8 && !this.teched) { this.teched = true; if (R() < lv * .75) this.press('guard', .05); } return; }
      go(dx, dz, .7); if (S === 'air' && !o.busy && this.cd <= 0 && dd < d.moves.air.reach + o.r && Math.abs(o.y - f.y) < 1.6) { this.press('atk'); this.cd = .35; }
      return;
    }
    // a throw goes toward the nearest drop
    if (S === 'attack' && f.hold) { let bx = f.fx, bz = f.fz, be = 99; if (lv > .3) for (let a = 0; a < 8; a++) { const ax = Math.cos(a * PI / 4), az = Math.sin(a * PI / 4), e = dropAhead(f.x, f.z, ax, az, 12); if (e < be) { be = e; bx = ax; bz = az; } } go(bx, bz); return; }
    // ---- what is about to hit me, and when
    let thr = null, tHit = 9; const om = o.state === 'attack' && !o.hold ? o.move : null;
    if (om && om.reach > 0 && o.mt < om.su + om.act * .6) {
      const l0 = om.l0 === undefined ? om.su * .4 : om.l0, lun = om.lunge ? om.lunge * Math.max(0, om.su + om.act * .5 - Math.max(o.mt, l0)) : 0;
      if (dd < om.reach + f.r + lun + .5 && (om.half >= 1.6 || Math.abs(angDiff(o.yaw, Math.atan2(-dx, -dz))) < om.half + .45)) { thr = om; tHit = Math.max(0, om.su - o.mt); }
    }
    if (!thr) for (const s of deck.shots) { if (s.side === f.side || s.grav) continue; const rx = f.x - s.x, rz = f.z - s.z, sp = Math.hypot(s.vx, s.vz) || 1, al = (rx * s.vx + rz * s.vz) / sp, pe = Math.abs(rx * s.vz - rz * s.vx) / sp; if (al > 0 && al < sp * .5 && pe < f.r + s.r + .25) { thr = s; tHit = al / sp; break; } }
    if (thr !== this.seen) {
      this.seen = thr; this.resp = '';
      if (thr && R() < lerp(.08, .9, lv)) { const q = R(); this.resp = thr.grab ? 'roll' : q < lv * .45 ? 'parry' : q < .72 ? 'shield' : 'roll'; if (d.id === 'lancer' && thr === om && !om.grab && q > .5 && lv > .3) this.resp = 'counter'; }
    }
    if (this.plan === 'grab') { if (S === 'shield' && f.st > .04) { this.press('atk'); this.plan = ''; this.cd = .6; } else if (this.pt > .35) this.plan = ''; return; }
    if (S === 'shield') { if (((om && om.grab && o.mt < om.su && dd < 3.2) || f.sh < 28) && R() < lv + .2) go(-ux - uz * this.strafe * .5, -uz + ux * this.strafe * .5); return; }
    if (S === 'charge') {
      const sm = d.moves.smash, inR = dd < (A.smashR || sm.reach + o.r + (sm.lunge || 0) * .12); go(dx, dz, .5);
      if (this.h.heavy > .03 && ((thr && tHit < .12 && !d.chargeArmor) || (inR && f.chT > .12 && o.state !== 'dizzy' && R() < dt * 9) || (!inR && f.chT > .5))) this.h.heavy = .02;
      return;
    }
    if (S === 'attack') {
      const m = f.move; go(dx, dz, .4);
      if (f.ji >= 0 && f.mt >= m.su && d.moves.jab[f.ji + 1] && (f.didHit || R() < .2) && dd < 3.8) this.press('atk', .05);
      if (d.id === 'gear' && m === d.moves.spec && (dd < 4.5 || thr)) this.h.spec = 0;
      return;
    }
    if (S !== 'idle') return;
    if (thr && this.resp) {
      const rs = this.resp;
      if (rs === 'parry') { if (tHit < .075) { this.press('guard', .14); this.resp = ''; } }
      else if (rs === 'shield') { if (tHit < .22) { this.press('guard', tHit + (thr.act || .1) + .14); this.resp = ''; } }
      else if (rs === 'counter') { if (tHit < .3) { this.press('spec'); this.resp = ''; } }
      else if (tHit < .2) { const room = edgeAhead(f.x, f.z, -ux, -uz, 4.5) > 3.6, s = this.strafe; if (thr.vx !== undefined) go(-uz * s, ux * s); else if (room) go(-ux, -uz); else go(ux - uz * s * .4, uz + ux * s * .4); this.press('guard'); this.resp = ''; }
      if (tHit < .32) return;
    }
    if (this.plan === 'dash') {
      const dm = d.moves.dash; go(dx, dz);
      if (f.runT > .33 && dd < dm.reach + o.r + dm.lunge * (dm.su * .6 + dm.act) * .7) { this.press('atk'); this.plan = ''; this.cd = lerp(.9, .4, lv); } else if (this.pt > 1.3 || o.busy) this.plan = '';
      return;
    }
    // ---- nobody to hit: hold the middle, tidy up the deck
    if (o.busy) { if (!this.fetch(go)) { const hx = f.x - deck.home[0], hz = f.z - deck.home[1], hd = Math.hypot(hx, hz); if (hd > 5.5) go(-hx, -hz, .8); else if (hd < 2.8) go(hx || 1, hz, .8); } return; }
    // ---- they are over the edge and not coming back: walk to the middle
    if (!overFloor(o.x, o.z)) { if (!this.fetch(go)) { const sf = saferDir(f.x, f.z); go(sf[0], sf[1], .7); } return; }
    if (!thr && dd > 3.5 && this.fetch(go)) return;
    if (f.item && f.item.use && this.cd <= 0 && dd > 3 && dd < 9.5) { this.press('atk'); this.cd = .7; return; }
    // ---- neutral: pick a blow that fits the moment
    const sm = d.moves.smash, smR = A.smashR || sm.reach + o.r - .3 + (sm.lunge ? sm.lunge * sm.act * .7 : 0), jabR = d.moves.jab[0].reach + o.r - .3;
    const open = o.state === 'dizzy' ? 2.3 - o.st : o.state === 'down' ? .46 - o.st : o.state === 'lag' ? o.lagT - o.st : (om && o.mt > om.su + om.act * .6) ? om.su + om.act + om.rec - o.mt : 0;
    const foeDrop = dropAhead(o.x, o.z, ux, uz, 16), myDrop = dropAhead(f.x, f.z, -ux, -uz, 16), cornered = myDrop < 2.6;
    const kill = sm.reach > 0 ? flight(sm, o.pct + sm.dmg, o.def.weight) > foeDrop - .4 : o.pct > 55 + 40 * (o.def.weight - 1), danger = flight(o.def.moves.smash.reach > 0 ? o.def.moves.smash : GRAB, f.pct + 14, d.weight) > myDrop - .6;
    let tDrop = 99; if (lv > .3) for (let a = 0; a < 8; a++) tDrop = Math.min(tDrop, dropAhead(f.x, f.z, Math.cos(a * PI / 4), Math.sin(a * PI / 4), 12));
    const toss = flight(GRAB, o.pct + GRAB.dmg, o.def.weight) > tDrop - .4;
    if (this.cd <= 0) {
      const w = [], inJ = dd < jabR, inS = dd < smR, inG = dd < GRAB.reach + o.r + .15;
      if (open > sm.su + .04 && inS) w.push(['smash', kill ? 8 : 2.5]);
      if (open > .1 && inJ) w.push(['jab', kill ? 1 : 2]);
      if (inG && (o.state === 'shield' || toss)) w.push(['grab', (o.state === 'shield' ? 1 + 5 * lv : 0) + (toss ? 2 + 4 * lv : 0)]);
      if (open <= 0) {
        if (inJ) w.push(['jab', kill ? 1.5 : 3]);
        if (inS) w.push(['smash', kill ? 2 + 4 * lv : .5]);
        if (dd > 2.6 && dd < 5.2 && d.moves.dash && !thr) w.push(['dash', A.zone ? .4 : 1.4]);
      }
      if (A.spec(f, o, dd)) w.push(['spec', A.zone ? 4 : 2]);
      if (w.length) {
        if (R() > lerp(.45, 1, lv)) this.cd = R(.15, .4);
        else {
          const a = rnd.weighted(w);
          if (a === 'jab') { this.press('atk'); this.cd = lerp(.75, .28, lv) * R(.8, 1.3); }
          else if (a === 'smash') { const T = open > 0 ? clamp(open - sm.su - .06, .03, 1) : R() < .3 ? R(.2, .6) : .04; this.press('heavy', T); this.cd = T + lerp(1.1, .5, lv); }
          else if (a === 'grab') { if (this.press('guard', .3)) { this.plan = 'grab'; this.pt = 0; } }
          else if (a === 'dash') { this.plan = 'dash'; this.pt = 0; }
          else { this.press('spec', d.id === 'gear' ? 1.45 : .07); this.cd = lerp(A.zone ? .95 : 1.3, A.zone ? .42 : .55, lv) * R(.8, 1.3); }
          go(dx, dz, .3); return;
        }
      }
    }
    // ---- footwork: keep the deck behind you, not the drop
    let want = A.zone ? A.r : (this.cd > .25 ? jabR + 1.5 : jabR - .35);
    if (open > .25) want = Math.min(jabR, smR) - .4;
    if (A.zone && (cornered || myDrop < 5)) want = jabR - .3;
    const s = this.strafe, sf = saferDir(f.x, f.z), cx = sf[0], cz = sf[1], cl = 1, pull = (danger || cornered) && lv > .15 ? 1.3 : sf[2] <= 2 ? .6 : 0;
    let mx, mz;
    if (dd > want + .5) { mx = ux - uz * s * .25; mz = uz + ux * s * .25; }
    else if (dd < want - .8 && !cornered) { const ox = deck.cx - o.x, oz = deck.cz - o.z, ol = Math.hypot(ox, oz); if (A.zone && ol > 2.5) { mx = o.x + ox / ol * want - f.x; mz = o.z + oz / ol * want - f.z; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml; } else { mx = -ux - uz * s * .5; mz = -uz + ux * s * .5; } }
    else { mx = -uz * s * .7; mz = ux * s * .7; }
    go(mx + cx / cl * pull, mz + cz / cl * pull, cornered || danger ? 1 : dd > want + .5 ? 1 : .7);
    // back to the drop with them close: roll through to the open deck
    if ((cornered || (danger && myDrop < 4)) && dd < 3.2 && this.cd <= .4 && R() < (lv + .1) * dt * 7) { go(ux * .8 + cx / cl, uz * .8 + cz / cl); this.press('guard'); }
  }
}
