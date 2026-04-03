// Generates Play Store screenshots using real app layout
// Run: node gen.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── colours ──────────────────────────────────────────────────────────────────
const C = {
  bg:       [15,  26,  42],   // #0f172a
  card:     [30,  41,  59],   // #1e293b
  border:   [51,  65,  85],   // #334155
  text:     [241,245,249],    // #f1f5f9
  muted:    [148,163,184],    // #94a3b8
  violet:   [139, 92,246],    // #8b5cf6
  violetD:  [109, 40,217],    // #6d28d9
  green:    [ 16,185,129],    // #10b981
  red:      [239, 68, 68],    // #ef4444
  amber:    [245,158, 11],    // #f59e0b
  blue:     [ 59,130,246],    // #3b82f6
  cyan:     [ 34,211,238],    // #22d3ee
  overlay:  [17,  24, 39],    // #111827
};

// ── minimal 4×7 pixel font (ASCII 32–127) ─────────────────────────────────
// Each char: 4 cols × 7 rows, packed as 7 nibbles (4 bits each)
const FONT = (() => {
  // Maps char code → 4×7 bitmap (array of 7 bytes, each byte = 4-bit row)
  const glyphs = {};

  function g(ch, rows) { glyphs[ch.charCodeAt(0)] = rows; }

  // space
  g(' ', [0,0,0,0,0,0,0]);
  // digits
  g('0', [0b0110,0b1001,0b1001,0b1001,0b1001,0b1001,0b0110]);
  g('1', [0b0010,0b0110,0b0010,0b0010,0b0010,0b0010,0b0111]);
  g('2', [0b0110,0b1001,0b0001,0b0010,0b0100,0b1000,0b1111]);
  g('3', [0b0110,0b1001,0b0001,0b0110,0b0001,0b1001,0b0110]);
  g('4', [0b0001,0b0011,0b0101,0b1001,0b1111,0b0001,0b0001]);
  g('5', [0b1111,0b1000,0b1110,0b0001,0b0001,0b1001,0b0110]);
  g('6', [0b0110,0b1001,0b1000,0b1110,0b1001,0b1001,0b0110]);
  g('7', [0b1111,0b0001,0b0010,0b0100,0b0100,0b0100,0b0100]);
  g('8', [0b0110,0b1001,0b1001,0b0110,0b1001,0b1001,0b0110]);
  g('9', [0b0110,0b1001,0b1001,0b0111,0b0001,0b1001,0b0110]);
  // uppercase
  g('A', [0b0110,0b1001,0b1001,0b1111,0b1001,0b1001,0b1001]);
  g('B', [0b1110,0b1001,0b1001,0b1110,0b1001,0b1001,0b1110]);
  g('C', [0b0110,0b1001,0b1000,0b1000,0b1000,0b1001,0b0110]);
  g('D', [0b1110,0b1001,0b1001,0b1001,0b1001,0b1001,0b1110]);
  g('E', [0b1111,0b1000,0b1000,0b1110,0b1000,0b1000,0b1111]);
  g('F', [0b1111,0b1000,0b1000,0b1110,0b1000,0b1000,0b1000]);
  g('G', [0b0110,0b1001,0b1000,0b1011,0b1001,0b1001,0b0110]);
  g('H', [0b1001,0b1001,0b1001,0b1111,0b1001,0b1001,0b1001]);
  g('I', [0b1110,0b0100,0b0100,0b0100,0b0100,0b0100,0b1110]);
  g('J', [0b0111,0b0001,0b0001,0b0001,0b0001,0b1001,0b0110]);
  g('K', [0b1001,0b1010,0b1100,0b1000,0b1100,0b1010,0b1001]);
  g('L', [0b1000,0b1000,0b1000,0b1000,0b1000,0b1000,0b1111]);
  g('M', [0b1001,0b1111,0b1111,0b1001,0b1001,0b1001,0b1001]);
  g('N', [0b1001,0b1101,0b1101,0b1011,0b1011,0b1001,0b1001]);
  g('O', [0b0110,0b1001,0b1001,0b1001,0b1001,0b1001,0b0110]);
  g('P', [0b1110,0b1001,0b1001,0b1110,0b1000,0b1000,0b1000]);
  g('Q', [0b0110,0b1001,0b1001,0b1001,0b1011,0b1001,0b0111]);
  g('R', [0b1110,0b1001,0b1001,0b1110,0b1010,0b1001,0b1001]);
  g('S', [0b0110,0b1001,0b1000,0b0110,0b0001,0b1001,0b0110]);
  g('T', [0b1111,0b0100,0b0100,0b0100,0b0100,0b0100,0b0100]);
  g('U', [0b1001,0b1001,0b1001,0b1001,0b1001,0b1001,0b0110]);
  g('V', [0b1001,0b1001,0b1001,0b1001,0b1001,0b0110,0b0110]);
  g('W', [0b1001,0b1001,0b1001,0b1001,0b1111,0b1111,0b1001]);
  g('X', [0b1001,0b1001,0b0110,0b0110,0b0110,0b1001,0b1001]);
  g('Y', [0b1001,0b1001,0b0110,0b0100,0b0100,0b0100,0b0100]);
  g('Z', [0b1111,0b0001,0b0010,0b0110,0b1000,0b1000,0b1111]);
  // lowercase
  g('a', [0,0,0b0110,0b0001,0b0111,0b1001,0b0111]);
  g('b', [0b1000,0b1000,0b1110,0b1001,0b1001,0b1001,0b1110]);
  g('c', [0,0,0b0110,0b1001,0b1000,0b1001,0b0110]);
  g('d', [0b0001,0b0001,0b0111,0b1001,0b1001,0b1001,0b0111]);
  g('e', [0,0,0b0110,0b1001,0b1111,0b1000,0b0110]);
  g('f', [0b0011,0b0100,0b1110,0b0100,0b0100,0b0100,0b0100]);
  g('g', [0,0,0b0111,0b1001,0b0111,0b0001,0b0110]);
  g('h', [0b1000,0b1000,0b1110,0b1001,0b1001,0b1001,0b1001]);
  g('i', [0b0100,0,0b0100,0b0100,0b0100,0b0100,0b0100]);
  g('j', [0b0010,0,0b0010,0b0010,0b0010,0b1010,0b0100]);
  g('k', [0b1000,0b1000,0b1010,0b1100,0b1100,0b1010,0b1001]);
  g('l', [0b0100,0b0100,0b0100,0b0100,0b0100,0b0100,0b0010]);
  g('m', [0,0,0b1110,0b1111,0b1001,0b1001,0b1001]);
  g('n', [0,0,0b1110,0b1001,0b1001,0b1001,0b1001]);
  g('o', [0,0,0b0110,0b1001,0b1001,0b1001,0b0110]);
  g('p', [0,0,0b1110,0b1001,0b1110,0b1000,0b1000]);
  g('q', [0,0,0b0111,0b1001,0b0111,0b0001,0b0001]);
  g('r', [0,0,0b0110,0b1000,0b1000,0b1000,0b1000]);
  g('s', [0,0,0b0110,0b1000,0b0110,0b0001,0b1110]);
  g('t', [0b0100,0b0100,0b1110,0b0100,0b0100,0b0100,0b0011]);
  g('u', [0,0,0b1001,0b1001,0b1001,0b1001,0b0111]);
  g('v', [0,0,0b1001,0b1001,0b1001,0b0110,0b0110]);
  g('w', [0,0,0b1001,0b1001,0b1001,0b1111,0b1001]);
  g('x', [0,0,0b1001,0b0110,0b0110,0b0110,0b1001]);
  g('y', [0,0,0b1001,0b1001,0b0111,0b0001,0b0110]);
  g('z', [0,0,0b1111,0b0010,0b0110,0b1000,0b1111]);
  // punct
  g('.', [0,0,0,0,0,0b0110,0b0110]);
  g(',', [0,0,0,0,0,0b0100,0b1000]);
  g(':', [0,0,0b0110,0b0110,0,0b0110,0b0110]);
  g('/', [0b0001,0b0001,0b0010,0b0100,0b1000,0b1000,0]);
  g('-', [0,0,0,0b1111,0,0,0]);
  g('+', [0,0b0100,0b0100,0b1110,0b0100,0b0100,0]);
  g('%', [0b1001,0b0001,0b0010,0b0100,0b1000,0b1001,0b0001]); // approx
  g('(', [0b0010,0b0100,0b1000,0b1000,0b1000,0b0100,0b0010]);
  g(')', [0b1000,0b0100,0b0010,0b0010,0b0010,0b0100,0b1000]);
  g('₹', [0b1111,0b1001,0b1001,0b1110,0b1001,0b1001,0b0001]); // approx ₹ as R
  g('$', [0b0100,0b0111,0b1100,0b0110,0b0011,0b1110,0b0100]);
  g('&', [0b0100,0b1010,0b0100,0b1010,0b1001,0b1010,0b0101]);
  g('_', [0,0,0,0,0,0,0b1111]);
  g("'", [0b0100,0b0100,0,0,0,0,0]);
  g('"', [0b1010,0b1010,0,0,0,0,0]);
  g('?', [0b0110,0b1001,0b0001,0b0010,0b0100,0,0b0100]);
  g('!', [0b0100,0b0100,0b0100,0b0100,0b0100,0,0b0100]);
  g('#', [0b1010,0b1111,0b1010,0b1010,0b1111,0b1010,0]);
  g('@', [0b0110,0b1001,0b1011,0b1011,0b1010,0b1000,0b0111]);
  g('*', [0b0100,0b1110,0b0100,0b1010,0,0,0]);
  g('>', [0b1000,0b0100,0b0010,0b0001,0b0010,0b0100,0b1000]);
  g('<', [0b0001,0b0010,0b0100,0b1000,0b0100,0b0010,0b0001]);

  return glyphs;
})();

