// パネルの欄の折りたたみ。見出しの中のボタン（aria-expanded）で、欄の中身を hidden で開閉する。
// 閉じても中身の要素は残るので、設定（線の種類・色の選択・HEX の入力など）はそのまま保たれる。
// 開閉の状態は、ブラウザの中（localStorage）だけに覚える。保存するのは閉じた欄の名前だけで、外部には送信しない。

const STORAGE_KEY = 'proof:closed-sections';

// 保存した文字から、閉じた欄の名前を取り出す。壊れた値や知らない欄の名前は無視する（並びは names の順）
export function parseClosedSections(text, names) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return names.filter((name) => value.includes(name));
}

// 閉じた欄の名前を、保存する文字にする（並びは names の順）
export function serializeClosedSections(closed, names) {
  return JSON.stringify(names.filter((name) => closed.includes(name)));
}

// 保存できない環境（プライベートブラウズなど）では、覚えずにすべて開いた状態で動く
function load() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function save(text) {
  try {
    localStorage.setItem(STORAGE_KEY, text);
  } catch {
    // 覚えられなくても、開閉はそのまま使える
  }
}

export function initSections(root) {
  const sections = [...root.querySelectorAll('[data-section]')].map((element) => {
    const button = element.querySelector('.section-toggle');
    return {
      name: element.dataset.section,
      button,
      body: element.querySelector(`#${button.getAttribute('aria-controls')}`),
    };
  });
  const names = sections.map((section) => section.name);

  const setOpen = (section, open) => {
    section.button.setAttribute('aria-expanded', String(open));
    section.body.hidden = !open;
  };

  const closed = parseClosedSections(load(), names);
  for (const section of sections) {
    setOpen(section, !closed.includes(section.name));
    section.button.addEventListener('click', () => {
      setOpen(section, section.body.hidden);
      const now = sections.filter((s) => s.body.hidden).map((s) => s.name);
      save(serializeClosedSections(now, names));
    });
  }
}
