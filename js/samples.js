// サンプル画像で試す：手元に画像がなくても、1クリックで PROOF を試せるようにする。
// 画像は test-images/ の自作の画像（CC0）を、同じサイトから読み込む（外部には何も送らない）。
// 読み込むと、重ねる線をそのサンプルの見どころが分かる設定に切り替え、何を変えたかを一言で伝える。
// 線の色・不透明度・反転・色数は変えない。

// settings：重ねる線の欄（#grid-form）の項目の名前と値。チェックボックスは true / false
export const SAMPLES = [
  {
    id: 'silver',
    label: '白銀比',
    path: 'test-images/silver-landscape.png',
    // README の1枚目と同じ画面：白銀比の螺旋の中心が、三分割の交点に重なる
    settings: { type: 'none', thirds: true, diagonals: false, perpendiculars: false, spiral: 'silver', spiralCorner: 'bl' },
  },
  {
    id: 'golden',
    label: '黄金比',
    path: 'test-images/golden-landscape.png',
    // 黄金螺旋の中心が、対角線と直角の線の交点に来る
    settings: { type: 'none', thirds: false, diagonals: true, perpendiculars: true, spiral: 'golden', spiralCorner: 'bl' },
  },
];

export function findSample(id) {
  return SAMPLES.find((sample) => sample.id === id) ?? null;
}

// 画像の欄に出すファイル名。自分の画像と見分けられるよう「（サンプル）」を付ける
export function sampleFileName(sample) {
  return `${sample.path.split('/').pop()}（サンプル）`;
}

const RATIO_NAMES = { golden: '黄金比', silver: '白銀比' };
const SPIRAL_NAMES = { golden: '黄金螺旋', silver: '白銀比の螺旋' };

// 設定のうち、画像に見えるもの（オンの線）の名前を、パネルに並ぶ順に返す
export function settingsSummary(settings) {
  const parts = [];
  if (settings.type !== 'none') parts.push(`比率グリッド（${RATIO_NAMES[settings.type]}）`);
  if (settings.thirds) parts.push('三分割');
  if (settings.diagonals) parts.push('対角線');
  if (settings.perpendiculars) parts.push('直角の線');
  if (settings.spiral !== 'none') parts.push(SPIRAL_NAMES[settings.spiral]);
  return parts;
}

// 読み込んだときに出す（読み上げにも伝える）一言。後半は切り替えた設定（オンの線）。
// パネルの幅（1440×900・1280×800）で2行に収まる長さにしている
export function sampleMessage(sample) {
  return `サンプル画像（${sample.label}）を読み込みました。設定：${settingsSummary(sample.settings).join('・')}`;
}

// 重ねる線の欄に設定を当てる（画面の処理）。当てたあとの描き直しは呼び出し側で行う
export function applySampleSettings(form, settings) {
  for (const [name, value] of Object.entries(settings)) {
    if (typeof value === 'boolean') {
      form.elements[name].checked = value;
    } else {
      form.querySelector(`[name="${name}"][value="${value}"]`).checked = true;
    }
  }
}

// 同じサイトの中の画像を受け取り、ファイルとして返す（読み込みはファイルを選んだときと同じ処理を通す）
export async function fetchSample(sample) {
  const response = await fetch(sample.path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return new File([blob], sample.path.split('/').pop(), { type: blob.type || 'image/png' });
}
