// 色の抽出結果の表示：割合の帯（カラーバー）、HEX値と%の一覧、上位3色の比。
// 比は計測した値をそのまま示すだけで、良し悪しの判定はしない。
// 一覧の各色は、押すと画像上でその色の場所を強調表示するボタン（押された状態を aria-pressed で伝える）。

import { splitBalances } from './palette.js';

// 分け方のどの段階でも、少ないほうの側がこの割合以上なら「ほぼ半分ずつに分けた」とみなす。
// 明暗がなだらかな画像では各段階が46.6〜49.9%、色のかたまりがある今のテスト画像では
// いちばん偏った段階が36.6%以下だったので、その間の40%（多いほうが少ないほうの1.5倍未満）にした
const HALVED_MIN = 0.4;

// 分け方のすべての段階で、画素がほぼ半分ずつに分かれたか。段階がなければ false
export function isHalved(balances) {
  return balances.length > 0 && balances.every((balance) => balance >= HALVED_MIN);
}

export function renderPalette({ bar, list, top, note }, { colors, rules }, requestedCount) {
  bar.replaceChildren();
  list.replaceChildren();

  colors.forEach((color, index) => {
    const segment = document.createElement('span');
    segment.style.background = color.hex;
    segment.style.flexGrow = color.count;
    bar.append(segment);

    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-item';
    button.dataset.index = index;
    button.setAttribute('aria-pressed', 'false');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = color.hex;
    const hex = document.createElement('span');
    hex.textContent = color.hex;
    const percent = document.createElement('span');
    percent.className = 'percent';
    percent.textContent = formatPercent(color.ratio);
    button.append(swatch, hex, percent);
    item.append(button);
    list.append(item);
  });

  const ratio = topRatio(colors);
  top.hidden = !ratio;
  if (ratio) {
    top.querySelector('dt').textContent = `上位${ratio.count}色の比`;
    top.querySelector('dd').textContent = ratio.parts.join(' : ');
  }

  const halved = isHalved(splitBalances(rules, colors.map((color) => color.count)));
  note.textContent = paletteNote(colors, requestedCount, halved);
}

// 上位3色（2色しかなければ2色）の合計を100としたときの比。1色以下なら null。
// 細かく数えて0画素の色（縮小して計測したときだけ現れた色）は数に入れない
export function topRatio(colors) {
  const leaders = colors.filter((color) => color.ratio > 0).slice(0, 3);
  if (leaders.length < 2) return null;
  const sum = leaders.reduce((total, color) => total + color.ratio, 0);
  return { count: leaders.length, parts: leaders.map((color) => Math.round(color.ratio / sum * 100)) };
}

// 色の一覧の下に出す一言（なければ空の文字）。
// halved：分け方のすべての段階で画素がほぼ半分ずつに分かれた（isHalved）。このときの % は、
// 色の多さの違いではなく計算の手順で決まった値なので、そのことを伝える（良し悪しは言わない）
export function paletteNote(colors, requestedCount, halved = false) {
  if (colors.length === 0) return '不透明な画素がありませんでした。';
  const notes = [];
  if (colors.length < requestedCount) notes.push(`見分けられる色は${colors.length}色でした。`);
  // 原因（色の境目のにじみ・色のかたまりが分かれたなど）は1つに決まらないので、言い切らない
  if (colors.some((color) => color.ratio === 0)) {
    notes.push('0% の色は、縮小して計測したときだけ現れた色です（元の解像度の画像には当てはまる画素がありません）。');
  }
  if (halved) {
    notes.push('この画像では、色を分ける計算がどの段階でも画素をほぼ半分ずつに分けました（少ないほうが40%以上）。'
      + 'そのため、各色の % は色の多さの違いではなく、計算の手順で決まった値です。');
  }
  return notes.join('');
}

// 選んでいる色のボタンだけを「押された状態」にする（index が null なら全部解除）
export function setSelected(list, index) {
  for (const button of list.querySelectorAll('.palette-item')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.index) === index));
  }
}

// 0 は「0%」、0 より大きく0.1%未満は「<0.1%」（「1画素もない」と「わずかにある」を分ける）
export function formatPercent(ratio) {
  if (ratio === 0) return '0%';
  return ratio < 0.001 ? '<0.1%' : `${(ratio * 100).toFixed(1)}%`;
}
