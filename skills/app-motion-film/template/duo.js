import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { W, H, B, E, clamp, lerp, tw, el, set } from './core.js';
import { Scene, punch } from './blocks.js';

const GOLD = '#DDB46E', INK = '#F3EDE4', MUTE = '#A39A8E';
const sstep = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const deg = Math.PI / 180;

function keyed(t, keys) {
  const n = keys.length, T = keys.map(k => k[0]), P = keys.map(k => k.slice(1));
  if (t <= T[0]) return P[0];
  if (t >= T[n - 1]) return P[n - 1];
  let i = 1; while (t > T[i]) i++;
  const a = i - 1, b = i, h = T[b] - T[a], u = (t - T[a]) / h, u2 = u * u, u3 = u2 * u;
  const tan = j => P[j].map((_, c) => j === 0 ? (P[1][c] - P[0][c]) / (T[1] - T[0]) : j === n - 1 ? (P[j][c] - P[j - 1][c]) / (T[j] - T[j - 1]) : (P[j + 1][c] - P[j - 1][c]) / (T[j + 1] - T[j - 1]));
  const ma = tan(a), mb = tan(b);
  return P[a].map((v, c) => (2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * h * ma[c] + (-2 * u3 + 3 * u2) * P[b][c] + (u3 - u2) * h * mb[c]);
}

export class Backdrop extends Scene {
  build() { this.noGrid = true; this.bg = el('div', this.root, 'abs full'); }
  update(t) {
    const u = t / B(this.k1), gx = lerp(.18, .82, sstep(u)) + .04 * Math.sin(t * .7), gy = 1.02 - .05 * Math.sin(t * .45), m = Math.max(W, H);
    set(this.bg, 'background', [
      `radial-gradient(${m * .62}px ${m * .44}px at ${gx * W}px ${gy * H}px, rgba(255,196,112,.92), rgba(250,156,52,.7) 22%, rgba(226,120,30,.36) 46%, rgba(160,80,20,.12) 70%, transparent 88%)`,
      `radial-gradient(${m * .6}px ${m * .42}px at ${(1 - gx) * W}px ${H * .02}px, rgba(110,126,140,.3), transparent 70%)`,
      'linear-gradient(180deg, #121417 0%, #141618 55%, #17161a 100%)'].join(','));
  }
  cam() { return { x: 0, y: 0, s: 1, r: 0 }; }
}

const IN = { img: 'assets/duo_inner.png', w: 3093, h: 2247, body: [58, 58, 3035, 2187], screen: [120, 120, 2853, 2007] };
const BK = { img: 'assets/duo_back.png', w: 3056, h: 2194, body: [38, 23, 3016, 2162], screen: [1570, 80, 1398, 2034] };
const loadImg = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });

const LEVELS = 7;
const flat = t => { t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; };

