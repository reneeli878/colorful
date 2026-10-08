'use strict';

const cupFiles = ['TR', 'W', 'P', 'PU', 'B', 'G'];

function cupImage(index) {

  return 'products/cup-' + cupFiles[index] + '.png';

}

const palette = [

  { name: '晨霜透' },

  { name: '冰川白' },

  { name: '落櫻粉' },

  { name: '暮光紫' },

  { name: '海鹽藍' },

  { name: '沁湖綠' },
  { name: '自訂色' },

];

const $ = id => document.getElementById(id);
function setMessage(id, text) { const node = $(id); if (node) node.textContent = text; }
let saveFolder = null, saving = false;

const arena = $('arena'), canvas = $('drawing'), ctx = canvas.getContext('2d');

const preview = $('preview'), output = $('output');

const W = 1024, H = 1536, limit = 40;

const customHex = { body: '#A8D5BA', lid: '#B6A0D8' };
const customArtwork = { body: null, lid: null };
let neutralImage = null;
function colorLabel(index, part) {
  return index === 6 ? '自訂色 ' + customHex[part].toUpperCase() : palette[index].name;
}
function sourceFor(index, part) {
  return index === 6 ? customArtwork[part] : cupImage(index);
}
function makeCustomArtwork(part) {
  if (!neutralImage) return;
  const result = document.createElement('canvas');
  result.width = W; result.height = H;
  const context = result.getContext('2d');
  context.drawImage(neutralImage, 0, 0, W, H);
  const pixels = context.getImageData(0, 0, W, H);
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  const maskContext = mask.getContext('2d');
  // 上色涵蓋完整內杯；塗鴉仍使用較內縮的 bodyMask。
  const colorMask = new Path2D();
  colorMask.moveTo(282, 418);
  colorMask.quadraticCurveTo(512, 439, 744, 418);
  colorMask.lineTo(665, 1308);
  colorMask.bezierCurveTo(661, 1371, 366, 1371, 360, 1308);
  colorMask.closePath();
  maskContext.fillStyle = '#fff'; maskContext.fill(colorMask);
  const maskPixels = maskContext.getImageData(0, 0, W, H).data;
  const rgb = [1,3,5].map(offset => parseInt(customHex[part].slice(offset, offset + 2),16));
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
    const offset=(y*W+x)*4;
    if (!pixels.data[offset+3]) continue;
    if (part === 'lid' ? y >= H*.264 : maskPixels[offset+3] < 128) continue;
    const luminance=(pixels.data[offset]*.2126+pixels.data[offset+1]*.7152+pixels.data[offset+2]*.0722)/255;
    if(luminance<.38) continue; // 保留深色輪廓。
    const highlight=Math.max(0, Math.min(.7, (luminance-.92)*7));
    for(let channel=0;channel<3;channel++) {
      pixels.data[offset+channel]=Math.round(rgb[channel]*luminance*(1-highlight)+255*highlight);
    }
  }
  context.putImageData(pixels,0,0);
  customArtwork[part]=result.toDataURL('image/png');
}

// 新圖片的圖層位置與分界；覆蓋先前的縮放設定。

const cupLayoutStyle = document.createElement('style');

cupLayoutStyle.textContent = `

.cup-editor {

  position: relative;

  height: 100%;

  aspect-ratio: 2 / 3;

}

#preview, #lidPreview, #drawing {

  position: absolute !important;

  inset: 0 !important;

  width: 100% !important;

  height: 100% !important;

  max-width: none !important;

  max-height: none !important;

  margin: 0 !important;

  transform: none !important;

  display: block;

}

#preview, #lidPreview { object-fit: contain; pointer-events: none; }

#preview { z-index: 0; clip-path: inset(26.4% 0 0 0) !important; }

#lidPreview { z-index: 1; clip-path: inset(0 0 73.6% 0) !important; }

#drawing { z-index: 2; touch-action: none; }

.bouncer .body-layer { clip-path: inset(26.4% 0 0 0); }

.bouncer .lid-layer { clip-path: inset(0 0 73.6% 0); }

#colors, #lidColors {

  display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px;

}

.color {

  display: flex; align-items: center; justify-content: center;

  min-height: 62px;

}

.color .color-thumb { display: block; width: 100%; }

.color .color-thumb img {

  position: static; display: block; width: 100%; height: 46px;

  object-fit: contain; margin: 0; transform: none; clip-path: none;

}

`;

