# Shader mẫu cho toon look (three.js, GLSL1 qua ShaderMaterial)

Mục lục: 1 vật liệu toon · 2 halftone · 3 pass info · 4 pass mực · 5 không khí · 6 bóng đổ · 7 smear · 8 on twos & line boil · 9 ghép vào khung · 10 API đề xuất `engine/toon.ts`

Quy ước: khung logic 1920×1080; `uScale = renderHeight / 1080` (preview thu nhỏ → < 1). Mọi kích thước pixel nhân `uScale`.
Bản chạy thật cho chữ 3D: `app/src/scenes/short-type.ts` của MV "I Don't Know What It Does" (không có trong template) (COLOR_FS / INFO_FS / EDGE_FS) — bản ở đây tổng quát hoá nó cho cả cảnh.

## 1. Vật liệu toon (cel 2–3 tông, đèn thế giới)

```glsl
// vertex
varying vec3 vWN; varying vec3 vWP; varying float vZ;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);   // không đúng với scale không đều → dùng normalMatrix thế giới nếu cần
  vec4 mv = viewMatrix * wp; vZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
```
```glsl
// fragment
uniform vec3 uBase, uShade, uDeep;      // skin của vật (sRGB→linear ở phía JS nếu renderer dùng linear)
uniform vec3 uL;                        // hướng tới đèn, KHÔNG gian thế giới, chuẩn hoá
uniform float uTh, uSoft, uTh2;         // ngưỡng lit/shade (vd 0.1), độ mềm (≥0.04), ngưỡng shade/deep (vd -0.45)
uniform float uScale, uPitch;           // halftone (mục 2)
varying vec3 vWN; varying vec3 vWP; varying float vZ;
float halftone(float dark);             // mục 2
void main() {
  float s = dot(normalize(vWN), uL);
  float lit = smoothstep(uTh - uSoft, uTh + uSoft, s);
  float deep = 1.0 - smoothstep(uTh2 - uSoft, uTh2 + uSoft, s);
  vec3 col = mix(uShade, uBase, lit);
  col = mix(col, uDeep, deep * 0.6);
  // chấm chỉ trong bóng, độ đậm liên tục theo mức tối (không bật/tắt theo ngưỡng)
  float dark = clamp((uTh + uSoft - s) / 1.2, 0.0, 1.0);
  col = mix(col, uDeep, halftone(dark) * (1.0 - lit));
  gl_FragColor = vec4(col, 1.0);
}
```

Chọn ngưỡng: in `dot(n, L)` của các mặt phẳng lớn (sàn, tường, mặt hộp) ra console một lần; đặt `uTh` cách mọi giá trị đó ≥ 2×`uSoft`.
Mặt cong (cầu, nhân vật) thì ranh giới chạy mượt trên bề mặt — đó là cái ta muốn.

Không dùng `MeshToonMaterial` + gradientMap: nó cho bậc nhưng đèn/ngưỡng khó kiểm soát và không có halftone; viết shader riêng ngắn hơn.

## 2. Halftone AM, cố định theo màn hình

```glsl
uniform float uScale, uPitch;  // uPitch tính ở 1080p, vd 7.0
float halftone(float dark) {
  vec2 q = gl_FragCoord.xy / (uPitch * uScale);
  q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * q;              // lưới 45°
  float d = length(fract(q) - 0.5);
  float r = 0.5 * sqrt(dark);                                   // diện tích chấm ∝ dark
  float aa = 0.7 / (uPitch * uScale);                           // ~1 px khử răng cưa
  return 1.0 - smoothstep(r - aa, r + aa, d);
}
```

- Cố định theo màn hình (không theo UV) là cố ý: giống tờ in, chấm không co giãn theo phối cảnh, và không bao giờ moiré với texture.
  Hệ quả: khi camera lia, vật trượt "dưới" lưới chấm. Đó là chất liệu, không phải lỗi.
- `sqrt(dark)` cho diện tích chấm tuyến tính theo độ tối. Muốn hai lớp (bóng nông = chấm thưa, bóng sâu = chấm dày) thì đổi `uPitch` theo lớp, không đổi góc lưới.
- Pitch 6–9 px ở 1080p đọc được ở kích thước điện thoại; nhỏ hơn 5 px bị nén video xoá mất.

## 3. Pass info (normal, độ sâu, ID)

Render cả cảnh lần hai với `scene.overrideMaterial = infoMat` vào target **không MSAA, Nearest, HalfFloat**:

