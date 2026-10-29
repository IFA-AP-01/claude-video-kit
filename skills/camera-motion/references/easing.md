# Đường cong chuyển động dạng công thức đóng

Mọi hàm ở đây là hàm thuần của tiến độ `x ∈ [0,1]` (hoặc của `t`), không mô phỏng, không state — đúng luật render tất định.
`engine/ease.ts` đã có `clamp`, `lerp`, `prog`, `expoOut`, `cubicOut`, `cubicInOut`. Thêm các hàm dưới đây vào đó khi cần
(thay đổi engine → nói rõ trong báo cáo).

```ts
/** Vị trí của một cú hình chuông: vận tốc = 30x²(1-x)², bằng 0 ở hai đầu, đỉnh ở giữa (smootherstep). */
export const bell = (x: number) => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };

/** Lấy đà: lùi về -s (≈ 0.1) trước khi lao tới (backIn). */
export const anticip = (x: number, s = 1.70158) => { x = clamp(x); return x * x * ((s + 1) * x - s); };

/** Lấy đà + về đích mượt: lùi nhẹ ở đầu, hình chuông ở sau. */
export const windUp = (x: number, back = 0.08, split = 0.25) =>
  x < split ? -back * Math.sin((Math.PI * x) / split) : bell((x - split) / (1 - split));

/** Vượt đích rồi nằm yên: lò xo tắt dần dạng đóng. zeta ~0.35–0.5 (nảy 1–2 lần), freq = số dao động trong cú. */
export const swingSettle = (x: number, zeta = 0.4, freq = 1.6) => {
  x = clamp(x);
  if (x >= 1) return 1;
  const w = 2 * Math.PI * freq, k = 6 * zeta; // k: tốc độ tắt (về ~0 khi x→1)
  return 1 - Math.exp(-k * x) * Math.cos(w * x) * (1 - x * x * x); // nhân (1-x³) để chắc chắn = 1 ở x = 1
};

/** Build: đẩy vào tăng tốc dần, nhanh nhất ngay trước đích (flash/cắt ở x = 1). */
export const buildIn = (x: number, p = 3) => Math.pow(clamp(x), p);

/** Rung va chạm: tổng các kick, mỗi kick là sin tắt dần bắt đầu ở tk. amp theo đơn vị cảnh, dur ≈ 0.25–0.4 s. */
export function kick(t: number, kicks: { t: number; amp: number }[], seed: number, dur = 0.3, freq = 14) {
  let x = 0, y = 0;
  kicks.forEach((k, i) => {
    const u = t - k.t;
    if (u < 0 || u > dur) return;
    const a = k.amp * Math.exp((-5 * u) / dur);
    const ph = hash(seed, i) * Math.PI * 2; // hash từ engine/rand.ts
    x += a * Math.sin(2 * Math.PI * freq * u + ph);
    y += a * Math.cos(2 * Math.PI * freq * 0.83 * u + ph);
  });
  return { x, y };
}
```

## Cách dùng theo loại cú

| Loại | Hàm | Độ dài điển hình (117.5 bpm, beat ≈ 0.511 s) |
|---|---|---|
| punch | `bell` hoặc `expoOut` trên dolly, không pan | 0.4–0.6 beat |
| swing (lia + kéo) | `bell` cho cả hai trục, đích trên downbeat của từ chính | 1–1.5 beat |
| build | `buildIn(x, 3)` trên log-khoảng cách | 4–8 beat |
| settle sau va chạm | `swingSettle` | 1–2 beat |
| kick | `kick()` cộng vào vị trí/hướng nhìn | 0.25–0.4 s |
| hold | giữ pose; có thể thêm drift rất nhỏ (< 2% tốc độ cú) để không chết | — |

## Lưu ý

- **Dolly theo log-khoảng cách** (`d = d0 * Math.pow(d1 / d0, f(x))`) để tốc độ cảm nhận đều khi lao vào gần vật.
- **Orbit theo góc**, không nội suy vị trí thẳng (sẽ cắt qua tâm).
- **Ghép trục:** dùng cùng `x` cho hai trục ngược chiều (pan trái + kéo ra) để đỉnh tốc độ trùng nhau.
- **Kết thúc cú trên beat:** `t1 = audio.beats[i]` hoặc downbeat của từ (`cut()` / `lyrics.word(...).start` snap về beat); `t0 = t1 - n * beat_period`.
- Kick và rung lấy pha từ `hash(seed, i)` — không dùng `Math.random`.