document.head.append(cupLayoutStyle);

let selected = 2, selectedLid = 2, paused = false, cups = [], last = 0, ready = false;

let brushSize = 18, erasing = false, actions = [], redoActions = [], active = null;

// Inner vessel contour in the source image's coordinates. The lid and clear outer rim stay clean.

const bodyMask = new Path2D();

bodyMask.moveTo(300, 470);

bodyMask.quadraticCurveTo(510, 485, 725, 470);

bodyMask.lineTo(651, 1300);

bodyMask.quadraticCurveTo(645, 1340, 512, 1340);

bodyMask.quadraticCurveTo(379, 1340, 372, 1300);

bodyMask.closePath();

function select(i, part = 'body') {

  if (!Number.isInteger(i) || !palette[i] || !['body', 'lid'].includes(part)) throw Error('請選擇有效顏色');

  finishStroke();

  if (part === 'lid') selectedLid = i;

  else selected = i;

  preview.src = sourceFor(selected, 'body') || cupImage(1);

  $('lidPreview').src = sourceFor(selectedLid, 'lid') || cupImage(1);

  preview.style.filter = $('lidPreview').style.filter = 'none';

  preview.style.opacity = $('lidPreview').style.opacity = '1';

  imageReady();

  preview.alt = colorLabel(selected, 'body') + '杯身、' + colorLabel(selectedLid, 'lid') + '杯蓋偶數杯杯';

  $('colorName').textContent = colorLabel(selected, 'body');

  $('lidColorName').textContent = colorLabel(selectedLid, 'lid');

  document.querySelectorAll('.body-choice').forEach((button, j) => button.setAttribute('aria-pressed', j === selected));

  document.querySelectorAll('.lid-choice').forEach((button, j) => button.setAttribute('aria-pressed', j === selectedLid));

}

for (const part of ['lid', 'body']) {

  palette.forEach((color, i) => {

    const button = document.createElement('button');

    button.className = 'color ' + part + '-choice';

    button.setAttribute('aria-label', (part === 'lid' ? '杯蓋：' : '杯身：') + color.name);

    const files = ['TR', 'W', 'P', 'PU', 'B', 'G'];

const fileName = part === 'lid'

  ? files[i] + '.png'

  : 'B-' + files[i] + '.png';

button.innerHTML = '<span class="color-thumb"><img src="products/' + fileName + '" alt="" draggable="false"></span>';

    if (i === 6) {
      button.innerHTML = '<span style="font-size:12px">自訂色</span>';
      button.style.backgroundColor = customHex[part];
      const input = document.createElement('input');
      input.type = 'color'; input.value = customHex[part];
      input.id = part + 'CustomColor';
      input.setAttribute('aria-label', '自訂' + (part === 'lid' ? '杯蓋' : '杯身') + '顏色');
      input.style.cssText = 'width:44px;height:34px;border:0;padding:0;background:transparent;cursor:pointer';
      input.addEventListener('input', () => {
        finishStroke();
        customHex[part] = input.value.toUpperCase();
        makeCustomArtwork(part);
        button.style.backgroundColor = customHex[part];
        select(6, part);
      });
      const holder = document.createElement('div');
      holder.style.cssText = 'display:flex;gap:8px;align-items:center;margin:6px 0;font-size:13px';
      const label = document.createElement('label');
      label.htmlFor = input.id; label.textContent = '調整自訂' + (part === 'lid' ? '杯蓋色' : '杯身色');
      holder.append(label, input);
      const grid = $(part === 'lid' ? 'lidColors' : 'colors');
      grid.insertAdjacentElement('afterend', holder);
      button.onclick = () => { select(6, part); input.click(); };
    } else button.onclick = () => select(i, part);

    $(part === 'lid' ? 'lidColors' : 'colors').append(button);

  });

}