```glsl
// fragment
uniform float uId;                     // 1..N, mỗi vật một số; 0 = nền
varying vec3 vN; varying float vZ;     // normal view-space, độ sâu tuyến tính
void main() { gl_FragColor = vec4(normalize(vN).xy, vZ, uId); }
```

Truyền ID từng vật khi dùng overrideMaterial:
```ts
mesh.onBeforeRender = (_r, _s, _c, _g, mat) => {
  const m = mat as THREE.ShaderMaterial;
  if (m === infoMat) { m.uniforms.uId.value = mesh.userData.inkId; m.uniformsNeedUpdate = true; }
};
```
`normal.z` suy ra lại bằng `sqrt(1 - x² - y²)` (luôn hướng về camera). Nền: clear màu `(0,0,0,0)` → `w == 0`.
InstancedMesh: ID = `uId + float(gl_InstanceID)` cần WebGL2 + GLSL3 — hoặc cho cả đàn chung một ID và để nét nếp gấp/độ sâu lo phần còn lại.
Vật không muốn có nét (sương, hạt, chữ lời): đặt ở layer khác, không render vào pass info.

## 4. Pass mực

```glsl
uniform sampler2D tCol, tInf; uniform vec2 uPx;   // 1/kích thước target
uniform vec3 uInk; uniform float uR, uScale;      // uR: bán kính nét ở 1080p (1.2–2.0)
uniform float uNear, uFar;                         // khoảng nét mảnh dần
varying vec2 vUv;
vec3 nrm(vec4 i) { return vec3(i.xy, sqrt(max(0.0, 1.0 - dot(i.xy, i.xy)))); }
float edge(vec4 a, vec4 b) {
  if (a.w == 0.0 && b.w == 0.0) return 0.0;
  if (abs(a.w - b.w) > 0.5) return 1.0;                                   // viền ngoài / vật khác
  return 1.0 - smoothstep(0.55, 0.8, dot(nrm(a), nrm(b)));                // nếp gấp
}
float jump(vec4 a, vec4 p, vec4 n) {                                       // vật tự che chính nó
  if (a.w == 0.0 || p.w == 0.0 || n.w == 0.0) return 0.0;
  float k = abs(2.0 * a.z - p.z - n.z) / a.z;                             // tương đối theo độ sâu
  return smoothstep(0.02, 0.05, k);
}
void main() {
  vec4 c = texture2D(tCol, vUv), i0 = texture2D(tInf, vUv);
  float far = i0.w == 0.0 ? 0.0 : smoothstep(uNear, uFar, i0.z);
  float r = uR * uScale * mix(1.0, 0.45, far);                              // mảnh dần theo khoảng cách
  float e = 0.0;
  for (int k = 0; k < 4; k++) {
    float an = float(k) * 0.7853982;
    vec2 o = vec2(cos(an), sin(an)) * r * uPx;
    vec4 p = texture2D(tInf, vUv + o), n = texture2D(tInf, vUv - o);
    e = max(e, max(max(edge(i0, p), edge(i0, n)), jump(i0, p, n)));
  }
  vec3 ink = mix(uInk, c.rgb, far * 0.5);                                   // mực xa nhạt về màu nền
  gl_FragColor = vec4(mix(c.rgb, ink, e), 1.0);
}
```

- So với `short-type.ts`: thêm ID (viền giữa hai vật cùng hướng mặt), `jump` tương đối theo độ sâu (bản gốc dùng ngưỡng tuyệt đối 8–16 px vì cảnh chỉ có chữ ở một khoảng cách), nét mảnh dần theo xa.
- 4 hướng × 2 phía = 8 mẫu là đủ cho nét 1.2–2 px. Nét dày hơn 3 px: chạy pass hai lần hoặc dilate kết quả, đừng tăng `uR` (sẽ ra nét đôi).
- `smoothstep` trên cả ba tiêu chí cho nét có biên mềm 1 px → không răng cưa dù target info không MSAA.

## 5. Không khí (chiều sâu không cần GTAO)

Trong vật liệu, sau khi có `col`:
```glsl
uniform vec3 uAir; uniform float uAirNear, uAirFar;
float a = smoothstep(uAirNear, uAirFar, vZ);
col = mix(col, uAir, a * 0.7);
```
Halftone cũng nhạt theo `a` (`* (1.0 - a)`), và pass mực dùng `far` như trên. Ba thứ cùng giảm theo khoảng cách — một quy luật, ba nơi.

