# Render — still, video, bản dọc

## Yêu cầu

- Google Chrome cài sẵn (`playwright-core` dùng `channel: 'chrome'`, không tải trình duyệt riêng).
- `ffmpeg` trong PATH (libx264 + aac).
- GPU thật. Cờ mặc định trong `scripts/render.ts`: `--use-angle=metal` (macOS). Linux: đổi thành
  `--use-angle=vulkan` hoặc `--use-gl=angle --use-angle=gl-egl`; Windows: `--use-angle=d3d11`.
  Dòng `renderer: ...` in ra khi chạy phải là GPU thật, không phải SwiftShader (chậm hàng chục lần).

## Lệnh

```bash
npm run still -- --t 72.5                       # ../out/still_72.50.png
npm run still -- --t 36.5,48,72.25              # nhiều still, một lần mở trình duyệt
npm run still -- --t 72.5 --out ../out/x.png
npm run still -- --portrait --t 40              # ../out/portrait_40.00.png
npm run render                                  # cả bài → ../out/mv.mp4, 60 fps
npm run render -- --from 30 --to 45             # một đoạn (để review chuyển động)
npm run render -- --fps 30 --crf 18 --preset medium --out ../out/draft.mp4
npm run render -- --portrait                    # entry dọc → ../out/portrait.mp4
```

## Đường đi của một khung

1. `render.ts` khởi động Vite (port 5199, `MV_NO_HMR=1`) và Chrome headless với viewport đúng khung.
2. Mở `/?export=1[&portrait=1]`, chờ `window.__mv.ready` (font + cảnh đầu), gọi `prepare(from, to)` để init
   mọi cảnh trong khoảng.
3. Mở WebSocket server; trang render `t = n/fps` cho n = round(from·fps) … round(to·fps)−1, `gl.readPixels`
   (RGBA, hàng từ dưới lên) và gửi; tối đa 4 khung chưa được ack (ack khi ffmpeg đã nhận vào stdin).
4. ffmpeg:

```
-f rawvideo -pix_fmt rgba -s WxH -r FPS -i pipe:0
-ss <round(from·fps)/fps> -t <nFrames/fps> -i song.mp3
-map 0:v -map 1:a -vf vflip
-c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p
-c:a aac -b:a 320k -shortest -movflags +faststart out.mp4
```

- `vflip` vì `readPixels` trả hàng từ dưới lên.
- Audio cắt ở `round(from·fps)/fps` — đúng lưới khung, nên đoạn render từ giữa bài vẫn khớp tiếng.
- Bản dọc thêm `afade=t=out` 80 ms ở cuối: clip cắt giữa bài có thể dừng ngay khi một từ vừa bắt đầu.
- Không có PNG trung gian nào trên đĩa — chỉ file mp4 cuối.

Still dùng `canvas.toDataURL('image/png')` sau `engine.render(t)` (cần `preserveDrawingBuffer`, đã bật trong
export mode).

## Tự xem kết quả

- Still: mở PNG bằng Read để nhìn. Chọn t ở: ngay sau mỗi mốc cắt (+0.05 s), đỉnh mỗi gag từ khoá, giữa chuyển
  động camera, cuối cảnh.
- Chuyển động: render đoạn 3–6 s quanh chỗ cần xem rồi trích vài khung **vào bộ nhớ tạm** để xem, ví dụ
  `ffmpeg -ss 1.2 -i ../out/draft.mp4 -frames:v 1 /tmp/f.png` — vài khung lẻ, không trích hàng loạt.
- Kiểm tra file: `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries
  format=duration ../out/mv.mp4`.

## Sự cố

| triệu chứng | nguyên nhân / sửa |
|---|---|
| `Timeout ... __mv.ready` | lỗi JS trong `init` (xem dòng `[page error]`), font 404 (kiểm tra `public/fonts`), hoặc `data/*.json` thiếu |
| `renderer: SwiftShader` / rất chậm | Chrome không lấy được GPU: sửa cờ `--use-angle` theo OS, bỏ chạy qua SSH không có GPU |
| khung đen / trống | cảnh vẽ vào `null` thay vì `target`, hoặc quên `setRenderTarget(target)` trước `render` |
| hình lật ngược | bỏ mất `-vf vflip` |
| tiếng lệch hình ở đoạn `--from` | không cắt audio theo lưới khung (giữ `-ss round(from·fps)/fps`) |
| màu nhạt/đậm hơn preview | cảnh tự tonemap hai lần, hoặc texture canvas thiếu `colorSpace = SRGBColorSpace` |
| `[page] Failed to load resource: 404` một lần | thường là favicon — vô hại |
| ffmpeg `Broken pipe` | ffmpeg chết trước (xem lỗi phía trên: codec thiếu, đường dẫn out không ghi được) |
| bộ nhớ GPU tăng dần | tạo texture/geometry/material trong `render`; dựng một lần trong `init` |

## Hiệu năng

Tốc độ export phụ thuộc cảnh nặng nhất (GTAO, shadow map, canvas toàn khung vẽ lại mỗi khung). Bản nháp:
`--fps 30 --preset veryfast --crf 20`. Bản cuối: 60 fps, `slow`, CRF 16. Một bài 3 phút ở 60 fps là ~11k khung
— chạy nền và theo dõi dòng `frame n/N ... eta`.
