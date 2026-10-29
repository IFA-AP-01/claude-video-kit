---
name: toon-look
description: Chất liệu hoạt hình / comic cho three.js trong music video dựng bằng code — tô cel 2–3 tông theo đèn thế giới, nét mực từ pass normal/depth/ID (viền ngoài, nếp gấp, chỗ vật chồng nhau), chấm halftone cố định theo màn hình chỉ trong vùng tối, bảng màu bóng đổ có hue riêng, smear cho vật chạy nhanh, hoạt hình "on twos" — tất cả tất định (không nhấp nháy dải màu, không Math.random). Dùng skill này khi dựng hoặc sửa look của một cảnh 3D theo kiểu cartoon / toon / cel / comic / halftone / nét mực / "như phim hoạt hình", khi viết shader vật liệu hay post pass cho nét viền, khi chữ 3D cần viền mực và chấm in, khi người dùng chê cảnh "nhìn như game / như 3D thô / bị nhấp nháy / nét viền răng cưa", hoặc khi cân nhắc đổi từ look đất sét sang toon — kể cả khi họ không nói chữ "shader".
---

# Toon look cho three.js

Mục tiêu: một khung 3D trông như **tranh in / hoạt hình vẽ tay** — mảng màu phẳng, ranh giới sáng–tối rõ, nét mực ôm hình,
chấm in trong bóng — mà vẫn là hàm thuần của `t`, ra cùng pixel ở preview và render.

Kỹ thuật rút ra từ phim tham khảo dựng bằng code (`references/observations.md`) và từ một bản chạy thật
(chữ 3D đùn có viền mực + halftone trong MV "I Don't Know What It Does", `scenes/short-type.ts` — không có trong template). Chỉ học kỹ thuật; bảng màu, nhân vật, motif lấy từ
`TREATMENT.md` của dự án, không lấy của phim tham khảo.

## Năm lớp của look

Dựng theo thứ tự này, mỗi lớp xem được riêng. Đừng bật cả năm rồi mới chỉnh — không biết lớp nào làm xấu.

1. **Cấu trúc sáng–tối (value).** Mỗi vật có 2–3 tông phẳng: `base` (lit), `shade` (bóng), tuỳ chọn `deep` (bóng sâu / mực chấm).
   Ranh giới là `smoothstep` hẹp quanh `dot(n, L)` với **L cố định trong không gian thế giới** cho cả cảnh.
   Kiểm tra bằng cách tắt màu (xám): ảnh xám phải đọc được hình khối ngay, như phác thảo 3 giá trị.
2. **Nét mực (ink).** Post pass đọc một target "info" (normal view-space, độ sâu tuyến tính, ID vật) và vẽ mực ở:
   viền ngoài (ID khác nhau / nền trống), nếp gấp (normal đổi góc gắt), và chỗ một phần vật nằm trước phần khác của chính nó (độ sâu lệch khỏi mặt phẳng).
   Nét mảnh dần theo khoảng cách; mực **không đen tuyệt đối** — tối đậm có hue (navy, nâu, tím than) theo bảng màu cảnh.
3. **Chấm halftone.** Lưới chấm xoay 45° **cố định theo màn hình** (pitch tính theo pixel khung 1920×1080), chỉ trong vùng `shade`,
   bán kính chấm tăng liên tục theo độ tối (AM screening). Đây là thứ biến "3D tô phẳng" thành "tranh in".
4. **Màu và không khí.** Bóng đổ không phải `base × 0.5`: dịch hue về phía màu bóng chung của cảnh (lạnh nếu đèn ấm, và ngược lại).
   Vật xa: màu kéo về màu trời/sương, nét mảnh và nhạt hơn, chấm thưa hơn — đó là cách tạo chiều sâu mà không cần GTAO.
5. **Chuyển động kiểu hoạt hình.** Vật lao nhanh: smear (kéo giãn mặt sau theo vận tốc tính từ công thức đóng), vẽ **một** lần mỗi khung,
   không chồng nhiều bản sao. Nhân vật/vật có thể "on twos" (pose theo `floor(t*12)/12`) trong khi camera chạy mượt.

Code mẫu cho từng lớp: `references/shaders.md` (vật liệu toon, pass info, pass mực, halftone, smear, gắn vào composite).

## Luật tất định riêng cho toon

Toon dễ **nhấp nháy** hơn đất sét vì mọi thứ là ngưỡng cứng. Các lỗi đã gặp và cách tránh:

