// REFERENCE ONLY (not compiled): a real two-beat scene from the first Paper Vox Short
// (tesla roadster/app/src/scenes/history.ts). Shows at(), cutAt(), Headline, Cutout+halftone,
// Stamp+shake, Tape, clipping, photoPrint, Rig keys and cue() for a looping SFX.
// The *-art imports are that project's canvas helpers; not part of the template.

// "history" ('Công nghệ quạt hút' → 'Dù màn trình diễn'): the fan car is not new.
//   H1 green — "QUẠT HÚT / KHÔNG MỚI" over a spinning fan on a halftone disc; "<< TUA LẠI" tag
//              sends the camera back to 1978
//   H2 green — "19 78" lands digit pair by digit pair, a sepia 1978 clipping (fictional paper),
//              a sepia halftone print of a generic F1 fan car (hand-drawn, no livery) with the fan
//              called out, "THẮNG" stamp on "thắng", then a big red "BỊ CẤM" on "cấm"
// Every time below is a word start from data/words.json (`at()`), beat starts are `cutAt()`.
import * as THREE from 'three';
import { BeatScene, popCut, popObj, type Beat } from '../engine/beats';
import { C } from '../engine/palette';
import { Cutout } from '../engine/cutout';
import { Headline } from '../engine/headline';
import { Stamp, shake } from '../engine/stamp';
import { Tape } from '../engine/tape';
import { clipping } from '../engine/clipping';
import { Rig, Z, place } from '../engine/parallax';
import { stepped } from '../engine/rand';
import { cue, screenX } from '../engine/cues';
import { cutAt } from '../timeline';
import { arrowCanvas, discCanvas, flat, photoPrint, tag } from '../engine/art';
import { fanCanvas } from './style-art';
import { SEPIA, fanCarCanvas } from './history-art';

const BODY =
  'Chiếc xe đua mang một chiếc quạt lớn ở đuôi, hút không khí từ gầm xe ra phía sau. Áp suất dưới gầm giảm, ' +
  'thân xe bị ép chặt xuống mặt đường và vào cua nhanh hơn hẳn các đối thủ.\n' +
  'Ngay trong lần ra quân đầu tiên, chiếc xe đã về nhất. Các đội đua khác lập tức phản đối, cho rằng chiếc quạt ' +
  'thổi bụi và sỏi vào xe phía sau, và đây là một thiết bị khí động học di chuyển được.\n' +
  'Ban tổ chức xem xét khiếu nại. Chiếc xe không bao giờ còn được thi đấu nữa, và giải pháp quạt hút bị cấm từ đó.';

export default class History extends BeatScene {
  async init() {
    this.base(['quạt hút', 'hoàn toàn mới', '1978', 'chiến thắng', 'bị cấm']);
    this.addBeats([this.notNew(), this.year1978()]);
  }

  // ------------------------------------------------------------------ H1 green: not new
  private notNew(): Beat {
    const L = 'Công nghệ quạt hút';
    const T = {
      quat: this.at(L, 'quạt'), hut: this.at(L, 'hút'), khong: this.at(L, 'không'),
      hoan: this.at(L, 'hoàn'), moi: this.at(L, 'mới'),
    };
    const t0 = this.ctx.entry.start;
    const t1 = cutAt(this.ctx.words, 'Năm một nghìn');
    const g = new THREE.Group();

    const disc = new Cutout(discCanvas(640), {
      torn: 7, tornFreq: 1 / 40, rim: 5, paper: C.paper, lift: 10, shadow: 0.22, jitter: 0.8, seed: 601,
      halftone: { color: C.yellow, ink: C.ink, cell: 16, angle: 20, contrast: 1 },
    });
    place(disc.group, -70, -110, Z.CLIP);
    const fan = flat(fanCanvas(400, 7));
    place(fan, -70, -110, Z.PHOTO);

    const head = new Headline([['QUẠT', 'HÚT'], ['KHÔNG', 'MỚI']], {
      size: 150, seed: 602,
      strips: [{ bg: C.white, fg: C.ink }, { bg: C.ink, fg: C.white }, { bg: C.yellow, fg: C.ink }, { bg: C.red, fg: C.white }],
    });
    head.times = [T.quat, T.hut, T.khong, T.moi];
    place(head.group, -70, 480, Z.DIAGRAM + 20);

    const back = tag('<< TUA LẠI', C.ink, C.yellow, 34, { seed: 603, lift: 14 });
    place(back.group, 170, -360, Z.FRONT);
    back.group.rotation.z = 0.05;

    g.add(disc.group, fan, head.group, back.group);
    const rig = new Rig([
      { t: t0, x: -10, y: 40, roll: -0.3 }, { t: T.khong, x: 0, y: 80, push: 40 }, { t: t1, x: 20, y: 40, push: 55, roll: 0.3 },
    ]);
    const db = disc.group.scale.x, fb = fan.scale.x, bb = back.group.scale.x;

    return {
      t0, color: C.green, group: g, rig,
      update: (t) => {
        popCut(disc, t, t0, db);
        popObj(fan, t, T.quat, fb);
        cue('fan', T.quat, { id: fan, x: screenX(fan), dur: t1 - T.quat + 0.3, gain: 0.5 });
        fan.rotation.z = -Math.max(0, stepped(t) - T.quat) * 5.2;
        head.update(t);
        popCut(back, t, T.hoan, bb);
        return {};
      },
    };
  }

