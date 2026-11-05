// 色の抽出結果の表示：割合の帯（カラーバー）、HEX値と%の一覧、上位3色の比。
// 比は計測した値をそのまま示すだけで、良し悪しの判定はしない。
// 一覧の各色は、押すと画像上でその色の場所を強調表示するボタン（押された状態を aria-pressed で伝える）。

export function renderPalette({ bar, list, top, note }, { colors }, requestedCount) {
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

  // 上位3色（2色しかなければ2色）の合計を100としたときの比
  const leaders = colors.slice(0, 3);
  top.hidden = leaders.length < 2;
  if (!top.hidden) {
    const sum = leaders.reduce((total, color) => total + color.ratio, 0);
    top.querySelector('dt').textContent = `上位${leaders.length}色の比`;
    top.querySelector('dd').textContent =
      leaders.map((color) => Math.round(color.ratio / sum * 100)).join(' : ');
  }

  if (colors.length === 0) {
    note.textContent = '不透明な画素がありませんでした。';
  } else if (colors.length < requestedCount) {
    note.textContent = `見分けられる色は${colors.length}色でした。`;
  } else {
    note.textContent = '';
  }
}

// 選んでいる色のボタンだけを「押された状態」にする（index が null なら全部解除）
export function setSelected(list, index) {
  for (const button of list.querySelectorAll('.palette-item')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.index) === index));
  }
}

export function formatPercent(ratio) {
  return ratio < 0.001 ? '<0.1%' : `${(ratio * 100).toFixed(1)}%`;
}
