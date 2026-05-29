/* =========================================================================
   Melhorias da página de vendas (fora do checkout). Roda no carregamento.
   ========================================================================= */
(function () {
  'use strict';

  var SHARE_TEXT = 'Veja essa oferta que eu encontrei com 80% de desconto apenas hoje:';

  var ICON = {
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    wpp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>'
  };

  function shareUrl() { try { return window.location.href; } catch (e) { return ''; } }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'vy-toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    setTimeout(function () { t.classList.remove('is-on'); setTimeout(function () { t.remove(); }, 250); }, 2200);
  }

  // ---- 1) "+5% OFF no Pix" -> "Apenas hoje DD/MM/AAAA" (data atual via script) ----
  function applyTodayBadge() {
    var headings = document.querySelectorAll('.elementor-heading-title, h2, h3');
    var hoje = new Date().toLocaleDateString('pt-BR'); // DD/MM/AAAA
    [].forEach.call(headings, function (h) {
      var txt = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (/OFF\s*no/i.test(txt) && /Pix/i.test(txt)) {
        h.classList.add('vy-today');
        h.innerHTML = '<span class="vy-today-pill">' +
          '<span class="vy-tp-lead">' + ICON.clock + '<span>Apenas hoje</span></span>' +
          '<b class="vy-tp-date">' + hoje + '</b>' +
        '</span>';
      }
    });
  }

  // ---- 2) Frete: caminhão ORIGINAL à esquerda + texto na frente, uma linha, elegante ----
  function applyFrete() {
    var row = document.querySelector('.elementor-element-37058456');
    if (!row) {
      // fallback: acha a linha pela <p> "Frete:"
      var p = [].filter.call(document.querySelectorAll('p'), function (x) {
        var t = (x.textContent || '').trim(); return /^Frete\s*:/i.test(t) && /gr[áa]tis/i.test(t);
      })[0];
      if (p) row = p.closest('.e-con.e-parent') || p.closest('.elementor-widget-container');
    }
    if (!row) return;
    row.innerHTML =
      '<div class="vy-frete2">' +
        '<img class="vy-frete2-ico" src="images/truck.png" alt="" decoding="async">' +
        '<span class="vy-frete2-txt">Frete <b>GRÁTIS</b> para todo o Brasil apenas hoje!</span>' +
      '</div>';
  }

  // ---- 5) Barra de avaliação + ações funcionais (substitui Rev.png) ----
  function applyRateBar() {
    var img = document.querySelector('img[src*="Rev-1024x61"]') || document.querySelector('img[src*="/Rev-"]') || document.querySelector('img[src$="Rev.png"]');
    if (!img) return;
    var box = img.closest('.elementor-widget-container') || img.parentElement;
    box.innerHTML =
      '<div class="vy-rate-bar">' +
        '<span class="vy-stars">★★★★★</span>' +
        '<span class="vy-score">4,8</span>' +
        '<span class="vy-sold">· 2,7 mil vendidos</span>' +
        '<span class="vy-actions">' +
          '<button type="button" class="vy-act vy-act-heart" aria-label="Favoritar">' + ICON.heart + '</button>' +
          '<button type="button" class="vy-act vy-act-share" aria-label="Compartilhar">' + ICON.share + '</button>' +
          '<button type="button" class="vy-act vy-wpp vy-act-wpp" aria-label="Compartilhar no WhatsApp">' + ICON.wpp + '</button>' +
        '</span>' +
      '</div>';
    wireActions(box);
  }

  function wireActions(scope) {
    var heart = scope.querySelector('.vy-act-heart');
    if (heart) heart.addEventListener('click', function () { heart.classList.toggle('is-fav'); });

    var share = scope.querySelector('.vy-act-share');
    if (share) share.addEventListener('click', function () {
      var url = shareUrl();
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast('🔗 Link copiado!'); }, function () { toast(url); });
      } else { toast(url); }
    });

    var wpp = scope.querySelector('.vy-act-wpp');
    if (wpp) wpp.addEventListener('click', function () {
      var msg = SHARE_TEXT + ' ' + shareUrl();
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  }

  // ---- 3) Resumo de avaliações 4,9/5 (substitui aval-nota.png) ----
  function applyReviewsSummary() {
    var img = document.querySelector('img[src*="aval-nota"]');
    if (!img) return;
    var box = img.closest('.elementor-widget-container') || img.parentElement;
    box.innerHTML =
      '<div class="vy-reviews-summary">' +
        '<div class="vy-rs-title">Avaliações do produto</div>' +
        '<div class="vy-rs-score"><span class="vy-stars">★★★★★</span> <b>4,9</b>/5 <span class="vy-rs-count">· 1,4 mil avaliações</span></div>' +
        '<div class="vy-rs-chips">' +
          '<span class="vy-chip">Chegou rápido (270)</span>' +
          '<span class="vy-chip">Produto de qualidade (490)</span>' +
          '<span class="vy-chip">Recomendam (99%)</span>' +
        '</div>' +
      '</div>';
  }

  // ---- Card do vendedor: troca a imagem de stats por HTML responsivo + suaviza a divisória ----
  function applySellerCard() {
    var av = document.querySelector('img[src*="aval-vend"]');
    if (av) {
      var box = av.closest('.elementor-widget-container') || av.parentElement;
      box.innerHTML =
        '<div class="vy-seller-stats">' +
          '<div class="vy-st"><span class="vy-st-top"><span class="vy-st-star">★</span> 4,9 <small>(90mil+)</small></span><span class="vy-st-lbl">Avaliações</span></div>' +
          '<div class="vy-st"><span class="vy-st-top">170mil+</span><span class="vy-st-lbl">Produtos vendidos</span></div>' +
          '<div class="vy-st"><span class="vy-st-top">Menos de 1h</span><span class="vy-st-lbl">Tempo de resposta</span></div>' +
        '</div>';
    }
    // tira o excesso de espaço dos títulos do vendedor
    [].forEach.call(document.querySelectorAll('.elementor-heading-title'), function (h) {
      var t = h.textContent || '';
      if (/^\s*Shopee Brasil\s*$/.test(t) || /Guaruj[áa]/.test(t)) h.textContent = t.trim();
    });
    // "linha seca" entre o resumo de avaliações e os comentários → some pra transição ficar suave
    var div = document.querySelector('.elementor-element-78a9dea1');
    if (div) div.style.display = 'none';
  }

  // ---- 4) Cronômetro real até a meia-noite ----
  function applyCountdown() {
    var wrap = document.querySelector('.elementor-countdown-wrapper');
    if (!wrap) return;
    wrap.classList.add('vy-countdown');
    wrap.innerHTML =
      '<div class="vy-cd-box"><div class="vy-cd-num" data-cd="h">00</div><div class="vy-cd-lbl">hrs</div></div>' +
      '<div class="vy-cd-box"><div class="vy-cd-num" data-cd="m">00</div><div class="vy-cd-lbl">min</div></div>' +
      '<div class="vy-cd-box"><div class="vy-cd-num" data-cd="s">00</div><div class="vy-cd-lbl">seg</div></div>';
    var h = wrap.querySelector('[data-cd="h"]'), m = wrap.querySelector('[data-cd="m"]'), s = wrap.querySelector('[data-cd="s"]');
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function tick() {
      var now = new Date();
      var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      var diff = Math.max(0, Math.floor((midnight - now) / 1000));
      h.textContent = pad(Math.floor(diff / 3600));
      m.textContent = pad(Math.floor((diff % 3600) / 60));
      s.textContent = pad(diff % 60);
    }
    tick();
    setInterval(tick, 1000);
  }

  function init() {
    try { applyTodayBadge(); } catch (e) {}
    try { applyFrete(); } catch (e) {}
    try { applyRateBar(); } catch (e) {}
    try { applyReviewsSummary(); } catch (e) {}
    try { applySellerCard(); } catch (e) {}
    try { applyCountdown(); } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
