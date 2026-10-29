# Sự cố thường gặp

## Cả bài lệch đều vài chục ms
- Kiểm tra `stem offset vs mix` lúc chạy `separate.py`. Nếu đổi mp3 mà không xoá `work/stem_offset.json`
  và `stems/`, offset cũ vẫn được dùng.
- Trong video: preview lấy giờ từ `<audio>.currentTime` — trình duyệt có độ trễ output; đánh giá sync trên
  bản render (ffmpeg ghép đúng sample) chứ đừng chỉ tin preview.

## Một dòng bị kéo sang dòng khác / cả đoạn trượt
- Điệp khúc lặp lại y hệt: Viterbi toàn bài có thể "đổi chỗ" hai lần lặp. Dấu hiệu: `realigned` có dòng đó,
  `wd` lớn đồng loạt. Sửa nhanh bằng `shift_line`, hoặc bổ sung `whisper_prompt` để whisper nghe chuẩn hơn
  (pass 2 dựa vào whisper để đặt cửa sổ).
- Lời trong `lyrics.txt` thiếu một dòng mà ca sĩ có hát (Suno hay lặp câu cuối): thêm dòng đó vào lời;
  `extras` trong QA report liệt kê các đoạn hát ngoài lời.

## Nhiều từ conf thấp trong một section
- Giọng chồng / harmony dày → CTC yếu. Script đã tự rơi về whisper cho dòng lệch, nhưng conf bị chặn ≤ 0.55
  để nhắc nghe lại. Nghe rồi sửa bằng `word`/`shift_line`.
- Từ viết khác cách hát: số, viết tắt, từ bị nuốt âm → thêm `spoken`.

## Beat / downbeat sai
- `grid_jitter` > ~40 ms: tempo có thể không hằng (nhạc thu live, rubato). Xem `work/analyze_debug.json`
  (`librosa_tempo`, `phase_scores`).
- Tempo gấp đôi/nửa: librosa chọn sai octave. So `bpm` với cảm nhận; có thể chia/nhân period rồi fit lại
  (thêm `start_bpm=` cho `beat_track`).
- Downbeat lệch 1–2 phách (cảnh cắt "hụt chân"): xem `phase_scores` — nếu hai pha gần điểm nhau, chọn tay
  bằng cách ép `phase` trong `analyze.py` và ghi chú lý do.
- Nhịp 3/4, 6/8: đặt `beats_per_bar` trong `config.json`.

## Section start lệch một ô nhịp
- QA report đánh dấu `⚠ ... does not sit on a 4-bar phrase` — section đó rơi về downbeat gần nhất.
- Cột `pickup` dương lớn (> 2.5 phách): câu hát vào sớm — hợp lệ với pop, section vẫn snap về phrase.
- Muốn cảnh cắt khác section âm nhạc: làm ở tầng timeline của video (`cut('…')`), đừng sửa `audio.json`.

## Cài đặt
- `torchaudio` ≥ 2.9 bỏ `forced_align`/`MMS_FA` → giữ `<2.9` như `pyproject.toml`.
- Demucs trên `mps` lỗi bộ nhớ → `"device": "cpu"` trong `config.json` (chậm hơn, ~vài phút/bài).
- `mlx-whisper` chỉ chạy Apple Silicon; máy khác dùng `openai-whisper` (pyproject đã chọn theo nền tảng).
