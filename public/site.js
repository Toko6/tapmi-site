// tapmi.pl: header shadow on scroll, phone menu, one-time reveal, demo form.
(function () {
  document.documentElement.classList.add('js');

  // Header border once the page scrolls
  var top = document.getElementById('top');
  var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Phone menu
  var nav = document.getElementById('nav'), btn = document.querySelector('.menu-btn');
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  });

  // Sections fade in once as they come into view
  var items = [].slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var siblings = [].slice.call(en.target.parentElement.children).filter(function (c) { return c.classList.contains('reveal'); });
        en.target.style.transitionDelay = Math.min(siblings.indexOf(en.target), 5) * 60 + 'ms';
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else items.forEach(function (el) { el.classList.add('in'); });

  // Demo form: check, send to the app, show thanks
  var form = document.getElementById('demoForm');
  if (!form) return;
  var d = form.dataset;
  function setErr(input, msg) {
    var span = input.parentElement.querySelector('.err');
    input.classList.toggle('invalid', !!msg);
    if (span) { span.textContent = msg || ''; span.hidden = !msg; }
  }
  function check(input) {
    var v = input.value.trim();
    if (input.required && !v) return setErr(input, d.errRequired), false;
    if (input.name === 'phone' && v && v.replace(/\D/g, '').length < 9) return setErr(input, d.errPhone), false;
    if (input.name === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setErr(input, d.errEmail), false;
    setErr(input, ''); return true;
  }
  form.querySelectorAll('input:not(.hp)').forEach(function (i) { i.addEventListener('blur', function () { if (i.value) check(i); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, first = null;
    form.querySelectorAll('input:not(.hp)').forEach(function (i) { if (!check(i)) { ok = false; first = first || i; } });
    if (!ok) { first.focus(); return; }
    var submit = form.querySelector('button[type="submit"]'), label = submit.textContent, errBox = form.querySelector('.form-error');
    submit.disabled = true; submit.textContent = d.sending; errBox.hidden = true;
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    data.lang = d.lang;
    fetch(d.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); })
      .then(function () {
        form.hidden = true;
        var okBox = form.parentElement.querySelector('.form-ok');
        okBox.hidden = false; okBox.setAttribute('tabindex', '-1'); okBox.focus();
      })
      .catch(function () { errBox.textContent = d.error; errBox.hidden = false; submit.disabled = false; submit.textContent = label; });
  });
})();
