# Engine — kiến trúc và API

```
data/audio.json ─► AudioData ─┐
data/lyrics.json ─► Lyrics ───┼─► timeline.ts: TimelineEntry[] ─► Engine.entryAt(t)
                              │                                     │
                              └────────── Engine.frame(t) ─► Frame ─┴─► Scene.render(f, post.rtA)
                                                                              │
                         (fadeIn: scene trước → rtA, scene sau → rtB, blendB) │
                                                                              ▼
                                         Post.finish(round(t·60), grain/vignette) ─► canvas (sRGB)
preview: main.ts lấy t = <audio>.currentTime mỗi rAF, vẽ HUD
export : window.__mv.stream(ws, from, to, fps) → t = n/fps → readPixels → WebSocket → ffmpeg
```

## File

| file | vai trò |
|---|---|
| `engine/audio.ts` | `AudioData`: `beats`, `downbeats`, `sections`, `beatsPerBar`; `beat(t)`, `bar(t)`, `section(t)`, `sectionByName`, `downbeatAtOrBefore/After`, `nearestDownbeat`, `lastDownbeat`, `env(name,t)`, `sample(t)`, `onsets(kind,a,b)`; `bisect` |
| `engine/lyrics.ts` | `Lyrics`: `lines`, `extras`; `lineAt`, `activeLine`, `wordAt`, `find(needle, nth)`, `word(line, needle, nth)`, `linesIn(section)` |
| `engine/scene.ts` | `W`, `H`, `PORTRAIT`, `TimelineEntry`, `SceneCtx`, `Frame`, `Scene`, `pixelCamera()` |
| `engine/engine.ts` | nạp/khởi tạo cảnh (lazy, một lần cho mỗi entry), dựng `Frame`, crossfade, gọi post |
| `engine/post.ts` | render target HalfFloat 4×MSAA `rtA`/`rtB`, `blendB(k)`, `finish(frame, {grain, vignette})` |
| `engine/text.ts` | troika: `makeText`, `syncAll`, `textWidth`, `preloadFonts` (SDF + CSS FontFace) |
| `engine/lyric.ts` | `LyricBlock` (lời từng từ trên canvas 2D), `arrive`, `POP`, `GROW`, `WordFx` |
| `engine/ease.ts` | `clamp lerp prog expoOut cubicOut cubicInOut` |
| `engine/rand.ts` | `mulberry32(seed)`, `hash(...xs)` |
| `engine/palette.ts` | `C` (màu), `FONT` (file font), `CSS_FACES`, `CFONT` (tên family cho canvas) |
| `engine/look.ts` | *tuỳ chọn* — `Look` (GTAO tất định + Neutral tonemap + lời tự tương phản), `LyricLayer`, `untone` |
| `engine/clay.ts` | *tuỳ chọn* — `clay(color, opts)`: vật liệu đất sét (noise shader, không phụ thuộc t) |
| `engine/shapes.ts` | *tuỳ chọn* — `slab` (tấm bo góc, UV khớp canvas), `SoftShadow`, `shadowFor`, `CanvasSurface` |
| `timeline.ts` | `sceneLoaders`, `makeTimeline`, `makePortraitTimeline` |
| `main.ts` | preview (audio clock, HUD, phím, thanh tua) + API `window.__mv` cho export |
| `scenes/_sync.ts` | cảnh debug alignment |
| `scenes/stage.ts`, `scenes/studio.ts` | hai cảnh mẫu (xem đầu file) |

## Frame

```ts
interface Frame {
  t, dt          // giây bài hát; 1/fps
  lt, p          // giây từ đầu entry; tiến độ 0..1 trong entry
  start, end     // biên entry
  beat, beatPhase            // chỉ số beat, 0..1 trong beat
  bar, barPhase, beatInBar   // chỉ số ô nhịp từ downbeat đầu, 0..1 trong ô, 0..beatsPerBar-1
  section        // { name, start, end }
  a              // envelope tại t: rms low mid high vocal drums bass (~0..1, chuẩn hoá p99.5)
  line, word, wordIndex      // dòng/từ đang hát (null giữa các dòng)
}
```

`beat`/`bar` trước beat đầu tiên trả index −1 với phase ngoại suy theo `beatPeriod`, nên intro vẫn có nhịp.

## Scene

```ts
abstract class Scene {
  constructor(readonly ctx: SceneCtx)   // { renderer, audio, lyrics, entry, params }
  async init(): Promise<void>           // dựng hết: mesh, texture, text sync, mốc thời gian
  abstract render(f: Frame, target: THREE.WebGLRenderTarget | null): void
  postOpts(t: number): PostOpts | null  // grain/vignette theo t (hoặc params.grain / params.vignette)
  dispose(): void
}
```

