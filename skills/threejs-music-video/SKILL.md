---
name: threejs-music-video
description: Dựng music video / lyric video 3D hoàn toàn bằng code với three.js + TypeScript + Vite — mỗi khung hình là hàm thuần của thời gian bài hát, cảnh cắt theo lời và downbeat, chữ nảy theo từng từ, preview có HUD + phím review, xuất video bằng headless Chrome stream thẳng vào ffmpeg (không ghi frame ra đĩa), có bản dọc 9:16. Dùng khi người dùng muốn làm MV/lyric video/visualizer bằng three.js hoặc WebGL, dựng cảnh 3D đồng bộ nhạc, render video tất định từ trình duyệt, hoặc tiếp tục một dự án có app/src/engine + data/audio.json. Cần data/lyrics.json + data/audio.json từ skill lyric-beat-analysis.
---

# three.js music video

Một engine nhỏ: `song.mp3` + `data/{lyrics,audio}.json` → timeline cảnh → mỗi cảnh vẽ khung hình tại `t` →
post (grain/vignette) → canvas 1920×1080. Cùng một code chạy preview (theo `<audio>`) và export (t = n/fps).

## Luật vàng: render tất định

Khung hình tại `t` phải ra **cùng pixel** dù xem preview, tua, hay render, ở bất kỳ fps nào.

- Mọi thứ nhìn thấy là hàm của `Frame` (`t`, beat/bar, envelope, từ đang hát). Cấm `Math.random`,
  `Date.now`, `performance.now`, `setTimeout`/`requestAnimationFrame` để quyết định hình ảnh.
  Ngẫu nhiên → `rand.ts`: `mulberry32(seed)` cho layout lúc `init`, `hash(i, bar)` cho biến thiên theo khung.
- Ưu tiên **công thức đóng** (vị trí = f(t)) hơn mô phỏng. Cần trạng thái tích luỹ → tính lại từ đầu cảnh mỗi
  khung (hoặc fast-forward có cache theo t), để tua ngược vẫn đúng.
- Layout trong hệ toạ độ cố định 1920×1080 (`W`, `H`), không phụ thuộc cửa sổ; `setPixelRatio(1)`.
- Font, texture, layout chữ (troika `sync`) xong trong `init()` — trước khi engine báo `ready`.
- Thư viện bên ngoài có thể lén dùng `Math.random` (vd `GTAOPass` của three) → thay bằng dữ liệu seed.

Chi tiết và các bẫy đã gặp: `references/determinism.md`.

## Khởi tạo dự án mới

```bash
cp -R <skill>/templates/app <project>/app
cp <skill>/templates/{CLAUDE,TREATMENT,NOTICE}.md <project>/   # luật + treatment (điền theo bài) + ghi công MIT
cd <project>/app && npm install
# font: đặt .woff vào app/public/fonts/, khai báo trong src/engine/palette.ts (FONT + CSS_FACES)
npm run dev                                            # preview ở http://localhost:5173
```

- `data/lyrics.json` + `data/audio.json` lấy từ skill `lyric-beat-analysis` (chạy trước).
- Font mặc định của template là `public/fonts/display-800.woff` và `mono-400.woff` (bạn tự cung cấp, ví dụ
  copy từ `@fontsource/<family>/files/*-latin-800-normal.woff`); đổi tên file thì sửa `palette.ts`.
- `.gitignore`: `out/`, `analysis/stems/`, `analysis/work/`, `app/node_modules/`.
- Preview trong Claude desktop: `.claude/launch.json` với `{"name":"mv","runtimeExecutable":"npm",
  "runtimeArgs":["--prefix","app","run","dev"],"port":5173}` rồi `preview_start`.

Bố cục mong đợi (`vite.config.ts` cho phép đọc `..`):

```
<project>/song.mp3  lyrics.txt  data/{lyrics,audio}.json  analysis/  out/(gitignore)
<project>/app/src/engine/     # dùng chung: audio, lyrics, scene, engine, text, post, rand, ease, lyric, palette
<project>/app/src/scenes/     # mỗi cảnh 1 module <id>.ts; helper riêng tên <id>-*.ts (không bị coi là cảnh)
<project>/app/src/timeline.ts # cảnh nào chạy khi nào
<project>/app/scripts/render.ts
```

