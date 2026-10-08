# 偶數杯杯 — VS Code 開發環境

用電腦上的 VS Code 編輯，讓客人在 iPad Safari 操作。

## 1. 安裝開發工具

- VS Code：https://code.visualstudio.com/download
- Node.js：到 https://nodejs.org/en/download 選擇 LTS 安裝版，建議 22 以上。
- 若要使用 F5 自動預覽，電腦需要安裝 Google Chrome。

安裝 Node.js 後，關閉再重新開啟 VS Code。

## 2. 開啟專案

1. 解壓縮 `osucup-vscode.zip`。
2. 在 VS Code 選「檔案 → 開啟資料夾」。
3. 選擇解壓縮後的 `osucup-vscode` 資料夾；這層包含 `package.json`。
4. 若出現信任此專案的提示，確認是你下載的這份專案後，選擇信任。

## 3. 開始預覽

### 簡單方式：終端機

在 VS Code 選「終端機 → 新增終端機」，輸入：

```sh
node --version
npm --version
npm run dev
```

這份專案沒有額外套件，不需要先執行 `npm install`。

瀏覽器開啟 http://localhost:5173/ 。
修改 `public` 內的檔案、儲存後，重新整理瀏覽器即可看到變更。
保留終端機運作；要停止時按 Ctrl+C。

若 Windows PowerShell 顯示 `npm.ps1` 無法執行，可將終端機切换為 Command Prompt，或直接輸入：

```sh
node scripts/dev-server.mjs
```

### VS Code 按 F5

按 F5，選「偶數杯杯：啟動 Chrome 預覽」。
VS Code 會啟動本機伺服器並開啟 Chrome。
若已手動執行 `npm run dev`，先按 Ctrl+C 停止，再使用 F5，避免重複啟動。
停止瀏覽器偵錯後，可在伺服器終端機按 Ctrl+C 停止伺服器。

## 4. 用 iPad 測試

1. 電腦和 iPad 連到同一個 Wi-Fi。
2. 保持電腦上的 `npm run dev` 運作。
3. 在終端機找 `iPad / Network:` 後面的網址，例如 `http://192.168.1.20:5173/`。
4. 在 iPad Safari 輸入該網址，橫放 iPad 開始測試。

iPad 需要使用電腦的 Network 網址，不是 `localhost`。
若有多個 Network 網址，選與 Wi-Fi 對應的位址。
若無法連線，確認 Windows 防火牆允許 Node.js 在私人網路存取，以及 Wi-Fi 沒有隔離裝置；某些公司或訪客網路會阻擋裝置互連。

## 5. 檔案用途

| 檔案 | 用途 |
| --- | --- |
| `public/index.html` | 左側選色、右側遊樂場的畫面結構 |
| `public/style.css` | 配色、排版、iPad 和手機尺寸 |
| `public/app.js` | 顏色選擇、加入杯子、反彈、暫停及清空 |
| `public/cup.png` | 杯子插畫示意圖 |
| `scripts/dev-server.mjs` | 本機及同一個 Wi-Fi 下的預覽服務 |
| `.vscode/` | VS Code 的啟動和偵錯設定 |

## 6. 目前功能及下一步

目前包含六色選擇、杯身塗鴉、杯蓋與杯身獨立配色、輸出杯子、邊界反彈、暫停及清空。

### 塗鴉操作

1. 分別點選杯蓋及杯身顏色，六色可自由搭配，共 36 種組合。
2. 選擇筆色及細／中／粗筆刷，直接在左側杯身畫畫。電腦可用滑鼠。
3. 點「橡皮擦」切換擦除模式，再點一次回到畫筆；選新筆色也會回到畫筆。
4. 「復原／重做」支援筆跡、擦除及清除塗鴉。
5. 按「輸出杯杯」，右側杯子保留當下的杯色及塗鴉。
6. 左側之後再修改，不會改掉右側已輸出的杯子。輸出後左側畫作仍保留，可繼續修改再輸出。
7. 「清空杯杯」只清空遊樂場；「清除塗鴉」清除左側畫作，可用「復原」找回。

預設勾選「只用 Apple Pencil」：接收手寫筆及電腦滑鼠，忽略手指繪圖。取消勾選可用手指畫。
筆跡限制在杯身內，杯蓋及透明外圈不會被塗到。
手寫筆壓力會影響筆粗；實際效果取決於裝置提供的壓力資訊。
旋轉 iPad 或調整視窗後，塗鴉仍保留。

### 更新已開啟的舊專案

1. VS Code 終端機按 Ctrl+C 停止預覽。
2. 解壓縮新版專案。
3. 將新版 `public/index.html`、`public/style.css`、`public/app.js` 覆蓋到原專案相同位置。杯子圖 `cup.png` 沒有變動。
4. 回到原專案，執行 `npm run dev`，重新整理瀏覽器（Windows 可按 Ctrl+F5）。

### 驗證範圍

已檢查 JavaScript 語法、繪圖及擦除、杯身裁切、復原／重做、塗鴉輸出快照、換色保留畫作、手指輸入篩選、座標縮放與反彈邏輯。
此環境未完成真實瀏覽器介面驗證，Apple Pencil、手掌誤觸與畫面操作需在電腦瀏覽器及實體 iPad Safari 一起測試。
塗鴉及杯子暫存在當前頁面，重新整理後會清空。

## 7. 基本檢查

```sh
npm run check
```

檢查 JavaScript 語法。這是本機開發專案；此處編輯不會自動修改線上版本。
