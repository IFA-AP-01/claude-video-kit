# CLAUDE.md — luật làm việc cho music video "<TÊN BÀI>"

Video dựng hoàn toàn bằng code: three.js (TypeScript, Vite) + phân tích âm thanh bằng Python.
Ý tưởng, style, bảng cảnh: xem `TREATMENT.md`. Đây là file luật; TREATMENT là file thẩm mỹ.

## 1. Luật vàng: render tất định
- Mỗi khung hình là **hàm thuần của thời gian bài hát `t`** (giây, tính từ đầu `song.mp3`).
  Preview và bản render phải ra pixel giống nhau ở cùng một `t`.
- Cấm dùng `Math.random`, `Date.now`, `performance.now`, `setTimeout`/`requestAnimationFrame`
  để quyết định hình ảnh. Ngẫu nhiên → `rand.ts` (`mulberry32(seed)`, `hash(...)`), seed cố định.
- Cảnh có trạng thái phải tái tạo được khi tua: tính lại từ đầu cảnh. Ưu tiên công thức đóng hơn mô phỏng.
- Không phụ thuộc kích thước cửa sổ: mọi layout tính trong hệ toạ độ 1920×1080 cố định (dọc: 1080×1920).
- Font/glyph/texture phải nạp xong trong `init()` trước khi engine báo `ready`.

## 2. Thời gian và cắt cảnh
- Nguồn sự thật: `data/lyrics.json` (từng từ) và `data/audio.json` (beat, downbeat, section, envelope).
  Không dùng con số bpm ghi ở nơi khác.
- Mốc cảnh **suy ra từ lời/section** (`cut('...')`, `sec('chorus1')`) trong `app/src/timeline.ts`,
  không hard-code giây. Cắt cảnh snap vào downbeat.
- Hiệu ứng nhấn (punch, flash, nén chữ) snap vào beat/downbeat hoặc vào `start` của từ tương ứng.
- Sai lệch lời → sửa trong `data/lyrics.fix.json` rồi chạy lại `analysis/align.py`, không sửa tay `lyrics.json`.

## 3. Cấu trúc
- `analysis/` — pipeline Python (uv): `separate → whisper_run → align → analyze → qa`.
- `app/src/engine/` — engine dùng chung. Thay đổi engine ảnh hưởng mọi cảnh: làm cẩn thận, nói rõ trong báo cáo.
- `app/src/scenes/<id>.ts` — mỗi cảnh một module; helper riêng của cảnh đặt tên `<id>-*.ts`.
- `app/scripts/render.ts` — xuất video (headless Chrome → ffmpeg, stream, không ghi frame ra đĩa).

## 4. Quy trình review
- Mỗi lượt chỉ làm **1–2 cảnh**, rồi dừng để người dùng review.
- Trước khi báo xong: `npm run typecheck`, render still ở vài thời điểm then chốt
  (`npm run still -- --t 72.5,80`) và tự xem PNG.
- Nhận xét của người dùng có dạng: `scene <id>, m:ss(.ff), <vấn đề>, <đề xuất>`.
  Phím `C` trong preview copy sẵn phần `scene <id>, m:ss.ff`.
- Xử lý từng nhận xét riêng, báo lại theo đúng mã nhận xét đó.

## 5. Cấm
- Không thêm logo/nhãn hiệu thật (dùng tên giả, giao diện giả) trừ khi có quyền.
- Font phải có giấy phép dùng cho video (OFL ổn).
- Không ghi frame PNG hàng loạt ra đĩa — stream thẳng vào ffmpeg.
- Không commit `analysis/stems`, `analysis/work`, `out/`, `node_modules/`.
