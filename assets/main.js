(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');

  // Mobile menu
  var burger = d.querySelector('.burger');
  if (burger) {
    var setOpen = function (open) {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      var ov = d.getElementById('menu');
      if (ov) ov.setAttribute('aria-hidden', open ? 'false' : 'true');
    };
    burger.addEventListener('click', function () { setOpen(!root.classList.contains('menu-open')); });
    d.querySelectorAll('#menu a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // Reveal on scroll
  var els = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Mobile action bar: show after first screen
  var bar = d.querySelector('.actionbar'), sentinel = d.querySelector('[data-bar-sentinel]') || d.querySelector('.pagehead, .notfound');
  if (bar && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      bar.classList.toggle('is-in', !en.isIntersecting && en.boundingClientRect.top < 0);
    }).observe(sentinel);
  } else if (bar) { bar.classList.add('is-in'); }

  // Google Maps – nur nach Klick laden
  var mapBtn = d.querySelector('[data-map-load]');
  if (mapBtn) {
    mapBtn.addEventListener('click', function () {
      var frame = d.querySelector('.map__frame');
      var f = d.createElement('iframe');
      f.src = mapBtn.getAttribute('data-map-load');
      f.title = 'Karte: Harzburger Straße 6, 38173 Dettum';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      frame.innerHTML = '';
      frame.appendChild(f);
    });
  }

  // Kontaktformular
  var form = d.getElementById('anfrage');
  if (form) {
    var msg = form.querySelector('.form__msg');
    var show = function (ok, text) { msg.className = 'form__msg ' + (ok ? 'is-ok' : 'is-err'); msg.textContent = text; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = form.elements.namedItem('company_alt');
      if (hp && hp.value.trim() !== '') { show(true, 'Vielen Dank! Wir melden uns zeitnah bei Ihnen.'); return; }
      if (!form.elements.namedItem('datenschutz').checked) { show(false, 'Bitte akzeptieren Sie die Datenschutzerklärung.'); return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      var body = new URLSearchParams();
      ['name', 'telefon', 'email', 'stadt', 'message'].forEach(function (k) { body.append(k, form.elements.namedItem(k).value); });
      fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, t: t }; }); })
        .then(function (res) {
          var j = null; try { j = JSON.parse(res.t); } catch (_) {}
          var m = (j && ((j.meta && (j.meta.message || j.meta.detail)) || j.message)) || res.t || '';
          if (res.ok && (j && (j.code === 'OK' || String(m).toLowerCase().indexOf('spam') === -1))) {
            show(true, 'Vielen Dank! Wir melden uns zeitnah bei Ihnen.'); form.reset();
          } else { show(false, 'Ein Fehler ist aufgetreten. Bitte rufen Sie uns an: +49 152 049 346 85'); }
        })
        .catch(function () { show(false, 'Ein Fehler ist aufgetreten. Bitte rufen Sie uns an: +49 152 049 346 85'); })
        .then(function () { btn.disabled = false; });
    });
  }
})();
