// 三分割：縦横それぞれを3等分する線を引くレイヤー。

import { addLine } from './lines.js';

export function createThirds(layer) {
  return {
    render(visible) {
      layer.replaceChildren();
      if (!visible) return;
      for (const p of [100 / 3, 200 / 3]) {
        addLine(layer, p, 0, p, 100);
        addLine(layer, 0, p, 100, p);
      }
    },
  };
}
