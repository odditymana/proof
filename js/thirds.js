// 三分割：縦横それぞれを3等分する線を引くレイヤー。

import { addLine } from './lines.js';

// 引く線の一覧 [x1, y1, x2, y2]（座標は画像の幅・高さに対する%）
export function thirdsLines() {
  return [100 / 3, 200 / 3].flatMap((p) => [
    [p, 0, p, 100],
    [0, p, 100, p],
  ]);
}

export function createThirds(layer) {
  return {
    render(visible) {
      layer.replaceChildren();
      if (!visible) return;
      for (const line of thirdsLines()) addLine(layer, ...line);
    },
  };
}
