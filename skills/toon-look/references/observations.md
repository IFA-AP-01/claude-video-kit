# Quan sát look toon ở phim tham khảo

Phim "I Can Make Anything" (imaginativeprompting.com/wip, v160, 1280×720 30 fps), xem từng khung và đọc nhật ký WIP ngày 2026-10-18.
Ghi lại **kỹ thuật**; không chép nhân vật, motif, bảng màu của họ.

## Thấy được trên khung hình

- **Cel 2 tông + chấm in.** Hầu hết vật có tông sáng và tông bóng phẳng; ranh giới sắc nhưng có ~1 px mềm. Vùng bóng có lưới chấm
  tròn xoay chéo, kích thước chấm cố định theo màn hình (không co theo phối cảnh) và to dần ở chỗ tối hơn.
- **Đèn thế giới nhất quán.** Khi camera vòng quanh, ranh giới sáng–tối nằm yên trên vật — đèn không đi theo camera.
- **Nét mực có hue.** Viền là xanh than / nâu tối, không đen. Nét ngoài dày hơn nét trong; vật xa nét mảnh và nhạt dần về màu nền.
- **Nét ở nếp gấp và chỗ chồng nhau**, không chỉ silhouette: tay trước thân, mép hộp, mái nhà trước tường đều có nét.
- **Bóng có hue riêng** (lạnh dưới đèn ấm), không chỉ là màu gốc tối đi.
- **Không khí**: tòa nhà xa nhạt về màu trời, ít chấm, nét mảnh — chiều sâu đến từ đó, không thấy AO đậm.
- **Smear**: vật lao nhanh (nhân vật dẫn đường, mảnh vỡ) có một khung kéo dài theo hướng chạy, không có bóng mờ nhiều lớp.
- **Nhịp hoạt hình**: nhân vật có lúc đổi pose theo bậc (on twos) trong khi camera vẫn mượt.

## Từ nhật ký WIP của họ (diễn giải)

- Halftone từng **nhấp nháy** khi đèn hoặc camera đổi: cả mảng tường lật tông trong một khung. Họ sửa bằng cách làm mềm/ease
  đường chuyển đèn và kiểm bằng một công cụ quét khung tìm chỗ tông đổi đột ngột trên vùng phẳng → ý tưởng của `scripts/flicker.py`.
- Target dùng cho nét **không bật MSAA** (MSAA ở mép làm hỏng normal/ID, ra nét rác).
- Smear chỉ vẽ một lần mỗi khung; tắt khi vật chạy dọc trục nhìn.
- Mực được chọn là navy tối thay vì đen để hợp bảng màu.

## Ví dụ áp dụng (MV "I Don't Know What It Does")

- MV đó đã có một bản nhỏ của cùng ý: chữ 3D đùn với mặt phẳng, cạnh 2 tông + chấm 7 px 45°, nét `#17121C` từ normal + depth
  (`scenes/short-type.ts`). Skill tổng quát hoá nó cho cả cảnh (thêm ID, đèn thế giới, không khí, nét theo xa).
- Bảng màu, mực, màu bóng lấy từ `TREATMENT.md` / `engine/palette.ts` của dự án.
