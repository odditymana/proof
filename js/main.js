// 各機能のモジュールをつなぐ入口。

import { initImageLoader } from './image-loader.js';
import { measureAspect } from './ratios.js';
import { createOverlay } from './overlay.js';
import { applyLineStyle } from './lines.js';
import { createGrid, shortPart } from './grid.js';
import { createThirds } from './thirds.js';
import { createDiagonals, perpendicularHit } from './diagonals.js';
import { samplePixels, sampleDetailPixels, medianCut, assignColors } from './palette.js';
import { renderPalette, setSelected, formatPercent } from './palette-view.js';
import { createHighlight } from './highlight.js';
import { createContrastView } from './contrast-view.js';

const stage = document.querySelector('.stage');
const dropButton = document.querySelector('#drop-button');
const sheet = document.querySelector('.sheet');
const sheetImage = sheet.querySelector('.sheet-image');
const imageInfo = document.querySelector('#image-info');
const status = document.querySelector('#status');
const fileButton = document.querySelector('#file-button');

const overlay = createOverlay(sheetImage);

// 色の場所の強調表示。グリッドの線が隠れないよう、グリッドより先（下）に重ねる
const highlight = createHighlight(overlay.addLayer('highlight'));

// 重ねる線：比率グリッド・三分割・対角線。種類ごとにレイヤーを分け、線の色と不透明度は線全体のレイヤーにかける
const lineLayer = overlay.addLayer('lines');
const grid = createGrid(overlay.addLayer('grid', lineLayer));
const thirds = createThirds(overlay.addLayer('thirds', lineLayer));
const diagonals = createDiagonals(overlay.addLayer('diagonals', lineLayer));
const gridForm = document.querySelector('#grid-form');
const gridSide = document.querySelector('#grid-side');
const gridPosition = document.querySelector('#grid-position');
const diagonalPosition = document.querySelector('#diagonal-position');
const gridOpacity = document.querySelector('#grid-opacity');
const gridOpacityValue = document.querySelector('#grid-opacity-value');
const SIDE_NAMES = { left: '左', right: '右', top: '上', bottom: '下' };
let imageSize = null; // 読み込んだ画像の画素数 { width, height }。対角線に直角な線の位置の計算に使う

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

  // 対角線に直角な線が長辺と交わる位置を、画像の画素数から計算して表示する
  const showDiagonals = settings.diagonals === 'on';
  diagonalPosition.hidden = !showDiagonals || !imageSize;
  if (!diagonalPosition.hidden) {
    if (imageSize.width === imageSize.height) {
      // 1行に収まらないので、読点の位置で折り返す（「ます」だけが次の行に送られないように）
      diagonalPosition.replaceChildren(
        ...['直角の線は、', 'もう一方の対角線と重なります'].map((text) => {
          const span = document.createElement('span');
          span.className = 'nowrap';
          span.textContent = text;
          return span;
        }),
      );
    } else {
      diagonalPosition.textContent =
        `直角の線：長辺の端から${perpendicularHit(imageSize.width, imageSize.height).toFixed(1)}%`;
    }
  }

  gridOpacityValue.textContent = `${settings.opacity}%`;
  gridOpacity.setAttribute('aria-valuetext', `${settings.opacity}%`); // 読み上げで単位まで伝える
  applyLineStyle(lineLayer, settings);
  grid.render(settings);
  thirds.render(settings.thirds === 'on');
  diagonals.render({ visible: showDiagonals, ...imageSize });
}

// スライダーは動かしている間も反映する
gridForm.addEventListener('input', updateGrid);
gridForm.addEventListener('change', updateGrid);
updateGrid();

