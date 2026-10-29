---
name: lyric-staging
description: Dàn dựng lời hát như vật thể trong không gian 3D của music video three.js — mỗi câu chọn một "chất liệu" (băng dán sàn, sơn tường, lưới cửa sổ/LED, chữ đùn đứng trên vật, phản chiếu nước, chữ mây trên trời, nhãn dán trên vật đang chạy, HUD bỏ lại trong thế giới), một kiểu xuất hiện (mọc lên vượt qua thẳng đứng rồi lắng lại, dựng theo âm tiết, vẽ viền → tô → đập + camera kick, đặc dần / tan bay lên, lật từng chữ cái), đúng thời điểm từ data/lyrics.json + onset giọng, và máy quay "phát hiện" câu đúng từ đầu tiên. Dùng skill này mỗi khi đặt, sửa hay lên kế hoạch hiển thị lời trong một cảnh, khi cần chữ khóa "diễn" theo nghĩa (flat, sky-high, sinking…), khi người dùng chê lời "chỉ là phụ đề", "nhàm", "khó đọc", "che nhân vật", "lặp lại một kiểu", hoặc khi cần tách âm tiết để chữ mọc theo giọng hát — kể cả khi họ chỉ nói "chữ" hay "text".
---

# Lời hát là vật trong phòng

Ý chính học từ phim tham khảo: lời **không phải phụ đề nổi trên hình** — mỗi câu là một vật có chất liệu, có chỗ đứng trong thế giới,
được máy quay tìm thấy đúng lúc được hát. Người xem đọc lời *vì* nó là một phần của cảnh, và một cảnh đọc được *vì* lời gọi tên nó.

Luật `CLAUDE.md` vẫn đứng trên: mốc từ `data/lyrics.json` (từng từ) + `data/audio.json` (`onsets.vocal`, beat), không hard-code giây,
mọi thứ là hàm thuần của `t`. Font của dự án theo `TREATMENT.md` §5. Chỉ học kỹ thuật, không chép cách bố cục cụ thể hay hình của phim tham khảo
(`references/observations.md`).

## Quy trình cho một cảnh

1. **Lập bảng lời** (comment đầu file cảnh / báo cáo), một hàng mỗi câu:
   `câu | chất liệu | vị trí trong thế giới | kiểu xuất hiện | từ khóa & gag | cách rời đi | font`.
   Đưa người dùng duyệt nếu cảnh mới — cùng lúc với bảng cú máy (skill `camera-motion`), vì hai bảng phụ thuộc nhau.
2. **Chọn chất liệu** từ `references/media.md`. Mỗi section dùng 2–4 chất liệu, không câu liền nhau nào trùng chất liệu + kiểu xuất hiện.
3. **Chọn kiểu xuất hiện** từ `references/entrances.md` (công thức đóng, dùng chung ease với camera).
4. **Lấy thời điểm** theo `references/timing.md`: từ mọc ở `word.start`; từ khóa dựng theo âm tiết thì chia theo onset giọng trong khoảng của từ.
   `scripts/word_onsets.py "<cụm lời>"` in ra start/end từng từ + onset giọng bên trong để lập kế hoạch.
5. **Máy quay phát hiện câu**: cú máy kết thúc (hoặc lia qua) chỗ câu đứng **đúng từ đầu tiên** của câu, và đứng yên lúc từ khóa được hát.
   Câu không bao giờ nằm ngoài khung lúc đang được hát.
6. **Kiểm tra** (dưới), rồi báo cáo theo bảng lời.

## Luật đọc được

Đây là những thứ làm hỏng lời dù chất liệu đẹp — kiểm hết trước khi báo xong:

- **Thời gian đọc**: từ đang hát phải rõ, đứng yên (hoặc chuyển động chậm) và không bị che từ `start` tới ít nhất `end + 0.15 s`.
  Hiệu ứng vào (mọc, lật, vẽ viền) xong trong ≤ 0.25 s để từ đọc được khi còn đang hát.
