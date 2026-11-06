// 比率の定数と、画像の縦横比の計測。

export const GOLDEN = (1 + Math.sqrt(5)) / 2; // 黄金比 1:1.618…
export const SILVER = Math.SQRT2;             // 白銀比 1:1.414…（A判・B判の用紙の比率）

// 「近い比率」の候補。値はすべて 長辺÷短辺
const CANDIDATES = [
  { name: '1:1', value: 1 },
  { name: '4:3', value: 4 / 3 },
  { name: '3:2', value: 3 / 2 },
  { name: '白銀比（A判・B判）', value: SILVER },
  { name: '黄金比', value: GOLDEN },
  { name: '16:9', value: 16 / 9 },
];

// 候補との差がこの範囲（±2%）に収まれば「近い」とする
const TOLERANCE = 0.02;

// 縦長・横長に関係なく 長辺÷短辺 で比べる
export function measureAspect(width, height) {
  const value = Math.max(width, height) / Math.min(width, height);
  const orientation = width === height ? '正方形' : width > height ? '横長' : '縦長';

  let nearest = null;
  for (const candidate of CANDIDATES) {
    const diff = Math.abs(value / candidate.value - 1);
    if (diff <= TOLERANCE && (!nearest || diff < nearest.diff)) {
      nearest = { name: candidate.name, value: candidate.value, diff };
    }
  }

  return { value, orientation, nearest };
}

// 画像の情報の欄に出す文：大きさ、縦横比、近い比率
export function imageInfoTexts(width, height) {
  const { value, orientation, nearest } = measureAspect(width, height);
  return {
    size: `${width} × ${height} px`,
    aspect: `1:${value.toFixed(3)}（${orientation}）`,
    nearest: nearest
      ? `${nearest.name}\n1:${nearest.value.toFixed(3)}　差 ${(nearest.diff * 100).toFixed(1)}%`
      : '近い比率なし',
  };
}
