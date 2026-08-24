/* =========================================================================
   main.js — Câmara Municipal do Maio
   Comportamento global: navegação, pesquisa, acessibilidade, revelações,
   listagens de notícias/documentos/eventos e feedback (toasts).
   Sem dependências. Carregado com `defer`.
   ========================================================================= */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------------------------------------------------------------- utils */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** Escapa texto para inserção segura em HTML. */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /**
   * Carrega um ficheiro JSON de /data. Tenta `fetch`; se falhar (protocolo
   * file:// bloqueia XHR local), recorre aos dados embutidos em
   * data/inline-data.js. Assim o site funciona com duplo clique e com servidor.
   */
  const dataCache = {};
  async function loadData(name) {
    if (dataCache[name]) return dataCache[name];
    try {
      const res = await fetch("data/" + name + ".json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      dataCache[name] = await res.json();
    } catch (err) {
      const inline = window.__CM_DATA__ && window.__CM_DATA__[name];
      if (!inline) throw err;
      dataCache[name] = inline;
    }
    return dataCache[name];
  }

  /** Formata uma data ISO no idioma activo. */
  function formatDate(iso, opts) {
    const lang = document.documentElement.lang || "pt";
    const locale = lang === "en" ? "en-GB" : "pt-PT";
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString(locale,
        opts || { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return iso; }
  }

  /* --------------------------------------------------------------- toasts */
  let toastHost = null;
  function toast(message, type, timeout) {
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "toasts";
      toastHost.setAttribute("role", "status");
      toastHost.setAttribute("aria-live", "polite");
      document.body.appendChild(toastHost);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    el.innerHTML = '<span>' + esc(message) + '</span>' +
      '<button type="button" aria-label="Fechar aviso">&times;</button>';
    $("button", el).addEventListener("click", () => el.remove());
    toastHost.appendChild(el);
    setTimeout(() => el.remove(), timeout || 6000);
  }

  /* --------------------------------------------------- armadilha de foco */
  function trapFocus(container, onEscape) {
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); onEscape(); return; }
      if (e.key !== "Tab") return;
      const items = $$(FOCUSABLE, container).filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener("keydown", onKey);
    return () => container.removeEventListener("keydown", onKey);
  }

  /* ------------------------------------------------------- menu off-canvas */
  function initOffcanvas() {
    const panelWrap = $("#offcanvas");
    const openBtn = $("#menu-open");
    if (!panelWrap || !openBtn) return;
    const closeBtn = $("#menu-close", panelWrap);
    const scrim = $(".offcanvas__scrim", panelWrap);
    let release = null, lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      panelWrap.hidden = false;
      document.body.classList.add("no-scroll");
      openBtn.setAttribute("aria-expanded", "true");
      release = trapFocus(panelWrap, close);
      (closeBtn || panelWrap).focus();
    }
    function close() {
      panelWrap.hidden = true;
      document.body.classList.remove("no-scroll");
      openBtn.setAttribute("aria-expanded", "false");
      if (release) { release(); release = null; }
      if (lastFocus) lastFocus.focus();
    }
    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (scrim) scrim.addEventListener("click", close);
    window.addEventListener("resize", () => { if (window.innerWidth >= 1024 && !panelWrap.hidden) close(); });
  }

  /* ------------------------------------------------------------ mega-menu */
  function initMega() {
    const triggers = $$(".mainnav__item--has-mega > .mainnav__link");
    if (!triggers.length) return;
    let openId = null;
    let hoverTimer = null;

    function closeAll(focusTrigger) {
      $$(".mega").forEach(m => { m.hidden = true; });
      triggers.forEach(t => t.setAttribute("aria-expanded", "false"));
      if (focusTrigger && openId) { const t = $('[aria-controls="' + openId + '"]'); if (t) t.focus(); }
      openId = null;
    }
    function openMega(trigger) {
      const id = trigger.getAttribute("aria-controls");
      const mega = document.getElementById(id);
      if (!mega) return;
      closeAll(false);
      mega.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      openId = id;
    }

    triggers.forEach(trigger => {
      const id = trigger.getAttribute("aria-controls");
      const mega = document.getElementById(id);
      trigger.addEventListener("click", e => {
        e.preventDefault();
        trigger.getAttribute("aria-expanded") === "true" ? closeAll(false) : openMega(trigger);
      });
      const item = trigger.parentElement;
      item.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimer);
        if (window.matchMedia("(hover: hover)").matches) openMega(trigger);
      });
      item.addEventListener("mouseleave", () => { hoverTimer = setTimeout(() => closeAll(false), 220); });
      if (mega) {
        mega.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
        mega.addEventListener("mouseleave", () => { hoverTimer = setTimeout(() => closeAll(false), 220); });
      }
    });

    document.addEventListener("keydown", e => { if (e.key === "Escape" && openId) closeAll(true); });
    document.addEventListener("click", e => {
      if (!openId) return;
      if (!e.target.closest(".mega") && !e.target.closest(".mainnav__item--has-mega")) closeAll(false);
    });
  }

  /* ------------------------------------------------------ alto contraste */
  function initContrast() {
    const btn = $("#contrast-toggle");
    const stored = localStorage.getItem("cm-maio:contrast");
    if (stored === "high") document.documentElement.setAttribute("data-contrast", "high");
    if (!btn) return;
    const sync = () => btn.setAttribute("aria-pressed",
      document.documentElement.getAttribute("data-contrast") === "high" ? "true" : "false");
    sync();
    btn.addEventListener("click", () => {
      const on = document.documentElement.getAttribute("data-contrast") === "high";
      if (on) { document.documentElement.removeAttribute("data-contrast"); localStorage.setItem("cm-maio:contrast", "normal"); }
      else { document.documentElement.setAttribute("data-contrast", "high"); localStorage.setItem("cm-maio:contrast", "high"); }
      sync();
    });
  }

  /* ---------------------------------------------------------- cabeçalho */
  function initStickyHeader() {
    const header = $(".site-header");
    if (!header) return;
    const sentinel = document.createElement("div");
    header.parentNode.insertBefore(sentinel, header);
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-stuck", !entry.isIntersecting);
    }, { rootMargin: "0px" }).observe(sentinel);
  }

  /* ---------------------------------------------------------- acordeões */
  function initAccordions() {
    $$(".accordion__btn").forEach(btn => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        panel.hidden = open;
      });
    });
  }

  /* -------------------------------------------------------- revelações */
  function initReveal() {
    const loadSeq = $$(".reveal-load");
    loadSeq.forEach(el => requestAnimationFrame(() => el.classList.add("is-ready")));

    const targets = $$(".reveal");
    if (!targets.length) return;
    if (prefersReduced() || !("IntersectionObserver" in window)) {
      targets.forEach(t => t.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(t => io.observe(t));
  }

  /* ------------------------------------------------------- ano dinâmico */
  function initYear() { $$("[data-year]").forEach(el => { el.textContent = String(new Date().getFullYear()); }); }

  /* ------------------------------------------- horário: destaca hoje */
  function initHours() {
    const rows = $$(".hours [data-weekday]");
    if (!rows.length) return;
    const today = new Date().getDay(); // 0 = domingo
    rows.forEach(row => {
      const days = row.getAttribute("data-weekday").split(",").map(Number);
      if (days.indexOf(today) !== -1) row.classList.add("is-now");
    });
  }

  /* ============================ LISTAGEM DE NOTÍCIAS ==================== */
  function newsCard(item, lang) {
    const t = item[lang] || item.pt;
    const tagClass = { municipio: "tag--mar", obras: "tag--areia", cultura: "tag--sal", ambiente: "" }[item.categoria] || "";
    return '' +
      '<article class="card card--link reveal">' +
        '<div class="card__media">' +
          '<picture>' +
            '<source type="image/webp" srcset="' + esc(item.imagem) + '.webp">' +
            '<img src="' + esc(item.imagem) + '.jpg" alt="' + esc(t.alt) + '" width="1200" height="750" loading="lazy" decoding="async">' +
          '</picture>' +
        '</div>' +
        '<div class="card__body">' +
          '<span class="tag ' + tagClass + '">' + esc(t.categoria) + '</span>' +
          '<h3 class="card__title"><a href="noticia.html?id=' + encodeURIComponent(item.id) + '">' + esc(t.titulo) + '</a></h3>' +
          '<p class="card__excerpt">' + esc(t.resumo) + '</p>' +
          '<p class="card__foot"><time datetime="' + esc(item.data) + '">' + formatDate(item.data) + '</time><span>' + esc(item.local) + '</span></p>' +
        '</div>' +
      '</article>';
  }

  async function initNewsList() {
    const host = $("#news-list");
    if (!host) return;
    const lang = document.documentElement.lang || "pt";
    const status = $("#news-status");
    const searchInput = $("#news-search");
    const chips = $$("#news-filters .chip");
    const pager = $("#news-pagination");
    const PER_PAGE = 6;
    let all = [], filtered = [], page = 1, categoria = "todas", query = "";

    try { all = await loadData("noticias"); }
    catch (e) {
      host.innerHTML = '<div class="empty"><p>Não foi possível carregar as notícias. Abra o site através de um servidor local (<code>npx serve</code>).</p></div>';
      return;
    }
    all.sort((a, b) => (a.data < b.data ? 1 : -1));

    function apply() {
      const q = query.trim().toLowerCase();
      filtered = all.filter(item => {
        if (categoria !== "todas" && item.categoria !== categoria) return false;
        if (!q) return true;
        const t = item[lang] || item.pt;
        // procura no título, resumo, local e também no corpo do artigo
        const corpo = (t.corpo || []).map(b => b.texto || (b.itens || []).join(" ")).join(" ");
        return (t.titulo + " " + t.resumo + " " + item.local + " " + corpo).toLowerCase().indexOf(q) !== -1;
      });
      page = 1;
      render();
    }

    function render() {
      const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
      if (page > totalPages) page = totalPages;
      const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

      if (!slice.length) {
        host.innerHTML = '<div class="empty">' +
          '<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="9" width="34" height="30" rx="2"/><path d="M13 17h14M13 24h22M13 31h18"/></svg>' +
          '<h3>' + (lang === "en" ? "No news in this category yet." : "Ainda não há notícias nesta categoria.") + '</h3>' +
          '<p>' + (lang === "en" ? "Try another category or clear the search." : "Experimente outra categoria ou limpe a pesquisa.") + '</p>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="news-reset">' + (lang === "en" ? "Show all news" : "Ver todas as notícias") + '</button>' +
          '</div>';
        const reset = $("#news-reset");
        if (reset) reset.addEventListener("click", () => {
          categoria = "todas"; query = "";
          if (searchInput) searchInput.value = "";
          chips.forEach(c => c.setAttribute("aria-pressed", String(c.dataset.categoria === "todas")));
          apply();
        });
      } else {
        host.innerHTML = slice.map(item => newsCard(item, lang)).join("");
        initReveal();
      }

      if (status) {
        status.textContent = lang === "en"
          ? filtered.length + " article(s) found."
          : filtered.length + " notícia(s) encontrada(s).";
      }
      renderPager(totalPages);
    }

    function renderPager(totalPages) {
      if (!pager) return;
      if (totalPages <= 1) { pager.innerHTML = ""; return; }
      let html = '<button type="button" data-page="' + (page - 1) + '"' + (page === 1 ? " disabled" : "") + '>&larr;</button>';
      for (let i = 1; i <= totalPages; i++) {
        html += '<button type="button" data-page="' + i + '"' + (i === page ? ' aria-current="page"' : "") + '>' + i + "</button>";
      }
      html += '<button type="button" data-page="' + (page + 1) + '"' + (page === totalPages ? " disabled" : "") + '>&rarr;</button>';
      pager.innerHTML = html;
      $$("button[data-page]", pager).forEach(b => b.addEventListener("click", () => {
        page = Number(b.dataset.page); render();
        host.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
      }));
    }

    chips.forEach(chip => chip.addEventListener("click", () => {
      chips.forEach(c => c.setAttribute("aria-pressed", "false"));
      chip.setAttribute("aria-pressed", "true");
      categoria = chip.dataset.categoria;
      apply();
    }));
    if (searchInput) {
      let deb;
      searchInput.addEventListener("input", () => {
        clearTimeout(deb);
        deb = setTimeout(() => { query = searchInput.value; apply(); }, 180);
      });
    }
    apply();
  }

  /* =============================== DESTAQUES =========================== */
  async function initNewsHighlights() {
    const host = $("#news-highlights");
    if (!host) return;
    const lang = document.documentElement.lang || "pt";
    try {
      const all = await loadData("noticias");
      all.sort((a, b) => (a.data < b.data ? 1 : -1));
      host.innerHTML = all.slice(0, 3).map(item => newsCard(item, lang)).join("");
      initReveal();
    } catch (e) {
      host.innerHTML = '<p class="text-soft">Notícias indisponíveis sem servidor local. Consulte o README.</p>';
    }
  }

  /* ============================ ARTIGO INDIVIDUAL ====================== */
  async function initArticle() {
    const host = $("#article-host");
    if (!host) return;
    const lang = document.documentElement.lang || "pt";
    const id = new URLSearchParams(window.location.search).get("id");
    let all;
    try { all = await loadData("noticias"); }
    catch (e) {
      host.innerHTML = '<div class="empty"><p>Não foi possível carregar o artigo. Abra o site através de um servidor local (<code>npx serve</code>).</p><a class="btn btn--ghost btn--sm" href="noticias.html">Voltar às notícias</a></div>';
      return;
    }
    const item = all.filter(n => n.id === id)[0] || all[0];
    if (!item) return;
    const t = item[lang] || item.pt;

    document.title = t.titulo + " — Câmara Municipal do Maio";
    const metaDesc = $('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t.resumo);
    const crumb = $("#crumb-current");
    if (crumb) crumb.textContent = t.titulo;

    host.innerHTML = '' +
      '<header class="stack">' +
        '<span class="tag">' + esc(t.categoria) + '</span>' +
        '<h1>' + esc(t.titulo) + '</h1>' +
        '<p class="lede">' + esc(t.resumo) + '</p>' +
        '<p class="article-meta">' +
          '<time datetime="' + esc(item.data) + '">' + formatDate(item.data) + '</time>' +
          '<span>' + esc(item.local) + '</span>' +
          '<span>' + esc(item.autor) + '</span>' +
        '</p>' +
      '</header>' +
      '<figure>' +
        '<picture>' +
          '<source type="image/webp" srcset="' + esc(item.imagem) + '.webp">' +
          '<img src="' + esc(item.imagem) + '.jpg" alt="' + esc(t.alt) + '" width="1200" height="750" fetchpriority="high" decoding="async">' +
        '</picture>' +
        '<figcaption>' + esc(t.alt) + '</figcaption>' +
      '</figure>' +
      '<div class="article-body">' + t.corpo.map(p =>
          p.tipo === "h2" ? "<h2>" + esc(p.texto) + "</h2>" :
          p.tipo === "citacao" ? "<blockquote>" + esc(p.texto) + "</blockquote>" :
          p.tipo === "lista" ? "<ul>" + p.itens.map(i => "<li>" + esc(i) + "</li>").join("") + "</ul>" :
          "<p>" + esc(p.texto) + "</p>"
        ).join("") + "</div>";

    // JSON-LD NewsArticle injectado dinamicamente
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "NewsArticle",
      headline: t.titulo, description: t.resumo, datePublished: item.data,
      dateModified: item.data, inLanguage: lang,
      author: { "@type": "Organization", name: "Câmara Municipal do Maio" },
      publisher: { "@type": "GovernmentOrganization", name: "Câmara Municipal do Maio" },
      articleSection: t.categoria
    });
    document.head.appendChild(ld);

    // Relacionadas
    const rel = $("#article-related");
    if (rel) {
      const others = all.filter(n => n.id !== item.id).slice(0, 2);
      rel.innerHTML = others.map(n => newsCard(n, lang)).join("");
      initReveal();
    }
  }

  /* ============================== DOCUMENTOS =========================== */
  async function initDocs() {
    const body = $("#docs-body");
    if (!body) return;
    const lang = document.documentElement.lang || "pt";
    const selTipo = $("#docs-tipo"), selAno = $("#docs-ano"), input = $("#docs-search");
    const status = $("#docs-status"), emptyHost = $("#docs-empty");
    let all = [];

    try { all = await loadData("documentos"); }
    catch (e) {
      body.innerHTML = '<tr><td colspan="5">Não foi possível carregar os documentos. Abra o site através de um servidor local (<code>npx serve</code>).</td></tr>';
      return;
    }

    if (selAno) {
      const anos = Array.from(new Set(all.map(d => d.ano))).sort().reverse();
      anos.forEach(a => { const o = document.createElement("option"); o.value = a; o.textContent = a; selAno.appendChild(o); });
    }

    function render() {
      const tipo = selTipo ? selTipo.value : "todos";
      const ano = selAno ? selAno.value : "todos";
      const q = input ? input.value.trim().toLowerCase() : "";
      const rows = all.filter(d => {
        if (tipo !== "todos" && d.tipo !== tipo) return false;
        if (ano !== "todos" && String(d.ano) !== ano) return false;
        if (q && (d[lang] || d.pt).titulo.toLowerCase().indexOf(q) === -1) return false;
        return true;
      }).sort((a, b) => (a.ano === b.ano ? (a.data < b.data ? 1 : -1) : b.ano - a.ano));

      body.innerHTML = rows.map(d => {
        const t = d[lang] || d.pt;
        return '<tr>' +
          '<td data-label="Documento"><a href="' + esc(d.ficheiro) + '">' + esc(t.titulo) + '</a></td>' +
          '<td data-label="Tipo">' + esc(t.tipo) + '</td>' +
          '<td data-label="Ano" class="num">' + esc(d.ano) + '</td>' +
          '<td data-label="Publicado" class="num"><time datetime="' + esc(d.data) + '">' + formatDate(d.data, { day: "2-digit", month: "2-digit", year: "numeric" }) + '</time></td>' +
          '<td data-label="Ficheiro" class="num">' + esc(d.formato) + " · " + esc(d.tamanho) + '</td>' +
        '</tr>';
      }).join("");

      if (emptyHost) {
        emptyHost.hidden = rows.length > 0;
        if (!rows.length) {
          emptyHost.innerHTML = '<div class="empty">' +
            '<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6h16l8 8v28H12z"/><path d="M28 6v9h8"/><path d="M18 26h12M18 33h9"/></svg>' +
            '<h3>' + (lang === "en" ? "No documents in this category yet." : "Ainda não há documentos nesta categoria.") + '</h3>' +
            '<p>' + (lang === "en" ? "Try another year or another document type." : "Experimente outro ano ou outro tipo de documento.") + '</p>' +
            '<button type="button" class="btn btn--ghost btn--sm" id="docs-reset">' + (lang === "en" ? "Clear filters" : "Limpar filtros") + '</button>' +
            '</div>';
          const r = $("#docs-reset");
          if (r) r.addEventListener("click", () => {
            if (selTipo) selTipo.value = "todos";
            if (selAno) selAno.value = "todos";
            if (input) input.value = "";
            render();
          });
        }
      }
      if (status) status.textContent = lang === "en"
        ? rows.length + " document(s) listed."
        : rows.length + " documento(s) listado(s).";
    }

    [selTipo, selAno].forEach(el => el && el.addEventListener("change", render));
    if (input) { let d; input.addEventListener("input", () => { clearTimeout(d); d = setTimeout(render, 180); }); }
    render();
  }

  /* ================================ EVENTOS ============================ */
  async function initEvents() {
    const host = $("#calendar");
    if (!host) return;
    const lang = document.documentElement.lang || "pt";
    let events;
    try { events = (await loadData("noticias")).filter(n => n.evento); }
    catch (e) { host.innerHTML = ""; return; }
    // Fonte dedicada de eventos vive no próprio ficheiro de notícias (campo `evento`).
    if (!events.length) return;
    const months = lang === "en"
      ? ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
      : ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
    host.innerHTML = events.map(ev => {
      const t = ev[lang] || ev.pt;
      const d = new Date(ev.evento.data + "T00:00:00");
      return '<article class="event">' +
        '<p class="event__date"><span class="event__day">' + d.getDate() + '</span>' +
        '<span class="event__month">' + months[d.getMonth()] + '</span></p>' +
        '<div><h3 class="event__title">' + esc(t.evento_titulo || t.titulo) + '</h3>' +
        '<p class="event__meta"><span>' + esc(ev.evento.hora) + '</span><span>' + esc(ev.evento.local) + '</span></p></div>' +
      '</article>';
    }).join("");
  }

  /* ================================= INIT ============================== */
  function init() {
    initOffcanvas();
    initMega();
    initContrast();
    initStickyHeader();
    initAccordions();
    initReveal();
    initYear();
    initHours();
    initNewsHighlights();
    initNewsList();
    initArticle();
    initDocs();
    initEvents();

    // Ao mudar de idioma (i18n.js), reconstrói o conteúdo gerado por JS.
    document.addEventListener("cm:langchange", () => {
      initNewsHighlights(); initNewsList(); initArticle(); initDocs(); initEvents();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* Exposto para os restantes módulos (i18n, forms, chatbot, search). */
  window.CM = { $, $$, esc, toast, trapFocus, loadData, formatDate, prefersReduced, FOCUSABLE };
})();