function updateHistory() {

  $('undo').disabled = !actions.length;

  $('redo').disabled = !redoActions.length;

  $('resetDrawing').disabled = !actions.length || actions.at(-1).kind === 'clear';

}

function widthAt(stroke, point) {

  if (stroke.erase) return stroke.size * 3;

  return stroke.size * (stroke.pen ? 0.6 + point.pressure * 0.8 : 1);

}

function paintSegment(stroke, a, b) {

  ctx.save();

  ctx.clip(bodyMask);

  ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';

  ctx.strokeStyle = ctx.fillStyle = stroke.color;

  ctx.lineCap = ctx.lineJoin = 'round';

  ctx.lineWidth = (widthAt(stroke, a) + widthAt(stroke, b)) / 2;

  if (a.x === b.x && a.y === b.y) {

    ctx.beginPath();

    ctx.arc(a.x, a.y, ctx.lineWidth / 2, 0, Math.PI * 2);

    ctx.fill();

  } else {

    ctx.beginPath();

    ctx.moveTo(a.x, a.y);

    ctx.lineTo(b.x, b.y);

    ctx.stroke();

  }

  ctx.restore();

}

function replay() {

  ctx.clearRect(0, 0, W, H);

  for (const action of actions) {

    if (action.kind === 'clear') { ctx.clearRect(0, 0, W, H); continue; }

    paintSegment(action, action.points[0], action.points[0]);

    for (let i = 1; i < action.points.length; i++) paintSegment(action, action.points[i - 1], action.points[i]);

  }

  updateHistory();

}

function pointFrom(event) {

  const rect = canvas.getBoundingClientRect();

  return {

    x: (event.clientX - rect.left) * W / rect.width,

    y: (event.clientY - rect.top) * H / rect.height,

    pressure: event.pressure > 0 ? Math.max(0, Math.min(1, event.pressure)) : 0.5,

  };

}

function finishStroke() {

  if (!active) return;

  const pointerId = active.pointerId;

  actions.push(active.stroke);

  redoActions = [];

  active = null;

  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);

  updateHistory();

  setMessage('drawingStatus', '塗鴉完成一筆；換杯色也會保留畫作。');

}

canvas.addEventListener('pointerdown', event => {

  if (!ready || active || event.button !== 0) return;

  if ($('pencilOnly').checked && event.pointerType === 'touch') return;

  const point = pointFrom(event);

  if (!ctx.isPointInPath(bodyMask, point.x, point.y)) return;

  event.preventDefault();

  const stroke = { kind: 'stroke', erase: erasing, color: $('ink').value, size: brushSize, pen: event.pointerType === 'pen', points: [point] };

  active = { pointerId: event.pointerId, stroke };

  canvas.setPointerCapture(event.pointerId);

  paintSegment(stroke, point, point);

});

canvas.addEventListener('pointermove', event => {

  if (!active || event.pointerId !== active.pointerId) return;

  event.preventDefault();

  const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];

  for (const sample of events.length ? events : [event]) {

    const point = pointFrom(sample), previous = active.stroke.points.at(-1);

    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.5) continue;

    active.stroke.points.push(point);

    paintSegment(active.stroke, previous, point);

  }

});

for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {

  canvas.addEventListener(eventName, event => { if (active?.pointerId === event.pointerId) finishStroke(); });

}

window.addEventListener('blur', finishStroke);

$('ink').addEventListener('input', () => { finishStroke(); erasing = false; $('eraser').setAttribute('aria-pressed', 'false'); });

document.querySelectorAll('[data-size]').forEach(button => button.onclick = () => {

  finishStroke();

  brushSize = Number(button.dataset.size);

  document.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', b === button));

});

$('eraser').onclick = () => { finishStroke(); erasing = !erasing; $('eraser').setAttribute('aria-pressed', erasing); };

$('pencilOnly').onchange = finishStroke;

