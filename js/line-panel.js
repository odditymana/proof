// 「重ねる線」の欄で、どの段を出すか。パネルの高さを減らすため、使わない段は隠す。
// 隠しても選択は残るので、選び直すと前の設定に戻る。

// settings は欄の値（FormData をそのまま object にしたもの）、hasImage は画像を読み込んだかどうか
export function visibleRows(settings, hasImage) {
  const hasRatio = settings.type !== 'none';
  const isOneSide = settings.mode === 'one';
  const hasSpiral = settings.spiral !== 'none';
  return {
    mode: hasRatio, // 比率が「なし」のときは、モードと基準の辺の段を隠す
    side: hasRatio && isOneSide,
    gridPosition: hasRatio && isOneSide, // 片側モードの線の位置
    perpendicularPosition: settings.perpendiculars === 'on' && hasImage, // 位置は画像の画素数から計算する
    spiralCorner: hasSpiral,
    spiralPosition: hasSpiral && hasImage,
  };
}
