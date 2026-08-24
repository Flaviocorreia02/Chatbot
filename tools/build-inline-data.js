/* =========================================================================
   build-inline-data.js — copia os ficheiros de data/*.json para um único
   data/inline-data.js. É esse ficheiro que permite abrir o sítio com duplo
   clique (file://), onde o `fetch` de ficheiros locais é bloqueado.
   Com servidor, o fetch ganha sempre; isto é apenas a rede de segurança.
   Uso: node tools/build-inline-data.js   (também corre dentro de build.sh)
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "data");
const FILES = {
  pt: "pt.json",
  en: "en.json",
  noticias: "noticias.json",
  documentos: "documentos.json",
  "search-index": "search-index.json"
};

const out = {};
for (const [key, file] of Object.entries(FILES)) {
  const full = path.join(DATA, file);
  if (!fs.existsSync(full)) { console.warn("  ! em falta: data/" + file); continue; }
  out[key] = JSON.parse(fs.readFileSync(full, "utf8"));
}

const banner = "/* GERADO POR tools/build-inline-data.js — NÃO EDITAR À MÃO.\n" +
  "   Espelho de data/*.json para funcionar em file://. Editar os JSON e\n" +
  "   correr: node tools/build-inline-data.js  */\n";

fs.writeFileSync(path.join(DATA, "inline-data.js"),
  banner + "window.__CM_DATA__ = " + JSON.stringify(out) + ";\n");

const kb = (fs.statSync(path.join(DATA, "inline-data.js")).size / 1024).toFixed(1);
console.log("  ✓ data/inline-data.js (" + kb + " KB, " + Object.keys(out).join(", ") + ")");