- **Tương phản**: chữ trên nền bận dùng composite của `Look`/`LyricLayer` (đổi ink/paper theo nền) hoặc một nền riêng (băng dán, biển, bong bóng).
  Không đặt chữ mỏng lên vùng halftone / lưới dày.
- **Kích thước**: chiều cao chữ hoa trên màn hình ≥ ~48 px ở 1080p cho lời chính (≥ ~70 px nếu có bản short dọc dùng lại cảnh).
  Chữ phối cảnh nghiêng (sàn, tường xiên): đo ở phần xa nhất.
- **Không đè người và vật kể chuyện**: chiếu hộp bao của nhân vật/vật chính ra màn hình mỗi khung (đã có camera) và đẩy chữ ra; hoặc chọn chỗ đứng
  ngay từ bảng lời (trên sàn trước nhân vật, trên tường sau lưng). Chữ được phép *tương tác* với vật (dấu đập lên chữ, chữ bị đè bẹp) — đó là gag, không phải đè.
- **Một tiêu điểm**: tại một thời điểm chỉ một câu đang hát nổi bật; câu cũ lùi lại (nhỏ, mờ, mất màu, hoặc thành đồ trang trí của thế giới).
- **Thứ tự đọc**: trái → phải, trên → dưới, hoặc theo đường máy quay đi qua. Chữ chồng tầng (bậc thang, hai cột) vẫn phải đọc đúng thứ tự từ.

## Ngân sách đa dạng

- Một kiểu xuất hiện "đặc biệt" (dựng âm tiết, vẽ viền → đập, tan bay) dành cho **từ khóa**, tối đa 1–2 lần mỗi câu. Phần còn lại mọc đơn giản theo từ.
- Gag theo nghĩa của từ (nén dẹt, bay lên, chìm xuống, đỏ lên) chỉ dùng khi từ đó **là** điểm nhấn của câu theo TREATMENT; gag nào cũng có thì không gag nào còn buồn cười.
- Lời lặp (chorus 2, final chorus) phải dùng chất liệu/kiểu khác lần đầu — người xem nhận ra lời, nên hình phải mới.

## Hạ tầng sẵn có trong engine

| Cần | Dùng | Ghi chú |
|---|---|---|
| Lời trên mặt phẳng 2D (màn hình UI, giấy, biển) | `LyricBlock` (`engine/lyric.ts`) vẽ lên canvas → CanvasTexture | tự xuống dòng, `arrive()`, `WordFx` cho gag từng từ |
| Chữ phẳng nổi trong 3D, sắc ở mọi cỡ | troika `Text` (`engine/text.ts`, SDF) | tạo + `syncAll` lúc init; không đổi `.text` khi đang render — tạo một mesh mỗi từ |
| Lời luôn đọc được trên nền bất kỳ | `LyricLayer` (`engine/look.ts`, `LYRIC_LAYER = 1`) | composite đổi màu theo nền; `add(mesh)` |
| Chữ khối đứng trong cảnh, viền mực + chấm | opentype → `ExtrudeGeometry` (bản chạy thật: `Type3D` trong MV "I Don't Know What It Does", không có trong template) | đã có pop/flip-up so le từng chữ cái; xem skill `toon-look` |
| Chữ từ nhiều ô (cửa sổ, LED, gạch) | `InstancedMesh` + bitmap chữ lấy mẫu từ canvas | xem `references/media.md` §3 |

## Kiểm tra

- Với mỗi câu: still ở `word.start` của từ đầu, của từ khóa, và ở `end` câu (`npm run still -- --t a,b,c`) — từ đọc được ở cả ba?
- Still ở chỗ đổi câu: câu cũ đã lùi, câu mới đã vào khung?
- Một still crop 100% vùng chữ nhỏ nhất của cảnh.
- Lời lặp: đặt still của hai lần cạnh nhau, phải khác nhau rõ.

## Báo cáo

Theo bảng lời: mỗi câu dùng chất liệu/kiểu nào, từ khóa và gag, thời điểm chính (m:ss.ff), still. Nhận xét dạng
`scene <id>, m:ss.ff, ...` → tìm câu đang hát ở thời điểm đó (`lyrics.json`) và sửa đúng hàng ấy trong bảng lời.
