// 各機能のモジュールをつなぐ入口。

import { initImageLoader } from './image-loader.js';
import { imageInfoTexts } from './ratios.js';
import { createOverlay } from './overlay.js';
import { applyLineStyle, drawCasing } from './lines.js';
import { createGrid, gridPositionText } from './grid.js';
import { createThirds } from './thirds.js';
import { createDiagonals, createPerpendiculars, perpendicularReadout } from './diagonals.js';
import { createSpiral, spiralReadout } from './spiral.js';
import { visibleRows } from './line-panel.js';
import { samplePixels, sampleDetailPixels, medianCut, assignColors, measureShares } from './palette.js';
import { renderPalette, setSelected } from './palette-view.js';
import { createHighlight, highlightMessage } from './highlight.js';
import { createContrastView } from './contrast-view.js';
import { initSections } from './sections.js';
import { flipTransform, flipLabel } from './flip.js';
import { findSample, sampleFileName, sampleMessage, applySampleSettings, fetchSample } from './samples.js';

const stage = document.querySelector('.stage');
const dropButton = document.querySelector('#drop-button');
const sheet = document.querySelector('.sheet');
const sheetImage = sheet.querySelector('.sheet-image');
const imageInfo = document.querySelector('#image-info');
const status = document.querySelector('#status');
const fileButton = document.querySelector('#file-button');
const stageSamples = document.querySelector('#stage-samples');
const panelSamples = document.querySelector('#panel-samples');

// パネルの欄の折りたたみ（開閉の状態はブラウザの中だけに覚える）
initSections(document.querySelector('.panel'));

const overlay = createOverlay(sheetImage);

// 色の場所の強調表示。グリッドの線が隠れないよう、グリッドより先（下）に重ねる
const highlightLayer = overlay.addLayer('highlight');
const highlight = createHighlight(highlightLayer);

// 重ねる線：比率グリッド・三分割・対角線・直角の線・螺旋。種類ごとにレイヤーを分け、線の色と不透明度は線全体のレイヤーにかける
const lineLayer = overlay.addLayer('lines');
// 縁取りの縁は、線の種類のレイヤーより先（下）に置く
const casingLayer = overlay.addLayer('casing', lineLayer);
const lineSublayers = ['grid', 'thirds', 'diagonals', 'perpendiculars', 'spiral'].map((name) => overlay.addLayer(name, lineLayer));
const [grid, thirds, diagonals, perpendiculars, spiral] = [
  createGrid, createThirds, createDiagonals, createPerpendiculars, createSpiral,
].map((create, index) => create(lineSublayers[index]));
const gridForm = document.querySelector('#grid-form');
const gridMode = document.querySelector('#grid-mode');
const gridSide = document.querySelector('#grid-side');
const gridPosition = document.querySelector('#grid-position');
const perpendicularPosition = document.querySelector('#perpendicular-position');
const spiralCorner = document.querySelector('#grid-spiral-corner');
const spiralPosition = document.querySelector('#spiral-position');
const gridOpacity = document.querySelector('#grid-opacity');
const gridOpacityValue = document.querySelector('#grid-opacity-value');
let imageSize = null; // 読み込んだ画像の画素数 { width, height }。対角線に直角な線の位置の計算に使う

// 1行に収まらない文を、決めたかたまりの区切りでだけ折り返すようにする（「ます」だけが次の行に送られないように）
function phrase(parts) {
  const wrapper = document.createElement('span');
  for (const text of parts) {
    const span = document.createElement('span');
    span.className = 'nowrap';
    span.textContent = text;
    wrapper.append(span);
  }
  return wrapper;
}

function updateGrid() {
  const settings = Object.fromEntries(new FormData(gridForm));
  // 使わない段は隠す（選択は残るので、選び直すと前の設定に戻る）
  const rows = visibleRows(settings, Boolean(imageSize));
  gridMode.hidden = !rows.mode;
  gridSide.hidden = !rows.side;
  gridPosition.hidden = !rows.gridPosition;
  perpendicularPosition.hidden = !rows.perpendicularPosition;
  spiralCorner.hidden = !rows.spiralCorner;
  spiralPosition.hidden = !rows.spiralPosition;

  // 片側モードでは、線の位置を一言で表示する
  if (rows.gridPosition) gridPosition.textContent = gridPositionText(settings);

  // 対角線に直角な線が長辺と交わる位置を、画像の画素数から計算して表示する
  if (rows.perpendicularPosition) {
    const readout = perpendicularReadout(imageSize.width, imageSize.height);
    if (readout.square) {
      perpendicularPosition.replaceChildren(phrase(readout.parts));
    } else {
      perpendicularPosition.replaceChildren(readout.text);
      if (readout.note) {
        const note = phrase(readout.note);
        note.className = 'readout-note';
        perpendicularPosition.append(note);
      }
    }
  }

  // 螺旋（黄金比・白銀比）：回る向き・中心の位置を1行ずつ表示する
  if (rows.spiralPosition) {
    const lines = spiralReadout(settings.spiral, imageSize.width, imageSize.height, settings.spiralCorner);
    spiralPosition.replaceChildren(...lines.map((text) => {
      const span = document.createElement('span');
      span.className = 'readout-line';
      span.textContent = text;
      return span;
    }));
  }

  gridOpacityValue.textContent = `${settings.opacity}%`;
  gridOpacity.setAttribute('aria-valuetext', `${settings.opacity}%`); // 読み上げで単位まで伝える
  applyLineStyle(lineLayer, settings);
  grid.render(settings);
  thirds.render(settings.thirds === 'on');
  diagonals.render({ visible: settings.diagonals === 'on', ...imageSize });
  perpendiculars.render({ visible: settings.perpendiculars === 'on', ...imageSize });
  spiral.render({ kind: settings.spiral, corner: settings.spiralCorner, ...imageSize });
  drawCasing(casingLayer, lineSublayers, settings.color); // 線を描き直したあとに、縁も描き直す
}

