// 比率グリッド：短い部分の割合（長い部分：短い部分＝比率：1）、引く線の一覧、線の位置の文。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortPart, gridLines, gridPositionText } from '../js/grid.js';
import { GOLDEN, SILVER } from '../js/ratios.js';

test('短い部分と長い部分の位置', () => {
  assert.equal(shortPart('golden').toFixed(1), '38.2');
  assert.equal((100 - shortPart('golden')).toFixed(1), '61.8');
  assert.equal(shortPart('silver').toFixed(1), '41.4');
  assert.equal((100 - shortPart('silver')).toFixed(1), '58.6');
});

test('長い部分÷短い部分 が比率になる', () => {
  for (const [type, ratio] of [['golden', GOLDEN], ['silver', SILVER]]) {
    const s = shortPart(type);
    assert.ok(Math.abs((100 - s) / s - ratio) < 1e-12, type);
  }
});

test('引く線：両側なら縦横2本ずつ、片側なら選んだ辺から1本、比率が「なし」なら0本', () => {
  const s = shortPart('silver');
  assert.deepEqual(gridLines({ type: 'silver', mode: 'both', side: 'left' }), [
    [s, 0, s, 100], [100 - s, 0, 100 - s, 100], [0, s, 100, s], [0, 100 - s, 100, 100 - s],
  ]);
  assert.deepEqual(gridLines({ type: 'silver', mode: 'one', side: 'left' }), [[s, 0, s, 100]]);
  assert.deepEqual(gridLines({ type: 'silver', mode: 'one', side: 'right' }), [[100 - s, 0, 100 - s, 100]]);
  assert.deepEqual(gridLines({ type: 'silver', mode: 'one', side: 'top' }), [[0, s, 100, s]]);
  assert.deepEqual(gridLines({ type: 'none', mode: 'both', side: 'left' }), []);
  assert.deepEqual(gridLines({ type: 'none', mode: 'one', side: 'top' }), []);
});

test('片側・下：下端から41.4%（上端から58.6%）に1本', () => {
  const [line, ...rest] = gridLines({ type: 'silver', mode: 'one', side: 'bottom' });
  assert.equal(rest.length, 0);
  assert.equal(line[0], 0);
  assert.equal(line[2], 100);
  assert.equal(line[1], line[3]);
  assert.equal(line[1].toFixed(1), '58.6');
  // 黄金比・片側・右：左端から61.8%
  assert.equal(gridLines({ type: 'golden', mode: 'one', side: 'right' })[0][0].toFixed(1), '61.8');
});

test('片側モードの線の位置の文：両側や比率が「なし」のときは出さない', () => {
  const text = (type, side) => gridPositionText({ type, mode: 'one', side });
  assert.equal(text('silver', 'left'), '左端から41.4%');
  assert.equal(text('silver', 'right'), '右端から41.4%');
  assert.equal(text('silver', 'top'), '上端から41.4%');
  assert.equal(text('silver', 'bottom'), '下端から41.4%');
  assert.equal(text('golden', 'left'), '左端から38.2%');
  assert.equal(text('golden', 'bottom'), '下端から38.2%');
  assert.equal(gridPositionText({ type: 'silver', mode: 'both', side: 'left' }), null);
  assert.equal(gridPositionText({ type: 'none', mode: 'one', side: 'left' }), null);
});
