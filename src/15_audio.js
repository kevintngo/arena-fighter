// =====================================================================================
//  AUDIO: everything synthesized with Web Audio. Reverb impulse responses generated in code,
//  sized to the room. Adaptive orchestral score (strings, brass, choir, timpani) per theme.
// =====================================================================================
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const AudioSys = {
  ctx: null, on: false, muted: false, master: null, sfx: null, music: null, noise: null, sends: [], room: .4, loops: {},
  enable() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    let c; try { c = new AC(); } catch (e) { return; }
    this.ctx = c; this.master = c.createGain(); this.master.gain.value = .9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .005; comp.release.value = .2; this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = .85; this.sfx.connect(this.master); this.music = c.createGain(); this.music.gain.value = .5; this.music.connect(this.master);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noise = nb;
    // three generated impulse responses: cabin, chamber, cathedral
    const mkIR = (dur, pow, dark) => { const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n, e = Math.pow(1 - t, pow); lp += ((Math.random() * 2 - 1) - lp) * (1 - dark * (.3 + .7 * t)); d[i] = lp * e; } for (let k = 0; k < 7; k++) { const p = Math.floor(Math.random() * n * .12); d[p] += (Math.random() - .5) * 1.4; } } return b; };
    const irs = [mkIR(.5, 2.2, .35), mkIR(1.7, 2.6, .6), mkIR(3.8, 3, .8)], rv = c.createGain(); rv.gain.value = .8; rv.connect(this.master);
    for (let i = 0; i < 3; i++) { const cv = c.createConvolver(); cv.buffer = irs[i]; const s = c.createGain(); s.gain.value = 0; this.sfx.connect(s); s.connect(cv); cv.connect(rv); this.sends.push(s); if (i === 2) { const ms = c.createGain(); ms.gain.value = .45; this.music.connect(ms); ms.connect(cv); } }
    this.on = true; this.setRoom(this.room, true); SFX.startLoops(); Music.start(); HUD.soundOn();
  },
  setRoom(s, now) { this.room = s; if (!this.on) return; const t = this.ctx.currentTime, k = now ? .01 : .6; this.sends[0].gain.setTargetAtTime((1 - s) * .32, t, k); this.sends[1].gain.setTargetAtTime(.2 + .1 * (1 - Math.abs(s - .5) * 2), t, k); this.sends[2].gain.setTargetAtTime(s * .5, t, k); },
  toggleMute() { if (!this.on) { this.enable(); return; } this.muted = !this.muted; this.master.gain.setTargetAtTime(this.muted ? 0 : .9, this.ctx.currentTime, .05); HUD.toast(this.muted ? 'SOUND OFF' : 'SOUND ON', 1.2); }
};
const SV = {       // tiny synthesis voices
  tone(dst, t, type, f0, f1, dur, vol, a = .004) {
    const c = AudioSys.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(Math.max(20, f0), t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0006, t + dur); o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + .03); return o;
  },
  noise(dst, t, dur, vol, type, f0, f1, q = 1, a = .003) {
    const c = AudioSys.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = AudioSys.noise; s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0006, t + dur); s.connect(f); f.connect(g); g.connect(dst); s.start(t, Math.random() * 1.5); s.stop(t + dur + .03);
  }
};
const SOUNDS = {
  swing: (o, t, v, p) => { SV.noise(o, t, .17, .32 * v, 'bandpass', 600 * p, 2600 * p, 1.2); SV.tone(o, t, 'sawtooth', 190 * p, 560 * p, .14, .06 * v); },
  swingBig: (o, t, v, p) => { SV.noise(o, t, .28, .42 * v, 'bandpass', 380 * p, 2200 * p, 1); SV.tone(o, t, 'sawtooth', 130 * p, 480 * p, .24, .09 * v); },
  hit: (o, t, v, p) => { SV.noise(o, t, .13, .5 * v, 'lowpass', 2400, 280, .8); SV.tone(o, t, 'square', 170 * p, 55, .1, .26 * v); SV.tone(o, t, 'triangle', 1250 * p, 880, .09, .12 * v); },
  hurt: (o, t, v) => { SV.tone(o, t, 'sawtooth', 430, 105, .3, .32 * v); SV.noise(o, t, .16, .3 * v, 'lowpass', 1300, 300); },
  die: (o, t, v, p) => { SV.noise(o, t, .36, .4 * v, 'bandpass', 950 * p, 180, 1.5); SV.tone(o, t, 'sawtooth', 310 * p, 55, .42, .22 * v); },
  shriek: (o, t, v, p) => { const c = AudioSys.ctx, f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500 * p; f.Q.value = 3; f.connect(o); SV.tone(f, t, 'sawtooth', 820 * p, 1500 * p, .13, .3 * v); SV.tone(f, t + .12, 'sawtooth', 1500 * p, 430 * p, .32, .26 * v); SV.tone(f, t, 'square', 835 * p, 1460 * p, .4, .08 * v); },
  growl: (o, t, v, p) => { SV.tone(o, t, 'sawtooth', 95 * p, 58 * p, .36, .28 * v, .03); SV.noise(o, t, .34, .2 * v, 'lowpass', 320, 140); },
  chitter: (o, t, v, p) => { for (let i = 0; i < 5; i++) SV.tone(o, t + i * .036, 'square', (2200 + i * 160) * p * .6, 1500 * p * .6, .022, .12 * v); },
  gurgle: (o, t, v, p) => { for (let i = 0; i < 3; i++) SV.tone(o, t + i * .08, 'sine', (150 + Math.random() * 120) * p, 80 * p, .11, .25 * v); SV.noise(o, t, .26, .14 * v, 'lowpass', 500, 200); },
  beep: (o, t, v, p) => { SV.tone(o, t, 'square', 880 * p, 880 * p, .07, .1 * v); SV.tone(o, t + .09, 'square', 1320 * p, 1320 * p, .08, .1 * v); },
  hiss: (o, t, v, p) => { SV.noise(o, t, .42, .22 * v, 'highpass', 3600 * p, 2400 * p); },
  chime: (o, t, v) => { SV.tone(o, t, 'sine', 1320, 1320, .5, .14 * v); SV.tone(o, t + .04, 'sine', 1980, 1980, .42, .08 * v); },
  clank: (o, t, v, p) => { SV.tone(o, t, 'square', 230 * p, 170 * p, .07, .2 * v); SV.noise(o, t, .05, .22 * v, 'bandpass', 3200, 2600, 2); SV.tone(o, t, 'triangle', 1500 * p, 1380 * p, .16, .1 * v); },
  roar: (o, t, v, p) => { SV.tone(o, t, 'sawtooth', 120 * p, 52 * p, .95, .42 * v, .05); SV.tone(o, t, 'sawtooth', 178 * p, 66 * p, .9, .28 * v, .05); SV.noise(o, t, .95, .3 * v, 'lowpass', 700, 140); },
  chant: (o, t, v, p) => { const c = AudioSys.ctx, f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 4; f.connect(o); for (const d of [0, 3, 7]) SV.tone(f, t, 'sawtooth', 146 * p * Math.pow(2, d / 12), 138 * p * Math.pow(2, d / 12), .6, .2 * v, .08); },
  charge: (o, t, v, p) => { SV.tone(o, t, 'sawtooth', 190 * p, 900 * p, .5, .1 * v, .2); SV.tone(o, t, 'sine', 380 * p, 1800 * p, .5, .1 * v, .25); },
  bolt: (o, t, v, p) => { SV.tone(o, t, 'square', 920 * p, 280 * p, .17, .16 * v); SV.noise(o, t, .09, .16 * v, 'bandpass', 2100, 1200, 2); },
  lob: (o, t, v) => { SV.tone(o, t, 'sine', 300, 720, .26, .2 * v, .03); },
  deflect: (o, t, v) => { SV.tone(o, t, 'triangle', 2300, 3300, .09, .22 * v); SV.tone(o, t, 'sine', 1650, 1600, .3, .16 * v); SV.noise(o, t, .05, .2 * v, 'highpass', 5200, 5200); },
  coin: (o, t, v, p) => { SV.tone(o, t, 'sine', 1568 * p, 1568 * p, .13, .13 * v); SV.tone(o, t + .045, 'sine', 2349 * p, 2349 * p, .2, .1 * v); },
  pickup: (o, t, v) => { [660, 880, 1320].forEach((f, i) => SV.tone(o, t + i * .07, 'sine', f, f, .22, .14 * v)); },
  heal: (o, t, v) => { SV.tone(o, t, 'sine', 523, 1046, .42, .18 * v, .05); SV.tone(o, t + .1, 'sine', 784, 1568, .4, .1 * v, .05); },
  key: (o, t, v) => { [784, 988, 1175, 1568].forEach((f, i) => { SV.tone(o, t + i * .11, 'sine', f, f, .7, .16 * v); SV.tone(o, t + i * .11, 'triangle', f * 2, f * 2, .4, .05 * v); }); },
  relic: (o, t, v) => { [440, 554, 659, 880, 1108, 1318].forEach((f, i) => SV.tone(o, t + i * .09, 'sine', f, f, 1.6, .12 * v, .02)); SV.noise(o, t, 1.2, .1 * v, 'highpass', 2000, 9000, 1, .4); },
  cache: (o, t, v) => { SV.tone(o, t, 'square', 150, 85, .1, .25 * v); SV.noise(o, t + .05, .3, .14 * v, 'highpass', 3000, 5000); SV.tone(o, t + .16, 'sine', 990, 990, .4, .1 * v); SV.tone(o, t + .24, 'sine', 1485, 1485, .4, .08 * v); },
  door: (o, t, v) => { SV.noise(o, t, .5, .22 * v, 'lowpass', 420, 1300, 1, .05); SV.tone(o, t, 'sawtooth', 68, 112, .5, .12 * v, .05); SV.tone(o, t + .42, 'square', 120, 70, .1, .2 * v); },
  unseal: (o, t, v) => { SV.noise(o, t, 1.2, .22 * v, 'highpass', 2500, 5000, 1, .1); for (let i = 0; i < 6; i++) SV.tone(o, t + i * .17, 'square', i % 2 ? 620 : 830, i % 2 ? 620 : 830, .13, .08 * v); SV.tone(o, t + 1.08, 'sine', 100, 38, .5, .6 * v); SV.noise(o, t + 1.08, .35, .4 * v, 'lowpass', 900, 150); },
  slam: (o, t, v, p) => { SV.tone(o, t, 'sine', 115 * p, 34, .42, .7 * v); SV.noise(o, t, .36, .5 * v, 'lowpass', 950, 110); },
  boom: (o, t, v, p) => { SV.noise(o, t, .85, .8 * v, 'lowpass', 2600 * p, 80); SV.tone(o, t, 'sine', 95 * p, 28, .75, .7 * v); },
  crack: (o, t, v, p) => { SV.noise(o, t, .06, .3 * v, 'bandpass', 1900 * p, 1500, 2); SV.tone(o, t, 'square', 310 * p, 200, .05, .14 * v); },
  smash: (o, t, v) => { SV.noise(o, t, .26, .4 * v, 'bandpass', 1300, 420, 1.2); for (let i = 0; i < 4; i++) SV.tone(o, t + Math.random() * .15, 'square', 300 + Math.random() * 500, 150, .04, .1 * v); },
  fuse: (o, t, v) => { for (let i = 0; i < 6; i++) SV.tone(o, t + .6 * (1 - Math.pow(1 - i / 6, 1.6)), 'square', 1400, 1400, .04, .1 * v); },
  zap: (o, t, v) => { SV.noise(o, t, .09, .22 * v, 'highpass', 2600, 2600); SV.tone(o, t, 'sawtooth', 2100, 320, .08, .12 * v); },
  laser: (o, t, v) => { SV.tone(o, t, 'sawtooth', 1420, 1320, .28, .07 * v, .02); SV.tone(o, t, 'sine', 2840, 2700, .25, .05 * v, .02); },
  vent: (o, t, v) => { SV.noise(o, t, 1.05, .3 * v, 'bandpass', 1500, 3600, .7, .08); },
  beam: (o, t, v) => { SV.tone(o, t, 'sawtooth', 220, 216, .3, .1 * v, .03); SV.tone(o, t, 'sawtooth', 223.5, 219, .3, .1 * v, .03); },
  whoosh: (o, t, v, p) => { SV.noise(o, t, .2, .22 * v, 'bandpass', 400 * p, 1500 * p, 1); },
  chain: (o, t, v) => { for (let i = 0; i < 8; i++) SV.tone(o, t + i * .025, 'square', 1800 + Math.random() * 900, 1200, .02, .1 * v); SV.noise(o, t, .2, .16 * v, 'highpass', 4200, 4200); },
  splash: (o, t, v) => { SV.noise(o, t, .3, .3 * v, 'lowpass', 2100, 420); SV.noise(o, t, .1, .16 * v, 'bandpass', 3200, 2400, 1.5); },
  splat: (o, t, v) => { SV.noise(o, t, .2, .32 * v, 'lowpass', 950, 190); SV.tone(o, t, 'sine', 165, 68, .18, .25 * v); },
  blink: (o, t, v) => { SV.tone(o, t, 'sine', 1900, 300, .16, .16 * v); SV.noise(o, t, .14, .1 * v, 'highpass', 5000, 1800); },
  dash: (o, t, v) => { SV.noise(o, t, .16, .26 * v, 'bandpass', 800, 3200, .9); },
  fall: (o, t, v) => { SV.tone(o, t, 'sawtooth', 440, 52, 1.2, .26 * v, .02); SV.tone(o, t, 'sawtooth', 330, 41, 1.3, .2 * v, .02); SV.tone(o, t + .5, 'sine', 80, 30, .9, .5 * v); },
  voidko: (o, t, v, p) => {
    SV.tone(o, t, 'sine', 135 * p, 32, .85, .62 * v, .005);
    SV.noise(o, t, .42, .26 * v, 'bandpass', 2400 * p, 240, 1.8, .01);
    SV.tone(o, t + .01, 'sine', 1320 * p, 1320 * p, .75, .14 * v, .004);
    SV.tone(o, t + .02, 'triangle', 1980 * p, 1960 * p, .55, .09 * v, .004);
    SV.tone(o, t + .05, 'sine', 2640 * p, 2600 * p, .45, .06 * v, .008);
  },
  lavako: (o, t, v, p) => {
    SV.tone(o, t, 'sine', 110 * p, 34, .65, .65 * v, .006);
    SV.noise(o, t, .75, .48 * v, 'bandpass', 1800, 360, 1.1, .01);
    SV.noise(o, t + .04, .9, .26 * v, 'highpass', 3200, 2200, .9, .04);
  },
  rise: (o, t, v) => { [262, 392, 523, 784, 1046].forEach((f, i) => SV.tone(o, t + i * .11, 'sine', f, f, 1, .13 * v, .03)); SV.noise(o, t, 1, .08 * v, 'highpass', 1500, 8000, 1, .5); },
  bossDie: (o, t, v) => { SV.noise(o, t, 2.4, .5 * v, 'lowpass', 1800, 70, 1, .05); for (const f of [220, 277, 330, 415]) SV.tone(o, t, 'sawtooth', f, f * .2, 2.2, .12 * v, .02); },
  // footsteps by surface
  step_metal: (o, t, v) => { SV.noise(o, t, .05, .2 * v, 'bandpass', 1900, 900, 1.5); SV.tone(o, t, 'triangle', 190, 115, .06, .14 * v); },
  step_grate: (o, t, v) => { SV.noise(o, t, .04, .16 * v, 'highpass', 3200, 3200); SV.tone(o, t, 'square', 430, 300, .07, .05 * v); SV.tone(o, t, 'triangle', 1700, 1500, .09, .03 * v); },
  step_water: (o, t, v) => { SV.noise(o, t, .13, .22 * v, 'lowpass', 950, 300); SV.noise(o, t, .05, .1 * v, 'bandpass', 2600, 2000, 2); },
  step_frost: (o, t, v) => { SV.noise(o, t, .035, .16 * v, 'highpass', 4600, 4600); SV.noise(o, t + .03, .03, .1 * v, 'highpass', 5200, 5200); },
  step_soil: (o, t, v) => { SV.noise(o, t, .08, .2 * v, 'lowpass', 520, 260); },
  step_resin: (o, t, v) => { SV.noise(o, t, .1, .18 * v, 'lowpass', 720, 190); SV.tone(o, t, 'sine', 145, 78, .08, .1 * v); },
  step_marble: (o, t, v) => { SV.tone(o, t, 'triangle', 920, 700, .03, .1 * v); SV.noise(o, t, .03, .12 * v, 'bandpass', 2700, 2200, 2); },
  step_glass: (o, t, v) => { SV.tone(o, t, 'sine', 1500, 1300, .035, .07 * v); SV.noise(o, t, .03, .1 * v, 'bandpass', 3400, 3000, 3); }
};
const SFX = {
  last: {}, humG: null, humO: [], rideG: null, crackT: 0,
  play(name, x, z, vol = 1, pitch = 1) {
    if (!AudioSys.on || AudioSys.muted) return; const c = AudioSys.ctx, fn = SOUNDS[name]; if (!fn || c.state !== 'running') return;
    const now = c.currentTime; if (this.last[name] && now - this.last[name] < .035) return; this.last[name] = now;
    const dx = x - CAM.x, dz = z - CAM.z, d2 = dx * dx + dz * dz, att = 1 / (1 + d2 / 110); if (att < .03) return;
    const g = c.createGain(); g.gain.value = 1; let dst = g;
    if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = clamp((dx * CAM.right.x + dz * CAM.right.z) / 15, -1, 1); g.connect(pn); pn.connect(AudioSys.sfx); } else g.connect(AudioSys.sfx);
    fn(dst, now + .001, vol * att, pitch);
  },
  step(x, z) { this.play('step_' + (deck ? deck.theme.surface : 'metal'), x, z, .5, 1); },
  startLoops() {
    const c = AudioSys.ctx, t = c.currentTime;
    // the low drone of a dead ship
    const dg = c.createGain(); dg.gain.value = 0; dg.gain.setTargetAtTime(.2, t, 2); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.connect(dg); dg.connect(AudioSys.sfx);
    for (const f of [41.2, 41.55, 61.9]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 55; const sg = c.createGain(); sg.gain.value = .1; sub.connect(sg); sg.connect(AudioSys.sfx); sub.start();
    const lfo = c.createOscillator(); lfo.frequency.value = .07; const lg = c.createGain(); lg.gain.value = 45; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    // the hum of the energy blade
    this.humG = c.createGain(); this.humG.gain.value = .02; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 1.2; bp.connect(this.humG); this.humG.connect(AudioSys.sfx);
    for (const f of [110, 111.6, 220.8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(bp); o.start(); this.humO.push(o); }
    // lift machinery (silent until a descent)
    this.rideG = c.createGain(); this.rideG.gain.value = 0; const rl = c.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 380; rl.connect(this.rideG); this.rideG.connect(AudioSys.sfx);
    for (const f of [58, 87.5, 116.4]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(rl); o.start(); }
    const ns = c.createBufferSource(); ns.buffer = AudioSys.noise; ns.loop = true; const ng = c.createGain(); ng.gain.value = .5; ns.connect(ng); ng.connect(rl); ns.start();
  },
  update(dt) {
    if (!AudioSys.on || AudioSys.muted) return; const c = AudioSys.ctx, t = c.currentTime, h = hero; if (c.state !== 'running') return;
    // lantern crackle
    this.crackT -= dt;
    if (this.crackT <= 0 && deck) { this.crackT = .03 + Math.random() * .22; const o = AudioSys.sfx; SV.noise(o, t, .012 + Math.random() * .02, .02 + Math.random() * .05, 'highpass', 2600 + Math.random() * 3000, 2600); if (Math.random() < .15) SV.noise(o, t, .09, .05, 'lowpass', 340, 200); }
    if (this.humG) { const on = !!h && !!h.def.blade && !h.busy, act = on && (h.state === 'attack' || h.state === 'charge'), k = act ? 1.5 : 1; this.humG.gain.setTargetAtTime(!on ? 0 : act ? .06 : .015, t, .04); this.humO[0].frequency.setTargetAtTime(110 * k, t, .05); this.humO[1].frequency.setTargetAtTime(111.6 * k, t, .05); this.humO[2].frequency.setTargetAtTime(220.8 * k, t, .05); }
    if (this.rideG) this.rideG.gain.setTargetAtTime(game.state === 'ride' ? .22 : 0, t, .3);
  }
};
// ------------------------------------------------------------------ the score
const SCALES = { phr: [0, 1, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], aeo: [0, 2, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11], mix: [0, 2, 4, 5, 7, 9, 10], har: [0, 2, 3, 5, 7, 8, 11], phd: [0, 1, 4, 5, 7, 8, 10], loc: [0, 1, 3, 5, 6, 8, 10], lyb: [0, 2, 4, 6, 7, 9, 10] };
const MUSIC = {
  reactor: { root: 38, sc: 'phr', tempo: 76, motif: [0, 1, 0, 4, 3, 1, 0], rhy: [3, 1, 2, 2, 4, 2, 2], prog: [0, 5, 3, 4], vow: 'o', bell: .12 },
  hydro: { root: 40, sc: 'lyd', tempo: 66, motif: [0, 2, 4, 3, 4, 6, 4], rhy: [2, 2, 4, 2, 2, 2, 2], prog: [0, 1, 4, 0], vow: 'a', bell: .4 },
  cryo: { root: 33, sc: 'aeo', tempo: 58, motif: [4, 2, 0, -1, 0], rhy: [4, 2, 2, 4, 4], prog: [0, 5, 6, 4], vow: 'u', bell: .5 },
  concourse: { root: 36, sc: 'har', tempo: 72, motif: [0, 2, 4, 7, 6, 4, 5, 4], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 3, 4, 0], vow: 'a', bell: .25 },
  hangar: { root: 31, sc: 'mix', tempo: 84, motif: [0, 0, 4, 4, 5, 4, 2, 0], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 6, 3, 0], vow: 'o', bell: .12 },
  hive: { root: 37, sc: 'loc', tempo: 70, motif: [0, 1, 0, -1, 0, 3, 1, 0], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 1, 4, 0], vow: 'u', bell: .15 },
  archive: { root: 30, sc: 'dor', tempo: 62, motif: [0, 4, 7, 9, 7, 4, 2, 4], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 3, 6, 4], vow: 'e', bell: .55 },
  foundry: { root: 28, sc: 'phd', tempo: 88, motif: [0, 0, 1, 0, 4, 3, 1, 0], rhy: [2, 1, 1, 2, 2, 2, 2, 4], prog: [0, 1, 3, 0], vow: 'o', bell: .08 },
  flooded: { root: 35, sc: 'aeo', tempo: 58, motif: [0, 2, 3, 2, 0, -2, -1, 0], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 5, 2, 4], vow: 'u', bell: .35 },
  chapel: { root: 38, sc: 'dor', tempo: 60, motif: [0, 2, 3, 4, 3, 2, 0, 4], rhy: [4, 2, 2, 4, 2, 2, 4, 4], prog: [0, 3, 6, 0], vow: 'a', bell: .4, choir: 1.5 },
  brig: { root: 29, sc: 'aeo', tempo: 74, motif: [0, 0, 3, 2, 0, -3, -1, 0], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 5, 3, 4], vow: 'o', bell: .1 },
  breach: { root: 33, sc: 'lyb', tempo: 54, motif: [0, 4, 6, 4, 7, 6, 4, 0], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 1, 0, 6], vow: 'e', bell: .3 }
};
Object.assign(MUSIC, {
  crypt: { root: 36, sc: 'aeo', tempo: 56, motif: [0, -1, 0, 2, 3, 2, 0], rhy: [4, 2, 2, 4, 2, 2, 4], prog: [0, 5, 3, 4], vow: 'u', bell: .2, choir: 1.4 },
  mirror: { root: 39, sc: 'lyb', tempo: 60, motif: [0, 4, 7, 4, 6, 4, 2, 0], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 1, 4, 0], vow: 'e', bell: .6 },
  library: { root: 34, sc: 'dor', tempo: 64, motif: [0, 2, 3, 5, 4, 3, 2, 0], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 3, 4, 0], vow: 'o', bell: .2 },
  engine: { root: 32, sc: 'mix', tempo: 92, motif: [0, 0, 4, 0, 5, 4, 7, 4], rhy: [1, 1, 2, 2, 2, 2, 2, 4], prog: [0, 6, 3, 0], vow: 'o', bell: .1 },
  menagerie: { root: 31, sc: 'loc', tempo: 68, motif: [0, 3, 1, 0, -1, 0, 3, 4], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 1, 4, 0], vow: 'u', bell: .25 },
  clockwork: { root: 33, sc: 'har', tempo: 80, motif: [0, 2, 4, 2, 0, 2, 4, 7], rhy: [2, 2, 2, 2, 2, 2, 2, 2], prog: [0, 3, 4, 0], vow: 'a', bell: .5 }
});
const FORMANT = { a: [800, 1150, 2900], o: [450, 800, 2830], e: [400, 1700, 2600], u: [325, 700, 2700] };
const Music = {
  th: null, next: 0, step: 0, bar: 0, I: 0, target: 0, boss: false, g: {}, hold: 0, timer: 0, motifAt: -1, motifI: 0, motifStep: 0, motifBase: 0, on: false,
  start() {
    const c = AudioSys.ctx; for (const k of ['pad', 'choir', 'ost', 'brass', 'perc', 'bell', 'bass']) { const g = c.createGain(); g.gain.value = 0; g.connect(AudioSys.music); this.g[k] = g; }
    this.on = true; this.next = c.currentTime + .2; this.timer = setInterval(() => this.tick(), 60); if (this.pending) { this.setTheme(this.pending); }
  },
  setTheme(id) { this.pending = id; this.th = MUSIC[id] || MUSIC.reactor; this.bar = 0; this.step = 0; this.motifAt = -1; if (this.on) this.next = Math.max(this.next, AudioSys.ctx.currentTime + .1); },
  note(deg, oct) { const sc = SCALES[this.th.sc], n = ((deg % 7) + 7) % 7; return this.th.root + 12 * oct + sc[n] + 12 * Math.floor(deg / 7); },
  vStr(dst, t, m, dur, vol, cut = 1500) { const c = AudioSys.ctx, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = .4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.45, dur * .4)); g.gain.setValueAtTime(vol, t + dur * .75); g.gain.linearRampToValueAtTime(0, t + dur + .5); f.connect(g); g.connect(dst); for (const d of [-7, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + .55); } },
  vStac(dst, t, m, dur, vol) { const c = AudioSys.ctx, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(700, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + dur); f.connect(g); g.connect(dst); for (const d of [-6, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + .03); } },
  vBrass(dst, t, m, dur, vol) { const c = AudioSys.ctx, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(2700, t + .07); f.frequency.exponentialRampToValueAtTime(1150, t + Math.max(.12, dur)); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .045); g.gain.setValueAtTime(vol * .85, t + Math.max(.06, dur - .05)); g.gain.linearRampToValueAtTime(0, t + dur + .14); f.connect(g); g.connect(dst);
    for (const d of [-5, 5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + .18); } const s = c.createOscillator(); s.type = 'square'; s.frequency.value = mtof(m - 12); const sg = c.createGain(); sg.gain.value = .25; s.connect(sg); sg.connect(f); s.start(t); s.stop(t + dur + .18); },
  vChoir(dst, t, m, dur, vol, vow, att = .28) { const c = AudioSys.ctx, g = c.createGain(), mix = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + Math.max(att, dur * .7)); g.gain.linearRampToValueAtTime(0, t + dur + .45); mix.connect(g); g.connect(dst);
    const F = FORMANT[vow] || FORMANT.a, amp = [1, .55, .22]; const fs = F.map((fq, i) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fq; b.Q.value = 7; const bg = c.createGain(); bg.gain.value = amp[i] * 2.2; b.connect(bg); bg.connect(mix); return b; });
    const lfo = c.createOscillator(); lfo.frequency.value = 5.1; const lg = c.createGain(); lg.gain.value = 6; lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + .5);
    for (const d of [-9, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = d; lg.connect(o.detune); for (const b of fs) o.connect(b); o.start(t); o.stop(t + dur + .5); } },
  vTimp(dst, t, m, vol) { const f = mtof(m); SV.tone(dst, t, 'sine', f * 1.6, f, .85, vol, .003); SV.noise(dst, t, .09, vol * .6, 'lowpass', 340, 200); },
  vSnare(dst, t, vol) { SV.noise(dst, t, .11, vol, 'highpass', 1900, 1900); SV.tone(dst, t, 'triangle', 195, 140, .08, vol * .5); },
  vCym(dst, t, dur, vol) { const c = AudioSys.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = AudioSys.noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = 7200; f.Q.value = .6; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur); g.gain.exponentialRampToValueAtTime(.0005, t + dur + 1.3); s.connect(f); f.connect(g); g.connect(dst); s.start(t); s.stop(t + dur + 1.4); },
  vBell(dst, t, m, vol) { const f = mtof(m); SV.tone(dst, t, 'sine', f, f, 1.7, vol, .003); SV.tone(dst, t, 'sine', f * 2.76, f * 2.76, .9, vol * .35, .003); SV.tone(dst, t, 'sine', f * 5.4, f * 5.4, .35, vol * .12, .003); },
  vBass(dst, t, m, dur, vol) { const c = AudioSys.ctx, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 230; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .03); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur + .1); f.connect(g); g.connect(dst); const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.connect(f); o.start(t); o.stop(t + dur + .15); const s = c.createOscillator(); s.type = 'sine'; s.frequency.value = mtof(m); s.connect(g); s.start(t); s.stop(t + dur + .15); },
  fanfare() {
    if (!this.on || AudioSys.muted) return; const c = AudioSys.ctx, t = c.currentTime + .05, d = AudioSys.music, r = 60;
    const seq = [[0, 0, .14], [7, .17, .14], [12, .34, .16], [16, .52, .2], [19, .76, 1.3]]; for (const n of seq) { this.vBrass(d, t + n[1], r + n[0], n[2], .16); this.vBrass(d, t + n[1], r + n[0] - 12, n[2], .1); }
    for (const n of [0, 4, 7, 12]) { this.vStr(d, t + .76, r + n, 1.6, .05, 2200); this.vBrass(d, t + .76, r + n - 12, 1.3, .06); }
    for (let i = 0; i < 9; i++) this.vTimp(d, t + .76 * (i / 9) * (i / 9) + i * .02, 36, .12 + i * .03); this.vTimp(d, t + .76, 36, .5); this.vCym(d, t + .2, .56, .16);
    this.hold = t + 2.4; this.next = Math.max(this.next, this.hold);
  },
  sting(up) { if (!this.on || AudioSys.muted || !this.th) return; const c = AudioSys.ctx, t = c.currentTime + .03, d = AudioSys.music; const ns = up ? [0, 2, 4, 7] : [7, 5, 3, 0]; ns.forEach((n, i) => this.vBrass(d, t + i * .13, this.note(n, 2), i === 3 ? .8 : .12, .13)); this.vTimp(d, t + .39, this.th.root, .4); if (up) this.vCym(d, t, .4, .1); },
  tick() {
    if (!this.on || !this.th) return; const c = AudioSys.ctx; if (c.state !== 'running') { this.next = c.currentTime + .1; return; }
    // layer gains follow the action
    this.I += clamp(this.target - this.I, -.02, .05); const I = this.I, B = this.boss ? 1 : 0, t = c.currentTime, G = this.g, ss = (a, b, x) => { const u = sat((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const set = (k, v) => G[k].gain.setTargetAtTime(v, t, .25);
    set('pad', .5 - B * .1); set('choir', (.3 + .3 * I + B * .25) * (this.th.choir || 1)); set('ost', ss(.15, .5, I) * .55 + B * .2); set('brass', .25 + ss(.45, .85, I) * .5 + B * .25); set('perc', ss(.3, .8, I) * .75 + B * .5); set('bell', (1 - I) * .5); set('bass', .55 + I * .25);
    if (this.next < t) this.next = t + .05;
    while (this.next < t + .3) { if (this.next >= this.hold) this.sched(this.next); this.next += 60 / (this.th.tempo * (this.boss ? 1.28 : 1) * (1 + this.I * .08)) / 4; }
  },
  sched(t) {
    const th = this.th, s = this.step % 16, bar = this.bar, I = this.I, B = this.boss, G = this.g, sd = 60 / (th.tempo * (B ? 1.28 : 1)) / 4;
    const prog = B ? [0, 6, 5, 4] : th.prog, ch = prog[bar % prog.length], combat = I > .5 || B, tense = I > .18;
    if (s === 0) {
      const bd = sd * 16;
      for (const n of [0, 2, 4]) this.vStr(G.pad, t, this.note(ch + n, 1), bd, .055); this.vStr(G.pad, t, this.note(ch + 4, 2), bd, .03, 2000);
      if (!combat) this.vBass(G.bass, t, this.note(ch, 0), bd * .95, .16);
      if (!B && bar % 2 === 0) { this.vChoir(G.choir, t, this.note(ch + 4, 2), bd * 1.9, .05, th.vow); this.vChoir(G.choir, t, this.note(ch + 2, 2), bd * 1.9, .04, th.vow); }
      if (bar % 4 === 0 && (combat || tense)) this.vCym(G.perc, t - sd * 2 < AudioSys.ctx.currentTime ? t : t - sd * 2, sd * 2, .07);
      // schedule a motif statement: sparse horn while exploring, driving brass in battle
      if (this.motifAt < 0 && (combat ? bar % 2 === 0 : bar % 8 === 2)) { this.motifAt = 0; this.motifI = 0; this.motifStep = 0; this.motifBase = combat ? ch : 0; this.motifSlow = combat ? 1 : 2; }
    }
    if (B && (s === 0 || s === 8 || s === 6 || s === 14)) for (const n of [0, 2, 4]) this.vChoir(G.choir, t, this.note(ch + n, 2), sd * 1.6, .045, 'a', .03);
    if (this.motifAt >= 0) {
      if (this.motifStep <= 0) {
        if (this.motifI >= th.motif.length) this.motifAt = -1;
        else { const len = th.rhy[this.motifI % th.rhy.length] * this.motifSlow, deg = th.motif[this.motifI] + this.motifBase, dur = sd * len * .9;
          this.vBrass(G.brass, t, this.note(deg, 2), dur, combat ? .12 : .06); if (combat) this.vBrass(G.brass, t, this.note(deg, 1), dur, .08); this.motifI++; this.motifStep = len; }
      }
      this.motifStep--;
    }
    if (combat) { if (s % 2 === 0) this.vBass(G.bass, t, this.note(ch, 0), sd * 1.5, .15); const pat = [0, 0, 2, 0, 4, 0, 2, 0, 0, 0, 2, 0, 4, 2, 0, 4]; this.vStac(G.ost, t, this.note(ch + pat[s], 1), sd * .9, s % 4 === 0 ? .1 : .065); }
    else if (tense && s % 2 === 0) { const pat = [0, 0, 2, 0, 4, 0, 2, 0]; this.vStac(G.ost, t, this.note(ch + pat[s >> 1], 1), sd * 1.7, s % 8 === 0 ? .09 : .06); }
    const tp = B ? [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1] : combat ? [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1] : [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    if (tp[s] && (tense || B)) this.vTimp(G.perc, t, this.note(ch + (s % 8 >= 6 ? 4 : 0), 0) + (B ? 0 : 0), s % 8 === 0 ? .3 : .16);
    if ((combat) && (s === 4 || s === 12 || (bar % 4 === 3 && s >= 12))) this.vSnare(G.perc, t, s >= 13 ? .06 : .09);
    if (!combat && s % 2 === 0 && Math.random() < th.bell * (1 - I)) this.vBell(G.bell, t, this.note(ch + rnd.pick([0, 2, 4, 6, 7, 9]), 3 + (Math.random() < .3 ? 1 : 0)), .045);
    this.step++; if (this.step % 16 === 0) this.bar++;
  }
};
