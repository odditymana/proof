// 対角線：画像の対角線2本と、4つの角から対角線に直角に交わる線4本を引くレイヤー。
// 直角の線は、反対側の長辺まで延ばす。直角の線は、画像と同じ比率の長方形を切り取る。
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

export function createDiagonals(layer) {
  return {
    render({ visible, width, height }) {
      layer.replaceChildren();
      if (!visible || !width || !height) return;

      const h = perpendicularHit(width, height);
      // 横長として [x1, y1, x2, y2] を並べ、縦長なら縦横を入れ替える
      const lines = [
        [0, 0, 100, 100], // 左上→右下の対角線
        [100, 0, 0, 100], // 右上→左下の対角線
        [100, 0, 100 - h, 100], // 右上の角から、左上→右下の対角線に直角に
        [0, 100, h, 0], // 左下の角から、左上→右下の対角線に直角に
        [0, 0, h, 100], // 左上の角から、右上→左下の対角線に直角に
        [100, 100, 100 - h, 0], // 右下の角から、右上→左下の対角線に直角に
      ];
      const portrait = height > width;
      for (const [x1, y1, x2, y2] of lines) {
        if (portrait) addLine(layer, y1, x1, y2, x2);
        else addLine(layer, x1, y1, x2, y2);
      }
    },
  };
}