- **Dải màu lật trong một khung**: một mặt phẳng lớn có `dot(n,L)` sát ngưỡng → camera nhích một chút là cả mặt đổi tông.
  Đèn đặt trong **không gian thế giới** (không theo camera), ngưỡng tránh giá trị `dot` của các mặt lớn, độ mềm `smoothstep` ≥ ~0.04.
  Ánh sáng đổi theo thời gian thì đổi chậm (ease nhiều beat), không bao giờ nhảy trong 1 khung.
- **Halftone theo tông liên tục**, không phải bậc: bán kính chấm là hàm liên tục của độ tối, nên khi ánh sáng đổi, chấm lớn dần chứ không bật/tắt.
- **Target info không MSAA, lọc Nearest** (MSAA trộn normal/ID ở mép → nét rác). Target màu có thể MSAA. Không TAA, không jitter theo thời gian thật.
- **Nét "sôi" (line boil)** nếu muốn: lệch offset mẫu theo `hash(floor(t*12), …)` từ `rand.ts` — tất định, đổi đúng 12 lần/giây.
- Mọi kích thước (pitch chấm, độ dày nét) tính theo pixel khung 1920×1080 qua một uniform tỉ lệ, để preview thu nhỏ vẫn khớp bản render.
- Sau mỗi thay đổi lớn: chạy `scripts/flicker.py` trên clip render của đoạn đó (xem dưới).

## Quy trình

1. Đọc `TREATMENT.md` (bảng màu, accent, mood từng section). Lập **bảng skin** cho cảnh: `vật | base | shade | deep | ink`.
   Tối đa 2 accent trên màn hình như luật màu của dự án; mực và bóng là tint của bảng màu, không thêm hue mới.
2. Dựng lớp 1 với cảnh xám, render still, xem đọc khối được chưa. Rồi lớp 2 (nét), 3 (chấm), 4 (màu/không khí), 5 (chuyển động).
3. Code dùng chung đặt ở `app/src/engine/toon.ts` (vật liệu + pass) — **thay đổi engine, nói rõ trong báo cáo**. Cảnh chỉ khai báo skin và gọi.
4. Kiểm tra (xem dưới). Báo cáo kèm still và crop 100%.

## Kết hợp với look đất sét có sẵn

Engine có `Look` (đất sét: GTAO + Neutral tonemap + lớp lời đổi màu theo nền) và `LyricLayer`. Toon là **một look khác**, không chồng lên đất sét:
- Toon thay GTAO bằng tô cel + nét + chấm (AO tắt: `uAO = 0`, hoặc trộn AO rất nhẹ vào ngưỡng `shade` để góc khuất rơi vào bóng).
- Vẫn dùng phần composite chữ của `Look` (lời đổi ink/paper theo nền) — chữ lời không phụ thuộc look của cảnh.
- Mỗi section một look. Chuyển giữa hai look là một khoảnh khắc kể chuyện (vd. màu rút khỏi từng vật — xem
  `camera-motion/references/transitions.md` kiểu 6), không đổi lửng giữa câu.

## Kiểm tra

- `npm run still -- --t a,b,c` ở vài thời điểm; xem PNG ở 100% và crop phóng to vùng có nét/chấm:
  nét liền, không răng cưa bậc thang, không đứt ở góc; chấm tròn đều, không moiré với họa tiết khác.
- Ảnh xám (tạm set saturation 0 trong composite): đọc được hình khối.
- Render clip đoạn có camera chạy + đèn đổi rồi chạy:
  ```bash
  cd analysis && uv run python <skill>/scripts/flicker.py ../out/clip.mp4 --offset <from> --out ../out/flicker.png
  ```
  Một pixel bị đánh dấu khi nó phẳng ở cả hai khung **và** tông mới không có ở đâu trong vòng `--reach` px của khung trước —
  nên vật/camera chạy (mang tông theo) không bị tính, còn dải lật tông thì có. Script in ra các sự kiện:
  `one-frame jump` (dải vượt ngưỡng trong 1 khung), `flip + back (flicker)` (nhấp nháy kinh điển), `N-frame run` (đèn đổi quá nhanh),
  `cut/flash?` (cả khung đổi — thường là cắt cảnh/flash cố ý, đối chiếu timeline). Ra PNG + CSV; stream qua ffmpeg, không ghi frame ra đĩa.
  Đã kiểm bằng clip tổng hợp: khối chạy 25 px/khung không bị đánh dấu; mảng lật 1 khung và cắt cảnh được nhận đúng loại.

## Báo cáo

Theo bảng skin + lớp: lớp nào đã bật, thông số chính (ngưỡng, pitch chấm, độ dày nét ở 1080p), still + crop 100%,
kết quả flicker (số đỉnh và giải thích từng đỉnh), và mọi thay đổi trong `engine/`.