// スライダーは動かしている間も反映する
gridForm.addEventListener('input', updateGrid);
gridForm.addEventListener('change', updateGrid);
updateGrid();

// 反転：画像と強調表示だけを反転し、重ねる線は画面の向きのまま。画像を替えても保ち、ブラウザには覚えない
const flipForm = document.querySelector('#flip-form');
const flipStatus = document.querySelector('#flip-status');

function updateFlip() {
  const state = {
    horizontal: flipForm.elements.horizontal.checked,
    vertical: flipForm.elements.vertical.checked,
  };
  const { svg, css } = flipTransform(state);
  const image = sheetImage.querySelector('.proof-image');
  if (image) image.style.transform = css;
  if (svg) highlightLayer.setAttribute('transform', svg);
  else highlightLayer.removeAttribute('transform');
  // 「画像」の欄を閉じていても反転中だと分かるよう、開閉する部分の外に出す（読み上げにも伝わる）
  flipStatus.textContent = flipLabel(state);
}

flipForm.addEventListener('change', updateFlip);

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

  // 色は幅100pxで決め、割合は強調表示と同じ細かい振り分けで数え直す
  const coarse = medianCut(pixels, count);
  ({ palette, assignment } = measureShares(coarse, assignColors(detailPixels, coarse)));
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
  highlight.show(assignment, index, color);
  highlightStatus.textContent = highlightMessage(color, color.count > 0);
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

const loader = initImageLoader({
  dropZone: stage,
  input: document.querySelector('#file-input'),
  buttons: [dropButton, fileButton],

  // sample：サンプル画像で試したときだけ渡される（samples.js の一覧の1つ）
  onLoad({ image, name, width, height, sample = null }) {
    const shownName = sample ? sampleFileName(sample) : name;
    image.className = 'proof-image';
    image.alt = `読み込んだ画像：${shownName}`;
    sheetImage.querySelector('.proof-image')?.remove();
    sheetImage.prepend(image);
    // 空のエリアのボタンは消えるので、そこにあったフォーカスは、パネルの同じ働きのボタンへ移す
    const focused = document.activeElement;
    dropButton.hidden = true;
    stageSamples.hidden = true;
    if (focused === dropButton) fileButton.focus();
    else if (stageSamples.contains(focused)) {
      panelSamples.querySelector(`[data-sample="${focused.dataset.sample}"]`).focus();
    }
    sheet.hidden = false;

    imageInfo.querySelector('[data-info="name"]').textContent = shownName;
    const info = imageInfoTexts(width, height);
    imageInfo.querySelector('[data-info="size"]').textContent = info.size;
    imageInfo.querySelector('[data-info="aspect"]').textContent = info.aspect;
    imageInfo.querySelector('[data-info="nearest"]').textContent = info.nearest;

    imageInfo.hidden = false;
    // サンプルのときは、読み込んだことと切り替えた設定を伝える（自分の画像を読み込んだら消す）
    status.textContent = sample ? sampleMessage(sample) : '';

    imageSize = { width, height };
    // サンプルのときは、重ねる線を見どころが分かる設定に切り替える（線の色・不透明度・反転・色数は変えない）
    if (sample) applySampleSettings(gridForm, sample.settings);
    updateGrid(); // 対角線は画像の縦横比で引き方が変わるので、引き直す
    updateFlip(); // 反転の状態は、新しい画像にもそのまま当てる

    pixels = samplePixels(image);
    detailPixels = sampleDetailPixels(image);
    paletteCountShown = null; // 画像が替わったので、同じ色数でも計算し直す
    updatePalette();
  },

  onError(message) {
    status.textContent = message;
  },
});

// サンプル画像で試す：同じサイトの中の画像を受け取り、ファイルを選んだときと同じ処理で読み込む
for (const group of [stageSamples, panelSamples]) {
  group.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-sample]');
    if (!button) return;
    const sample = findSample(button.dataset.sample);
    let file;
    try {
      file = await fetchSample(sample);
    } catch {
      status.textContent = 'サンプル画像を読み込めませんでした。';
      return;
    }
    loader.load(file, { sample });
  });
}
