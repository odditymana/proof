// 画像の読み込み：ドラッグ＆ドロップと「ファイルを選ぶ」ボタン。
// 画像は URL.createObjectURL でブラウザ内だけで扱い、外部には送信しない。

let currentUrl = null;

export function initImageLoader({ dropZone, input, buttons, onLoad, onError }) {
  for (const button of buttons) {
    button.addEventListener('click', () => input.click());
  }

  input.addEventListener('change', () => {
    const file = input.files[0];
    // 同じファイルを選び直しても change が起きるように空にしておく
    input.value = '';
    if (file) load(file);
  });

  // ドロップ先から外れて落としたとき、ブラウザが画像を開いてページを離れないようにする
  window.addEventListener('dragover', (event) => event.preventDefault());
  window.addEventListener('drop', (event) => event.preventDefault());

  dropZone.addEventListener('dragenter', () => dropZone.classList.add('is-dragover'));
  dropZone.addEventListener('dragleave', (event) => {
    if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('is-dragover');
  });
  dropZone.addEventListener('drop', (event) => {
    dropZone.classList.remove('is-dragover');
    const file = event.dataTransfer.files[0];
    if (file) load(file);
  });

  async function load(file) {
    if (!file.type.startsWith('image/')) {
      onError('画像ファイルを選んでください。');
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;

    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(url);
      onError('この画像は読み込めませんでした。');
      return;
    }

    // 前の画像のURLを解放する
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = url;

    onLoad({
      image,
      name: file.name,
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  }
}
