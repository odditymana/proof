// 強調表示で、選んだ色以外を寄せる先のグレー（コントラスト比が大きいほう）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetGray } from '../js/highlight.js';

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
