// コントラスト比（WCAG）、表示の切り捨て、HEX の読み取り。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRITERIA, luminance, contrastRatio, hexContrast, formatRatio, parseHex, meetsCriteria } from '../js/contrast.js';
import { defaultIndex } from '../js/contrast-view.js';

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

test('基準を満たすかどうか：判定は丸める前の値で、基準の値ちょうどは満たす', () => {
  const all = (value) => ({ AA: { normal: value, large: value }, AAA: { normal: value, large: value } });
  assert.deepEqual(meetsCriteria(1), all(false));
  assert.deepEqual(meetsCriteria(21), all(true));
  assert.deepEqual(meetsCriteria(2.9999999), all(false));
  assert.deepEqual(meetsCriteria(3), { AA: { normal: false, large: true }, AAA: { normal: false, large: false } });
  // 4.4999… は表示では「4.49」。4.5 の基準は満たさない
  assert.deepEqual(meetsCriteria(4.4999999), { AA: { normal: false, large: true }, AAA: { normal: false, large: false } });
  assert.deepEqual(meetsCriteria(4.5), { AA: { normal: true, large: true }, AAA: { normal: false, large: true } });
  assert.deepEqual(meetsCriteria(6.9999999), { AA: { normal: true, large: true }, AAA: { normal: false, large: true } });
  assert.deepEqual(meetsCriteria(7), all(true));
});

test('欄の初期値：背景は1番目、文字は1番目とのコントラスト比がいちばん大きい色', () => {
  const colors = (...hexes) => hexes.map((hex) => ({ hex }));
  const photo = colors('#E8E2D6', '#D9D2C4', '#1F3A5F', '#000000', '#D9482B');
  assert.equal(defaultIndex('bg', photo), 0);
  assert.equal(defaultIndex('fg', photo), 3);
  // 同じ比なら、色リストで上にある色
  assert.equal(defaultIndex('fg', colors('#FFFFFF', '#777777', '#000000', '#000000')), 2);
  assert.equal(defaultIndex('fg', colors('#FFFFFF', '#000000', '#000000')), 1);
  // 色が1つ以下なら1番目
  assert.equal(defaultIndex('fg', colors('#FFFFFF')), 0);
  assert.equal(defaultIndex('fg', []), 0);
});