$('undo').onclick = () => { finishStroke(); if (actions.length) redoActions.push(actions.pop()); replay(); setMessage('drawingStatus', '已復原上一個塗鴉動作。'); };

$('redo').onclick = () => { finishStroke(); if (redoActions.length) actions.push(redoActions.pop()); replay(); setMessage('drawingStatus', '已重做塗鴉動作。'); };

$('resetDrawing').onclick = () => {

  finishStroke();

  if (!actions.length || actions.at(-1).kind === 'clear') return;

  actions.push({ kind: 'clear' });

  redoActions = [];

  replay();

  setMessage('drawingStatus', '已清除塗鴉，可按「復原」找回。');

};

function update() {

  $('count').textContent = String(cups.length).padStart(2, '0');

  $('empty').hidden = cups.length > 0;

  $('pause').disabled = $('clear').disabled = !cups.length;

  output.disabled = saving || !ready || cups.length >= limit;

  $('pause').textContent = paused ? '繼續' : '暫停';

}

function drawingSnapshot() {

  const snapshot = document.createElement('canvas');

  snapshot.width = 384;

  snapshot.height = 576;

  snapshot.getContext('2d').drawImage(canvas, 0, 0, snapshot.width, snapshot.height);

  return snapshot.toDataURL('image/png');

}

function addCup(i = selected, lidIndex = selectedLid, frozenDrawing = null, frozenColors = null) {

  if (!Number.isInteger(i) || !palette[i] || !Number.isInteger(lidIndex) || !palette[lidIndex]) throw Error('請選擇有效顏色');

  if (!ready && !frozenDrawing) throw Error('杯子圖片尚未載入');

  if (cups.length >= limit) throw Error('遊樂場已滿，請清空後再加入');

  finishStroke();

  const sprite = document.createElement('div');

  sprite.className = 'bouncer';

  sprite.setAttribute('role', 'img');

  sprite.setAttribute('aria-label', (frozenColors?.lidLabel || colorLabel(lidIndex,'lid')) + '杯蓋、' + (frozenColors?.bodyLabel || colorLabel(i,'body')) + '杯身塗鴉杯杯');

  const base = document.createElement('img');

  base.src = frozenColors?.bodySource || sourceFor(i, 'body');

  base.alt = '';

  base.className = 'body-layer';

  const lid = document.createElement('img');

  lid.src = frozenColors?.lidSource || sourceFor(lidIndex, 'lid');

  lid.alt = '';

  lid.className = 'lid-layer';

  lid.style.filter = 'none';

  const drawing = document.createElement('img');

  drawing.src = frozenDrawing || drawingSnapshot();

  drawing.alt = '';

  sprite.append(base, lid, drawing);

  arena.append(sprite);

  const w = Math.min(92, arena.clientWidth, arena.clientHeight * 2 / 3), h = w * 1.5;

  sprite.style.width = w + 'px';

  sprite.style.height = h + 'px';

  const angle = Math.random() * Math.PI * 2, speed = 70 + Math.random() * 45;

  const cup = { sprite, w, h, x: Math.random() * Math.max(0, arena.clientWidth - w), y: Math.random() * Math.max(0, arena.clientHeight - h), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };

  cups.push(cup);

render(cup);

update(); // 加入杯子後立即更新數量
  return { bodyColor: palette[i].name, lidColor: palette[lidIndex].name, count: cups.length };



}

function render(cup) { cup.sprite.style.transform = `translate3d(${cup.x}px,${cup.y}px,0)`; }

function step(cup, dt, width, height) {

  const maxX = Math.max(0, width - cup.w), maxY = Math.max(0, height - cup.h);

  cup.x += cup.vx * dt;

  cup.y += cup.vy * dt;

  if (cup.x < 0) { cup.x = -cup.x; cup.vx = Math.abs(cup.vx); }

  else if (cup.x > maxX) { cup.x = 2 * maxX - cup.x; cup.vx = -Math.abs(cup.vx); }

  if (cup.y < 0) { cup.y = -cup.y; cup.vy = Math.abs(cup.vy); }

  else if (cup.y > maxY) { cup.y = 2 * maxY - cup.y; cup.vy = -Math.abs(cup.vy); }

  cup.x = Math.max(0, Math.min(maxX, cup.x));

  cup.y = Math.max(0, Math.min(maxY, cup.y));

}

