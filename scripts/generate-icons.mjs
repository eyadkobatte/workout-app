/**
 * Generates the PWA icon set from the locked "The Plate" concept
 * (issue 02): a loaded bar seen end-on — full-bleed iron field, plate-red
 * disc, recessed ring, chalk hub, centre hole. All detail sits inside the
 * 40%-radius maskable safe zone, so one geometry serves both the "any" and
 * "maskable" purposes.
 *
 * Zero dependencies: circles are rasterized with 4x4 supersampling and
 * written as PNGs with Node's zlib. Run: npm run icons.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// --- the locked geometry (512 design space) --------------------------------

const DESIGN = 512;
const CENTER = 256;
const BACKGROUND = "#131416"; // iron

// Painter's order; the SVG is emitted from the same list.
const SHAPES = [
  { kind: "fill", r: 172, color: "#EE4433" }, // plate
  { kind: "stroke", r: 122, width: 12, color: "#131416" }, // recessed ring
  { kind: "stroke", r: 60, width: 10, color: "#F1F0EB" }, // chalk hub
  { kind: "fill", r: 42, color: "#131416" }, // centre hole
];

// --- rendering --------------------------------------------------------------

function hex(color) {
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

function render(size) {
  const SUB = 4; // supersamples per pixel edge
  const shapes = SHAPES.map((s) => ({ ...s, rgb: hex(s.color) }));
  const bg = hex(BACKGROUND);
  const out = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const u = ((px + (sx + 0.5) / SUB) / size) * DESIGN;
          const v = ((py + (sy + 0.5) / SUB) / size) * DESIGN;
          const d = Math.hypot(u - CENTER, v - CENTER);
          let cr = bg[0];
          let cg = bg[1];
          let cb = bg[2];
          for (const s of shapes) {
            const hit = s.kind === "fill" ? d <= s.r : Math.abs(d - s.r) <= s.width / 2;
            if (hit) {
              cr = s.rgb[0];
              cg = s.rgb[1];
              cb = s.rgb[2];
            }
          }
          r += cr;
          g += cg;
          b += cb;
        }
      }
      const i = (py * size + px) * 3;
      out[i] = Math.round(r / (SUB * SUB));
      out[i + 1] = Math.round(g / (SUB * SUB));
      out[i + 2] = Math.round(b / (SUB * SUB));
    }
  }
  return out;
}

// --- PNG writing -------------------------------------------------------------

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB (the icon is fully opaque)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- emit --------------------------------------------------------------------

function emitSvg() {
  const body = SHAPES.map((s) =>
    s.kind === "fill"
      ? `  <circle cx="256" cy="256" r="${s.r}" fill="${s.color}"/>`
      : `  <circle cx="256" cy="256" r="${s.r}" fill="none" stroke="${s.color}" stroke-width="${s.width}"/>`,
  ).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n  <rect width="512" height="512" fill="${BACKGROUND}"/>\n${body}\n</svg>\n`;
}

const outDir = new URL("../public/icons/", import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("icon.svg", outDir), emitSvg());

const assets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-192.png", 192],
  ["icon-maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
];
const rendered = new Map(); // same size, same pixels — rasterize once
for (const [name, size] of assets) {
  if (!rendered.has(size)) rendered.set(size, png(size, size, render(size)));
  writeFileSync(new URL(name, outDir), rendered.get(size));
}
console.log("icons generated:", [...rendered.keys()].join(", "), "+ icon.svg");