// ── PNG builder ──────────────────────────────────────────────────────────────
function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function buildPNG(pixels, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      raw[pos++] = pixels[i];
      raw[pos++] = pixels[i+1];
      raw[pos++] = pixels[i+2];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 3 });

  function chunk(type, data) {
    const buf = Buffer.alloc(12 + data.length);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4, 'ascii');
    data.copy(buf, 8);
    const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    buf.writeUInt32BE(crc32(crcData), 8 + data.length);
    return buf;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Canvas ───────────────────────────────────────────────────────────────────
function makeCanvas(w, h, fill = C.bg) {
  const pixels = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    pixels[i*3]   = fill[0];
    pixels[i*3+1] = fill[1];
    pixels[i*3+2] = fill[2];
  }

  function setPixel(x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 3;
    pixels[i]   = col[0];
    pixels[i+1] = col[1];
    pixels[i+2] = col[2];
  }

  function fillRect(x, y, rw, rh, col) {
    for (let dy = 0; dy < rh; dy++)
      for (let dx = 0; dx < rw; dx++)
        setPixel(x+dx, y+dy, col);
  }

  function strokeRect(x, y, rw, rh, col, thick = 1) {
    for (let t = 0; t < thick; t++) {
      for (let dx = 0; dx < rw; dx++) { setPixel(x+dx, y+t, col); setPixel(x+dx, y+rh-1-t, col); }
      for (let dy = 0; dy < rh; dy++) { setPixel(x+t, y+dy, col); setPixel(x+rw-1-t, y+dy, col); }
    }
  }

  // Draw glyph at scale s (pixel size multiplier)
  function drawGlyph(cx, cy, code, col, s = 2) {
    const rows = FONT[code] || FONT[' '.charCodeAt(0)];
    for (let row = 0; row < 7; row++) {
      const bits = rows[row];
      for (let col2 = 0; col2 < 4; col2++) {
        if (bits & (1 << (3 - col2))) {
          for (let sy = 0; sy < s; sy++)
            for (let sx = 0; sx < s; sx++)
              setPixel(cx + col2*s + sx, cy + row*s + sy, col);
        }
      }
    }
  }

  // Draw text string; returns width used
  function drawText(x, y, text, col, s = 2) {
    let cx = x;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      drawGlyph(cx, y, code, col, s);
      cx += (s * 4) + s; // char width + spacing
    }
    return cx - x;
  }

  // Measure text width
  function textWidth(text, s = 2) {
    return text.length * (s * 4 + s);
  }

  // Draw text centred in a rect
  function drawTextCentered(x, y, bw, text, col, s = 2) {
    const tw = textWidth(text, s);
    drawText(x + Math.floor((bw - tw) / 2), y, text, col, s);
  }

  // Rounded rect (approximated)
  function fillRoundRect(x, y, rw, rh, r, col) {
    // fill inner rects
    fillRect(x+r, y, rw-2*r, rh, col);
    fillRect(x, y+r, r, rh-2*r, col);
    fillRect(x+rw-r, y+r, r, rh-2*r, col);
    // corners
    for (let dy = 0; dy < r; dy++) {
      for (let dx = 0; dx < r; dx++) {
        if ((dx-r+1)*(dx-r+1)+(dy-r+1)*(dy-r+1) <= r*r) {
          setPixel(x+dx, y+dy, col);
          setPixel(x+rw-1-dx, y+dy, col);
          setPixel(x+dx, y+rh-1-dy, col);
          setPixel(x+rw-1-dx, y+rh-1-dy, col);
        }
      }
    }
  }

  return { pixels, w, h, setPixel, fillRect, strokeRect, drawText, drawTextCentered, textWidth, drawGlyph, fillRoundRect };
}

