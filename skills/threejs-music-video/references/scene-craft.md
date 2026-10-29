# Scene craft — kỹ thuật dựng cảnh đồng bộ nhạc

Mọi công thức dưới đây là hàm của `t` (và dữ liệu dựng ở `init`). Ví dụ chạy được: `templates/app/src/scenes/
stage.ts` (instanced + camera keyframe + lời trên plane theo camera) và `studio.ts` (đất sét + Look).

## 1. Mốc thời gian lấy từ lời

```ts
// init()
const l = lyrics.find('Code it, ship it');            // dòng (lỗi rõ ràng nếu không thấy)
const w = (line, i) => line.words[i].start;           // theo vị trí từ
this.T = {
  ship: lyrics.word(l, 'ship').start,                 // theo chữ
  drop: audio.downbeatAtOrBefore(l.start),            // snap cắt/biến đổi lớn vào downbeat
  hit:  audio.beats.find((b) => b >= l.end) ?? l.end, // beat đầu tiên sau dòng
};
```

- Hiệu ứng **nhấn** (flash, punch, nén chữ, sticker đập) → `start` của từ tương ứng hoặc beat/downbeat gần nhất.
- Chuyển động **dài** (camera dịch chuyển, cảnh biến đổi) → từ downbeat này đến downbeat kia, hoặc từ một từ
  đến một từ.
- Bảng mốc dùng chung giữa nhiều hệ (camera, nhân vật, hoá đơn chạy, lời) → `scenes/<id>-plan.ts` trả về
  `{ T, ...hàm đóng }`; timeline cũng có thể import nó.

## 2. Ease theo khoảng

```ts
prog(t, a, b)                       // 0..1 kẹp
cubicInOut(prog(t, a, b))           // di chuyển giữa hai pose
arrive(t, start, dur)               // expoOut: "đã tới" — xuất hiện, pop
1 - arrive(t, end, 0.2)             // biến mất
spring(t - T.slap)                  // rung tắt dần sau sự kiện (0 trước đó)
```

Xếp chồng nhiều chuyển động bằng cách **mix tuần tự**, không cộng dồn trạng thái:

```ts
let p = POSE0;
const go = (q, a, b) => { const s = cubicInOut(prog(t, a, b)); if (s > 0) p = mix(p, q, s); };
go(POSE1, T.open, T.rise);
go(POSE2, T.swing - 1, T.swing + 1.5);     // pose sau ghi đè dần pose trước
```

`Pose` = vị trí + điểm nhìn + fov (xem `stage.ts`). Tua tới đâu cũng tính lại được từ đầu.

## 3. Nhịp: punch, pulse, biến thiên theo ô nhịp

```ts
const punch = Math.exp(-6 * f.barPhase);          // đỉnh ở downbeat, tắt dần trong ô nhịp
const kick  = Math.exp(-12 * f.beatPhase);        // mỗi beat
const off   = f.beatInBar % 2 === 1;              // phách 2 và 4 (backbeat)
const pick  = hash(i, f.bar) > 0.7;               // vật i được "chọn" trong ô nhịp này — đổi mỗi bar, tất định
const hop   = hash(seed, f.beat) > 0.55 ? 4 * f.beatPhase * (1 - f.beatPhase) : 0;   // nhảy parabol trên beat
```

- Envelope: `f.a.low` (bass) cho thở/phồng, `f.a.high` cho lấp lánh, `f.a.vocal` cho thứ gắn với giọng,
  `f.a.drums` cho rung. Envelope đã chuẩn hoá ~0..1 nhưng nhọn — thường dùng `0.6 + 0.6*a` hoặc `a**0.7`.
- Onset riêng: `audio.onsets('kick'|'snare'|'vocal', a, b)` → `[t, strength][]`; tìm onset gần nhất trước `t`
  rồi `exp(-k*(t - t0))` cho flash đúng trống thật thay vì lưới beat.
- Rung camera: `hash(f.beat, 1)-0.5` làm hướng, nhân `kick` — tất định, không jitter ngẫu nhiên.

## 4. Mô phỏng → công thức đóng

Vật chạy vòng, đếm, tăng tốc rồi hãm: viết quãng đường `s(t)` theo từng đoạn (tăng tốc đều `v/(2a)·τ²`, vận
tốc đều `v·τ`, hãm `cubicOut`) với biên đoạn là mốc lời/beat. Vị trí = `track(s(t) mod 1)`. Vật xuất hiện
theo sự kiện (hoá đơn mỗi beat, bóng bay mỗi từ) = danh sách `{ t, ... }` dựng trong `init`; render lọc
`items.filter(x => x.t <= t)` và tính tuổi `t - x.t`. Không bao giờ `push` trong `render`.

## 5. Lời

**`LyricBlock`** (canvas 2D): đo layout một lần trong `init`; `draw(g, t, x, y, color, align)` cho từng từ
xuất hiện đúng `start` (pop scale 0.55→1 trong `POP`=0.14 s), hàng giãn mượt khi từ mới vào.
`align`: `left | right | center | block` (bong bóng chat: khối căn trái, mép phải cố định).

**Gag từ khoá** — `WordFx(t, k)` trả `{ sx, sy, dx, dy, color, alpha }` cho từ thứ k:

```ts
const fx: WordFx = (t, k) => {
  if (k === 3) { const s = arrive(t, T.flat, 0.12); return { sy: 1 - 0.6 * s, sx: 1 + 0.3 * s }; }  // "flat" bị ép
  if (k === 5) return { dy: -60 * cubicInOut(prog(t, T.high, T.high + 0.6)), color: C.accent };    // "sky-high" bay lên
  return null;
};
new LyricBlock(line, style, g, fx);
```

