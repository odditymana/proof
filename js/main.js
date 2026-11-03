// 各機能のモジュールをつなぐ入口。

import { initImageLoader } from './image-loader.js';
import { measureAspect } from './ratios.js';
import { createOverlay } from './overlay.js';
import { createGrid, shortPart } from './grid.js';

const stage = document.querySelector('.stage');
const dropButton = document.querySelector('#drop-button');
const sheet = document.querySelector('.sheet');
const sheetImage = sheet.querySelector('.sheet-image');
const imageInfo = document.querySelector('#image-info');
const status = document.querySelector('#status');

const overlay = createOverlay(sheetImage);

// 比率グリッド
const grid = createGrid(overlay.addLayer('grid'));
const gridForm = document.querySelector('#grid-form');
const gridSide = document.querySelector('#grid-side');
const gridPosition = document.querySelector('#grid-position');
const SIDE_NAMES = { left: '左', right: '右', top: '上', bottom: '下' };

function updateGrid() {
  const settings = Object.fromEntries(new FormData(gridForm));
  const isOneSide = settings.mode === 'one';
  gridSide.hidden = !isOneSide;

  // 片側モードでは、線の位置を一言で表示する
  gridPosition.hidden = !isOneSide || settings.type === 'none';
  if (!gridPosition.hidden) {
    gridPosition.textContent =
      `${SIDE_NAMES[settings.side]}端から${shortPart(settings.type).toFixed(1)}%`;
  }

  grid.render(settings);
}

gridForm.addEventListener('change', updateGrid);
updateGrid();

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
