// 螺旋（黄金比・白銀比）：当てはめる長方形、円弧のつながり、回る向き、中心の位置。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spiralGeometry } from '../js/spiral.js';
import { GOLDEN, SILVER } from '../js/ratios.js';

const EPS = 1e-9;
const KINDS = { golden: { ratio: GOLDEN, levels: 8 }, silver: { ratio: SILVER, levels: 10 } };
const CORNERS = ['tl', 'tr', 'bl', 'br'];
const SIZES = [
  [1414, 1000], [1000, 1414], [1618, 1000], [1000, 1618],
  [800, 800], [1920, 1080], [1080, 1920], [1000, 1200],
];

const close = (a, b, message) => assert.ok(Math.abs(a - b) < EPS, `${message}: ${a} と ${b}`);
const closePoint = (p, q, message) => {
  close(p[0], q[0], `${message}（横）`);
  close(p[1], q[1], `${message}（縦）`);
};

// すべての組み合わせで、決まりを確かめる
function eachCase(fn) {
  for (const kind of Object.keys(KINDS)) {
    for (const [width, height] of SIZES) {
      for (const corner of CORNERS) {
        fn({ kind, width, height, corner, label: `${kind} ${width}×${height} ${corner}` },
          spiralGeometry(kind, width, height, corner));
      }
    }
  }
}

test('長方形：画像からはみ出さず、巻き始めの角に寄せ、長辺を画像の長辺に合わせる', () => {
  eachCase(({ kind, width, height, corner, label }, { rect }) => {
    const { ratio } = KINDS[kind];
    assert.ok(rect.x > -EPS && rect.y > -EPS, label);
    assert.ok(rect.x + rect.w < width + EPS && rect.y + rect.h < height + EPS, label);
    close(corner.includes('r') ? rect.x + rect.w : rect.x, corner.includes('r') ? width : 0, `${label} 左右`);
    close(corner.includes('b') ? rect.y + rect.h : rect.y, corner.includes('b') ? height : 0, `${label} 上下`);
    close(Math.max(rect.w, rect.h) / Math.min(rect.w, rect.h), ratio, `${label} 比率`);
    assert.equal(rect.h > rect.w, height > width, `${label} 向き`);
    // いちばん大きい：長辺か短辺のどちらかが画像いっぱい
    assert.ok(Math.abs(rect.w - width) < EPS || Math.abs(rect.h - height) < EPS, `${label} 大きさ`);
  });
});

test('円弧：段の数は固定、巻き始めは長方形の角、つなぎ目は一致し、半径は作図どおり', () => {
  eachCase(({ kind, corner, label }, { rect, arcs, dividers }) => {
    assert.equal(arcs.length, KINDS[kind].levels, label);
    assert.equal(dividers.length, KINDS[kind].levels, label);
    const start = [
      corner.includes('r') ? rect.x + rect.w : rect.x,
      corner.includes('b') ? rect.y + rect.h : rect.y,
    ];
    closePoint(arcs[0].from, start, `${label} 巻き始め`);
    arcs.forEach(({ rx, ry, from, to }, i) => {
      // 四分の一の円・楕円なので、両端の横の差が横の半径、縦の差が縦の半径
      close(Math.abs(to[0] - from[0]), rx, `${label} ${i}段目の横の半径`);
      close(Math.abs(to[1] - from[1]), ry, `${label} ${i}段目の縦の半径`);
      if (i > 0) closePoint(arcs[i - 1].to, from, `${label} ${i}段目のつなぎ目`);
      for (const [x, y] of [from, to]) {
        assert.ok(x > rect.x - EPS && x < rect.x + rect.w + EPS && y > rect.y - EPS && y < rect.y + rect.h + EPS, label);
      }
    });
  });
});

test('回る向き：横長（正方形を含む）は左下・右上が時計回り、右下・左上が反時計回り', () => {
  for (const kind of Object.keys(KINDS)) {
    for (const [width, height] of [[1414, 1000], [800, 800]]) {
      const turns = Object.fromEntries(CORNERS.map((c) => [c, spiralGeometry(kind, width, height, c).clockwise]));
      assert.deepEqual(turns, { tl: false, tr: true, bl: true, br: false }, `${kind} ${width}×${height}`);
    }
  }
});

