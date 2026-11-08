// 色の抽出結果の表示：割合の表記（0.1%未満は「<0.1%」）、上位3色の比、一覧の下に出す一言。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPercent, topRatio, paletteNote, isHalved } from '../js/palette-view.js';

test('割合の表記：0 は「0%」、0 より大きく0.1%未満は「<0.1%」', () => {
  assert.equal(formatPercent(0), '0%');
  assert.equal(formatPercent(1e-6), '<0.1%');
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

test('上位3色の比：0% の色（縮小して計測したときだけ現れた色）は数に入れない', () => {
  const colors = (...ratios) => ratios.map((ratio) => ({ ratio }));
  // silver-portrait（5色）を数え直した割合
  assert.deepEqual(topRatio(colors(0.472, 0.415, 0.113, 0, 0)), { count: 3, parts: [47, 42, 11] });
  assert.deepEqual(topRatio(colors(0.859, 0.141, 0, 0)), { count: 2, parts: [86, 14] });
  assert.equal(topRatio(colors(1, 0, 0)), null);
});

test('色の一覧の下に出す一言', () => {
  const colors = (n) => Array.from({ length: n }, () => ({ ratio: 1 / n }));
  assert.equal(paletteNote(colors(0), 5), '不透明な画素がありませんでした。');
  assert.equal(paletteNote(colors(4), 5), '見分けられる色は4色でした。');
  assert.equal(paletteNote(colors(5), 5), '');
});

test('色の一覧の下に出す一言：0% の色があるとき（原因は言い切らない）', () => {
  const zero = '0% の色は、縮小して計測したときだけ現れた色です（元の解像度の画像には当てはまる画素がありません）。';
  const colors = (...ratios) => ratios.map((ratio) => ({ ratio }));
  assert.equal(paletteNote(colors(0.6, 0.4, 0, 0, 0), 5), zero);
  // 「見分けられる色は○色でした」と並んで出る（0% の色も1色に数える）
  assert.equal(paletteNote(colors(0.86, 0.14, 0, 0), 5), `見分けられる色は4色でした。${zero}`);
  // <0.1% でも画素があれば出さない
  assert.equal(paletteNote(colors(0.9995, 0.0005), 2), '');
});

test('ほぼ半分ずつの判定：すべての段階で、少ないほうが40%以上', () => {
  assert.equal(isHalved([0.5, 0.466, 0.499]), true);
  // ちょうど40%は含める
  assert.equal(isHalved([0.4, 0.5]), true);
  assert.equal(isHalved([0.3999, 0.5]), false);
  // gray-tones（地を切り分ける段階が36.6%）
  assert.equal(isHalved([0.488, 0.366, 0.427]), false);
  // 段階がなければ出さない
  assert.equal(isHalved([]), false);
});

test('色の一覧の下に出す一言：ほぼ半分ずつに分かれたとき（良し悪しは言わない）', () => {
  const halved = 'この画像では、色を分ける計算がどの段階でも画素をほぼ半分ずつに分けました（少ないほうが40%以上）。'
    + 'そのため、各色の % は色の多さの違いではなく、計算の手順で決まった値です。';
  const colors = (...ratios) => ratios.map((ratio) => ({ ratio }));
  assert.equal(paletteNote(colors(0.25, 0.25, 0.25, 0.125, 0.125), 5, true), halved);
  assert.equal(paletteNote(colors(0.5, 0.25, 0.25), 3, false), '');
  // 「見分けられる色は○色でした」と並んで出る
  assert.equal(paletteNote(colors(0.5, 0.25, 0.25), 5, true), `見分けられる色は3色でした。${halved}`);
});
