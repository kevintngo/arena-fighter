// =====================================================================================
//  FIGHTER ANIMATION: procedural poses for bipeds, the hound and the storm engine, driven by state and move timing
// =====================================================================================
Fighter.prototype.animate = function (dt) {
  const d = this.def, S = this.state, st = this.st, t = uTime.value, b = this.rig.b, m = this.move, sc = d.scale;
  const sp = (S === 'idle' && !this.air) ? Math.min(this.speedNow, 8) : 0; this.moveAmt = damp(this.moveAmt, sat(sp / (d.speed * .55)), 12, dt); this.ph += sp * dt * (d.gait || 2.3) / sc;
  const mA = this.moveAmt, ph = this.ph, s1 = Math.sin(ph), c1 = Math.cos(ph), stepN = Math.floor(ph / PI);
  if (stepN !== this.lastStep && mA > .35 && !this.air) { this.lastStep = stepN; SFX.step(this.x, this.z); if (R() < .5) FX.puff(this.x, .08, this.z, 1, .12, .7, .35, .5); }
  // move progress: wind-up, strike, recovery
  let pw = 0, pa = 0, pr = 0, an = '';
  if (S === 'attack' && m) { an = m.anim; pw = sat(this.mt / m.su); pa = sat((this.mt - m.su) / m.act); pr = sat((this.mt - m.su - m.act) / m.rec); }
  else if (S === 'charge') { an = d.moves.smash.anim; pw = .75 + .25 * sat(this.chT / .5) + Math.sin(t * 60) * .02; }
  const e = pa * pa * (3 - 2 * pa);
  let rX = 0, rY = 0, rZ = 0, yo = 0, k = 18, pivot = .9 * sc;
  const tumble = S === 'fall' || (S === 'hurt' && this.air && this.kb > 9);
  if (tumble) { this.rX += dt * (S === 'fall' ? 8 : 11); rX = this.rX; k = 60; }
  else if (S === 'roll') { rX = st / ROLL_T * TAU; k = 60; }
  else if (S === 'down') { rX = -1.5; yo = .12; pivot = .25; k = 30; }
  else if (S === 'dizzy') { rZ = Math.sin(t * 5) * .16; rX = Math.cos(t * 3.7) * .1; }
  else if (S === 'ledge') { rX = .25; }
  else if (S === 'held') { rX = -.5; }
  if (!tumble) this.rX = 0;
  if (an === 'spin') rY = (m ? m.spins || 1 : 1) * TAU * (S === 'charge' ? 0 : sat((this.mt - m.su * .6) / (m.act + m.su * .4)));
  if (d.anim === 'biped') {
    const robe = !b.legL, A = (.5 + .3 * mA) * mA, Bk = (.9 + .4 * mA) * mA, po = d.pose || {};
    let hipY = .9 - .04 * mA + Math.abs(c1) * .06 * mA, torX = .12 * mA + .08 + Math.sin(t * 1.6 + this.side) * .015, torY = 0, headX = -.05, headY = 0;
    let aLx = (po.aLx === undefined ? -.5 : po.aLx) + s1 * .3 * mA, aLz = .12, fLx = po.fLx === undefined ? -.9 : po.fLx, aRx = (po.aRx === undefined ? -.35 : po.aRx) - s1 * .34 * mA, aRy = 0, aRz = -.12, fRx = po.fRx === undefined ? -.5 : po.fRx, blX = HPI - .95, blY = 0;
    let lLx = -s1 * A, sLx = Math.max(0, c1) * Bk, lRx = s1 * A, sRx = Math.max(0, -c1) * Bk;
    if (an) {
      k = 55; hipY = .84; lLx = -.45; lRx = .4; sRx = .45;
      if (an === 'slash') { const phi = pw < 1 ? this.arcFrom * (.7 + .3 * pw) : lerp(this.arcFrom, this.arcTo, e); aRx = -1.42; aRy = phi * .82; aRz = 0; fRx = -.12; blX = HPI; blY = phi * .15; torY = phi * .4; torX = .22; this.arcU.uTail.value = this.arcFrom; this.arcU.uHead.value = pw < 1 ? this.arcFrom + (this.arcTo - this.arcFrom) * .001 : lerp(this.arcFrom, this.arcTo, e); this.arcA = S === 'attack' && pw >= 1 && pr < .5 ? 1 : 0; }
      else if (an === 'thrust') { const q = pw < 1 ? -pw : e; aRx = lerp(-.9, -1.55, sat(q + 1)); fRx = q < 0 ? -1.5 : lerp(-1.5, -.02, e); aRy = q < 0 ? -.4 * pw : 0; torY = q < 0 ? -.45 * pw : lerp(-.45, .3, e); torX = .25 + .2 * e; blX = HPI; lLx = -.7 * sat(q + .2); lRx = .6; }
      else if (an === 'over' || an === 'slam') { const up = lerp(-.4, -3, pw), dn = lerp(-3, -.7, e); aRx = aLx = pw < 1 ? up : dn; fRx = fLx = -.2; torX = pw < 1 ? lerp(.1, -.35, pw) : lerp(-.35, .8, e); hipY = pw < 1 ? .9 : lerp(.9, .72, e); blX = HPI; if (an === 'slam' && pw < 1) yo = Math.sin(pw * PI) * .5; }
      else if (an === 'cast') { aRx = -1.5 - .15 * Math.sin(t * 30) * (1 - pw); fRx = -.05; aLx = -1.1; fLx = -.6; torX = .02; headX = -.15; blX = HPI; }
      else if (an === 'shoot') { aRx = -1.52 + .25 * e * (1 - pr); fRx = -.03; aLx = -.3; torY = .25; torX = .05 - .1 * e * (1 - pr); }
      else if (an === 'punch') { const left = this.ji % 2 === 1, q = pw < 1 ? 0 : e, ax = lerp(-.5, -1.5, q), fx = lerp(-1.7, -.05, q); if (left) { aLx = ax; fLx = fx; aRx = -.6; fRx = -1.5; torY = lerp(.35, -.5, q); } else { aRx = ax; fRx = fx; aLx = -.6; fLx = -1.5; torY = lerp(-.35, .5, q); } torX = .25; }
      else if (an === 'spin') { aRx = -1.5; aLx = -1.5; aRz = -1.3; aLz = 1.3; fRx = fLx = 0; aRy = .0; blX = HPI; torX = .1; hipY = .86; this.arcU.uTail.value = -PI; this.arcU.uHead.value = PI; this.arcA = S === 'attack' && pw > .6 && pr < .4 ? .8 : 0; }
      else if (an === 'grab') { const q = this.hold ? 1 : pw < 1 ? pw * .6 : 1; aLx = aRx = lerp(-.5, this.hold ? -2 : -1.45, q); fLx = fRx = -.25; aLz = -.25; aRz = .25; torX = .3; }
      else if (an === 'up') { aRx = -2.95; fRx = -.1; aLx = -.3; torX = -.2; torY = .3; lLx = -.9; sLx = 1.5; lRx = .2; sRx = .6; blX = HPI; }
      else if (an === 'kick') { lRx = pw < 1 ? .5 * pw : lerp(.5, -1.5, e); sRx = pw < 1 ? 1.2 * pw : lerp(1.2, .05, e); torX = -.2 * e; aLx = -.9; aRx = -.2; }
      else if (an === 'bite') { torX = pw < 1 ? -.3 * pw : lerp(-.3, .9, e); headX = pw < 1 ? -.4 * pw : .3; aLx = aRx = -.9 + .5 * e; }
      else if (an === 'counter') { aRx = -1.3; aRy = .6; fRx = -1.2; aLx = -1.2; fLx = -1.4; torY = .35; hipY = .8; blX = HPI + .9; blY = -.9; }
    } else if (S === 'shield' || S === 'sstun') { hipY = .76; aLx = aRx = -1.25; fLx = fRx = -1.75; aLz = -.35; aRz = .35; torX = S === 'sstun' ? -.05 : .28; lLx = -.5; sLx = .9; lRx = .35; sRx = .5; k = 40; blX = HPI + .9; blY = -.9; }
    else if (S === 'roll') { hipY = .6; torX = 1.2; aLx = aRx = -1.6; fLx = fRx = -1.8; lLx = lRx = -1.6; sLx = sRx = 2.1; k = 50; }
    else if (S === 'hurt' || S === 'fall') { const fl = S === 'fall' ? Math.sin(t * 22) * .5 : 0; torX = -.45; headX = -.4; aLx = -2.2 + fl; aRx = -2 - fl; aLz = .7; aRz = -.7; lLx = -.5; lRx = .3; sLx = .7; sRx = .9; k = 45; }
    else if (S === 'down') { torX = -.1; aLx = -2.6; aRx = -2.4; aLz = .9; aRz = -.9; lLx = -.2; lRx = .15; k = 30; }
    else if (S === 'dizzy') { torX = .5; headX = .5 + Math.sin(t * 6) * .2; aLx = aRx = -.15; fLx = fRx = -.2; hipY = .82; }
    else if (S === 'lag') { torX = .3; hipY = .85; }
    else if (S === 'air') { aLx = -2.3 + Math.sin(t * 9) * .1; aRx = -2.1; aLz = .6; aRz = -.6; lLx = -.6; sLx = 1.1; lRx = .25; sRx = .7; torX = this.vy > 0 ? -.1 : .2; }
    else if (S === 'ledge') { aLx = aRx = -3.05; fLx = fRx = -.1; lLx = lRx = .1; torX = -.1; k = 40; }
    else if (S === 'held') { aLx = aRx = -.2; aLz = .5; aRz = -.5; lLx = lRx = .3; sLx = sRx = .5; headX = -.5; }
    else if (S === 'win') { aRx = -3 + Math.sin(t * 5) * .08; fRx = -.15; aLx = -.3; torX = -.08; headX = -.3; blX = HPI; }
    else if (S === 'intro' || S === 'respawn') { aLx = -.2; aRx = -.25; fLx = fRx = -.2; }
    else if (S === 'out') { torX = .9; headX = .6; hipY = .5; aLx = aRx = -.2; lLx = -1.4; sLx = 2.2; lRx = -.3; sRx = 1.6; }
    if (this.item && this.item.use && !an && S !== 'hurt') { aLx = -1.5; fLx = -1.2; }
    if (d.hover) { yo += .16 + Math.sin(t * 2.2 + this.side) * .07; }
    const f = 1 - Math.exp(-k * dt), L = (o, key, v) => { o.rotation[key] += (v - o.rotation[key]) * f; };
    b.hips.position.y += (hipY - b.hips.position.y) * f; L(b.torso, 'x', torX); L(b.torso, 'y', torY); L(b.head, 'x', headX); L(b.head, 'y', headY - torY * .6);
    L(b.armL, 'x', aLx); L(b.armL, 'z', aLz); L(b.foreL, 'x', fLx); L(b.armR, 'x', aRx); L(b.armR, 'y', aRy); L(b.armR, 'z', aRz); L(b.foreR, 'x', fRx);
    if (b.blade) { L(b.blade, 'x', blX); L(b.blade, 'y', blY); if (this.sheath) this.sheath.scale.x = 1.3 * (1 + .1 * Math.sin(t * 43) + (an ? .5 : 0)); }
    if (!robe) { L(b.legL, 'x', lLx); L(b.shinL, 'x', sLx); L(b.legR, 'x', lRx); L(b.shinR, 'x', sRx); }
  } else if (d.anim === 'quad') {
    const f = 1 - Math.exp(-20 * dt); let bx = 0, by = .55, bz = 0; pivot = .5 * sc;
    for (let i = 0; i < 4; i++) { const o = b['leg' + i], p = ph * 1.4 + (i === 0 || i === 3 ? 0 : PI); let lx = Math.sin(p) * .7 * mA; if (this.air) lx = i % 2 ? .6 : -.6; if (S === 'shield' || S === 'sstun') lx = i % 2 ? -.3 : .3; o.rotation.x += (lx - o.rotation.x) * f; }
    if (an === 'bite' || an === 'thrust' || an === 'punch' || an === 'slash') { bx = pw < 1 ? -.3 * pw : lerp(-.3, .35, e); bz = pw < 1 ? -.2 * pw : lerp(-.2, .45, e) * (1 - pr); if (an === 'slash') rY += pw < 1 ? this.arcFrom * .25 * pw : lerp(this.arcFrom, this.arcTo, e) * .25 * (1 - pr); }
    else if (an === 'over' || an === 'slam' || an === 'up') { bx = pw < 1 ? -.9 * pw : lerp(-.9, .5, e); by = .55 + (pw < 1 ? .35 * pw : .35 * (1 - e)); }
    else if (an === 'cast' || an === 'shoot') { bx = -.45; by = .6; }
    else if (an === 'grab') { bx = .3; bz = .3; }
    else if (S === 'shield' || S === 'sstun') { by = .4; bx = .15; }
    else if (S === 'hurt' || S === 'fall') bx = -.5; else if (S === 'dizzy') { by = .42; bx = .3; } else if (S === 'air') bx = this.vy > 0 ? -.4 : .3; else if (S === 'win') { bx = -.7; by = .7; } else if (S === 'ledge') { bx = -1.2; }
    else by = .55 + Math.abs(Math.sin(ph * 1.4)) * .07 * mA + Math.sin(t * 2) * .01;
    if (S === 'down') { rX = 0; rZ = 1.5; yo = .25; }
    b.body.rotation.x += (bx - b.body.rotation.x) * f; b.body.position.y += (by - b.body.position.y) * f; b.body.position.z += (bz - b.body.position.z) * f;
  } else {                // the storm engine: a rolling core inside spinning rings
    pivot = .62 * sc; const f = 1 - Math.exp(-14 * dt); let tilt = 0, eye = 1, spin = 3 + this.speedNow * 1.2, by = .62;
    b.body.rotation.x += this.speedNow * dt * 1.6;
    if (an) { spin = 16 + 20 * pw; eye = 1 + pw * 1.5; if (an === 'slash' || an === 'spin') tilt = pw < 1 ? .5 * pw : lerp(.5, -.5, e); else if (an === 'over' || an === 'slam') { by = pw < 1 ? .62 + .7 * pw : lerp(1.32, .45, e); } else if (an === 'thrust' || an === 'punch') { tilt = .9 * (pw < 1 ? pw : 1 - pr); } else if (an === 'grab') tilt = .6; }
    else if (S === 'shield' || S === 'sstun') { spin = 22; by = .5; } else if (S === 'dizzy') { spin = .6; tilt = Math.sin(t * 4) * .5; by = .5; } else if (S === 'hurt' || S === 'fall') { spin = 1; tilt = .8; } else if (S === 'win') { spin = 12; by = .9 + Math.sin(t * 6) * .1; }
    else by = .62 + Math.sin(t * 2.4) * .03;
    b.ring.rotation.y += dt * spin; b.ring.rotation.x += (tilt - b.ring.rotation.x) * f; b.body.position.y += (by - b.body.position.y) * f; b.eye.scale.setScalar(damp(b.eye.scale.x, eye, 12, dt));
    if (S === 'down') { rX = 0; yo = -.1; }
  }
  this.arcA = an === 'slash' || an === 'spin' ? this.arcA : Math.max(0, this.arcA - dt * 7); this.arcU.uAlpha.value = this.arcA * (this.pow > 1 ? 1.3 : .85); if (this.arcA <= 0 && S !== 'attack') this.arc.visible = false;
  // root: spin about the body's middle so rolls and tumbles do not pivot on the feet
  const cx = Math.cos(rX), sx = Math.sin(rX), py = pivot * (1 - cx), pz = -pivot * sx;
  this.root.position.set(this.x + this.fx * pz, this.y + yo + py, this.z + this.fz * pz); this.root.rotation.set(rX, this.yaw + rY, rZ); this.root.rotation.order = 'YXZ';
  this.root.visible = S !== 'dead' && !(this.inv > 0 && game.state === 'fight' && (S === 'idle' || S === 'air' || S === 'shield' || S === 'attack' || S === 'charge' || S === 'lag') && Math.sin(t * 46) > .55);
  this.root.updateMatrixWorld(true);
  // glow: hit flash, charge, overcharge, counter stance
  const c = d.col; let fl = this.flash, fr = 1, fg = .3, fb = .25; if (S === 'dead') { fl *= .6; fg = fb = 1; }
  if (S === 'charge') { fl = Math.max(fl, .12 + .2 * sat(this.chT) * (.6 + .4 * Math.sin(t * 40))); fr = c[0] / 6; fg = c[1] / 6; fb = c[2] / 6; }
  if (this.over > 0) { fl = Math.max(fl, .16 + .08 * Math.sin(t * 12)); fr = 1; fg = .5; fb = .12; if (R() < dt * 20) FX.add.spawn(this.x + RS(.4), this.y + R(.2, 1.8), this.z + RS(.4), 0, R(.5, 1.5), 0, .5, .07, 5, 2.2, .5, 0, 0); }
  if (this.counterT > 0) { fl = Math.max(fl, .3); fr = fg = fb = 1; }
  if (this.aegis > 0) { fl = Math.max(fl, .1); fr = .3; fg = .6; fb = 1; }
  if (fl > 0 || this.rig.flash > 0) { rigFlash(this.rig, fl, fr, fg, fb); this.rig.flash = fl; }
  // shield bubble, whose-fighter ring
  const shOn = S === 'shield' || S === 'sstun';
  if (shOn) { const s = (.75 + .55 * this.sh / 100) * (d.shR || 1.1) * sc; this.bub.visible = true; this.bub.position.set(this.x, this.y + .95 * sc, this.z); this.bub.scale.setScalar(s); this.bub.rotation.y = t * .7; const g = .5 + this.flash; this.bubU.uCol.value.setRGB(c[0] * .2 * g + .06, c[1] * .2 * g + .06, c[2] * .2 * g + .06); this.bub.updateMatrixWorld(true); } else this.bub.visible = false;
  this.ring.visible = this.root.visible && !this.air && S !== 'ride' && S !== 'intro'; if (this.ring.visible) { this.ring.position.set(this.x, .04, this.z); this.ring.scale.setScalar(1.9 * this.r / .4); }
  if (this.cloak) { this.cloak.visible = this.root.visible; if (S !== 'dead') this.simCloak(dt); }
};
