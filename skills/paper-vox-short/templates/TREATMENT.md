# TREATMENT — "<tên video>" (YouTube Short, ~m:ss, thuyết minh tiếng Việt)

## Ý tưởng
**Paper Vox**: một bản tin giải thích làm bằng giấy cắt dán. Mọi thứ là vật thể giấy trên một
mặt bàn màu: mẩu báo xé, ảnh in halftone, băng dính, con dấu cao su, sơ đồ kẻ tay. Giọng điệu
tò mò, "giải thích kiểu Vox": câu hỏi lớn → bằng chứng → cơ chế → bối cảnh → lưu ý.
Lời thuyết minh là nguồn nhịp duy nhất (không nhạc nền): mỗi cụm ý = một "beat" hình.
<1–2 câu riêng cho video này>

## Style
- **Khung**: dọc 1080×1920, 30 fps. Toạ độ tâm ở giữa, +y lên (`engine/scene.ts`).
- **Bảng màu** (`engine/palette.ts`): paper `#F2EADB`, ink `#1A1A1A`, red `#E8372C`,
  blue `#2F5BEA`, yellow `#F2C230`, teal `#1E9E8F`, orange `#F07A2A`, green `#2E6B3F`.
  Mỗi beat có **một màu nền** (đỏ / xanh / teal…), giấy và mực đặt lên trên. Màu đã được duyệt
  ở video đầu — giữ sắc, làm retro bằng chất liệu chứ không giảm màu.
- **Font** (@fontsource, đều có dấu tiếng Việt, OFL):
  - Anton — headline dải chữ, con dấu
  - Be Vietnam Pro 800 — phụ đề
  - Noto Serif — mẩu báo (măng-sét, tít, sapo, thân bài)
  - IBM Plex Mono — nhãn, dateline, kicker, tag sơ đồ
- **Chất liệu**:
  - Cut-out: mép xé (SDF + noise), viền giấy trắng, rim tối, bóng đổ mềm, rung 12 fps
    (`floor(t*12)`) để giống stop-motion.
  - Ảnh: luôn in **halftone một màu** (chấm 45°) trên giấy, không dùng ảnh màu gốc.
  - Băng dính mờ ở góc; con dấu mực loang (pressure + voids + grit).
  - Nền = **giấy bìa màu** (`engine/paper.ts` `PaperBg`): sợi giấy, mottling ±4%, nếp nhăn mờ,
    hai nếp gấp (một ngang, một dọc); mỗi beat một tờ khác (`bg.seed` theo `t0`).
  - Cut-out in lệch bản ~1.6 px (`misreg`, hướng theo seed) và mép mực sần (`rough`), cả ở
    halftone (bản màu lệch so với bản mực). Phụ đề tắt cả hai (`misreg: 0, rough: 0`) cho rõ.
  - Post (`engine/post.ts`): grade kiểu bản in cũ (đen hơi nâu, trắng ngả kem, bớt bão hoà 7%),
    mép tối nâu không đều (vignette 0.17), nhấp nháy phơi sáng 12 fps, film grain 0.04.
- **Chiều sâu / camera**: camera phối cảnh FOV 40, 5 lớp z:
  BG -900 (nền màu) · CLIP -450 (đĩa halftone, mẩu báo phụ) · PHOTO -200 (ảnh, sơ đồ) ·
  DIAGRAM 0 (vật chính) · FRONT 120 (sticker). Camera trượt ngang/dolly chậm theo keyframe
  Catmull-Rom trong mỗi beat → parallax nhẹ giữa các lớp.
- **Chuyển động**:
  - Mọi thứ xuất hiện bằng **pop bậc 12 fps**: 1.3 → 0.92 → 1.04 → 1 (không ease mượt).
  - Con dấu: rơi 0.14 s → đập → camera giật (shake 16–22 px) + push.
  - Headline: từng chữ một dải màu, mỗi chữ nghiêng ngẫu nhiên ±3.5°, xuất hiện lần lượt.
  - Chuyển beat: camera lướt một take sang tờ giấy bên cạnh (`BeatScene`, rời 0.3 s trước câu,
    đáp 0.55 s sau), kèm whoosh.
- **Phụ đề**: dải giấy Be Vietnam Pro 800, 60 px, giữa vùng an toàn, đáy ở `SAFE.bottom+170`.
  Một cụm từ khoá mỗi câu có vệt bút dạ vàng phía sau. Cụm 2–5 từ, đổi theo từ trong words.json.
- **Vùng an toàn Shorts**: chữ quan trọng trong x −480…340, y −710…760 (tránh ~250 px đáy,
  ~200 px phải cho nút UI).

## Bộ đồ nghề (`engine/`, `engine/art.ts`)
Headline dải chữ (`Headline`), ảnh halftone (`photoPrint`, `Cutout` + `halftone`), đĩa halftone
(`discCanvas`), tag mono (`tag`), sticker tròn (`stickerCanvas`), con dấu (`Stamp` + `shake`),
băng dính (`Tape`), mẩu báo bịa (`clipping`), mũi tên (`arrowCanvas`), bong bóng chat
(`bubbleCanvas`), điện thoại (`phoneCanvas`), đám đông (`crowdCanvas`), ghim bản đồ (`pinCanvas`),
tim (`heartCanvas`), khói (`puffCanvas`). Ví dụ đầy đủ một cảnh: `references/example-scene.ts`.

## Bảng cảnh (điền từ BRIEF §3, cập nhật khi dựng)
| id | khoảng | beat (màu) | nội dung chính |
|---|---|---|---|
| | | | |