// ── Layout helpers ────────────────────────────────────────────────────────────
// Draw phone chrome (status bar + nav)
function drawPhoneChrome(cv) {
  const { w, h } = cv;
  // Status bar top
  cv.fillRect(0, 0, w, 60, C.overlay);
  cv.drawText(20, 20, '9:41', C.text, 3);
  // battery + signal (simple shapes)
  cv.fillRect(w-100, 22, 60, 16, C.muted);
  cv.fillRect(w-38, 26, 28, 8, C.green);
  // Bottom nav bar
  cv.fillRect(0, h-80, w, 80, C.card);
  cv.fillRect(0, h-80, w, 1, C.border);
}

// Draw app header bar
function drawHeader(cv, title, sub) {
  cv.fillRect(0, 60, cv.w, 100, C.overlay);
  cv.fillRect(0, 159, cv.w, 1, C.border);
  cv.drawText(36, 78, title, C.text, 5);
  if (sub) cv.drawText(36, 128, sub, C.muted, 2);
}

// Draw a card
function drawCard(cv, x, y, cw, ch, col = C.card) {
  cv.fillRoundRect(x, y, cw, ch, 20, col);
}

// Draw a horizontal divider
function divider(cv, y) {
  cv.fillRect(0, y, cv.w, 1, C.border);
}

// Draw progress bar
function drawProgress(cv, x, y, pw, ph, pct, col) {
  cv.fillRoundRect(x, y, pw, ph, ph/2, C.border);
  cv.fillRoundRect(x, y, Math.max(ph, pw * pct / 100), ph, ph/2, col);
}

// ── SCREENS ───────────────────────────────────────────────────────────────────

// ── 1. Dashboard ─────────────────────────────────────────────────────────────
function makeDashboard(W, H) {
  const cv = makeCanvas(W, H);
  const pad = 36;

  drawPhoneChrome(cv);
  drawHeader(cv, 'Dashboard', 'Financial Overview');

  let y = 180;

  // Month selector bar
  cv.fillRect(pad, y, W-pad*2, 60, C.card);
  cv.drawText(pad+20, y+18, 'April 2026', C.text, 3);
  cv.fillRoundRect(W-pad-120, y+12, 100, 36, 12, C.violet);
  cv.drawText(W-pad-105, y+20, 'Savings 99', C.text, 2);
  y += 80;

  // Stats row: 2 cards
  const cw = Math.floor((W - pad*2 - 24) / 2);
  // Income card
  drawCard(cv, pad, y, cw, 180);
  cv.drawText(pad+20, y+20, 'QAR', C.violet, 2);
  cv.drawText(pad+20, y+48, 'Income', C.muted, 2);
  cv.drawText(pad+20, y+76, 'QAR 7,092', C.green, 3);
  cv.drawText(pad+20, y+118, 'Expenses', C.muted, 2);
  cv.drawText(pad+20, y+146, 'QAR 36', C.red, 3);

  // Portfolio card
  const cx2 = pad + cw + 24;
  drawCard(cv, cx2, y, cw, 180);
  cv.drawText(cx2+20, y+20, 'PORTFOLIO', C.muted, 2);
  cv.drawText(cx2+20, y+60, 'Rs 28,22,819', C.cyan, 3);
  cv.fillRoundRect(cx2+20, y+110, 80, 24, 8, [239,68,68,50]);
  cv.drawText(cx2+22, y+115, '-5.8', C.red, 2);
  y += 200;

  // Cash Flow label
  cv.drawText(pad, y, 'Cash Flow', C.text, 4);
  y += 60;

  // Chart area (area chart simulation)
  const ch2 = 300;
  drawCard(cv, pad, y, W-pad*2, ch2);
  // X-axis labels
  const months = ['Nov','Dec','Jan','Feb','Mar','Apr'];
  const xStep = Math.floor((W-pad*2-60) / 5);
  months.forEach((m, i) => cv.drawText(pad+30+i*xStep, y+ch2-30, m, C.muted, 2));

  // Bars (income violet, expense red)
  const barData = [
    [20,10],[60,15],[80,30],[140,80],[160,90],[80,5]
  ];
  const maxV = 160;
  const barW = 24;
  barData.forEach(([inc, exp], i) => {
    const bx = pad + 40 + i * xStep;
    const incH = Math.floor(inc / maxV * (ch2 - 60));
    const expH = Math.floor(exp / maxV * (ch2 - 60));
    cv.fillRoundRect(bx, y + ch2 - 40 - incH, barW, incH, 6, C.violet);
    cv.fillRoundRect(bx + barW + 6, y + ch2 - 40 - expH, barW, expH, 6, C.red);
  });
  y += ch2 + 30;

  // Expenses by Category
  cv.drawText(pad, y, 'Expenses by Category', C.text, 3);
  y += 50;
  drawCard(cv, pad, y, W-pad*2, 220);
  // Donut-ish (filled circles)
  const cx = pad + 110; const cy3 = y + 110; const r = 80;
  // Background ring
  for (let a = 0; a < 360; a += 2) {
    const ar = a * Math.PI / 180;
    for (let ri = r-28; ri < r; ri++) {
      cv.setPixel(cx + Math.cos(ar)*ri, cy3 + Math.sin(ar)*ri, C.border);
    }
  }
  // violet slice (70%)
  for (let a = -90; a < 162; a += 1) {
    const ar = a * Math.PI / 180;
    for (let ri = r-28; ri < r; ri++) {
      cv.setPixel(cx + Math.cos(ar)*ri, cy3 + Math.sin(ar)*ri, C.violet);
    }
  }
  // cyan slice (30%)
  for (let a = 162; a < 270; a += 1) {
    const ar = a * Math.PI / 180;
    for (let ri = r-28; ri < r; ri++) {
      cv.setPixel(cx + Math.cos(ar)*ri, cy3 + Math.sin(ar)*ri, C.cyan);
    }
  }
  // Legend
  cv.fillRect(cx+120, y+60, 20, 12, C.violet);
  cv.drawText(cx+148, y+58, 'Transport', C.muted, 2);
  cv.fillRect(cx+120, y+90, 20, 12, C.cyan);
  cv.drawText(cx+148, y+88, 'Food', C.muted, 2);

  return buildPNG(cv.pixels, W, H);
}

