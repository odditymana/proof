// 色の抽出（メディアンカット）：同じ入力なら毎回同じ結果になること、透明な画素の除外、分けない箱、同点の決まり。
// 画像の縮小（canvas）はブラウザの機能なので、ここでは画素のデータを自作して渡す。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medianCut, assignColors, TRANSPARENT } from '../js/palette.js';

// 画素の一覧 [[r, g, b, a], …] から、canvas の getImageData と同じ形のデータを作る
function image(pixels, width = pixels.length) {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((pixel, i) => data.set(pixel.length === 4 ? pixel : [...pixel, 255], i * 4));
  return { width, height: pixels.length / width, data };
}

// 決まった並びの「ばらばらな」画像（乱数の種を固定）
function noisyImage(width, height, levels) {
  let seed = 12345;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = () => levels[Math.floor(next() * levels.length)];
  const pixels = Array.from({ length: width * height }, () => [pick(), pick(), pick(), 255]);
  return image(pixels, width);
}

const repeat = (pixel, count) => Array(count).fill(pixel);

test('はっきり違う4色：HEX と割合がそのまま出て、多い順に並ぶ', () => {
  const pixels = [
    ...repeat([0x1F, 0x3A, 0x5F], 30),
    ...repeat([0xF2, 0xC1, 0x4E], 5),
    ...repeat([0xE8, 0xE2, 0xD6], 50),
    ...repeat([0xD9, 0x48, 0x2B], 15),
  ];
  const result = medianCut(image(pixels, 10), 4);
  assert.equal(result.total, 100);
  assert.deepEqual(
    result.colors.map(({ hex, count, ratio }) => [hex, count, ratio]),
    [['#E8E2D6', 50, 0.5], ['#1F3A5F', 30, 0.3], ['#D9482B', 15, 0.15], ['#F2C14E', 5, 0.05]],
  );
});

test('見分けられる色が指定より少なければ、少ない色数で止まる', () => {
  const pixels = [...repeat([255, 0, 0], 3), ...repeat([0, 0, 255], 2)];
  for (const count of [3, 5, 8]) {
    assert.equal(medianCut(image(pixels), count).colors.length, 2, `色数${count}`);
  }
});

test('アルファ値128未満の画素は集計から外す（127は外し、128は含める）', () => {
  const pixels = [[200, 0, 0, 255], [0, 0, 200, 128], [0, 200, 0, 127], [0, 200, 0, 0]];
  const result = medianCut(image(pixels), 5);
  assert.equal(result.total, 2);
  assert.deepEqual(result.colors.map((c) => c.hex).sort(), ['#0000C8', '#C80000']);
  assert.equal(result.indices[2], TRANSPARENT);
  assert.equal(result.indices[3], TRANSPARENT);
});

test('色の幅が8未満の箱は分けない（幅7なら1色、幅8なら2色）', () => {
  const narrow = [...repeat([100, 100, 100], 4), ...repeat([107, 100, 100], 4)];
  const wide = [...repeat([100, 100, 100], 4), ...repeat([108, 100, 100], 4)];
  assert.equal(medianCut(image(narrow), 5).colors.length, 1);
  assert.equal(medianCut(image(wide), 5).colors.length, 2);
});

test('画素数が同じ色は、R→G→B の小さい順に並ぶ', () => {
  const pixels = [...repeat([200, 0, 0], 2), ...repeat([0, 0, 200], 2), ...repeat([0, 200, 0], 2)];
  assert.deepEqual(medianCut(image(pixels), 3).colors.map((c) => c.hex), ['#0000C8', '#00C800', '#C80000']);
});

test('同じ色の画素は、分けた両側に割れない', () => {
  // 中央（5番目）は同じ値の並びの途中。値が切り替わる位置までずらして分ける
  const pixels = [...repeat([0, 0, 0], 7), ...repeat([100, 0, 0], 3)];
  const result = medianCut(image(pixels), 2);
  assert.deepEqual(result.colors.map(({ hex, count }) => [hex, count]), [['#000000', 7], ['#640000', 3]]);

  // ばらばらな画像でも、RGB がまったく同じ画素は必ず同じ色に入る
  const noisy = noisyImage(60, 40, [0, 40, 41, 120, 200, 255]);
  const { indices } = medianCut(noisy, 8);
  const seen = new Map();
  for (let i = 0; i < noisy.width * noisy.height; i++) {
    const key = noisy.data.slice(i * 4, i * 4 + 3).join(',');
    if (!seen.has(key)) seen.set(key, indices[i]);
    assert.equal(indices[i], seen.get(key), key);
  }
});

test('同じ入力なら、何度でもまったく同じ結果になる', () => {
  for (const count of [3, 5, 8]) {
    const a = medianCut(noisyImage(100, 70, [0, 30, 90, 91, 160, 230]), count);
    const b = medianCut(noisyImage(100, 70, [0, 30, 90, 91, 160, 230]), count);
    assert.deepEqual(a, b, `色数${count}`);
    assert.ok(a.colors.length <= count);
  }
});

test('割合の合計は1、画素数の合計は不透明な画素の数', () => {
  const result = medianCut(noisyImage(100, 70, [0, 64, 128, 192, 255]), 6);
  const sum = result.colors.reduce((total, c) => total + c.ratio, 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
  assert.equal(result.colors.reduce((total, c) => total + c.count, 0), result.total);
  for (const { hex } of result.colors) assert.match(hex, /^#[0-9A-F]{6}$/);
});

test('記録した分け方（rules）で振り分けると、メディアンカットの振り分けと一致する', () => {
  const noisy = noisyImage(80, 50, [0, 50, 51, 140, 210, 255]);
  const palette = medianCut(noisy, 7);
  const assigned = assignColors(noisy, palette);
  assert.equal(assigned.width, 80);
  assert.equal(assigned.height, 50);
  assert.deepEqual(assigned.indices, palette.indices);
});

test('すべて透明な画像では、色は0個', () => {
  const transparent = image(repeat([10, 20, 30, 0], 6), 3);
  const palette = medianCut(transparent, 5);
  assert.equal(palette.total, 0);
  assert.deepEqual(palette.colors, []);
  assert.equal(palette.rules, null);
  assert.ok(assignColors(transparent, palette).indices.every((i) => i === TRANSPARENT));
});
