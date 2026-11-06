// 対角線と直角の線：線の一覧と、直角の線が長辺と交わる位置（長辺の端から（短辺÷長辺）の2乗）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perpendicularHit, diagonalLines, perpendicularLines } from '../js/diagonals.js';
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

test('対角線：画像の対角線2本（縦長でも同じ線）', () => {
  assert.deepEqual(diagonalLines(1414, 1000), [[0, 0, 100, 100], [100, 0, 0, 100]]);
  assert.deepEqual(diagonalLines(1000, 1414), [[0, 0, 100, 100], [0, 100, 100, 0]]);
});

test('直角の線：白銀比の画像では、4本とも長辺の真ん中（50%）に当たる。縦長では縦横が入れ替わる', () => {
  assert.deepEqual(perpendicularLines(SILVER * 1000, 1000).map((l) => l.map((v) => Math.round(v * 1e9) / 1e9)), [
    [100, 0, 50, 100], [0, 100, 50, 0], [0, 0, 50, 100], [100, 100, 50, 0],
  ]);
  assert.deepEqual(perpendicularLines(1000, SILVER * 1000).map((l) => l.map((v) => Math.round(v * 1e9) / 1e9)), [
    [0, 100, 100, 50], [100, 0, 0, 50], [0, 0, 100, 50], [100, 100, 0, 50],
  ]);
});

test('直角の線：横長・縦長・正方形に近い画像のどれでも、画素の上で角から対角線に直角に交わる', () => {
  for (const [W, H] of [[1414, 1000], [1000, 1414], [1618, 1000], [1000, 1618], [1920, 1080], [1080, 1920], [793, 800]]) {
    const toPixels = ([x1, y1, x2, y2]) => [x1 / 100 * W, y1 / 100 * H, x2 / 100 * W, y2 / 100 * H];
    const diagonals = diagonalLines(W, H).map(toPixels);
    for (const line of perpendicularLines(W, H).map(toPixels)) {
      const [x1, y1, x2, y2] = line;
      // 始まりは画像の角
      assert.ok([0, W].includes(x1) && [0, H].includes(y1), `${W}×${H}`);
      // 角を通らない側の対角線と直角に交わる
      const crossing = diagonals.find(([a, b, c, d]) => !((a === x1 && b === y1) || (c === x1 && d === y1)));
      const dot = (x2 - x1) * (crossing[2] - crossing[0]) + (y2 - y1) * (crossing[3] - crossing[1]);
      assert.ok(Math.abs(dot) < 1e-6, `${W}×${H}`);
      // 終わりは反対側の長辺の上
      if (W >= H) assert.equal(y2, H - y1, `${W}×${H}`);
      else assert.equal(x2, W - x1, `${W}×${H}`);
    }
  }
});
