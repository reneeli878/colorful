六色圖片替換說明

1. 將六張 cup-*.png 放進 public/products，替換之前同名圖片。
2. app.js 的 select 函式內，圖片設定使用以下程式（若已相同則不用重改）：

const files = ['TR', 'W', 'P', 'PU', 'B', 'G'];
preview.src = 'products/cup-' + files[selected] + '.png';
$('lidPreview').src = 'products/cup-' + files[selectedLid] + '.png';
preview.style.filter = 'none';
$('lidPreview').style.filter = 'none';
preview.style.opacity = '1';
$('lidPreview').style.opacity = '1';

3. 新圖已縮短杯身。刪除先前加入的 scaleY(0.9) 段落，在 style.css 最下面加上以下規則。
   同時更新杯蓋分界，讓杯蓋與杯身可分開選色：

.cup-editor #preview,
.cup-editor #lidPreview,
.cup-editor #drawing {
  inset: 0;
  width: 100%;
  height: 100%;
  transform: none;
}
.cup-editor #preview {
  clip-path: inset(26.4% 0 0 0);
}
.cup-editor #lidPreview {
  clip-path: inset(0 0 73.6% 0);
}

4. 新杯身位置變了。app.js 中 const bodyMask = new Path2D(); 到 bodyMask.closePath(); 改成：

const bodyMask = new Path2D();
bodyMask.moveTo(300, 470);
bodyMask.quadraticCurveTo(510, 485, 725, 470);
bodyMask.lineTo(651, 1300);
bodyMask.quadraticCurveTo(645, 1340, 512, 1340);
bodyMask.quadraticCurveTo(379, 1340, 372, 1300);
bodyMask.closePath();

5. 存檔後按 Ctrl + F5。

這份說明調整左側大預覽與塗鴉範圍；右側彈跳杯若仍採用原本 cup.png 加濾鏡，需另改輸出圖層。
PNG 已檢查為 1024×1536，具透明背景。尚未在你的 Windows 或 iPad 實機驗證。
