// 色の場所の強調表示：選んだ色以外の画素を、背景と同じニュートラルグレーに寄せるレイヤー。
// 選んだ色の画素は元の色のまま見せる。色の境目のにじみも、計測した結果としてそのまま表示する。

import { SVG_NS } from './overlay.js';

const NEUTRAL = 0x76;  // 背景と同じ #767676
const STRENGTH = 0.8;  // 選んだ色以外を、グレーにどれだけ寄せるか

export function createHighlight(layer) {
  const canvas = document.createElement('canvas');
  const image = document.createElementNS(SVG_NS, 'image');
  image.setAttribute('x', 0);
  image.setAttribute('y', 0);
  image.setAttribute('width', 100);
  image.setAttribute('height', 100);
  image.setAttribute('preserveAspectRatio', 'none');

  return {
    // 1つ目の引数は assignColors の結果（各画素がどの色に属するか）
    show({ width, height, indices }, colorIndex) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      const mask = context.createImageData(width, height);
      const alpha = Math.round(STRENGTH * 255);
      for (let i = 0; i < width * height; i++) {
        if (indices[i] === colorIndex) continue;
        mask.data.fill(NEUTRAL, i * 4, i * 4 + 3);
        mask.data[i * 4 + 3] = alpha;
      }
      context.putImageData(mask, 0, 0);
      image.setAttribute('href', canvas.toDataURL());
      layer.replaceChildren(image);
    },

    clear() {
      layer.replaceChildren();
    },
  };
}
