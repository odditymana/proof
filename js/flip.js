// 画像の反転：絵を反転して見て、見慣れて気づけなかった偏りを確かめるためのもの。
// 表示の向きだけを変える。画像と、画素ごとに重ねる強調表示だけを反転し、重ねる線は画面の向きのまま引く
// （反転した絵を新しい1枚として、いつもどおりの線で見る）。線の位置は画像の縦横の画素数だけで決まり、
// 反転しても変わらないので、パネルの数値は画面に見えている向きのまま正しい。
// 色の抽出は画像そのものの画素から計測するので、反転の影響を受けない。

// 反転の状態 { horizontal, vertical } から、変形を返す。
// - svg：重ねる表示（座標は0〜100の%）のレイヤーに付ける transform。反転しないときは null
// - css：画像の要素に付ける transform。反転しないときは空の文字
export function flipTransform({ horizontal, vertical }) {
  if (!horizontal && !vertical) return { svg: null, css: '' };
  const sx = horizontal ? -1 : 1;
  const sy = vertical ? -1 : 1;
  return {
    svg: `translate(${horizontal ? 100 : 0} ${vertical ? 100 : 0}) scale(${sx} ${sy})`,
    css: `scale(${sx}, ${sy})`,
  };
}

// 反転していることを伝える短い表示。反転していないときは空の文字
export function flipLabel({ horizontal, vertical }) {
  if (horizontal && vertical) return '左右・上下反転中';
  if (horizontal) return '左右反転中';
  if (vertical) return '上下反転中';
  return '';
}
