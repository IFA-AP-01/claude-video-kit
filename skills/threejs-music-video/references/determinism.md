# Tính tất định — luật, bẫy, cách kiểm tra

Mục tiêu: `still(t)` cho cùng một PNG dù gọi lúc nào, sau khung nào, ở fps nào; preview tại `t` trông như
bản render tại `t`.

## Kiểm tra nhanh

```bash
npm run still -- --t 100.5 --out ../out/a.png
npm run still -- --t 100.5 --out ../out/b.png
md5 -q ../out/a.png ../out/b.png          # Linux: md5sum
```

Hai hash phải trùng. Kiểm tra thêm "đường đi khác nhau": `--t 90,100.5` vs `--t 100.5` (khung trước đó khác)
phải ra cùng PNG cho 100.5. Lệch → có trạng thái rò rỉ giữa các khung hoặc nguồn ngẫu nhiên chưa seed.
(So sánh trên cùng máy/GPU; khác GPU có thể lệch vài LSB do driver — chấp nhận được.)

## Nguồn sai lệch thường gặp

| bẫy | triệu chứng | cách sửa |
|---|---|---|
| `Math.random()` trong layout/hiệu ứng | mỗi lần tải khác nhau | `mulberry32(seed)` trong `init`; `hash(i, bar)` trong `render` |
| thư viện dùng `Math.random` (three `GTAOPass` tạo noise khử nhiễu; một số example khác cũng vậy) | grain/AO nhấp nháy, PNG khác nhau | thay texture/uniform bằng bản seed (xem `engine/look.ts`) — grep `Math.random` trong `node_modules/three/examples/jsm/...` của pass bạn dùng |
| tích luỹ trong `render` (`x += v*dt`, `rotation.y += 0.01`) | tua tới/lui ra hình khác, phụ thuộc fps | viết vị trí = f(t) dạng đóng. Nếu buộc phải mô phỏng: tính lại từ đầu cảnh với bước cố định, cache theo bước, và reset khi `t` lùi |
| animation mixer/tween/physics engine theo đồng hồ riêng | như trên | `mixer.setTime(t - start)`; tween → hàm ease của `t`; physics → bake trước hoặc thay bằng công thức |
| troika `Text`: đổi `.text` hoặc font trong `render` | chữ cũ/trống vài khung, khác giữa preview/export | tạo + `syncAll` mọi Text trong `init`; trong render chỉ đổi `color`, `fillOpacity`, transform, `clipRect`. Template đặt `useWorker: false` (không đua worker trong headless) |
| font chưa nạp khi đo/vẽ canvas | lời dùng font fallback, layout lệch | `preloadFonts()` (FontFace + `document.fonts.add`) chạy trước mọi `init`; đo `LyricBlock` trong `init` |
| `CanvasTexture` quên `needsUpdate = true` | texture đứng hình ở khung cũ | gọi `tex.needsUpdate = true` (hoặc `CanvasSurface.commit()`) sau mỗi lần vẽ lại |
| grain/noise theo `t` thực | grain khác nhau giữa 30/60 fps hoặc không lặp lại | seed theo chỉ số khung cố định: `Post.finish(Math.round(t*60))` |
| layout theo kích thước cửa sổ (`innerWidth`, `clientWidth`) | still khác preview | mọi toạ độ trong `W×H`; `setPixelRatio(1)`, `setSize(W, H, false)`; CSS chỉ co giãn canvas |
| texture/model nạp async không chờ | khung đầu thiếu vật | `await` loader trong `init` (engine chờ `init` trước khi render) |
| `Date.now`/`performance.now`/`setTimeout` trong logic hình | không lặp lại | cấm; chỉ dùng để đo hiệu năng/log |
| video/audio element làm texture | không seek chính xác từng khung | tách thành chuỗi ảnh/spritesheet, hoặc tự vẽ |
| frustum culling + bounding box cũ sau khi đổi geometry | vật biến mất ở vài góc | `computeBoundingSphere()` sau khi sửa vị trí, hoặc `frustumCulled = false` |
| shadow map / mipmaps lần đầu | khung đầu tiên khác khung sau | engine render khung thật luôn sau `init`; nếu vẫn lệch, render "khởi động" một khung trong `init` |

## Trạng thái renderer giữa các cảnh

Các cảnh dùng chung `WebGLRenderer`. Thứ bị một cảnh đổi mà cảnh khác không đặt lại (clear color,
`autoClear`, `toneMapping`, `shadowMap`, `localClippingEnabled`, layer mask của camera) làm hình phụ thuộc
cảnh nào render trước. Quy tắc: set trạng thái cần thiết ngay trong `render` của cảnh, hoặc trả lại sau khi
dùng (xem `LyricLayer.render`).

## Preview vs export

- Preview lấy mẫu `t` từ `<audio>.currentTime` — có thể nhảy khung, nhưng mỗi khung vẫn đúng tại `t` của nó.
- Export dùng `t = n/fps` chính xác, `preserveDrawingBuffer: true`, HMR tắt (`MV_NO_HMR=1`) để file sửa
  giữa chừng không reload trang giữa lúc render.
- Grain/vignette giống nhau ở cả hai vì nằm trong post pass, seed theo khung.
