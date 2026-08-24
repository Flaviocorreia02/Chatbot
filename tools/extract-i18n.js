/* =========================================================================
   extract-i18n.js — lê as páginas HTML, recolhe todas as chaves data-i18n,
   data-i18n-html e data-i18n-attr e escreve data/pt.json (origem de verdade
   em português). Serve de base para traduzir en.json e, no futuro, kea.json.
   Uso: node tools/extract-i18n.js
   ========================================================================= */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const PAGES = ["index", "municipio", "governacao", "servicos", "noticias", "noticia", "turismo", "transparencia", "contactos"]
  .map(s => s + ".html");

const dict = {};
const seen = {};

function tagBounds(html, attrPos) {
  const start = html.lastIndexOf("<", attrPos);
  const openEnd = html.indexOf(">", attrPos);
  const name = /^<([a-zA-Z0-9]+)/.exec(html.slice(start))[1];
  if (/\/>$/.test(html.slice(openEnd - 1, openEnd + 1))) return { name, inner: "" };
  let depth = 1, i = openEnd + 1;
  const openRe = new RegExp("<" + name + "[\\s>]", "gi");
  const closeRe = new RegExp("</" + name + "\\s*>", "gi");
  while (depth > 0 && i < html.length) {
    openRe.lastIndex = i; closeRe.lastIndex = i;
    const o = openRe.exec(html), c = closeRe.exec(html);
    if (!c) break;
    if (o && o.index < c.index) { depth++; i = o.index + 1; }
    else { depth--; i = c.index + c[0].length; if (depth === 0) return { name, inner: html.slice(openEnd + 1, c.index) }; }
  }
  return { name, inner: "" };
}

const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
  .replace(/&darr;/g, "↓").replace(/&uarr;/g, "↑").replace(/&larr;/g, "←").replace(/&rarr;/g, "→")
  .replace(/&times;/g, "×").replace(/&copy;/g, "©");

for (const file of PAGES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const html = fs.readFileSync(full, "utf8");

  // data-i18n → textContent
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) {
    const key = m[1];
    const { inner } = tagBounds(html, m.index);
    const text = decode(inner.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (dict[key] && dict[key] !== text) console.warn("  ! chave repetida com textos diferentes: " + key);
    dict[key] = text;
    seen[key] = (seen[key] || 0) + 1;
  }
  // data-i18n-html → innerHTML
  for (const m of html.matchAll(/data-i18n-html="([^"]+)"/g)) {
    const key = m[1];
    const { inner } = tagBounds(html, m.index);
    dict[key] = inner.replace(/\s+/g, " ").trim();
    seen[key] = (seen[key] || 0) + 1;
  }
  // data-i18n-attr → valor actual do atributo
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    const tagStart = html.lastIndexOf("<", m.index);
    const rest = html.slice(tagStart, html.indexOf(">", m.index) + 1);
    m[1].split(",").forEach(pair => {
      const [attr, key] = pair.split(":").map(s => s.trim());
      if (!key) return;
      const val = new RegExp(attr + '="([^"]*)"').exec(rest);
      if (val && !dict[key]) dict[key] = decode(val[1]);
      seen[key] = (seen[key] || 0) + 1;
    });
  }
}

const sorted = {};
Object.keys(dict).sort().forEach(k => { sorted[k] = dict[k]; });
fs.writeFileSync(path.join(ROOT, "data", "pt.json"), JSON.stringify(sorted, null, 2) + "\n");
console.log("  ✓ data/pt.json — " + Object.keys(sorted).length + " chaves");

// Relatório de chaves em falta no en.json, se existir
const enPath = path.join(ROOT, "data", "en.json");
if (fs.existsSync(enPath)) {
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const missing = Object.keys(sorted).filter(k => !(k in en));
  const extra = Object.keys(en).filter(k => !(k in sorted));
  console.log(missing.length ? "  ! en.json sem tradução para " + missing.length + " chave(s):\n    " + missing.join("\n    ")
                             : "  ✓ en.json cobre todas as chaves");
  if (extra.length) console.log("  ! en.json tem " + extra.length + " chave(s) que já não existem: " + extra.join(", "));
}
