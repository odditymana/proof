// 対角線と、対角線に直角に交わる線。それぞれ別のレイヤーに引く。
// - 対角線：画像の対角線2本
// - 直角の線：4つの角から対角線に直角に交わる線4本。反対側の長辺まで延ばす。
//   この線は、画像と同じ比率の長方形を切り取る
//
// 重ねる表示は画像の縦横に合わせて伸ばしている（座標は%）が、線の端の位置を
// 画像の実際の縦横比から計算するので、画像の上では直角になる。

import { addLine } from './lines.js';

// 直角の線が長辺と交わる位置：長辺の端から何%か（＝（短辺÷長辺）の2乗）。
// 白銀比の画像では50%、黄金比の画像では38.2%。正方形では100%（もう一方の対角線と重なる）
export function perpendicularHit(width, height) {
  const k = Math.min(width, height) / Math.max(width, height);
  return k * k * 100;
}

// 横長として [x1, y1, x2, y2] で決めた線を、縦長なら縦横を入れ替える
function orient(lines, width, height) {
  if (height <= width) return lines;
  return lines.map(([x1, y1, x2, y2]) => [y1, x1, y2, x2]);
}

// 対角線の一覧 [x1, y1, x2, y2]（座標は画像の幅・高さに対する%）
export function diagonalLines(width, height) {
  return orient([
    [0, 0, 100, 100], // 左上→右下
    [100, 0, 0, 100], // 右上→左下
  ], width, height);
}

// 直角の線の一覧 [x1, y1, x2, y2]（座標は画像の幅・高さに対する%）
export function perpendicularLines(width, height) {
  const h = perpendicularHit(width, height);
  return orient([
    [100, 0, 100 - h, 100], // 右上の角から、左上→右下の対角線に直角に
    [0, 100, h, 0], // 左下の角から、左上→右下の対角線に直角に
    [0, 0, h, 100], // 左上の角から、右上→左下の対角線に直角に
    [100, 100, 100 - h, 0], // 右下の角から、右上→左下の対角線に直角に
  ], width, height);
}

export function createDiagonals(layer) {
  return {
    render({ visible, width, height }) {
      layer.replaceChildren();
      if (!visible || !width || !height) return;
      for (const line of diagonalLines(width, height)) addLine(layer, ...line);
    },
  };
}

export function createPerpendiculars(layer) {
  return {
    render({ visible, width, height }) {
      layer.replaceChildren();
      if (!visible || !width || !height) return;
      for (const line of perpendicularLines(width, height)) addLine(layer, ...line);
    },
  };
}
