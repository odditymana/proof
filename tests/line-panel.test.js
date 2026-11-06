// 「重ねる線」の欄で、どの段を出すか。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleRows } from '../js/line-panel.js';

// 初期値：白銀比・両側・左、補助線はオフ、螺旋はなし・左下
const initial = { type: 'silver', mode: 'both', side: 'left', spiral: 'none', spiralCorner: 'bl', color: 'white', opacity: '100' };
const rows = (changes, hasImage = true) => visibleRows({ ...initial, ...changes }, hasImage);

test('初期値：モードの段だけを出す', () => {
  assert.deepEqual(rows({}), {
    mode: true, side: false, gridPosition: false, perpendicularPosition: false, spiralCorner: false, spiralPosition: false,
  });
});

test('片側のときだけ、基準の辺と線の位置を出す', () => {
  assert.equal(rows({ mode: 'one' }).side, true);
  assert.equal(rows({ mode: 'one' }).gridPosition, true);
  assert.equal(rows({ mode: 'both' }).side, false);
  assert.equal(rows({ mode: 'both' }).gridPosition, false);
});

test('比率が「なし」のときは、モード・基準の辺・線の位置を隠す（片側を選んでいても）', () => {
  for (const mode of ['both', 'one']) {
    const r = rows({ type: 'none', mode });
    assert.deepEqual([r.mode, r.side, r.gridPosition], [false, false, false], mode);
  }
  assert.equal(rows({ type: 'golden', mode: 'one' }).side, true);
});

test('直角の線の位置は、直角の線がオンで、画像があるときだけ出す', () => {
  assert.equal(rows({ perpendiculars: 'on' }).perpendicularPosition, true);
  assert.equal(rows({ perpendiculars: 'on' }, false).perpendicularPosition, false);
  assert.equal(rows({}).perpendicularPosition, false);
  // 三分割・対角線だけでは出さない
  assert.equal(rows({ thirds: 'on', diagonals: 'on' }).perpendicularPosition, false);
});

test('螺旋が「なし」以外のときだけ巻き始めの角を出し、位置の文は画像があるときだけ出す', () => {
  for (const spiral of ['golden', 'silver']) {
    assert.equal(rows({ spiral }).spiralCorner, true, spiral);
    assert.equal(rows({ spiral }).spiralPosition, true, spiral);
    assert.equal(rows({ spiral }, false).spiralCorner, true, spiral);
    assert.equal(rows({ spiral }, false).spiralPosition, false, spiral);
  }
  assert.equal(rows({ spiral: 'none' }).spiralCorner, false);
});

test('螺旋の段は、比率が「なし」でも出せる', () => {
  const r = rows({ type: 'none', spiral: 'silver' });
  assert.equal(r.mode, false);
  assert.equal(r.spiralCorner, true);
  assert.equal(r.spiralPosition, true);
});