// ── 2. Transactions ──────────────────────────────────────────────────────────
function makeTransactions(W, H) {
  const cv = makeCanvas(W, H);
  const pad = 36;

  drawPhoneChrome(cv);
  drawHeader(cv, 'Transactions', 'Track your income and expenses');

  let y = 180;

  // Search bar
  drawCard(cv, pad, y, W-pad*2, 68);
  cv.drawText(pad+20, y+24, 'Search transactions...', C.muted, 2);
  y += 88;

  // Filter chips
  const chips = ['All','INR','QAR','USD'];
  let cx = pad;
  chips.forEach((c, i) => {
    const cw = cv.textWidth(c, 2) + 40;
    cv.fillRoundRect(cx, y, cw, 48, 24, i===0 ? C.violet : C.card);
    cv.drawText(cx+20, y+16, c, i===0 ? C.text : C.muted, 2);
    cx += cw + 16;
  });
  y += 68;

  // Time filter
  const tfilters = ['This Month','Last Month','This Year'];
  cx = pad;
  tfilters.forEach((c, i) => {
    const cw = cv.textWidth(c, 2) + 32;
    cv.fillRoundRect(cx, y, cw, 44, 22, i===0 ? C.violetD : C.card);
    cv.drawText(cx+16, y+14, c, i===0 ? C.text : C.muted, 2);
    cx += cw + 12;
  });
  y += 64;

  // Summary card
  drawCard(cv, pad, y, W-pad*2, 160);
  cv.drawText(pad+24, y+24, 'QAR', C.violet, 3);
  cv.drawText(pad+24, y+64, 'Income', C.muted, 2);
  cv.drawText(W-pad-180, y+64, 'QAR 7,091.84', C.green, 2);
  cv.drawText(pad+24, y+96, 'Expenses', C.muted, 2);
  cv.drawText(W-pad-140, y+96, 'QAR 35.57', C.red, 2);
  cv.fillRect(pad+24, y+122, W-pad*2-48, 1, C.border);
  cv.drawText(pad+24, y+134, 'Net', C.muted, 2);
  cv.drawText(W-pad-150, y+134, 'QAR 7,056.27', C.violet, 2);
  y += 180;

  // Table header
  cv.drawText(pad+20, y, '4 records', C.muted, 2);
  y += 36;
  // column headers
  cv.fillRect(pad, y, W-pad*2, 40, C.card);
  cv.drawText(pad+20, y+12, 'DATE', C.muted, 2);
  cv.drawText(pad+220, y+12, 'CATEGORY', C.muted, 2);
  cv.drawText(W-pad-200, y+12, 'AMOUNT', C.muted, 2);
  y += 50;

  // Rows
  const rows = [
    { date:'1 Apr', cat:'Other', badge:'income', amt:'+QAR 7,091.84', aCol: C.green },
    { date:'2 Apr', cat:'Transport', badge:'expense', amt:'-QAR 16.9', aCol: C.red },
    { date:'1 Apr', cat:'Food', badge:'expense', amt:'-QAR 11.67', aCol: C.red },
    { date:'1 Apr', cat:'Transport', badge:'expense', amt:'-QAR 7', aCol: C.red },
  ];
  rows.forEach((row, ri) => {
    const ry = y + ri * 88;
    if (ri % 2 === 0) cv.fillRect(pad, ry, W-pad*2, 88, [20,30,50]);
    cv.drawText(pad+20, ry+12, row.date, C.text, 2);
    cv.drawText(pad+20, ry+40, '2026', C.muted, 2);
    cv.drawText(pad+220, ry+20, row.cat, C.text, 2);
    // badge
    const bc = row.badge === 'income' ? C.green : C.red;
    cv.fillRoundRect(pad+220, ry+48, cv.textWidth(row.badge, 2)+16, 28, 14, [...bc, 40].slice(0,3).map(v=>Math.floor(v*0.3)));
    cv.drawText(pad+228, ry+54, row.badge, bc, 2);
    cv.drawText(W-pad-cv.textWidth(row.amt, 2)-20, ry+30, row.amt, row.aCol, 2);
    cv.fillRect(pad, ry+87, W-pad*2, 1, C.border);
  });

  return buildPNG(cv.pixels, W, H);
}

