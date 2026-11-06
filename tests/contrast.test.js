// コントラスト比（WCAG）、表示の切り捨て、HEX の読み取り。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRITERIA, luminance, contrastRatio, hexContrast, formatRatio, parseHex } from '../js/contrast.js';

test('相対輝度：白は1、黒は0', () => {
  assert.equal(luminance(255, 255, 255), 1);
  assert.equal(luminance(0, 0, 0), 0);
});

test('コントラスト比：よく知られた値', () => {
  assert.equal(hexContrast('#FFFFFF', '#000000'), 21);
  assert.equal(hexContrast('#1F3A5F', '#1F3A5F'), 1);
  assert.equal(formatRatio(hexContrast('#767676', '#FFFFFF')), '4.54');
});

test('コントラスト比は、2色の順番によらない', () => {
  assert.equal(hexContrast('#1F3A5F', '#E8E2D6'), hexContrast('#E8E2D6', '#1F3A5F'));
  assert.equal(contrastRatio(0.2, 0.7), contrastRatio(0.7, 0.2));
});

test('表示は小数2桁で切り捨て（4.496 を「4.50」と見せない）', () => {
  assert.equal(formatRatio(4.499), '4.49');
  assert.equal(formatRatio(4.496), '4.49');
  assert.equal(formatRatio(4.4999999999999), '4.49');
  assert.equal(formatRatio(6.6449), '6.64');
  assert.equal(formatRatio(4.5), '4.50');
  assert.equal(formatRatio(4.56), '4.56');
});

test('整数は小数2桁をつけて表示する', () => {
  assert.equal(formatRatio(1), '1.00');
  assert.equal(formatRatio(5), '5.00');
  assert.equal(formatRatio(21), '21.00');
});

test('ちょうど小数2桁の値は、小数の誤差で切り下がらない（1.00〜21.00 を 0.01 刻みで全部）', () => {
  // 4.56×100＝455.99999… のように、×100 すると誤差で少し小さくなる値がある
  assert.ok(4.56 * 100 < 456);
  for (let i = 100; i <= 2100; i++) {
    const expected = `${Math.floor(i / 100)}.${String(i % 100).padStart(2, '0')}`;
    assert.equal(formatRatio(i / 100), expected);
  }
});

test('WCAG の基準の値', () => {
  assert.deepEqual(CRITERIA, {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 },
  });
});

test('HEX の読み取り：受け付けて「#」＋大文字6桁にそろえる', () => {
  const cases = [
    ['#1F3A5F', '#1F3A5F'],
    ['#1f3a5f', '#1F3A5F'],
    ['1F3A5F', '#1F3A5F'],
    ['  #1f3a5f  ', '#1F3A5F'],
    ['#abc', '#AABBCC'],
    ['ABC', '#AABBCC'],
    [' fff ', '#FFFFFF'],
  ];
  for (const [input, hex] of cases) {
    assert.deepEqual(parseHex(input), { hex }, JSON.stringify(input));
  }
});

test('HEX の読み取り：透明度つき（4桁・8桁）は使えない', () => {
  for (const input of ['#ABCD', 'abcd', '#1F3A5F80', '1f3a5f80']) {
    assert.deepEqual(parseHex(input), { error: '透明度つきの色は使えません。' }, input);
  }
});

test('HEX の読み取り：それ以外は読み取れない', () => {
  for (const input of ['', '#', '#12', '#12345', '#1234567', 'GGGGGG', '##123456', '#12 345']) {
    assert.deepEqual(parseHex(input), { error: '3桁か6桁のHEXで入力してください（例：#1F3A5F）。' }, JSON.stringify(input));
  }
});
