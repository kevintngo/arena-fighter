// =====================================================================================
//  TOUCH CONTROLS (portrait and landscape): a floating stick under the left thumb, four buttons under the right.
//  They only exist during a duel; menus are tapped directly.
// =====================================================================================
const TOUCH_DEV = (navigator.maxTouchPoints || 0) > 0 && !!window.matchMedia && matchMedia('(pointer: coarse)').matches;
const Touch = {
  used: false, live: false, stickId: -1, ox: 0, oy: 0, sx: 0, sy: 0, atk: false, heavy: false, spec: false, guard: false, last: 0, el: null, stick: null, knob: null,
  wake() { if (!this.used) { this.used = true; this.el.classList.add('on'); } this.last = performance.now(); this.el.classList.remove('idle'); },
  place() { this.stick.style.left = this.ox + 'px'; this.stick.style.top = this.oy + 'px'; },
  buzz(ms) { const ua = navigator.userActivation; if (this.used && navigator.vibrate && (!ua || ua.hasBeenActive)) { try { navigator.vibrate(ms); } catch (e) { } } },
  sync(live) {
    if (live !== this.live) { this.live = live; this.el.classList.toggle('menu', !live); if (!live) { this.stickId = -1; this.sx = this.sy = 0; this.atk = this.heavy = this.spec = this.guard = false; this.stick.style.opacity = 0; } }
    if (this.used && live && performance.now() - this.last > 6000 && this.stickId < 0) this.el.classList.add('idle');
  },
  init() {
    this.el = document.getElementById('touch'); this.stick = document.getElementById('stick'); this.knob = document.getElementById('knob');
    const isT = e => e.pointerType === 'touch' || e.pointerType === 'pen', RAD = 52;
    window.addEventListener('pointerdown', e => {
      if (!isT(e)) return; this.wake(); if (!this.live || (e.target && e.target.closest && e.target.closest('.tb'))) return;
      if (e.clientX < window.innerWidth * .5 && this.stickId < 0) { this.stickId = e.pointerId; this.ox = e.clientX; this.oy = e.clientY; this.sx = this.sy = 0; this.place(); this.stick.style.opacity = 1; this.knob.style.transform = 'translate(0px,0px)'; }
    }, { passive: true });
    window.addEventListener('pointermove', e => {
      if (e.pointerId !== this.stickId) return; let dx = e.clientX - this.ox, dy = e.clientY - this.oy; const l = Math.hypot(dx, dy);
      if (l > RAD) { const k = 1 - RAD / l; this.ox += dx * k; this.oy += dy * k; dx *= RAD / l; dy *= RAD / l; this.place(); }      // the stick follows a thumb that drifts
      const dead = l < 8; this.sx = dead ? 0 : dx / RAD; this.sy = dead ? 0 : -dy / RAD; this.knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)'; this.last = performance.now();
    }, { passive: true });
    const up = e => { if (e.pointerId === this.stickId) { this.stickId = -1; this.sx = this.sy = 0; this.stick.style.opacity = 0; } };
    window.addEventListener('pointerup', up, { passive: true }); window.addEventListener('pointercancel', up, { passive: true });
    for (const [id, key] of [['bAtk', 'atk'], ['bHvy', 'heavy'], ['bSpc', 'spec'], ['bGrd', 'guard']]) {
      const b = document.getElementById(id), off = () => { this[key] = false; b.classList.remove('down'); };
      b.addEventListener('pointerdown', e => { this.wake(); this[key] = true; b.classList.add('down'); try { b.setPointerCapture(e.pointerId); } catch (x) { } e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    }
    // the page is the game: no scrolling, pinch-zoom, long-press menus or double-tap zoom
    const stop = e => { if (e.cancelable) e.preventDefault(); };
    for (const ev of ['touchstart', 'touchmove', 'gesturestart', 'gesturechange', 'contextmenu', 'dblclick']) document.addEventListener(ev, stop, { passive: false });
    for (const ev of ['pointerup', 'touchend']) window.addEventListener(ev, () => AudioSys.enable(), { passive: true });
  }
};
Touch.init();
