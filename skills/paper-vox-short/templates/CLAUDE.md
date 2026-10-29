# CLAUDE.md — luật làm việc cho YouTube Short "Paper Vox"

Short dọc 1080×1920, thuyết minh tiếng Việt, dựng hoàn toàn bằng code: three.js (TypeScript, Vite).
**`BRIEF.md` là nguồn quyết định** (giọng, tempo, section, màu, phụ đề, ảnh, SFX, checkpoint): làm
theo nó, không hỏi lại những gì brief đã trả lời. Phong cách chi tiết: `TREATMENT.md`.

## 0. An toàn máy (quan trọng)
Mac mini M4 24 GB này đã **tự khởi động lại do GPU treo** (chạy model trên MPS). Vì vậy:
- Model AI (enhance, whisper, căn từ) **chỉ chạy CPU**, dưới `nice -n 10`, cắt đoạn. Không MPS.
- Không bao giờ chạy hai job nặng cùng lúc (render, model AI, nhiều headless Chrome). `make.sh`
  kiểm tra `ps` trước mỗi job nặng; tự chạy tay thì cũng kiểm tra.
- Mọi render/still/cues dùng `--soft` (SwiftShader, chỉ CPU). Render thật luôn sau một clip thử 3 s.
- **Không render video khi chưa được bảo.** Review trong live preview (Vite), không phải bằng mp4.

## 1. Cách làm (để người dùng không phải canh)
- Một session làm hết. Không chia session audio / cảnh.
- Chỉ dừng ở checkpoint trong `BRIEF.md` §7 (mặc định 2: style frame, full preview). Giữa hai
  checkpoint: tự quyết theo brief + TREATMENT, tự kiểm (typecheck, still `--soft` và tự xem PNG),
  ghi lại lựa chọn trong báo cáo thay vì hỏi.
- Thứ tự: `./make.sh setup` → `voice` → `align` → `preview` (mọi section chạy cảnh `example`) →
  dựng cảnh đầu → **checkpoint 1** → dựng **tất cả** cảnh còn lại → `./make.sh sfx` →
  **checkpoint 2** (một lượt nhận xét, sửa hết) → `./make.sh final` khi được bảo.
- Tempo/hold đổi sau khi căn từ: sửa BRIEF rồi `./make.sh voice && ./make.sh align` (căn lại ~1 phút
  CPU) — không retime bằng tay.

## 2. Luật vàng: render tất định
- Mỗi khung hình là **hàm thuần của `t`** (giây từ đầu voice). Preview và render ra cùng pixel.
- Cấm `Math.random`, `Date.now`, `performance.now`, `setTimeout`/`requestAnimationFrame` để quyết
  định hình ảnh. Ngẫu nhiên → `rand.ts` (`mulberry32(seed)`, `hash(...)`), seed cố định.
- Rung stop-motion và pop dùng đồng hồ 12 fps: `Math.floor(t * 12) / 12` (`stepped`).
- Layout trong hệ 1080×1920 cố định, tâm ở giữa, +y lên. Font/ảnh nạp xong trong `init()`.

## 3. Thời gian và cắt cảnh
- Nguồn sự thật: `data/words.json` (thời gian từng từ, từ `./make.sh align`). Không hard-code giây.
- Timeline (`app/src/timeline.ts`) tự sinh: mỗi section của script = một entry, cắt ở giữa khoảng
  lặng trước câu đầu section. Section chạy `scenes/<id>.ts` nếu có, không thì `scenes/example.ts`.
- Trong cảnh: `this.at(câu, từ, nth)` lấy thời điểm từ (so khớp bỏ dấu: rơi/rời/rồi đều "roi" →
  dùng nth); mốc beat = `cutAt(words, 'câu')`. Pop, đập dấu, headline snap vào `start` của từ.
- Phụ đề: `data/captions.json` (`analysis/captions.py`), cụm 2–6 âm tiết, luôn 1 dòng (đo bằng
  `cap_font_widths.json`; đổi cỡ/maxW phụ đề thì đo lại). Luật riêng của video:
  `analysis/caption_rules.json` (`glue`, `numerals`, `break_before`), rồi `./make.sh captions`.
- Sửa thời gian một từ: `data/lyrics.fix.json` rồi `./make.sh align`.

## 4. Cảnh
- Mỗi cảnh kế thừa `BeatScene` (`engine/beats.ts`): vài beat (màu nền + group + `Rig`), beat đặt
  cạnh nhau trên một mặt bàn, camera lướt một take giữa các beat. `this.base(keys)` dựng nền +
  phụ đề (keys = cụm tô bút dạ). Pop: `popCut` cho Cutout, `popObj` cho vật khác.
- Bắt đầu cảnh mới: copy `scenes/example.ts` → `scenes/<id>.ts`. Helper riêng: `<id>-*.ts`.
- SFX tự sinh từ chính các pop/stamp/glide (`engine/cues.ts`); cần thêm thì `cue(kind, t, …)`.
  Kinds: paper, tape, stamp, slap, whoosh, tick, type, cross, fan, hiss, pop.
- Ảnh: `assets/raw/` gốc → `assets/cut/<name>.png` (tách nền) → luôn in halftone (`photoPrint`).

## 5. Khung và vùng an toàn
- 1080×1920, 30 fps. `SAFE` (`engine/scene.ts`): chừa ~250 px đáy và ~200 px phải cho UI Shorts.
  Chữ quan trọng và phụ đề nằm trong SAFE.

## 6. Lệnh (`./make.sh help`)
```
./make.sh setup | voice | align | captions | preview | check | sfx | test [t0] | final
```
- `preview`: Vite ở cổng 5173 (`.claude/launch.json` phải nằm ở **thư mục gốc workspace** của
  session, không phải trong dự án). Sau `sfx` preview phát `final_mix.wav` (make.sh đã touch
  `main.ts` để Vite thấy file mới; nếu vẫn phát voice cũ thì reload).
- `check`: typecheck + still `--soft` ở mốc cắt của từng section → `out/check/*.png`, tự xem.
- Nhận xét của người dùng dạng `scene <id>, m:ss(.ff), vấn đề, đề xuất`; phím `C` trong preview
  copy sẵn `scene <id>, m:ss.ff`. Xử lý và báo lại theo từng mã.

## 7. Cấm
- Không logo/nhãn hiệu thật (tên chỉ là chữ). Ảnh luôn halftone/cắt dán; kiểm tra quyền ảnh.
- Font phải có giấy phép dùng cho video (OFL ổn).
- Không ghi frame PNG hàng loạt ra đĩa — stream thẳng vào ffmpeg.
