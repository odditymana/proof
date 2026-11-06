// 比率グリッド：短い部分の割合（長い部分：短い部分＝比率：1）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortPart } from '../js/grid.js';
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
