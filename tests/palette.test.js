// 色の抽出（メディアンカット）：同じ入力なら毎回同じ結果になること、透明な画素の除外、分けない箱、同点の決まり、
// 一覧の割合を細かい振り分けで数え直すこと。
// 画像の縮小（canvas）はブラウザの機能なので、ここでは画素のデータを自作して渡す。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medianCut, assignColors, measureShares, splitBalances, TRANSPARENT } from '../js/palette.js';

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

// 粗い画像（幅100px相当）で色を決め、細かい画像（長辺1000px相当）で数え直す
function measure(coarsePixels, detailPixels, count) {
  const coarse = image(coarsePixels);
  const detail = image(detailPixels);
  const palette = medianCut(coarse, count);
  return { coarse, detail, palette, measured: measureShares(palette, assignColors(detail, palette)) };
}

const RED = [200, 40, 40];
const BLUE = [40, 40, 200];
const MIX = [120, 40, 120]; // 縮小したときだけ現れる、境目の色に見立てる

test('数え直し：割合は細かい振り分けで数え、多い順に並べ直す。HEX は変えない', () => {
  const { palette, measured } = measure(
    [...repeat(RED, 5), ...repeat(BLUE, 3), ...repeat(MIX, 2)],
    [...repeat(RED, 20), ...repeat(BLUE, 60), [0, 0, 0, 0], [0, 0, 0, 0]],
    3,
  );
  assert.deepEqual(palette.colors.map((c) => c.hex), ['#C82828', '#2828C8', '#782878']);
  const { colors, total } = measured.palette;
  assert.equal(total, 80); // 透明な画素は数えない
  assert.deepEqual(colors.map(({ hex, count, ratio }) => [hex, count, ratio]), [
    ['#2828C8', 60, 0.75], ['#C82828', 20, 0.25], ['#782878', 0, 0],
  ]);
});

test('数え直し：番号を付け直したあとも、振り分け・分け方の記録・一覧の色がそろう', () => {
  const { coarse, detail, palette, measured } = measure(
    [...repeat(RED, 5), ...repeat(BLUE, 3), ...repeat(MIX, 2)],
    [...repeat(MIX, 1), ...repeat(BLUE, 60), ...repeat(RED, 20), [9, 9, 9, 0]],
    3,
  );
  const hexOf = (pixels, i) => '#' + [...pixels.data.slice(i * 4, i * 4 + 3)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  // 細かい振り分け：各画素の番号が指す色は、その画素の色
  measured.assignment.indices.forEach((index, i) => {
    if (index === TRANSPARENT) assert.equal(detail.data[i * 4 + 3], 0);
    else assert.equal(measured.palette.colors[index].hex, hexOf(detail, i));
  });
  // 付け直した分け方の記録で振り分け直しても、同じ番号になる
  assert.deepEqual(assignColors(detail, measured.palette).indices, measured.assignment.indices);
  // 幅100pxの振り分けも、同じ番号に付け直されている
  measured.palette.indices.forEach((index, i) => assert.equal(measured.palette.colors[index].hex, hexOf(coarse, i)));
  // もとの結果は書き換えない
  assert.deepEqual(palette.colors.map((c) => c.hex), ['#C82828', '#2828C8', '#782878']);
});

test('数え直し：画素数が同じ色は R→G→B の小さい順、0画素の色は最後', () => {
  const GREEN = [40, 200, 40];
  const { measured } = measure(
    [...repeat(RED, 4), ...repeat(GREEN, 3), ...repeat(BLUE, 2), ...repeat(MIX, 1)],
    [...repeat(RED, 10), ...repeat(BLUE, 10), ...repeat(GREEN, 30)],
    4,
  );
  assert.deepEqual(measured.palette.colors.map((c) => [c.hex, c.count]), [
    ['#28C828', 30], ['#2828C8', 10], ['#C82828', 10], ['#782878', 0],
  ]);
});

test('数え直し：細かい画像がすべて透明なら、どの色も0画素', () => {
  const { measured } = measure([...repeat(RED, 3), ...repeat(BLUE, 1)], repeat([0, 0, 0, 0], 4), 3);
  assert.equal(measured.palette.total, 0);
  assert.deepEqual(measured.palette.colors.map((c) => [c.hex, c.ratio]), [['#2828C8', 0], ['#C82828', 0]]);
});

test('数え直し：同じ入力なら、何度でもまったく同じ結果になる', () => {
  for (const count of [3, 5, 8]) {
    const run = () => {
      const coarse = noisyImage(100, 70, [0, 30, 90, 91, 160, 230]);
      const detail = noisyImage(1000, 70, [0, 30, 90, 91, 160, 230]);
      const palette = medianCut(coarse, count);
      return measureShares(palette, assignColors(detail, palette));
    };
    const a = run();
    assert.deepEqual(a, run(), `色数${count}`);
    const sum = a.palette.colors.reduce((total, c) => total + c.ratio, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12);
    // 多い順に並んでいる
    a.palette.colors.forEach((c, i) => i && assert.ok(a.palette.colors[i - 1].count >= c.count));
  }
});

// 段階ごとの釣り合い（少ないほうの側の割合）を、メディアンカットと数え直しを通して求める
function balancesOf(input, count) {
  const coarse = medianCut(input, count);
  const { palette } = measureShares(coarse, assignColors(input, coarse));
  return { palette, balances: splitBalances(palette.rules, palette.colors.map((color) => color.count)) };
}

// 黒から白へなだらかに変わるグラデーション（0〜255 の灰色が1画素ずつ）
const gradient = () => image(Array.from({ length: 256 }, (_, v) => [v, v, v]));

test('段階ごとの釣り合い：なだらかなグラデーションは、どの段階も半分ずつ', () => {
  // 4色：25%ずつ
  const four = balancesOf(gradient(), 4);
  assert.deepEqual(four.balances, [0.5, 0.5, 0.5]);
  assert.deepEqual(four.palette.colors.map((color) => color.ratio), [0.25, 0.25, 0.25, 0.25]);
  // 3色：50%・25%・25%（% はばらつくが、どの段階も半分ずつ）
  const three = balancesOf(gradient(), 3);
  assert.deepEqual(three.balances, [0.5, 0.5]);
  assert.deepEqual(three.palette.colors.map((color) => color.ratio), [0.5, 0.25, 0.25]);
});

test('段階ごとの釣り合い：色のかたまりがある画像では、偏った段階がある', () => {
  // 60%・30%・10% の3色
  const input = image([...repeat([20, 40, 90], 60), ...repeat([230, 220, 200], 30), ...repeat([210, 70, 40], 10)]);
  const { balances } = balancesOf(input, 3);
  assert.equal(balances.length, 2);
  assert.ok(Math.min(...balances) < 0.4);
});

test('段階ごとの釣り合い：画素数は数え直した値で、下の段階から順に返す', () => {
  const rules = { channel: 0, threshold: 100, below: { index: 0 },
    above: { channel: 1, threshold: 50, below: { index: 1 }, above: { index: 2 } } };
  assert.deepEqual(splitBalances(rules, [50, 30, 20]), [0.4, 0.5]);
  // 両側とも0画素の段階は数えない
  assert.deepEqual(splitBalances(rules, [50, 0, 0]), [0]);
});

test('段階ごとの釣り合い：段階がない（1色・すべて透明）なら空', () => {
  assert.deepEqual(balancesOf(image(repeat([10, 10, 10], 20)), 5).balances, []);
  assert.deepEqual(splitBalances(null, []), []);
});