class Surface {
  constructor(spec, scale) {
    this.s = spec; this.k = scale;
    this.c = document.createElement('canvas'); this.c.width = Math.round(spec.screen[2] * scale); this.c.height = Math.round(spec.screen[3] * scale);
    this.x = this.c.getContext('2d');
    this.tex = flat(new THREE.CanvasTexture(this.c));
    this.p = document.createElement('canvas'); this.p.width = this.c.width + 2 * LEVELS + 8; this.p.height = Math.ceil(this.c.height / 2) + 1;
    this.px = this.p.getContext('2d'); this.pyr = flat(new THREE.CanvasTexture(this.p));
    this.lv = [new THREE.Vector4(0, 0, this.c.width, this.c.height)];
    for (let n = 1, x = 0; n <= LEVELS; n++) {
      const w = Math.max(1, Math.round(this.c.width / 2 ** n)), h = Math.max(1, Math.round(this.c.height / 2 ** n));
      this.lv.push(new THREE.Vector4(x, 0, w, h)); x += w + 2;
    }
    this.m = document.createElement('canvas'); this.m.width = Math.round(spec.w * scale); this.m.height = Math.round(spec.h * scale);
    this.mask = new THREE.CanvasTexture(this.m);
    this.frame = new THREE.Texture(); this.frame.colorSpace = THREE.SRGBColorSpace; this.frame.anisotropy = 8;
  }
  draw(src) {
    const { x, c } = this;
    if (src && src.tagName === 'VIDEO' && (src.readyState < 2 || src.seeking)) return;
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    if (src) x.drawImage(src, 0, 0, c.width, c.height);
    const { px, p, lv } = this;
    px.clearRect(0, 0, p.width, p.height);
    for (let n = 1; n <= LEVELS; n++) {
      const a = lv[n - 1], b = lv[n];
      px.drawImage(n === 1 ? c : p, a.x, a.y, a.z, a.w, b.x, b.y, b.z, b.w);
    }
    this.tex.needsUpdate = true; this.pyr.needsUpdate = true;
  }
  setBezel(img) {
    this.bezel = img; this.frame.image = img; this.frame.needsUpdate = true;
    const w = this.m.width, h = this.m.height, mx = this.m.getContext('2d'); mx.drawImage(img, 0, 0, w, h);
    const d = mx.getImageData(0, 0, w, h), a = d.data;
    for (let y = 0; y < h; y++) {
      let l = -1, r = -1;
      for (let i = 0; i < w; i++) if (a[(y * w + i) * 4 + 3] > 127) { if (l < 0) l = i; r = i; }
      for (let i = 0; i < w; i++) { const k = (y * w + i) * 4; a[k] = a[k + 1] = a[k + 2] = 255; a[k + 3] = l >= 0 && i > l && i < r ? 255 : a[k + 3]; }
    }
    mx.putImageData(d, 0, 0); this.mask.needsUpdate = true;
  }
  uv(x0, x1) { const { w, h, body } = this.s; return [x0 / w, x1 / w, 1 - body[3] / h, 1 - body[1] / h]; }
}

const SCREEN = `
uniform sampler2D uUi, uPyr;
uniform vec4 uLv[8];
uniform vec2 uAtlas;
uniform vec2 uPixel;
vec3 level(vec2 uv, int n) {
  if (n == 0) return texture(uUi, uv).rgb;
  vec4 r = uLv[n];
  vec2 q = clamp(uv, 0.5 / r.zw, 1.0 - 0.5 / r.zw);
  return texture(uPyr, vec2((r.x + q.x * r.z) / uAtlas.x, 1.0 - (r.y + (1.0 - q.y) * r.w) / uAtlas.y)).rgb;
}
vec3 sampleLod(vec2 uv, float lod) {
  lod = clamp(lod, 0.0, 7.0);
  int n = int(floor(lod));
  return mix(level(uv, n), level(uv, min(n + 1, 7)), lod - float(n));
}
uniform vec4 uRect;
uniform vec2 uGrad;
uniform vec3 uEye;
uniform float uPlaneZ, uMotion, uRadius, uAnchor, uOn, uFloor, uFrost, uDark;
vec3 screenColor() {
  float depth = (uPlaneZ - uEye.z) / (vP.z - uEye.z);
  vec2 projected = uEye.xy + (vP.xy - uEye.xy) * depth;
  vec2 sourceUV = (projected - uRect.xy) / uRect.zw;
  #ifdef OUTER_UI
    sourceUV.x = uGrad.x + (projected.x - uAnchor) / uRect.z;
  #endif
  float edge = (sourceUV.x - uGrad.x) / (uGrad.y - uGrad.x);
  float blurGradient = mix(uFloor, 1.0, pow(clamp(edge, 0.0, 1.0), 2.2));
  float darkenGradient = clamp((edge - 0.2) / 0.8, 0.0, 1.0);
  float effect = uMotion * pow(darkenGradient, 1.35);
  float radius = uRadius * uMotion * blurGradient;
  vec2 aa = max(fwidth(sourceUV), uPixel * 0.5);
  vec2 dx = dFdx(sourceUV) / uPixel;
  vec2 dy = dFdy(sourceUV) / uPixel;
  float baseLod = log2(max(1.0, max(length(dx), length(dy))));
  vec2 coverage = smoothstep(-aa, aa, sourceUV) * (1.0 - smoothstep(vec2(1.0) - aa, vec2(1.0) + aa, sourceUV));
  vec3 color = sampleLod(clamp(sourceUV, vec2(0.0), vec2(1.0)), baseLod) * coverage.x * coverage.y;
  if (radius > 0.0) {
    float lod = max(baseLod, log2(max(1.0, radius)));
    vec2 footprint = max(aa, uPixel * radius * 0.75);
    color = vec3(0.0);
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        float wx = x == 0 ? 6.0 : (abs(x) == 1 ? 4.0 : 1.0);
        float wy = y == 0 ? 6.0 : (abs(y) == 1 ? 4.0 : 1.0);
        vec2 sampleUV = sourceUV + vec2(float(x), float(y)) * uPixel * radius;
        vec2 c = smoothstep(-footprint, footprint, sampleUV) * (1.0 - smoothstep(vec2(1.0) - footprint, vec2(1.0) + footprint, sampleUV));
        color += sampleLod(clamp(sampleUV, vec2(0.0), vec2(1.0)), lod) * c.x * c.y * wx * wy / 256.0;
      }
    }
  }
  color = pow(max(color, vec3(0.0)), vec3(1.0 + 0.9 * uMotion * blurGradient));
  color *= 1.0 - min(1.0, effect * uDark);
  return uOn * mix(color, vec3(0.93, 0.94, 0.96), uFrost * uMotion * blurGradient);
}
`;

