/* =========================================================================
   i18n.js — Português (predefinido) · English · estrutura pronta para
   Kriolu de Cabo Verde (kea).
   Marcação: data-i18n="chave"              → substitui textContent
             data-i18n-html="chave"         → substitui innerHTML (sanitizado)
             data-i18n-attr="attr:chave,…"  → substitui atributos
   O PT vive no HTML: é a origem de verdade e o que fica visível sem JS.
   ========================================================================= */
(function () {
  "use strict";

  const SUPPORTED = ["pt", "en"];          // acrescentar "kea" quando data/kea.json existir
  const DEFAULT_LANG = "pt";
  const STORAGE_KEY = "cm-maio:lang";
  const dicts = {};
  let current = DEFAULT_LANG;

  /* Guarda o texto original em PT, para poder voltar atrás sem recarregar. */
  function snapshotPT() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      if (!el.dataset.ptText) el.dataset.ptText = el.textContent;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      if (!el.dataset.ptHtml) el.dataset.ptHtml = el.innerHTML;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(el => {
      if (el.dataset.ptAttrs) return;
      const store = {};
      el.dataset.i18nAttr.split(",").forEach(pair => {
        const attr = pair.split(":")[0].trim();
        store[attr] = el.getAttribute(attr) || "";
      });
      el.dataset.ptAttrs = JSON.stringify(store);
    });
  }

  /** Remove qualquer marcação perigosa de uma cadeia traduzida. */
  function sanitizeHtml(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const ALLOWED = ["B", "STRONG", "EM", "I", "BR", "SPAN", "A", "UL", "OL", "LI", "P", "ABBR"];
    tpl.content.querySelectorAll("*").forEach(node => {
      if (ALLOWED.indexOf(node.tagName) === -1) { node.replaceWith(...node.childNodes); return; }
      Array.from(node.attributes).forEach(a => {
        const ok = (a.name === "href" && /^(https?:|mailto:|tel:|[^:]*$)/i.test(a.value)) ||
                   a.name === "class" || a.name === "title" || a.name === "lang";
        if (!ok) node.removeAttribute(a.name);
      });
    });
    return tpl.innerHTML;
  }

  async function loadDict(lang) {
    if (lang === DEFAULT_LANG) return null;
    if (dicts[lang]) return dicts[lang];
    try {
      const res = await fetch("data/" + lang + ".json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      dicts[lang] = await res.json();
    } catch (err) {
      const inline = window.__CM_DATA__ && window.__CM_DATA__[lang];
      if (!inline) throw err;
      dicts[lang] = inline;   // fallback embutido: permite trocar de idioma em file://
    }
    return dicts[lang];
  }

  function applyPT() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      if (el.dataset.ptText != null) el.textContent = el.dataset.ptText;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      if (el.dataset.ptHtml != null) el.innerHTML = el.dataset.ptHtml;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(el => {
      if (!el.dataset.ptAttrs) return;
      const store = JSON.parse(el.dataset.ptAttrs);
      Object.keys(store).forEach(a => el.setAttribute(a, store[a]));
    });
  }

  function applyDict(dict) {
    let missing = 0;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const v = dict[el.dataset.i18n];
      if (v == null) { missing++; if (el.dataset.ptText != null) el.textContent = el.dataset.ptText; return; }
      el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      const v = dict[el.dataset.i18nHtml];
      if (v == null) { missing++; if (el.dataset.ptHtml != null) el.innerHTML = el.dataset.ptHtml; return; }
      el.innerHTML = sanitizeHtml(v);
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(el => {
      el.dataset.i18nAttr.split(",").forEach(pair => {
        const parts = pair.split(":");
        const attr = parts[0].trim(), key = (parts[1] || "").trim();
        const v = dict[key];
        if (v != null) el.setAttribute(attr, v);
      });
    });
    if (missing && window.console) console.info("[i18n] " + missing + " chave(s) sem tradução — mantido PT.");
  }

  function syncSwitcher() {
    document.querySelectorAll("[data-lang-btn]").forEach(btn => {
      btn.setAttribute("aria-pressed", String(btn.dataset.langBtn === current));
    });
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(() => {});
  }

  async function setLang(lang, options) {
    const opts = options || {};
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    try {
      if (lang === DEFAULT_LANG) { applyPT(); }
      else { applyDict(await loadDict(lang)); }
    } catch (err) {
      if (window.CM && !opts.silent) {
        window.CM.toast("Não foi possível carregar as traduções. Abra o site com um servidor local (npx serve).", "err");
      }
      return;
    }
    current = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    syncSwitcher();
    document.dispatchEvent(new CustomEvent("cm:langchange", { detail: { lang } }));
    if (!opts.silent && window.CM) {
      window.CM.toast(lang === "en" ? "Language set to English." : "Idioma definido: Português.", "ok", 3500);
    }
  }

  function init() {
    snapshotPT();
    document.querySelectorAll("[data-lang-btn]").forEach(btn => {
      btn.addEventListener("click", () => setLang(btn.dataset.langBtn));
    });
    // Prioridade: ?lang= no endereço (usado no hreflang) > escolha guardada
    let stored = null;
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    const wanted = SUPPORTED.indexOf(fromUrl) !== -1 ? fromUrl : stored;
    if (wanted && wanted !== DEFAULT_LANG) setLang(wanted, { silent: true });
    else { current = DEFAULT_LANG; document.documentElement.lang = "pt"; syncSwitcher(); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.CMi18n = { setLang, get lang() { return current; }, SUPPORTED };
})();