function frame(time) {

  const dt = last ? Math.min((time - last) / 1000, 0.035) : 0;

  last = time;

  if (!paused && !document.hidden) {

    cups.forEach(cup => { step(cup, dt, arena.clientWidth, arena.clientHeight); render(cup); });

  }

  requestAnimationFrame(frame);

}

requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) finishStroke(); });

new ResizeObserver(() => cups.forEach(cup => {

  cup.x = Math.max(0, Math.min(arena.clientWidth - cup.w, cup.x));

  cup.y = Math.max(0, Math.min(arena.clientHeight - cup.h, cup.y));

  render(cup);

})).observe(arena);

// 統計以這個瀏覽器為單位保存，不受清空遊樂場影響。
const statsKey = 'osucup-color-history-v1';
let colorRecords = [];
let statisticsWarning = '';
try {
  const stored = JSON.parse(localStorage.getItem(statsKey) || '[]');
  if (!Array.isArray(stored) || stored.some(record => !record ||
      !Number.isInteger(record.body) || !palette[record.body] ||
      !Number.isInteger(record.lid) || !palette[record.lid] ||
      typeof record.time !== 'string' || typeof record.filename !== 'string')) {
    throw Error('紀錄格式不正確');
  }
  colorRecords = stored;
} catch (error) {
  statisticsWarning = '無法讀取既有配色紀錄：' + error.message;
  // 不覆蓋無法讀取的舊資料，仍允許下載本次頁面的紀錄。
}

function recordColors(body, lid, filename, storageMode, colors = {}) {
  colorRecords.push({ time: new Date().toISOString(), body, lid, filename, storageMode, bodyHex: colors.bodyHex || null, lidHex: colors.lidHex || null });
  if (!statisticsWarning) {
    try { localStorage.setItem(statsKey, JSON.stringify(colorRecords)); }
    catch (error) { statisticsWarning = '配色紀錄無法保存到瀏覽器：' + error.message; }
  }
  if (statisticsWarning) {
    window.alert(statisticsWarning + '。請在關閉或重新整理前，按「下載配色統計」保存本次紀錄。');
  }
}

function colorStatistics() {
  const lids = Array(7).fill(0), bodies = Array(7).fill(0);
  const pairs = Array.from({ length: 7 }, () => Array(7).fill(0));
  for (const record of colorRecords) {
    lids[record.lid]++;
    bodies[record.body]++;
    pairs[record.lid][record.body]++;
  }
  return { lids, bodies, pairs };
}

function statisticsCSV() {
  const { lids, bodies, pairs } = colorStatistics();
  const rows = [['偶數杯杯配色統計'], ['輸出總次數', colorRecords.length],
    ['匯出時間（台灣）', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })],
    [], ['杯蓋顏色', '使用次數']];
  palette.forEach((color, i) => rows.push([color.name, lids[i]]));
  rows.push([], ['杯身顏色', '使用次數']);
  palette.forEach((color, i) => rows.push([color.name, bodies[i]]));
  rows.push([], ['杯蓋顏色', '杯身顏色', '搭配次數']);
  palette.forEach((lid, l) => palette.forEach((body, b) => rows.push([lid.name, body.name, pairs[l][b]])));
  rows.push([], ['自訂色部位', '色碼', '使用次數']);
  const customCounts = new Map(), exactPairs = new Map();
  const recordLabel = (record, part) => record[part] === 6 ? '自訂色 ' + (record[part + 'Hex'] || '未記錄') : palette[record[part]].name;
  colorRecords.forEach(record => {
    for (const part of ['lid','body']) if(record[part] === 6) {
      const key = (part === 'lid' ? '杯蓋' : '杯身') + '|' + (record[part+'Hex'] || '未記錄');
      customCounts.set(key,(customCounts.get(key)||0)+1);
    }
    if(record.lid === 6 || record.body === 6) {
      const key = JSON.stringify([recordLabel(record,'lid'),recordLabel(record,'body')]);
      exactPairs.set(key,(exactPairs.get(key)||0)+1);
    }
  });
  customCounts.forEach((count,key) => rows.push([...key.split('|'),count]));
  rows.push([], ['含自訂色的杯蓋', '杯身', '搭配次數（依色碼）']);
  exactPairs.forEach((count,key) => rows.push([...JSON.parse(key),count]));
  rows.push([], ['每次輸出時間（台灣）', '杯蓋顏色', '杯身顏色', '圖片檔名', '圖片儲存方式']);
  colorRecords.forEach(record => rows.push([
    new Date(record.time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }),
    recordLabel(record,'lid'), recordLabel(record,'body'), record.filename,
    record.storageMode === 'folder' ? '已寫入資料夾' : '已送出瀏覽器下載'
  ]));
  const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
  return '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n');
}

