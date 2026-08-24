/* =========================================================================
   chatbot.js — "Nha Câmara", assistente da Câmara Municipal do Maio
   Front-end do widget flutuante ligado a um webhook n8n.io.
   Sem dependências. Carregado com `defer`.
   ========================================================================= */
(function () {
  "use strict";

  /* ======================= CONFIGURAÇÃO — SUBSTITUIR ====================== */
  const N8N_WEBHOOK_URL = "https://flaviocorreia.app.n8n.cloud/webhook/5fa23035-1cd1-439a-a192-1e9f4dc053d5/chat"; // ← substituir pelo Production URL do n8n
  const FALLBACK_PHONE  = "+2385990736";                                // ← telefone do atendimento
  const REQUEST_TIMEOUT = 45000;   // 45 s sem qualquer sinal do servidor
  const MAX_HISTORY     = 50;                                              // mensagens guardadas

  /* Formato do pedido, conforme o nó que recebe no n8n:
     "webhook"     → nó Webhook (o fluxo entregue em n8n-workflow.json).
                     Envia { sessionId, message, lang, page, timestamp }.
     "chatTrigger" → nó Chat Trigger (URL do tipo /webhook/<uuid>/chat).
                     Envia { action:"sendMessage", sessionId, chatInput }.        */
  const PAYLOAD_FORMAT = "chatTrigger";
  /* ======================================================================== */

  const LS_SESSION = "cm-maio:chat-session";
  const LS_HISTORY = "cm-maio:chat-history";

  const T = {
    pt: {
      launcher: "Falar com a Câmara",
      name: "Nha Câmara",
      status: "Assistente municipal",
      disclaimer: "Assistente automático. Não indica valores de taxas nem prazos legais — para isso, confirme no atendimento.",
      welcome: "Bom dia. Sou a **Nha Câmara**, a assistente da Câmara Municipal do Maio.\n\nPosso ajudar com serviços, horários e documentos. Em que posso ser útil?",
      quick: [
        "Que documentos preciso para uma certidão?",
        "Horário de atendimento",
        "Como pago a água?",
        "Falar com um funcionário"
      ],
      placeholder: "Escreva a sua pergunta…",
      send: "Enviar mensagem",
      close: "Fechar conversa",
      clear: "Apagar conversa",
      cleared: "Conversa apagada.",
      typing: "Nha Câmara está a escrever",
      hint: "Enter envia · Shift+Enter muda de linha",
      errNet: "Não consegui chegar ao serviço. Tente de novo ou ligue " + FALLBACK_PHONE + ".",
      errTimeout: "O serviço demorou demasiado a responder. Tente de novo ou ligue " + FALLBACK_PHONE + ".",
      errEmpty: "Recebi uma resposta vazia do serviço. Tente reformular a pergunta.",
      errServer: "O serviço respondeu com um erro interno. Já foi avisado; entretanto ligue " + FALLBACK_PHONE + ".",
      errAgent: "A assistente não conseguiu concluir a resposta. Tente de novo ou ligue " + FALLBACK_PHONE + ".",
      errNotFound: "O endereço do serviço não foi encontrado. Ligue " + FALLBACK_PHONE + ".",
      retry: "Tentar de novo",
      unconfigured: "O assistente ainda não está ligado ao serviço. Configure o endereço do webhook n8n em assets/js/chatbot.js.",

      /* ---- encaminhamento para o Balcão do Munícipe ---- */
      hoIntro: "Com certeza. Para o encaminhar ao **Balcão do Munícipe**, preciso de quatro dados:",
      hoLegend: "Dados para o pedido de atendimento",
      hoName: "Nome completo",
      hoEmail: "Email",
      hoPhone: "Telefone",
      hoSubject: "Breve descrição do assunto",
      hoNamePh: "Ex.: João Silva",
      hoEmailPh: "nome@exemplo.cv",
      hoPhonePh: "+238 000 00 00",
      hoSubjectPh: "Em duas linhas, o que precisa de tratar",
      hoRequired: "obrigatório",
      hoPrivacy: "Estes dados seguem apenas para o Balcão do Munícipe, para lhe responderem. Não peça nem indique números de identificação ou dados bancários.",
      hoSubmit: "Enviar pedido",
      hoCancel: "Cancelar",
      hoErrName: "Indique o seu nome.",
      hoErrEmail: "Indique um email válido, com @ e domínio.",
      hoErrPhone: "Indique um telefone com pelo menos 7 dígitos.",
      hoErrSubject: "Descreva o assunto em pelo menos 10 caracteres.",
      hoTitle: "Pedido de atendimento",
      hoCancelled: "Pedido cancelado. Continuo à disposição para outras questões."
    },
    en: {
      launcher: "Ask the Council",
      name: "Nha Câmara",
      status: "Municipal assistant",
      disclaimer: "Automated assistant. It does not quote fees or legal deadlines — confirm those at the front desk.",
      welcome: "Good morning. I am **Nha Câmara**, the Maio Municipality Council assistant.\n\nI can help with services, opening hours and documents. How can I help?",
      quick: [
        "What documents do I need for a certificate?",
        "Opening hours",
        "How do I pay my water bill?",
        "Talk to a member of staff"
      ],
      placeholder: "Type your question…",
      send: "Send message",
      close: "Close conversation",
      clear: "Clear conversation",
      cleared: "Conversation cleared.",
      typing: "Nha Câmara is typing",
      hint: "Enter sends · Shift+Enter for a new line",
      errNet: "Couldn't reach the service. Try again or call " + FALLBACK_PHONE + ".",
      errTimeout: "The service took too long to answer. Try again or call " + FALLBACK_PHONE + ".",
      errEmpty: "The service returned an empty reply. Try rephrasing your question.",
      errServer: "The service replied with an internal error. It has been reported; in the meantime call " + FALLBACK_PHONE + ".",
      errAgent: "The assistant could not finish its answer. Try again or call " + FALLBACK_PHONE + ".",
      errNotFound: "The service address was not found. Please call " + FALLBACK_PHONE + ".",
      retry: "Try again",
      unconfigured: "The assistant is not connected to the service yet. Set the n8n webhook URL in assets/js/chatbot.js.",

      /* ---- handover to the Citizen Desk ---- */
      hoIntro: "Of course. To pass your request to the **Citizen Desk**, I need four details:",
      hoLegend: "Details for the handover request",
      hoName: "Full name",
      hoEmail: "Email",
      hoPhone: "Phone",
      hoSubject: "Brief description of your request",
      hoNamePh: "e.g. John Smith",
      hoEmailPh: "name@example.com",
      hoPhonePh: "+238 000 00 00",
      hoSubjectPh: "In two lines, what you need help with",
      hoRequired: "required",
      hoPrivacy: "These details go only to the Citizen Desk, so they can reply to you. Do not send identification numbers or bank details.",
      hoSubmit: "Send request",
      hoCancel: "Cancel",
      hoErrName: "Please enter your name.",
      hoErrEmail: "Please enter a valid email, with @ and a domain.",
      hoErrPhone: "Please enter a phone number with at least 7 digits.",
      hoErrSubject: "Please describe your request in at least 10 characters.",
      hoTitle: "Handover request",
      hoCancelled: "Request cancelled. I'm still here for anything else."
    }
  };
  /** Idioma activo do sítio, normalizado para os códigos suportados. */
  function langCode() {
    const l = (document.documentElement.lang || "pt").toLowerCase().slice(0, 2);
    return l === "en" ? "en" : "pt";
  }
  const t = () => T[langCode()];

  /* ------------------------------------------------------------ estado */
  let panel, log, quickHost, form, textarea, sendBtn, launcher, releaseTrap = null;
  let open = false, busy = false, lastUserMessage = null;
  let handoverForm = null;                 // cartão de recolha de dados, quando aberto

  function sessionId() {
    let id = null;
    try { id = localStorage.getItem(LS_SESSION); } catch (e) {}
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "sess-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(LS_SESSION, id); } catch (e) {}
    }
    return id;
  }

  function history() {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) || "[]"); }
    catch (e) { return []; }
  }
  function pushHistory(entry) {
    const h = history();
    h.push(entry);
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(-MAX_HISTORY))); } catch (e) {}
  }
  function clearHistory() { try { localStorage.removeItem(LS_HISTORY); } catch (e) {} }

  /* --------------------------------------------------- Markdown seguro
     Escapa tudo primeiro, converte um subconjunto de Markdown e volta a
     filtrar por lista branca. Nunca entra conteúdo bruto em innerHTML.     */
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function markdownToHtml(src) {
    const lines = escapeHtml(String(src).replace(/\r\n/g, "\n")).split("\n");
    const out = [];
    let listType = null, para = [];

    const inline = (s) => s
      .replace(/\[([^\]]{1,120})\]\((https?:\/\/[^\s)]{1,300}|mailto:[^\s)]{1,200}|tel:[^\s)]{1,60}|[a-z0-9._\-]{1,80}\.html[^\s)]{0,80})\)/gi,
        '<a href="$2" rel="noopener">$1</a>')
      .replace(/`([^`]{1,200})`/g, "<code>$1</code>")
      .replace(/\*\*([^*]{1,200})\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\n]{1,200})\*(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>")
      .replace(/(^|[\s(])(https?:\/\/[^\s<]{4,300})/g, '$1<a href="$2" rel="noopener">$2</a>');

    const flushPara = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
    const flushList = () => { if (listType) { out.push("</" + listType + ">"); listType = null; } };

    // Tabelas Markdown: o agente usa-as para horários e taxas.
    let tabela = [];
    const celulas = (linha) => linha.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    const flushTable = () => {
      if (!tabela.length) return;
      const linhas = tabela.filter(l => !/^[\s|:-]+$/.test(l));   // fora o separador |---|
      tabela = [];
      if (!linhas.length) return;
      const cab = celulas(linhas[0]);
      const corpo = linhas.slice(1).map(celulas);
      let html = '<table><thead><tr>' + cab.map(c => "<th>" + inline(c) + "</th>").join("") + "</tr></thead>";
      if (corpo.length) {
        html += "<tbody>" + corpo.map(r => "<tr>" + r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody>";
      }
      out.push(html + "</table>");
    };

    lines.forEach(raw => {
      const line = raw.trim();

      // Linha de tabela: começa e acaba em "|".
      if (/^\|.*\|$/.test(line)) { flushPara(); flushList(); tabela.push(line); return; }
      if (tabela.length) flushTable();

      // Títulos "### Assunto": o agente usa-os. Sem isto apareciam os cardinais.
      const h = line.match(/^#{1,6}\s+(.+)$/);
      if (h) { flushList(); flushPara(); out.push("<p><strong>" + inline(h[1]) + "</strong></p>"); return; }

      // Citação "> Observação: ...": mostra-se o conteúdo, sem o sinal de maior.
      // Atenção: o escape de HTML corre antes, por isso ">" já chega aqui como "&gt;".
      const cit = line.match(/^&gt;\s?(.*)$/);
      if (cit) {
        flushList();
        if (cit[1].trim()) para.push(cit[1].trim());
        else flushPara();
        return;
      }

      // Separador "---": ignora-se, não há regra horizontal na bolha.
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { flushList(); flushPara(); return; }

      const ul = line.match(/^[-*•]\s+(.*)$/);
      const ol = line.match(/^\d{1,2}[.)]\s+(.*)$/);
      if (ul || ol) {
        flushPara();
        const wanted = ul ? "ul" : "ol";
        if (listType !== wanted) { flushList(); out.push("<" + wanted + ">"); listType = wanted; }
        out.push("<li>" + inline((ul || ol)[1]) + "</li>");
        return;
      }
      flushList();
      if (!line) { flushPara(); return; }
      para.push(line);
    });
    flushTable(); flushList(); flushPara();
    return sanitize(out.join(""));
  }

  const ALLOWED_TAGS = ["P", "BR", "STRONG", "EM", "CODE", "UL", "OL", "LI", "A",
                        "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"];
  function sanitize(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    tpl.content.querySelectorAll("*").forEach(node => {
      if (ALLOWED_TAGS.indexOf(node.tagName) === -1) { node.replaceWith(...node.childNodes); return; }
      Array.from(node.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim();
        const safeHref = name === "href" &&
          /^(https?:\/\/|mailto:|tel:|[a-z0-9._\-]+\.html)/i.test(value) &&
          !/^javascript:/i.test(value);
        if (!safeHref && name !== "rel") node.removeAttribute(attr.name);
      });
      if (node.tagName === "A") {
        if (!node.getAttribute("href")) { node.replaceWith(...node.childNodes); return; }
        node.setAttribute("rel", "noopener noreferrer");
        if (/^https?:/i.test(node.getAttribute("href"))) node.setAttribute("target", "_blank");
      }
    });
    return tpl.innerHTML;
  }

  /* ----------------------------------------------------------- ícones */
  const ICONS = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>',
    salt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="8" height="6"/><rect x="13" y="5" width="8" height="6"/><rect x="3" y="13" width="8" height="6"/><rect x="13" y="13" width="8" height="6"/><path d="M6 8h2M16 16h2" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 8 6 8z"/></svg>'
  };

  /* ------------------------------------------------------- construção */
  function build() {
    const s = t();

    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "chat-launcher";
    launcher.id = "chat-launcher";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "chat-panel");
    launcher.innerHTML = ICONS.chat +
      '<span class="chat-launcher__label" data-chat-i18n="launcher">' + escapeHtml(s.launcher) + "</span>" +
      '<span class="chat-launcher__dot" aria-hidden="true"></span>';
    document.body.appendChild(launcher);

    panel = document.createElement("section");
    panel.className = "chat-panel";
    panel.id = "chat-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "chat-title");
    panel.innerHTML = '' +
      '<header class="chat-head">' +
        '<span class="chat-head__avatar" aria-hidden="true">' + ICONS.salt + "</span>" +
        "<span>" +
          '<span class="chat-head__name" id="chat-title" data-chat-i18n="name">' + escapeHtml(s.name) + "</span>" +
          '<span class="chat-head__status" data-chat-i18n="status">' + escapeHtml(s.status) + "</span>" +
        "</span>" +
        '<span class="chat-head__actions">' +
          '<button type="button" id="chat-clear" data-chat-i18n-attr="aria-label:clear" aria-label="' + escapeHtml(s.clear) + '">' + ICONS.trash + "</button>" +
          '<button type="button" id="chat-close" data-chat-i18n-attr="aria-label:close" aria-label="' + escapeHtml(s.close) + '">' + ICONS.close + "</button>" +
        "</span>" +
      "</header>" +
      '<p class="chat-disclaimer" data-chat-i18n="disclaimer">' + escapeHtml(s.disclaimer) + "</p>" +
      '<div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0" data-chat-i18n-attr="aria-label:name" aria-label="' + escapeHtml(s.name) + '"></div>' +
      '<div class="chat-quick" id="chat-quick"></div>' +
      '<form class="chat-form" id="chat-form" novalidate>' +
        '<label class="visually-hidden" for="chat-input" data-chat-i18n="placeholder">' + escapeHtml(s.placeholder) + "</label>" +
        '<textarea id="chat-input" rows="1" data-chat-i18n-attr="placeholder:placeholder" placeholder="' + escapeHtml(s.placeholder) + '" autocomplete="off"></textarea>' +
        '<button type="submit" class="chat-send" data-chat-i18n-attr="aria-label:send" aria-label="' + escapeHtml(s.send) + '">' + ICONS.send + "</button>" +
      "</form>" +
      '<p class="chat-foot" data-chat-i18n="hint">' + escapeHtml(s.hint) + "</p>";
    document.body.appendChild(panel);

    log = panel.querySelector("#chat-log");
    quickHost = panel.querySelector("#chat-quick");
    form = panel.querySelector("#chat-form");
    textarea = panel.querySelector("#chat-input");
    sendBtn = panel.querySelector(".chat-send");

    launcher.addEventListener("click", () => (open ? closePanel() : openPanel()));
    panel.querySelector("#chat-close").addEventListener("click", closePanel);
    panel.querySelector("#chat-clear").addEventListener("click", () => {
      clearHistory();
      handoverForm = null;              // o cartão vai com o resto do log
      log.innerHTML = "";
      renderWelcome();
      if (window.CM) window.CM.toast(t().cleared, "ok", 3000);
    });

    form.addEventListener("submit", e => {
      e.preventDefault();
      const value = textarea.value.trim();
      if (!value || busy) return;
      textarea.value = "";
      autoGrow();
      send(value);
    });
    textarea.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
    textarea.addEventListener("input", autoGrow);

    document.addEventListener("keydown", e => { if (e.key === "Escape" && open) closePanel(); });
    document.addEventListener("cm:langchange", relabel);

    restore();
  }

  function autoGrow() {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }

  function relabel() {
    const s = t();
    panel.querySelectorAll("[data-chat-i18n]").forEach(el => { el.textContent = s[el.dataset.chatI18n] || el.textContent; });
    launcher.querySelectorAll("[data-chat-i18n]").forEach(el => { el.textContent = s[el.dataset.chatI18n] || el.textContent; });
    panel.querySelectorAll("[data-chat-i18n-attr]").forEach(el => {
      const parts = el.dataset.chatI18nAttr.split(":");
      if (s[parts[1]]) el.setAttribute(parts[0], s[parts[1]]);
    });
    // A saudação não está no histórico: traduz-se em vez de ficar presa ao PT.
    const boasVindas = log.querySelector("[data-chat-welcome]");
    if (boasVindas) boasVindas.querySelector(".msg__bubble").innerHTML = markdownToHtml(s.welcome);
    log.querySelectorAll("[data-chat-ho-intro] .msg__bubble")
       .forEach(b => { b.innerHTML = markdownToHtml(s.hoIntro); });
    if (handoverForm) {
      const valores = {};
      HO_FIELDS.forEach(f => {
        const el = handoverForm.querySelector("#ho-" + f.key);
        if (el) valores[f.key] = el.value;
      });
      const activo = document.activeElement;
      const foco = (activo && handoverForm.contains(activo) && activo.name) || false;
      closeHandoverForm();
      renderHandoverForm(valores, foco);
    }
    renderQuick();
  }

  /* ------------------------------------------------------- mensagens */
  function timeLabel(iso) {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleTimeString(langCode() === "en" ? "en-GB" : "pt-PT",
      { hour: "2-digit", minute: "2-digit" });
  }

  function addMessage(role, text, opts) {
    const options = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "msg msg--" + role + (options.error ? " msg--error" : "");
    const bubble = document.createElement("div");
    bubble.className = "msg__bubble";
    if (role === "user") bubble.textContent = text;         // nunca interpretar Markdown do utilizador
    else bubble.innerHTML = markdownToHtml(text);
    const time = document.createElement("span");
    time.className = "msg__time";
    time.textContent = timeLabel(options.at);
    wrap.appendChild(bubble);
    wrap.appendChild(time);

    if (options.retry) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--ghost btn--sm";
      btn.textContent = t().retry;
      btn.addEventListener("click", () => {
        wrap.remove();
        if (lastUserMessage) send(lastUserMessage, { resend: true });
      });
      bubble.appendChild(btn);
    }
    log.appendChild(wrap);
    scrollToEnd();
    return wrap;
  }

  /* O rAF é necessário: quando a bolha acaba de entrar no log, a altura ainda
     não está calculada e o `scroll-behavior: smooth` fica a animar para um
     destino desactualizado — o cartão de dados aparecia fora do ecrã. */
  function scrollToEnd() {
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  }

  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg msg--bot";
    wrap.id = "chat-typing";
    wrap.innerHTML = '<div class="msg__bubble typing" role="status" aria-label="' + escapeHtml(t().typing) + '">' +
      "<span></span><span></span><span></span></div>";
    log.appendChild(wrap);
    scrollToEnd();
  }
  function hideTyping() { const el = log.querySelector("#chat-typing"); if (el) el.remove(); }

  function renderQuick() {
    const s = t();
    if (history().length > 1) { quickHost.innerHTML = ""; return; }
    quickHost.innerHTML = "";
    s.quick.forEach(q => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", () => send(q));
      quickHost.appendChild(b);
    });
  }

  function renderWelcome() {
    addMessage("bot", t().welcome).setAttribute("data-chat-welcome", "");
    renderQuick();
  }

  function restore() {
    const h = history();
    if (!h.length) { renderWelcome(); return; }
    h.forEach(m => {
      const el = addMessage(m.role, m.text, { at: m.at });
      if (m.ho) el.setAttribute("data-chat-ho-intro", "");
    });
    // O cartão não se guarda no histórico: se a conversa ficou no pedido de
    // dados, reaparece em vez de deixar a pergunta pendurada.
    if (h[h.length - 1].ho) renderHandoverForm(null, false);
    renderQuick();
  }

  /* ======================================================================
     Encaminhamento para o Balcão do Munícipe

     O fluxo n8n envia o email assim que apanha o pedido de atendimento
     humano. Se o pedido for só «quero falar com um funcionário», o email
     chega ao Balcão com «Nome: não indicado / Email: não indicado» e
     ninguém consegue responder. Por isso o widget intercepta a intenção
     antes da rede, recolhe os quatro dados num cartão validado e só depois
     manda ao n8n uma mensagem etiquetada, de onde a extracção sai completa.
     ====================================================================== */

  /* Espelha a condição do nó «Pediu atendimento humano?» do fluxo n8n:
     se aqui não apanhar, o n8n apanha na mesma e o email sai sem dados. */
  const RE_HANDOVER = /(falar|fala|conversar|contactar).{0,25}(funcion|pessoa|human|atendente|algu[eé]m|algen|t[ée]cnic|respons[áa]vel)|atendimento (humano|presencial)|(talk|speak|chat)\s+(to|with)\s+(a\s+|an\s+|the\s+)?(member of staff|staff|someone|somebody|human|person|agent|operator|real person|employee)|(human|live)\s+(agent|support|assistance|help|operator|being)|customer (service|support)|(papia|papi[áa]|fal[áa])\s+ku\s+(un\s+)?(algen|pessoa|funcionari)/i;

  /* Etiqueta que o fluxo n8n reconhece para encaminhar já com dados. */
  const HO_TAG = "[PEDIDO DE ATENDIMENTO HUMANO]";

  const HO_FIELDS = [
    { key: "name",    tag: "input",    type: "text",  autocomplete: "name",  lbl: "hoName",    ph: "hoNamePh",    err: "hoErrName",    wire: "Nome" },
    { key: "email",   tag: "input",    type: "email", autocomplete: "email", lbl: "hoEmail",   ph: "hoEmailPh",   err: "hoErrEmail",   wire: "Email" },
    { key: "phone",   tag: "input",    type: "tel",   autocomplete: "tel",   lbl: "hoPhone",   ph: "hoPhonePh",   err: "hoErrPhone",   wire: "Telefone" },
    { key: "subject", tag: "textarea", type: "text",  autocomplete: "off",   lbl: "hoSubject", ph: "hoSubjectPh", err: "hoErrSubject", wire: "Assunto" }
  ];

  const HO_VALID = {
    name:    v => v.length >= 2 && /[a-zA-ZÀ-ÿ]/.test(v),
    email:   v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v),
    // Só os dígitos contam: «+238 991 23 45» e «99 12 345» são ambos válidos.
    phone:   v => v.replace(/\D/g, "").length >= 7,
    subject: v => v.length >= 10
  };

  function handoverIntent(text) { return RE_HANDOVER.test(String(text || "")); }

  /** Cartão de recolha, dentro do log como se fosse uma bolha da assistente. */
  function renderHandoverForm(preencher, foco) {
    const s = t();
    if (handoverForm) { focusField(foco); return handoverForm; }
    const valores = preencher || {};

    const wrap = document.createElement("div");
    wrap.className = "msg msg--bot msg--ho";
    wrap.setAttribute("data-chat-handover", "");

    const campos = HO_FIELDS.map(f => {
      const id = "ho-" + f.key;
      const control = f.tag === "textarea"
        ? '<textarea id="' + id + '" name="' + f.key + '" rows="2" required aria-describedby="' + id + '-err" ' +
          'autocomplete="' + f.autocomplete + '" placeholder="' + escapeHtml(s[f.ph]) + '"></textarea>'
        : '<input id="' + id + '" name="' + f.key + '" type="' + f.type + '" required aria-describedby="' + id + '-err" ' +
          'autocomplete="' + f.autocomplete + '" placeholder="' + escapeHtml(s[f.ph]) + '">';
      return '<p class="ho-field">' +
               '<label for="' + id + '">' + escapeHtml(s[f.lbl]) +
                 ' <span class="ho-req">(' + escapeHtml(s.hoRequired) + ')</span></label>' +
               control +
               '<span class="ho-err" id="' + id + '-err" role="alert"></span>' +
             "</p>";
    }).join("");

    wrap.innerHTML =
      '<div class="msg__bubble">' +
        '<form class="ho-form" novalidate>' +
          '<fieldset>' +
            '<legend class="visually-hidden">' + escapeHtml(s.hoLegend) + "</legend>" +
            campos +
          "</fieldset>" +
          '<p class="ho-privacy">' + escapeHtml(s.hoPrivacy) + "</p>" +
          '<p class="ho-actions">' +
            '<button type="button" class="btn btn--ghost btn--sm" data-ho-cancel>' + escapeHtml(s.hoCancel) + "</button>" +
            '<button type="submit" class="btn btn--accent btn--sm" data-ho-send>' + escapeHtml(s.hoSubmit) + "</button>" +
          "</p>" +
        "</form>" +
      "</div>" +
      '<span class="msg__time">' + escapeHtml(timeLabel()) + "</span>";

    log.appendChild(wrap);
    handoverForm = wrap;

    HO_FIELDS.forEach(f => {
      const el = wrap.querySelector("#ho-" + f.key);
      if (valores[f.key]) el.value = valores[f.key];
      // O erro sai assim que o campo passa a estar certo: não fica a acusar
      // quem já corrigiu.
      el.addEventListener("input", () => {
        if (el.getAttribute("aria-invalid") === "true" && HO_VALID[f.key](el.value.trim())) {
          clearFieldError(wrap, f);
        }
      });
    });

    wrap.querySelector("[data-ho-cancel]").addEventListener("click", cancelHandover);
    wrap.querySelector(".ho-form").addEventListener("submit", e => {
      e.preventDefault();
      submitHandover();
    });

    focusField(foco);
    scrollToEnd();
    return wrap;
  }

  /** `foco` é a chave do campo a focar; `false` não mexe no foco.
     `preventScroll` impede que o browser role o log por sua conta e desfaça
     o `scrollToEnd` que se segue. */
  function focusField(foco) {
    if (!handoverForm || foco === false) return;
    const el = handoverForm.querySelector("#ho-" + (foco || "name"));
    if (el) el.focus({ preventScroll: true });
  }

  function clearFieldError(wrap, f) {
    const el = wrap.querySelector("#ho-" + f.key);
    el.setAttribute("aria-invalid", "false");
    el.closest(".ho-field").classList.remove("is-invalid");
    wrap.querySelector("#ho-" + f.key + "-err").textContent = "";
  }

  function closeHandoverForm() {
    if (!handoverForm) return;
    handoverForm.remove();
    handoverForm = null;
  }

  function cancelHandover() {
    closeHandoverForm();
    const s = t(), at = new Date().toISOString();
    addMessage("bot", s.hoCancelled, { at });
    pushHistory({ role: "bot", text: s.hoCancelled, at });
    textarea.focus();
  }

  function submitHandover() {
    if (!handoverForm || busy) return;
    const s = t(), wrap = handoverForm;
    const valores = {};
    let primeiroErro = null;

    HO_FIELDS.forEach(f => {
      const el = wrap.querySelector("#ho-" + f.key);
      const v = el.value.trim();
      valores[f.key] = v;
      if (HO_VALID[f.key](v)) { clearFieldError(wrap, f); return; }
      el.setAttribute("aria-invalid", "true");
      el.closest(".ho-field").classList.add("is-invalid");
      wrap.querySelector("#ho-" + f.key + "-err").textContent = s[f.err];
      if (!primeiroErro) primeiroErro = el;
    });

    if (primeiroErro) {
      primeiroErro.focus({ preventScroll: true });
      primeiroErro.scrollIntoView({ block: "nearest" });
      return;
    }

    // Um campo por linha, sempre: o assunto vem de um textarea e uma quebra
    // a meio partiria o bloco que o n8n lê linha a linha.
    const numaLinha = v => v.replace(/\s*\n+\s*/g, " ");

    // Rótulos fixos em português: são estes que o fluxo n8n lê, independente
    // do idioma em que o munícipe escreveu.
    const paraN8n = HO_TAG + "\n" +
      HO_FIELDS.map(f => f.wire + ": " + numaLinha(valores[f.key])).join("\n") +
      "\nPágina: " + window.location.pathname;

    // O que fica na conversa é a versão legível, no idioma do sítio.
    const naConversa = s.hoTitle + "\n" +
      HO_FIELDS.map(f => s[f.lbl] + ": " + numaLinha(valores[f.key])).join("\n");

    closeHandoverForm();
    send(paraN8n, { display: naConversa, handover: true });
  }

  /** Interceptação: mostra o cartão em vez de mandar o pedido cru ao n8n. */
  function offerHandover(message) {
    const s = t(), at = new Date().toISOString();
    addMessage("user", message, { at });
    pushHistory({ role: "user", text: message, at });
    quickHost.innerHTML = "";
    addMessage("bot", s.hoIntro, { at }).setAttribute("data-chat-ho-intro", "");
    pushHistory({ role: "bot", text: s.hoIntro, at, ho: true });
    renderHandoverForm();
  }

  /* ------------------------------------------------------------ rede */
  /* O agente n8n deriva para português quando a pergunta é em inglês — verificado:
     3 em 5 perguntas inequivocamente inglesas voltavam em português. Enquanto o prompt
     de sistema em produção não fixar o idioma, o sítio anexa a instrução ao texto
     enviado. Vai só no pedido: a bolha do munícipe e o histórico guardam a frase
     original, sem a nota. Medido com a nota: 6/6 em inglês, nunca visível na resposta. */
  const LANG_HINT = {
    en: "\n\n[System note: this visitor is using the English version of the site. Reply only in English.]",
    pt: "\n\n[Nota de sistema: este visitante está a usar a versão portuguesa do sítio. Responde apenas em português europeu.]"
  };

  function buildPayload(message, sid) {
    const comIdioma = message + (LANG_HINT[langCode()] || "");
    if (PAYLOAD_FORMAT === "chatTrigger") {
      // Formato esperado pelo nó Chat Trigger do n8n.
      // `lang` vai também ao primeiro nível: o Chat Trigger encaminha o corpo
      // inteiro, por isso o agente lê $json.lang sem depender de metadata.
      return {
        action: "sendMessage",
        sessionId: sid,
        chatInput: comIdioma,
        lang: langCode(),
        metadata: { lang: langCode(), page: window.location.pathname }
      };
    }
    return {
      sessionId: sid,
      message: comIdioma,
      lang: langCode(),
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Envia a mensagem e devolve o texto da resposta.
   * Suporta os dois modos de resposta do Chat Trigger do n8n:
   *   • "Streaming"  → NDJSON, uma linha por pedaço ({type:"item",content:"…"}).
   *                    Cada pedaço é entregue a `onChunk` para aparecer ao vivo.
   *   • "Last Node"  → um único objecto JSON com reply / output / text.
   * O tempo-limite é de INACTIVIDADE: enquanto chegarem pedaços, não expira.
   */
  async function sendToN8n(message, sid, onChunk) {
    const controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const rearmar = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    };

    try {
      let res;
      try {
        res = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(message, sid)),
          signal: controller.signal
        });
      } catch (netErr) {
        // Só chega aqui quando o pedido nem sequer completou:
        // sem rede, DNS falhado, CORS bloqueado ou pedido abortado.
        if (netErr && netErr.name === "AbortError") throw netErr;
        const e = new Error("Falha de rede ou CORS: " + netErr.message);
        e.kind = "network";
        throw e;
      }

      if (!res.ok) {
        // O serviço respondeu — mas com erro. O corpo costuma dizer porquê.
        let detalhe = "";
        try { detalhe = (await res.text()).slice(0, 300); } catch (e) {}
        const e = new Error("HTTP " + res.status + (detalhe ? " — " + detalhe : ""));
        e.kind = "http";
        e.status = res.status;
        throw e;
      }

      const podeLerStream = res.body && typeof res.body.getReader === "function" &&
                            typeof TextDecoder !== "undefined";

      let bruto = "", texto = "", houveStream = false, houveErro = false;

      if (podeLerStream) {
        const leitor = res.body.getReader();
        const desc = new TextDecoder();
        let buffer = "";

        const processarLinha = (linha) => {
          const l = linha.trim();
          if (!l) return;
          let o;
          try { o = JSON.parse(l); } catch (e) { return; }   // não é NDJSON: ignora
          if (!o || typeof o.type !== "string") return;
          houveStream = true;
          if (o.type === "item" && o.content) {
            texto += o.content;
            if (onChunk) onChunk(texto);
          } else if (o.type === "error") {
            houveErro = true;
          }
        };

        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          rearmar();                                   // há sinal de vida
          const pedaco = desc.decode(value, { stream: true });
          bruto += pedaco;
          buffer += pedaco;
          let nl;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            processarLinha(buffer.slice(0, nl));
            buffer = buffer.slice(nl + 1);
          }
        }
        processarLinha(buffer);                        // última linha sem \n
      } else {
        bruto = await res.text();
      }

      if (houveStream) {
        if (!texto && houveErro) {
          const e = new Error("O agente devolveu um erro durante o streaming");
          e.kind = "agent";
          throw e;
        }
        return texto;                                  // resposta parcial ainda serve
      }

      if (!bruto.trim()) return "";
      let data;
      try { data = JSON.parse(bruto); }
      catch (e) { return bruto; }        // n8n a devolver texto simples
      if (Array.isArray(data)) data = data[0] || {};
      return data.reply ?? data.output ?? data.text ?? data.message ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }

  async function send(message, opts) {
    const options = opts || {};
    const s = t();
    if (busy) return;

    // O pedido de atendimento humano não chega a ir à rede sem os dados: o
    // cartão aparece primeiro e é ele que volta a chamar `send`, já com tudo
    // preenchido e com `handover` a impedir uma segunda interceptação.
    if (!options.resend && !options.handover && handoverIntent(message)) {
      offerHandover(message);
      return;
    }

    busy = true;
    sendBtn.disabled = true;
    lastUserMessage = message;

    if (!options.resend) {
      const at = new Date().toISOString();
      // `display` separa o que o munícipe lê do bloco etiquetado que segue
      // para o n8n.
      const visivel = options.display || message;
      addMessage("user", visivel, { at });
      pushHistory({ role: "user", text: visivel, at });
    }
    quickHost.innerHTML = "";
    showTyping();

    if (N8N_WEBHOOK_URL.indexOf("[[YOUR_N8N]]") !== -1) {
      // Estado de demonstração: sem webhook configurado, diz-se exactamente porquê.
      setTimeout(() => {
        hideTyping();
        addMessage("bot", s.unconfigured, { error: true });
        busy = false; sendBtn.disabled = false;
      }, 700);
      return;
    }

    // Bolha que cresce ao vivo quando o n8n responde em streaming.
    let bolha = null, acumulado = "", frame = null, repetir = false;
    const onChunk = (textoAteAgora) => {
      acumulado = textoAteAgora;
      if (!bolha) {
        hideTyping();
        bolha = addMessage("bot", "", { at: new Date().toISOString() });
      }
      if (frame) return;                       // um render por frame, não por letra
      frame = requestAnimationFrame(() => {
        frame = null;
        bolha.querySelector(".msg__bubble").innerHTML = markdownToHtml(acumulado);
        scrollToEnd();
      });
    };

    try {
      const reply = await sendToN8n(message, sessionId(), onChunk);
      hideTyping();
      if (frame) { cancelAnimationFrame(frame); frame = null; }
      const final = String(reply || acumulado || "");

      if (!final.trim()) {
        if (bolha) bolha.remove();
        addMessage("bot", s.errEmpty, { error: true, retry: true });
      } else {
        const at = new Date().toISOString();
        if (bolha) {
          bolha.querySelector(".msg__bubble").innerHTML = markdownToHtml(final);
          scrollToEnd();
        } else {
          addMessage("bot", final, { at });
        }
        pushHistory({ role: "bot", text: final, at });
      }
    } catch (err) {
      hideTyping();
      if (frame) { cancelAnimationFrame(frame); frame = null; }

      // Se já chegou texto antes da falha, vale mais guardá-lo do que deitá-lo fora.
      if (bolha && acumulado.trim()) {
        const at = new Date().toISOString();
        bolha.querySelector(".msg__bubble").innerHTML = markdownToHtml(acumulado);
        pushHistory({ role: "bot", text: acumulado, at });
        if (window.console) console.warn("[Nha Câmara] resposta parcial:", err);
        busy = false; sendBtn.disabled = false; textarea.focus();
        return;
      }
      if (bolha) bolha.remove();
      // O erro exacto vai para a consola: é o que permite depurar sem adivinhar.
      if (window.console) console.error("[Nha Câmara] pedido falhou:", err);

      // O agente n8n falha de vez em quando logo no arranque, sem produzir texto
      // ({"type":"begin"} seguido de {"type":"error"}), e a repetição costuma
      // passar. Uma nova tentativa automática — silenciosa, uma só vez — evita
      // mostrar um erro por uma falha que se resolve sozinha.
      const transitorio = err && (err.kind === "agent" || err.kind === "network" ||
                                  (err.kind === "http" && err.status >= 500));
      if (transitorio && !options.tentativa) {
        if (window.console) console.warn("[Nha Câmara] falha transitória — a repetir uma vez");
        repetir = true;
        return;
      }

      let texto;
      if (err && (err.name === "AbortError" || String(err).indexOf("aborted") !== -1)) {
        texto = s.errTimeout;                                  // 30 s sem resposta
      } else if (err && err.kind === "agent") {
        texto = s.errAgent;                                     // o agente falhou a meio
      } else if (err && err.kind === "http") {
        if (err.status === 404) texto = s.errNotFound;          // URL errado ou fluxo inactivo
        else if (err.status >= 500) texto = s.errServer;        // o fluxo n8n rebentou
        else texto = s.errNet;                                  // 4xx: pedido recusado
      } else {
        texto = s.errNet;                                       // rede ou CORS
      }
      addMessage("bot", texto, { error: true, retry: true });
    } finally {
      busy = false;
      sendBtn.disabled = false;
      // `busy` já está livre: só agora a repetição não é recusada à entrada.
      if (repetir) setTimeout(() => send(message, { resend: true, tentativa: 1 }), 1200);
      else textarea.focus();
    }
  }

  /* --------------------------------------------------- abrir / fechar */
  function openPanel() {
    panel.hidden = false;
    open = true;
    launcher.setAttribute("aria-expanded", "true");
    if (window.matchMedia("(max-width: 599px)").matches && window.CM) {
      releaseTrap = window.CM.trapFocus(panel, closePanel);
      document.body.classList.add("no-scroll");
    }
    textarea.focus();
    scrollToEnd();
  }

  function closePanel() {
    panel.hidden = true;
    open = false;
    launcher.setAttribute("aria-expanded", "false");
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
    document.body.classList.remove("no-scroll");
    launcher.focus();
  }

  function init() {
    build();
    // Ligação a partir de qualquer botão da página: <button data-open-chat>
    document.querySelectorAll("[data-open-chat]").forEach(b => b.addEventListener("click", e => {
      e.preventDefault();
      if (!open) openPanel();
      // A pergunta pré-escrita segue o idioma activo: data-open-chat-en no HTML.
      const q = (langCode() === "en" && b.getAttribute("data-open-chat-en")) ||
                b.getAttribute("data-open-chat");
      if (q) send(q);
    }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.CMChat = {
    open: () => openPanel(),
    close: () => closePanel(),
    send: (m) => send(m),
    // Abre o cartão de dados directamente, para um botão «Falar com a Câmara».
    handover: () => { openPanel(); renderHandoverForm(); },
    markdownToHtml: markdownToHtml
  };
})();
