# Chất liệu cho lời: cách dựng từng loại

Mục lục: 1 băng dán / sơn sàn · 2 sơn tường, biển hiệu · 3 lưới ô (cửa sổ, LED, gạch) · 4 chữ khối đứng · 5 phản chiếu nước · 6 chữ mây / khói / bầu trời · 7 nhãn dán trên vật chạy · 8 HUD bỏ lại trong thế giới · 9 câu cũ thành đồ trang trí · 10 ví dụ ánh xạ từ một MV thật

Mỗi mục: **khi nào hợp** → **dựng** → **bẫy**. Thời gian xuất hiện: `references/timing.md`; kiểu xuất hiện: `references/entrances.md`.

## 1. Băng dán / sơn trên sàn
- **Hợp**: máy quay nhìn xuống hoặc đi dọc sàn; câu là "chỉ dẫn", "lối đi"; nhân vật bước qua chữ.
- **Dựng**: mỗi từ một plane nằm trên sàn (y + 0.002 để khỏi z-fight), texture từ canvas (`LyricBlock` hoặc từng từ) hoặc troika `Text` xoay `-π/2` quanh X.
  Băng dán: thêm một plane nền màu (băng) hơi rộng hơn chữ, mép răng cưa nhẹ bằng `hash()` theo từ.
  Xuất hiện: băng "kéo" ra theo trục từ (scaleX 0→1 từ mép trái, `expoOut`) rồi chữ hiện trên băng.
- **Bẫy**: góc nhìn thấp → chữ bị nén dọc, khó đọc. Nghiêng máy ≥ 35° xuống hoặc kéo dãn chữ theo trục sâu (anamorphic, như chữ "SLOW" sơn đường) bù phối cảnh.

## 2. Sơn tường, biển hiệu
- **Hợp**: hold dài, câu "tuyên bố"; tường sau lưng nhân vật.
- **Dựng**: plane sát tường, canvas texture. Sơn: chữ hiện theo "nét quét" — mặt nạ dọc tiến theo x (`smoothstep` theo `prog(t, start, start+0.18)`), mép mặt nạ có nhiễu `hash`.
  Biển hiệu: hộp mỏng + chữ phát sáng (emissive / màu ngoài tonemap), bật theo từ với nhấp nháy tất định 2–3 lần (`hash(i, floor(t*30)) > ngưỡng giảm dần`).
- **Bẫy**: chữ cùng màu tường dưới đèn khác nhau → dùng `LyricLayer` hoặc màu tách khỏi tường ≥ 40% độ sáng.

## 3. Lưới ô: cửa sổ nhà, tường LED, gạch, bàn phím
- **Hợp**: câu ngắn, to; cảnh có nhiều ô sẵn (tòa nhà, tường LED của `wrapper`); chữ như được "bật đèn" lên.
- **Dựng**: vẽ câu lên canvas nhỏ (cỡ lưới, vd 48×12), lấy mẫu từng ô → mảng `on[i]` (0..1). `InstancedMesh` các ô; màu/emissive mỗi ô
  qua `instanceColor` hoặc attribute. Thời gian bật mỗi ô = `start` của từ chứa cột đó + `hash(i) * 0.08` (lan nhẹ).
  Ô tắt vẫn có màu tối khác nền để lưới đọc được là lưới.
- **Bẫy**: chữ thấp hơn ~7 ô không đọc được; cột ô phải đủ dày (≥ 2 ô cho nét đứng). Lưới quá mịn + nén video = moiré.

## 4. Chữ khối đứng trên vật / trong cảnh
- **Hợp**: từ khóa; chữ có trọng lượng (bị đè, đập, đổ, bay); camera vòng quanh chữ.
- **Dựng**: chữ khối (opentype → `ExtrudeGeometry`, depth ~0.4 em) với vật liệu toon (skill `toon-look`) hoặc clay. Mỗi chữ cái một mesh
  (để lật/so le), pivot ở chân chữ. Đặt *trên* một vật (nóc tàu, bàn, mép hóa đơn) — chữ có chỗ đứng thì có lý do tồn tại.
- **Bẫy**: nhìn từ cạnh thì mất chữ — máy quay không được qua góc > ~55° so với mặt chữ khi từ đang hát. Chữ đùn tự đổ bóng lên nhau → kiểm nét đọc được.

## 5. Phản chiếu nước / mặt bóng
- **Hợp**: câu buồn, nhớ, "không thật"; chữ thật ở trên, bản phản chiếu gợn dưới.
- **Dựng**: chữ thật + bản sao lật dọc qua mặt nước (scaleY −1), alpha ~0.5, lệch x theo `sin(y*k + t*w)` trong shader (gợn sóng là hàm của t, tất định).
  Hoặc *chỉ* có phản chiếu (chữ thật ngoài khung) — máy quay ngẩng lên lộ chữ thật ở từ khóa.
