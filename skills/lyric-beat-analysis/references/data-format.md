# Định dạng output

Tất cả thời gian: giây trong `song.mp3`, làm tròn 3 chữ số.

## `data/lyrics.json`

```jsonc
{
  "lines": [
    {
      "i": 0,                       // chỉ số dòng toàn bài (key của lyrics.fix.json)
      "section": "verse1",          // id section từ tag trong lyrics.txt
      "text": "Wake up, open the chat at nine",
      "start": 0.695, "end": 3.46,  // = start từ đầu, end từ cuối
      "words": [
        { "w": "Wake", "start": 0.695, "end": 0.93, "conf": 0.483, "wd": -0.595 },
        { "w": "up,",  "start": 0.94,  "end": 1.1,  "conf": 0.961, "wd": 0.08 }
      ]
    }
  ],
  "sections": [ { "name": "verse1", "start": 0.695, "end": 15.2 } ],  // theo từ hát (chưa snap)
  "extras": [ { "start": 98.1, "end": 99.0, "text": "yeah yeah" } ],   // whisper nghe thấy, lời không có
  "whisper_bias": -0.1,
  "realigned": [29, 30, 31],
  "notes": "..."
}
```

- `w` là *từ hiển thị*, giữ nguyên dấu câu (`"up,"`) — để vẽ chữ. So khớp từ trong code nên bỏ dấu câu.
- `conf < 0.6` = nên nghe lại. Từ đã sửa tay có `conf = 1`.
- `wd` = (start theo whisper − bias) − start. Chỉ có ở từ whisper khớp được.
- Từ chỉ có dấu câu (không token) nhận `start = end` = end của từ trước.

## `data/audio.json`

```jsonc
{
  "duration": 183.16,
  "bpm": 117.495, "beat_period": 0.51066, "time_signature": 4,
  "grid_jitter": 0.027,             // độ lệch chuẩn beat thật so với lưới fit (s)
  "downbeat_phase": 3,
  "beats":     [0.236, 0.747, ...], // lưới tempo hằng, phủ cả bài
  "downbeats": [1.768, 3.811, ...], // beats[phase::time_signature]
  "sections": [                     // ĐÃ snap downbeat/phrase, liền nhau, phủ [0, duration]
    { "name": "verse1", "start": 0.0, "end": 16.067 },
    { "name": "pre1", "start": 16.067, "end": 32.408 },
    { "name": "chorus1_post", "start": 56.919, "end": 60.0 }   // nhạc không lời sau chorus1
  ],
  "fps": 100,
  "env": {                          // mỗi mảng dài ceil(duration*100), ~0..1 (p99.5 = 1)
    "rms": [...], "low": [...], "mid": [...], "high": [...],
    "vocal": [...], "drums": [...], "bass": [...]
  },
  "onsets": {                       // [time, strength 0..1]
    "kick": [[0.24, 0.91], ...], "snare": [...], "vocal": [...]
  }
}
```

Dải tần envelope: `low` 20–180 Hz, `mid` 180–2500 Hz, `high` 2.5–11 kHz (trên bản mix);
`vocal/drums/bass` = RMS của stem. Onset: kick ≤ 150 Hz, snare 1.5–6 kHz (trên stem drums).

Section trong `audio.json` là cái dùng để cắt cảnh. Section trong `lyrics.json` chỉ là khoảng có lời.

## `data/lyrics.fix.json`

```json
{
  "_help": "word: \"<line>.<word>\" (0-based, xem qa_report.md) -> {start, end}. shift_line: \"<line>\" -> giây dời cả dòng.",
  "word": { "12.3": { "start": 41.52, "end": 41.80 } },
  "shift_line": { "30": -0.12 }
}
```

`shift_line` áp trước, `word` áp sau. Có thể đặt thêm field khác vào một từ (vd `"w"` để đổi chữ hiển thị).

## `analysis/work/` (cache, không commit)

| file | xoá khi |
|---|---|
| `stem_offset.json`, `../stems/*.wav` | đổi `song.mp3` |
| `whisper.json` | đổi mp3, `language`, `whisper_prompt` |
| `emission_mms.npy` | đổi mp3 (không phụ thuộc lời) |
| `analyze_debug.json`, `qa_*.png` | tự ghi đè mỗi lần chạy |
