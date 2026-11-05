// 黄金螺旋：四分円をつないだ黄金螺旋（対数螺旋の近似）と、正方形の区切り線、当てはめた長方形の枠を引くレイヤー。
//
// - 画像を引き伸ばさず、画像からはみ出さないいちばん大きな黄金比の長方形を、巻き始めの角に寄せて当てはめる。
//   長方形の長辺は画像の長辺に合わせる（正方形の画像では横長）
// - 長方形から正方形を順に切り取り（8段で固定）、各正方形に、一辺を半径とする四分円を描いてつなぐ
// - 長方形の向きを決めると、巻き始めの角から回る向きは1つに決まる（4通り）
// - 螺旋の中心は、長方形の角から対角線に下ろした直角の線の足と同じ点（長方形の両端から 72.4% の位置）

import { SVG_NS } from './overlay.js';
import { GOLDEN } from './ratios.js';
import { addLine } from './lines.js';

const LEVELS = 8;
// 中心の位置：長方形の長辺・短辺それぞれ、巻き始めの角の側から φ²/(1+φ²) ≒ 72.4%
const POLE = (GOLDEN * GOLDEN) / (1 + GOLDEN * GOLDEN);

// 基準の形：横長、巻き始めは左下、時計回り。正方形は 左→上→右→下 の順に切り取る
function canonical(long, short) {
  let x = 0;
  let y = 0;
  let w = long;
  let h = short;
  const dividers = [];
  const arcs = [];
  for (let i = 0; i < LEVELS; i++) {
    const s = Math.min(w, h);
    let center;
    let start;
    switch (i % 4) {
      case 0: // 左の正方形。中心は右下の角、左下から右上へ
        dividers.push([x + s, y, x + s, y + h]);
        center = [x + s, y + s]; start = Math.PI;
        x += s; w -= s;
        break;
      case 1: // 上の正方形。中心は左下の角、左上から右下へ
        dividers.push([x, y + s, x + w, y + s]);
        center = [x, y + s]; start = -Math.PI / 2;
        y += s; h -= s;
        break;
      case 2: // 右の正方形。中心は左上の角、右上から左下へ
        dividers.push([x + w - s, y, x + w - s, y + h]);
        center = [x + w - s, y]; start = 0;
        w -= s;
        break;
      default: // 下の正方形。中心は右上の角、右下から左上へ
        dividers.push([x, y + h - s, x + w, y + h - s]);
        center = [x + s, y + h - s]; start = Math.PI / 2;
        h -= s;
    }
    const end = start + Math.PI / 2;
    arcs.push({
      r: s,
      from: [center[0] + s * Math.cos(start), center[1] + s * Math.sin(start)],
      to: [center[0] + s * Math.cos(end), center[1] + s * Math.sin(end)],
    });
  }
  return { dividers, arcs, pole: [long * POLE, short * POLE] };
}

// 画像の画素数と巻き始めの角（'tl' | 'tr' | 'bl' | 'br'）から、画素の座標で形を求める
export function spiralGeometry(width, height, corner) {
  const portrait = height > width;
  const long = Math.min(Math.max(width, height), Math.min(width, height) * GOLDEN);
  const short = long / GOLDEN;
  const rw = portrait ? short : long;
  const rh = portrait ? long : short;
  const right = corner === 'tr' || corner === 'br';
  const bottom = corner === 'bl' || corner === 'br';
  const rect = { x: right ? width - rw : 0, y: bottom ? height - rh : 0, w: rw, h: rh };

  // 基準の形（横長・左下から）を、縦長なら縦横を入れ替え（このとき巻き始めは右上になる）、
  // そこから選んだ角へ左右・上下に裏返す。入れ替え・裏返しのたびに回る向きが逆になる
  const from = portrait ? { right: true, bottom: false } : { right: false, bottom: true };
  const flipX = from.right !== right;
  const flipY = from.bottom !== bottom;
  const clockwise = (Number(portrait) + Number(flipX) + Number(flipY)) % 2 === 0;
  const map = ([u, v]) => {
    let [px, py] = portrait ? [v, u] : [u, v];
    if (flipX) px = rw - px;
    if (flipY) py = rh - py;
    return [rect.x + px, rect.y + py];
  };

  const shape = canonical(long, short);
  return {
    rect,
    clockwise,
    dividers: shape.dividers.map(([x1, y1, x2, y2]) => [...map([x1, y1]), ...map([x2, y2])]),
    arcs: shape.arcs.map(({ r, from: a, to: b }) => ({ r, from: map(a), to: map(b) })),
    pole: map(shape.pole),
  };
}

export function createGoldenSpiral(layer) {
  return {
    render({ visible, width, height, corner }) {
      layer.replaceChildren();
      if (!visible || !width || !height) return;
      const { rect, clockwise, dividers, arcs } = spiralGeometry(width, height, corner);
      // 座標は画像の幅・高さに対する%
      const px = (x) => (x / width) * 100;
      const py = (y) => (y / height) * 100;

      // 当てはめた長方形の枠
      const [l, t, r, b] = [px(rect.x), py(rect.y), px(rect.x + rect.w), py(rect.y + rect.h)];
      addLine(layer, l, t, r, t);
      addLine(layer, r, t, r, b);
      addLine(layer, r, b, l, b);
      addLine(layer, l, b, l, t);

      // 正方形の区切り線
      for (const [x1, y1, x2, y2] of dividers) addLine(layer, px(x1), py(y1), px(x2), py(y2));

      // 四分円をつないだ螺旋。重ねる表示は画像の縦横に合わせて伸ばしているので、
      // 円弧の横と縦の半径をそれぞれ画像の幅・高さで割り、画面の上で正しい円になるようにする
      const sweep = clockwise ? 1 : 0; // SVG（下向きが正）では 1 が時計回り
      const d = arcs.map(({ r, from, to }, i) =>
        `${i === 0 ? `M ${px(from[0])} ${py(from[1])} ` : ''}A ${px(r)} ${py(r)} 0 0 ${sweep} ${px(to[0])} ${py(to[1])}`,
      ).join(' ');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      layer.append(path);
    },
  };
}
