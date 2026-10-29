# Từ vựng chuyển cảnh one-shot

Trong một MV one-shot, mọi chuyển cảnh là liền máy: cảnh sau diễn tiếp cú ra của cảnh trước (`params` trỏ tới entry trước trong
`app/src/timeline.ts`). Chỗ nối thật giữa hai module cảnh phải nằm ở nơi mắt không bám được: trong một flash, trong vệt nhòe
của cú lia, khi một vật che kín khung, hoặc ngay trên downbeat khi mọi thứ đang chuyển động mạnh.

## Các kiểu nối

### 1. Lùi qua khung (frame exit)
Máy lùi khỏi một màn hình/tranh, đi qua khung cửa sổ hoặc cửa, ra không gian lớn hơn — **cùng một thế giới 3D**, không dissolve.
- Dựng: cảnh ngoài là phần tiếp nối hình học của cảnh trong (cùng hệ tọa độ, hoặc cảnh sau tự dựng lại phần cuối của cảnh trước).
- Che chỗ nối bằng một cú lia nhanh (0.5–0.7 s, hình chuông, đỉnh ~90 px/khung ở 720p) bắt đầu trên onset.
- Hợp với: thoát ra từ màn hình laptop / điện thoại để ra không gian ngoài.

### 2. Lưới làm màn hình (grid display)
Một lưới vật thể (cửa sổ tòa nhà, ô hóa đơn, phím bàn phím, pixel LED) bật/tắt thành chữ của lời; máy đẩy vào **một ô** của lưới
và ô đó mở ra thành không gian bên trong.
- Dựng: InstancedMesh, màu/emissive mỗi instance là hàm của `t` và bitmap chữ; ô đích có cảnh bên trong render trực tiếp (không render-to-texture nếu máy sẽ đi xuyên qua).
- Hợp với: lời được "viết" bằng chính vật trong cảnh.

### 3. Đẩy vào vật → không gian trừu tượng → lóa → kéo ra
Đẩy liên tục, **tăng tốc dần 2–4 s** (build) vào một vật (ngực, lỗ, con mắt, mặt giấy), sang không gian trừu tượng tối,
một nguồn sáng nở ra phủ trắng khung **đúng downbeat mạnh nhất**, rồi cảnh mới hiện ra từ màn trắng.
- Dựng: dolly theo log-khoảng cách với `buildIn` (easing.md); bloom/exposure tăng theo `t` tới trắng; chỗ nối module nằm trong 1–3 khung trắng.
- Sau đó hold ~1–2 beat.

### 4. Dissolve mặt nạ nhiễu (noise-mask reveal)
Từ màn trắng/đen/giấy, cảnh mới hiện ra theo **mảng loang hữu cơ**, không crossfade phẳng.
- Dựng trong `engine/post.ts`: `mask = smoothstep(k - w, k + w, fbm(uv * s + seed))`, `k` chạy 0→1 theo `prog(t, a, b)`; nhiễu seed cố định, không phụ thuộc thời gian thực.
- Có thể cho mảng loang ưu tiên mở từ chủ thể (trộn thêm khoảng cách tới điểm chủ thể trên màn hình).

### 5. Tường đổ / sàn mở (set extension)
Bức tường sau nhân vật đổ ra sau (bản lề ở chân tường), sàn trượt mở, hoặc trần nhấc lên — cảnh mới là phần mở rộng của cùng không gian.
- Dựng: xoay quanh trục bản lề bằng `swingSettle` (vượt đích một chút, nảy, nằm yên); kèm một nhịp punch-in ngắn ngay trước downbeat.
- Rẻ trong three.js vì không cần chuyển module ngay — cảnh sau có thể đã nằm sẵn sau tường.

### 6. Màu tràn vào / rút ra (colour bloom)
Cảnh bắt đầu xám (chỉ nét/khối), màu loang ra quanh từng vật khi nó xuất hiện theo lời. Đảo lại — màu bị rút khỏi từng vật — hợp với
ý "tự động hóa lấy mất".
- Dựng: uniform `uColorAmt` theo vật hoặc mask hình cầu nở từ tâm vật (khoảng cách thế giới so với bán kính theo `t`).

### 7. Vật dẫn đường (guide object)
Một vật/nhân vật bay trước máy qua chỗ nối, ra phía bên kia ở cùng vị trí màn hình. Mắt bám theo nó nên không thấy đường nối.
- Ví dụ (MV "I Don't Know What It Does"): dải hóa đơn bay, một bot, đồng xu, con dấu. Giữ vị trí trên màn hình liên tục qua hai module (truyền pose qua `params`).

### 8. Lia nhanh có nhòe (whip pan)
Cú lia 0.3–0.5 s, motion blur theo hướng lia (blur hướng trong post, độ dài tỉ lệ vận tốc góc), chỗ nối ở khung có tốc độ đỉnh, đỉnh tốc độ trên downbeat.

### 9. Lặn vào mặt phẳng 2D → chớp → kéo ra (kiểu dễ bị lạm dụng)
Lao vào giấy/màn hình, chớp sáng, kéo ra khỏi chính mặt phẳng đó trong thế giới mới. Gắn với motif hóa đơn nên vẫn có giá trị —
nhưng đã dùng nhiều, chỉ dùng khi lời thật sự nói về tờ giấy/màn hình đó.

## Ví dụ: các chỗ nối trong MV "I Don't Know What It Does" (theo `timeline.ts` của dự án đó)

| Nối | Kiểu hiện tại |
|---|---|
| `wake` → `chat` | lặn vào màn hình laptop (9), cắt ẩn trên downbeat trước "chat" |
| `chat` → `merge` | cùng bàn, cùng máy |
| `merge` → `ship` | cú lao ra rồi rơi vào văn phòng |
| `ship` → `phone` | đẩy vào điện thoại, đổi module giữa cú đẩy trên downbeat "Make a video" (9) |
| `phone` → `email` | lặn vào invoice trên cùng, kéo ra từ lá thư (9) |
| `email` → `loop` | lặn lên dây cáp đã sáng lúc nhá tối |
| `loop` → `solo` | máy leo lên sau slip API rồi rơi xuống bình nguyên |
| `solo` → `bridge` | lặn vào mặt tờ bill, kéo ra từ chính tờ giấy (9) |
| `bridge` → `wrapper` | đẩy vào ô chữ ký trống, glitch thành thanh prompt |
| `wrapper` → `outro` | lặn vào hóa đơn, match-cut sang hóa đơn trên bàn (9) |

Khi sửa hoặc thêm chỗ nối: ưu tiên kiểu chưa dùng ở hai chỗ nối kề bên, và nói rõ vì sao kiểu đó hợp với lời ở chỗ ấy.
Cập nhật bảng này khi kiểu nối thay đổi.