// ── 3. Investments ───────────────────────────────────────────────────────────
function makeInvestments(W, H) {
  const cv = makeCanvas(W, H);
  const pad = 36;

  drawPhoneChrome(cv);
  drawHeader(cv, 'Investments', 'Stocks mutual funds crypto and more');

  let y = 180;

  // Hub icons row
  const hubs = [['Gold','#F59E0B'], ['Land','#84CC16'], ['Digital','#3B82F6']];
  const hw = Math.floor((W - pad*2 - 32) / 3);
  hubs.forEach(([name, col], i) => {
    const hx = pad + i*(hw+16);
    cv.strokeRect(hx, y, hw, 110, C.border, 2);
    cv.drawTextCentered(hx, y+70, hw, name, C.text, 2);
  });
  y += 130;

  // Stats row
  const sw = Math.floor((W - pad*2 - 24) / 2);
  drawCard(cv, pad, y, sw, 140);
  cv.drawText(pad+20, y+20, 'TOTAL INVESTED', C.muted, 2);
  cv.drawText(pad+20, y+60, 'Rs 29,95,852', C.text, 3);

  drawCard(cv, pad+sw+24, y, sw, 140);
  cv.drawText(pad+sw+44, y+20, 'CURRENT VALUE', C.muted, 2);
  cv.drawText(pad+sw+44, y+60, 'Rs 28,22,818', C.cyan, 3);
  y += 156;

  // P&L wide card
  drawCard(cv, pad, y, W-pad*2, 120, [60,10,10]);
  cv.strokeRect(pad, y, W-pad*2, 120, C.red, 1);
  cv.drawText(pad+20, y+20, 'TOTAL P&L', C.muted, 2);
  cv.drawText(pad+20, y+54, 'Rs -1,73,034', C.red, 3);
  cv.drawText(pad+20, y+96, '-5.8% return', C.red, 2);
  y += 140;

  // Filter chips
  const fchips = ['All 34','Stocks 16','Mutual Fund 15','Gold 1'];
  cx = pad;
  fchips.forEach((c, i) => {
    const cw2 = cv.textWidth(c, 2) + 30;
    cv.fillRoundRect(cx, y, cw2, 44, 22, i===0 ? C.violet : C.card);
    cv.drawText(cx+15, y+14, c, i===0 ? C.text : C.muted, 2);
    cx += cw2 + 12;
  });
  y += 64;

  // Investment cards
  const icards = [
    { type:'Stocks', name:'Infosys', sym:'INFY.NS', units:'106 units @ Rs 1,496.98 avg', ltp:'Rs 1,297.50', inv:'Rs 1,58,679', cur:'Rs 1,37,535', pl:'-Rs 21,144', plPct:'-13.3', pos: false },
    { type:'Stocks', name:'Coal India', sym:'COALINDIA.NS', units:'26 units @ Rs 390.81 avg', ltp:'Rs 449.30', inv:'Rs 10,161', cur:'Rs 11,681', pl:'+Rs 1,520', plPct:'+15.0', pos: true },
    { type:'Mutual Fund', name:'Axis Bluechip Fund', sym:'AXISBLUECHIP', units:'120 units @ Rs 48.50 avg', ltp:'Rs 51.20', inv:'Rs 5,820', cur:'Rs 6,144', pl:'+Rs 324', plPct:'+5.6', pos: true },
  ];

  icards.forEach((card) => {
    if (y + 280 > H - 80) return;
    drawCard(cv, pad, y, W-pad*2, 260);
    // header badges
    cv.fillRoundRect(pad+20, y+20, cv.textWidth(card.type, 2)+20, 28, 14, C.violetD);
    cv.drawText(pad+30, y+26, card.type, C.text, 2);
    const liveX = pad+20+cv.textWidth(card.type, 2)+36;
    cv.fillRect(liveX, y+28, 12, 12, C.green);
    cv.drawText(liveX+20, y+24, 'Live', C.green, 2);

    cv.drawText(pad+20, y+64, card.name, C.text, 3);
    cv.drawText(pad+20, y+100, card.sym, C.muted, 2);
    cv.drawText(pad+20, y+128, card.units, C.muted, 2);
    // LTP badge
    cv.fillRoundRect(pad+20, y+156, cv.textWidth(card.ltp, 2)+20, 28, 8, C.card);
    cv.strokeRect(pad+20, y+156, cv.textWidth(card.ltp, 2)+20, 28, C.blue, 1);
    cv.drawText(pad+30, y+162, card.ltp, C.blue, 2);

    // Invested / Current
    const midX = W/2;
    cv.drawText(pad+20, y+200, 'Invested', C.muted, 2);
    cv.drawText(midX+20, y+200, 'Current', C.muted, 2);
    cv.drawText(pad+20, y+222, card.inv, C.text, 2);
    cv.drawText(midX+20, y+222, card.cur, card.pos ? C.green : C.red, 2);

    const plCol = card.pos ? C.green : C.red;
    cv.fillRoundRect(pad+20, y+196, 8, 8, 4, plCol);
    cv.drawText(W-pad-cv.textWidth(card.pl, 2)-20, y+220, card.pl + ' (' + card.plPct + '%)', plCol, 2);

    y += 280;
  });

  return buildPNG(cv.pixels, W, H);
}