  // ------------------------------------------------------------------ H2 green: 1978, won, banned
  private year1978(): Beat {
    const L = 'Năm một nghìn';
    const T = {
      nghin: this.at(L, 'nghìn'), bay: this.at(L, 'bảy'), chiec: this.at(L, 'chiếc'),
      cong: this.at(L, 'Công'), thuc: this.at(L, 'thức'), quat: this.at(L, 'quạt'),
      thang: this.at(L, 'thắng'), lan: this.at(L, 'lần'), cam: this.at(L, 'cấm'),
    };
    const t0 = cutAt(this.ctx.words, L);
    const g = new THREE.Group();

    const year = new Headline([['19', '78']], {
      size: 190, seed: 611, gap: 8,
      strips: [{ bg: C.yellow, fg: C.ink }, { bg: C.white, fg: C.ink }],
    });
    year.times = [T.nghin, T.bay];
    place(year.group, -220, 650, Z.DIAGRAM + 20);

    // fictional paper, sepia; the photo is a separate print taped over its lower half
    const clip = clipping({
      w: 760, height: 700, masthead: 'NHẬT BÁO TỐC ĐỘ', dateline: 'Năm 1978 · Số đặc biệt',
      kicker: 'Công thức 1', headline: 'Xe dùng quạt hút thắng ngay lần ra quân',
      deck: 'Chiếc quạt sau đuôi hút khí dưới gầm, ép thân xe xuống mặt đường.',
      body: BODY, ink: SEPIA.ink, paper: SEPIA.paper, cutout: { seed: 612 },
    });
    place(clip.group, -40, 230, Z.PHOTO, 0.72);
    clip.group.rotation.z = 0.025;

    const car = fanCarCanvas();
    const print = photoPrint(car, { color: SEPIA.dot, ink: SEPIA.ink, paper: SEPIA.paper, cell: 7, angle: 15, contrast: 1.2 },
      { paper: SEPIA.paper, seed: 613 });
    place(print.group, -70, -170, Z.PHOTO + 40, 0.74);
    print.group.rotation.z = -0.03;
    print.attach(new Tape(150, 44, -24, 614).mesh, -230, 40, 6);
    print.attach(new Tape(150, 44, 22, 615).mesh, 250, -10, 6);
    // fan callout, in print px (the fan housing sits at the tail, x ≈ 60 in the drawing)
    const fx = 62 - car.width / 2, fy = car.height / 2 - (car.height - 18 - 112);
    const point = new Cutout(arrowCanvas(110, C.yellow, 26, 616), { border: 0, torn: 0, lift: 8, paper: C.yellow, seed: 616 });
    point.group.rotation.z = Math.PI / 2;
    print.attach(point.group, fx, fy - 170, 8);
    const fanTag = tag('QUẠT HÚT', C.yellow, C.ink, 40, { seed: 617, lift: 14 });
    print.attach(fanTag.group, fx + 60, fy - 270, 9);

    const f1 = tag('CÔNG THỨC 1', C.red, C.white, 30, { seed: 618 });
    place(f1.group, 210, -50, Z.FRONT);
    f1.group.rotation.z = 0.05;

    const won = new Stamp([{ text: 'THẮNG', size: 120 }], C.green, -10, 619);
    const wonHold = place(new THREE.Group(), 20, 350, Z.DIAGRAM + 30);
    wonHold.add(won.group);
    const first = tag('LẦN RA QUÂN ĐẦU TIÊN', C.ink, C.white, 24, { seed: 620 });
    place(first.group, 60, 240, Z.FRONT);
    first.group.rotation.z = -0.03;

    const ban = new Stamp([{ text: 'BỊ CẤM', size: 190 }], C.red, 8, 621);
    const banHold = place(new THREE.Group(), -60, 80, Z.FRONT + 30);
    banHold.add(ban.group);

    g.add(year.group, clip.group, print.group, f1.group, wonHold, first.group, banHold);
    const t1 = this.ctx.entry.end;
    const rig = new Rig([
      { t: t0, x: -30, y: 140, roll: -0.3 }, { t: T.chiec, x: -30, y: 60, push: 30 },
      { t: T.thang, x: 20, y: 60, push: 50 }, { t: T.cam, x: 0, y: 30, push: 60 },
      { t: t1, x: 0, y: 20, push: 80, roll: 0.3 },
    ]);
    const b = [clip, print, f1, first].map((c) => c.group.scale.x);
    const pb = point.group.scale.x, tb = fanTag.group.scale.x;

    return {
      t0, color: C.green, group: g, rig,
      update: (t) => {
        year.update(t);
        popCut(clip, t, T.chiec, b[0]);
        popCut(print, t, T.cong, b[1]);
        popCut(f1, t, T.thuc, b[2]);
        popCut(point, t, T.quat, pb);
        popCut(fanTag, t, T.quat + 1 / 12, tb);
        won.slam(t, T.thang, 0.8);
        popCut(first, t, T.lan, b[3]);
        ban.slam(t, T.cam, 1);
        const s = shake(t, T.thang, 12, 21), s2 = shake(t, T.cam, 24, 22);
        return { x: s.x + s2.x, y: s.y + s2.y };
      },
    };
  }
}
