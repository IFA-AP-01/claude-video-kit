# Bài học từ video đầu (Tesla Roadster, 2026-10) — ~4 giờ, người dùng phải canh liên tục

## Tốn thời gian ở đâu
| Nguyên nhân | Cách template xử lý |
|---|---|
| Review sau mỗi 1–2 cảnh (~8 lần dừng) | BRIEF §7: 2 checkpoint (style frame, full preview). Dựng hết rồi review một lượt. |
| Đổi tempo 1.1x sau khi đã căn từ và dựng cảnh → retime mọi mốc | Tempo + end hold nằm trong BRIEF, `make.sh voice` áp dụng **trước** `align`. |
| Hai session (audio / cảnh) phải phối hợp | Một session làm hết; `CLAUDE.md` §1. |
| Hỏi lại những điều đã có thể tự quyết (màu, từ khoá tô, vị trí) | BRIEF chốt trước; giữa checkpoint Claude tự quyết, ghi vào báo cáo. |
| Prompt duyệt quyền liên tục | Mọi lệnh gom vào `./make.sh <bước>` → duyệt một lần `Bash(./make.sh:*)`. |
| Render mp4 để xem thử | Review trong live preview; render chỉ ở cuối, khi được bảo. |
| SFX mix quá nhỏ, phải mix lại | `mix.py --sfx-db` mặc định 3 (mức đã duyệt), `SFX_DB` trong BRIEF. |
| End card bị cắt, phải kéo dài voice rồi căn lại | `END_HOLD` (mặc định 1.5 s) thêm vào voice ngay ở bước voice. |

## Bẫy kỹ thuật
- **GPU treo → máy tự khởi động lại**: model chạy MPS. Chỉ CPU, `nice -n 10`, cắt đoạn ≤12 s,
  một job nặng một lúc, render `--soft` (SwiftShader ~4 fps → ~15 phút cho 110 s).
- **Phụ đề xuống 2 dòng**: đếm âm tiết không đủ; `captions.py` đo bằng bề rộng pixel thật
  (`cap_font_widths.json`, Be Vietnam Pro 800 60 px, maxW 730 → MAX_PX 712). Đổi font/cỡ thì đo lại.
- **Cắt cụm từ sai** ("hệ thống | nhận diện"): thêm vào `glue` hoặc `break_before` trong
  `analysis/caption_rules.json`. Từ "dựa" (lean) không được kết thúc cụm — đã có trong LEAN.
- **Số đọc bằng chữ**: TTS đọc "bốn nghìn bảy trăm ki lô gam" → phụ đề phải hiện "4.700 kg"
  (`numerals`), và độ dài cụm tính theo dạng số.
- **Tên tiếng Anh**: aligner chỉ biết a–z; ghi cách TTS đọc vào `config.json` `spoken`
  ("spacex": "spay ex") và tên riêng vào `whisper_prompt`.
- **So khớp từ bỏ dấu**: rơi / rời / rồi đều thành "roi" → `this.at(câu, 'rời', nth)` cần `nth`.
- **Vite không thấy `final_mix.wav` mới**: `import.meta.glob` eager trong `main.ts` bị cache →
  `touch app/src/main.ts` rồi reload (make.sh sfx tự làm).
- **`.claude/launch.json`** phải ở thư mục gốc workspace của session (vd `~/Desktop/idontknow/.claude/`),
  không phải trong thư mục dự án; cấu hình `cwd` trỏ vào `<dự án>/app`.
- **Section tag tiếng Việt**: `pron.py` slug tag thành id → dấu bị nát. `make_lines.py` gập tag sang
  ASCII trước (`[Mở đầu]` → `mo_dau`) và ghi map đồng nhất vào `config.json` `sections`.
- **Ảnh sự kiện ban đêm**: crop tránh watermark, `brightness(1.55) contrast(1.15)` trước halftone.
- **Pop của Cutout**: dùng `popCut` (giữ opacity + cue SFX), không `popObj`.
- **Glide giữa beat**: rời 0.3 s trước câu, đáp 0.55 s sau; pop đầu tiên của beat mới nên rơi
  sau khi đáp để người xem thấy nó xuất hiện.