## 6. Bóng đổ

Bóng đổ của three.js là tất định (không jitter) — dùng được. `renderer.shadowMap.type = THREE.BasicShadowMap` cho mép cứng như vẽ tay;
nhân mặt nạ bóng vào `s` **trước** ngưỡng (`s = min(s, mix(-1.0, s, shadowMask))`) để vùng bị che rơi đúng vào tông `shade` + chấm, không thành tông thứ tư.
Bóng tiếp xúc giả (đĩa tối dưới chân vật) thường đủ và rẻ hơn: một plane với gradient tròn, màu `uDeep`, không nhận đèn.

## 7. Smear

Vận tốc lấy từ công thức đóng: `vel = (pos(t) - pos(t - 1/60)) * 60` — không lưu frame trước. Trong vertex shader của vật:
```glsl
uniform vec3 uVel;     // thế giới, đơn vị/giây
uniform float uSmear;  // giây kéo giãn, vd 0.06
vec3 wn = normalize(mat3(modelMatrix) * normal);
float back = step(dot(wn, uVel), 0.0);                    // mặt sau theo hướng chạy
wp.xyz -= uVel * uSmear * back * smoothstep(0.0, 1.0, -dot(wn, normalize(uVel + 1e-5)));
```
- Bật chỉ khi tốc độ màn hình > ~40 px/khung; tắt khi vật chạy dọc trục nhìn (dot(vel, viewDir) lớn) — smear dọc trục nhìn trông như vật phồng lên.
- Một vật một smear. Không vẽ nhiều bản sao mờ (onion skin) — đó là motion blur, không phải hoạt hình.

## 8. On twos và line boil

```ts
const tPose = Math.floor(t * 12) / 12;   // pose nhân vật / vật hoạt hình: đổi 12 lần/giây
const tCam = t;                          // camera và chữ lời vẫn mượt
```
Line boil (nét rung nhẹ như vẽ tay), tất định:
```ts
const k = Math.floor(t * 12);
edgeMat.uniforms.uJit.value.set(hash(SEED, k, 0) - 0.5, hash(SEED, k, 1) - 0.5).multiplyScalar(0.6);
```
và cộng `uJit * uPx` vào toạ độ mẫu trong pass mực. Dùng nhẹ; bỏ hẳn trong đoạn chữ cần đọc kỹ.

## 9. Ghép vào khung

Thứ tự mỗi khung (một cảnh toon):
1. `renderer.setRenderTarget(colRT)` (MSAA 4 được) → render cảnh với vật liệu toon.
2. `scene.overrideMaterial = infoMat` → render vào `infRT` (không MSAA, Nearest, HalfFloat) → bỏ override.
3. Pass mực đọc `colRT` + `infRT` → ra target cảnh.
4. Lời: `LyricLayer.render(...)` như cảnh đất sét, rồi composite chữ của `Look` (đổi ink/paper theo nền). Chữ lời không vào pass info (không có nét toon) trừ khi chữ là vật trong phòng — khi đó nó là mesh toon bình thường có ID riêng.

Kích thước target = kích thước render thật (không phải 1920×1080 cố định), `uPx = 1/size`, `uScale = size.y / 1080`.
Tạo target một lần, tái dùng giữa các cảnh; resize khi renderer đổi kích thước.

## 10. API đề xuất `engine/toon.ts`

Đặt trong `app/src/engine/toon.ts` (thay đổi engine — nói rõ trong báo cáo):
```ts
export type Skin = { base: string; shade: string; deep?: string };
export interface ToonOpts { light: THREE.Vector3; th?: number; soft?: number; pitch?: number; ink?: string; air?: string; airNear?: number; airFar?: number }
export function toonMaterial(skin: Skin, o: ToonOpts): THREE.ShaderMaterial;   // mục 1, 2, 5
export function inkId(mesh: THREE.Object3D, id: number): void;               // gắn onBeforeRender
export class ToonPass {                                                         // mục 3, 4, 9
  constructor(renderer: THREE.WebGLRenderer, o: { ink: string; r?: number; near?: number; far?: number });
  render(scene: THREE.Scene, cam: THREE.Camera, t: number): THREE.Texture;     // t chỉ dùng cho line boil
  setLight(dir: THREE.Vector3): void;                                         // cập nhật uL của mọi toonMaterial
}
```
Chữ khối (opentype → ExtrudeGeometry) khi đó chỉ còn phần dựng glyph + layout, dùng `toonMaterial` và `ToonPass`.
