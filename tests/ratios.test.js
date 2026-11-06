// 縦横比の計測と、近い比率（±2%）の選び方、画像の情報の欄に出す文。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOLDEN, SILVER, measureAspect, imageInfoTexts } from '../js/ratios.js';

test('比率の定数', () => {
  assert.equal(GOLDEN.toFixed(6), '1.618034');
  assert.equal(SILVER, Math.sqrt(2));
});

test('白銀比の画像：横長・縦長に関係なく 長辺÷短辺 で比べる', () => {
  const landscape = measureAspect(1414, 1000);
  assert.equal(landscape.value.toFixed(3), '1.414');
  assert.equal(landscape.orientation, '横長');
  assert.equal(landscape.nearest.name, '白銀比（A判・B判）');

  const portrait = measureAspect(1000, 1414);
  assert.equal(portrait.orientation, '縦長');
  assert.deepEqual(portrait.nearest, landscape.nearest);
});

test('正方形', () => {
  const square = measureAspect(800, 800);
  assert.equal(square.value, 1);
  assert.equal(square.orientation, '正方形');
  assert.deepEqual(square.nearest, { name: '1:1', value: 1, diff: 0 });
});

test('候補の比率それぞれ', () => {
  const cases = [
    [1024, 768, '4:3'],
    [1200, 800, '3:2'],
    [1618, 1000, '黄金比'],
    [1920, 1080, '16:9'],
    [793, 800, '1:1'], // 正方形に近い（直角の線が、もう一方の対角線のすぐ横を通る例）
  ];
  for (const [width, height, name] of cases) {
    assert.equal(measureAspect(width, height).nearest?.name, name, `${width}×${height}`);
  }
});

test('±2% の内側なら近い比率を出し、外側なら「なし」', () => {
  const inside = measureAspect(1019, 1000); // 1:1 との差 1.9%
  assert.equal(inside.nearest.name, '1:1');
  assert.equal((inside.nearest.diff * 100).toFixed(1), '1.9');

  assert.equal(measureAspect(1021, 1000).nearest, null); // 1:1 との差 2.1%
  assert.equal(measureAspect(1300, 1000).nearest, null); // 4:3 との差 2.5%
});

test('画像の情報の文：大きさ、縦横比、近い比率', () => {
  assert.deepEqual(imageInfoTexts(1414, 1000), {
    size: '1414 × 1000 px',
    aspect: '1:1.414（横長）',
    nearest: '白銀比（A判・B判）\n1:1.414　差 0.0%',
  });
  assert.deepEqual(imageInfoTexts(1000, 1618), {
    size: '1000 × 1618 px',
    aspect: '1:1.618（縦長）',
    nearest: '黄金比\n1:1.618　差 0.0%',
  });
  assert.deepEqual(imageInfoTexts(800, 800), {
    size: '800 × 800 px',
    aspect: '1:1.000（正方形）',
    nearest: '1:1\n1:1.000　差 0.0%',
  });
  assert.equal(imageInfoTexts(793, 800).nearest, '1:1\n1:1.000　差 0.9%');
  assert.equal(imageInfoTexts(1300, 1000).nearest, '近い比率なし');
});
