// =====================================================================================
//  CAMERA, LIGHT RIG, HDR POST PIPELINE
//  scene(HDR, reduced-res, nearest) -> SSAO -> volumetrics -> resolve(SSR + haze) -> tilt-shift DOF
//  -> bloom -> filmic tonemap + grade + ordered dither + vignette + grain
// =====================================================================================
const glCanvas = document.getElementById('gl');
if (!GX.init(glCanvas)) { fatal('VOIDLIGHT DUEL needs WebGL2.'); throw new Error('WebGL2 required'); }
const VIEW = { fit: 1, h: 15.5, elev: 42 * PI / 180, dist: 90, near: 1, far: 260, iw: 640, ih: 360, k: 2, aspect: 16 / 9, hudW: 640, hudH: 360 };
const CAM = {
  x: 0, y: 0, z: 0, h: VIEW.h, shx: 0, shy: 0, hw: 16, hh: 9, near: VIEW.near, far: VIEW.far, px: 0, py: 0, pz: 0, rx: Math.SQRT1_2, rz: -Math.SQRT1_2, ux: 0, uy: 0, uz: 0,
  fwd: V3(-Math.cos(VIEW.elev) / Math.SQRT2, -Math.sin(VIEW.elev), -Math.cos(VIEW.elev) / Math.SQRT2),
  right: V3(Math.SQRT1_2, 0, -Math.SQRT1_2),
  up: V3(-Math.sin(VIEW.elev) / Math.SQRT2, Math.cos(VIEW.elev), -Math.sin(VIEW.elev) / Math.SQRT2),
  pos: V3()
};
CAM.ux = CAM.up.x; CAM.uy = CAM.up.y; CAM.uz = CAM.up.z;
function applyCamera() {
  const wpp = CAM.h / VIEW.ih;
  let a = CAM.x * CAM.right.x + CAM.z * CAM.right.z + CAM.shx, b = CAM.x * CAM.up.x + CAM.y * CAM.up.y + CAM.z * CAM.up.z + CAM.shy;
  a = Math.round(a / wpp) * wpp; b = Math.round(b / wpp) * wpp;
  const c = CAM.x * CAM.fwd.x + CAM.y * CAM.fwd.y + CAM.z * CAM.fwd.z - VIEW.dist;
  CAM.pos.set(CAM.right.x * a + CAM.up.x * b + CAM.fwd.x * c, CAM.up.y * b + CAM.fwd.y * c, CAM.right.z * a + CAM.up.z * b + CAM.fwd.z * c);
  CAM.px = CAM.pos.x; CAM.py = CAM.pos.y; CAM.pz = CAM.pos.z; CAM.hh = CAM.h / 2; CAM.hw = CAM.hh * VIEW.aspect;
}
function worldToScreen(x, y, z, out) {
  const dx = x - CAM.pos.x, dy = y - CAM.pos.y, dz = z - CAM.pos.z;
  out.x = (dx * CAM.right.x + dz * CAM.right.z) / (CAM.h * VIEW.aspect) + .5;
  out.y = (dx * CAM.up.x + dy * CAM.up.y + dz * CAM.up.z) / CAM.h + .5;
  out.z = dx * CAM.fwd.x + dy * CAM.fwd.y + dz * CAM.fwd.z; return out;
}
const scene = new Group();
const mkLight = (i, d) => ({ position: V3(), color: new Color(1, 1, 1), intensity: i, distance: d });
const hemi = { color: new Color(.3, .4, .6), groundColor: new Color(.02, .02, .03), intensity: .55 };
const moon = { color: new Color(.4, .5, .9), intensity: .5, position: V3(.25, 1, .6) };
const lantern = mkLight(14, 17); lantern.castShadow = true;
const POOL_N = 6, poolLights = []; for (let i = 0; i < POOL_N; i++) poolLights.push(mkLight(0, 10));
const flashLight = mkLight(0, 14);
const spot = mkLight(0, 30); spot.target = { position: V3() }; spot.angle = .5; spot.penumbra = .85;
const LSET = {
  cam: CAM, camDir: V3(-CAM.fwd.x, -CAM.fwd.y, -CAM.fwd.z), lantern, spot, plp: Array.from({ length: 8 }, () => new Vector4()), plc: Array.from({ length: 8 }, () => new Vector4()),
  sky: new Color(), gnd: new Color(), moonDir: V3(), moonCol: new Color(), spotDir: V3(), spotCol: new Color(), spotP: new Vector4(), cubeOn: true, cubeSize: 512, skipShadow: false,
  sync() {
    const set = (i, l, dec) => { this.plp[i].set(l.position.x, l.position.y, l.position.z, l.distance); this.plc[i].set(l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, dec); };
    set(0, lantern, 1.55); for (let i = 0; i < POOL_N; i++) set(1 + i, poolLights[i], 2); set(7, flashLight, 2);
    this.sky.copy(hemi.color).multiplyScalar(hemi.intensity); this.gnd.copy(hemi.groundColor).multiplyScalar(hemi.intensity); this.moonCol.copy(moon.color).multiplyScalar(moon.intensity);
    const m = moon.position, ml = 1 / m.length(); this.moonDir.set(m.x * ml, m.y * ml, m.z * ml);
    const s = spot, dx = s.target.position.x - s.position.x, dy = s.target.position.y - s.position.y, dz = s.target.position.z - s.position.z, dl = 1 / (Math.hypot(dx, dy, dz) || 1);
    this.spotDir.set(dx * dl, dy * dl, dz * dl); this.spotCol.copy(s.color).multiplyScalar(s.intensity); this.spotP.set(Math.cos(s.angle), Math.cos(s.angle * (1 - s.penumbra)), s.distance, s.intensity > 0 ? 1 : 0); this.cubeOn = lantern.castShadow;
  }
};
const Lights = {
  sources: [], spots: [], flashes: [], timer: 0,
  slots: poolLights.map(l => ({ light: l, src: null, k: 0 })), spotSrc: null, spotWant: null, spotK: 0,
  clear() { this.sources.length = 0; this.spots.length = 0; this.flashes.length = 0; for (const s of this.slots) { s.src = null; s.k = 0; s.light.intensity = 0; } this.spotSrc = null; this.spotWant = null; this.spotK = 0; spot.intensity = 0; this.timer = 0; },
  add(x, y, z, r, g, b, i, range = 9, flick = .25) { const s = { x, y, z, r, g, b, i, range, flick, ph: R(100), on: 1 }; this.sources.push(s); return s; },
  addSpot(x, y, z, tx, ty, tz, r, g, b, i, angle = .5) { const s = { x, y, z, tx, ty, tz, r, g, b, i, angle }; this.spots.push(s); return s; },
  flash(x, y, z, r, g, b, i, dur = .25, range = 14) { this.flashes.push({ x, y, z, r, g, b, i: i * .5, t: 0, dur, range }); },
  update(dt, cx, cz) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = .2;
      const best = [];
      for (const s of this.sources) { if (!s.on) continue; const d2 = dist2(s.x, s.z, cx, cz); if (d2 > 900) continue; s._sc = s.i * s.range / (1 + d2 / 70); best.push(s); }
      best.sort((a, b) => b._sc - a._sc); if (best.length > POOL_N) best.length = POOL_N;
      for (const sl of this.slots) sl.keep = sl.src && best.indexOf(sl.src) >= 0;
      for (const s of best) s._has = false; for (const sl of this.slots) if (sl.keep) sl.src._has = true;
      for (const sl of this.slots) { if (!sl.keep && sl.k <= .02) { sl.src = null; for (const s of best) if (!s._has) { sl.src = s; s._has = true; sl.keep = true; break; } } }
      let bs = null, bd = 576; for (const s of this.spots) { const d2 = dist2(s.tx, s.tz, cx, cz); if (d2 < bd) { bd = d2; bs = s; } }
      this.spotWant = bs;
    }
    const t = uTime.value;
    for (const sl of this.slots) {
      sl.k = damp(sl.k, sl.keep && sl.src ? 1 : 0, 6, dt); const s = sl.src, l = sl.light;
      if (!s || sl.k < .005) { l.intensity = 0; continue; }
      const fl = 1 - s.flick + s.flick * (vnoise(t * 7 + s.ph, s.ph) * 1.3 + .15 * Math.sin(t * 31 + s.ph));
      l.position.set(s.x, s.y, s.z); l.color.setRGB(s.r, s.g, s.b); l.intensity = s.i * sl.k * fl * s.on; l.distance = s.range;
    }
    if (this.spotSrc !== this.spotWant) { this.spotK = damp(this.spotK, 0, 8, dt); if (this.spotK < .03) this.spotSrc = this.spotWant; }
    else this.spotK = damp(this.spotK, this.spotSrc ? 1 : 0, 4, dt);
    const ss = this.spotSrc;
    if (ss && this.spotK > .01) { spot.position.set(ss.x, ss.y, ss.z); spot.target.position.set(ss.tx, ss.ty, ss.tz); spot.color.setRGB(ss.r, ss.g, ss.b); spot.intensity = ss.i * this.spotK; spot.angle = ss.angle; }
    else spot.intensity = 0;
    let fb = null, fv = 0;
    for (let i = this.flashes.length - 1; i >= 0; i--) { const f = this.flashes[i]; f.t += dt; if (f.t >= f.dur) { this.flashes.splice(i, 1); continue; } const v = f.i * (1 - f.t / f.dur); if (v > fv) { fv = v; fb = f; } }
    if (fb) { flashLight.position.set(fb.x, fb.y, fb.z); flashLight.color.setRGB(fb.r, fb.g, fb.b); flashLight.intensity = fv; flashLight.distance = fb.range; } else flashLight.intensity = 0;
  }
};
function pass(mat, target) { GX.pass(mat, target, VIEW.iw, VIEW.ih); }
const CAMU = {
  uRes: { value: new Vector2(640, 360) }, uNear: { value: VIEW.near }, uFar: { value: VIEW.far }, uTime,
  uCamPos: { value: CAM.pos }, uCamRight: { value: CAM.right }, uCamUp: { value: CAM.up }, uCamFwd: { value: CAM.fwd }, uFrustum: { value: new Vector2(32, 18) }
};
const GLSL_CAM = `
uniform vec2 uRes; uniform float uNear, uFar, uTime; uniform vec3 uCamPos, uCamRight, uCamUp, uCamFwd; uniform vec2 uFrustum; uniform sampler2D tDepth; varying vec2 vUv;
float viewZ(vec2 uv){ return uNear + texture2D(tDepth, uv).x*(uFar - uNear); }
vec3 planeAt(vec2 uv){ return uCamPos + uCamRight*((uv.x - .5)*uFrustum.x) + uCamUp*((uv.y - .5)*uFrustum.y); }
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float sat(float x){ return clamp(x, 0., 1.); }
`;
const fsMat = (frag, uniforms) => new ShaderMaterial({ fragmentShader: frag, uniforms });
const SKYP = { uTime, uRes: CAMU.uRes, uPan: { value: new Vector2() }, uNebA: { value: new Color(.5, .12, .38) }, uNebB: { value: new Color(.1, .4, .55) }, uNebC: { value: new Color(1, .55, .25) }, uGain: { value: 1 }, uPlanet: { value: new Vector2(.42, .18) }, uPlanetR: { value: .2 } };
const matSky = fsMat(`
uniform float uTime, uGain, uPlanetR; uniform vec2 uRes, uPan, uPlanet; uniform vec3 uNebA, uNebB, uNebC; varying vec2 vUv;
${GLSL_NOISE}
float fbm5(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a*fn(p); p = p*2.03 + vec2(13.1, 7.7); a *= .5; } return s; }
float sat(float x){ return clamp(x, 0., 1.); }
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.); return length(pa - ba*h); }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y; vec2 p = uv + uPan;
  vec3 col = vec3(.004, .006, .014);
  vec2 q = p*1.25 + vec2(4., 1.); float w0 = fbm5(q*1.1 + vec2(uTime*.004, 0.));
  vec2 wq = q + vec2(w0, fbm5(q + 5.2))*.9; float n1 = fbm5(wq*1.3), n2 = fbm5(wq*2.6 + 3.3 + n1);
  float tower = smoothstep(.25, .85, n1 + .35*sin(p.x*1.3 + 1.) + p.y*.25), wisps = pow(n2, 2.2);
  col += uNebA*tower*tower*1.1 + uNebB*wisps*(.4 + tower)*1.3 + uNebC*pow(sat(n1*n2*2.2), 2.5)*2.2;
  float dust = smoothstep(.45, .75, fbm5(wq*2.1 + 9.)); col *= 1. - dust*.7;
  for (int L = 0; L < 2; L++){ float sc = L == 0 ? 95. : 48.; vec2 g = (p - uPan*float(L)*.35)*sc; vec2 id = floor(g), f = fract(g) - .5; float h = fh(id + float(L)*17.);
    if (h > .93){ vec2 o = vec2(fh(id + 1.3), fh(id + 2.7)) - .5; float d = length(f - o*.7), tw = .7 + .3*sin(uTime*(1. + h*4.) + h*40.);
      col += mix(vec3(.8, .9, 1.25), vec3(1.25, .95, .7), fh(id + 5.))*(L == 0 ? 1.4 : 3.)*smoothstep(.1, 0., d)*tw*(1. - dust*.8); } }
  vec2 pc = uv - uPlanet + uPan*.45; float R = uPlanetR, r = length(pc), ca = cos(.38), sa = sin(.38);
  vec2 rp = vec2(pc.x*ca + pc.y*sa, (-pc.x*sa + pc.y*ca)/.26); float rr = length(rp)/R;
  float ringA = smoothstep(1.32, 1.38, rr)*smoothstep(2.35, 2.2, rr)*(.4 + .6*fn(vec2(rr*34., 2.)))*smoothstep(0., .05, abs(rr - 1.83));
  vec3 ringCol = vec3(.9, .74, .55)*ringA*.55*(.35 + .65*smoothstep(-.6, .4, rp.x/R/2.));
  if (rp.y >= 0.) col = col*(1. - ringA*.6) + ringCol;
  float inP = smoothstep(R, R - .004, r);
  if (inP > 0.){ vec3 n = vec3(pc/R, sqrt(max(0., 1. - r*r/(R*R)))); vec3 Ld = normalize(vec3(-.62, .42, .5)); float df = sat(dot(n, Ld)*1.15 + .08);
    float lat = (pc.y*ca - pc.x*sa)/R; float bands = fn(vec2(lat*8. + fn(pc*7./R + uTime*.01)*.7, 1.)); float storm = smoothstep(.12, .0, length(vec2(pc.x + .05*R, lat*R - .25*R)/R*vec2(1., 2.2)));
    vec3 pcol = mix(vec3(.85, .55, .32), vec3(.38, .2, .3), bands); pcol = mix(pcol, vec3(.95, .8, .6), storm*.6);
    pcol *= df*df*1.25; pcol += vec3(.25, .4, .8)*pow(1. - n.z, 3.)*df*.8 + vec3(.02, .015, .03);
    col = mix(col, pcol, inP); }
  col += vec3(.2, .32, .7)*pow(smoothstep(R*1.3, R, r), 4.)*(1. - inP)*.18;
  if (rp.y < 0.) col = col*(1. - ringA*.6) + ringCol;
  for (int i = 0; i < 8; i++){ float fi = float(i); float per = 1.4 + fh(vec2(fi, 3.))*2.8; float tt = uTime/per + fh(vec2(fi, 9.))*10.; float k = floor(tt), ph = fract(tt);
    vec2 c = vec2(-.42, .22) + (vec2(fh(vec2(fi, k)), fh(vec2(k, fi + 4.))) - .5)*vec2(1.0, .42); float d = length(p - c);
    float env = exp(-ph*7.)*step(ph, .7); col += vec3(1.7, 1.15, .7)*env*(smoothstep(.035, 0., d)*4. + smoothstep(.22, 0., d)*.22);
    vec2 c2 = c + (vec2(fh(vec2(k, fi)), fh(vec2(fi + 7., k))) - .5)*vec2(.7, .3); float sl = seg(p, c, c2);
    float lv = step(ph, .16)*smoothstep(.004, .0, sl); col += (mod(fi, 2.) < 1. ? vec3(.5, 1.6, .8) : vec3(1.8, .35, .25))*lv*1.6; }
  vec2 t = uv + uPan*3.2; float a1 = t.x*.8 + t.y*1.1, a2 = t.x*1.15 - t.y*.72;
  float k1 = floor(a1*.42), l1 = abs(fract(a1*.42) - .5)/.42; float on1 = step(.45, fh(vec2(k1, 1.)));
  float b1 = smoothstep(.05, .044, l1)*on1; float k2 = floor(a2*.3), l2 = abs(fract(a2*.3) - .5)/.3; float b2 = smoothstep(.028, .024, l2)*step(.55, fh(vec2(k2, 2.)));
  float lat1 = smoothstep(.012, .008, abs(fract(a2*3.) - .5)/3.)*smoothstep(.17, .16, l1)*on1*step(.05, l1);
  float bm = sat(b1 + b2 + lat1*.9);
  col = mix(col, vec3(.007, .008, .012) + col*.06, bm*.93);
  float rl = step(.965, fract(a2*2.5 + .1))*smoothstep(.012, .0, abs(l1 - .03))*on1; col += vec3(2.2, .3, .15)*rl*(.5 + .5*sin(uTime*2.5 + k1*3.));
  col = pow(max(col, 0.), vec3(1.3))*.6;
  gl_FragColor = vec4(col*uGain, 1.);
}`, SKYP);
const skyQuad = new Mesh(FSQ.geometry, new ShaderMaterial({
  uniforms: SKY_U, depthWrite: false,
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 1., 1.); }',
  fragmentShader: 'uniform sampler2D tSky; uniform vec2 uInvRes; void main(){ gl_FragColor = vec4(texture2D(tSky, gl_FragCoord.xy*uInvRes).rgb, 1.); }'
}));
skyQuad.frustumCulled = false; skyQuad.renderOrder = 999; scene.add(skyQuad);
const AOU = Object.assign({ tDepth: { value: null }, uN: { value: 8 }, uRad: { value: .9 }, uStr: { value: 1.25 } }, CAMU);
const matAO = fsMat(`${GLSL_CAM}
uniform int uN; uniform float uRad, uStr;
void main(){
  float d0 = texture2D(tDepth, vUv).x; if (d0 > .9999){ gl_FragColor = vec4(1.); return; }
  float z0 = uNear + d0*(uFar - uNear); vec2 px = 1./uRes; vec2 wpp = uFrustum/uRes;
  float zl = viewZ(vUv - vec2(px.x, 0.)), zr = viewZ(vUv + vec2(px.x, 0.)), zd = viewZ(vUv - vec2(0., px.y)), zu = viewZ(vUv + vec2(0., px.y));
  float dzx = abs(zr - z0) < abs(z0 - zl) ? (zr - z0) : (z0 - zl), dzy = abs(zu - z0) < abs(z0 - zd) ? (zu - z0) : (z0 - zd);
  vec3 n = normalize(cross(vec3(wpp.x, 0., -dzx), vec3(0., wpp.y, -dzy)));
  float ang = ign(gl_FragCoord.xy)*6.2831853, rpx = uRad/wpp.x, occ = 0.;
  for (int i = 0; i < uN; i++){ float fi = float(i) + .5; float rr = sqrt(fi/float(uN))*rpx; float a = ang + fi*2.39996; vec2 o = vec2(cos(a), sin(a))*rr;
    float zs = viewZ(vUv + o*px); vec3 v = vec3(o*wpp, z0 - zs); float dd = dot(v, v);
    occ += max(0., dot(n, v) - .04)/(dd + .02)*smoothstep(uRad*1.8, uRad*.6, abs(z0 - zs)); }
  float ao = clamp(1. - uStr*occ/float(uN)*1.1, 0., 1.);
  gl_FragColor = vec4(ao, ao, ao, 1.);
}`, AOU);
const VOL_N = POOL_N + 1;
const VOLU = Object.assign({
  tDepth: { value: null }, tShadow: { value: null }, uLPos: { value: new Vector3() }, uLCol: { value: new Color() }, uLRange: { value: 15 },
  uSFar: { value: 17 }, uHasShadow: { value: 0 }, uDensity: { value: .05 }, uSteps: { value: 12 }, uMist: { value: 0 }, uMistCol: { value: new Color(.3, .4, .5) },
  uPL: { value: Array.from({ length: VOL_N }, () => new Vector4()) }, uPLc: { value: Array.from({ length: VOL_N }, () => new Vector3()) }
}, CAMU);
const matVol = fsMat(`${GLSL_CAM}
uniform samplerCube tShadow; uniform vec3 uLPos, uLCol, uMistCol; uniform float uLRange, uSFar, uHasShadow, uDensity, uMist; uniform int uSteps;
uniform vec4 uPL[${VOL_N}]; uniform vec3 uPLc[${VOL_N}];
${GLSL_NOISE}
float n3(vec3 p){ return fn(p.xz + p.y*vec2(.37, .61))*.6 + fn(p.xz*2.1 - p.y*vec2(.5, .23) + 4.)*.4; }
void main(){
  float d = texture2D(tDepth, vUv).x; float tScene = uNear + d*(uFar - uNear); vec3 O = planeAt(vUv); vec3 acc = vec3(0.);
  vec3 oc = uLPos - O; float b = dot(oc, uCamFwd), h2 = dot(oc, oc) - b*b, R2 = uLRange*uLRange;
  if (h2 < R2){
    float s = sqrt(R2 - h2), t0 = max(b - s, uNear), t1 = min(b + s, tScene);
    if (t1 > t0){
      float jit = ign(gl_FragCoord.xy + fract(uTime*7.)*37.), dt = (t1 - t0)/float(uSteps), sum = 0.;
      for (int i = 0; i < uSteps; i++){
        float t = t0 + (float(i) + jit)*dt; vec3 p = O + uCamFwd*t; vec3 lv = p - uLPos; float dl = length(lv);
        float att = 1./(2.4 + dl*dl*.3); float wnd = sat(1. - dl/uLRange); att *= wnd*wnd; float sh = 1.;
        if (uHasShadow > .5) sh = step(dl - .15, texture(tShadow, lv).r*uSFar);
        float dens = (.5 + .95*n3(p*.42 + vec3(uTime*.11, -uTime*.05, uTime*.07)))*exp(-max(p.y, 0.)*.2);
        sum += att*sh*dens;
      }
      acc += uLCol*sum*dt*uDensity*.024;
    }
  }
  for (int i = 0; i < ${VOL_N}; i++){ vec3 lc = uPLc[i]; if (lc.r + lc.g + lc.b < .0005) continue;
    vec3 o2 = uPL[i].xyz - O; float bb = dot(o2, uCamFwd), hh = max(0., dot(o2, o2) - bb*bb), rg = uPL[i].w; if (hh > rg*rg) continue;
    float q = sqrt(hh + .4), tE = min(tScene, bb + rg), tS = bb - rg; if (tE <= tS) continue;
    float f = 1. - sqrt(hh)/rg; acc += lc*(atan((tE - bb)/q) - atan((tS - bb)/q))/q*uDensity*.0075*f*f; }
  if (uMist > .001 && d < .9999){ vec3 P = O + uCamFwd*tScene; float m = ffbm(P.xz*.16 + vec2(uTime*.05, uTime*.03))*exp(-max(P.y, 0.)*1.3);
    m = smoothstep(.3, .85, m)*uMist; float ld = length(P - uLPos); acc += (uMistCol*.07 + uLCol*.02/(1. + ld*ld*.12))*m; }
  gl_FragColor = vec4(acc, 1.);
}`, VOLU);
const HAZE_N = 6;
const RESU = Object.assign({
  tScene: { value: null }, tDepth: { value: null }, tAO: { value: null }, tVol: { value: null }, uHaze: { value: Array.from({ length: HAZE_N }, () => new Vector4()) },
  uSin2e: { value: Math.sin(2 * VIEW.elev) }, uCos2e: { value: Math.cos(2 * VIEW.elev) }, uRipple: { value: 0 }, uSSR: { value: 22 }, uAOk: { value: 1 }
}, CAMU);
const matResolve = fsMat(`${GLSL_CAM}
uniform sampler2D tScene, tAO, tVol; uniform vec4 uHaze[${HAZE_N}]; uniform float uSin2e, uCos2e, uRipple, uAOk; uniform int uSSR;
${GLSL_NOISE}
void main(){
  vec2 uv = vUv; vec2 hz = vec2(0.); float asp = uRes.x/uRes.y;
  for (int i = 0; i < ${HAZE_N}; i++){ vec4 h = uHaze[i]; if (h.w <= 0.) continue; vec2 dd = uv - h.xy; dd.x *= asp; if (dd.y < -.01 || dd.y > h.z*4.) continue;
    float f = exp(-dd.x*dd.x/(h.z*h.z))*smoothstep(-.01, .02, dd.y)*(1. - dd.y/(h.z*4.)); hz += f*h.w*(vec2(fn(uv*vec2(70., 45.) + vec2(0., -uTime*2.2)), fn(uv*vec2(55., 60.) + vec2(3., -uTime*1.7))) - .5); }
  uv += hz*.014;
  vec4 sc = texture2D(tScene, uv); vec3 col = sc.rgb; float d = texture2D(tDepth, uv).x;
  vec2 px = 1./uRes;
  float ao = (texture2D(tAO, uv + px*vec2(.5, .5)).r + texture2D(tAO, uv + px*vec2(-.5, .5)).r + texture2D(tAO, uv + px*vec2(.5, -.5)).r + texture2D(tAO, uv + px*vec2(-.5, -.5)).r)*.25;
  float lum = dot(col, vec3(.3, .5, .2)); col *= mix(1., ao, uAOk*(1. - sat(lum*.35)));
  float refl = sat(1. - sc.a);
  if (refl > .02 && d < .9999){
    float z0 = uNear + d*(uFar - uNear); vec3 P = planeAt(uv) + uCamFwd*z0;
    vec2 rip = vec2(0.); if (uRipple > 0.) rip = (vec2(fn(P.xz*1.7 + vec2(uTime*.5, uTime*.3)), fn(P.xz*2.3 - vec2(uTime*.4, -uTime*.35))) - .5)*uRipple;
    float stepW = .24, jit = ign(gl_FragCoord.xy); vec3 rc = vec3(0.); float hit = 0.;
    for (int i = 1; i <= uSSR; i++){ float t = (float(i) - jit*.7)*stepW; vec2 suv = uv + vec2(rip.x*t*.02, uSin2e*t/uFrustum.y) + rip*.004;
      if (suv.y > 1. || suv.x < 0. || suv.x > 1.) break; float zr = z0 + uCos2e*t, zs = viewZ(suv);
      if (zs < zr - .06){ if (zr - zs < 2.2){ rc = texture2D(tScene, suv).rgb; hit = (1. - float(i)/float(uSSR + 1))*smoothstep(1., .9, suv.y); } break; } }
    col += rc*hit*refl*.75;
  }
  col += texture2D(tVol, uv).rgb;
  gl_FragColor = vec4(col, 1.);
}`, RESU);
const DOFU = Object.assign({ tColor: { value: null }, tDepth: { value: null }, uFocus: { value: 90 }, uFocusY: { value: .5 }, uMaxR: { value: 7 }, uDepthK: { value: .55 }, uTaps: { value: 16 } }, CAMU);
const matDOF = fsMat(`${GLSL_CAM}
uniform sampler2D tColor; uniform float uFocus, uFocusY, uMaxR, uDepthK; uniform int uTaps;
float coc(vec2 uv){ float d = texture2D(tDepth, uv).x; float c = abs(uNear + d*(uFar - uNear) - uFocus)*uDepthK; if (d > .9999) c = uMaxR*.6;
  float ty = abs(uv.y - uFocusY); c = max(c, uMaxR*pow(sat((ty - .1)/.4), 1.4)); return min(c, uMaxR)*smoothstep(.085, .24, ty); }
void main(){
  float c0 = coc(vUv); vec3 base = texture2D(tColor, vUv).rgb;
  if (c0 < .55){ gl_FragColor = vec4(base, 1.); return; }
  vec3 acc = base; float ws = 1., ang = ign(gl_FragCoord.xy)*6.2831853; vec2 px = 1./uRes;
  for (int i = 0; i < uTaps; i++){ float fi = float(i) + .5; float r = sqrt(fi/float(uTaps))*c0, a = ang + fi*2.39996; vec2 suv = vUv + vec2(cos(a), sin(a))*r*px;
    float cs = coc(suv); float w = smoothstep(r - 1.2, r + .4, max(cs, c0*.35)); vec3 s = texture2D(tColor, suv).rgb; w *= 1. + dot(s, vec3(.33))*.6; acc += s*w; ws += w; }
  gl_FragColor = vec4(acc/ws, 1.);
}`, DOFU);
const BLU = { tColor: { value: null }, tLow: { value: null }, uPx: { value: new Vector2() }, uThresh: { value: 1.8 }, uSpread: { value: 1 } };
const matBloomPre = fsMat(`uniform sampler2D tColor; uniform vec2 uPx; uniform float uThresh; varying vec2 vUv;
void main(){ vec3 c = (texture2D(tColor, vUv + uPx*vec2(.5,.5)).rgb + texture2D(tColor, vUv + uPx*vec2(-.5,.5)).rgb + texture2D(tColor, vUv + uPx*vec2(.5,-.5)).rgb + texture2D(tColor, vUv + uPx*vec2(-.5,-.5)).rgb)*.25;
  float l = max(c.r, max(c.g, c.b)); float k = max(0., l - uThresh); k = k*k/(k + .6); gl_FragColor = vec4(min(c*(k/max(l, 1e-4)), vec3(2.5)), 1.); }`, BLU);
