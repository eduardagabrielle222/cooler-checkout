/* =========================================================================
   Facebook Pixel (navegador) + ponte com a Conversions API (servidor).
   Eventos: PageView (load) · ViewContent (scroll) · AddToCart (abrir checkout)
   · InitiateCheckout (começa a preencher) · Purchase (pagamento confirmado).
   ========================================================================= */
(function () {
  'use strict';

  var PIXEL_ID = '892365253404482';
  var PRODUCT = {
    content_ids: ['cooler-trailmate-66l'],
    content_name: 'Caixa Cooler Térmico Trailmate 66L Igloo Cinza',
    content_type: 'product',
    value: 79.90,
    currency: 'BRL',
  };

  // ---- base do Pixel ----
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');

  function getCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : undefined;
  }
  function track(ev, custom, eventId) {
    if (!window.fbq) return;
    var data = Object.assign({}, PRODUCT, custom || {});
    if (eventId) window.fbq('track', ev, data, { eventID: eventId });
    else window.fbq('track', ev, data);
  }

  // ---- ViewContent quando o cliente rola a página (uma vez) ----
  var vcFired = false;
  function fireVC() { if (vcFired) return; vcFired = true; track('ViewContent'); window.removeEventListener('scroll', onScroll); }
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y > 180) fireVC();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(function () { fireVC(); }, 8000); // fallback se ninguém rolar

  // ---- AddToCart: abriu o checkout (Comprar agora / carrinho / chat) ----
  document.addEventListener('vy:addtocart', function () { track('AddToCart'); });

  // ---- InitiateCheckout: começou a preencher os dados (uma vez) ----
  var icFired = false;
  document.addEventListener('vy:initiatecheckout', function () {
    if (icFired) return; icFired = true; track('InitiateCheckout');
  });

  // ---- Purchase: disparado quando o PIX é GERADO (cliente na tela). ----
  // Pixel no navegador aqui; o CAPI do servidor sai de /api/checkout com o mesmo
  // event_id ('pur_'+id) → o Facebook deduplica e conta 1 Purchase.
  document.addEventListener('vy:purchase', function (e) {
    var id = (e.detail && e.detail.chargeId) || '';
    track('Purchase', { contents: [{ id: PRODUCT.content_ids[0], quantity: 1, item_price: PRODUCT.value }] }, 'pur_' + id);
  });

  // ---- Pago: registra "venda paga" na UTMify (backup do webhook). Sem Facebook (já disparou). ----
  document.addEventListener('vy:paid', function (e) {
    var id = (e.detail && e.detail.chargeId) || '';
    try {
      fetch('/api/track-purchase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ charge_id: id, event_source_url: location.href }),
      });
    } catch (_) {}
  });
})();
