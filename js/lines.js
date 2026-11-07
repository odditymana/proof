// 画像に重ねる線（比率グリッド・補助線・螺旋）で共通に使うもの。

import { SVG_NS } from './overlay.js';

const LINE_COLORS = {
  white: '#ffffff',
  black: '#000000',
  magenta: '#ff00ff',
  outline: '#ffffff', // 縁取り：白い線に黒い縁を付ける。明るい背景では縁が、暗い背景では白い線が見える
};

// 縁の黒の不透明度。100% だと明るい背景で白い線が溶け、黒い細線が2本並んだように見えるため薄くする。
// 60% でも、計測したどの背景でも白い線か縁のどちらかが 3:1 以上になる（CLAUDE.md の「線の色の縁取り」）
const CASING_OPACITY = 0.6;

// 線の色の選択から、線の色と縁の色・縁の不透明度を決める。縁を付けないときは casing が null
export function lineStyle(color) {
  const outline = color === 'outline';
  return {
    stroke: LINE_COLORS[color],
    casing: outline ? '#000000' : null,
    casingOpacity: outline ? CASING_OPACITY : null,
  };
}

// 線の色と不透明度は、重ねる線すべてで共通。線をまとめたレイヤーにかける。
// 不透明度を線ごとではなくまとめてかけるのは、線が交わる点だけ濃くならないようにするため
export function applyLineStyle(layer, { color, opacity }) {
  layer.style.stroke = lineStyle(color).stroke;
  layer.style.opacity = opacity / 100;
}

// 縁取り：線のレイヤーを要素ごとコピーし、縁のレイヤーに黒い太い線として描く。
// 縁のレイヤーは線全体のレイヤーの中で、線より下に置く。すべての縁を下、すべての線を上に描くので、
// 交点でも白い線は途切れない。縁の太さは CSS で決める。縁の不透明度は縁のレイヤー全体にかける
// （線ごとにかけると、縁が重なる交点だけ濃くなるため）。
// <use> で複製すると、画像を伸ばしても線の太さを変えない設定（vector-effect）が効かないため、コピーする
export function drawCasing(casingLayer, sources, color) {
  const { casing, casingOpacity } = lineStyle(color);
  casingLayer.replaceChildren();
  casingLayer.style.stroke = casing ?? '';
  casingLayer.style.opacity = casingOpacity ?? '';
  if (!casing) return;
  for (const source of sources) {
    const copy = source.cloneNode(true);
    copy.removeAttribute('data-layer');
    casingLayer.append(copy);
  }
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
