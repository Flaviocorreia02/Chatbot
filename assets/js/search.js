/* =========================================================================
   search.js — pesquisa do lado do cliente sobre data/search-index.json
   Abre com o botão de pesquisa, com "/" ou com Ctrl/Cmd+K. Navegação por
   teclado (setas, Enter, Esc) e resultados anunciados por aria-live.
   ========================================================================= */
(function () {
  "use strict";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));

  let overlay, input, results, counter, openBtn, release = null, lastFocus = null;
  let index = null, activeIndex = -1;

  /* Normaliza para pesquisa: minúsculas e sem acentos. */
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  async function ensureIndex() {
    if (index) return index;
    try {
      index = await window.CM.loadData("search-index");
    } catch (e) {
      index = [];
    }
    return index;
  }

  function score(entry, terms, lang) {
    const t = entry[lang] || entry.pt;
    const hayTitle = norm(t.titulo);
    const hayBody = norm(t.resumo + " " + (t.palavras || []).join(" "));
    let total = 0;
    for (const term of terms) {
      if (!term) continue;
      let s = 0;
      if (hayTitle.indexOf(term) === 0) s += 12;
      else if (hayTitle.indexOf(term) !== -1) s += 8;
      if (hayBody.indexOf(term) !== -1) s += 3;
      if (!s) return 0;              // todos os termos têm de aparecer
      total += s;
    }
    return total;
  }

  function render(query) {
    const lang = document.documentElement.lang === "en" ? "en" : "pt";
    const terms = norm(query).split(/\s+/).filter(Boolean);
    activeIndex = -1;

    if (!terms.length) {
      results.innerHTML = "";
      counter.textContent = "";
      return;
    }
    const hits = (index || [])
      .map(entry => ({ entry: entry, s: score(entry, terms, lang) }))
      .filter(h => h.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8);

    if (!hits.length) {
      results.innerHTML = '<li class="empty" style="border:0">' +
        "<p>" + (lang === "en"
          ? "No page matches “" + window.CM.esc(query) + "”. Try “certidão”, “taxas”, “praia” or “orçamento”."
          : "Nenhuma página corresponde a “" + window.CM.esc(query) + "”. Experimente “certidão”, “taxas”, “praia” ou “orçamento”.") +
        "</p></li>";
      counter.textContent = lang === "en" ? "No results." : "Sem resultados.";
      return;
    }

    results.innerHTML = hits.map((h, i) => {
      const t = h.entry[lang] || h.entry.pt;
      return '<li><a href="' + window.CM.esc(h.entry.url) + '" data-idx="' + i + '">' +
        '<span class="search-results__meta">' + window.CM.esc(t.seccao) + "</span>" +
        '<span class="search-results__title">' + window.CM.esc(t.titulo) + "</span>" +
        '<span class="search-results__snippet">' + window.CM.esc(t.resumo) + "</span>" +
      "</a></li>";
    }).join("");
    counter.textContent = (lang === "en" ? hits.length + " result(s)." : hits.length + " resultado(s).");
  }

  function move(delta) {
    const links = $$("a[data-idx]", results);
    if (!links.length) return;
    activeIndex = (activeIndex + delta + links.length) % links.length;
    links[activeIndex].focus();
  }

  async function open() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("no-scroll");
    if (openBtn) openBtn.setAttribute("aria-expanded", "true");
    release = window.CM.trapFocus(overlay, close);
    input.focus();
    input.select();
    await ensureIndex();
    if (!index.length) {
      counter.textContent = "Índice indisponível sem servidor local (npx serve).";
    } else if (input.value) render(input.value);
  }

  function close() {
    overlay.hidden = true;
    document.body.classList.remove("no-scroll");
    if (openBtn) openBtn.setAttribute("aria-expanded", "false");
    if (release) { release(); release = null; }
    if (lastFocus) lastFocus.focus();
  }

  function init() {
    overlay = $("#search-overlay");
    if (!overlay) return;
    input = $("#search-input", overlay);
    results = $("#search-results", overlay);
    counter = $("#search-count", overlay);
    openBtn = $("#search-open");

    if (openBtn) openBtn.addEventListener("click", open);
    $$("[data-open-search]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); open(); }));
    const closeBtn = $("#search-close", overlay);
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

    let deb;
    input.addEventListener("input", () => { clearTimeout(deb); deb = setTimeout(() => render(input.value), 140); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      if (e.key === "Enter") {
        const first = $("a[data-idx]", results);
        if (first) { e.preventDefault(); window.location.href = first.getAttribute("href"); }
      }
    });
    results.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    });

    document.addEventListener("keydown", e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); overlay.hidden ? open() : close(); }
      else if (e.key === "/" && !typing && overlay.hidden) { e.preventDefault(); open(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
