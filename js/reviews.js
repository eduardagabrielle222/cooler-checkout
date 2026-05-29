/* =========================================================================
   Avaliações do produto — transforma TODOS os cards (com ou sem foto) em
   cards limpos e elegantes, preservando a foto do cliente quando existir,
   com datas dinâmicas (hoje/ontem) e selo de compra verificada.
   ========================================================================= */
(function () {
  'use strict';

  var DATE_RE = /\d{2}-\d{2}-\d{2}/;
  var IMG_RE = /\.(jpe?g|png|webp|gif)(\?|$)/i;
  var TIMES = ['14:42', '09:18', '19:04', '11:27', '16:53', '08:40', '21:12', '10:35', '13:07', '17:48'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function relDate(i) { return (i % 2 === 0 ? 'Hoje' : 'Ontem') + ', ' + TIMES[i % TIMES.length]; }
  function initials(name) {
    var p = name.trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '★';
    return ((p[0][0] || '') + (p.length > 1 ? (p[p.length - 1][0] || '') : '')).toUpperCase();
  }

  // menor ancestral que contém uma data E apenas 1 widget de nota (= o card inteiro do review)
  function reviewRoot(rating) {
    var node = rating, root = null;
    for (var i = 0; i < 9 && node; i++) {
      node = node.parentElement;
      if (!node) break;
      if (node.querySelectorAll('.elementor-widget-rating').length !== 1) break;
      var hasDate = [].some.call(node.querySelectorAll('p'), function (p) { return DATE_RE.test(p.textContent); });
      root = node;
      if (hasDate) break;
    }
    return root || rating.closest('.e-con') || rating.parentElement;
  }

  function build(name, comment, date, photo) {
    var html = '<div class="vy-rv-head">' +
      '<div class="vy-rv-avatar">' + esc(initials(name)) + '</div>' +
      '<div class="vy-rv-meta">' +
        '<div class="vy-rv-name">' + esc(name) + ' <span class="vy-rv-verified">✓ Compra verificada</span></div>' +
        '<div class="vy-rv-stars">★★★★★</div>' +
      '</div>' +
      '<div class="vy-rv-date">' + esc(date) + '</div>' +
    '</div>' +
    '<div class="vy-rv-text">' + esc(comment) + '</div>';
    if (photo) html += '<div class="vy-rv-photo"><img loading="lazy" src="' + esc(photo) + '" alt="Foto do cliente"></div>';
    return html;
  }

  function init() {
    var ratings = document.querySelectorAll('.elementor-widget-rating');
    var roots = [];
    [].forEach.call(ratings, function (r) {
      var root = reviewRoot(r);
      if (root && roots.indexOf(root) === -1) roots.push(root);
    });

    roots.forEach(function (root, i) {
      var ps = [].map.call(root.querySelectorAll('p'), function (p) { return p.textContent.trim(); }).filter(Boolean);
      if (!ps.length) return;
      var name = ps[0];
      var comment = '';
      ps.forEach(function (t) {
        if (t !== name && !DATE_RE.test(t) && !/^[<>\d\s…]+$/.test(t) && t.length > comment.length) comment = t;
      });
      if (!comment) comment = 'Produto excelente, recomendo!';

      var photo = '';
      [].some.call(root.querySelectorAll('img'), function (im) {
        var src = im.getAttribute('src') || '';
        if (!/blank-profile/.test(src) && IMG_RE.test(src)) { photo = src; return true; }
        return false;
      });

      root.classList.add('vy-review');
      root.innerHTML = build(name, comment, relDate(i), photo);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
