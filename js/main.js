// 各機能のモジュールをつなぐ入口。

import { initImageLoader } from './image-loader.js';
import { measureAspect } from './ratios.js';
import { createOverlay } from './overlay.js';

const stage = document.querySelector('.stage');
const dropButton = document.querySelector('#drop-button');
const sheet = document.querySelector('.sheet');
const sheetImage = sheet.querySelector('.sheet-image');
const imageInfo = document.querySelector('#image-info');
const status = document.querySelector('#status');

createOverlay(sheetImage);

initImageLoader({
  dropZone: stage,
  input: document.querySelector('#file-input'),
  buttons: [dropButton, document.querySelector('#file-button')],

  onLoad({ image, name, width, height }) {
    image.className = 'proof-image';
    image.alt = `読み込んだ画像：${name}`;
    sheetImage.querySelector('.proof-image')?.remove();
    sheetImage.prepend(image);
    dropButton.hidden = true;
    sheet.hidden = false;

    imageInfo.querySelector('[data-info="name"]').textContent = name;
    imageInfo.querySelector('[data-info="size"]').textContent = `${width} × ${height} px`;

    const aspect = measureAspect(width, height);
    imageInfo.querySelector('[data-info="aspect"]').textContent =
      `1:${aspect.value.toFixed(3)}（${aspect.orientation}）`;
    imageInfo.querySelector('[data-info="nearest"]').textContent = aspect.nearest
      ? `${aspect.nearest.name}\n1:${aspect.nearest.value.toFixed(3)}　差 ${(aspect.nearest.diff * 100).toFixed(1)}%`
      : '近い比率なし';

    imageInfo.hidden = false;
    status.textContent = '';
  },

  onError(message) {
    status.textContent = message;
  },
});
