// 比率グリッド：黄金比・白銀比の位置に線を引くレイヤー。
// どちらの比率も「長い部分：短い部分＝比率：1」に分ける。

import { GOLDEN, SILVER } from './ratios.js';
import { addLine } from './lines.js';

// 短い部分が全体に占める割合（%）
const SHORT_PART = {
  golden: 100 / (1 + GOLDEN), // 38.2%
  silver: 100 / (1 + SILVER), // 41.4%
};

export function shortPart(type) {
  return SHORT_PART[type];
}

// 引く線の一覧 [x1, y1, x2, y2]（座標は画像の幅・高さに対する%）
export function gridLines({ type, mode, side }) {
  if (type === 'none') return [];

  const s = SHORT_PART[type];
  // 両側：縦横それぞれ、両端から短い部分の位置に線
  // 片側：選んだ辺から短い部分の位置に1本だけ線
  const { xs, ys } = mode === 'both'
    ? { xs: [s, 100 - s], ys: [s, 100 - s] }
    : {
      left: { xs: [s], ys: [] },
      right: { xs: [100 - s], ys: [] },
      top: { xs: [], ys: [s] },
      bottom: { xs: [], ys: [100 - s] },
    }[side];

  return [
    ...xs.map((x) => [x, 0, x, 100]),
    ...ys.map((y) => [0, y, 100, y]),
  ];
}

export function createGrid(layer) {
  return {
    render(settings) {
      layer.replaceChildren();
      for (const line of gridLines(settings)) addLine(layer, ...line);
    },
  };
}
