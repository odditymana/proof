// 各機能のモジュールをつなぐ入口。

import { initImageLoader } from './image-loader.js';

const stage = document.querySelector('.stage');
const imageInfo = document.querySelector('#image-info');
const status = document.querySelector('#status');

initImageLoader({
  dropZone: stage,
  input: document.querySelector('#file-input'),
  button: document.querySelector('#file-button'),

  onLoad({ image, name, width, height }) {
    image.className = 'proof-image';
    image.alt = `読み込んだ画像：${name}`;
    stage.replaceChildren(image);

    imageInfo.querySelector('[data-info="name"]').textContent = name;
    imageInfo.querySelector('[data-info="size"]').textContent = `${width} × ${height} px`;
    imageInfo.hidden = false;
    status.textContent = '';
  },

  onError(message) {
    status.textContent = message;
  },
});