const statisticsButton = document.createElement('button');
statisticsButton.id = 'downloadStatistics';
statisticsButton.className = 'tool';
statisticsButton.type = 'button';
statisticsButton.textContent = '下載配色統計';
statisticsButton.onclick = () => {
  const blob = new Blob([statisticsCSV()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '杯杯配色統計-' + new Date().toISOString().replace(/[:.]/g, '-') + '.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
// 跟現有輸出按鈕放在同一排；空間不足才換行。
output.parentElement.append(statisticsButton);
const statisticsStyle = document.createElement('style');
statisticsStyle.textContent = 'footer > div { flex-wrap: wrap; flex-shrink: 1; } #downloadStatistics { white-space: nowrap; }';
document.head.append(statisticsStyle);

// 儲存完整杯杯：分界與畫面上的兩個圖層一致，保留透明背景。
function artworkSnapshot() {
  const result = document.createElement('canvas');
  result.width = W;
  result.height = H;
  const context = result.getContext('2d');
  const split = H * 0.264;
  context.save();
  context.beginPath();
  context.rect(0, split, W, H - split);
  context.clip();
  context.drawImage(preview, 0, 0, W, H);
  context.restore();
  context.save();
  context.beginPath();
  context.rect(0, 0, W, split);
  context.clip();
  context.drawImage($('lidPreview'), 0, 0, W, H);
  context.restore();
  context.drawImage(canvas, 0, 0, W, H);
  return result.toDataURL('image/png');
}

function artworkFilename(body, lid) {
  const date = new Date();
  const pad = (value, digits = 2) => String(value).padStart(digits, '0');
  const stamp = date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) + '-' +
    pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds()) + '-' + pad(date.getMilliseconds(), 3);
  const unique = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return '杯杯-' + stamp + '-杯蓋' + (lid === 6 ? customHex.lid.slice(1) : cupFiles[lid]) + '-杯身' + (body === 6 ? customHex.body.slice(1) : cupFiles[body]) + '-' + unique + '.png';
}

function pngBlob(dataURL) {
  const binary = atob(dataURL.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

output.onclick = async () => {
  if (saving) return;
  let folderMode = false;
  try {
    if (!ready) throw Error('杯子圖片尚未載入');
    if (cups.length >= limit) throw Error('遊樂場已滿，請清空後再加入');
    finishStroke();
    // 在等待資料夾選擇前凍結作品，配色或塗鴉後續變更不影響此次輸出。
    const body = selected, lid = selectedLid;
    const colors = { bodySource: preview.src, lidSource: $('lidPreview').src,
      bodyLabel: colorLabel(body,'body'), lidLabel: colorLabel(lid,'lid'),
      bodyHex: body === 6 ? customHex.body : null, lidHex: lid === 6 ? customHex.lid : null };
    const drawing = drawingSnapshot();
    const artwork = artworkSnapshot();
    const filename = artworkFilename(body, lid);
    saving = true;
    update();
    folderMode = window.isSecureContext && typeof window.showDirectoryPicker === 'function';
    if (folderMode) {
      // 第一次直接在按鈕點擊事件中開啟選擇器，保留使用者操作權限。
      if (!saveFolder) saveFolder = await window.showDirectoryPicker({ mode: 'readwrite', id: 'osucup-artworks' });
      const file = await saveFolder.getFileHandle(filename, { create: true });
      const writer = await file.createWritable();
      try {
        await writer.write(pngBlob(artwork));
        await writer.close();
      } catch (error) {
        try { await writer.abort(); } catch {}
        throw error;
      }
    } else {
      // iPad 等不支援資料夾選擇的瀏覽器，直接交給下載功能。
      const link = document.createElement('a');
      link.href = artwork;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
    }
    recordColors(body, lid, filename, folderMode ? 'folder' : 'download', colors);
    addCup(body, lid, drawing, colors);
    setMessage('status', folderMode ? '杯杯作品已儲存到選定資料夾。' : '杯杯作品已送出下載，請查看瀏覽器下載項目。');
  } catch (error) {
    if (error.name === 'AbortError') {
      setMessage('status', '已取消儲存，本次未加入杯杯。');
    } else {
      if (folderMode) saveFolder = null;
      const message = '杯杯未輸出：' + error.message + '。請再按一次輸出重試。';
      setMessage('status', message);
      setMessage('drawingStatus', message);
      window.alert(message);
    }
  } finally {
    saving = false;
    update();
  }
};

$('pause').onclick = () => { paused = !paused; last = 0; update(); setMessage('status', paused ? '杯杯休息一下' : '杯杯繼續彈跳'); };

$('clear').onclick = () => { cups.forEach(cup => cup.sprite.remove()); cups = []; paused = false; update(); setMessage('status', '遊樂場已清空，左側的塗鴉仍然保留。'); };

function imageReady() {

  const lidPreview = $('lidPreview');

  ready = preview.complete && preview.naturalWidth > 0 &&

    lidPreview.complete && lidPreview.naturalWidth > 0 &&

    (selected === 6 ? !!customArtwork.body && preview.src === customArtwork.body : preview.src.endsWith(cupImage(selected))) &&

    (selectedLid === 6 ? !!customArtwork.lid && lidPreview.src === customArtwork.lid : lidPreview.src.endsWith(cupImage(selectedLid)));

  update();

}

for (const image of [preview, $('lidPreview')]) {

  image.addEventListener('load', imageReady);

  image.addEventListener('error', () => {

    ready = false;

    update();

    setMessage('drawingStatus', '杯子圖片載入失敗，請確認 public/products 裡有六張 cup-*.png。');

  });

}

const customBase = new Image();
customBase.onload = () => {
  neutralImage = customBase;
  makeCustomArtwork('body'); makeCustomArtwork('lid');
  if (selected === 6 || selectedLid === 6) select(selected, 'body');
};
customBase.onerror = () => setMessage('status', '自訂色圖片載入失敗，請確認 products/cup-W.png 存在。');
customBase.src = cupImage(1);

select(2);

update();

if (document.modelContext?.registerTool) {

  try {

    Promise.resolve(document.modelContext.registerTool({

      name: 'add_bouncing_cup',

      description: '將指定杯身與杯蓋配色連同目前塗鴉加入彈跳遊樂場；未指定杯蓋則使用目前杯蓋配色',

      inputSchema: { type: 'object', properties: { colorIndex: { type: 'integer', minimum: 0, maximum: 5 }, lidColorIndex: { type: 'integer', minimum: 0, maximum: 5 } }, required: ['colorIndex'], additionalProperties: false },

      annotations: { readOnlyHint: false },

      execute(input) {

        if (!input || !Number.isInteger(input.colorIndex) || Object.keys(input).some(key => !['colorIndex', 'lidColorIndex'].includes(key)) || (input.lidColorIndex !== undefined && (!Number.isInteger(input.lidColorIndex) || !palette[input.lidColorIndex]))) throw Error('無效輸入');

        return addCup(input.colorIndex, input.lidColorIndex ?? selectedLid);

      },

    })).catch(() => {});

  } catch {}

}
