// コントラスト比の表示：文字の色と背景の色を選ぶ欄と、結果（比・基準を満たすか・見本）。
// 色は色リストの色から選ぶか、「HEXで入力」で打ち込む。

import { CRITERIA, hexContrast, formatRatio, parseHex } from './contrast.js';

const HEX_OPTION = 'hex';
const DEFAULT_INDEX = { fg: 1, bg: 0 }; // 初期値：文字＝色リストの2番目、背景＝1番目

export function createContrastView(root) {
  const result = root.querySelector('.contrast-result');
  const ratioText = result.querySelector('#contrast-ratio');
  const sample = result.querySelector('.contrast-sample');
  const cells = result.querySelectorAll('td[data-level]');
  let colors = [];

  const slots = [...root.querySelectorAll('.contrast-slot')].map((element) => {
    const slot = {
      name: element.dataset.slot,
      select: element.querySelector('select'),
      input: element.querySelector('.hex-input'),
      error: element.querySelector('.field-error'),
      swatch: element.querySelector('.swatch'),
      lastHex: null, // 最後に使えた色。「HEXで入力」に切り替えたときの入力欄の初期値にする
    };
    slot.select.addEventListener('change', () => {
      if (isHex(slot) && !slot.input.value && slot.lastHex) slot.input.value = slot.lastHex;
      clearError(slot);
      update();
    });
    // 打っている途中はエラーを出さず、正しい値になった時点で結果を出す
    slot.input.addEventListener('input', () => {
      clearError(slot);
      update();
    });
    // 入力欄から離れたとき・Enter を押したときに、受け付けた値をそろえるか、エラーを出す
    slot.input.addEventListener('blur', () => commit(slot));
    slot.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') commit(slot);
    });
    return slot;
  });

  function isHex(slot) {
    return slot.select.value === HEX_OPTION;
  }

  // 欄の今の色（"#1F3A5F" の形）。決まらなければ null
  function valueOf(slot) {
    if (!isHex(slot)) return colors[Number(slot.select.value)]?.hex ?? null;
    return parseHex(slot.input.value).hex ?? null;
  }

  function commit(slot) {
    if (!isHex(slot) || slot.input.value.trim() === '') return;
    const { hex, error } = parseHex(slot.input.value);
    if (hex) {
      slot.input.value = hex;
      clearError(slot);
    } else {
      slot.error.textContent = error;
      slot.input.setAttribute('aria-invalid', 'true');
    }
    update();
  }

  function clearError(slot) {
    slot.error.textContent = '';
    slot.input.removeAttribute('aria-invalid');
  }

  function update() {
    const values = {};
    for (const slot of slots) {
      slot.input.hidden = !isHex(slot);
      const value = valueOf(slot);
      if (value) slot.lastHex = value;
      slot.swatch.style.background = value ?? 'transparent';
      values[slot.name] = value;
    }

    // どちらかが決まらない（エラーの間を含む）ときは、前の結果を表示しない
    result.hidden = !(values.fg && values.bg);
    if (result.hidden) return;

    const ratio = hexContrast(values.fg, values.bg);
    ratioText.textContent = `コントラスト比 ${formatRatio(ratio)} : 1`;
    sample.style.color = values.fg;
    sample.style.background = values.bg;
    for (const cell of cells) {
      cell.textContent = ratio >= CRITERIA[cell.dataset.level][cell.dataset.size] ? '満たす' : '満たさない';
    }
  }

  return {
    // 色リストが変わったとき（画像を替えた・色数を変えた）に呼ぶ。
    // 色リストから選んでいる欄は初期値に戻し、「HEXで入力」で打ち込んだ値はそのまま残す
    setColors(newColors) {
      colors = newColors;
      for (const slot of slots) {
        const keepHex = isHex(slot) && slot.input.value.trim() !== '';
        const options = colors.map((color, index) => new Option(color.hex, index));
        slot.select.replaceChildren(...options, new Option('HEXで入力', HEX_OPTION));
        slot.select.value = keepHex || colors.length === 0
          ? HEX_OPTION
          : Math.min(DEFAULT_INDEX[slot.name], colors.length - 1);
        if (!keepHex) clearError(slot);
      }
      update();
    },
  };
}
