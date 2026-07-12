/**
 * Dependency-free icon generator that renders the Overhead brand mark
 * (rounded square + three stacked "header" bars, top bar in the accent color).
 * Geometry matches the brand kit master SVG (viewBox 0 0 100 100).
 *
 * Usage: node scripts/generate-icons.mjs
 */
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../src/icons');
const SIZES = [16, 32, 48, 128];

// Brand mark colors (from Overhead Brand Kit)
const SQUARE = [17, 19, 24]; // #111318
const ACCENT = [78, 91, 246]; // #4E5BF6 — top bar
const BAR = [88, 91, 104]; // #585B68 — lower bars

// Bars in the 100x100 design space: [x, y, width, height, color]
const BARS = [
  [24, 32, 52, 9, ACCENT],
  [24, 47, 40, 9, BAR],
  [24, 62, 28, 9, BAR],
];
const CORNER_RADIUS = 24; // rx in design space

// --- minimal PNG encoder (RGBA, 8-bit) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function drawIcon(size) {
  const f = size / 100;
  const buf = Buffer.alloc(size * size * 4, 0); // transparent
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
  };
  const radius = CORNER_RADIUS * f;
  const inRounded = (x, y) => {
    const max = size - 1;
    const cx = [radius, max - radius];
    const cy = [radius, max - radius];
    if (x < cx[0] && y < cy[0]) return Math.hypot(x - cx[0], y - cy[0]) <= radius;
    if (x > cx[1] && y < cy[0]) return Math.hypot(x - cx[1], y - cy[0]) <= radius;
    if (x < cx[0] && y > cy[1]) return Math.hypot(x - cx[0], y - cy[1]) <= radius;
    if (x > cx[1] && y > cy[1]) return Math.hypot(x - cx[1], y - cy[1]) <= radius;
    return true;
  };

  // rounded square
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (inRounded(x, y)) set(x, y, SQUARE);

  // bars
  for (const [bx, by, bw, bh, color] of BARS) {
    const x0 = Math.round(bx * f);
    const y0 = Math.round(by * f);
    const w = Math.max(1, Math.round(bw * f));
    const h = Math.max(1, Math.round(bh * f));
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) set(x, y, color);
  }
  return buf;
}

// Supersampling factor: render at size*SS, then average down for smooth,
// anti-aliased edges and rounded corners (alpha-weighted to avoid dark fringes).
const SS = 4;
function downsample(hi, hiSize, size, ss) {
  const out = Buffer.alloc(size * size * 4, 0);
  const n = ss * ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const i = ((y * ss + dy) * hiSize + (x * ss + dx)) * 4;
          const al = hi[i + 3];
          r += hi[i] * al; g += hi[i + 1] * al; b += hi[i + 2] * al; a += al;
        }
      }
      const o = (y * size + x) * 4;
      out[o + 3] = Math.round(a / n);
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
    }
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const hi = drawIcon(size * SS);
  const px = downsample(hi, size * SS, size, SS);
  fs.writeFileSync(path.join(OUT_DIR, `icon-${size}.png`), encodePng(size, px));
  console.log(`✓ icon-${size}.png (anti-aliased)`);
}
console.log('Overhead brand icons generated in src/icons/');
