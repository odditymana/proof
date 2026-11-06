// 画像の反転：変形の文字と、反転していることを伝える表示。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flipTransform, flipLabel } from '../js/flip.js';

const STATES = {
  none: { horizontal: false, vertical: false },
  horizontal: { horizontal: true, vertical: false },
  vertical: { horizontal: false, vertical: true },
  both: { horizontal: true, vertical: true },
};

// SVG の transform「translate(tx ty) scale(sx sy)」を、点 (x, y) に当てる
function applySvg(transform, [x, y]) {
  const [tx, ty, sx, sy] = transform.match(/-?\d+(\.\d+)?/g).map(Number);
  return [tx + sx * x, ty + sy * y];
}

test('反転しないときは、変形を付けない', () => {
  assert.deepEqual(flipTransform(STATES.none), { svg: null, css: '' });
});

test('変形の文字（4通り）', () => {
  assert.deepEqual(flipTransform(STATES.horizontal), { svg: 'translate(100 0) scale(-1 1)', css: 'scale(-1, 1)' });
  assert.deepEqual(flipTransform(STATES.vertical), { svg: 'translate(0 100) scale(1 -1)', css: 'scale(1, -1)' });
  assert.deepEqual(flipTransform(STATES.both), { svg: 'translate(100 100) scale(-1 -1)', css: 'scale(-1, -1)' });
});

test('重ねる表示（0〜100の%）の点が、反転した位置に移る', () => {
  assert.deepEqual(applySvg(flipTransform(STATES.horizontal).svg, [30, 20]), [70, 20]);
  assert.deepEqual(applySvg(flipTransform(STATES.vertical).svg, [30, 20]), [30, 80]);
  assert.deepEqual(applySvg(flipTransform(STATES.both).svg, [30, 20]), [70, 80]);
  // 四隅は四隅に移り、範囲（0〜100）からはみ出さない
  for (const state of [STATES.horizontal, STATES.vertical, STATES.both]) {
    const corners = [[0, 0], [100, 0], [0, 100], [100, 100]];
    const moved = corners.map((p) => applySvg(flipTransform(state).svg, p).join(',')).sort();
    assert.deepEqual(moved, corners.map((p) => p.join(',')).sort());
  }
});

test('反転していることを伝える表示。反転していないときは何も出さない', () => {
  assert.equal(flipLabel(STATES.none), '');
  assert.equal(flipLabel(STATES.horizontal), '左右反転中');
  assert.equal(flipLabel(STATES.vertical), '上下反転中');
  assert.equal(flipLabel(STATES.both), '左右・上下反転中');
});
