// 螺旋：黄金比または白銀比（1:√2）の長方形を分割していき、分割した区画ごとに円弧をつないだ曲線を引くレイヤー。
// 分割線と、当てはめた長方形の枠も一緒に引く。どちらも「分割線から作図どおりに決まる曲線」で、対数螺旋の近似。
//
// - 黄金螺旋：長方形から正方形を切り取っていき（8段）、各正方形に四分円を描いてつなぐ。
//   対数螺旋とのずれは最大で短辺の約1.2%
// - 白銀比の螺旋（A判の分割から作った螺旋）：長方形を半分に切ると同じ比率の長方形になる（A4→A5→A6）。
//   半分に切り続け（10段）、切り取った半分ごとに四分の一の楕円を描いてつなぐ。対数螺旋とのずれは最大で短辺の約2.6%
//
// 共通の決まり：
// - 画像を引き伸ばさず、画像からはみ出さないいちばん大きな長方形を、巻き始めの角に寄せて当てはめる。
//   長方形の長辺は画像の長辺に合わせる（正方形の画像では横長）
// - 長方形の向きを決めると、巻き始めの角から回る向きは1つに決まる（4通り）
// - 螺旋の中心は、長方形の角から対角線に下ろした直角の線の足と同じ点。
//   長方形の両端から 比率²/(1+比率²) の位置（黄金比 72.4%、白銀比 66.7%＝三分割の交点）

import { SVG_NS } from './overlay.js';
import { GOLDEN, SILVER } from './ratios.js';
import { addLine } from './lines.js';

// 黄金比は正方形を切り取り、白銀比は長辺を半分に切る。段の数は画面の大きさに関係なく固定
const KINDS = {
  golden: { ratio: GOLDEN, levels: 8 },
  silver: { ratio: SILVER, levels: 10 },
};

// 基準の形：横長、巻き始めは左下、時計回り。区画は 左→上→右→下 の順に切り取る。
// 各区画に、区画の角を中心とする四分の一の円（正方形）または楕円（半分の長方形）を描く
function canonical(kind, long, short) {
  const { levels } = KINDS[kind];
  let x = 0;
  let y = 0;
  let w = long;
  let h = short;
  const dividers = [];
  const arcs = [];
  for (let i = 0; i < levels; i++) {
    const side = i % 4;
    // 切り取る区画の幅（左右から切るとき）または高さ（上下から切るとき）
    const cut = kind === 'golden' ? Math.min(w, h) : (side % 2 === 0 ? w : h) / 2;
    let center;
    let rx;
    let ry;
    let start;
    switch (side) {
      case 0: // 左の区画。中心は区画の右下の角、左下から右上へ
        dividers.push([x + cut, y, x + cut, y + h]);
        center = [x + cut, y + h]; rx = cut; ry = h; start = Math.PI;
        x += cut; w -= cut;
        break;
      case 1: // 上の区画。中心は区画の左下の角、左上から右下へ
        dividers.push([x, y + cut, x + w, y + cut]);
        center = [x, y + cut]; rx = w; ry = cut; start = -Math.PI / 2;
        y += cut; h -= cut;
        break;
      case 2: // 右の区画。中心は区画の左上の角、右上から左下へ
        dividers.push([x + w - cut, y, x + w - cut, y + h]);
        center = [x + w - cut, y]; rx = cut; ry = h; start = 0;
        w -= cut;
        break;
      default: // 下の区画。中心は区画の右上の角、右下から左上へ
        dividers.push([x, y + h - cut, x + w, y + h - cut]);
        center = [x + w, y + h - cut]; rx = w; ry = cut; start = Math.PI / 2;
        h -= cut;
    }
    const end = start + Math.PI / 2;
    arcs.push({
      rx,
      ry,
      from: [center[0] + rx * Math.cos(start), center[1] + ry * Math.sin(start)],
      to: [center[0] + rx * Math.cos(end), center[1] + ry * Math.sin(end)],
    });
  }
  const r = KINDS[kind].ratio;
  const pole = (r * r) / (1 + r * r);
  return { dividers, arcs, pole: [long * pole, short * pole] };
}

// 画像の画素数と螺旋の種類（'golden' | 'silver'）、巻き始めの角（'tl' | 'tr' | 'bl' | 'br'）から、画素の座標で形を求める
export function spiralGeometry(kind, width, height, corner) {
  const { ratio } = KINDS[kind];
  const portrait = height > width;
  const long = Math.min(Math.max(width, height), Math.min(width, height) * ratio);
  const short = long / ratio;
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

  const shape = canonical(kind, long, short);
  return {
    rect,
    clockwise,
    dividers: shape.dividers.map(([x1, y1, x2, y2]) => [...map([x1, y1]), ...map([x2, y2])]),
    // 縦長では、楕円の横と縦の半径も入れ替わる
    arcs: shape.arcs.map(({ rx, ry, from: a, to: b }) => ({
      rx: portrait ? ry : rx,
      ry: portrait ? rx : ry,
      from: map(a),
      to: map(b),
    })),
    pole: map(shape.pole),
  };
}

export function createSpiral(layer) {
  return {
    render({ kind, width, height, corner }) {
      layer.replaceChildren();
      if (!KINDS[kind] || !width || !height) return;
      const { rect, clockwise, dividers, arcs } = spiralGeometry(kind, width, height, corner);
      // 座標は画像の幅・高さに対する%
      const px = (x) => (x / width) * 100;
      const py = (y) => (y / height) * 100;

      // 当てはめた長方形の枠
      const [l, t, r, b] = [px(rect.x), py(rect.y), px(rect.x + rect.w), py(rect.y + rect.h)];
      addLine(layer, l, t, r, t);
      addLine(layer, r, t, r, b);
      addLine(layer, r, b, l, b);
      addLine(layer, l, b, l, t);

      // 分割線
      for (const [x1, y1, x2, y2] of dividers) addLine(layer, px(x1), py(y1), px(x2), py(y2));

      // 円弧をつないだ螺旋。重ねる表示は画像の縦横に合わせて伸ばしているので、
      // 円弧の横と縦の半径をそれぞれ画像の幅・高さで割り、画面の上で作図どおりの形になるようにする
      const sweep = clockwise ? 1 : 0; // SVG（下向きが正）では 1 が時計回り
      const d = arcs.map(({ rx, ry, from, to }, i) =>
        `${i === 0 ? `M ${px(from[0])} ${py(from[1])} ` : ''}A ${px(rx)} ${py(ry)} 0 0 ${sweep} ${px(to[0])} ${py(to[1])}`,
      ).join(' ');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      layer.append(path);
    },
  };
}
