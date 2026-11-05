// 各機能のモジュールをつなぐ入口。

import { initImageLoader } from './image-loader.js';
import { measureAspect } from './ratios.js';
import { createOverlay } from './overlay.js';
import { applyLineStyle } from './lines.js';
import { createGrid, shortPart } from './grid.js';
import { createThirds } from './thirds.js';
import { createDiagonals, createPerpendiculars, perpendicularHit } from './diagonals.js';
import { createSpiral, spiralGeometry } from './spiral.js';
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

// 重ねる線：比率グリッド・三分割・対角線・直角の線。種類ごとにレイヤーを分け、線の色と不透明度は線全体のレイヤーにかける
const lineLayer = overlay.addLayer('lines');
const grid = createGrid(overlay.addLayer('grid', lineLayer));
const thirds = createThirds(overlay.addLayer('thirds', lineLayer));
const diagonals = createDiagonals(overlay.addLayer('diagonals', lineLayer));
const perpendiculars = createPerpendiculars(overlay.addLayer('perpendiculars', lineLayer));
const spiral = createSpiral(overlay.addLayer('spiral', lineLayer));
const gridForm = document.querySelector('#grid-form');
const gridMode = document.querySelector('#grid-mode');
const gridSide = document.querySelector('#grid-side');
const gridPosition = document.querySelector('#grid-position');
const perpendicularPosition = document.querySelector('#perpendicular-position');
const spiralCorner = document.querySelector('#grid-spiral-corner');
const spiralPosition = document.querySelector('#spiral-position');
const CORNER_NAMES = { tl: '左上', tr: '右上', bl: '左下', br: '右下' };
const SPIRAL_NAMES = { golden: '黄金螺旋', silver: '白銀比の螺旋' };
const gridOpacity = document.querySelector('#grid-opacity');
const gridOpacityValue = document.querySelector('#grid-opacity-value');
const SIDE_NAMES = { left: '左', right: '右', top: '上', bottom: '下' };
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
  const isOneSide = settings.mode === 'one';
  // 比率が「なし」のときは、モードと基準の辺の段を隠す（選択は残るので、比率を選び直すと前の設定に戻る）
  const hasRatio = settings.type !== 'none';
  gridMode.hidden = !hasRatio;
  gridSide.hidden = !hasRatio || !isOneSide;

  // 片側モードでは、線の位置を一言で表示する
  gridPosition.hidden = !isOneSide || settings.type === 'none';
  if (!gridPosition.hidden) {
    gridPosition.textContent =
      `${SIDE_NAMES[settings.side]}端から${shortPart(settings.type).toFixed(1)}%`;
  }

  // 対角線に直角な線が長辺と交わる位置を、画像の画素数から計算して表示する
  const showPerpendiculars = settings.perpendiculars === 'on';
  perpendicularPosition.hidden = !showPerpendiculars || !imageSize;
  if (!perpendicularPosition.hidden) {
    const { width, height } = imageSize;
    if (width === height) {
      perpendicularPosition.replaceChildren(phrase(['直角の線は、', 'もう一方の対角線と重なります']));
    } else {
      perpendicularPosition.replaceChildren(`直角の線：長辺の端から${perpendicularHit(width, height).toFixed(1)}%`);
      // 正方形に近い（近い比率が 1:1）と、直角の線がもう一方の対角線のすぐ横に並び、二重線のように見える。その理由を一言添える
      if (measureAspect(width, height).nearest?.name === '1:1') {
        const note = phrase(['正方形に近いため、', '直角の線は', 'もう一方の対角線の', 'すぐ横を通ります。']);
        note.className = 'readout-note';
        perpendicularPosition.append(note);
      }
    }
  }

  // 螺旋（黄金比・白銀比）：巻き始めの角の選択と、回る向き・中心の位置の表示
  const showSpiral = settings.spiral !== 'none';
  spiralCorner.hidden = !showSpiral;
  spiralPosition.hidden = !showSpiral || !imageSize;
  if (!spiralPosition.hidden) {
    const { width, height } = imageSize;
    const { clockwise, pole } = spiralGeometry(settings.spiral, width, height, settings.spiralCorner);
    const line = (text) => {
      const span = document.createElement('span');
      span.className = 'readout-line';
      span.textContent = text;
      return span;
    };
    spiralPosition.replaceChildren(
      line(`${SPIRAL_NAMES[settings.spiral]}：${CORNER_NAMES[settings.spiralCorner]}から${clockwise ? '時計回り' : '反時計回り'}`),
      line(`中心：左端から${(pole[0] / width * 100).toFixed(1)}%・上端から${(pole[1] / height * 100).toFixed(1)}%`),
    );
  }

  gridOpacityValue.textContent = `${settings.opacity}%`;
  gridOpacity.setAttribute('aria-valuetext', `${settings.opacity}%`); // 読み上げで単位まで伝える
  applyLineStyle(lineLayer, settings);
  grid.render(settings);
  thirds.render(settings.thirds === 'on');
  diagonals.render({ visible: settings.diagonals === 'on', ...imageSize });
  perpendiculars.render({ visible: showPerpendiculars, ...imageSize });
  spiral.render({ kind: settings.spiral, corner: settings.spiralCorner, ...imageSize });
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
