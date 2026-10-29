# Kiểu xuất hiện / rời đi của chữ (công thức đóng)

Tất cả là hàm của `t` và các mốc từ `lyrics.json`. Ease dùng chung với camera: `bell`, `anticip`, `windUp`, `swingSettle`, `kick`
(định nghĩa ở `camera-motion/references/easing.md`; đặt trong `engine/ease.ts`), cùng `prog`, `expoOut`, `cubicOut` có sẵn.
`hash` từ `engine/rand.ts`. Thời lượng mặc định giả định ~117 bpm (beat ≈ 0.51 s); nhịp khác thì tỉ lệ theo beat.

## 1. Mọc lên khỏi mặt, vượt qua thẳng đứng rồi lắng lại
Chữ nằm sát mặt đỡ (sàn, nóc, mép giấy), pivot ở chân chữ, dựng dậy khi được hát.
```ts
const u = prog(t, w.start - 0.04, w.start + 0.42);    // bắt đầu ngay trước tiếng hát một chút
mesh.rotation.x = -Math.PI / 2 * (1 - swingSettle(u, 0.42, 1.4));   // -90° (nằm) → 0, vượt qua ~8° rồi về
```
Từ dài / cả câu: mỗi từ một mesh, `start` theo từ — câu dựng dậy như hàng domino ngược theo giọng hát.

## 2. Dựng theo âm tiết
Từ khóa dài (AN-Y-THING, AU-TO-MA-TED) mọc từng phần đúng từng âm tiết. Chia chữ cái theo âm tiết và mốc âm tiết ở `references/timing.md`.
```ts
syl.forEach((s, j) => {
  const u = prog(t, s.t, s.t + 0.2);
  for (const m of s.letters) { m.scale.y = swingSettle(u, 0.4, 1.2); m.position.y = (1 - expoOut(u)) * -0.3 * em; }
});
```
Âm tiết cuối thường được hát dài/nhấn → cho nó to hơn 5–10% hoặc thêm kick nhẹ.

## 3. Vẽ viền → tô → đập → lắng, kèm camera kick
Cho từ khóa đỉnh của câu. Bốn pha trong ~1 beat:
| pha | khoảng (so với `w.start`) | làm gì |
|---|---|---|
| vẽ viền | −0.30 → −0.05 | nét ngoài chạy theo đường viền chữ (dash offset hoặc mặt nạ theo độ dài cung) — *lấy đà*, trước tiếng hát |
| tô | −0.05 → +0.05 | mặt chữ đầy màu (alpha / mặt nạ quét) |
| đập | +0.00 → +0.12 | scale 1.18 → 1 với `swingSettle`, hoặc chữ rơi 0.3 em xuống mặt đỡ |
| lắng | → +0.45 | rung tắt dần; `kick()` cho camera ở `w.start` với amp nhỏ |

```ts
const draw = prog(t, w.start - 0.30, w.start - 0.05);       // 0..1 độ dài viền
const fill = prog(t, w.start - 0.05, w.start + 0.05);
const hit = swingSettle(prog(t, w.start, w.start + 0.45), 0.35, 2);
const s = 1.18 - 0.18 * hit;
camKicks.push({ t: w.start, amp: 0.012 });                  // gom vào danh sách kick của cam(t)
```
Viền vẽ trước tiếng hát là cố ý: mắt đã nhìn đúng chỗ khi từ vang lên. Dùng cho từ có onset mạnh (`onsets.vocal` strength cao hoặc trùng kick/snare).

## 4. Đặc dần / tan bay lên
Cho chất liệu hạt, khói, mây (media §6), hoặc câu rời đi.
```ts
// mỗi hạt i có x chuẩn hoá trong từ (0..1) và hash riêng
const appear = prog(t, w.start + x * 0.15 - 0.05, w.start + x * 0.15 + 0.2);   // đặc dần trái → phải
const leave = prog(t, lineEnd + 0.3 + hash(i, 7) * 0.4, lineEnd + 1.2 + hash(i, 7) * 0.4);
r = R * cubicOut(appear) * (1 - leave);
y += leave * leave * (0.8 + hash(i, 3)) * em;               // bay lên tăng tốc
```

## 5. Lật từng chữ cái (flip-up, so le)
Chữ cái nằm úp, lật dậy quanh trục chân với độ trễ theo thứ tự — bản chạy thật: `Type3D` trong MV "I Don't Know What It Does" (`scenes/short-type.ts`: so le `j * 0.025` + lắc nghiêng theo `hash`).
```ts
const u = prog(t, w.start + j * 0.025, w.start + j * 0.025 + 0.22);
m.rotation.x = (1 - swingSettle(u, 0.45, 1.3)) * -Math.PI / 2;
m.rotation.z = (1 - u) * (hash(seed, j) - 0.5) * 0.3;
```
Độ so le × số chữ ≤ ~0.2 s, nếu không từ đọc xong sau khi đã hát xong.

## 6. Pop đơn giản (mặc định cho từ thường)
`arrive(t, w.start)` của `engine/lyric.ts` (expo-out 0.16 s), scale từ 0.85 và alpha từ 0. Đây là "giọng nền" — các kiểu trên chỉ nổi bật vì phần lớn từ dùng kiểu này.

## Rời đi
Chọn theo thế giới, không mặc định fade:
- **Ở lại làm trang trí** (media §9) — mặc định cho one-shot.
- **Bị vật kế tiếp tác động**: dấu đập dẹt, bị đẩy khỏi khung, rơi khỏi mép giấy (`anticip` rồi rơi `t²`).
- **Trượt ra theo chuyển động máy** (chữ đứng yên, máy đi) — miễn phí và tự nhiên nhất.
- **Tan bay** (§4) cho kết câu nhẹ.
- Fade alpha chỉ dùng khi chữ ở lớp HUD thuần.

## Gag theo nghĩa từ (ví dụ từ MV "I Don't Know What It Does")
| từ | gag | snap vào |
|---|---|---|
| flat | scaleY 1 → 0.25, scaleX 1 → 1.3, nảy lại một nửa | downbeat gần `start` nhất |
| sky-high / fly | bay vọt lên khỏi khung, `anticip` 0.1 s trước | `start` |
| sinking | tụt chậm theo vật chìm, mất bão hòa | kéo dài tới `end` |
| not | lắc ngang 3 lần tắt dần (`kick` theo x) | `start` |
| paying / BILL | đổi sang Invoice Red, to vượt khung | `start` |