// ── 4. Insurance ─────────────────────────────────────────────────────────────
function makeInsurance(W, H) {
  const cv = makeCanvas(W, H);
  const pad = 36;

  drawPhoneChrome(cv);
  drawHeader(cv, 'Insurance', 'All your policies in one place');

  let y = 180;

  // Stats row
  const sw3 = Math.floor((W - pad*2 - 24) / 3);
  const stats3 = [['TOTAL\nPOLICIES','4',C.text],['ANNUAL\nPREMIUM','Rs 1,22,093',C.amber],['EXPIRING\nSOON','0',C.green]];
  stats3.forEach(([label, val, col], i) => {
    drawCard(cv, pad + i*(sw3+12), y, sw3, 150);
    const lines = label.split('\n');
    lines.forEach((l, li) => cv.drawText(pad+i*(sw3+12)+14, y+16+li*24, l, C.muted, 2));
    cv.drawText(pad+i*(sw3+12)+14, y+90, val, col, 3);
  });
  y += 170;

  // Search
  drawCard(cv, pad, y, W-pad*2, 60);
  cv.drawText(pad+20, y+20, 'Search policies...', C.muted, 2);
  y += 80;

  // Frequency tabs
  const tabs = ['All','Monthly (1)','Quarterly (1)','Half-Yearly (1)','Yearly (1)'];
  let tx = pad;
  tabs.forEach((t, i) => {
    const tw2 = cv.textWidth(t, 2)+24;
    cv.fillRoundRect(tx, y, tw2, 44, 22, i===0 ? C.violet : C.card);
    cv.strokeRect(tx, y, tw2, 44, C.border, 1);
    cv.drawText(tx+12, y+14, t, i===0 ? C.text : C.muted, 2);
    tx += tw2 + 10;
  });
  y += 64;

  // Policy cards
  const policies = [
    { name:'Axis Max Life Smart Term Plan Plus', type:'Life Insurance', premium:'Rs 56,301 / yearly', sa:'Rs 2,00,00,000', policy:'190XXXXXX5', expires:'7 Jan 2060', col:[30,58,138] },
    { name:'Axis Max Life Online Saving Plan', type:'Life Insurance', premium:'Rs 5,000 / monthly', sa:'Rs 6,00,000', policy:'637XXXXXX9', expires:'15 Jan 2046', col:[30,58,138] },
    { name:'LIC Term Insurance', type:'Term Insurance', premium:'Rs 709 / quarterly', sa:'Rs 50,000', policy:'323XXXXXX3', expires:'5 Feb 2029', col:[60,20,30] },
  ];

  policies.forEach((pol) => {
    if (y + 260 > H - 80) return;
    cv.fillRoundRect(pad, y, W-pad*2, 240, 20, pol.col);
    cv.strokeRect(pad, y, W-pad*2, 240, C.border, 1);

    cv.fillRect(pad+20, y+24, 36, 36, C.blue);  // icon placeholder
    cv.drawText(pad+70, y+24, pol.name.slice(0,22), C.text, 2);
    if (pol.name.length > 22) cv.drawText(pad+70, y+48, pol.name.slice(22,44), C.text, 2);
    cv.drawText(pad+70, y+72, pol.type, C.muted, 2);

    cv.drawText(pad+20, y+108, 'Premium', C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(pol.premium, 2)-20, y+108, pol.premium, C.text, 2);
    cv.drawText(pad+20, y+138, 'Sum Assured', C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(pol.sa, 2)-20, y+138, pol.sa, C.text, 2);
    cv.drawText(pad+20, y+168, 'Policy #', C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(pol.policy, 2)-20, y+168, pol.policy, C.muted, 2);
    cv.drawText(pad+20, y+198, 'Expires', C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(pol.expires, 2)-20, y+198, pol.expires, C.text, 2);

    y += 260;
  });

  return buildPNG(cv.pixels, W, H);
}

