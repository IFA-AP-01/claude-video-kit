# TREATMENT — "<TÊN BÀI>"

## Ý tưởng
<Một đoạn: video kể gì, giọng điệu (hài, u buồn, châm biếm...), "luật" thị giác xuyên suốt.
Ví dụ: mọi thứ là đồ vật đất sét trên bàn làm việc; lời bài hát là thứ nhân vật đọc/gõ/thấy.>

## Style
- **Bảng màu** (đặt trong `app/src/engine/palette.ts` → `C`): paper `#…`, ink `#…`, accent `#…`, …
- **Font** (file trong `app/public/fonts/`, khai báo `FONT` + `CSS_FACES`): display …, mono …
- **Chất liệu / ánh sáng**: <phẳng 2D / đất sét + GTAO / low-poly / neon…>
- **Chuyển động**: <cắt cứng theo downbeat, camera trôi chậm, nảy theo beat…>
- **Lời trên hình**: <ở đâu, cỡ, xuất hiện từng từ, từ khoá nào có gag>

## Bảng cảnh

| id | section / lời mở đầu | mốc cắt | nội dung | gag từ khoá |
|---|---|---|---|---|
| intro | intro | `sec('intro')` | … | — |
| verse1 | "…" | `cut('…')` | … | "…" → … |
| chorus1 | chorus1 | `sec('chorus1')` | … | … |

## Bản dọc (9:16)
Khoảng: <section/lời>, lặp được từ downbeat tới downbeat. Bố cục: chữ trong x 60–920, y 220–1420.

## Ghi chú / tránh
- <Những thứ không làm: logo thật, motif của dự án khác…>