Template đã chạy được ngay: các section `chorus*` luân phiên hai cảnh mẫu — `stage.ts` (khối instanced thở
theo bass, punch mỗi downbeat, camera theo keyframe, lời trên plane gắn camera) và `studio.ts` (đất sét, bóng
VSM, GTAO, lời tự đổi mực/giấy theo nền) — còn lại → `_sync.ts` (cảnh debug: lời sáng theo từng từ, từ conf
thấp màu đỏ, chấm beat, timecode in lên hình). Module tuỳ chọn: `engine/look.ts`, `clay.ts`, `shapes.ts`. **Bước đầu tiên luôn là xem `_sync`
trên cả bài** để chắc timing đúng trước khi dựng cảnh thật.

## Viết một cảnh

```ts
export default class MyScene extends Scene {
  async init() { /* dựng mesh, seed layout, makeText + syncAll, tính mốc T từ lời */ }
  render(f: Frame, target: THREE.WebGLRenderTarget | null) {
    // chỉ đọc f (+ dữ liệu dựng sẵn ở init), set transform/uniform, rồi:
    this.ctx.renderer.setRenderTarget(target);
    this.ctx.renderer.render(this.scene, this.cam);
  }
}
```

- `Frame`: `t, lt, p` (0..1 trong entry), `beat, beatPhase, bar, barPhase, beatInBar, section`,
  `a` (envelope `rms low mid high vocal drums bass`), `line, word, wordIndex`.
- Mốc trong cảnh tính từ **từ trong lời**: `lyrics.word(lyrics.find('Make a video'), 'video').start`,
  rồi snap: `audio.downbeatAtOrBefore`, `audio.beats.find(b => b >= x)`. Gom vào `this.T` trong `init`.
- Cảnh trong `timeline.ts`: `{ id, scene, start, end, params, fadeIn? }`, với `sec('chorus1')`,
  `cut('Make a video')`. Không hard-code giây.
- Chữ: troika `Text` cho chữ 3D (tạo + `sync` hết trong `init`, **không đổi `.text` trong render**), hoặc
  canvas 2D → `CanvasTexture` cho chữ UI/lời (vẽ lại mỗi khung là tất định; `LyricBlock` đo layout một lần).

Kỹ thuật dựng (camera theo keyframe, beat punch, lời nảy theo từ, chuyển cảnh liền mạch, look đất sét,
chữ tự đổi màu theo nền, chữ 3D đùn...): `references/scene-craft.md`.
Kiến trúc engine và API: `references/engine.md`.

## Preview, still, render

```bash
npm run dev                                   # Space play · ←/→ ±1s · ,/. ±1 frame · [ ] cảnh · L loop · H HUD · C copy
npm run still -- --t 36.5,48,72.25            # PNG vào ../out/, một trình duyệt cho nhiều t
npm run render -- --from 30 --to 45           # đoạn; bỏ trống = cả bài → ../out/mv.mp4
npm run render -- --portrait                  # bản dọc 1080×1920 (makePortraitTimeline)
```

Export: Vite + headless Chrome (GPU) render `t = n/fps`, `readPixels` → WebSocket → `ffmpeg` stdin (rawvideo,
`vflip`), ghép audio cắt đúng frame, x264 CRF 16 + AAC 320k. Không ghi frame nào ra đĩa.
Chi tiết, tuỳ chọn và xử lý sự cố: `references/render.md`.

## Quy trình làm việc với người dùng

1. Treatment trước (ý tưởng, bảng màu, font, bảng cảnh theo lời) → `TREATMENT.md`. Luật → `CLAUDE.md`.
2. Phase 1: chạy analysis, xem `_sync` cả bài, sửa lời lệch (skill `lyric-beat-analysis`).
3. Mỗi lượt chỉ làm **1–2 cảnh**, rồi dừng cho người dùng review.
4. Trước khi báo xong: `npm run typecheck`, render still ở vài thời điểm then chốt (mốc cắt, từ khoá, cuối cảnh)
   và **tự xem PNG** bằng Read; với chuyển động nhanh, render một đoạn ngắn và xem vài khung.
5. Nhận xét dạng `scene <id>, m:ss.ff, <vấn đề>, <đề xuất>` (phím `C` copy sẵn `scene <id>, m:ss.ff, `).
   Xử lý từng nhận xét riêng, báo lại theo đúng mã đó.
6. Sửa engine (`src/engine/`) ảnh hưởng mọi cảnh → làm cẩn thận, nói rõ trong báo cáo, render lại still của các
   cảnh khác.

## Không làm

- Không ghi PNG hàng loạt ra đĩa để ghép video — stream vào ffmpeg.
- Không dùng logo/nhãn hiệu thật trong hình (tên giả, giao diện giả) nếu không được phép.
- Không copy cảnh/motif/font/bảng màu của dự án tham khảo; kỹ thuật MIT thì được dùng, giữ ghi công trong
  `NOTICE.md`.
