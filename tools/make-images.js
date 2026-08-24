/* =========================================================================
   make-images.js — gera as imagens de marcador de posição do sítio.
   Desenha um motivo abstracto derivado das salinas (tanques + horizonte)
   em PNG, e converte para JPEG (sips) e WebP (cwebp). Substituir por
   fotografias reais mantendo os mesmos nomes de ficheiro.
   Uso: node tools/make-images.js
   ========================================================================= */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT = path.join(__dirname, "..", "assets", "img");
fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------- PNG cru */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePng(file, w, h, pixels) {  // pixels: Buffer RGB w*h*3
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    pixels.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

/* --------------------------------------------------------- desenho */
const PALETTES = [
  { sky: [12, 51, 59],  sea: [15, 76, 92],  land: [227, 210, 174], salt: [250, 252, 251], accent: [194, 86, 107] },
  { sky: [7, 39, 46],   sea: [28, 107, 126], land: [231, 235, 221], salt: [250, 252, 251], accent: [124, 143, 92] },
  { sky: [18, 63, 73],  sea: [15, 76, 92],  land: [241, 231, 211], salt: [237, 242, 240], accent: [194, 86, 107] },
  { sky: [10, 45, 53],  sea: [22, 92, 110], land: [227, 210, 174], salt: [250, 252, 251], accent: [176, 134, 60] }
];

function draw(w, h, seed) {
  const p = PALETTES[seed % PALETTES.length];
  const px = Buffer.alloc(w * h * 3);
  const horizon = Math.round(h * (0.44 + ((seed * 7) % 11) / 100));
  const set = (x, y, c) => { const i = (y * w + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; };
  const mix = (a, b, t) => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < horizon) {
        set(x, y, mix(p.sky, p.sea, y / horizon));            // céu
      } else {
        const t = (y - horizon) / (h - horizon);
        set(x, y, mix(p.sea, p.land, Math.pow(t, 1.5)));      // mar → terra
      }
    }
  }
  // tanques de sal em primeiro plano: grelha com muros claros
  const cols = 3 + (seed % 3), rows = 2 + (seed % 2);
  const top = horizon + Math.round((h - horizon) * 0.22);
  const cw = Math.floor(w / cols), ch = Math.floor((h - top) / rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fase = (r * cols + c + seed) % 4;
      const fill = fase === 0 ? p.salt : fase === 1 ? p.accent : fase === 2 ? p.land : mix(p.sea, p.salt, .5);
      const x0 = c * cw + 6, y0 = top + r * ch + 6;
      const x1 = Math.min(w - 1, (c + 1) * cw - 6), y1 = Math.min(h - 1, top + (r + 1) * ch - 6);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const edge = (x - x0 < 3 || x1 - x < 3 || y - y0 < 3 || y1 - y < 3);
        set(x, y, edge ? p.salt : mix(fill, p.salt, 0.12 + 0.3 * ((y - y0) / Math.max(1, y1 - y0))));
      }
    }
  }
  return px;
}

/* --------------------------------------------------------- conversão */
function emit(name, w, h, seed) {
  const png = path.join(OUT, name + ".png");
  writePng(png, w, h, draw(w, h, seed));
  try {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", png,
      "--out", path.join(OUT, name + ".jpg")], { stdio: "ignore" });
  } catch (e) { console.warn("  sips indisponível para " + name); }
  try {
    execFileSync("cwebp", ["-quiet", "-q", "72", png, "-o", path.join(OUT, name + ".webp")], { stdio: "ignore" });
  } catch (e) { console.warn("  cwebp indisponível para " + name); }
  fs.unlinkSync(png);
  console.log("  ✓ " + name + ".jpg / .webp");
}

const NOTICIAS = 8;
for (let i = 1; i <= NOTICIAS; i++) emit("noticia-0" + i, 1200, 750, i);
emit("praia-santana", 1000, 750, 2);
emit("praia-morro", 1000, 750, 5);
emit("praia-calheta", 1000, 750, 7);
["index","municipio","governacao","servicos","noticias","noticia","turismo","transparencia","contactos"]
  .forEach((slug, i) => emit("og-" + slug, 1200, 630, i + 1));

/* ícone iOS e retrato genérico ficam em formatos próprios */
const iconPng = path.join(OUT, "icon-180.png");
writePng(iconPng, 180, 180, draw(180, 180, 1));
console.log("  ✓ icon-180.png");

fs.writeFileSync(path.join(OUT, "pessoa-placeholder.svg"),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 120" width="96" height="120" role="img" aria-label="Fotografia por publicar">
  <rect width="96" height="120" fill="#EDF2F0"/>
  <circle cx="48" cy="44" r="19" fill="#DDE6E3"/>
  <path d="M14 120c0-20 15-32 34-32s34 12 34 32z" fill="#DDE6E3"/>
  <rect x="6" y="6" width="84" height="108" fill="none" stroke="#B9C9C5" stroke-width="2" stroke-dasharray="6 5"/>
</svg>\n`);
console.log("  ✓ pessoa-placeholder.svg");
