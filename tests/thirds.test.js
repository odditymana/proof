// 三分割：縦横それぞれ 33.3% と 66.7% に線。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { thirdsLines } from '../js/thirds.js';

test('縦横それぞれ 33.3% と 66.7% に線（4本）', () => {
  const lines = thirdsLines();
  assert.equal(lines.length, 4);
  const vertical = lines.filter(([x1, , x2]) => x1 === x2).map(([x]) => x.toFixed(1));
  const horizontal = lines.filter(([, y1, , y2]) => y1 === y2).map(([, y]) => y.toFixed(1));
  assert.deepEqual(vertical, ['33.3', '66.7']);
  assert.deepEqual(horizontal, ['33.3', '66.7']);
  for (const [x1, y1, x2, y2] of lines) {
    // 画像の端から端まで
    assert.ok((x1 === x2 && y1 === 0 && y2 === 100) || (y1 === y2 && x1 === 0 && x2 === 100));
  }
});
