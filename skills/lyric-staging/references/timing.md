# Thời điểm của lời: từ, âm tiết, và máy quay

## Nguồn
- `data/lyrics.json`: `lines[] → { i, section, text, start, end, words[] → { w, start, end, conf } }` (đọc qua `engine/lyrics.ts`:
  `lyrics.find('cụm lời', nth)`, `lineAt(t)`, `activeLine(t)`, `wordAt(t)`).
- `data/audio.json`: `beats`, `downbeats`, `onsets.vocal | kick | snare` dạng `[t, strength]`.
- Sai lệch lời → sửa `data/lyrics.fix.json` rồi chạy lại `analysis/align.py` (luật dự án), không bù giây trong code cảnh.

## Từ
Từ xuất hiện ở `w.start` (có thể sớm hơn 0.02–0.05 s để hiệu ứng vào kịp — mắt chậm hơn tai). Từ có `conf` thấp (< 0.5): kiểm tra bằng tai
ở preview trước khi treo gag lên nó.

## Âm tiết
Không có dữ liệu âm tiết sẵn. Cách lấy:
1. **Chia chữ thành âm tiết**: bảng override cho từ khóa (chính xác, viết tay) + heuristic nhóm nguyên âm cho phần còn lại.
   ```ts
   const SYL: Record<string, string[]> = { ANYTHING: ['AN', 'Y', 'THING'], AI: ['A', 'I'], STARTUPS: ['START', 'UPS'] };
   const DIG = ['TH', 'SH', 'CH', 'PH', 'WH', 'GH', 'CK', 'NG', 'QU'];
   const ONSET = new Set(['BL', 'BR', 'CL', 'CR', 'DR', 'FL', 'FR', 'GL', 'GR', 'PL', 'PR', 'SC', 'SK', 'SL', 'SM', 'SN', 'SP', 'ST', 'SW', 'TR', 'TW']);
   // digraph = một phụ âm; cụm phụ âm giữa hai nguyên âm nhường onset hợp lệ dài nhất cho âm tiết sau
   // (PA-RA-GRAPHS, WRAP-PER); e câm và -ed không thành âm ở lại âm tiết cuối (ONE, SHIPPED; không phải TABLE, AUTOMATED)
   function syllables(word: string): string[] {
     const W = word.toUpperCase().replace(/[^A-Z'-]/g, '');
     if (SYL[W]) return SYL[W];
     if (W.includes('-')) return W.split('-').filter(Boolean).flatMap(syllables);
     const tok: string[] = [];
     for (let i = 0; i < W.length; ) { const n = DIG.includes(W.slice(i, i + 2)) ? 2 : 1; tok.push(W.slice(i, i + n)); i += n; }
     const vow: boolean[] = [];
     tok.forEach((t, k) => vow.push('AEIOU'.includes(t) || (t === 'Y' && k > 0 && !vow[k - 1])));
     const nuc = vow.flatMap((v, k) => (v && (k === 0 || !vow[k - 1]) ? [k] : []));
     if (nuc.length < 2) return [W];
     const cuts = nuc.slice(1).map((b, j) => {
       let c0 = nuc[j]; while (vow[c0]) c0++;
       const cl = tok.slice(c0, b);
       return b - (cl.length >= 2 && ONSET.has(cl.slice(-2).join('')) ? 2 : Math.min(1, cl.length));
     });
     const parts = [0, ...cuts].map((x, j) => tok.slice(x, [...cuts, tok.length][j]).join(''));
     const last = parts[parts.length - 1].replace(/'?S$/, '');
     if ((/^[^AEIOUY]+E$/.test(last) && !/^[^AEIOUY]LE$/.test(last)) || /^[^AEIOUYTD]+ED$/.test(last)) parts.splice(-2, 2, parts.at(-2)! + parts.at(-1)!);
     return parts;
   }
   ```
2. **Mốc mỗi âm tiết**: lấy các `onsets.vocal` nằm trong `[w.start - 0.03, w.end]`.
   - Đủ ≥ n onset: âm tiết đầu = `w.start`, các âm tiết sau = (n − 1) onset mạnh nhất còn lại, sắp theo thời gian.
   - Thiếu: chia `[w.start, w.end]` theo tỉ lệ số chữ cái của âm tiết (âm tiết cuối thường kéo dài — cho nó phần còn lại).
   ```ts
   function sylTimes(w: Word, n: number, vocal: [number, number][]): number[] {
     const on = vocal.filter(([t]) => t > w.start + 0.06 && t <= w.end).sort((a, b) => b[1] - a[1]).slice(0, n - 1).map(([t]) => t).sort((a, b) => a - b);
     if (on.length === n - 1) return [w.start, ...on];
     const d = (w.end - w.start) / n; return Array.from({ length: n }, (_, j) => w.start + j * d);
   }
   ```
   Tính một lần lúc init (là dữ liệu, không phải trạng thái), lưu trong cảnh.
3. `scripts/word_onsets.py "<cụm lời>"` in ra bảng này để kiểm bằng mắt trước khi code.

## Snap
- Gag "đập" / nén (flat, AUTOMATED dấu đập): snap vào **beat hoặc downbeat gần `w.start` nhất** nếu lệch ≤ 0.12 s, nếu không thì giữ `w.start`.
- Chữ mọc thường: theo `w.start` (giọng hát hay lệch nhịp — chữ theo giọng, không theo trống).
- Camera kick khi chữ đập: cùng thời điểm với pha "đập" của chữ, không phải theo beat riêng.

## Phối hợp với máy quay
Viết bảng lời và bảng cú máy (skill `camera-motion`) cùng lúc:
- **Phát hiện câu**: cú máy kết thúc ≤ `line.words[0].start` (hoặc lia ngang qua chỗ câu đứng đúng lúc đó). Từ đầu tiên luôn trong khung khi được hát.
- **Từ khóa đứng yên**: đặt hold (hoặc chân đường tốc độ) quanh `w.start` của từ khóa, ít nhất `[start − 0.1, end + 0.15]`.
- **Cú tiếp theo** có thể bắt đầu từ giữa từ cuối câu — câu trượt ra khỏi khung theo máy là cách rời đi rẻ nhất.
- Kiểm tra: in `cam(t)` ra màn hình của hộp bao câu ở `words[0].start` và ở từ khóa — phải nằm trong vùng an toàn (cách mép ≥ 5% khung).
