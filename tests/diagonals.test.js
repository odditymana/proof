// 直角の線が長辺と交わる位置（長辺の端から（短辺÷長辺）の2乗）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perpendicularHit } from '../js/diagonals.js';
import { GOLDEN, SILVER } from '../js/ratios.js';

test('白銀比の画像では50%、黄金比の画像では38.2%、正方形では100%', () => {
  assert.ok(Math.abs(perpendicularHit(SILVER * 1000, 1000) - 50) < 1e-9);
  assert.ok(Math.abs(perpendicularHit(GOLDEN * 1000, 1000) - 100 / GOLDEN ** 2) < 1e-9);
  assert.equal(perpendicularHit(GOLDEN * 1000, 1000).toFixed(1), '38.2');
  assert.equal(perpendicularHit(1414, 1000).toFixed(1), '50.0');
  assert.equal(perpendicularHit(800, 800), 100);
});

test('縦横を入れ替えても同じ', () => {
  assert.equal(perpendicularHit(1000, 1414), perpendicularHit(1414, 1000));
  assert.equal(perpendicularHit(1080, 1920), perpendicularHit(1920, 1080));
});

test('画像の画素の上で、対角線と直角に交わる', () => {
  // 横長の画像で、右上の角 (W, 0) から長辺（下の辺）の 右端から h% の点へ引く線と、左上→右下の対角線
  for (const [W, H] of [[1414, 1000], [1618, 1000], [1200, 800], [1920, 1080], [793, 792]]) {
    const h = perpendicularHit(W, H) / 100;
    const line = [-h * W, H];
    const diagonal = [W, H];
    const dot = line[0] * diagonal[0] + line[1] * diagonal[1];
    assert.ok(Math.abs(dot) < 1e-6, `${W}×${H}`);
  }
});
