// 色の場所の強調表示：選んだ色以外の画素を、無彩色のグレーに寄せるレイヤー。
// 選んだ色の画素は元の色のまま見せる。色の境目のにじみも、計測した結果としてそのまま表示する。
// 寄せる先は、暗いグレーと明るいグレーのうち、選んだ色とのコントラスト比が大きいほう。
// 選んだ色が中間の明るさでも、周りとの明るさの差がつくようにするため。

import { SVG_NS } from './overlay.js';
import { luminance, contrastRatio } from './contrast.js';
import { formatPercent } from './palette-view.js';

const DARK = 0x1a;     // #1A1A1A
const LIGHT = 0xe6;    // #E6E6E6
const STRENGTH = 0.8;  // 選んだ色以外を、グレーにどれだけ寄せるか

// 選んだ色とのコントラスト比が大きいほうのグレー。同じなら暗いほう
export function targetGray({ r, g, b }) {
  const selected = luminance(r, g, b);
  return contrastRatio(selected, luminance(DARK, DARK, DARK)) >= contrastRatio(selected, luminance(LIGHT, LIGHT, LIGHT))
    ? DARK
    : LIGHT;
}

// 重ねる画像の画素（RGBA の並び）：選んだ色の画素は透明、それ以外はグレーを不透明度80%で重ねる。
// indices は各画素がどの色に属するか（assignColors の結果）
export function maskPixels(indices, colorIndex, gray) {
  const data = new Uint8ClampedArray(indices.length * 4);
  const alpha = Math.round(STRENGTH * 255);
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] === colorIndex) continue;
    data.fill(gray, i * 4, i * 4 + 3);
    data[i * 4 + 3] = alpha;
  }
  return data;
}

export function createHighlight(layer) {
  const canvas = document.createElement('canvas');
  const image = document.createElementNS(SVG_NS, 'image');
  image.setAttribute('x', 0);
  image.setAttribute('y', 0);
  image.setAttribute('width', 100);
  image.setAttribute('height', 100);
  image.setAttribute('preserveAspectRatio', 'none');

  return {
    // 1つ目の引数は assignColors の結果（各画素がどの色に属するか）、3つ目は選んだ色
    show({ width, height, indices }, colorIndex, color) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      const mask = new ImageData(maskPixels(indices, colorIndex, targetGray(color)), width, height);
      context.putImageData(mask, 0, 0);
      image.setAttribute('href', canvas.toDataURL());
      layer.replaceChildren(image);
    },

    clear() {
      layer.replaceChildren();
    },
  };
}

// 強調表示の一言。present は、細かい解像度の画像にその色の画素があるかどうか。
// 縮小して計測したときだけ現れた色は、細かい割り当てには画素がないことがある。隠さずにそのまま伝える。
// 原因（色の境目のにじみ・色のかたまりが分かれたなど）は1つに決まらないので、言い切らない
export function highlightMessage(color, present) {
  const label = `${color.hex}（${formatPercent(color.ratio)}）`;
  return present
    ? `${label}の場所を強調表示しています。`
    : `${label}に当てはまる画素は、元の解像度の画像にはありません。縮小して計測したときだけ現れた色です。`;
}