test('回る向き：clockwise の値と、実際に描いた円弧の回り方が一致する', () => {
  eachCase(({ label }, { clockwise, arcs, pole }) => {
    // 中心から見た円弧の両端の外積。画面の座標（下向きが正）では、正なら時計回り
    for (const { from, to } of arcs) {
      const a = [from[0] - pole[0], from[1] - pole[1]];
      const b = [to[0] - pole[0], to[1] - pole[1]];
      const cross = a[0] * b[1] - a[1] * b[0];
      assert.equal(cross > 0, clockwise, label);
    }
  });
});

test('中心：長方形の角から対角線に下ろした直角の線の足と同じ点', () => {
  eachCase(({ label }, { rect, pole }) => {
    const corners = [
      [rect.x, rect.y], [rect.x + rect.w, rect.y],
      [rect.x + rect.w, rect.y + rect.h], [rect.x, rect.y + rect.h],
    ];
    const foot = (p, a, b) => {
      const d = [b[0] - a[0], b[1] - a[1]];
      const t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2);
      return [a[0] + t * d[0], a[1] + t * d[1]];
    };
    // 対角線2本 × その上にない角2つ、のどれかの足と一致する
    const candidates = [
      foot(corners[1], corners[0], corners[2]), foot(corners[3], corners[0], corners[2]),
      foot(corners[0], corners[1], corners[3]), foot(corners[2], corners[1], corners[3]),
    ];
    const hit = candidates.some((q) => Math.hypot(q[0] - pole[0], q[1] - pole[1]) < 1e-6);
    assert.ok(hit, label);
  });
});

test('中心：長方形の両端から 比率²/(1+比率²)（黄金比 72.4%、白銀比 66.7%）', () => {
  eachCase(({ kind, label }, { rect, pole }) => {
    const r = KINDS[kind].ratio;
    const p = (r * r) / (1 + r * r);
    const u = (pole[0] - rect.x) / rect.w;
    const v = (pole[1] - rect.y) / rect.h;
    assert.ok(Math.abs(u - p) < EPS || Math.abs(u - (1 - p)) < EPS, `${label} 横`);
    assert.ok(Math.abs(v - p) < EPS || Math.abs(v - (1 - p)) < EPS, `${label} 縦`);
  });
});

test('中心の表示：テスト画像での値', () => {
  const percent = (kind, width, height, corner) => {
    const { pole } = spiralGeometry(kind, width, height, corner);
    return [(pole[0] / width * 100).toFixed(1), (pole[1] / height * 100).toFixed(1)];
  };
  assert.deepEqual(percent('silver', 1414, 1000, 'bl'), ['66.7', '66.7']);
  assert.deepEqual(percent('golden', 1618, 1000, 'bl'), ['72.4', '72.4']);
});

test('白銀比の画像では、白銀比の螺旋の中心が三分割の交点と重なる', () => {
  for (const [width, height] of [[SILVER * 1000, 1000], [1000, SILVER * 1000]]) {
    for (const corner of CORNERS) {
      const { pole } = spiralGeometry('silver', width, height, corner);
      for (const t of [pole[0] / width, pole[1] / height]) {
        assert.ok(Math.abs(t - 1 / 3) < 1e-12 || Math.abs(t - 2 / 3) < 1e-12, `${width}×${height} ${corner}`);
      }
    }
  }
});

test('最初の分割線：白銀比は長辺の50%、黄金比は巻き始めの側から正方形を切り取る位置', () => {
  eachCase(({ kind, corner, label }, { rect, dividers }) => {
    const [x1, y1, x2, y2] = dividers[0];
    const portrait = rect.h > rect.w;
    if (portrait) {
      // 縦長：横の線
      close(y1, y2, label);
      const expected = kind === 'silver'
        ? rect.y + rect.h / 2
        : (corner.includes('b') ? rect.y + rect.h - rect.w : rect.y + rect.w);
      close(y1, expected, label);
    } else {
      // 横長：縦の線
      close(x1, x2, label);
      const expected = kind === 'silver'
        ? rect.x + rect.w / 2
        : (corner.includes('r') ? rect.x + rect.w - rect.h : rect.x + rect.h);
      close(x1, expected, label);
    }
  });
});

test('同じ入力なら、何度でもまったく同じ形になる', () => {
  for (const kind of Object.keys(KINDS)) {
    assert.deepEqual(spiralGeometry(kind, 1414, 1000, 'bl'), spiralGeometry(kind, 1414, 1000, 'bl'));
  }
});
