# Đo chuyển động một video đang stream (không tải về)

Dùng khi video tham khảo chỉ có trên web. Mở URL file video trực tiếp trong trình duyệt tích hợp (để trang và video cùng origin,
canvas không bị "tainted"), rồi chạy các đoạn JS dưới đây bằng công cụ javascript của trình duyệt.

Bẫy đã gặp: tua tới `n/30` rơi đúng ranh giới khung → cứ 3 mẫu có 1 mẫu trùng, đường cong ra răng cưa giả.
**Luôn tua vào giữa khung: `(n + 0.5) / fps`.** Kiểm tra fps thật bằng `requestVideoFrameCallback` (hiệu `mediaTime` giữa các khung).

## 1. Chuyển động máy (pan X/Y + zoom) theo từng khung

```js
const v = document.querySelector('video'); v.pause();
const W = 128, H = 72, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const g = cv.getContext('2d', { willReadFrequently: true });
async function grab(t) {
  v.currentTime = t; await new Promise(r => v.addEventListener('seeked', r, { once: true }));
  g.drawImage(v, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = 0.299 * d[4*i] + 0.587 * d[4*i+1] + 0.114 * d[4*i+2]; return a;
}
function sample(a, x, y) { if (x < 0 || y < 0 || x > W-1 || y > H-1) return NaN;
  const x0 = x|0, y0 = y|0, fx = x-x0, fy = y-y0, i = y0*W+x0, x1 = Math.min(x0+1, W-1)-x0, y1 = (Math.min(y0+1, H-1)-y0)*W;
  return (a[i]*(1-fx) + a[i+x1]*fx)*(1-fy) + (a[i+y1]*(1-fx) + a[i+y1+x1]*fx)*fy; }
function err(A, B, dx, dy, s) { let e = 0, n = 0;
  for (let y = 6; y < H-6; y += 2) for (let x = 6; x < W-6; x += 2) {
    const b = sample(B, (x-W/2)*s + W/2 + dx, (y-H/2)*s + H/2 + dy); if (b !== b) continue; e += Math.abs(A[y*W+x] - b); n++; }
  return n > 200 ? e/n : 1e9; }
window.motion = async (t0, t1, fps = 30) => {
  const out = [], f0 = Math.round(t0*fps), f1 = Math.round(t1*fps); let A = await grab((f0+0.5)/fps);
  for (let f = f0+1; f <= f1; f++) { const B = await grab((f+0.5)/fps); let best = { e: 1e9, dx: 0, dy: 0, s: 1 };
    for (const s of [0.9, 0.94, 0.97, 1, 1.03, 1.06, 1.1]) for (let dy = -10; dy <= 10; dy += 2) for (let dx = -14; dx <= 14; dx += 2) {
      const e = err(A, B, dx, dy, s); if (e < best.e) best = { e, dx, dy, s }; }
    const b0 = best; for (const s of [b0.s-0.01, b0.s, b0.s+0.01]) for (let dy = b0.dy-1.5; dy <= b0.dy+1.5; dy += 0.5) for (let dx = b0.dx-1.5; dx <= b0.dx+1.5; dx += 0.5) {
      const e = err(A, B, dx, dy, s); if (e < best.e) best = { e, dx, dy, s }; }
    let diff = 0; for (let i = 0; i < W*H; i++) diff += Math.abs(A[i] - B[i]);
    out.push({ t: f/fps, dx: best.dx, dy: best.dy, s: best.s, diff: diff/(W*H) }); A = B; }
  return window.lastMotion = out; };
```

`dx, dy` ở đơn vị 128 px → nhân `videoWidth/128` để ra px thật. `ln(s)` > 0 = đẩy vào.

## 2. Onset âm thanh (phát thời gian thực, không nối ra loa)

```js
const actx = new AudioContext(), src = actx.createMediaElementSource(v), an = actx.createAnalyser();
an.fftSize = 1024; an.smoothingTimeConstant = 0; src.connect(an); // không connect destination → im lặng
v.muted = false; // muted = true làm analyser nhận toàn số 0
window.onsets = async (t0, t1) => { v.currentTime = t0; await new Promise(r => v.addEventListener('seeked', r, { once: true }));
  const bins = new Float32Array(an.frequencyBinCount), out = []; let prev = null; await actx.resume(); await v.play();
  await new Promise(res => { const step = () => { an.getFloatFrequencyData(bins);
    const mag = Array.from(bins, x => 10 ** (x / 20)); let flux = 0;
    if (prev) for (let i = 1; i < mag.length; i++) { const d = mag[i] - prev[i]; if (d > 0) flux += d; }
    out.push({ t: v.currentTime, flux }); prev = mag;
    if (v.currentTime >= t1) { v.pause(); res(); } else requestAnimationFrame(step); }; requestAnimationFrame(step); });
  return window.lastOn = out; };
```

Độ chính xác thời gian ~±30 ms (theo rAF). Đỉnh onset: flux > 2.2× trung bình và là cực đại cục bộ.

## 3. Vẽ

Vẽ các làn (tốc độ = hypot(dx,dy), pan X có dấu, zoom = ln(s), diff, flux + vạch onset) lên một canvas phủ toàn trang rồi chụp màn hình.
Một ảnh biểu đồ là đủ — không chụp hàng loạt khung.