// ── 5. Vault ─────────────────────────────────────────────────────────────────
function makeVault(W, H) {
  const cv = makeCanvas(W, H);
  const pad = 36;

  drawPhoneChrome(cv);

  // Header with lock icon
  cv.fillRect(0, 60, W, 100, C.overlay);
  cv.fillRect(0, 159, W, 1, C.border);
  cv.drawText(36, 78, 'Password Vault', C.text, 5);
  cv.drawText(36, 128, 'Securely stored in your private Google Sheet', C.muted, 2);

  // Add Entry button
  cv.fillRoundRect(W-pad-220, 78, 200, 52, 26, C.violet);
  cv.drawText(W-pad-200, 96, '+ Add Entry', C.text, 3);

  let y = 180;

  // Category cards row
  const cats = [['Other','1'],['All','1']];
  const catW = Math.floor((W-pad*2-24)/2);
  cats.forEach(([name, cnt], i) => {
    const cx3 = pad + i*(catW+24);
    drawCard(cv, cx3, y, catW, 120, i===1 ? C.violetD : C.card);
    if (i===1) cv.strokeRect(cx3, y, catW, 120, C.violet, 2);
    cv.drawText(cx3+20, y+24, name, C.muted, 2);
    cv.drawText(cx3+20, y+60, cnt, C.text, 4);
  });
  y += 140;

  // Category filter row
  const catFilters = ['All','Banking','Social','Work','Shopping','Email','Other'];
  let cfx = pad;
  catFilters.forEach((f, i) => {
    const cfw = cv.textWidth(f, 2) + 24;
    cv.fillRoundRect(cfx, y, cfw, 44, 22, i===0 ? C.violet : C.card);
    cv.drawText(cfx+12, y+14, f, i===0 ? C.text : C.muted, 2);
    cfx += cfw + 10;
  });
  y += 64;

  // Table header
  cv.fillRect(pad, y, W-pad*2, 44, C.card);
  cv.drawText(pad+20, y+14, 'SITE / APP', C.muted, 2);
  cv.drawText(pad+300, y+14, 'USERNAME', C.muted, 2);
  cv.drawText(W-pad-200, y+14, 'PASSWORD', C.muted, 2);
  y += 54;

  // Entry row
  const entries = [
    { icon:'N', name:'Netlify', url:'netlify.app', user:'user@example.com' },
    { icon:'G', name:'GitHub', url:'github.com', user:'johndoe' },
    { icon:'A', name:'Amazon', url:'amazon.com', user:'john@email.com' },
  ];

  entries.forEach((entry) => {
    cv.fillRect(pad, y, W-pad*2, 100, [20,32,52]);
    cv.fillRoundRect(pad+20, y+24, 44, 44, 22, C.violet);
    cv.drawTextCentered(pad+20, y+34, 44, entry.icon, C.text, 3);
    cv.drawText(pad+76, y+20, entry.name, C.text, 2);
    cv.drawText(pad+76, y+44, entry.url, C.muted, 2);
    cv.drawText(pad+300, y+20, 'user:', C.muted, 2);
    cv.drawText(pad+370, y+20, entry.user, C.muted, 2);
    // password dots
    const dotsX = W-pad-250;
    cv.fillRoundRect(dotsX, y+20, 160, 40, 8, C.card);
    for (let d = 0; d < 10; d++) cv.fillRect(dotsX+10+d*14, y+36, 8, 8, C.muted);
    // copy/view icons
    cv.fillRoundRect(W-pad-76, y+24, 32, 32, 6, C.card);
    cv.drawText(W-pad-68, y+30, '>', C.violet, 2);
    cv.fillRect(pad, y+99, W-pad*2, 1, C.border);
    y += 100;
  });

  // Security note
  y += 20;
  drawCard(cv, pad, y, W-pad*2, 100);
  cv.strokeRect(pad, y, W-pad*2, 100, C.border, 1);
  cv.drawText(pad+20, y+20, 'Passwords stored in your own private Google Sheet.', C.muted, 2);
  cv.drawText(pad+20, y+48, 'Vault locks when you close the browser tab.', C.muted, 2);
  cv.drawText(pad+20, y+76, 'PIN stored locally as SHA-256 hash.', C.muted, 2);

  return buildPNG(cv.pixels, W, H);
}

// ── 6. Subscriptions ─────────────────────────────────────────────────────────
function makeSubscriptions(W, H) {
  const cv = makeCanvas(W, H);
  const pad = 36;

  drawPhoneChrome(cv);
  drawHeader(cv, 'Subscriptions', 'Track your recurring services');

  let y = 180;

  // Active badge
  cv.fillRoundRect(pad, y, 260, 56, 28, C.card);
  cv.strokeRect(pad, y, 260, 56, C.border, 1);
  cv.drawText(pad+20, y+18, 'ACTIVE 3 of 3 total', C.text, 2);
  y += 76;

  // Currency summary cards
  const curW = Math.floor((W-pad*2-24)/2);
  const curData = [['USD','Monthly','$ 11.08','Annual','$ 133'], ['INR','Monthly','Rs 75.00','Annual','Rs 900']];
  curData.forEach(([cur, ml, mv, al, av], i) => {
    drawCard(cv, pad+i*(curW+24), y, curW, 180);
    cv.drawText(pad+i*(curW+24)+20, y+20, cur, C.violet, 3);
    cv.drawText(pad+i*(curW+24)+20, y+60, ml, C.muted, 2);
    cv.drawText(pad+i*(curW+24)+20+curW-cv.textWidth(mv,2)-24, y+60, mv, C.text, 2);
    cv.fillRect(pad+i*(curW+24)+20, y+90, curW-40, 1, C.border);
    cv.drawText(pad+i*(curW+24)+20, y+110, al, C.muted, 2);
    cv.drawText(pad+i*(curW+24)+20+curW-cv.textWidth(av,2)-24, y+110, av, C.red, 2);
  });
  y += 200;

  // Subscription cards
  const subs = [
    { name:'Netlify', status:'Active', sCol:C.green, amt:'USD 9 / Monthly', annual:'USD 108', start:'24 Mar 2026', end:'23 Apr 2026', note:'Change to free plan after April', url:'netlify.app' },
    { name:'iPhone Storage', status:'Active', sCol:C.green, amt:'INR 75 / Monthly', annual:'INR 900', start:'27 Mar 2026', end:'26 Dec 2034', note:'Cloud backup', url:'iphone.com' },
    { name:'Google Dev Account', status:'Active', sCol:C.green, amt:'USD 25 / Yearly', annual:'USD 25', start:'30 Mar 2026', end:'29 Mar 2027', note:'One time plan', url:'developer.google.com' },
  ];

  subs.forEach((sub) => {
    if (y + 280 > H - 80) return;
    drawCard(cv, pad, y, W-pad*2, 260);
    cv.drawText(pad+20, y+20, sub.name, C.cyan, 3);
    cv.fillRoundRect(pad+20, y+60, cv.textWidth(sub.status, 2)+20, 28, 14, [0,60,30]);
    cv.drawText(pad+30, y+66, sub.status, sub.sCol, 2);
    cv.drawText(W-pad-cv.textWidth(sub.amt, 3)-20, y+24, sub.amt.split(' /')[0], C.text, 3);
    cv.drawText(W-pad-cv.textWidth('/'+sub.amt.split('/')[1], 2)-20, y+56, '/ ' + sub.amt.split('/')[1], C.muted, 2);

    cv.drawText(pad+20, y+104, 'Annual', C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(sub.annual, 2)-20, y+104, sub.annual, C.text, 2);
    cv.drawText(pad+20, y+132, 'Started', C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(sub.start, 2)-20, y+132, sub.start, C.muted, 2);
    cv.drawText(pad+20, y+160, 'Ends', C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(sub.end, 2)-20, y+160, sub.end, C.muted, 2);
    cv.drawText(pad+20, y+192, sub.note, C.muted, 2);
    cv.drawText(pad+20, y+228, sub.url, C.violet, 2);

    y += 280;
  });

  return buildPNG(cv.pixels, W, H);
}