// 色の抽出：画素は画像ごとに1回だけ読み取り、色数を変えたら減色だけやり直す
const paletteForm = document.querySelector('#palette-form');
const paletteCount = document.querySelector('#palette-count');
const paletteCountValue = document.querySelector('#palette-count-value');
const paletteEmpty = document.querySelector('#palette-empty');
const paletteResult = document.querySelector('#palette-result');
const paletteParts = {
  bar: paletteResult.querySelector('.palette-bar'),
  list: paletteResult.querySelector('.palette-list'),
  top: paletteResult.querySelector('.palette-top'),
  note: paletteResult.querySelector('#palette-note'),
};
const highlightStatus = document.querySelector('#highlight-status');
let pixels = null;        // 色の割合の計測用（幅100px）
let detailPixels = null;  // 強調表示用（長辺1000px）
let palette = null;
let assignment = null;    // 強調表示用の、各画素がどの色に属するか
let paletteCountShown = null;
let selected = null;      // 選んでいる色の番号（なければ null）

function updatePalette() {
  const count = Number(new FormData(paletteForm).get('count'));
  paletteCountValue.textContent = `${count}色`;
  paletteCount.setAttribute('aria-valuetext', `${count}色`);
  // input と change の両方で呼ばれるので、色数が変わっていなければやり直さない
  if (!pixels || count === paletteCountShown) return;
  paletteCountShown = count;

  palette = medianCut(pixels, count);
  assignment = assignColors(detailPixels, palette);
  renderPalette(paletteParts, palette, count);
  contrastView.setColors(palette.colors);
  paletteEmpty.hidden = true;
  paletteResult.hidden = false;
  // 色数が変わると色の番号の意味が変わるので、選択は解除する
  selectColor(null);
}

// 色を選ぶ（null で解除）。強調表示と、一覧の「押された状態」、読み上げ用の一言をそろえて変える
function selectColor(index) {
  selected = index;
  setSelected(paletteParts.list, index);
  if (index === null) {
    highlight.clear();
    highlightStatus.textContent = '';
    return;
  }
  const color = palette.colors[index];
  const label = `${color.hex}（${formatPercent(color.ratio)}）`;
  highlight.show(assignment, index, color);
  // 縮小したときにだけ生まれた境目の色は、細かい割り当てには画素がないことがある。隠さずにそのまま伝える
  highlightStatus.textContent = assignment.indices.includes(index)
    ? `${label}の場所を強調表示しています。`
    : `${label}に当てはまる画素は、元の解像度の画像にはありません。縮小して計測したときに、色の境目から生まれた色です。`;
}

paletteForm.addEventListener('input', updatePalette);
paletteForm.addEventListener('change', updatePalette);

// 同じ色をもう一度押すと解除、別の色を押すと切り替え
paletteParts.list.addEventListener('click', (event) => {
  const button = event.target.closest('.palette-item');
  if (!button) return;
  const index = Number(button.dataset.index);
  selectColor(index === selected ? null : index);
});

// Esc キーでも解除する（色を選んでいるときだけ）。入力欄や選択欄の中の Esc は、その欄のためのものなので除く
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || selected === null) return;
  if (event.target.closest('input[type="text"], select')) return;
  selectColor(null);
});

// コントラスト比：画像がなくても「HEXで入力」で使える
const contrastView = createContrastView(document.querySelector('.contrast'));
contrastView.setColors([]);

initImageLoader({
  dropZone: stage,
  input: document.querySelector('#file-input'),
  buttons: [dropButton, fileButton],

  onLoad({ image, name, width, height }) {
    image.className = 'proof-image';
    image.alt = `読み込んだ画像：${name}`;
    sheetImage.querySelector('.proof-image')?.remove();
    sheetImage.prepend(image);
    // 空のエリアのボタンは消えるので、そこにあったフォーカスは「ファイルを選ぶ」へ移す
    const hadFocus = document.activeElement === dropButton;
    dropButton.hidden = true;
    if (hadFocus) fileButton.focus();
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

    imageSize = { width, height };
    updateGrid(); // 対角線は画像の縦横比で引き方が変わるので、引き直す

    pixels = samplePixels(image);
    detailPixels = sampleDetailPixels(image);
    paletteCountShown = null; // 画像が替わったので、同じ色数でも計算し直す
    updatePalette();
  },

  onError(message) {
    status.textContent = message;
  },
});
