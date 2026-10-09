// tapmi.pl behaviour: header, menu, scroll reveals, hero story pause,
// timeline, counters, carousel dots, card tilt, magnetic buttons, form.
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var IO = 'IntersectionObserver' in window;

  // Header: shadow once the page scrolls
  var top = document.getElementById('top');
  var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Phone menu
  var nav = document.getElementById('nav'), menuBtn = document.querySelector('.menu-btn');
  menuBtn.addEventListener('click', function () { menuBtn.setAttribute('aria-expanded', String(nav.classList.toggle('open'))); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });

  // Run fn once when el scrolls into view
  function onView(el, fn, margin) {
    if (!IO || calm) return fn(el);
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }); }, { rootMargin: margin || '0px 0px -10% 0px' });
    io.observe(el);
  }

  // Scroll reveals, staggered among siblings (max 5 steps)
  [].forEach.call(document.querySelectorAll('[data-r]'), function (el) {
    var sibs = [].filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-r'); });
    el.style.setProperty('--stagger', Math.min(sibs.indexOf(el), 5) * 70 + 'ms');
    onView(el, function (t) { t.classList.add('in'); });
  });
  var same = document.querySelector('.same');
  if (same) onView(same, function (t) { t.classList.add('in'); }, '0px 0px -25% 0px');

  // How it works: the line grows and the numbers light up in turn
  var steps = document.querySelector('.steps');
  if (steps) onView(steps, function (t) { t.classList.add('go'); }, '0px 0px -30% 0px');

  // Count real numbers up (venue averages), Polish keeps its decimal comma
  [].forEach.call(document.querySelectorAll('.count'), function (el) {
    var to = parseFloat(el.dataset.to), sep = el.dataset.dec || '.';
    var show = function (v) { el.textContent = v.toFixed(1).replace('.', sep); };
    if (calm) return show(to);
    show(0);
    onView(el, function () {
      var t0 = null;
      requestAnimationFrame(function step(now) {
        if (t0 === null) t0 = now;
        var p = Math.min(1, (now - t0) / 900);
        show(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      });
    });
  });

  // Hero story: pause off-screen / hidden tab, and a visible pause button
  var story = document.getElementById('story'), toggle = story && story.querySelector('.story-toggle');
  if (story && toggle) {
    var userPaused = false, visible = true;
    var apply = function () { story.classList.toggle('paused', userPaused || !visible || document.hidden); };
    toggle.addEventListener('click', function () {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', userPaused ? toggle.dataset.play : toggle.dataset.pause);
      apply();
    });
    if (IO) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; apply(); }).observe(story);
    document.addEventListener('visibilitychange', apply);
  }

  // Features carousel (phones): dots follow the swipe
  var cards = document.getElementById('cards'), dots = document.querySelectorAll('.dots span');
  if (cards && dots.length && IO) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = [].indexOf.call(cards.children, e.target);
        [].forEach.call(dots, function (d, k) { d.classList.toggle('on', k === i); });
      });
    }, { root: cards, threshold: 0.6 });
    [].forEach.call(cards.children, function (c) { cio.observe(c); });
  }

  // Cards tilt toward the pointer, with a soft amber spotlight (mouse only)
  if (fine && !calm) {
    [].forEach.call(document.querySelectorAll('.card'), function (card) {
      var raf = 0;
      card.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          card.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
          card.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
          card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
      });
      card.addEventListener('pointerleave', function () { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });

    // Magnetic pull on the main buttons (up to 6px)
    [].forEach.call(document.querySelectorAll('.magnet'), function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx-btn', ((e.clientX - r.left - r.width / 2) / r.width * 12).toFixed(1) + 'px');
        b.style.setProperty('--my-btn', ((e.clientY - r.top - r.height / 2) / r.height * 8 - 2).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--mx-btn', '0px'); b.style.setProperty('--my-btn', '0px'); });
    });
  }

  // Demo form
  var form = document.getElementById('demoForm');
  if (!form) return;
  var d = form.dataset;
  var more = form.querySelector('.more-btn');
  more.addEventListener('click', function () {
    var box = document.getElementById('moreFields');
    box.hidden = false; more.hidden = true;
    box.querySelector('input').focus();
  });
  function setErr(input, msg) {
    var span = input.parentElement.querySelector('.err');
    input.classList.remove('invalid');
    if (msg) { void input.offsetWidth; input.classList.add('invalid'); }
    if (span) { span.textContent = msg || ''; span.hidden = !msg; }
  }
  function check(input) {
    var v = input.value.trim();
    if (input.required && !v) return setErr(input, d.errRequired), false;
    if (input.name === 'phone' && v && v.replace(/\D/g, '').length < 9) return setErr(input, d.errPhone), false;
    if (input.name === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setErr(input, d.errEmail), false;
    setErr(input, ''); return true;
  }
  [].forEach.call(form.querySelectorAll('input:not(.hp)'), function (i) { i.addEventListener('blur', function () { if (i.value) check(i); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, first = null;
    [].forEach.call(form.querySelectorAll('input:not(.hp)'), function (i) { if (!check(i)) { ok = false; first = first || i; } });
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
