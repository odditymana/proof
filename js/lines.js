// 画像に重ねる線（比率グリッド・三分割・対角線）で共通に使うもの。

import { SVG_NS } from './overlay.js';

const LINE_COLORS = {
  white: '#ffffff',
  black: '#000000',
  magenta: '#ff00ff',
};

// 線の色と不透明度は、重ねる線すべてで共通。線をまとめたレイヤーにかける。
// 不透明度を線ごとではなくまとめてかけるのは、線が交わる点だけ濃くならないようにするため
export function applyLineStyle(layer, { color, opacity }) {
  layer.style.stroke = LINE_COLORS[color];
  layer.style.opacity = opacity / 100;
}

// 座標は画像の幅・高さに対する%（0〜100）
export function addLine(layer, x1, y1, x2, y2) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  layer.append(line);
}
