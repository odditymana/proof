// 強調表示：寄せる先のグレー（コントラスト比が大きいほう）、重ねる画像の画素、一言の文。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetGray, maskPixels, highlightMessage } from '../js/highlight.js';
import { TRANSPARENT } from '../js/palette.js';

const DARK = 0x1a;  // #1A1A1A
const LIGHT = 0xe6; // #E6E6E6

test('明るい色には暗いグレー、暗い色には明るいグレー', () => {
  assert.equal(targetGray({ r: 255, g: 255, b: 255 }), DARK);
  assert.equal(targetGray({ r: 0, g: 0, b: 0 }), LIGHT);
  assert.equal(targetGray({ r: 0xE8, g: 0xE2, b: 0xD6 }), DARK);
  assert.equal(targetGray({ r: 0x1F, g: 0x3A, b: 0x5F }), LIGHT);
});

test('中間の明るさの色：コントラスト比の大きいほうに分かれる', () => {
  // #808080：暗いグレーとは約4.41、明るいグレーとは約3.16
  assert.equal(targetGray({ r: 0x80, g: 0x80, b: 0x80 }), DARK);
  // #707070：暗いグレーとは約3.5、明るいグレーとは約4.0
  assert.equal(targetGray({ r: 0x70, g: 0x70, b: 0x70 }), LIGHT);
});

test('重ねる画像：選んだ色の画素は透明、それ以外はグレーを不透明度80%（255×0.8≒204）で', () => {
  const indices = Uint8Array.from([0, 1, TRANSPARENT, 0, 2]);
  const pixels = maskPixels(indices, 0, DARK);
  assert.ok(pixels instanceof Uint8ClampedArray);
  assert.deepEqual([...pixels], [
    0, 0, 0, 0,
    DARK, DARK, DARK, 204,
    DARK, DARK, DARK, 204, // 透明な画素（どの色にも属さない）もグレーを重ねる
    0, 0, 0, 0,
    DARK, DARK, DARK, 204,
  ]);
  assert.deepEqual([...maskPixels(Uint8Array.from([1, 0]), 1, LIGHT)], [0, 0, 0, 0, LIGHT, LIGHT, LIGHT, 204]);
});

test('強調表示の一言：画素があるときと、元の解像度の画像に画素がないとき', () => {
  const color = { hex: '#D9482B', ratio: 0.065 };
  assert.equal(highlightMessage(color, true), '#D9482B（6.5%）の場所を強調表示しています。');
  assert.equal(highlightMessage({ hex: '#EDE0D0', ratio: 0.0001 }, true), '#EDE0D0（<0.1%）の場所を強調表示しています。');
  assert.equal(highlightMessage({ hex: '#8F8878', ratio: 0 }, false),
    '#8F8878（0%）に当てはまる画素は、元の解像度の画像にはありません。縮小して計測したときだけ現れた色です。');
});
