// 重ねる線の色：白・黒・マゼンタと、縁取り（白い線に黒い縁）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineStyle } from '../js/lines.js';

test('白・黒・マゼンタは、縁を付けない', () => {
  assert.deepEqual(lineStyle('white'), { stroke: '#ffffff', casing: null, casingOpacity: null });
  assert.deepEqual(lineStyle('black'), { stroke: '#000000', casing: null, casingOpacity: null });
  assert.deepEqual(lineStyle('magenta'), { stroke: '#ff00ff', casing: null, casingOpacity: null });
});

test('縁取りは、白い線に不透明度60%の黒い縁', () => {
  assert.deepEqual(lineStyle('outline'), { stroke: '#ffffff', casing: '#000000', casingOpacity: 0.6 });
});
