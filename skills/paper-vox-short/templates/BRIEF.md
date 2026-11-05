# BRIEF — <tên video>

Điền **một lần trước khi bắt đầu**. Mọi quyết định ở đây coi như đã chốt: Claude làm hết từ đầu đến
cuối theo brief, chỉ dừng ở các checkpoint ghi ở mục 7. Muốn đổi gì giữa chừng thì sửa brief rồi nói
"brief đổi mục X", vì đổi muộn (nhất là tempo) là thứ tốn thời gian nhất.

## 1. Thông số (make.sh đọc khối này, giữ đúng dạng KEY=value)
```ini
VOICE=voice.mp3        # file giọng gốc trong thư mục dự án
SCRIPT=script.txt      # kịch bản; [Tag] trên dòng riêng = section (xem mục 3)
ENHANCE=auto           # auto | yes | no — AI mở rộng dải tần (Resemble Enhance, CPU, ~1 GB model);
                       # auto = yes khi giọng gốc < 44.1 kHz (TTS 24 kHz), no khi đã là bản thu tốt
TEMPO=1.0              # tốc độ giọng (1.1 = nhanh 10%), áp dụng TRƯỚC khi căn từ
END_HOLD=1.5           # giây giữ end card sau từ cuối
MASTER=light           # light = loudness only (default, keeps the original read) | full = master.py EQ chain
WARMTH=0               # 0 transparent corrective master (bounded 4 dB) | 1 | 2 darker (muffled on TTS, listen-check first)
DEFRY=1                # vocal-fry repair (Praat PSOLA in fry regions + deep tails softened); 0 off
DECLICK=1              # targeted vocoder-click repair above 3 kHz (Gemini TTS ~80 clicks/min); 0 off
LOUDNESS=-14           # LUFS
SFX_DB=3               # cả bus SFX, dB (+3 = mức đã duyệt; -3 nhỏ hơn)
MUSIC=                 # nhạc nền (vd audio/music.mp3); trống = không nhạc
MUSIC_DB=-20           # nhạc so với giọng khi đang nói, dB (-20 = "lồng nhỏ"); lên 6 dB ở chỗ nghỉ
```

## 2. Nội dung
- Chủ đề / góc kể (1–2 câu):
- Giọng điệu: tò mò, giải thích kiểu Vox (câu hỏi lớn → bằng chứng → cơ chế → bối cảnh → lưu ý)
- Độ dài ước tính: (Shorts ≤ 3 phút)

## 3. Section và bảng màu
Mỗi section là một cảnh (`app/src/scenes/<id>.ts`). Trong `script.txt` đặt `[Tag]` trên một dòng
riêng trước đoạn của nó; tag được đổi sang id ASCII (`[Mở đầu]` → `mo_dau`). Không có tag thì mỗi
đoạn văn là một section `s1, s2…`. Màu beat lấy từ `C` trong `engine/palette.ts`:
red, blue, yellow, teal, orange, green (giấy `paper`, mực `ink`).

| id | câu mở đầu section | màu các beat | hình chính / ý tưởng |
|---|---|---|---|
| mo_dau | "…" | red → yellow | |
| | | | |

## 4. Phụ đề
- Cụm 2–6 âm tiết, 1 dòng, Be Vietnam Pro 800 60 px (đã đo: không bao giờ xuống 2 dòng).
- Cụm từ phải đi liền (tên riêng, thuật ngữ) → `analysis/caption_rules.json` `glue`:
- Số đọc bằng chữ → hiện bằng số → `numerals` (vd `["bốn nghìn bảy trăm ki lô gam", "4.700 kg"]`):
- Tên tiếng Anh TTS đọc khác chữ viết → `analysis/config.json` `spoken` (vd `"spacex": "spay ex"`) và
  `whisper_prompt` (liệt kê các tên riêng):
- Từ khoá tô bút dạ vàng (mỗi câu tối đa 1): Claude tự chọn, trừ khi ghi ở đây.

## 5. Ảnh / tư liệu có sẵn
Đặt trong `assets/raw/`. Claude tự tách nền (`assets/cut/*.png`) và in halftone; thiếu ảnh thì vẽ
hình giấy tự tạo (không logo, không livery thật).

| file | là gì | dùng ở section | ghi chú quyền ảnh |
|---|---|---|---|
| | | | |

## 6. Cấm / lưu ý
- Không logo, nhãn hiệu thật (tên chỉ xuất hiện dạng chữ).
- Ảnh luôn halftone / cắt dán. Font OFL.
- Khác:

## 7. Checkpoint (mặc định 2 — chỉ dừng ở đây)
1. **Style frame**: 1 cảnh đầu đã dựng xong, xem trong live preview → duyệt màu, chất liệu, nhịp pop.
2. **Full preview**: dựng hết mọi cảnh + SFX mix, xem toàn bộ trong live preview, gửi một lượt nhận xét
   dạng `scene <id>, m:ss.ff, vấn đề, đề xuất` (phím `C` trong preview copy sẵn mốc).
Sau checkpoint 2: sửa theo nhận xét → `./make.sh final` (chỉ khi được bảo xuất).
Giọng: nghe bản master một lần ở đầu (`out/ab/`) chỉ khi ENHANCE=yes hoặc giọng mới lạ — ghi `skip` để bỏ: ___