const matBloomDown = fsMat(`uniform sampler2D tColor; uniform vec2 uPx; varying vec2 vUv;
void main(){ vec3 c = texture2D(tColor, vUv).rgb*.5 + (texture2D(tColor, vUv + uPx).rgb + texture2D(tColor, vUv - uPx).rgb + texture2D(tColor, vUv + uPx*vec2(1.,-1.)).rgb + texture2D(tColor, vUv + uPx*vec2(-1.,1.)).rgb)*.125; gl_FragColor = vec4(c, 1.); }`, BLU);
const matBloomUp = fsMat(`uniform sampler2D tColor, tLow; uniform vec2 uPx; uniform float uSpread; varying vec2 vUv;
void main(){ vec3 lo = (texture2D(tLow, vUv + uPx*vec2(1.,1.)).rgb + texture2D(tLow, vUv + uPx*vec2(-1.,1.)).rgb + texture2D(tLow, vUv + uPx*vec2(1.,-1.)).rgb + texture2D(tLow, vUv + uPx*vec2(-1.,-1.)).rgb)*.25;
  gl_FragColor = vec4(texture2D(tColor, vUv).rgb + lo*uSpread, 1.); }`, BLU);
const FINU = {
  tColor: { value: null }, tBloom: { value: null }, uTime, uExposure: { value: 1.06 }, uBloom: { value: .15 }, uLevels: { value: 28 }, uDither: { value: .85 }, uGrain: { value: .016 }, uVig: { value: .45 },
  uFade: { value: 1 }, uHurt: { value: 0 }, uDesat: { value: 0 }, uFlash: { value: 0 }, uAccent: { value: new Color(1, .6, .2) }
};
const matFinal = fsMat(`uniform sampler2D tColor, tBloom; uniform float uTime, uExposure, uBloom, uLevels, uDither, uGrain, uVig, uFade, uHurt, uDesat, uFlash; uniform vec3 uAccent; varying vec2 vUv;
float bayer2(vec2 a){ a = floor(a); return fract(a.x/2. + a.y*a.y*.75); }
float bayer4(vec2 a){ return bayer2(.5*a)*.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(.5*a)*.25 + bayer2(a); }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x + .03))/(x*(2.43*x + .59) + .14), 0., 1.); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb + texture2D(tBloom, vUv).rgb*uBloom;
  c = aces(c*uExposure);
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, mix(.74, 1.1, smoothstep(.04, .55, l)));
  c += vec3(-.014, -.002, .024)*(1. - smoothstep(0., .32, l));
  c *= mix(vec3(1.), vec3(1.06, 1., .92), smoothstep(.35, 1., l));
  c += uAccent*.012*smoothstep(.02, .2, l)*(1. - smoothstep(.2, .6, l));
  c = mix(c, vec3(l*.85), uDesat);
  vec2 q = vUv - .5; float v = smoothstep(.95, .28, length(q*vec2(1., 1.18))); c *= mix(1. - uVig, 1., v);
  c += vec3(.55, .02, .01)*uHurt*(1. - v*.85); c += vec3(1., .92, .8)*uFlash;
  c *= uFade;
  c += (h21(gl_FragCoord.xy + fract(uTime*3.7)*91.) - .5)*uGrain;
  c = pow(max(c, 0.), vec3(1./2.2));
  float b = bayer8(gl_FragCoord.xy) - .5;
  c = floor(c*uLevels + .5 + b*uDither)/uLevels;
  gl_FragColor = vec4(c, 1.);
}`, FINU);
const Q = { level: 3, ema: 16.7, lowT: 0, highT: 0, cool: 2, blockLevel: 99, blockUntil: 0, lastRaise: -99, part: 1, shadowEvery: 1, lock: false };
const QLEVELS = [
  { res: 2, ao: 4, vol: 6, dof: 8, ssr: 10, shadow: 256, bloom: 3, part: .4, shadowEvery: 2 },
  { res: 1, ao: 6, vol: 8, dof: 10, ssr: 14, shadow: 256, bloom: 4, part: .6, shadowEvery: 1 },
  { res: 1, ao: 8, vol: 10, dof: 14, ssr: 18, shadow: 512, bloom: 5, part: .8, shadowEvery: 1 },
  { res: 0, ao: 8, vol: 12, dof: 16, ssr: 22, shadow: 512, bloom: 5, part: 1, shadowEvery: 1 },
  { res: 0, ao: 12, vol: 16, dof: 22, ssr: 26, shadow: 1024, bloom: 5, part: 1, shadowEvery: 1 }
];
const Post = {
  rt: {}, bloom: [], focusZ: VIEW.dist, focusY: .5, hazes: [], frame: 0,
  resize() {
    const cw = Math.max(320, window.innerWidth), ch = Math.max(200, window.innerHeight), dpr = window.devicePixelRatio || 1;
    const big = Math.max(ch, cw * .6), kBase = Math.max(dpr >= 1.5 ? Math.round(1.4 * dpr) : 2, Math.ceil(big * dpr / 720)), k = kBase + QLEVELS[Q.level].res, kHud = Math.max(Math.round((Math.min(cw, ch) < 520 ? 1.5 : 2) * dpr), Math.ceil(big * dpr / 620));
    VIEW.fit = cw < ch ? 1 + (ch / cw - 1) * .55 : (ch < 480 ? .88 : 1);
    VIEW.aspect = cw / ch; VIEW.k = k;
    VIEW.iw = Math.max(160, Math.ceil(cw * dpr / k)); VIEW.ih = Math.max(90, Math.ceil(ch * dpr / k));
    VIEW.hudW = Math.max(160, Math.ceil(cw * dpr / kHud)); VIEW.hudH = Math.max(90, Math.ceil(ch * dpr / kHud));
    const iw = VIEW.iw, ih = VIEW.ih; glCanvas.width = iw; glCanvas.height = ih;
    for (const k2 in this.rt) this.rt[k2].dispose(); for (const b of this.bloom) b.dispose();
    this.rt.scene = new RT(iw, ih, true, false, true); this.rt.sky = new RT(iw, ih, true, true); this.rt.ao = new RT(iw, ih, false, true); this.rt.vol = new RT(Math.ceil(iw / 2), Math.ceil(ih / 2), true, true);
    this.rt.a = new RT(iw, ih, true, true); this.rt.b = new RT(iw, ih, true, true);
    this.bloom = []; let bw = iw, bh = ih;
    for (let i = 0; i < 5; i++) { bw = Math.max(4, Math.ceil(bw / 2)); bh = Math.max(4, Math.ceil(bh / 2)); this.bloom.push(new RT(bw, bh, true, true), new RT(bw, bh, true, true)); }
    CAMU.uRes.value.set(iw, ih); SKY_U.uInvRes.value.set(1 / iw, 1 / ih); SKY_U.tSky.value = this.rt.sky.texture;
    const dt = this.rt.scene.depthTexture; AOU.tDepth.value = VOLU.tDepth.value = RESU.tDepth.value = DOFU.tDepth.value = dt;
    RESU.tScene.value = this.rt.scene.texture; RESU.tAO.value = this.rt.ao.texture; RESU.tVol.value = this.rt.vol.texture;
    DOFU.tColor.value = this.rt.a.texture; FINU.tColor.value = this.rt.b.texture;
    HUD.resize();
  },
  applyQuality() { const L = QLEVELS[Q.level]; AOU.uN.value = L.ao; VOLU.uSteps.value = L.vol; DOFU.uTaps.value = L.dof; RESU.uSSR.value = L.ssr; Q.part = L.part; Q.shadowEvery = L.shadowEvery; LSET.cubeSize = L.shadow; },
  setLevel(n) { n = clamp(n, 0, QLEVELS.length - 1); if (n === Q.level) return; const resCh = QLEVELS[n].res !== QLEVELS[Q.level].res; Q.level = n; this.applyQuality(); if (resCh) this.resize(); },
  tickQuality(rawDt) {
    if (rawDt > .1 || document.hidden || Q.lock) return;
    const ms = rawDt * 1000; Q.ema = lerp(Q.ema, ms, .06); Q.cool -= rawDt; const now = performance.now() / 1000;
    if (Q.ema > 19.5) Q.lowT += rawDt; else Q.lowT = Math.max(0, Q.lowT - rawDt * 2);
    if (Q.ema < 17.4) Q.highT += rawDt; else Q.highT = 0;
    if (Q.cool > 0) return;
    if (Q.lowT > 1.1 && Q.level > 0) { if (now - Q.lastRaise < 8) { Q.blockLevel = Q.level; Q.blockUntil = now + 90; } this.setLevel(Q.level - 1); Q.lowT = 0; Q.highT = 0; Q.cool = 2.5; Q.ema = 16.7; }
    else if (Q.highT > 6 && Q.level < QLEVELS.length - 1 && !(Q.level + 1 >= Q.blockLevel && now < Q.blockUntil)) { this.setLevel(Q.level + 1); Q.highT = 0; Q.cool = 3; Q.lastRaise = now; }
  },
  warm() { LSET.sync(); LSET.skipShadow = true; GX.scene(scene, this.rt.scene, LSET); },
  render() {
    this.frame++;
    CAMU.uFrustum.value.set(CAM.h * VIEW.aspect, CAM.h);
    SKYP.uPan.value.set((CAM.x * CAM.right.x + CAM.z * CAM.right.z) * .0035, (CAM.x * CAM.up.x + CAM.z * CAM.up.z) * .0035);
    pass(matSky, this.rt.sky);
    LSET.sync(); LSET.skipShadow = Q.shadowEvery > 1 && (this.frame % Q.shadowEvery) !== 0;
    GX.scene(scene, this.rt.scene, LSET);
    pass(matAO, this.rt.ao);
    VOLU.tShadow.value = GX.cube || GX.dummyCube(); VOLU.uHasShadow.value = GX.cube && lantern.castShadow ? 1 : 0; VOLU.uSFar.value = lantern.distance;
    VOLU.uLPos.value.copy(lantern.position); VOLU.uLCol.value.copy(lantern.color).multiplyScalar(lantern.intensity); VOLU.uLRange.value = Math.min(lantern.distance, 15);
    for (let i = 0; i < VOL_N; i++) { const l = i < POOL_N ? poolLights[i] : flashLight; VOLU.uPL.value[i].set(l.position.x, l.position.y, l.position.z, Math.min(l.distance, 7)); VOLU.uPLc.value[i].set(l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity); }
    pass(matVol, this.rt.vol);
    const hz = RESU.uHaze.value; let hn = 0;
    for (const h of this.hazes) { if (hn >= HAZE_N) break; worldToScreen(h.x, h.y, h.z, _v1); if (_v1.x < -.2 || _v1.x > 1.2 || _v1.y < -.3 || _v1.y > 1.1) continue; hz[hn++].set(_v1.x, _v1.y, h.r / CAM.h, h.s); }
    for (; hn < HAZE_N; hn++) hz[hn].set(0, 0, 0, 0);
    pass(matResolve, this.rt.a);
    DOFU.uFocus.value = this.focusZ; DOFU.uFocusY.value = this.focusY; DOFU.uMaxR.value = VIEW.ih * .0125;
    pass(matDOF, this.rt.b);
    const nb = QLEVELS[Q.level].bloom, B = this.bloom;
    BLU.tColor.value = this.rt.b.texture; BLU.uPx.value.set(1 / VIEW.iw, 1 / VIEW.ih); pass(matBloomPre, B[0]);
    for (let i = 1; i < nb; i++) { BLU.tColor.value = B[(i - 1) * 2].texture; BLU.uPx.value.set(1 / B[(i - 1) * 2].width, 1 / B[(i - 1) * 2].height); pass(matBloomDown, B[i * 2]); }
    let low = B[(nb - 1) * 2];
    for (let i = nb - 2; i >= 0; i--) { BLU.tColor.value = B[i * 2].texture; BLU.tLow.value = low.texture; BLU.uPx.value.set(1 / low.width, 1 / low.height); pass(matBloomUp, B[i * 2 + 1]); low = B[i * 2 + 1]; }
    FINU.tBloom.value = low.texture;
    pass(matFinal, null);
  }
};