function screenMat(surf, shiftInv, kind, u = {}) {
  const uniforms = { uMask: { value: surf.mask }, uShiftInv: shiftInv, uUi: { value: surf.tex }, uPyr: { value: surf.pyr }, uLv: { value: surf.lv }, uAtlas: { value: new THREE.Vector2(surf.p.width, surf.p.height) }, ...Object.fromEntries(Object.entries(u).map(([n, v]) => [n, { value: v }])) };
  const m = new THREE.MeshBasicMaterial({ map: surf.frame, transparent: true, alphaTest: .5, toneMapped: false });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'uniform mat4 uShiftInv;\nvarying vec3 vP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvP = (uShiftInv * modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_pars_fragment>', `#include <map_pars_fragment>\nuniform sampler2D uMask;\nvarying vec3 vP;\n${kind === 'outer' ? '#define OUTER_UI\n' : ''}${kind ? SCREEN : ''}`)
      .replace('#include <map_fragment>', `vec4 fr = texture2D(map, vMapUv);\nvec3 ui = ${kind ? 'screenColor()' : 'vec3(0.0)'};\ndiffuseColor = vec4(mix(ui, fr.rgb, fr.a), texture2D(uMask, vMapUv).a);`);
  };
  m.customProgramCacheKey = () => `duo-${kind || 'back'}`;
  m.uniforms = uniforms;
  return m;
}

function leafShape(w, h, r, side) {
  const s = new THREE.Shape(), x0 = side < 0 ? -w : 0, x1 = side < 0 ? 0 : w, y0 = -h / 2, y1 = h / 2;
  if (side < 0) {
    s.moveTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r);
    s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); s.lineTo(x1, y0);
  } else {
    s.moveTo(x0, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r);
    s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0, y1); s.lineTo(x0, y0);
  }
  return s;
}
function face(w, h, uv, cx, z, back, mat) {
  const g = new THREE.PlaneGeometry(w, h), a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, lerp(uv[0], uv[1], a.getX(i)), lerp(uv[2], uv[3], a.getY(i)));
  const m = new THREE.Mesh(g, mat);
  m.position.set(cx, 0, z); if (back) m.rotation.y = Math.PI;
  return m;
}

