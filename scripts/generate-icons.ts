// Generates public/icons/icon{16,32,48,128}.png: an indigo rounded square
// with a white speech bubble and a red prohibition sign — "this language,
// not in my feed". Zero dependencies; same rasterize-and-downsample approach
// as the sibling autoscroll-comments project. Run with: npm run icons

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const MASTER_SIZE = 2304; // divisible by every target size below
const TARGET_SIZES = [16, 32, 48, 128] as const;

type Rgb = readonly [number, number, number];
type Point = readonly [number, number];
type Triangle = readonly [Point, Point, Point];

const INDIGO: Rgb = [48, 63, 159];
const WHITE: Rgb = [255, 255, 255];
const RED: Rgb = [244, 33, 46];

// All geometry is expressed as fractions of the icon size.
const BG_CORNER_RADIUS = 0.219;
const BUBBLE = { x0: 0.14, y0: 0.16, x1: 0.78, y1: 0.56, r: 0.09 } as const;
const BUBBLE_TAIL: Triangle = [
  [0.25, 0.54],
  [0.38, 0.54],
  [0.22, 0.7],
];
const TEXT_LINES = [
  { y: 0.26, x0: 0.22, x1: 0.7 },
  { y: 0.36, x0: 0.22, x1: 0.64 },
  { y: 0.46, x0: 0.22, x1: 0.55 },
] as const;
const TEXT_LINE_RADIUS = 0.02;
const SIGN = { cx: 0.68, cy: 0.68, rOuter: 0.22, rInner: 0.155 } as const;
const SIGN_SLASH_HALF = 0.1096; // rInner / sqrt(2)
const SIGN_SLASH_RADIUS = 0.0325;

function inRoundRect(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number
): boolean {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const dx = Math.max(Math.abs(px - cx) - ((x1 - x0) / 2 - r), 0);
  const dy = Math.max(Math.abs(py - cy) - ((y1 - y0) / 2 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

function inHorizontalCapsule(
  px: number,
  py: number,
  x0: number,
  x1: number,
  y: number,
  r: number
): boolean {
  const nearestX = Math.min(Math.max(px, x0), x1);
  const dx = px - nearestX;
  const dy = py - y;
  return dx * dx + dy * dy <= r * r;
}

function inSegmentCapsule(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number
): boolean {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq === 0 ? 0 : Math.min(Math.max(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0), 1);
  const dx = px - (ax + t * abx);
  const dy = py - (ay + t * aby);
  return dx * dx + dy * dy <= r * r;
}

function inRing(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number
): boolean {
  const distSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
  return distSq <= rOuter * rOuter && distSq >= rInner * rInner;
}

function inTriangle(px: number, py: number, [a, b, c]: Triangle): boolean {
  const edge = (p: Point, q: Point): number =>
    (q[0] - p[0]) * (py - p[1]) - (q[1] - p[1]) * (px - p[0]);
  const d1 = edge(a, b);
  const d2 = edge(b, c);
  const d3 = edge(c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function inProhibitionSign(fx: number, fy: number): boolean {
  if (inRing(fx, fy, SIGN.cx, SIGN.cy, SIGN.rOuter, SIGN.rInner)) return true;
  return inSegmentCapsule(
    fx,
    fy,
    SIGN.cx - SIGN_SLASH_HALF,
    SIGN.cy + SIGN_SLASH_HALF,
    SIGN.cx + SIGN_SLASH_HALF,
    SIGN.cy - SIGN_SLASH_HALF,
    SIGN_SLASH_RADIUS
  );
}

function pixelColor(fx: number, fy: number): Rgb | null {
  if (!inRoundRect(fx, fy, 0, 0, 1, 1, BG_CORNER_RADIUS)) return null;
  if (inProhibitionSign(fx, fy)) return RED; // topmost layer
  const inBubble =
    inRoundRect(fx, fy, BUBBLE.x0, BUBBLE.y0, BUBBLE.x1, BUBBLE.y1, BUBBLE.r) ||
    inTriangle(fx, fy, BUBBLE_TAIL);
  if (inBubble) {
    for (const line of TEXT_LINES) {
      if (inHorizontalCapsule(fx, fy, line.x0, line.x1, line.y, TEXT_LINE_RADIUS)) return INDIGO;
    }
    return WHITE;
  }
  return INDIGO;
}

function renderMaster(): Uint8Array {
  const data = new Uint8Array(MASTER_SIZE * MASTER_SIZE * 4);
  for (let y = 0; y < MASTER_SIZE; y += 1) {
    const fy = (y + 0.5) / MASTER_SIZE;
    for (let x = 0; x < MASTER_SIZE; x += 1) {
      const color = pixelColor((x + 0.5) / MASTER_SIZE, fy);
      if (color) {
        const i = (y * MASTER_SIZE + x) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
  }
  return data;
}

// Box-downsample with premultiplied alpha so transparent edges don't darken.
function downscale(master: Uint8Array, size: number): Uint8Array {
  const factor = MASTER_SIZE / size;
  const area = factor * factor;
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < factor; sy += 1) {
        const rowStart = ((y * factor + sy) * MASTER_SIZE + x * factor) * 4;
        for (let sx = 0; sx < factor; sx += 1) {
          const i = rowStart + sx * 4;
          const alpha = master[i + 3] ?? 0;
          r += (master[i] ?? 0) * alpha;
          g += (master[i + 1] ?? 0) * alpha;
          b += (master[i + 2] ?? 0) * alpha;
          a += alpha;
        }
      }
      const o = (y * size + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round(a / area);
      }
    }
  }
  return out;
}

const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(rgba: Uint8Array, size: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1)); // zero filter byte per row
  const pixels = Buffer.from(rgba);
  for (let y = 0; y < size; y += 1) {
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function main(): void {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.join(scriptDir, "..", "public", "icons");
  fs.mkdirSync(outDir, { recursive: true });
  const master = renderMaster();
  for (const size of TARGET_SIZES) {
    const png = encodePng(downscale(master, size), size);
    const file = path.join(outDir, `icon${size}.png`);
    fs.writeFileSync(file, png);
    console.log(`wrote ${file} (${png.length} bytes)`);
  }
}

main();
