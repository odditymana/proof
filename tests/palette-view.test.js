// 色の抽出結果の表示：割合の表記（0.1%未満は「<0.1%」）、上位3色の比、一覧の下に出す一言。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPercent, topRatio, paletteNote } from '../js/palette-view.js';

test('割合の表記', () => {
  assert.equal(formatPercent(0), '<0.1%');
  assert.equal(formatPercent(0.0009), '<0.1%');
  assert.equal(formatPercent(0.001), '0.1%');
  assert.equal(formatPercent(0.024), '2.4%');
  assert.equal(formatPercent(0.5), '50.0%');
  assert.equal(formatPercent(1), '100.0%');
});

test('上位3色の比：合計を100としたときの比', () => {
  const colors = (...ratios) => ratios.map((ratio) => ({ ratio }));
  assert.deepEqual(topRatio(colors(0.5, 0.3, 0.2)), { count: 3, parts: [50, 30, 20] });
  assert.deepEqual(topRatio(colors(0.6, 0.2, 0.1, 0.1)), { count: 3, parts: [67, 22, 11] });
  // 2色しかなければ2色
  assert.deepEqual(topRatio(colors(0.75, 0.25)), { count: 2, parts: [75, 25] });
  // 1色以下なら出さない
  assert.equal(topRatio(colors(1)), null);
  assert.equal(topRatio([]), null);
});

test('色の一覧の下に出す一言', () => {
  const colors = (n) => Array.from({ length: n }, () => ({ ratio: 1 / n }));
  assert.equal(paletteNote(colors(0), 5), '不透明な画素がありませんでした。');
  assert.equal(paletteNote(colors(4), 5), '見分けられる色は4色でした。');
  assert.equal(paletteNote(colors(5), 5), '');
});
