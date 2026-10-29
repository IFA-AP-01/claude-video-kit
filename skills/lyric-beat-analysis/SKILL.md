---
name: lyric-beat-analysis
description: Phân tích một bài hát (mp3 + lời) thành dữ liệu thời gian cho video lyric/music video — tách stem (Demucs), căn lời từng từ (MMS_FA forced alignment + Whisper cross-check), lưới beat/downbeat, section snap vào phrase, envelope và onset theo 100 fps, kèm QA report. Dùng khi người dùng muốn làm lyric video, karaoke, beat-sync, "analyze beat", căn lời theo nhạc, lấy timestamp từng từ, hay chuẩn bị data/lyrics.json + data/audio.json cho một video dựng bằng code (xem skill threejs-music-video).
---

# Lyric + beat analysis

Biến `song.mp3` + `lyrics.txt` thành hai file JSON mà video đọc như "nguồn sự thật" về thời gian:

- `data/lyrics.json` — từng dòng, từng từ: `start`, `end`, `conf` (0..1), section.
- `data/audio.json` — `bpm`, `beats`, `downbeats`, `sections` (đã snap downbeat), envelope 100 fps (`rms low mid high vocal drums bass`), onset (`kick snare vocal`).
- `data/qa_report.md` + `analysis/work/qa_<section>.png` — chỗ cần nghe lại.

Mọi thời gian tính bằng **giây trong `song.mp3`** (không phải trong stem, không phải trong video).
Định dạng chi tiết: `references/data-format.md`.

## Cài vào dự án

```
<project>/
  song.mp3          # bản mix cuối
  lyrics.txt        # lời có tag [Verse 1], [Chorus], [Bridge]...
  analysis/         # ← copy toàn bộ scripts/ của skill này vào đây
  data/             # output
```

```bash
cp -R <skill>/scripts/ <project>/analysis/
cd <project>/analysis && uv sync          # Python 3.12, torch/torchaudio < 2.9
./run_all.sh                              # separate → whisper_run → align → analyze → qa
```

Thêm `analysis/stems/`, `analysis/work/`, `analysis/.venv/` vào `.gitignore` (stem nặng hàng trăm MB).
Cần `ffmpeg` trong PATH (librosa/demucs đọc mp3).

Tuỳ chỉnh theo bài trong `analysis/config.json` (tất cả đều tuỳ chọn):

```json
{
  "language": "en",
  "whisper_prompt": "Lyrics about AI coding: prompt, merge, push to prod, invoice, API, tokens.",
  "spoken": { "climbing": "climb the", "gpt": "g p t", "2026": "twenty twenty six" },
  "sections": { "Hook": "chorus", "Rap": "verse" },
  "beats_per_bar": 4
}
```

## Pipeline — mỗi bước làm gì, và vì sao

1. **`separate.py`** — Demucs `htdemucs_ft` → `stems/{vocals,drums,bass,other}.wav`. Đo lệch giữa stem và
   mp3 bằng cross-correlation (decoder mp3 thêm padding vài chục ms); mọi bước sau gọi `load_stem()` để đã
   được dời về giờ của `song.mp3`. **Đừng bỏ bước đo offset** — lệch 20–50 ms là thấy rõ khi chữ nảy theo từ.
2. **`whisper_run.py`** — Whisper large-v3-turbo trên stem vocal, có word timestamp. Chỉ dùng để *đối chiếu*,
   không dùng làm timing chính (whisper hay sớm một khoảng gần như hằng số và đoán bừa ở điệp khúc dày).
   `whisper_prompt` = từ vựng lạ trong bài (tên riêng, thuật ngữ) để whisper nghe đúng.
3. **`align.py`** — căn lời:
   - CTC emission của `torchaudio.pipelines.MMS_FA` trên vocal (chunk 20 s, có 3 s ngữ cảnh mỗi bên).
   - **Một lần Viterbi toàn bài**, token `<star>` chèn giữa các dòng để "nuốt" intro, khoảng nghỉ, ad-lib.
   - So với whisper: đo `bias` (median lệch), dòng nào lệch > 0.35 s thì căn lại trong cửa sổ whisper gợi ý;
     nếu CTC vẫn yếu (điệp khúc chồng giọng) thì lấy timing whisper đã trừ bias, nội suy từ thiếu.
   - Tinh chỉnh: `start` snap vào onset vocal trong ±40 ms; `end` kéo dài theo RMS khi ngân (≤ 2 s, không
     đè từ sau).
   - `conf` = 75% độ khớp whisper + 25% posterior CTC. Whisper nghe thấy mà lời không có → `extras`.
   - Cuối cùng áp `data/lyrics.fix.json` (sửa tay).
