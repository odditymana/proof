// 色の抽出：画像を縮小してcanvasで画素を読み取り、メディアンカットで減色する。
// 同じ画像なら毎回同じ結果になるよう、同点になったときの選び方をすべて固定している。

const SAMPLE_WIDTH = 100;
const DETAIL_LONG_SIDE = 1000; // 強調表示用の細かい割り当ての長辺。画面の大きさには合わせない
const ALPHA_THRESHOLD = 128; // アルファ値がこれ未満の画素は透明とみなし、集計から外す
const MIN_SPLIT_RANGE = 8;   // 色の幅（0〜255）がこれ未満の箱は、目で見分けにくいので分けない

// indices で「どの色にも属さない（透明な）画素」を表す値
export const TRANSPARENT = 255;

// 画像を幅100pxに縮小し、画素を読み取る（色の割合の計測用）
export function samplePixels(image) {
  const width = Math.min(SAMPLE_WIDTH, image.naturalWidth);
  const height = Math.max(1, Math.round(image.naturalHeight * width / image.naturalWidth));
  return readPixels(image, width, height);
}

// 画像を長辺1000px（元がそれより小さければ元の大きさ）に縮小し、画素を読み取る（強調表示用）
export function sampleDetailPixels(image) {
  const scale = Math.min(1, DETAIL_LONG_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  return readPixels(image, width, height);
}

// メディアンカットで記録した分け方のとおりに、各画素をどの色の箱に入るか振り分ける
export function assignColors({ width, height, data }, { rules }) {
  const indices = new Uint8Array(width * height).fill(TRANSPARENT);
  if (!rules) return { width, height, indices };

  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] < ALPHA_THRESHOLD) continue;
    let node = rules;
    while (node.below) {
      node = data[i * 4 + node.channel] < node.threshold ? node.below : node.above;
    }
    indices[i] = node.index;
  }
  return { width, height, indices };
}

function readPixels(image, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);

  return { width, height, data: context.getImageData(0, 0, width, height).data };
}

// メディアンカット：画素を入れた「箱」を、色数に達するまで二分割していく
export function medianCut({ width, height, data }, colorCount) {
  const opaque = [];
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] >= ALPHA_THRESHOLD) opaque.push(i);
  }

  const root = opaque.length ? makeBox(opaque, data) : null;
  const boxes = root ? [root] : [];
  while (boxes.length < colorCount) {
    const target = pickBoxToSplit(boxes);
    if (target === -1) break; // これ以上分けられない（見分けられる色が色数より少ない）
    boxes.splice(target, 1, ...splitBox(boxes[target], data));
  }

  const colors = boxes.map((box) => ({ ...averageColor(box.pixels, data), box }));
  // 画素数の多い順。同数なら R→G→B の小さい順
  colors.sort((a, b) => b.count - a.count || a.r - b.r || a.g - b.g || a.b - b.b);

  // 各画素がどの色に属するか（第2段階の「色の場所の強調表示」で使う）
  const indices = new Uint8Array(width * height).fill(TRANSPARENT);
  colors.forEach((color, index) => {
    color.box.index = index;
    for (const pixel of color.box.pixels) indices[pixel] = index;
  });

  return {
    width,
    height,
    total: opaque.length,
    colors: colors.map(({ r, g, b, count }) => ({
      r, g, b, count,
      hex: toHex(r, g, b),
      ratio: count / opaque.length,
    })),
    indices,
    // 分け方の記録。ほかの解像度の画素も、同じ決まりで振り分けられる（assignColors）
    rules: root && toRules(root),
  };
}

// 箱の分け方を「チャンネル・境の値・下側・上側」の形で残す（画素の一覧は持たない）
function toRules(box) {
  if (!box.children) return { index: box.index };
  const [below, above] = box.children;
  return { channel: box.channel, threshold: box.threshold, below: toRules(below), above: toRules(above) };
}

function makeBox(pixels, data) {
  const min = [255, 255, 255];
  const max = [0, 0, 0];
  for (const pixel of pixels) {
    for (let c = 0; c < 3; c++) {
      const value = data[pixel * 4 + c];
      if (value < min[c]) min[c] = value;
      if (value > max[c]) max[c] = value;
    }
  }
  const ranges = max.map((value, c) => value - min[c]);
  // 色の幅がいちばん大きいチャンネルで分ける。同じなら R→G→B の順に優先
  const channel = ranges.indexOf(Math.max(...ranges));
  return { pixels, channel, range: ranges[channel] };
}

// 「色の幅 × 画素数」がいちばん大きい箱を選ぶ。同点なら画素数の多い箱、それも同じなら先の箱
function pickBoxToSplit(boxes) {
  let best = -1;
  let bestScore = 0;
  boxes.forEach((box, index) => {
    if (box.range < MIN_SPLIT_RANGE) return;
    const score = box.range * box.pixels.length;
    if (score > bestScore || (score === bestScore && box.pixels.length > boxes[best].pixels.length)) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

function splitBox(box, data) {
  const { pixels, channel } = box;
  const value = (pixel, c) => data[pixel * 4 + c];
  // 分けるチャンネル → 残りのチャンネル → 画素の位置 の順で並べ、順番を一つに決める
  const others = [0, 1, 2].filter((c) => c !== channel);
  const sorted = [...pixels].sort((a, b) =>
    value(a, channel) - value(b, channel)
    || value(a, others[0]) - value(b, others[0])
    || value(a, others[1]) - value(b, others[1])
    || a - b);

  // 中央で分ける。ただし同じ値の画素が両側に割れないよう、値が切り替わる位置までずらす
  const middle = Math.floor(sorted.length / 2);
  const changesAt = (i) => value(sorted[i - 1], channel) !== value(sorted[i], channel);
  let split = -1;
  for (let offset = 0; split === -1; offset++) {
    if (middle - offset >= 1 && changesAt(middle - offset)) split = middle - offset;
    else if (middle + offset < sorted.length && changesAt(middle + offset)) split = middle + offset;
  }

  // 分け方を記録する：このチャンネルの値が threshold 未満なら下側、以上なら上側
  box.threshold = value(sorted[split], channel);
  box.children = [makeBox(sorted.slice(0, split), data), makeBox(sorted.slice(split), data)];
  return box.children;
}

function averageColor(pixels, data) {
  const sum = [0, 0, 0];
  for (const pixel of pixels) {
    for (let c = 0; c < 3; c++) sum[c] += data[pixel * 4 + c];
  }
  const [r, g, b] = sum.map((total) => Math.round(total / pixels.length));
  return { r, g, b, count: pixels.length };
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