Đặt lời lên đâu:
- **Plane gắn camera** (stage.ts): plane `W×?` ở khoảng cách `d = (H/2)/tan(fov/2)` → 1 đơn vị = 1 px, luôn
  trong khung, `depthTest: false`, `renderOrder` cao.
- **Canvas toàn khung qua `Look`** (studio.ts): vẽ chữ `#FFFFFF`, `Look.composite({ lyric: tex })` tự chọn mực
  hay giấy theo độ sáng nền mờ quanh từng chữ (ngưỡng ~0.18 linear); chữ có màu được giữ hue, kéo tối/sáng tới
  ≥ 3:1. Không cần viền/bóng chữ.
- **Trong thế giới 3D** (in trên sàn, dán lên vật) mà vẫn tự tương phản: mesh chữ thêm vào `LyricLayer`
  (layer 1, bị vật khác che), `look.composite({ lyric: layer.render(scene, cam), layered: true })`.
- **troika Text 3D**: chữ tĩnh/nhãn; sync trước, animate bằng transform/opacity. Hiện từng từ: một `Text`
  cho mỗi từ, hoặc `clipRect` theo `textRenderInfo`.
- **Chữ đùn 3D thật** (từng glyph là khối): opentype.js đọc outline → `ShapePath` → `toShapes()` →
  `ExtrudeGeometry` (cache theo ký tự); làm phẳng đường cong bằng cách lấy mẫu Bezier, bỏ điểm trùng/điểm đóng
  (chúng làm hỏng tam giác hoá). Camera phối cảnh rộng để thấy cạnh bên; nghiêng nhẹ mỗi chữ bằng `hash`.
  `npm i opentype.js`; font phải nạp bằng `fetch` + `opentype.parse` trong `init`.

Vùng an toàn: ngang 1920×1080 chừa ~5% mép; dọc 1080×1920 giữ chữ trong x 60–920, y 220–1420 (né UI của
Shorts/TikTok ở dưới và bên phải).

## 6. Giao diện 2D trên vật 3D

`CanvasSurface(w, h, scale)` — canvas vẽ ở `scale×` (nét), `begin(bg)` → vẽ bằng toạ độ logic → `commit()`.
Dán lên `slab(w, h, depth, r, capMat, sideMat)` (tấm bo góc, UV mặt trước khớp canvas 1:1) cho màn hình,
thẻ, cửa sổ chat, hoá đơn. Bóng mềm dưới tấm nổi: `SoftShadow.set(w, h, r, blur, opacity)` với tham số từ
`shadowFor(z)` (cao hơn → lệch xa, mờ hơn, nhạt hơn) — rẻ và ổn định hơn shadow map cho UI phẳng.

## 7. Look "đất sét" (tuỳ chọn, `engine/look.ts` + `engine/clay.ts`)

```ts
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;   // bóng mềm
const mat = clay('#E9D9BF', { world: true, freq: 0.05, bump: 1.6, tint: '#DCC6A3', patch: 0.6 });
this.look = new Look(renderer, scene, cam);               // rt HalfFloat 4×MSAA + GTAOPass (noise đã seed)
// render():
r.setRenderTarget(this.look.rt); r.render(scene, cam);
this.look.ao(cam, radius, thickness, [skyDome], [fadeStart, fadeEnd]);
this.look.composite(target, { lyric: tex, ao: 1, tone: true });
```

- `clay`: albedo loang + bump từ value noise 3D theo vị trí (object space mặc định; `world: true` cho sàn,
  vật tĩnh lớn, instanced). Giữ `bump × freq ≈ 0.06–0.1` ở mọi tỉ lệ. Noise tự tắt khi nhỏ hơn pixel
  (`fwidth`) nên không nhấp nháy.
- GTAO: `radius`/`thickness` theo đơn vị thế giới (≈ kích thước vật nhỏ); ẩn vòm trời/sprite phát sáng qua
  `hide`; tắt AO ở xa bằng `fade` (mặt đất xa bị tối giả thành dải xám).
- Neutral tonemap gần như đồng nhất dưới ~0.76 → màu thiết kế giữ nguyên; màu tối cần chính xác trên mặt phẳng
  sáng đều thì dùng `untone(hex)`.

## 8. Chuyển cảnh

- **Cắt cứng đúng downbeat** — mặc định, hay nhất cho nhạc có nhịp.
- **`fadeIn`** trên entry — crossfade ngắn (0.2–0.5 s) khi hai cảnh cùng tông.
- **Handoff** — cảnh sau dựng cảnh trước bên trong với `params.exitUntil` (xem `engine.md`); dùng cho "camera
  lao vào màn hình rồi màn hình thành thế giới mới", "vật ở cảnh A rơi ra thành cảnh B".
- **Match cut** — kết thúc cảnh A và mở cảnh B bằng cùng một hình (vòng tròn, khung chữ nhật, màu nền) tại cùng
  vị trí màn hình; tính vị trí đó bằng `vector.project(cam)` ở A rồi đặt vật B khớp.
- **Flash giấy** — một quad toàn khung `opacity = exp(-8*(t - T.cut))` ngay sau cắt, vẽ *dưới* lời để lời
  không bị mất.

## 9. Hiệu năng (để export ≥ 10 fps ở 1080p)

- `InstancedMesh` cho vật lặp lại; cập nhật `instanceMatrix` một lần mỗi khung.
- Canvas texture: vẽ lại chỉ vùng/texture đang thấy; tắt mipmap cho canvas toàn khung đổi mỗi khung.
- GTAO ở `aoScale = 0.5`; shadow map 2048 là đủ với VSM.
- Tránh tạo object/geometry trong `render` (GC giật, và có thể rò bộ nhớ GPU); tái dùng `Vector3`/`Matrix4`.