- **Bẫy**: chữ phản chiếu ngược nên chỉ dùng cho câu người xem đã đọc / sẽ đọc lại ở chữ thật.

## 6. Chữ mây, khói, bầu trời
- **Hợp**: "sky", "fly", "high", "dream", kết câu lớn; máy quay ngẩng lên.
- **Dựng**: chữ là đám hạt / khối cầu clay xếp theo mặt nạ chữ (lấy mẫu điểm trong glyph bằng canvas hoặc opentype path); mỗi hạt có offset trôi nhỏ
  theo `hash` + `t`. Đặc dần: bán kính hạt 0 → r theo thứ tự từ trái sang (`start` từ + vị trí x). Tan: hạt bay lên + mờ, tốc độ theo `hash`.
- **Bẫy**: hạt quá thưa thì không đọc được — số hạt ≥ ~150 mỗi chữ cái ở cỡ khung; giữ hình chữ rõ ít nhất 0.6 s trước khi tan.

## 7. Nhãn dán trên vật đang chạy (xe, tàu, băng chuyền, bot)
- **Hợp**: câu về thứ đang chuyển động; máy quay bám theo vật.
- **Dựng**: con của mesh vật (parent), nên chạy cùng vật miễn phí. Dán lên mặt phẳng nhất của vật; texture canvas.
  Xuất hiện kiểu "dán": scale 1.15 → 1 + xoay nhẹ, một khung lóa trắng mép.
- **Bẫy**: vật chạy nhanh qua khung → từ không đủ lâu trên màn hình. Máy quay phải bám vật trong suốt câu.

## 8. HUD bỏ lại trong thế giới
- **Hợp**: chuyển cảnh; câu "máy" (log, status, prompt). Một HUD 2D trên màn hình được máy quay lùi ra thì hoá ra là màn hình/ bảng trong thế giới.
- **Dựng**: render HUD vào canvas → texture của một màn hình 3D; khung đầu đặt màn hình đó lấp đúng khung hình (match), rồi máy lùi.
  Khớp pixel: tính khoảng cách máy sao cho màn hình phủ đúng 1920×1080 (`d = (h/2) / tan(fov/2)`).
- **Bẫy**: lệch tỉ lệ một chút là thấy "nhảy" ở khung nối — so still trước/sau nối ở 100%.

## 9. Câu cũ thành đồ trang trí
- **Hợp**: mọi cảnh one-shot dài. Câu đã hát không biến mất mà ở lại thế giới, nhỏ dần trong khung khi máy đi tiếp — thành "lịch sử" của cảnh.
- **Dựng**: không fade-out; sau `end + 0.5 s` hạ độ bão hòa/tương phản (về màu mực nhạt của cảnh) để không tranh tiêu điểm với câu mới.
- **Bẫy**: quá nhiều câu cũ trong khung → rối. Câu cũ cách câu mới ≥ 1/3 khung, hoặc đã ra khỏi khung ở thời điểm câu mới hát từ khóa.

## 10. Ví dụ ánh xạ: MV "I Don't Know What It Does"

Đây là ví dụ đã dùng / dự kiến trong MV — dùng làm mẫu ánh xạ, không bắt buộc cho dự án khác.

| Câu / từ | Chất liệu | Ghi chú |
|---|---|---|
| "Build passed" (`chat`) | badge UI xanh trong cửa sổ chat | Pass Green chỉ dùng ở đây và dấu tick |
| dòng phí của từng cảnh | dòng in nhiệt trên hóa đơn (JetBrains Mono) | motif xuyên suốt; hóa đơn là chất liệu "máy" |
| "flat" (`email`) | dòng "TL;DR" bị ép dẹt | gag nén theo beat |
| "sky-high" (`phone`, `solo`) | đường biểu đồ bẻ đứng / dải hóa đơn bùng nổ lên trời | lần lặp phải khác lần đầu |
| "sinking" (`bridge`) | chữ poster Big Shoulders tụt theo đồng xu chìm | |
| "not the paying part" (`bridge`) | ô chữ ký trống viền đỏ | ô ký sau đó thành thanh prompt (`wrapper`) — HUD ↔ thế giới |
| "Code it, ship it" (`wrapper`) | gõ trong thanh prompt | chất liệu §8 |
| "Everything's AI" (`wrapper`) | tường LED, mọi tile lật thành AI | chất liệu §3 |