4. **`analyze.py`** — beat & cấu trúc:
   - Tempo từ librosa trên `drums + 0.5·bass`, rồi **fit lưới tempo hằng** bằng least squares (nhạc Suno/
     DAW giữ tempo cố định; lưới fit ổn định hơn beat tracker từng nhịp). `grid_jitter` báo độ lệch.
   - Pha downbeat: chọn pha có chroma flux (đổi hợp âm) cao và snare (phách 2, 4) thấp.
   - Section lấy từ **tag trong lời**, không lấy từ novelty: mỗi section bắt đầu ở ranh giới phrase 4 ô nhịp
     gần từ hát đầu tiên (cho phép pickup hát sớm ≤ 2.5 phách). Khoảng nhạc không lời giữa hai section →
     `<tên>_post`; trước câu đầu → `intro`; sau câu cuối → `end`. Novelty của librosa chỉ để so trong QA.
   - Envelope 100 fps chuẩn hoá theo percentile 99.5 (~0..1, có thể > 1 ở đỉnh); onset theo dải tần.
5. **`qa.py`** — `data/qa_report.md`: bảng section (bars, pickup), danh sách từ `conf < 0.6` với key
   `line.word`, các đoạn hát ngoài lời, timing từng dòng; và ảnh waveform + beat + từ cho từng section.

## Vòng sửa lỗi

1. Đọc `data/qa_report.md`. Mở `analysis/work/qa_<section>.png` (Read tool xem được PNG) — từ đỏ = conf thấp.
2. Nghe đúng chỗ (preview của video, hoặc `ffplay -ss 72.4 -t 3 song.mp3`).
3. Sửa trong `data/lyrics.fix.json`, **không sửa tay `lyrics.json`**:
   ```json
   { "word": { "12.3": { "start": 41.52, "end": 41.80 } },
     "shift_line": { "30": -0.12 } }
   ```
   Key `"<line>.<word>"` 0-based, đúng như cột `key` trong QA report. Từ đã sửa có `conf = 1`.
4. Nếu sai do *cách hát* khác lời (Suno hát "climb the" thay vì "climbing", đọc "AI" thành "a i") → thêm vào
   `config.json → spoken`, vì cách đó sửa được cả CTC lẫn so khớp whisper.
5. `uv run python align.py && uv run python analyze.py && uv run python qa.py` (stem/emission/whisper đã cache).

Sự cố thường gặp và cách xử lý: `references/troubleshooting.md`.

## Dùng dữ liệu trong video

- Cắt cảnh theo **lời/section**, không hard-code giây: `cut('Wake up')` = downbeat tại/trước từ đầu dòng đó;
  `sec('chorus1')` = section đã snap. Khi lời được căn lại, mọi mốc tự đi theo.
- Hiệu ứng nhấn snap vào `beats`/`downbeats` hoặc `start` của từ; độ lớn chuyển động lấy từ `env` (nội suy
  tuyến tính giữa hai mẫu 10 ms). Không dùng bpm ghi trong prompt Suno — dùng `audio.json`.
- Lookup thuần theo `t` (binary search) — xem `templates/app/src/engine/audio.ts` và `lyrics.ts` trong skill
  `threejs-music-video`.

## Giới hạn đã biết

- Giả định tempo hằng và nhịp đều (`beats_per_bar`, mặc định 4). Bài đổi tempo/rubato: bỏ `fit_grid`, dùng
  thẳng `beats_raw`, và kiểm tra kỹ downbeat trong QA.
- MMS_FA chỉ có a–z và `'`: dấu tiếng Việt/Pháp... được bỏ dấu tự động (`pron.ascii_fold`), số và viết tắt
  phải có trong `spoken`. Ngôn ngữ không phải chữ Latin cần romanize trước (uroman) — chưa hỗ trợ sẵn.
- Rap rất nhanh hoặc nhiều lớp giọng: conf sẽ thấp hàng loạt; ưu tiên sửa theo dòng (`shift_line`).
