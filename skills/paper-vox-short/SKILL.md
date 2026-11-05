---
name: paper-vox-short
description: Làm YouTube Short dọc 9:16 kiểu "Paper Vox" (giấy cắt dán, halftone, con dấu, băng dính, stop-motion 12 fps, camera lướt một take) từ một file giọng thuyết minh tiếng Việt + kịch bản, dựng hoàn toàn bằng code three.js tất định. Pipeline trọn gói: master giọng (AI mở rộng dải tần tuỳ chọn, CPU) → tempo → căn từng từ → phụ đề cụm 1 dòng → cảnh theo section → SFX giấy tự tổng hợp + mix -14 LUFS → render headless Chrome --soft. Dùng khi người dùng muốn làm video Short/Reels giải thích tin tức bằng voice + script, "làm video như Tesla Roadster", "paper vox", hoặc tiếp tục một dự án có BRIEF.md + make.sh.
---

# Paper Vox Short

Đầu vào: `voice` (TTS hoặc bản thu) + `script.txt` (+ ảnh tuỳ chọn). Đầu ra: `out/short.mp4`
1080×1920 30 fps, -14 LUFS. Video mẫu đầu tiên: `~/Desktop/idontknow/tesla roadster/` (110 s).

**Mục tiêu của skill: người dùng không phải canh.** Video đầu mất ~4 giờ vì review sau từng cảnh,
đổi tempo muộn và hai session phối hợp (`references/lessons.md`). Ở đây: chốt hết trong `BRIEF.md`,
một session, 2 checkpoint, mọi lệnh qua `./make.sh`.

## Quy trình

1. **Scaffold** (không cài gì, không chạy model):
   ```bash
   skills/paper-vox-short/scripts/new_short.sh "<thư mục dự án>" <voice> <script.txt> [ảnh ...]
   ```
2. **Brief**: cùng người dùng điền `BRIEF.md` một lần (hỏi gộp một lượt, chỉ những gì chưa suy ra
   được; mặc định đã là các giá trị đã duyệt ở video đầu). Đề xuất section + màu từ kịch bản.
   Đặt `[Tag]` section vào `script.txt` nếu người dùng đồng ý (không thì mỗi đoạn = 1 section).
3. **Chạy**: `./make.sh setup` → `./make.sh voice` → `./make.sh align`. Có bản đọc lại đoạn lỗi
   (voice 2, 3…)? Trước `voice`: `analysis/.venv/bin/python audio/transcribe.py <file> <json>` cho từng
   file (CPU), so với script để tìm mốc, rồi `audio/.venv/bin/python audio/splice.py voice.mp3 --cut <s>
   --takes voice2.mp3 …` → `voice_fixed.wav`, đặt `VOICE=voice_fixed.wav` (câu voice không đọc thì bỏ khỏi
   script). Nhạc nền: `MUSIC`/`MUSIC_DB` trong BRIEF, `make.sh sfx` tự trộn (duck dưới giọng). Đọc `data/qa_report.md`, sửa
   `spoken`/`whisper_prompt`/`caption_rules.json` nếu cần, chạy lại `align`/`captions`.
4. **Preview**: thêm cấu hình vào `.claude/launch.json` ở **gốc workspace** (new_short.sh in sẵn dòng
   này), `preview_start`. Mọi section đang chạy `scenes/example.ts` → kiểm nhịp, phụ đề, camera.
5. Dựng cảnh section đầu (`cp scenes/example.ts scenes/<id>.ts` rồi viết theo TREATMENT) →
   `./make.sh check` → **checkpoint 1: style frame**.
6. Dựng **tất cả** cảnh còn lại liền một mạch (tự kiểm bằng `check`, không dừng hỏi) →
   `./make.sh sfx` → **checkpoint 2: full preview**, nhận một lượt nhận xét, sửa hết.
7. `./make.sh final` **chỉ khi người dùng bảo xuất** (3 s test trước, rồi full `--soft`, ~15 phút
   cho 110 s), kiểm ffprobe + loudness.

Xin quyền một lần cho `Bash(./make.sh:*)` để không bị prompt từng lệnh.

## An toàn máy (bắt buộc)
Mac mini M4 đã tự khởi động lại vì GPU treo. Model chỉ chạy **CPU**, `nice -n 10`, cắt đoạn; **một
job nặng một lúc** (`make.sh` tự kiểm `pgrep`); render/still/cues luôn `--soft`; thử 3 s trước bản dài;
**không render video khi chưa được bảo** — review trong live preview.

## Thành phần
```
templates/
  BRIEF.md TREATMENT.md CLAUDE.md NOTICE.md make.sh
  app/        engine three.js (paper, cutout, halftone, headline, stamp, tape, clipping, caption,
              parallax/Rig, beats/BeatScene, cues), timeline.ts tự sinh theo section,
              scenes/example.ts (cảnh chung đọc lời thoại), scripts/render.ts (--soft/still/cues)
  audio/      enhance.py (Resemble Enhance, CPU, chunk) · defry.py (vocal-fry repair: Praat detect +
              Praat overlap-add, deep tails softened, DEFRY in BRIEF, A/B in out/ab/defry_*.wav) · declick.py (TTS vocoder
              clicks, >3 kHz only, DECLICK) · light_master.py (loudness only, MASTER=light) · master.py (EQ ấm, de-harsh, de-ess,
              loudnorm, đệm 0.25 s) · tempo.py (atempo + end hold) · sfx.py (11 loại SFX giấy
              tổng hợp numpy) · mix.py (duck 5 dB dưới giọng, -14 LUFS, --sfx-db mặc định 3, --music/--music-db nhạc nền) ·
              splice.py + transcribe.py (ghép bản đọc lại vào voice chính)
  analysis/   make_lines.py (script → lines.txt, tag → id ASCII) · whisper_run/align/qa (MMS CTC +
              Whisper, CPU) · captions.py (cụm 2–6 âm tiết, đo pixel, 1 dòng) + caption_rules.json ·
              retime.py (chỉ khi đổi tempo sau khi căn)
scripts/new_short.sh
references/lessons.md       bẫy đã gặp + chỗ tốn thời gian
references/example-scene.ts một cảnh thật 2 beat (Headline, Stamp, Tape, clipping, photoPrint, cue)
```

Luật dựng cảnh, timing, vùng an toàn: `templates/CLAUDE.md` (được copy vào dự án). Phong cách:
`templates/TREATMENT.md`. Engine gốc và render tất định: skill `threejs-music-video`; căn từ:
skill `lyric-beat-analysis`.