- Một instance cho mỗi **entry** (không phải mỗi module): hai entry cùng `scene: 'stage'` là hai instance,
  mỗi cái có `ctx.entry` riêng.
- `render` vẽ vào `target` (linear HalfFloat). Không tự vẽ ra canvas, không đổi `setPixelRatio`/`setSize`.
- Trạng thái renderer dùng chung (vd `shadowMap.enabled`, `autoClear`, clear color): đặt trong `init`
  nếu mọi cảnh chấp nhận được, hoặc set rồi trả lại trong `render`.
- Helper riêng của cảnh: `scenes/<id>-*.ts` — `sceneLoaders` bỏ qua tên có dấu `-`.
  Bảng thời gian dùng chung giữa nhiều hệ (camera, nhân vật, lời) → `scenes/<id>-plan.ts`.

## Timeline

```ts
const sec = (name) => audio.sectionByName(name);                                  // đã snap downbeat
const cut = (needle, nth = 0) => audio.downbeatAtOrBefore(lyrics.find(needle, nth).start);
entries.push({ id: 'phone', scene: 'phone', start: cut('Make a video'), end, params, fadeIn: 0.25 });
```

- `id` duy nhất — hiện trên HUD và trong mã nhận xét `scene <id>, m:ss.ff`.
- Entry phải liền nhau (`entryAt` dùng `start` của entry kế tiếp làm biên).
- `fadeIn: s` — crossfade smoothstep từ entry trước trong `s` giây (cả hai cảnh cùng render). Mặc định cắt cứng
  — cắt cứng đúng downbeat thường hay hơn fade.
- Cắt giữa section: `cut('<lời>')` → downbeat ngay trước từ đầu dòng. Cần muộn hơn một nhịp:
  `audio.beats.find(b => b >= x)`, hoặc `start` của một từ cụ thể (`lyrics.word(line, 'ship').start`).
- `makePortraitTimeline` cho `?portrait`: thường một entry trên một khoảng lặp được (downbeat → downbeat).

## Chuyển cảnh liền mạch (handoff)

Khi cảnh B cần "mọc ra" từ cảnh A (camera A lao vào một vật rồi thành thế giới B), B tự dựng một instance A
bên trong với `params.exitUntil` và render A trong khoảng chuyển:

```ts
// timeline.ts: truyền entry của A cho B
const aE = { id: 'a', scene: 'a', start, end: mid, params };
entries.push(aE, { id: 'b', scene: 'b', start: mid, end, params: { ...params, a: aE } });
// trong B.init()
const aE = this.ctx.params.a as TimelineEntry;
this.a = new A({ ...this.ctx, entry: aE, params: { ...(aE.params ?? {}), exitUntil: T.cut } });
await this.a.init();
// trong B.render()
if (t < T.cut) { this.a.render(f, target); /* hoặc vào rt riêng rồi trộn */ return; }
// trong A.render(): sau end của chính nó, nếu có exitUntil thì chạy cú thoát
if (this.exitUntil && t > T.end) { const k = prog(t, T.end, this.exitUntil); /* camera dive */ }
```

Như vậy entry B bắt đầu đúng downbeat trên timeline, còn cú thoát của A vẫn thuộc code của A.

## Preview (main.ts)

- Đồng hồ: `<audio src="/song.mp3">` (vite phục vụ `../song.mp3`). `t` lấy từ `currentTime` mỗi rAF —
  rAF chỉ dùng để *lấy mẫu*, không quyết định hình.
- Cảnh chưa init xong → khung đó bỏ qua (giữ khung cũ), `prepareAll()` nạp nền.
- HUD: timecode, entry id, section, bar.beat, từ đang hát + conf. Phím:
  `Space` play · `←/→` ±1 s (`Shift` ±5) · `,`/`.` ±1 frame · `[`/`]` đầu entry/entry trước/sau ·
  `L` loop entry · `H` ẩn HUD · `C` copy `scene <id>, m:ss.ff, ` · click canvas = play/pause, kéo thanh tua.
- `?t=72.5` mở tại thời điểm đó, `?hud=0` tắt HUD.
- `?portrait` — khung 1080×1920 + `makePortraitTimeline`. `?export=1` — không HUD, `preserveDrawingBuffer`.

## `window.__mv` (export)

| | |
|---|---|
| `ready` | font + cảnh đầu đã sẵn sàng |
| `duration`, `width`, `height`, `timeline` | thông tin cho render.ts |
| `prepare(from, to)` | init mọi entry giao với [from, to] |
| `still(t)` | render t → `canvas.toDataURL('image/png')` |
| `stream(url, from, to, fps)` | mở WebSocket, với n từ round(from·fps) đến round(to·fps): render t = n/fps, `readPixels` RGBA, gửi; tối đa 4 khung chưa được ack |