function flexFace(w, h, uv, hw, n, mat) {
  const xs = [-w, ...Array.from({ length: n + 1 }, (_, i) => -hw + 2 * hw * i / n), w], pos = [], tuv = [], idx = [];
  xs.forEach(x => { const u = lerp(uv[0], uv[1], (x + w) / (2 * w)); pos.push(x, h / 2, 0, x, -h / 2, 0); tuv.push(u, uv[3], u, uv[2]); });
  for (let i = 0; i < xs.length - 1; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(tuv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.userData.xs = xs;
  return m;
}

// The iPhone Duo: two leaves on a hinge at x = 0. The right leaf (camera on its back) stays put; the left leaf
// carries the outer screen on its back and swings 180 degrees over the front to close. fold(t): 1 closed, 0 open.
export class Duo extends Scene {
  build() {
    const o = this.o;
    this.cv = el('canvas', this.root, 'abs');
    this.r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.r.setPixelRatio(window.devicePixelRatio || 1); this.r.setSize(W, H);
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(this.r).fromScene(new RoomEnvironment(), .04).texture;
    const key = new THREE.DirectionalLight('#FFC27A', 2.2); key.position.set(3, -4, 3); this.scene.add(key);
    const rim = new THREE.DirectionalLight('#9FB4D0', 1.2); rim.position.set(-4, 5, 2); this.scene.add(rim);
    this.lens = this.o.lens || 3; this.vw = [W, H];
    const z0 = (o.dist || 8.4) * this.lens;
    this.cam3 = new THREE.PerspectiveCamera(2 * Math.atan(Math.tan(12 * deg) / this.lens) / deg, W / H, z0 / 3, z0 * 2.5);

    const lw = (IN.body[2] - IN.body[0]) / 2000, lh = (IN.body[3] - IN.body[1]) / 1000, d = .056, rad = .25, bev = .012, gap = .002, eps = .0006;
    this.lw = lw;
    this.inner = new Surface(IN, .75); this.outer = new Surface(BK, .75);
    const eye = 40 / 15.7987 * 2 * lw, R = 28 * this.inner.c.width / 2670;
    const sIx = lw / (IN.body[2] - (IN.body[0] + IN.body[2]) / 2), sIy = lh / (IN.body[3] - IN.body[1]), cIy = (IN.body[1] + IN.body[3]) / 2;
    const sOx = lw / (BK.body[2] - (BK.body[0] + BK.body[2]) / 2), sOy = lh / (BK.body[3] - BK.body[1]), cOy = (BK.body[1] + BK.body[3]) / 2;
    const [ix, iy, iw, ih] = IN.screen, [ox, oy, ow, oh] = BK.screen;
    this.fold3 = { d, gap, eps, ox: (ox - (BK.body[0] + BK.body[2]) / 2) * sOx, zc: 4 * gap + d + eps };
    this.shiftInv = { value: new THREE.Matrix4() };
    const mInner = this.mInner = screenMat(this.inner, this.shiftInv, 'inner', {
      uEye: new THREE.Vector3(0, 0, eye), uPlaneZ: eps, uRect: new THREE.Vector4((ix - (IN.body[0] + IN.body[2]) / 2) * sIx, (cIy - iy - ih) * sIy, iw * sIx, ih * sIy),
      uGrad: new THREE.Vector2(.5, 0), uMotion: 0, uFloor: 0, uFrost: 0, uDark: 0, uRadius: R, uPixel: new THREE.Vector2(1 / this.inner.c.width, 1 / this.inner.c.height), uAnchor: 0, uOn: 1 });
    const mOuter = this.mOuter = screenMat(this.outer, this.shiftInv, 'outer', {
      uEye: new THREE.Vector3(0, 0, eye), uPlaneZ: this.fold3.zc, uRect: new THREE.Vector4(this.fold3.ox, (cOy - oy - oh) * sOy, ow * sOx, oh * sOy),
      uGrad: new THREE.Vector2(0, 1), uMotion: 0, uFloor: 0, uFrost: 0, uDark: 0, uRadius: R, uPixel: new THREE.Vector2(1 / this.outer.c.width, 1 / this.outer.c.height), uAnchor: this.fold3.ox, uOn: 1 });
    const mBack = screenMat(this.outer, this.shiftInv, null);
    const metal = new THREE.MeshStandardMaterial({ color: '#2C3649', metalness: .9, roughness: .3, envMapIntensity: 1.3 });
    const body = side => {
      const g = new THREE.ExtrudeGeometry(leafShape(lw - 2 * bev, lh - 2 * bev, rad, side), { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 24 });
      g.translate(side * bev, 0, -d + bev);
      return new THREE.Mesh(g, metal);
    };
    const bx = (BK.body[0] + BK.body[2]) / 2;
    this.dev = new THREE.Group(); this.scene.add(this.dev);
    this.shift = new THREE.Group(); this.dev.add(this.shift);
    const fixed = new THREE.Group(); this.shift.add(fixed);
    fixed.add(body(1));
    this.flex = flexFace(lw, lh, this.inner.uv(IN.body[0], IN.body[2]), .35 / 15.7987 * 2 * lw, 32, mInner); fixed.add(this.flex);
    fixed.add(face(lw, lh, this.outer.uv(BK.body[0], bx), lw / 2, -d - eps, true, mBack));
    this.pivot = new THREE.Group(); this.pivot.position.z = 2 * gap; this.shift.add(this.pivot);
    const mv = new THREE.Group(); mv.position.z = -2 * gap; this.pivot.add(mv);
    mv.add(body(-1));
    mv.add(face(lw, lh, this.outer.uv(bx, BK.body[2]), -lw / 2, -d - eps, true, mOuter));

    const sc = document.createElement('canvas'); sc.width = sc.height = 256;
    const sx = sc.getContext('2d'), g = sx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(.55, 'rgba(0,0,0,.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = g; sx.fillRect(0, 0, 256, 256);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    this.shadow.renderOrder = -1; this.scene.add(this.shadow);

    this.clips = (o.clips || []).map(c => ({ ...c, t0: B(c.at), t1: B(c.until) }));
    this.ready = Promise.all([
      loadImg(IN.img).then(i => this.inner.setBezel(i)), loadImg(BK.img).then(i => this.outer.setBezel(i)),
      ...this.clips.map(async c => {
        const blob = await fetch(c.preview && !location.search.includes('render') ? c.preview : c.src).then(r => r.blob());
        if (/\.(png|jpe?g)$/i.test(c.src)) { c.img = await createImageBitmap(blob); return; }
        const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(blob);
        await new Promise(r => v.readyState >= 2 ? r() : v.addEventListener('loadeddata', r, { once: true }));
        c.video = v; c.dur = v.duration;
      })]);
  }
  clipAt(t, surface) {
    let best = null;
    for (const c of this.clips) if (c.on === surface && t >= c.t0 - 1e-6 && t < c.t1) best = c;
    if (!best) for (const c of this.clips) if (c.on === surface && t >= c.t1) best = c;
    if (!best) best = this.clips.find(c => c.on === surface) || null;
    return best;
  }
  clipTime(c, t) {
    const raw = (c.from || 0) + Math.max(0, t - c.t0) * (c.rate || 1);
    return clamp(raw, 0, (c.dur || 0) - 1 / 60);
  }
  async prep(t) {
    await this.ready;
    for (const s of ['inner', 'outer']) {
      const c = this.clipAt(t, s);
      if (!c || !c.video) continue;
      const ct = Math.floor(this.clipTime(c, t) * 60 + 1e-4) / 60 + .5 / 60;
      if (Math.abs(c.video.currentTime - ct) < 1e-4) continue;
      await new Promise(r => { c.video.addEventListener('seeked', r, { once: true }); c.video.currentTime = ct; });
    }
  }
  play(t) {
    for (const c of this.clips) if (c.video) {
      c.video.playbackRate = c.rate || 1; c.video.currentTime = this.clipTime(c, t); c.video.play();
      if (c.live) continue;
      c.live = true; c.shown = 0; let n = 0;
      const grab = () => {
        if (!c.live) return;
        const k = ++n;
        createImageBitmap(c.video).then(b => { if (c.live && k > c.shown) { c.bmp?.close(); c.bmp = b; c.shown = k; } else b.close(); });
        c.video.requestVideoFrameCallback(grab);
      };
      c.video.requestVideoFrameCallback(grab);
    }
  }
  pause() { for (const c of this.clips) if (c.video) { c.video.pause(); c.live = false; c.bmp?.close(); c.bmp = null; } }
  sync(t) {
    for (const c of this.clips) if (c.video && !c.video.seeking && Math.abs(c.video.currentTime - this.clipTime(c, t)) > .12) c.video.currentTime = this.clipTime(c, t);
  }
  bend(phi) {
    const { eps, gap } = this.fold3, xs = this.flex.userData.xs, hw = xs[xs.length - 2], pz = 2 * gap, c = Math.cos(phi), s = Math.sin(phi);
    const rot = (x, z) => [c * x + s * (z - pz), -s * x + c * (z - pz) + pz];
    const A = rot(-hw, eps), ta = [2 * hw * c, -2 * hw * s], P = this.flex.geometry.attributes.position;
    xs.forEach((x, i) => {
      let q;
      if (x >= hw) q = [x, eps];
      else if (x <= -hw) q = rot(x, eps);
      else {
        const t = (x + hw) / (2 * hw), t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
        q = [h00 * A[0] + h10 * ta[0] + h01 * hw + h11 * 2 * hw, h00 * A[1] + h10 * ta[1] + h01 * eps];
      }
      P.setXYZ(2 * i, q[0], P.getY(2 * i), q[1]); P.setXYZ(2 * i + 1, q[0], P.getY(2 * i + 1), q[1]);
    });
    P.needsUpdate = true;
  }
  pose(t) {
    const o = this.o, k = b => B(b);
    const fold = 1 - tw(t, k(o.open[0]), k(o.open[1]), E.inOutCubic) + tw(t, k(o.close[0]), k(o.close[1]), E.inOutCubic);
    return { fold, ...Object.fromEntries(['x', 'y', 'z', 'yaw', 'pitch', 'roll'].map((n, i) => [n, keyed(t, o.keys.map(r => [B(r[0]), ...r.slice(1)]))[i]])) };
  }
  update(t) {
    if (!this.inner.bezel) return;
    const p = this.pose(t), phi = Math.PI * p.fold;
    this.pivot.rotation.y = phi;
    this.bend(phi);
    this.shift.position.x = -this.lw / 2 * sstep(p.fold);
    const sw0 = this.o.sway || {}, ph = 2 * Math.PI * t / (sw0.p || 6);
    p.x += (sw0.x || 0) * Math.sin(ph); p.y += (sw0.y || 0) * Math.sin(ph * 1.3 + 1);
    p.yaw += (sw0.yaw || 0) * Math.sin(ph * .8 + .6); p.pitch += (sw0.pitch || 0) * Math.sin(ph * 1.1 + 2); p.roll += (sw0.roll || 0) * Math.sin(ph * .7 + 2.6);
    this.dev.position.set(p.x, p.y, p.z);
    this.dev.rotation.set(p.pitch * deg, p.yaw * deg, p.roll * deg, 'YXZ');
    this.shadow.position.set(p.x + .1, p.y - .12, p.z - .45);
    const sw = lerp(2.1 * 1.1, 1.5 * 1.1, sstep(p.fold)) * 1.8;
    this.shadow.scale.set(sw, 2.13 * 1.25, 1);
    const ci = this.clipAt(t, 'inner'), co = this.clipAt(t, 'outer');
    this.inner.draw(ci && (ci.bmp || ci.video || ci.img));
    this.outer.draw(co && (co.bmp || co.video || co.img));
    const D = this.o.dist || 8.4, [vw, vh] = this.vw, sy = (p.y - (this.o.camY || 0)) / (D * Math.tan(12 * deg));
    this.cam3.position.set(0, p.y, D * this.lens); this.cam3.lookAt(0, p.y, 0);
    this.cam3.setViewOffset(vw, vh, 0, sy * vh / 2, vw, vh);
    this.scene.updateMatrixWorld();
    this.shiftInv.value.copy(this.shift.matrixWorld).invert();
    this.mInner.uniforms.uEye.value.copy(this.cam3.position).applyMatrix4(this.shiftInv.value);
    this.mOuter.uniforms.uEye.value.copy(this.mInner.uniforms.uEye.value);
    const F = this.fold3, cs = Math.cos(phi), sn = Math.sin(phi), xp = -F.ox, zp = -F.d - F.eps - 2 * F.gap;
    const x1 = xp * cs + zp * sn, z1 = -xp * sn + zp * cs + 2 * F.gap, mo = this.mOuter.uniforms, e = mo.uEye.value;
    const env = (a, b) => t < B(a) ? 0 : t < B(b) ? sstep(clamp((t - B(a)) / (.15 * (B(b) - B(a))))) : Math.exp(-(t - B(b)) / .18);
    const op = env(...this.o.open), cl = env(...this.o.close);
    this.mInner.uniforms.uMotion.value = mo.uMotion.value = Math.max(op, cl);
    this.mInner.uniforms.uDark.value = mo.uDark.value = cl > op ? 1.2 : .3;
    mo.uAnchor.value = e.x + (x1 - e.x) * (e.z - F.zc) / (e.z - z1);
    mo.uOn.value = phi > 1e-3 ? 1 : 0;
    this.r.render(this.scene, this.cam3);
  }
  cam() { return { x: 0, y: 0, s: 1, r: 0 }; }
}

// Lines of SF type above the device. Each word lands soft (blur, rise, fade, 70 ms apart); *word* is the gold one.
export class Say extends Scene {
  build() {
    this.lines = this.o.lines.map(l => {
      const g = el('div', this.root, 'abs say', { top: (l.y || this.o.y || 120) + 'px', fontSize: (l.size || this.o.size || 74) + 'px' });
      const words = l.text.split(' ').map((w, i, a) => {
        const acc = /^\*.*\*[.,]?$/.test(w), s = el('span', g, 'sw' + (acc ? ' acc' : ''));
        s.textContent = w.replace(/\*/g, ''); if (i < a.length - 1) g.appendChild(document.createTextNode(' '));
        return { s, acc };
      });
      return { ...l, t0: B(l.at), t1: B(l.out), g, words };
    });
  }
  update(t) {
    for (const L of this.lines) {
      const on = t >= L.t0 - .01 && t < L.t1 + .8;
      set(L.g, 'display', on ? '' : 'none'); if (!on) continue;
      const life = Math.max(0, t - L.t0);
      set(L.g, 'transform', `translate(-50%,0) scale(${(1 + .018 * life).toFixed(4)})`);
      L.words.forEach((w, i) => {
        const a = L.t0 + i * .07, u = tw(t, a, a + .6, E.outExpo), v = tw(t, L.t1 + i * .035, L.t1 + .32 + i * .035, E.inCubic);
        const pk = w.acc ? .1 * punch(t, a + .18, 7) * (t > a + .18 ? 1 : 0) : 0;
        set(w.s, 'opacity', (u * (1 - v)).toFixed(3));
        set(w.s, 'filter', `blur(${(18 * (1 - u) + 14 * v).toFixed(2)}px)`);
        set(w.s, 'transform', `translateY(${(30 * (1 - u) - 26 * v).toFixed(2)}px) scale(${(1 + pk).toFixed(4)})`);
      });
    }
  }
  cam() { return { x: 0, y: 0, s: 1, r: 0 }; }
}

export class Card extends Scene {
  build() {
    const o = this.o;
    this.g = el('div', this.root, 'abs dcard', { top: (o.y || 70) + 'px' });
    this.icon = el('img', this.g, 'dicon'); this.icon.src = o.icon;
    this.name = el('div', this.g, 'dname'); this.name.textContent = o.name;
    this.tag = el('div', this.g, 'dtag'); this.tag.textContent = o.tagline;
  }
  update(t) {
    const t0 = this.t0, parts = [[this.icon, 0], [this.name, .12], [this.tag, .3]];
    for (const [e, dl] of parts) {
      const u = tw(t, t0 + dl, t0 + dl + .7, E.outExpo);
      set(e, 'opacity', u.toFixed(3)); set(e, 'filter', `blur(${(16 * (1 - u)).toFixed(2)}px)`);
      set(e, 'transform', `translateY(${(34 * (1 - u)).toFixed(2)}px) scale(${(e === this.icon ? lerp(.7, 1, E.outBack(clamp((t - t0) / .8))) : 1).toFixed(4)})`);
    }
    set(this.g, 'transform', `translate(-50%,0) scale(${(1 + .012 * Math.max(0, t - t0)).toFixed(4)})`);
  }
  cam() { return { x: 0, y: 0, s: 1, r: 0 }; }
}
export { GOLD, INK, MUTE };
