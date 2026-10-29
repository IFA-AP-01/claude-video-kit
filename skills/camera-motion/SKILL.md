---
name: camera-motion
description: Biên đạo chuyển động máy quay và chuyển cảnh one-shot cho music video dựng bằng three.js (timeline theo lời + beat) — chia máy quay thành "cú" snap theo beat, đường cong tốc độ hình chuông, lấy đà / vượt đích / rung va chạm dạng công thức đóng, và các kiểu nối cảnh liền máy (lùi qua khung, lưới cửa sổ, đẩy vào vật → lóa → kéo ra, dissolve mặt nạ nhiễu, tường đổ). Dùng skill này mỗi khi dựng hoặc sửa camera của một cảnh (vd. app/src/scenes/*), khi nối hai cảnh với nhau, khi người dùng nhận xét máy quay "đều đều", "trôi", "giật", "không khớp nhạc", "chuyển cảnh nhàm", hoặc khi cần đo / so sánh chuyển động của một video (của mình hay video tham khảo) — kể cả khi họ không nói chữ "camera".
---

# Camera motion & chuyển cảnh one-shot

Skill này gói lại những gì rút ra khi phân tích từng khung một phim tham khảo làm bằng code
(xem `references/reference-film.md`) và áp vào engine của template `threejs-music-video`. Mục tiêu: máy quay **có nhịp** —
chạy theo cú, dừng đúng beat — thay vì trôi đều; và mỗi chỗ nối cảnh là một ý tưởng, không lặp một công thức.

Luật của `CLAUDE.md` vẫn đứng trên hết: mọi thứ ở đây là hàm thuần của `t`, mốc lấy từ
`data/audio.json` / `data/lyrics.json`, không hard-code giây. Chỉ học **kỹ thuật**, không chép hình, motif, nhân vật hay bảng màu của phim tham khảo.

## Quy trình

1. **Lập "bảng cú máy" trước khi code.** Với mỗi cảnh, viết (trong comment đầu file cảnh hoặc báo cáo) danh sách cú:
   `cú | beat bắt đầu → beat kết thúc | loại (punch / swing / build / kick / hold) | trục (pan, dolly, orbit, crane) | lý do theo lời`.
   Giữa các cú là **hold**. Lấy mốc bằng `cut()` / `sec()` / `audio.beats` / `audio.downbeats` / `onsets.kick|snare|vocal`.
   Đưa bảng này cho người dùng duyệt nếu cảnh mới — rẻ hơn nhiều so với sửa sau khi đã render.
2. **Chọn kiểu nối** với cảnh trước/sau từ `references/transitions.md`. Tránh dùng cùng một kiểu cho hai chỗ nối liên tiếp
   (ví dụ: MV "I Don't Know What It Does" đã lạm dụng "lặn vào mặt giấy → chớp → kéo ra"; xem bảng ví dụ ở cuối file đó).
3. **Code bằng công thức đóng** trong `references/easing.md` (hình chuông, lấy đà, lò xo tắt dần, rung va chạm, build tăng tốc).
   Hàm dùng chung đặt vào `app/src/engine/ease.ts` (thay đổi engine → nói rõ trong báo cáo, theo CLAUDE.md §3).
4. **Kiểm tra**: render still ở beat bắt đầu / đỉnh / beat đích của các cú chính (`npm run still -- --t a,b,c`),
   rồi render clip ngắn và đo bằng `scripts/motion.py` (xem mục Đo) để thấy đường cong thật sự so với beat.
   Ảnh tĩnh không cho thấy chuyển động — đó là lý do có script đo.

## Tám nguyên tắc

1. **Máy chạy theo cú, không trôi đều.** Cú điển hình 0.5–0.7 s (≈ 1–1.5 beat ở ~117 bpm; nhịp khác thì tính theo beat), xen giữa là hold gần như đứng yên.
   Tương phản động–tĩnh là thứ làm chuyển động "đã". Drift chậm liên tục chỉ dùng có chủ đích (xem nguyên tắc ngoại lệ).
2. **Đường tốc độ hình chuông.** Mỗi cú tăng tốc rồi giảm tốc (smootherstep / cubicInOut trên vị trí). Không khởi động hay dừng gắt —
   trừ cú kick cố ý.
3. **Chạy giữa beat, tới đích trên beat.** Cú bắt đầu trên một onset, đạt tốc độ đỉnh ở giữa, **dừng đúng beat/downbeat** của từ quan trọng
   để chữ đó đứng yên và đọc được ngay lúc được hát.
4. **Ghép hai trục ngược chiều.** Ví dụ lia trái *trong khi* kéo ra, hoặc orbit + crane lên. Thị sai làm không gian sâu hơn hẳn một trục đơn.
5. **Hai loại năng lượng.** *Build*: đẩy vào liên tục, tăng tốc dần 2–4 s, kết thúc bằng flash/cắt đúng downbeat mạnh.
   *Punch*: nhịp đẩy ngắn 0.2–0.3 s trên một onset, không kèm pan.
6. **Máy tĩnh, cảnh vẫn sống.** Trong hold, chữ mọc, vật bay, nhân vật làm việc — không bao giờ có khung chết.
7. **Sau chuyển cảnh lớn thì đứng yên** ~1–2 beat để mắt định hướng trong không gian mới.
8. **Nguyên tắc hoạt hình cổ điển cho cả camera lẫn vật:** lấy đà (lùi một chút trước khi lao), vượt đích rồi trở về
   ("swing past and settle"), rung ngắn khi va chạm (camera "kick" khi một chữ/vật đập xuống).

**Ngoại lệ có chủ đích:** khi lời/TREATMENT muốn cảm giác máy móc (ví dụ ở MV "I Don't Know What It Does": Bridge "lạnh và đều như dây chuyền"),
chuyển động tuyến tính tốc độ không đổi là một lựa chọn kể chuyện — nhưng ghi rõ lý do trong bảng cú máy, để nó không trông như quên ease.

## Mẫu code

Camera của một cảnh nên là một hàm `cam(t)` tổng hợp các cú, không phải state tích lũy theo frame:

```ts
// mỗi cú: [t0, t1] lấy từ beat, from/to là pose; hold = giữ pose cuối của cú trước
const moves = [
  { t0: beatAt(L1, 0), t1: beatAt(L1, 1.5), shape: bell, from: P0, to: P1 },
  { t0: dbAt('ANYTHING') - b * 1.5, t1: dbAt('ANYTHING'), shape: swingSettle, from: P1, to: P2 },
];
function cam(t: number): Pose {
  let p = moves[0].from;
  for (const m of moves) { if (t < m.t0) break; p = mixPose(m.from, m.to, m.shape(prog(t, m.t0, m.t1))); }
  return addKick(p, t, kicks); // rung va chạm: tổng các sin tắt dần, pha từ hash(seed, i)
}
```

`prog`, `lerp`, `cubicInOut` đã có trong `engine/ease.ts`; `bell`, `anticip`, `swingSettle`, `kick`, `buildIn` xem `references/easing.md`.
Pan/dolly/orbit nên nội suy trong không gian phù hợp (orbit theo góc, dolly theo log-khoảng cách để tốc độ cảm nhận đều).

## Đo chuyển động

`scripts/motion.py` đọc một video (stream qua ffmpeg, **không ghi frame ra đĩa**), ước lượng pan X/Y và dolly/zoom giữa các khung liên tiếp,
và vẽ một biểu đồ PNG: tốc độ máy, pan có dấu, dolly, độ thay đổi ảnh, cùng các vạch beat/downbeat từ `data/audio.json`.

```bash
cd app && npm run render -- --from 34 --to 40 --fps 30 --out ../out/clip.mp4
cd analysis && uv run python <skill>/scripts/motion.py ../out/clip.mp4 --offset 34 --out ../out/motion_clip.png
```

`<skill>` là thư mục chứa SKILL.md này (vd. `../.claude/skills/camera-motion`). Chạy từ `analysis/` để dùng môi trường uv
có numpy/scipy/matplotlib(/librosa); `data/audio.json` được tìm ngược lên từ thư mục hiện tại. Ra PNG + CSV cùng tên.
Đã kiểm bằng clip tổng hợp: pan đúng hướng và thời điểm, sai số tốc độ ~8%; zoom đúng dấu, độ phân giải ~0.4 %/khung.

- `--offset`: thời điểm bài hát của khung đầu clip (bằng `--from` lúc render).
- `--start/--dur`: chỉ đo một đoạn của file. Không có `data/audio.json` phù hợp (video ngoài) → thêm `--onsets` để lấy onset từ chính audio của file bằng librosa.
- Đọc biểu đồ: cú tốt = đỉnh tốc độ hình chuông, chân đỉnh nằm trên vạch beat; hold = đường gần 0; "trôi" = tốc độ đều không về 0; "giật" = cạnh dốc đứng không có chủ đích.
- Số chỉ gần đúng (ước lượng 2D toàn khung trên cảnh 3D có thị sai). Dùng để so hình dạng và thời điểm, không phải số tuyệt đối.

Để đo một video tham khảo đang stream trên web mà không tải về, xem `references/measure-in-browser.md`.

## Báo cáo

Khi xong một cảnh, báo theo bảng cú máy: mỗi cú khớp beat nào, kiểu nối đã chọn và vì sao, kèm still và (nếu đã đo) biểu đồ chuyển động.
Nhận xét của người dùng dạng `scene <id>, m:ss.ff, ...` → tìm cú chứa thời điểm đó và sửa đúng cú ấy.
