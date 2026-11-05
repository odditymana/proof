// 文字と背景のコントラスト比（WCAG）の計算。
// 基準を満たすかどうかを事実として返すだけで、良し悪しの判定はしない。

// WCAG の基準の値（大きな文字：18pt以上、または太字で14pt以上）
export const CRITERIA = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
};

// WCAG の相対輝度
export function luminance(r, g, b) {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// 2つの相対輝度のコントラスト比（1〜21）
export function contrastRatio(a, b) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// "#1F3A5F" の形の2色のコントラスト比
export function hexContrast(hexA, hexB) {
  return contrastRatio(luminance(...toRgb(hexA)), luminance(...toRgb(hexB)));
}

// 表示用：判定は丸める前の値で行い、表示は小数2桁で切り捨てる（4.496 を「4.50」と見せないため）
export function formatRatio(ratio) {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

// HEX の入力を読み取る。「#」あり・なし、3桁・6桁、大文字・小文字、前後の空白を受け付け、
// 「#」＋大文字6桁にそろえて返す。読み取れなければ error を返す
export function parseHex(text) {
  const digits = text.trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(digits)) return { hex: `#${digits.toUpperCase()}` };
  if (/^[0-9a-f]{3}$/i.test(digits)) {
    return { hex: `#${[...digits].map((c) => c + c).join('').toUpperCase()}` };
  }
  if (/^([0-9a-f]{4}|[0-9a-f]{8})$/i.test(digits)) return { error: '透明度つきの色は使えません。' };
  return { error: '3桁か6桁のHEXで入力してください（例：#1F3A5F）。' };
}

function toRgb(hex) {
  return hex.slice(1).match(/../g).map((pair) => parseInt(pair, 16));
}
