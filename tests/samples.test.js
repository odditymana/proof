// サンプル画像で試す：サンプルの一覧、画像のファイルと名前の食い違い、切り替える設定、伝える一言。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SAMPLES, findSample, sampleFileName, settingsSummary, sampleMessage } from '../js/samples.js';
import { imageInfoTexts } from '../js/ratios.js';
import { spiralReadout } from '../js/spiral.js';

const root = new URL('../', import.meta.url);

// PNG の頭の部分（IHDR）から、縦横の画素数を読む
function pngSize(path) {
  const bytes = readFileSync(new URL(path, root));
  assert.equal(bytes.toString('latin1', 1, 4), 'PNG', `${path} は PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('サンプルは白銀比と黄金比の2枚で、画像は test-images/ の自作の画像', () => {
  assert.deepEqual(SAMPLES.map((sample) => sample.id), ['silver', 'golden']);
  for (const sample of SAMPLES) assert.match(sample.path, /^test-images\/[a-z-]+\.png$/);
});

test('画像の「近い比率」が、サンプルの名前（白銀比・黄金比）と一致する', () => {
  for (const sample of SAMPLES) {
    const { width, height } = pngSize(sample.path);
    assert.ok(imageInfoTexts(width, height).nearest.startsWith(sample.label), `${sample.path}：${width}×${height}`);
  }
});

test('見どころ：螺旋の中心が、白銀比では三分割の交点に、黄金比では対角線と直角の線の交点に来る', () => {
  const silver = findSample('silver');
  const golden = findSample('golden');
  // 三分割の交点（66.7%）
  const s = pngSize(silver.path);
  assert.equal(spiralReadout('silver', s.width, s.height, silver.settings.spiralCorner)[1], '中心：左端から66.7%・上端から66.7%');
  // 対角線と直角の線の交点は、長方形の両端から φ²/(1+φ²) ≒ 72.4%
  const g = pngSize(golden.path);
  assert.equal(spiralReadout('golden', g.width, g.height, golden.settings.spiralCorner)[1], '中心：左端から72.4%・上端から72.4%');
});

test('切り替える設定は、重ねる線の欄にある項目だけ（線の色・不透明度は変えない）', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const form = html.slice(html.indexOf('<form id="grid-form"'), html.indexOf('</form>', html.indexOf('<form id="grid-form"')));
  for (const sample of SAMPLES) {
    assert.ok(!('color' in sample.settings) && !('opacity' in sample.settings));
    for (const [name, value] of Object.entries(sample.settings)) {
      const selector = typeof value === 'boolean'
        ? `type="checkbox" name="${name}"`
        : `type="radio" name="${name}" value="${value}"`;
      assert.ok(form.includes(selector), `${sample.id}：${name}=${value}`);
    }
  }
});

test('切り替える設定の中身', () => {
  assert.deepEqual(findSample('silver').settings,
    { type: 'none', thirds: true, diagonals: false, perpendiculars: false, spiral: 'silver', spiralCorner: 'bl' });
  assert.deepEqual(findSample('golden').settings,
    { type: 'none', thirds: false, diagonals: true, perpendiculars: true, spiral: 'golden', spiralCorner: 'bl' });
  assert.equal(findSample('unknown'), null);
});

test('オンの線の名前を、パネルに並ぶ順に返す', () => {
  const off = { type: 'none', thirds: false, diagonals: false, perpendiculars: false, spiral: 'none' };
  assert.deepEqual(settingsSummary(off), []);
  assert.deepEqual(settingsSummary({ ...off, type: 'silver', thirds: true, diagonals: true, perpendiculars: true, spiral: 'golden' }),
    ['比率グリッド（白銀比）', '三分割', '対角線', '直角の線', '黄金螺旋']);
  assert.deepEqual(settingsSummary({ ...off, type: 'golden', spiral: 'silver' }), ['比率グリッド（黄金比）', '白銀比の螺旋']);
});

test('読み込んだときの一言と、ファイル名の表示', () => {
  assert.equal(sampleMessage(findSample('silver')),
    'サンプル画像（白銀比）を読み込みました。設定：三分割・白銀比の螺旋');
  assert.equal(sampleMessage(findSample('golden')),
    'サンプル画像（黄金比）を読み込みました。設定：対角線・直角の線・黄金螺旋');
  assert.equal(sampleFileName(findSample('silver')), 'silver-landscape.png（サンプル）');
  assert.equal(sampleFileName(findSample('golden')), 'golden-landscape.png（サンプル）');
});