// ── Tablet version (landscape content, portrait frame) ───────────────────────
function makeTabletDashboard(W, H) {
  // Same as phone dashboard but wider card layout
  const cv = makeCanvas(W, H);
  const pad = 60;

  drawPhoneChrome(cv);
  // Bigger header for tablet
  cv.fillRect(0, 60, W, 120, C.overlay);
  cv.fillRect(0, 179, W, 1, C.border);
  cv.drawText(pad, 86, 'Dashboard', C.text, 7);
  cv.drawText(pad, 152, 'Financial Overview  April 2026', C.muted, 3);

  let y = 200;

  // 3-col stats row
  const sw = Math.floor((W - pad*2 - 48) / 3);
  const stats = [['QAR Income','7,092.00',C.green],['QAR Expenses','35.57',C.red],['Net Savings','7,056.43',C.violet]];
  stats.forEach(([lbl, val, col], i) => {
    drawCard(cv, pad + i*(sw+24), y, sw, 160);
    cv.drawText(pad + i*(sw+24)+24, y+24, lbl, C.muted, 3);
    cv.drawText(pad + i*(sw+24)+24, y+84, val, col, 4);
  });
  y += 180;

  // Portfolio wide card
  drawCard(cv, pad, y, W-pad*2, 160);
  cv.drawText(pad+30, y+24, 'PORTFOLIO CURRENT VALUE', C.muted, 3);
  cv.drawText(pad+30, y+76, 'Rs 28,22,819', C.cyan, 6);
  cv.drawText(pad+30, y+136, '-5.8% overall gain/loss', C.red, 3);
  y += 180;

  // Chart area (2 col: cashflow + pie)
  const cw2 = Math.floor((W - pad*2 - 40) / 2);

  // Cash Flow
  drawCard(cv, pad, y, cw2, 400);
  cv.drawText(pad+24, y+24, 'Cash Flow  6M', C.text, 3);
  const barData = [[20,10],[60,15],[80,30],[140,80],[160,90],[80,5]];
  const months = ['Nov','Dec','Jan','Feb','Mar','Apr'];
  const bxStep = Math.floor((cw2-80)/6);
  barData.forEach(([inc, exp], i) => {
    const bx = pad+40+i*bxStep;
    const incH = Math.floor(inc/160*300);
    const expH = Math.floor(exp/160*300);
    cv.fillRoundRect(bx, y+360-incH, 28, incH, 6, C.violet);
    cv.fillRoundRect(bx+34, y+360-expH, 28, expH, 6, C.red);
    cv.drawText(bx+5, y+370, months[i], C.muted, 2);
  });

  // Pie/Donut
  const px2 = pad + cw2 + 40;
  drawCard(cv, px2, y, cw2, 400);
  cv.drawText(px2+24, y+24, 'Expenses by Category', C.text, 3);
  const pcx = px2 + cw2/2; const pcy = y + 220; const pr = 120;
  for (let a = 0; a < 360; a += 2) {
    const ar = a * Math.PI / 180;
    for (let ri = pr-44; ri < pr; ri++) {
      cv.setPixel(pcx+Math.cos(ar)*ri, pcy+Math.sin(ar)*ri, a < 252 ? C.violet : C.cyan);
    }
  }
  cv.fillRect(px2+24, y+340, 20, 14, C.violet);
  cv.drawText(px2+52, y+338, 'Transport 70%', C.muted, 2);
  cv.fillRect(px2+24, y+364, 20, 14, C.cyan);
  cv.drawText(px2+52, y+362, 'Food 30%', C.muted, 2);

  y += 420;

  // Recent transactions list
  drawCard(cv, pad, y, W-pad*2, 300);
  cv.drawText(pad+24, y+24, 'Recent Transactions', C.text, 3);
  const txs = [
    ['1 Apr 2026','Carry Forward from March 2026','Other / income','QAR 7,091.84',C.green],
    ['2 Apr 2026','From to ofc','Transport / expense','QAR 16.90',C.red],
    ['1 Apr 2026','Lunch','Food / expense','QAR 11.67',C.red],
  ];
  txs.forEach(([date, note, cat, amt, col], ri) => {
    const ry = y + 76 + ri * 68;
    if (ri>0) cv.fillRect(pad+24, ry-10, W-pad*2-48, 1, C.border);
    cv.drawText(pad+24, ry, date, C.muted, 2);
    cv.drawText(pad+220, ry, note, C.text, 2);
    cv.drawText(pad+650, ry, cat, C.muted, 2);
    cv.drawText(W-pad-cv.textWidth(amt,2)-24, ry, amt, col, 2);
  });

  return buildPNG(cv.pixels, W, H);
}

// ── generate all files ────────────────────────────────────────────────────────
const outDir = __dirname;

const files = [
  ['phone-dashboard.png',     () => makeDashboard(1080, 1920)],
  ['phone-transactions.png',  () => makeTransactions(1080, 1920)],
  ['phone-investments.png',   () => makeInvestments(1080, 1920)],
  ['phone-insurance.png',     () => makeInsurance(1080, 1920)],
  ['phone-vault.png',         () => makeVault(1080, 1920)],
  ['phone-subscriptions.png', () => makeSubscriptions(1080, 1920)],
  ['tablet-7-dashboard.png',  () => makeTabletDashboard(1200, 1920)],
  ['tablet-10-dashboard.png', () => makeTabletDashboard(1600, 2560)],
];

let i = 0;
for (const [name, fn] of files) {
  process.stdout.write(`Generating ${name}...`);
  const buf = fn();
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(` ${buf.length} bytes`);
  i++;
}
console.log(`Done. ${i} files.`);
