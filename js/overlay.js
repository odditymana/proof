// 画像の上に重ねる表示の土台。
// 画像にぴったり重なるSVGを1枚置き、座標は 0〜100（画像の幅・高さに対する%）で扱う。
// 重ねる表示の種類ごとに <g> を1つずつ「レイヤー」として追加する。

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function createOverlay(container) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'overlay');
  svg.setAttribute('viewBox', '0 0 100 100');
  // 縦横それぞれ画像の大きさに合わせて伸ばす（%座標がそのまま画像上の位置になる）
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  container.append(svg);

  return {
    addLayer(name) {
      const layer = document.createElementNS(SVG_NS, 'g');
      layer.dataset.layer = name;
      svg.append(layer);
      return layer;
    },
  };
}
