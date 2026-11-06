// パネルの欄の折りたたみ：保存した開閉の状態の読み取りと書き出し。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseClosedSections, serializeClosedSections } from '../js/sections.js';

const NAMES = ['image', 'lines', 'palette', 'contrast'];

test('保存した文字から、閉じた欄の名前を取り出す（並びは欄の順）', () => {
  assert.deepEqual(parseClosedSections('["lines"]', NAMES), ['lines']);
  assert.deepEqual(parseClosedSections('["contrast","image"]', NAMES), ['image', 'contrast']);
  assert.deepEqual(parseClosedSections('[]', NAMES), []);
});

test('何も保存していないときや、壊れた値はすべて開く', () => {
  for (const text of [null, '', '{', 'null', '"lines"', '{"lines":true}', '42', 'true']) {
    assert.deepEqual(parseClosedSections(text, NAMES), [], JSON.stringify(text));
  }
});

test('知らない欄の名前や、文字でない値、重なった名前は無視する', () => {
  assert.deepEqual(parseClosedSections('["lines","grid","__proto__",1,null,"lines"]', NAMES), ['lines']);
});

test('閉じた欄の名前を、欄の順にそろえて書き出す。読み取ると元に戻る', () => {
  assert.equal(serializeClosedSections(['palette', 'image'], NAMES), '["image","palette"]');
  assert.equal(serializeClosedSections([], NAMES), '[]');
  for (const closed of [[], ['image'], ['lines', 'contrast'], NAMES]) {
    assert.deepEqual(parseClosedSections(serializeClosedSections(closed, NAMES), NAMES), closed);
  }
});
