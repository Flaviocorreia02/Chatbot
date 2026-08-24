/* =========================================================================
   forms.js — validação e submissão de formulários
   Mensagens de erro dizem o que falhou e como corrigir; ligação ao campo
   via aria-describedby; foco no primeiro campo inválido.
   ========================================================================= */
(function () {
  "use strict";

  /* ===================== CONFIGURAÇÃO — SUBSTITUIR ====================== */
  const ENDPOINTS = {
    ocorrencia: "[[FORM_ENDPOINT_OCORRENCIAS]]",  // ex.: https://n8n.exemplo.cv/webhook/ocorrencias
    contacto:   "[[FORM_ENDPOINT_CONTACTO]]",
    newsletter: "[[FORM_ENDPOINT_NEWSLETTER]]"
  };
  const MAX_UPLOAD_MB = 5;
  /* ====================================================================== */

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const isEN = () => document.documentElement.lang === "en";

  const MSG = {
    required:  () => isEN() ? "Fill in this field to continue." : "Preencha este campo para continuar.",
    email:     () => isEN() ? "Enter a valid email, e.g. nome@exemplo.cv" : "Introduza um email válido, por exemplo nome@exemplo.cv",
    phone:     () => isEN() ? "Enter a phone number with at least 7 digits." : "Introduza um telefone com pelo menos 7 dígitos.",
    minlength: (n) => isEN() ? ("Write at least " + n + " characters so we can act on it.")
                             : ("Escreva pelo menos " + n + " caracteres para podermos actuar."),
    select:    () => isEN() ? "Choose one of the options." : "Escolha uma das opções.",
    checkbox:  () => isEN() ? "You must accept to submit the form." : "Tem de aceitar para submeter o formulário.",
    fileSize:  () => isEN() ? ("The photo must be under " + MAX_UPLOAD_MB + " MB. Choose a smaller file.")
                            : ("A fotografia tem de ter menos de " + MAX_UPLOAD_MB + " MB. Escolha um ficheiro mais pequeno."),
    fileType:  () => isEN() ? "Only JPG, PNG or WebP images are accepted." : "Só são aceites imagens JPG, PNG ou WebP.",
    sending:   () => isEN() ? "Submitting…" : "A submeter…",
    unconfigured: () => isEN()
      ? "This form is not connected yet. The council must set the endpoint in assets/js/forms.js."
      : "Este formulário ainda não está ligado. A Câmara deve definir o endereço de destino em assets/js/forms.js.",
    netError:  () => isEN()
      ? "The request was not submitted: the service did not respond. Try again in a few minutes."
      : "O pedido não foi submetido: o serviço não respondeu. Tente de novo dentro de alguns minutos."
  };

  /* ------------------------------------------------------- validação */
  function fieldOf(input) { return input.closest(".field") || input.closest(".checkbox") || input.parentElement; }

  function setError(input, message) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.add("is-invalid");
    let box = $(".error-msg", field);
    if (!box) {
      box = document.createElement("p");
      box.className = "error-msg";
      box.id = (input.id || "field") + "-error";
      field.appendChild(box);
    }
    box.textContent = message;
    input.setAttribute("aria-invalid", "true");
    const described = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    if (described.indexOf(box.id) === -1) described.push(box.id);
    input.setAttribute("aria-describedby", described.join(" "));
  }

  function clearError(input) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    const box = $(".error-msg", field);
    if (box) box.textContent = "";
  }

  function validateInput(input) {
    const value = (input.value || "").trim();
    const type = input.type;

    if (input.hasAttribute("required")) {
      if (type === "checkbox" && !input.checked) { setError(input, MSG.checkbox()); return false; }
      if (type !== "checkbox" && !value) {
        setError(input, input.tagName === "SELECT" ? MSG.select() : MSG.required());
        return false;
      }
    }
    if (value && type === "email" && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) { setError(input, MSG.email()); return false; }
    if (value && type === "tel" && value.replace(/\D/g, "").length < 7) { setError(input, MSG.phone()); return false; }
    const min = Number(input.getAttribute("minlength") || 0);
    if (value && min && value.length < min) { setError(input, MSG.minlength(min)); return false; }
    if (type === "file" && input.files && input.files[0]) {
      const f = input.files[0];
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setError(input, MSG.fileType()); return false; }
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { setError(input, MSG.fileSize()); return false; }
    }
    clearError(input);
    return true;
  }

  function validateForm(form) {
    const inputs = $$("input, select, textarea", form).filter(i => i.type !== "hidden" && !i.disabled);
    let firstBad = null;
    inputs.forEach(i => { if (!validateInput(i) && !firstBad) firstBad = i; });
    if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return !firstBad;
  }

  /* -------------------------------------------------------- submissão */
  function status(form, kind, text) {
    const box = $(".form__status", form);
    if (!box) return;
    box.hidden = false;
    box.className = "form__status form__status--" + kind;
    box.textContent = text;
    box.setAttribute("role", kind === "err" ? "alert" : "status");
  }

  async function submit(form, endpointKey, successText) {
    const endpoint = ENDPOINTS[endpointKey];
    const btn = $('button[type="submit"]', form);
    const payload = {};
    new FormData(form).forEach((v, k) => {
      if (v instanceof File) { if (v.name) payload[k] = { nome: v.name, tamanho: v.size, tipo: v.type }; }
      else payload[k] = v;
    });
    payload.formulario = endpointKey;
    payload.pagina = window.location.pathname;
    payload.idioma = document.documentElement.lang;
    payload.enviadoEm = new Date().toISOString();

    if (!endpoint || endpoint.indexOf("[[") === 0) {
      status(form, "err", MSG.unconfigured());
      if (window.console) console.info("[forms] payload que seria enviado:", payload);
      return;
    }

    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = MSG.sending(); }
    status(form, "pending", MSG.sending());

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      status(form, "ok", successText);
      if (window.CM) window.CM.toast(successText, "ok");
      form.reset();
    } catch (err) {
      status(form, "err", MSG.netError());
      if (window.CM) window.CM.toast(MSG.netError(), "err");
    } finally {
      clearTimeout(timer);
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; }
    }
  }

  /* ------------------------------------------------------------- init */
  function wire(form, key, success) {
    if (!form) return;
    form.setAttribute("novalidate", "novalidate");
    $$("input, select, textarea", form).forEach(input => {
      input.addEventListener("blur", () => { if (input.value || input.hasAttribute("required")) validateInput(input); });
      input.addEventListener("input", () => { if (fieldOf(input) && fieldOf(input).classList.contains("is-invalid")) validateInput(input); });
    });
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!validateForm(form)) {
        status(form, "err", isEN()
          ? "The form has fields to correct. Check the messages in red."
          : "O formulário tem campos por corrigir. Verifique as mensagens a vermelho.");
        return;
      }
      submit(form, key, success());
    });
  }

  function init() {
    wire($("#form-ocorrencia"), "ocorrencia", () => isEN()
      ? "Report submitted. You will receive the reference number by email within one working day."
      : "Ocorrência submetida. Receberá o número de registo por email no prazo de um dia útil.");

    wire($("#form-contacto"), "contacto", () => isEN()
      ? "Message sent. The council replies within three working days."
      : "Mensagem enviada. A Câmara responde no prazo de três dias úteis.");

    wire($("#form-newsletter"), "newsletter", () => isEN()
      ? "Subscribed. Confirm the subscription in the email we just sent you."
      : "Subscrição registada. Confirme a subscrição no email que acabámos de enviar.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.CMForms = { validateForm, validateInput };
})();
