// =====================================================================================
//  HUD (crisp pixel font on its own canvas), the run (select -> lift -> duel -> lift ...), camera direction, main loop
// =====================================================================================
const css = (c, k = 1) => 'rgb(' + Math.round(clamp(c[0] * k, 0, 1) * 255) + ',' + Math.round(clamp(c[1] * k, 0, 1) * 255) + ',' + Math.round(clamp(c[2] * k, 0, 1) * 255) + ')';
const pctCol = p => p < 35 ? '#f4ecd8' : p < 70 ? '#ffd76a' : p < 110 ? '#ff9a3c' : p < 150 ? '#ff5a3c' : '#ff2a4a';
const STAT_N = ['POWER', 'SPEED', 'WEIGHT', 'REACH'], KIT_N = ['ATTACK', 'HEAVY', 'SPECIAL', 'TRAIT'], KIT_S = ['ATK', 'HVY', 'SPC', 'TRT'];
const PORT = [];                       // per fighter: { 72, 36, 24 } canvases
let _portBack = null;
function shootPortrait(i) {
  const d = ROSTER[i], f = new Fighter(d, 0, false), PX = 300, PZ = 300, biped = d.anim === 'biped', sc = d.scale, yaw = PI * .25 + (biped ? .28 : d.anim === 'quad' ? .75 : 0);
  f.place(PX, PZ, yaw); f.setState('intro'); for (let n = 0; n < 14; n++) f.update(1 / 30);
  f.root.rotation.set(biped ? -.34 : d.anim === 'quad' ? -.12 : 0, yaw, 0); f.root.position.set(PX, 0, PZ); f.root.updateMatrixWorld(true); if (f.cloak) { f.resetCloak(); f.cPos.array.set(f.cp); f.cPos.needsUpdate = true; f.cloak.geometry.computeVertexNormals(); }
  f.ring.visible = false; f.bub.visible = false;
  const hb = f.rig.b.head || f.rig.b.body, e = hb.matrixWorld.elements, pf = d.pf || [.1, 1], fw = d.anim === 'quad' ? .58 * sc : 0, fx = e[12] + Math.sin(yaw) * fw, fy = e[13] + pf[0] * sc, fz = e[14] + Math.cos(yaw) * fw, c = d.col;
  if (!_portBack) { _portBack = new Mesh(G.plane, new MeshBasicMaterial({ side: DoubleSide })); _portBack.scale.set(30, 30, 1); _portBack.rotation.y = PI * .25; scene.add(_portBack); }
  _portBack.visible = true; _portBack.material.color.setRGB(.03 + c[0] * .01, .032 + c[1] * .01, .045 + c[2] * .01); _portBack.position.set(PX - 2.2, 0, PZ - 2.2); _portBack.updateMatrixWorld(true);
  const sq = Math.min(VIEW.iw, VIEW.ih); CAM.x = fx; CAM.z = fz; CAM.y = fy; CAM.h = pf[1] * sc * VIEW.ih / sq; CAM.shx = CAM.shy = 0; applyCamera();
  Lights.clear(); Lights.add(fx - 1.3, fy + .5, fz - 1.3, c[0] / 6, c[1] / 6, c[2] / 6, 7, 6, 0); for (let n = 0; n < 8; n++) Lights.update(.5, fx, fz);
  lantern.position.set(fx + 1.5, fy + 1.3, fz + .5); lantern.intensity = 13; lantern.distance = 11; lantern.color.setRGB(1, .86, .68);
  hemi.color.setRGB(.5, .56, .7); hemi.groundColor.setRGB(.09, .08, .08); hemi.intensity = .95; moon.intensity = .7; VOLU.uDensity.value = 0; VOLU.uMist.value = 0; Post.hazes = [];
  worldToScreen(fx, fy, fz, _v1); Post.focusZ = _v1.z; Post.focusY = .5; FINU.uFade.value = 1; FINU.uHurt.value = FINU.uFlash.value = FINU.uDesat.value = 0;
  FX.moteU.uCenter.value.set(0, 0, 0); Post.render();
  const out = {}; let src = glCanvas, sx = (VIEW.iw - sq) / 2, sy = (VIEW.ih - sq) / 2, sw = sq;
  for (const S of [288, 144, 72, 36]) { const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, sx, sy, sw, sw, 0, 0, S, S); out[S] = cv; src = cv; sx = sy = 0; sw = S; }
  const sm = document.createElement('canvas'); sm.width = sm.height = 24; const g2 = sm.getContext('2d'); g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high'; g2.drawImage(out[72], 0, 0, 72, 72, 0, 0, 24, 24); out[24] = sm;
  PORT[i] = out; _portBack.visible = false; f.dispose(); Lights.clear();
}
const HUD = {
  cv: document.getElementById('hud'), g: null, w: 0, h: 0, toasts: [], card: null, sndHint: true, sndT: 0, boot: 0, bootMsg: '', accent: '#ffb347', t: 0, hot: [], it: 0, ir: 0, ib: 0, il: 0,
  resize() {
    this.cv.width = this.w = VIEW.hudW; this.cv.height = this.h = VIEW.hudH; this.g = this.cv.getContext('2d'); this.g.imageSmoothingEnabled = false;
    const cs = getComputedStyle(document.getElementById('safe')), k = this.w / Math.max(1, window.innerWidth), f = v => Math.ceil((parseFloat(v) || 0) * k);
    this.it = f(cs.paddingTop); this.ir = f(cs.paddingRight); this.ib = f(cs.paddingBottom); this.il = f(cs.paddingLeft);
  },
  toast(text, dur = 2.2) { if (this.toasts.length && this.toasts[this.toasts.length - 1].text === text) return; this.toasts.push({ text, t: 0, dur }); if (this.toasts.length > 3) this.toasts.shift(); },
  title(big, name, sub, extra) { this.card = { big, name, sub, extra, t: 0, hold: true }; },
  soundOn() { this.sndHint = false; this.sndT = 3; },
  pip(g, x, y, col, hollow) { g.fillStyle = '#05060b'; g.fillRect(x + 1, y - 1, 4, 8); g.fillRect(x - 1, y + 1, 8, 4); g.fillRect(x, y, 6, 6); g.fillStyle = col; if (hollow) { g.fillRect(x + 2, y, 2, 1); g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x + 4, y + 1, 1, 1); g.fillRect(x, y + 2, 1, 2); g.fillRect(x + 5, y + 2, 1, 2); g.fillRect(x + 1, y + 4, 1, 1); g.fillRect(x + 4, y + 4, 1, 1); g.fillRect(x + 2, y + 5, 2, 1); } else { g.fillRect(x + 2, y, 2, 6); g.fillRect(x + 1, y + 1, 4, 4); g.fillRect(x, y + 2, 6, 2); } },
  wrap(str, n) { const out = []; let line = ''; for (const wd of str.split(' ')) { if (line && (line + ' ' + wd).length > n) { out.push(line); line = wd; } else line = line ? line + ' ' + wd : wd; } if (line) out.push(line); return out; },
  btn(g, text, x, y, w, h, fn, hi, col = '#ffb347') {
    g.fillStyle = hi ? col : '#05060b'; g.globalAlpha = hi ? .92 : .72; g.fillRect(x, y, w, h); g.globalAlpha = 1; g.fillStyle = col; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
    if (hi) drawText(g, text, x + w / 2, y + Math.round((h - 7) / 2), '#04050a', 1, 1); else drawTextShadow(g, text, x + w / 2, y + Math.round((h - 7) / 2), col, 1, 1);
    this.hot.push({ x: x - 3, y: y - 3, w: w + 6, h: h + 6, fn });
  },
  click(px, py) { for (let i = this.hot.length - 1; i >= 0; i--) { const r = this.hot[i]; if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) { r.fn(); return true; } } return false; },
  // a framed portrait at one of its native sizes (72, 36 or 24 pixels)
  face(g, i, x, y, S, col, dimmed) {
    g.fillStyle = '#05060b'; g.fillRect(x - 2, y - 2, S + 4, S + 4); g.fillStyle = col; g.fillRect(x - 1, y - 1, S + 2, S + 2); const p = PORT[i];
    if (p && p[S]) { g.drawImage(p[S], x, y); if (dimmed) { g.fillStyle = '#05060b'; g.globalAlpha = .68; g.fillRect(x, y, S, S); g.globalAlpha = 1; } } else { g.fillStyle = '#0b0d15'; g.fillRect(x, y, S, S); }
  },
  // one fighter's plate: portrait, name, damage, stocks, shield, whatever they are carrying
  panel(g, f, x, y, small) {
    const d = f.def, s = small ? 2 : 3, P = small ? 24 : 36, gone = f.state === 'dead' || f.state === 'fall', tx = x + P + 6, jx = f.pop > 0 ? Math.round(RS(f.pop * 2)) : 0, jy = f.pop > 0 ? Math.round(RS(f.pop * 2)) : 0;
    this.face(g, ROSTER.indexOf(d), x, y + 1, P, d.hue, gone);
    drawTextShadow(g, small ? d.short : d.name, tx, y, d.hue, 1, 0);
    const str = Math.round(f.pct) + '%'; drawTextShadow(g, str, tx + jx, y + 10 + jy, gone ? '#6a6f7c' : pctCol(f.pct), s, 0);
    const pw = textW(str, s) + 5; for (let i = 0; i < (f.maxSt || 3); i++) this.pip(g, tx + pw + i * 9, y + 10 + s * 7 - 7, i < f.stocks ? d.hue : '#4a4f5c', i >= f.stocks);
    const bw = small ? 34 : 46, by = y + 13 + s * 7; g.fillStyle = '#05060b'; g.fillRect(tx - 1, by - 1, bw + 2, 4); g.fillStyle = f.sh < 30 ? '#ff5a3c' : '#6fb7ff'; g.fillRect(tx, by, Math.round(bw * sat(f.sh / 100)), 2);
    const stt = f.item ? (f.item.id === 'nade' ? 'GRENADE' : 'MINE') + (f === hero ? ': ATTACK' : '') : f.over > 0 ? 'OVERCHARGE' : f.aegis > 0 ? 'AEGIS' : f.tether ? 'TETHER' : d.hud ? d.hud(f) : '';
    if (stt) drawTextShadow(g, stt, tx + (small ? 0 : bw + 6), small ? by + 6 : by - 2, f.item ? '#ffd76a' : '#b6ad96', 1, 0);
  },
  draw(raw) {
    const g = this.g, w = this.w, h = this.h; if (!g) return; this.t += raw; g.clearRect(0, 0, w, h); g.globalAlpha = 1; this.hot.length = 0;
    const amber = '#ffb347', bone = '#e6dcc6', dim = '#b6ad96', red = '#ff5a3c', acc = this.accent, st = game.state, touch = Touch.used || TOUCH_DEV, land = w > h * 1.05, compact = w < 330;
    const L = 8 + this.il, T = 8 + this.it, RR = w - 8 - this.ir, BB = h - 8 - this.ib; Touch.sync(st === 'fight' || st === 'intro' || st === 'end');
    if (st === 'boot') {
      const s = w > 560 ? 4 : w > 300 ? 3 : 2; drawTextShadow(g, 'VOIDLIGHT', w / 2, h * .34, amber, s, 1); drawTextShadow(g, 'DUEL', w / 2, h * .34 + s * 9, bone, s, 1); drawText(g, 'KNOCK THEM INTO THE VOID', w / 2, h * .34 + s * 19 + 6, dim, 1, 1);
      const bw = Math.min(140, w - 60); g.fillStyle = '#1b1d26'; g.fillRect((w - bw) / 2, h * .66, bw, 4); g.fillStyle = amber; g.fillRect((w - bw) / 2, h * .66, Math.round(bw * this.boot), 4); drawText(g, this.bootMsg, w / 2, h * .66 + 10, dim, 1, 1);
    } else if (st === 'title' || st === 'select') {
      const d = ROSTER[Duel.sel], px0 = land ? Math.round(w * .52) : L, px1 = RR, pw = px1 - px0, pcx = land ? Math.round((px0 + px1) / 2) : Math.round(w / 2), n = ROSTER.length;
      if (st === 'title') {
        let s = w > 560 ? 5 : 3; while (s > 2 && textW('VOIDLIGHT', s) > pw) s--; let y = land ? Math.round(h * .2) : T + 4;
        drawTextShadow(g, 'VOIDLIGHT', pcx, y, amber, s, 1); drawTextShadow(g, 'DUEL', pcx, y + s * 9, bone, s, 1); y += s * 18 + 5; g.fillStyle = amber; g.fillRect(pcx - 40, y - 2, 80, 1); drawTextShadow(g, 'KNOCK THEM INTO THE VOID', pcx, y + 3, dim, 1, 1);
        y = land ? y + 34 : Math.round(h * .52); drawTextShadow(g, d.name, pcx, y, d.hue, textW(d.name, 2) > pw ? 1 : 2, 1); drawTextShadow(g, d.title, pcx, y + 19, dim, 1, 1);
        y += land ? 46 : 52; if (Math.sin(this.t * 4) > -.4) drawTextShadow(g, touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY', pcx, y, bone, compact ? 1 : 2, 1);
        if (Duel.best > 0) drawTextShadow(g, 'BEST DEPTH ' + pad(Duel.best, 2), pcx, y + 26, amber, 1, 1);
        drawTextShadow(g, 'TEN DUELLISTS. ENDLESS DECKS. ONE HTML FILE.', pcx, Math.min(BB - 18, y + 44), dim, textW('TEN DUELLISTS. ENDLESS DECKS. ONE HTML FILE.', 1) > pw ? 0 : 1, 1);
        this.hot.push({ x: 0, y: 0, w, h, fn: () => Duel.pick(-1) });
      } else {
        drawTextShadow(g, 'CHOOSE YOUR DUELLIST', w / 2, T, bone, compact ? 1 : 2, 1);
        if (!touch) drawTextShadow(g, land ? 'A / D OR ARROWS: CHOOSE     ENTER: DESCEND' : 'ARROWS: CHOOSE  ENTER: DESCEND', w / 2, T + (compact ? 11 : 19), dim, 1, 1);
        let y = land ? Math.round(h * (h < 300 ? .2 : .22)) : Math.round(h * .45); const x = land ? px0 : L + 2, s = textW(d.name, 3) <= pw && !compact && h >= 300 ? 3 : textW(d.name, 2) <= pw ? 2 : 1;
        drawTextShadow(g, d.name, x, y, d.hue, s, 0); y += s * 7 + 4; drawTextShadow(g, d.title, x, y, dim, 1, 0); y += 12;
        for (const ln of this.wrap(d.blurb, Math.max(16, Math.floor(pw / 6)))) { drawTextShadow(g, ln, x, y, bone, 1, 0); y += 9; }
        y += 5; const two = (land && h < 300) || pw > 300, kx = two ? x + 104 : x, ky0 = two ? y : y + 41, kit = pw - (two ? 104 : 0) < 180 ? KIT_S : KIT_N, kw = kit === KIT_S ? 26 : 76;
        for (let i = 0; i < 4; i++) { drawTextShadow(g, STAT_N[i], x, y + i * 9, dim, 1, 0); for (let j = 0; j < 5; j++) { g.fillStyle = '#05060b'; g.fillRect(x + 43 + j * 8, y + i * 9, 7, 7); g.fillStyle = j < d.stats[i] ? d.hue : '#3a3f4d'; g.fillRect(x + 44 + j * 8, y + i * 9 + 1, 5, 5); } }
        const tr = d.kit[3].split(': '); for (let i = 0; i < 4; i++) { drawTextShadow(g, kit[i], kx, ky0 + i * 9, dim, 1, 0); drawTextShadow(g, i < 3 ? d.kit[i] : tr[0], kx + kw, ky0 + i * 9, i < 3 ? bone : d.hue, 1, 0); }
        let ty2 = Math.max(ky0, y) + 41; for (const ln of this.wrap(tr[1] || '', Math.max(16, Math.floor(pw / 6)))) { drawTextShadow(g, ln, x, ty2, dim, 1, 0); ty2 += 9; }
        // the roster strip
        const per = land ? n : 5, rows = Math.ceil(n / per), cs = Math.floor((w - L * 2 - (land ? 84 : 0)) / per) - 4 >= 26 ? 26 : 14, sw = per * (cs + 4) - 4, bw = 72, bh = Math.max(16, Math.min(cs, 22));
        const sx = Math.round((w - sw - (land ? bw + 12 : 0)) / 2), sy = BB - rows * (cs + 4) - (land ? 4 : bh + 10);
        for (let i = 0; i < n; i++) {
          const r = ROSTER[i], cx = sx + (i % per) * (cs + 4), cy = sy + Math.floor(i / per) * (cs + 4), on = i === Duel.sel;
          if (cs >= 26) { this.face(g, i, cx + 1, cy + 1, 24, on ? r.hue : '#3a3f4d', !on && false); if (on) { g.strokeStyle = r.hue; g.lineWidth = 1; g.strokeRect(cx - 1.5, cy - 1.5, cs + 3, cs + 3); } else { g.fillStyle = '#05060b'; g.globalAlpha = .38; g.fillRect(cx + 1, cy + 1, 24, 24); g.globalAlpha = 1; } }
          else { g.fillStyle = on ? r.hue : '#05060b'; g.fillRect(cx - 1, cy - 1, cs + 2, cs + 2); g.fillStyle = '#0b0d15'; g.fillRect(cx + (on ? 1 : 0), cy + (on ? 1 : 0), cs - (on ? 2 : 0), cs - (on ? 2 : 0)); drawText(g, r.short[0], cx + Math.round(cs / 2), cy + 4, on ? r.hue : '#8a8f9c', 1, 1); }
          this.hot.push({ x: cx - 2, y: cy - 2, w: cs + 4, h: cs + 4, fn: () => Duel.pick(i) });
        }
        if (land) this.btn(g, 'DESCEND', sx + sw + 12, sy + Math.round((cs - bh) / 2), bw, bh, () => Duel.begin(), Math.sin(this.t * 5) > 0, d.hue);
        else this.btn(g, 'DESCEND', Math.round(w / 2 - 50), BB - bh, 100, bh, () => Duel.begin(), Math.sin(this.t * 5) > 0, d.hue);
        // arrows either side of the lift
        const ax = land ? Math.round(w * .3) : Math.round(w / 2), ay = land ? Math.round(h * .48) : Math.round(h * .3), ao = land ? Math.round(Math.min(w * .17, h * .3)) : Math.round(w * .38);
        drawTextShadow(g, '<', ax - ao, ay, bone, 2, 1); drawTextShadow(g, '>', ax + ao, ay, bone, 2, 1); this.hot.push({ x: ax - ao - 16, y: ay - 14, w: 32, h: 42, fn: () => Duel.show(Duel.sel - 1) }, { x: ax + ao - 16, y: ay - 14, w: 32, h: 42, fn: () => Duel.show(Duel.sel + 1) });
        if (Duel.best > 0) drawTextShadow(g, 'BEST DEPTH ' + pad(Duel.best, 2), land ? L : RR, land ? T : T + 13, amber, 1, land ? 0 : 2);
      }
    } else if (hero) {
      const hr = hero, d = deck, foe = hr.foe;
      if (d && st !== 'ride') {
        // damage panels sit at the bottom centre; on a phone held upright they ride just above the buttons
        const small = compact || touch, pwd = small ? 108 : 150, gap = small ? 10 : Math.round(clamp(w * .08, 24, 70)), py = BB - (small ? 36 : 40) - (touch && !land ? Math.round(h * .3) : 0);
        this.panel(g, hr, Math.round(w / 2 - gap / 2) - pwd, py, small); if (foe) this.panel(g, foe, Math.round(w / 2 + gap / 2), py, small);
        if (!compact) { drawTextShadow(g, 'DEPTH ' + pad(Duel.depth, 2), w / 2, T - 1, bone, 1, 1); if (w > 440) drawTextShadow(g, d.theme.name, w / 2, T + 9, acc, 1, 1); if (Duel.champ) drawTextShadow(g, 'CHAMPION', w / 2, T + (w > 440 ? 19 : 9), red, 1, 1); }
        else drawTextShadow(g, pad(Duel.depth, 2), w / 2, T - 1, bone, 1, 1);
        if (touch && st === 'fight') { const bx = Math.round(w / 2) - 7, by = T + (compact ? 10 : 30); g.fillStyle = '#05060b'; g.globalAlpha = .6; g.fillRect(bx, by, 14, 12); g.globalAlpha = 1; g.fillStyle = dim; g.fillRect(bx + 4, by + 3, 2, 6); g.fillRect(bx + 8, by + 3, 2, 6); this.hot.push({ x: bx - 8, y: by - 6, w: 30, h: 26, fn: () => { Duel.paused = true; Duel.pSel = 0; } }); }
        for (const f of fighters) {
          if (f.state === 'dead') continue; worldToScreen(f.x, f.y + 2.25 * f.def.scale, f.z, _v1); const sx = Math.round(_v1.x * w), sy = Math.round((1 - _v1.y) * h);
          if (sx < 3 || sx > w - 3 || sy < 3 || sy > h - 3) { const mx = clamp(sx, 7, w - 7), my = clamp(sy, 7, h - 7); g.fillStyle = '#05060b'; g.fillRect(mx - 5, my - 5, 10, 10); g.fillStyle = f.def.hue; g.fillRect(mx - 4, my - 4, 8, 8); g.fillStyle = '#05060b'; g.fillRect(mx - 1, my - 1, 2, 2); continue; }
          if (f.popT > 0) { f.popT -= raw; g.globalAlpha = sat(f.popT / .25); drawTextShadow(g, Math.round(f.pct) + '%', sx + (f.side ? 14 : -14), sy - 4 - Math.round((1 - sat(f.popT / .8)) * 7), pctCol(f.pct), compact ? 1 : 2, 1); g.globalAlpha = 1; }
          else if (f === hr && Duel.youT > 0 && Math.sin(this.t * 9) > -.5) { drawTextShadow(g, 'YOU', sx, sy - 13, amber, 1, 1); g.fillStyle = amber; g.fillRect(sx - 2, sy - 4, 5, 1); g.fillRect(sx - 1, sy - 3, 3, 1); g.fillRect(sx, sy - 2, 1, 1); }
        }
        if (Duel.depth === 1 && (st === 'intro' || (st === 'fight' && game.t - Duel.t0 < 16))) {
          const hy = T + (compact ? 24 : w > 440 ? 24 : 14) + (Duel.champ ? 10 : 0) + (touch ? 16 : 0);
          if (touch) drawTextShadow(g, compact ? 'KNOCK THEM OFF THE DECK' : 'DAMAGE % MAKES THEM FLY FURTHER. A FALL IS A LOST STOCK.', w / 2, hy, dim, 1, 1);
          else if (w > 520) { drawTextShadow(g, 'WASD MOVE    J ATTACK    K HEAVY (HOLD TO CHARGE)    L SPECIAL    SPACE GUARD', w / 2, hy, bone, 1, 1); drawTextShadow(g, 'GUARD + MOVE: DODGE ROLL        GUARD THEN ATTACK: GRAB AND THROW', w / 2, hy + 11, dim, 1, 1); drawTextShadow(g, 'DAMAGE % MAKES THEM FLY FURTHER. THERE IS NO WAY BACK FROM A FALL.', w / 2, hy + 22, dim, 1, 1); }
          else { drawTextShadow(g, 'WASD MOVE  J ATTACK  K HEAVY  L SPECIAL', w / 2, hy, bone, 1, 1); drawTextShadow(g, 'SPACE GUARD / DODGE.  DO NOT FALL.', w / 2, hy + 11, dim, 1, 1); }
        }
      }
      let ty = Math.round(h * (touch ? .46 : .6));
      for (let i = this.toasts.length - 1; i >= 0; i--) { const t = this.toasts[i]; t.t += raw; if (t.t > t.dur) { this.toasts.splice(i, 1); continue; } g.globalAlpha = sat(Math.min(t.t / .15, (t.dur - t.t) / .4)); drawTextShadow(g, t.text, w / 2, ty, i === this.toasts.length - 1 ? bone : dim, 1, 1); ty -= 11; }
      g.globalAlpha = 1;
      const b = Duel.ban;
      if (b) { b.t += raw; if (b.t > b.dur) Duel.ban = null; else { const base = w > 560 ? 5 : w > 300 ? 3 : 2; let s = Math.max(1, (b.big ? base : base - 1) + (b.t < .06 ? 1 : 0)); while (s > 1 && textW(b.text, s) > w - 10) s--; g.globalAlpha = sat(Math.min(b.t / .05, (b.dur - b.t) / .25)); drawTextShadow(g, b.text, w / 2, Math.round(h * .3) - s * 3, b.col, s, 1); g.globalAlpha = 1; } }
      const c = this.card;
      if (c) {
        c.t += raw; if (!c.hold) c.out = (c.out || 0) + raw; const a = sat(Math.min((c.t - .3) / .5, c.hold ? 1 : 1 - c.out / .6)); if (!c.hold && c.out > .6) this.card = null;
        if (a > 0) {
          g.globalAlpha = a; const fd = Duel.foeDef, cy = Math.round(h * (land ? .13 : .16)), s = w > 560 ? 4 : w > 300 ? 3 : 2, s2 = textW(c.name, 2) > w - 12 ? 1 : 2, hw = Math.min(120, w / 2 - 10), P = compact || h < 300 ? 36 : 72, py = cy + s * 7 + 34;
          g.fillStyle = acc; g.fillRect(w / 2 - hw, cy - 9, hw * 2, 1); drawTextShadow(g, c.big, w / 2, cy, bone, s, 1); drawTextShadow(g, c.name, w / 2, cy + s * 7 + 8 + (s2 === 1 ? 4 : 0), acc, s2, 1);
          if (fd && hero) {
            const o = Math.round(P * .5 + (compact ? 22 : 34)), lx = Math.round(w / 2) - o - P, rx = Math.round(w / 2) + o;
            this.face(g, ROSTER.indexOf(hero.def), lx, py, P, hero.def.hue); this.face(g, ROSTER.indexOf(fd), rx, py, P, fd.hue); drawTextShadow(g, 'VS', w / 2, py + Math.round(P / 2) - 7, bone, 2, 1);
            drawTextShadow(g, hero.def.short, lx + P / 2, py + P + 6, hero.def.hue, 1, 1); drawTextShadow(g, fd.short, rx + P / 2, py + P + 6, fd.hue, 1, 1);
            if (c.extra) drawTextShadow(g, c.extra, w / 2, py + P + 20, red, 1, 1); g.fillStyle = acc; g.fillRect(w / 2 - hw, py + P + (c.extra ? 33 : 20), hw * 2, 1);
          }
          g.globalAlpha = 1;
        }
      }
      if (st === 'results') {
        g.fillStyle = '#04050a'; g.globalAlpha = .55 * sat(Duel.pt / .5); g.fillRect(0, 0, w, h); g.globalAlpha = sat(Duel.pt / .5); const s = w > 560 ? 5 : w > 300 ? 3 : 2; let y = Math.round(h * .2);
        drawTextShadow(g, 'DEFEATED', w / 2, y, red, s, 1); y += s * 7 + 12; drawTextShadow(g, hr.def.name, w / 2, y, hr.def.hue, 1, 1); y += 14;
        drawTextShadow(g, 'FELL AT DEPTH ' + pad(Duel.depth, 2), w / 2, y, bone, compact ? 1 : 2, 1); y += compact ? 14 : 22;
        drawTextShadow(g, Duel.bestNew ? 'A NEW BEST!' : 'BEST DEPTH ' + pad(Duel.best, 2), w / 2, y, amber, 1, 1); y += 16;
        drawTextShadow(g, 'DUELS WON ' + pad(Duel.depth - 1, 2) + '    KNOCKOUTS ' + pad(Duel.stats.kos, 2), w / 2, y, dim, 1, 1); y += 11; drawTextShadow(g, 'DAMAGE DEALT ' + Math.round(Duel.stats.dmg) + '%', w / 2, y, dim, 1, 1); y += 22;
        this.btn(g, touch ? 'CONTINUE' : 'ENTER: CONTINUE', Math.round(w / 2 - 55), y, 110, 18, () => Duel.toMenu('select'), Math.sin(this.t * 5) > 0); g.globalAlpha = 1;
      }
      if (Duel.paused) {
        g.fillStyle = '#04050a'; g.globalAlpha = .62; g.fillRect(0, 0, w, h); g.globalAlpha = 1; let y = Math.round(h * .24); drawTextShadow(g, 'PAUSED', w / 2, y, bone, w > 300 ? 3 : 2, 1); y += 34;
        this.btn(g, 'RESUME', Math.round(w / 2 - 50), y, 100, 18, () => { Duel.paused = false; }, Duel.pSel === 0); this.btn(g, 'QUIT THE RUN', Math.round(w / 2 - 50), y + 24, 100, 18, () => { Duel.paused = false; Duel.toMenu('select'); }, Duel.pSel === 1); y += 56;
        if (!touch) for (const ln of ['WASD / ARROWS   MOVE', 'J / Z   ATTACK (TAP FOR A COMBO)', 'K / X   HEAVY (HOLD TO CHARGE)', 'L / C   SPECIAL', 'SPACE / SHIFT   GUARD', 'GUARD + MOVE   DODGE ROLL', 'GUARD THEN ATTACK   GRAB AND THROW', 'A FALL IS A LOST STOCK: THERE IS NO WAY BACK', 'M   MUTE']) { if (y < BB - 6) drawTextShadow(g, ln, w / 2, y, dim, 1, 1); y += 10; }
      }
    }
    const sx = touch ? w / 2 : RR, sa = touch ? 1 : 2, sy = st === 'title' || st === 'boot' ? BB - 6 : -99;
    if (this.sndHint) { g.globalAlpha = .8 + .2 * Math.sin(this.t * 2.2); drawTextShadow(g, touch ? 'TAP FOR SOUND' : 'CLICK FOR SOUND', sx, sy, '#e0c88c', 1, sa); g.globalAlpha = 1; }
    else if (this.sndT > 0) { this.sndT -= raw; g.globalAlpha = sat(this.sndT); drawTextShadow(g, touch ? 'SOUND ON' : 'SOUND ON - M MUTES', sx, st === 'title' ? BB - 6 : -99, '#e0c88c', 1, sa); g.globalAlpha = 1; }
  }
};
// ------------------------------------------------------------------ the lift shaft: the title, the select screen and every descent happen here
const RIDE = { x: -400, z: -400, grp: null, scroll: null, v: 0, off: 0 };
function buildRideSet() {
  const g = new Group(); g.position.set(RIDE.x, 0, RIDE.z); g.visible = false; scene.add(g); RIDE.grp = g;
  g.add(partObj(buildPart(k => {
    k.at(0, 0, 0, PI / 6).cyl('steel', 0, -.34, 0, 2.6, .34, 6).cyl('grate', 0, .001, 0, 2.2, .02, 6).ring('brass', 0, .02, 0, 2.4, true, HPI, 0, 0, .07).ring('gAccent', 0, .03, 0, 2.05, false, HPI, 0, 0, .04);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.boxB('iron', Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4, .2, .9, .2, 0, -a).box('gAccent', Math.cos(a) * 2.4, .96, Math.sin(a) * 2.4, .12, .1, .12, 0, -a); }
    k.at(0, 0, 0, 0).beam('steel', -2.9, -30, -1.2, -2.9, 40, -1.2, .09, 6).beam('steel', -1.2, -30, -2.9, -1.2, 40, -2.9, .09, 6).beam('rubber', -3.1, -30, 1.6, -3.1, 40, 1.6, .05, 5).beam('rubber', 1.6, -30, -3.1, 1.6, 40, -3.1, .05, 5);
  })));
  const mod = buildPart(k => {
    k.box('iron', -3.7, 2, 0, .4, 4, 9.4).box('iron', 0, 2, -3.7, 9.4, 4, .4).box('brass', -3.46, .2, 0, .1, .3, 9.4).box('brass', 0, .2, -3.46, 9.4, .3, .1).box('gAccentDim', -3.47, 2.2, 0, .04, .12, 6).box('gAccentDim', 0, 2.2, -3.47, 6, .12, .04);
    for (const s of [-3.3, 0, 3.3]) k.box('steel', -3.4, 2, s, .2, 4, .34).box('steel', s, 2, -3.4, .34, 4, .2);
    k.box('hazard', -3.47, 3.4, 2, .04, .5, 1.4).box('relief', -1.6, 2.6, -3.47, 1.2, 1.2, .04);
  });
  RIDE.scroll = new Group(); g.add(RIDE.scroll);
  for (let i = -7; i < 10; i++) { const o = partObj(mod); o.position.y = i * 4; RIDE.scroll.add(o); }
}
const Flow = { gen: null, built: null, warm: null, rideT: 0, phase: 0, theme: null, outT: 0 };
function shaftScene() {
  const th = Flow.theme, a = th.accent; applyTheme(th); MATS.floor.m.emissive.multiplyScalar(.3); HUD.accent = css([.32 + a[0] * .68, .32 + a[1] * .68, .32 + a[2] * .68], 1); Music.setTheme(th.id); Lights.clear(); Post.hazes = []; RIDE.grp.visible = true;
  Lights.add(RIDE.x - 2.4, 3.2, RIDE.z - 2.4, a[0], a[1], a[2], 12, 12, .3); Lights.add(RIDE.x + 1.5, 1, RIDE.z + 1.5, 1, .6, .3, 4, 8, .2); Duel.rim = Lights.add(RIDE.x - 1.5, 2.1, RIDE.z - 1.5, 1, 1, 1, 7, 7, .08);
  CAM.x = RIDE.x; CAM.z = RIDE.z; AudioSys.setRoom(.55);
}
function startRide(first) {
  Duel.depth++; Duel.champ = Duel.depth % 5 === 0; Duel.foeDef = Duel.nextFoe(); game.state = 'ride'; Flow.rideT = 0; Flow.built = null; Flow.gen = null; Flow.warm = null; Duel.ban = null; Tele.clear();
  if (first) { hero.setState('ride'); Flow.phase = 1; beginDescent(); } else { Flow.phase = 0; game.fadeTo = 0; SFX.play('door', hero.x, hero.z, .8, .7); }
}
function enterShaft() {
  Duel.clearArena(); Flow.theme = ThemeBag.next(); shaftScene(); hero.place(RIDE.x, RIDE.z, PI * .25); hero.setState('ride'); CAM.h = 13.5 * VIEW.fit; CAM.y = 0; RIDE.v = 9;
  const c = hero.def.col; Duel.rim.r = c[0] / 6; Duel.rim.g = c[1] / 6; Duel.rim.b = c[2] / 6; beginDescent(); game.fadeTo = 1; Flow.phase = 1; Flow.rideT = 0;
}
function beginDescent() {
  const th = Flow.theme; HUD.title('DEPTH ' + pad(Duel.depth, 2), th.name, 'VS  ' + Duel.foeDef.name, Duel.champ ? 'A CHAMPION WAITS BELOW' : null); Music.target = 0; Music.boss = false; Music.fanfare();
  Flow.gen = buildArena(((Date.now() & 0xffffff) * 31 + Duel.depth * 7919 + (rnd.next() * 1e6 | 0)) >>> 0, Duel.depth, th);
}
function* warmArena(d) {
  scene.add(d.group); yield;
  const sx = CAM.x, sz = CAM.z, sh = CAM.h, sy = CAM.y; CAM.x = d.cx; CAM.z = d.cz; CAM.y = 0; CAM.h = 34; applyCamera(); Post.warm(); CAM.x = sx; CAM.z = sz; CAM.h = sh; CAM.y = sy; applyCamera(); yield;
}
function arrive() {
  const d = Flow.built; Flow.built = null; activateDeck(d); makeHazards(d); Stage.reset(); RIDE.grp.visible = false; RIDE.v = 0;
  const foe = new Fighter(Duel.foeDef, 1, true), s = d.spawn; fighters.length = 0; fighters.push(hero, foe);
  const T = Duel.test; foe.stocks = foe.maxSt = T ? T.stocks : Duel.depth <= 2 ? 1 : Duel.champ ? 3 : 2; if (T) hero.stocks = T.stocks; Duel.cpu = new CPU(foe, T ? T.lv : Math.min(1, clamp(.1 + (Duel.depth - 1) * .08, .1, 1) + (Duel.champ ? .12 : 0))); Duel.auto = Duel.demo ? new CPU(hero, T ? T.lv : .85) : null;
  hero.maxSt = 3; [hero, foe].forEach((f, i) => { const o = s[1 - i]; f.fresh(); f.place(s[i][0], s[i][1], Math.atan2(o[0] - s[i][0], o[1] - s[i][1])); f.y = 7; f.setState('respawn'); f.inv = 3; f.pct0 = 0; f.popT = 0; f.dmgDone = 0; });
  game.state = 'intro'; Duel.pt = 0; Duel.rdy = false; game.fadeTo = 1; game.fade = 0; if (HUD.card) HUD.card.hold = false;
  CAM.x = d.cx; CAM.z = d.cz; CAM.y = 0; CAM.h = Math.max(32, 25 / VIEW.aspect); AudioSys.setRoom(.5); SFX.play('door', d.cx, d.cz, .9, .8);
  if (Duel.depth > Duel.best && !Duel.demo) { Duel.best = Duel.depth; Duel.bestNew = true; Duel.save(); }
}
function updateRide(dt, raw) {
  Flow.rideT += raw; const th = Flow.theme;
  if (Flow.phase === 0) { if (game.fade < .03 || Flow.rideT > 1) enterShaft(); return; }
  RIDE.v = damp(RIDE.v, 9, 1.8, raw); const a = th.accent, k = RIDE.v / 9;
  if (R() < raw * 50 * k) FX.add.spawn(RIDE.x + (R() < .5 ? -3.3 : RS(3.2)), -3, RIDE.z + (R() < .5 ? -3.3 : RS(3.2)), 0, R(10, 18), 0, .8, R(.05, .1), a[0] * 5 + 1, a[1] * 5 + 1, a[2] * 5 + 1, 0, 0);
  if (R() < raw * 6 * k) FX.spark(RIDE.x - 3.2, R(0, 3), RIDE.z + RS(3), 5, 7, 4, 1.5, 3, .5, .07, 8);
  game.trauma = Math.max(game.trauma, .09 * k);
  // build the next arena inside a per-frame time budget so the ride never hitches
  const t0 = performance.now();
  if (Flow.gen) { while (performance.now() - t0 < 6.5) { const r = Flow.gen.next(); if (r.done) { Flow.built = r.value; Flow.gen = null; Flow.warm = warmArena(Flow.built); break; } } }
  else if (Flow.warm) { if (Flow.warm.next().done) Flow.warm = null; }
  else if (Flow.built && Flow.rideT > 3.7) {
    if (Flow.phase === 1) { Flow.phase = 2; game.fadeTo = 0; Flow.outT = 0; }
    else { Flow.outT += raw; if (game.fade < .03 || Flow.outT > .8) arrive(); }
  }
}
// ------------------------------------------------------------------ the run
const Duel = {
  sel: 0, depth: 0, best: 0, bestNew: false, foeDef: null, champ: false, cpu: null, auto: null, demo: false, pt: 0, t0: 0, ban: null, won: false, paused: false, pSel: 0, showT: 0, youT: 0, rdy: false, test: null, from: 0, koX: 0, koZ: 0, koT: 0, fallX: 0, fallZ: 0, bag: [], rim: null, stats: { kos: 0, dmg: 0, falls: 0 },
  banner(text, dur = 1, col = '#ffffff', big = false) { this.ban = { text, dur, col, big, t: 0 }; },
  note(f, name) { HUD.toast(f === hero ? name : f.def.short + ' TAKES THE ' + name, 1.8); },
  load() { try { this.best = +localStorage.getItem('voidlightDuelBest') || 0; this.sel = clamp(+localStorage.getItem('voidlightDuelPick') || 0, 0, ROSTER.length - 1) | 0; } catch (e) { } },
  save() { if (this.demo) return; try { localStorage.setItem('voidlightDuelBest', this.best); localStorage.setItem('voidlightDuelPick', this.sel); } catch (e) { } },
  show(i) {                 // stand fighter i on the lift
    const n = ROSTER.length; this.sel = ((i % n) + n) % n; if (hero) hero.dispose(); fighters.length = 0; hero = new Fighter(ROSTER[this.sel], 0, false); fighters.push(hero); hero.place(RIDE.x, RIDE.z, PI * .25); hero.setState('intro'); hero.flash = .7; this.showT = 0;
    const c = hero.def.col; if (this.rim) { this.rim.r = c[0] / 6; this.rim.g = c[1] / 6; this.rim.b = c[2] / 6; } FX.burst(RIDE.x, 1, RIDE.z, 16, c[0] * .6, c[1] * .6, c[2] * .6, 3, .5, .11); if (game.state === 'select') SFX.play('blink', RIDE.x, RIDE.z, .5, 1.3);
  },
  pick(i) { if (game.state === 'title') { game.state = 'select'; SFX.play('pickup', RIDE.x, RIDE.z, .6, 1.2); } else if (i === this.sel) this.begin(); else this.show(i); },
  clearArena() {
    VoidFX.clear(); for (const f of fighters) if (f !== hero) f.dispose(); if (hero) hero.fresh(); fighters.length = 0; if (hero) fighters.push(hero); this.cpu = null; this.auto = null;
    if (deck) { disposeDeck(deck); deck = null; } FX.clearDeck(); Bolts.mesh.count = 0; Lights.clear(); Post.hazes = [];
  },
  toMenu(state) {
    this.clearArena(); if (!Flow.theme || state !== 'title') Flow.theme = ThemeBag.next(); shaftScene(); game.state = state; this.show(this.sel); game.fadeTo = 1; this.paused = false; this.ban = null; HUD.card = null; HUD.toasts.length = 0; RIDE.v = 0; Music.target = 0; Music.boss = false; CAM.y = 1;
  },
  begin() { if (game.state !== 'select') return; this.depth = this.from; this.from = 0; this.stats = { kos: 0, dmg: 0, falls: 0 }; this.bag = []; this.bestNew = false; hero.stocks = 3; this.save(); SFX.play('unseal', RIDE.x, RIDE.z, .8, 1); startRide(true); },
  nextFoe() { if (!this.bag.length) { this.bag = ROSTER.filter(d => d !== hero.def); rnd.shuffle(this.bag); } return this.bag.pop(); },
  onFall(f, ex, ez) { FX.slowmo(.14, .6); FX.shake(.18); this.fallX = ex; this.fallZ = ez; if (f === hero) Touch.buzz(30); },
  onKO(f, mode) {
    // VoidFX handles the visual punctuation (Voidlight Lance + Star-Glint, Blast Streak, or Foundry lava plunge).
    const lim = deck.R + 6, ox = f.x - deck.cx, oz = f.z - deck.cz, od = Math.hypot(ox, oz) || 1, k = Math.min(1, lim / od), x = deck.cx + ox * k, z = deck.cz + oz * k;
    this.koX = x; this.koZ = z; this.koT = .85;
    FX.hitStop(.08); FX.shake(mode === 'blast' ? .55 : .42); FX.slowmo(.28, .42);
    if (mode === 'lava') SFX.play('lavako', CAM.x, CAM.z, .95, 1);
    else SFX.play('voidko', CAM.x, CAM.z, .95, mode === 'blast' ? 1.15 : 1);
    if (f === hero) { this.stats.falls++; Touch.buzz(80); } else this.stats.kos++;
    if (f.stocks <= 0) {
      game.state = 'end'; this.pt = 0; this.won = f !== hero; this.banner(this.won ? 'VICTORY' : 'DEFEATED', 2.4, this.won ? '#ffd76a' : '#ff5a3c', true); Music.sting(this.won); Music.target = 0; Music.boss = false;
      for (const o of fighters) if (o !== f) o.inv = 9;
    } else this.banner(f === hero ? 'STOCK LOST' : 'KNOCKOUT', 1.2, f === hero ? '#ff5a3c' : '#ffd76a', true);
  },
  still(dt) { for (const f of fighters) { f.I.mx = f.I.mz = 0; for (const k of BTN) f.I[k] = false; f.update(dt); } },
  pauseMenu() {
    const N = Input.nav; Input.poll();
    if (N.pause || N.back) this.paused = false; else if (N.up || N.dn) this.pSel ^= 1; else if (N.ok) { this.paused = false; if (this.pSel) this.toMenu('select'); }
  },
  update(dt, raw) {
    const st = game.state, N = Input.nav; Input.poll();
    if (st === 'title') { this.showT += raw; if (this.showT > 2.8) this.show(this.sel + 1); if (N.any) this.pick(-1); }
    else if (st === 'select') { const n = ROSTER.length; if (N.lf) this.show(this.sel - 1); else if (N.rt) this.show(this.sel + 1); else if (N.up || N.dn) this.show(this.sel + (this.sel < 5 ? 5 : -5)); else if (N.ok) this.begin(); else if (N.back) game.state = 'title'; }
    else if (st === 'ride') updateRide(dt, raw);
    else if (st === 'intro') {
      this.pt += raw; this.still(dt); for (const a of deck.anim) a.fn(dt, uTime.value);
      if (this.pt > 1.45 && !this.rdy) { this.rdy = true; this.banner('READY', .9, '#e6dcc6', true); SFX.play('charge', CAM.x, CAM.z, .6, 1.4); }
      if (this.pt > 2.45) { game.state = 'fight'; this.t0 = game.t; this.banner('DUEL!', .8, '#ffd76a', true); SFX.play('deflect', CAM.x, CAM.z, .8, .8); for (const f of fighters) f.inv = 0; this.youT = 3.5; Music.target = .5; Music.boss = this.champ; }
    } else if (st === 'fight') {
      if (N.pause || N.back) { this.paused = true; this.pSel = 0; return; }
      if (this.auto) this.auto.update(dt); else { const I = Input.I, H = hero.I; H.mx = I.mx; H.mz = I.mz; for (const k of BTN) H[k] = I[k]; }
      if (this.cpu) this.cpu.update(dt);
      for (const f of fighters) f.update(dt);
      Combat.step(); Stage.update(dt); this.youT -= dt;
      for (const f of fighters) { if (f.pct > (f.pct0 || 0) + .4) { f.popT = .8; if (f !== hero) this.stats.dmg += f.pct - (f.pct0 || 0); else if (f.state === 'hurt') { game.hurt = Math.max(game.hurt, clamp(f.kb / 40, .08, .45)); Touch.buzz(f.kb > 14 ? 40 : 12); } } f.pct0 = f.pct; }
      const o = hero.foe; if (game.state === 'fight') Music.target = (o && o.stocks === 1 && o.pct > 70) || (hero.stocks === 1 && hero.pct > 70) ? 1 : .5;
    } else if (st === 'end') {
      this.pt += raw; this.still(dt); Stage.update(dt); const wn = this.won ? hero : hero.foe;
      if (wn && this.pt > .9 && wn.state === 'idle' && !wn.air) { wn.setState('win'); wn.vx = wn.vz = wn.kx = wn.kz = 0; wn.yaw = PI * .25; }
      if (this.won) { if (this.pt > 3.3) { hero.stocks = Math.min(3, hero.stocks + 1); startRide(false); } }
      else if (this.pt > 2.7) { game.state = 'results'; this.pt = 0; this.save(); }
    } else if (st === 'results') { this.pt += raw; this.still(dt); if (N.ok && this.pt > .5) this.toMenu('select'); }
    if (st === 'title' || st === 'select' || st === 'ride') {
      if (st !== 'ride') hero.yaw = PI * .25 + Math.sin(game.real * .7) * .45;
      if (Flow.phase !== 0 || st !== 'ride') { hero.I.mx = hero.I.mz = 0; for (const k of BTN) hero.I[k] = false; } hero.update(dt);
    }
  }
};
// ------------------------------------------------------------------ camera: close on the lift, and framing both duellists on the deck
function updateCamera(raw) {
  const st = game.state, land = VIEW.aspect > 1.05; let tx, tz, ty = 0, th, kz = 3, kp = 5;
  if (RIDE.grp.visible) {
    tx = RIDE.x; tz = RIDE.z;
    if (st === 'ride') { th = 13.5 * VIEW.fit; kz = 1.5; }
    else { th = land ? 7.6 : 5.9 / VIEW.aspect; kz = 6; if (land) { const s = th * VIEW.aspect * .2; tx += CAM.right.x * s; tz += CAM.right.z * s; ty = 1.05; } else ty = 1.05 - th * .2 / CAM.up.y; }
  } else {
    let n = 0, sx = 0, sz = 0, r0 = 1e9, r1 = -1e9, u0 = 1e9, u1 = -1e9; const d = deck, lim = d.R + 7;
    const add = (x, y, z) => { const ox = x - d.cx, oz = z - d.cz, od = Math.hypot(ox, oz), k = od > lim ? lim / od : 1; x = d.cx + ox * k; z = d.cz + oz * k; y = clamp(y, -3, 9); const r = x * CAM.right.x + z * CAM.right.z, u = x * CAM.up.x + y * CAM.up.y + z * CAM.up.z; r0 = Math.min(r0, r); r1 = Math.max(r1, r); u0 = Math.min(u0, u); u1 = Math.max(u1, u); sx += x; sz += z; n++; };
    const wn = st === 'end' || st === 'results' ? (Duel.won ? hero : hero.foe) : null;
    if (wn && Duel.pt > .8 || st === 'results') { add(wn.x, wn.y, wn.z); tx = wn.x; tz = wn.z; th = Math.max(10.5, 7.5 / VIEW.aspect); kz = 2; }
    else {
      for (const f of fighters) if (f.state !== 'dead') add(f.x, f.y, f.z);
      if (Duel.koT > 0) { Duel.koT -= raw; add(Duel.koX, 0, Duel.koZ); }
      if (n < 2) add(d.home[0], 0, d.home[1]);
      tx = lerp(sx / n, d.cx, .22); tz = lerp(sz / n, d.cz, .22);
      const lo = Math.max(12.5, 9 / VIEW.aspect), full = Math.max(d.R * 1.34 + 5, (d.R * 2 + 5) / VIEW.aspect); th = clamp(Math.max(u1 - u0 + 9.5, (r1 - r0 + 11) / VIEW.aspect, lerp(lo, full, .28 * Math.min(1, VIEW.aspect))), lo, Math.max(27, 22 / VIEW.aspect)); kz = th > CAM.h ? 5 : 1.4; kp = 4;
    }
  }
  CAM.x = damp(CAM.x, tx, kp, raw); CAM.z = damp(CAM.z, tz, kp, raw); CAM.y = damp(CAM.y, ty, 5, raw); CAM.h = damp(CAM.h, th, kz, raw);
  game.trauma = Math.max(0, game.trauma - raw * 1.7); const sh = game.trauma * game.trauma, t = game.real;
  CAM.shx = (vnoise(t * 27, 1.3) - .5) * .9 * sh; CAM.shy = (vnoise(t * 27, 7.7) - .5) * .9 * sh;
  applyCamera();
  if (Duel.koT > 0 && !RIDE.grp.visible) worldToScreen(Duel.koX, 1, Duel.koZ, _v1); else worldToScreen(tx, 1, tz, _v1); Post.focusZ = damp(Post.focusZ, _v1.z, 14, raw); Post.focusY = damp(Post.focusY, clamp(_v1.y, .22, .78), 9, raw);
  // the lantern hangs over the fight
  let lx = RIDE.x + 1.3, ly = 3.1, lz = RIDE.z + 1.3, li = 20, ld = 15;
  if (!RIDE.grp.visible) { let n = 0, sx = 0, sz = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const f of fighters) { if (f.state === 'dead') continue; sx += f.x; sz += f.z; x0 = Math.min(x0, f.x); x1 = Math.max(x1, f.x); z0 = Math.min(z0, f.z); z1 = Math.max(z1, f.z); n++; } const sp = n > 1 ? Math.min(16, Math.hypot(x1 - x0, z1 - z0)) : 0; if (n) { lx = sx / n + .7; lz = sz / n + .7; } else { lx = deck.cx; lz = deck.cz; } ly = 3.3 + sp * .2; li = 21 + sp * .6; ld = 17 + sp * .7; }
  const lp = lantern.position, snap = dist2(lp.x, lp.z, lx, lz) > 900; lp.set(snap ? lx : damp(lp.x, lx, 6, raw), damp(lp.y, ly + Math.sin(t * 1.3) * .06, 5, raw), snap ? lz : damp(lp.z, lz, 6, raw)); lantern.intensity = damp(lantern.intensity, li, 5, raw); lantern.distance = damp(lantern.distance, ld, 5, raw); lantern.color.setRGB(1, .8, .55);
}
// ------------------------------------------------------------------ boot + main loop
function* bootSeq() {
  const n = TEX_JOBS.length;
  for (let i = 0; i < n; i++) { HUD.bootMsg = 'FORGING MATERIALS'; TEX_JOBS[i](); HUD.boot = (i + 1) / n * .78; yield; }
  HUD.bootMsg = 'RAISING THE DECKS'; initGeoms(); initPropGeoms(); initMaterials(); initMaterials2(); yield;
  FX.init(); Bolts.init(); Post.resize(); Post.applyQuality(); HUD.boot = .86; yield;
  HUD.bootMsg = 'WAKING THE DUELLISTS'; for (let i = 0; i < ROSTER.length; i++) { RIGS[ROSTER[i].rig](); HUD.boot = .86 + (i + 1) / ROSTER.length * .12; yield; }
  buildRideSet(); Input.init(); Duel.load(); applyTheme(THEMES[0]); HUD.bootMsg = 'PAINTING THE PORTRAITS'; for (let i = 0; i < ROSTER.length; i++) { shootPortrait(i); yield; }
  HUD.boot = 1; yield;
  game.fade = 0; Duel.toMenu('title');
}
let _boot = bootSeq(), _last = performance.now(), _errSeen = new Set(), _resize = true;
window.addEventListener('resize', () => { _resize = true; });
window.addEventListener('pointerdown', e => { AudioSys.enable(); if (game.state !== 'boot') HUD.click(e.clientX * HUD.w / Math.max(1, window.innerWidth), e.clientY * HUD.h / Math.max(1, window.innerHeight)); });
function tick(raw) {
  game.real += raw;
  if (Duel.paused) { Duel.pauseMenu(); return; }
  let ts = 1; if (game.hitStop > 0) { game.hitStop -= raw; ts = .04; } else if (game.slowT > 0) { game.slowT -= raw; ts = lerp(1, game.slowK, sat(game.slowT / .25)); }
  const dt = Math.min(1 / 30, raw) * ts; game.dt = dt; game.t += dt; uTime.value += dt;
  Arcs.begin(); Duel.update(dt, raw); Arcs.end();
  RIDE.off = (RIDE.off + RIDE.v * raw) % 4; RIDE.scroll.position.y = RIDE.off;
  VoidFX.update(dt, raw); updateCamera(raw); Lights.update(dt, CAM.x, CAM.z); FX.update(dt, CAM.x, CAM.z); SFX.update(raw);
  const st = game.state; game.fade = damp(game.fade, game.fadeTo, game.fadeTo > game.fade ? 5 : 9, raw); game.hurt = Math.max(0, game.hurt - raw * 2.2); game.flash = Math.max(0, game.flash - raw * 2.5);
  game.desat = damp(game.desat, st === 'results' || (st === 'end' && !Duel.won) ? .75 : 0, 3, raw);
  FINU.uFade.value = game.fade; FINU.uHurt.value = game.hurt * .25; FINU.uFlash.value = game.flash; FINU.uDesat.value = game.desat;
}
function frame(now) {
  requestAnimationFrame(frame);
  const rawFull = (now - _last) / 1000; _last = now; const raw = clamp(rawFull, 0, .1);
  try {
    if (_resize) { _resize = false; Post.resize(); }
    if (_boot) { const t0 = performance.now(); while (_boot && performance.now() - t0 < 14) { if (_boot.next().done) _boot = null; } HUD.draw(raw); if (_boot || game.state === 'boot') return; }
    Post.tickQuality(rawFull); tick(raw); Post.render(); HUD.draw(raw);
  } catch (e) { const k = String(e && e.stack || e); if (!_errSeen.has(k)) { _errSeen.add(k); console.error(e); } }
}
// small inspection hooks (used for testing; harmless otherwise)
window.__vd = { game, Q, VIEW, Flow, Post, CAM, THEMES, ROSTER, Lights, FX, FINU, Duel, Input, HUD, RIDE, scene, GX, lantern, get deck() { return deck; }, get hero() { return hero; }, get fighters() { return fighters; }, get errors() { return [..._errSeen]; },
  fast(n) { let e = null; for (let i = 0; i < n; i++) { try { tick(1 / 60); } catch (x) { e = String(x && x.stack || x); _errSeen.add(e); break; } } return e; },
  boot() { while (_boot) { if (_boot.next().done) _boot = null; } return game.state; },
  start(i, demo, depth) { Duel.demo = !!demo; if (game.state !== 'select') Duel.toMenu('select'); Duel.show(i); Duel.from = (depth || 1) - 1; Duel.begin(); return game.state; },
  theme(id) { ThemeBag.force = id; }, lockQ(n) { Q.lock = true; Post.setLevel(n); } };
requestAnimationFrame(frame);
