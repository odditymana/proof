// 色の割合の表記（0.1%未満は「<0.1%」）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPercent } from '../js/palette-view.js';

test('割合の表記', () => {
  assert.equal(formatPercent(0), '<0.1%');
  assert.equal(formatPercent(0.0009), '<0.1%');
  assert.equal(formatPercent(0.001), '0.1%');
  assert.equal(formatPercent(0.024), '2.4%');
  assert.equal(formatPercent(0.5), '50.0%');
  assert.equal(formatPercent(1), '100.0%');
});
