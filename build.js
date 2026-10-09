// Builds the static tapmi.pl site into site/public: index.html (PL) and
// en/index.html (EN) from one template + src/copy.js + src/config.js.
//   node site/build.js
const fs = require('fs');
const path = require('path');
const COPY = require('./src/copy');
const CFG = require('./src/config');

const OUT = path.join(__dirname, 'public');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ADDRESS_LINE = (CFG.ADDRESS ? ', ' + CFG.ADDRESS : '') + (CFG.NIP ? ', NIP ' + CFG.NIP : '');
// Contact line for the privacy page: email (when set) and phone.
const CONTACT = [CFG.EMAIL, CFG.PHONE].filter(Boolean).join(', ');
const fill = s => String(s).replace(/\{(PHONE|EMAIL|COMPANY|ADDRESS_LINE|CONTACT)\}/g, (_, k) => (k === 'ADDRESS_LINE' ? ADDRESS_LINE : k === 'CONTACT' ? CONTACT : CFG[k]));
// The privacy sentence under the form links its last words to the policy page.
const privacyNote = t => esc(fill(t.form.privacy)).replace(/(polityka prywatności \(RODO\)|privacy policy \(GDPR\))/, `<a href="${t.privacyPath}">$1</a>`);

// Line icons (same set as the app: Lucide shapes, ISC licence).
const PATHS = {
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
};
const icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[n]}</svg>`;
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>';

// Structured data for search engines: the company, the product and the FAQ
// (Google can show the questions right in the results). `<` is escaped so the
// JSON can't close the script tag.
function jsonLd(t) {
  const url = CFG.SITE_URL + (t.lang === 'pl' ? '/' : '/en/');
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${CFG.SITE_URL}/#org`, name: 'TapMi', legalName: CFG.COMPANY, url: CFG.SITE_URL, logo: `${CFG.SITE_URL}/icon-192.png`,
        contactPoint: { '@type': 'ContactPoint', telephone: CFG.PHONE.replace(/\s/g, ''), contactType: 'sales', areaServed: 'PL', availableLanguage: ['pl', 'en'] } },
      { '@type': 'WebSite', '@id': `${CFG.SITE_URL}/#site`, url: CFG.SITE_URL, name: 'TapMi', inLanguage: t.lang, publisher: { '@id': `${CFG.SITE_URL}/#org` } },
      { '@type': 'SoftwareApplication', name: 'TapMi', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url, description: t.description,
        provider: { '@id': `${CFG.SITE_URL}/#org` }, audience: { '@type': 'BusinessAudience', audienceType: t.lang === 'pl' ? 'Restauracje, kawiarnie, bary' : 'Restaurants, cafés, bars' } },
      { '@type': 'FAQPage', inLanguage: t.lang, mainEntity: t.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// Privacy policy (RODO / GDPR): a plain text page in the site's look.
function privacyPage(t) {
  const p = t.privacyPage, home = t.lang === 'pl' ? '/' : '/en/';
  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="robots" content="index, follow">
<link rel="canonical" href="${CFG.SITE_URL}${t.privacyPath}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/site.css">
</head>
<body>
<header class="top scrolled"><div class="wrap top-row"><a class="logo" href="${home}"><img src="/favicon.svg" alt="" width="28" height="28"><b>Tap<span>Mi</span></b></a></div></header>
<main class="sec light legal"><div class="wrap narrow">
<p><a class="back" href="${home}">${esc(p.back)}</a></p>
<h1>${esc(p.h1)}</h1>
${p.sections.map(([h, body]) => `<h2>${esc(h)}</h2><p>${esc(fill(body))}</p>`).join('\n')}
</div></main>
<footer class="foot"><div class="wrap foot-legal">© ${new Date().getFullYear()} ${esc(CFG.COMPANY)}${esc(ADDRESS_LINE)}</div></footer>
</body>
</html>
`;
}

function page(t) {
  const home = t.lang === 'pl' ? '/' : '/en/';
  const ring = 2 * Math.PI * 34, fillLen = (4.6 / 5) * ring;
  const tel = CFG.PHONE.replace(/[^\d+]/g, '');
  const dec = n => n.toFixed(1).replace('.', t.lang === 'pl' ? ',' : '.');
  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
<link rel="canonical" href="${CFG.SITE_URL}${home}">
<link rel="alternate" hreflang="pl" href="${CFG.SITE_URL}/">
<link rel="alternate" hreflang="en" href="${CFG.SITE_URL}/en/">
<link rel="alternate" hreflang="x-default" href="${CFG.SITE_URL}/">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${CFG.SITE_URL}${home}">
<meta property="og:locale" content="${t.lang === 'pl' ? 'pl_PL' : 'en_GB'}">
<meta property="og:locale:alternate" content="${t.lang === 'pl' ? 'en_GB' : 'pl_PL'}">
<meta property="og:site_name" content="TapMi">
<meta property="og:image" content="${CFG.SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#111827">
<script type="application/ld+json">${jsonLd(t)}</script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="preload" href="/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site.css">
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>

<header class="top" id="top">
  <div class="progress" aria-hidden="true"></div>
  <div class="wrap top-row">
    <a class="logo" href="${home}" aria-label="TapMi"><img src="/favicon.svg" alt="" width="28" height="28"><b>Tap<span>Mi</span></b></a>
    <nav class="nav" id="nav" aria-label="Menu">
      <a href="#how">${esc(t.nav.how)}</a>
      <a href="#owner">${esc(t.nav.owner)}</a>
      <a href="#features">${esc(t.nav.features)}</a>
      <a href="#groups">${esc(t.nav.groups)}</a>
      <a href="#faq">${esc(t.nav.faq)}</a>
      <a class="nav-login" href="${CFG.APP_URL}/login">${esc(t.nav.login)}</a>
    </nav>
    <div class="top-actions">
      <a class="lang" href="${t.otherHref}" hreflang="${t.other}" lang="${t.other}" aria-label="${esc(t.langLabel)}">${t.otherLabel}</a>
      <a class="btn btn-dark btn-sm" href="#demo">${esc(t.nav.cta)}</a>
      <button class="menu-btn" type="button" aria-controls="nav" aria-expanded="false" aria-label="${esc(t.nav.menu)}">${icon('menu', 22)}</button>
    </div>
  </div>
</header>

<main id="main">
<section class="hero dark">
  <div class="glow" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow load" style="--d:0">${esc(t.hero.eyebrow)}</p>
      <h1 class="load" style="--d:1">${esc(t.hero.title)}</h1>
      <p class="lead load" style="--d:2">${esc(t.hero.lead)}</p>
      <div class="hero-ctas load" style="--d:3">
        <a class="btn btn-light magnet" href="#demo">${esc(t.hero.cta)} <span class="arrow">${icon('arrow', 18)}</span></a>
        <a class="btn btn-ghost hide-sm" href="#how">${esc(t.hero.secondary)}</a>
      </div>
      <ul class="chips load" style="--d:4">${t.hero.chips.map(([ic, label]) => `<li>${icon(ic, 15)} ${esc(label)}</li>`).join('')}</ul>
    </div>
    <div class="hero-visual" id="story">
      <div class="story" aria-hidden="true">
        <div class="phone">
          <div class="notch"></div>
          <div class="screen">
            <div class="g-logo s-in" style="--i:0">BP</div>
            <div class="g-venue s-in" style="--i:1">${esc(t.mock.venue)}</div>
            <div class="g-q s-in" style="--i:2">${esc(t.mock.question)}</div>
            <div class="g-stars s-in" style="--i:3">${STAR.repeat(5)}</div>
            <div class="g-note s-in" style="--i:4">${esc(t.mock.note)}</div>
            <div class="g-btn"><span class="g-g">G</span> ${esc(t.mock.google)}</div>
            <div class="g-powered">Powered by TapMi</div>
          </div>
        </div>
        <div class="nfc"><span>Tap<b>Mi</b></span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M8.5 8a5 5 0 0 1 0 8M12 5.5a9 9 0 0 1 0 13M15.5 3a13 13 0 0 1 0 18"/></svg></div>
        <div class="tap"></div>
        <div class="notif">
          <div class="notif-head"><img src="/favicon.svg" alt="" width="20" height="20"> TapMi <span>· ${esc(t.mock.notifTime)}</span></div>
          <div class="notif-title"><span class="chip s2">2★</span> ${esc(t.mock.notifVenue)}</div>
          <div class="notif-body">${esc(t.mock.notifBody)}</div>
          <span class="done">${icon('check', 14)}</span>
        </div>
        <div class="dash-card">
          <div class="ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="ring-track"/><circle cx="40" cy="40" r="34" class="ring-fill" style="stroke-dasharray:${ring.toFixed(1)};--dash:${(ring - fillLen).toFixed(1)}"/></svg><b>${dec(4.6)}</b></div>
          <div><div class="dc-label">${esc(t.mock.avg)}</div><div class="dc-sub">${esc(t.mock.ratings)}</div>
            <div class="bars">${[30, 45, 38, 60, 52, 70, 88].map((h, i) => `<i style="height:${h}%;--i:${i}"${i === 6 ? ' class="today"' : ''}></i>`).join('')}</div></div>
        </div>
      </div>
      <button class="story-toggle" type="button" aria-pressed="false" data-pause="${esc(t.mock.pause)}" data-play="${esc(t.mock.play)}" aria-label="${esc(t.mock.pause)}">${icon('pause', 14)}${icon('play', 14)}</button>
      <p class="sr-only">${esc(t.mock.caption)}</p>
    </div>
  </div>
</section>

<section class="sec light" id="how">
  <div class="wrap">
    <div class="sec-head" data-r="up"><p class="eyebrow">${esc(t.how.eyebrow)}</p><h2>${esc(t.how.title)}</h2></div>
    <ol class="steps"><span class="steps-line" aria-hidden="true"></span>${t.how.steps.map(([h, p], i) => `
      <li class="step" data-r="up"><span class="num">${i + 1}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></li>`).join('')}
    </ol>
  </div>
</section>

<section class="sec dark" id="owner">
  <div class="wrap split">
    <div data-r="left">
      <p class="eyebrow">${esc(t.owner.eyebrow)}</p><h2>${esc(t.owner.title)}</h2>
      <p class="body">${esc(t.owner.body)}</p>
      <p class="small">${esc(t.owner.small)}</p>
    </div>
    <div class="stack para" data-r="right" aria-hidden="true">
      <div class="alert-card">
        <div class="ac-top"><span class="av">A</span><b>Ania</b><span class="chip s2">2★</span><span class="ac-time">20:41</span></div>
        <p class="ac-comment">${esc(t.mock.notifBody.replace(/^.*?· /, '').replace(/[„”“"]/g, ''))}</p>
        <div class="ac-tip">${esc(t.mock.notifTip)}</div>
      </div>
      <div class="resolved-card">${icon('check', 18)}<div><b>${esc(t.owner.resolved)}</b><span>${esc(t.owner.resolvedNote)}</span></div></div>
    </div>
  </div>
</section>

<section class="sec light" id="google">
  <div class="wrap narrow center" data-r="up">
    <span class="shield">${icon('shield', 26)}</span>
    <p class="eyebrow">${esc(t.google.eyebrow)}</p><h2>${esc(t.google.title)}</h2>
    <p class="lead dark-ink">${esc(t.google.body)}</p>
    <div class="same para" aria-hidden="true">
      ${[1, 2, 3, 4, 5].map(n => `<div class="same-row" style="--i:${n - 1}"><span class="same-stars">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span><span class="same-arrow">→</span><span class="same-btn"><span class="g-g">G</span> Google</span></div>`).join('')}
      <p class="same-cap">${icon('check', 15)} ${esc(t.google.caption)}</p>
    </div>
  </div>
</section>

<section class="sec white" id="features">
  <div class="wrap">
    <div class="sec-head" data-r="up"><p class="eyebrow">${esc(t.features.eyebrow)}</p><h2>${esc(t.features.title)}</h2></div>
    <div class="cards" id="cards" tabindex="0" aria-label="${esc(t.features.title)}">${t.features.items.map(([ic, h, p]) => `
      <article class="card" data-r="scale"><span class="card-ic">${icon(ic)}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}
    </div>
    <div class="dots" aria-hidden="true">${t.features.items.map((_, i) => `<span${i === 0 ? ' class="on"' : ''}></span>`).join('')}</div>
    <p class="swipe-hint">${esc(t.features.swipe)} →</p>
  </div>
</section>

<section class="sec light" id="groups">
  <div class="wrap split">
    <div data-r="left">
      <p class="eyebrow">${esc(t.groups.eyebrow)}</p><h2>${esc(t.groups.title)}</h2>
      <p class="body">${esc(t.groups.body)}</p>
      <div class="weekly">${icon('mail', 20)}<div><b>${esc(t.groups.weeklyTitle)}</b><p>${esc(t.groups.weekly)}</p></div></div>
    </div>
    <div class="venues para" data-r="right" aria-hidden="true">${t.groups.venues.map(([n, a, r, alert]) => `
      <div class="venue${alert ? ' has-alert' : ''}"><div class="v-top"><span class="v-ini">${esc(n[0])}</span><b>${esc(n)}</b></div>
        ${alert ? `<span class="v-alert">${icon('bell', 13)} ${esc(alert)}</span>` : ''}
        <div class="v-stats"><span class="v-avg"><span class="count" data-to="${a}" data-dec="${t.lang === 'pl' ? ',' : '.'}">${dec(a)}</span><em>★</em></span><span>${esc(r)}</span>
          <svg class="spark" viewBox="0 0 80 24"><polyline points="${alert ? '0,8 13,10 26,9 40,13 53,12 66,16 80,15' : '0,16 13,14 26,15 40,10 53,11 66,7 80,6'}"/></svg></div></div>`).join('')}
    </div>
  </div>
</section>

<section class="sec white" id="faq">
  <div class="wrap narrow">
    <div class="sec-head" data-r="up"><p class="eyebrow">${esc(t.faq.eyebrow)}</p><h2>${esc(t.faq.title)}</h2></div>
    <div class="faq">${t.faq.items.map(([q, a]) => `
      <details data-r="up"><summary>${esc(q)}<span class="plus">${icon('plus', 16)}</span></summary><div class="answer"><p>${esc(a)}</p></div></details>`).join('')}
    </div>
  </div>
</section>

<section class="sec dark" id="demo">
  <div class="glow glow-low" aria-hidden="true"></div>
  <div class="wrap split">
    <div data-r="left">
      <p class="eyebrow">${esc(t.cta.eyebrow)}</p><h2>${esc(t.cta.title)}</h2>
      <p class="body">${esc(t.cta.body)}</p>
      <div class="call-row">
        <a class="btn btn-light" href="tel:${esc(tel)}">${icon('phone', 18)} ${esc(t.cta.call)}</a>
        ${CFG.WHATSAPP ? `<a class="btn btn-ghost" href="https://wa.me/${esc(CFG.WHATSAPP)}" rel="noopener">${icon('chat', 18)} ${esc(t.cta.whatsapp)}</a>` : ''}
      </div>
      <p class="call-or">${esc(CFG.PHONE)}${CFG.EMAIL ? ` · <a href="mailto:${esc(CFG.EMAIL)}">${esc(CFG.EMAIL)}</a>` : ''}</p>
    </div>
    <div class="form-card" data-r="right">
      <form id="demoForm" novalidate data-endpoint="${esc(CFG.DEMO_ENDPOINT)}" data-lang="${t.lang}"
        data-err-required="${esc(t.form.errRequired)}" data-err-phone="${esc(t.form.errPhone)}" data-err-email="${esc(t.form.errEmail)}"
        data-sending="${esc(t.form.sending)}" data-error="${esc(fill(t.form.error))}">
        ${[['name', 'text', true, 'name'], ['venue', 'text', true, 'organization'], ['city', 'text', true, 'address-level2'], ['phone', 'tel', true, 'tel']].map(([k, type, req, ac]) => `
        <label>${esc(t.form[k][0])} *<input name="${k}" type="${type}" placeholder="${esc(t.form[k][1])}" autocomplete="${ac}" required maxlength="120"><span class="err" hidden></span></label>`).join('')}
        <button class="more-btn" type="button" aria-expanded="false" aria-controls="moreFields">${esc(t.form.more)}</button>
        <div class="more" id="moreFields" hidden>
          <label>${esc(t.form.email[0])}<input name="email" type="email" placeholder="${esc(t.form.email[1])}" autocomplete="email" maxlength="120"><span class="err" hidden></span></label>
          <label>${esc(t.form.message[0])}<textarea name="message" rows="3" placeholder="${esc(t.form.message[1])}" maxlength="1000"></textarea></label>
        </div>
        <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
        <button class="btn btn-dark btn-full magnet" type="submit">${esc(t.form.submit)}</button>
        <p class="form-note">${esc(t.form.required)} · ${privacyNote(t)}</p>
        <p class="form-error" role="alert" hidden></p>
      </form>
      <div class="form-ok" hidden role="status"><svg class="ok-check" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><div><b>${esc(t.form.successTitle)}</b><p>${esc(t.form.success)}</p></div></div>
    </div>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-grid">
    <div><a class="logo" href="${home}"><img src="/favicon.svg" alt="" width="24" height="24"><b>Tap<span>Mi</span></b></a><p>${esc(t.footer.tagline)}</p></div>
    <div><h4>${esc(t.footer.product)}</h4><a href="#how">${esc(t.nav.how)}</a><a href="#features">${esc(t.nav.features)}</a><a href="#faq">${esc(t.nav.faq)}</a><a href="${CFG.APP_URL}/login">${esc(t.nav.login)}</a></div>
    <div><h4>${esc(t.footer.company)}</h4><a href="tel:${esc(tel)}">${esc(CFG.PHONE)}</a>${CFG.WHATSAPP ? `<a href="https://wa.me/${esc(CFG.WHATSAPP)}" rel="noopener">WhatsApp</a>` : ''}${CFG.EMAIL ? `<a href="mailto:${esc(CFG.EMAIL)}">${esc(CFG.EMAIL)}</a>` : ''}<a href="${t.privacyPath}">${esc(t.footer.privacy)}</a></div>
    <div><h4>${esc(t.footer.language)}</h4><a href="/" hreflang="pl" lang="pl">Polski</a><a href="/en/" hreflang="en" lang="en">English</a></div>
  </div>
  <div class="wrap foot-legal">© ${new Date().getFullYear()} ${esc(CFG.COMPANY)}${esc(ADDRESS_LINE)}</div>
</footer>

<script src="/site.js" defer></script>
</body>
</html>
`;
}

fs.mkdirSync(path.join(OUT, 'en'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), page(COPY.pl));
fs.writeFileSync(path.join(OUT, 'en', 'index.html'), page(COPY.en));
for (const t of [COPY.pl, COPY.en]) {
  fs.mkdirSync(path.join(OUT, t.privacyPath), { recursive: true });
  fs.writeFileSync(path.join(OUT, t.privacyPath, 'index.html'), privacyPage(t));
}
fs.copyFileSync(path.join(__dirname, 'src', 'site.css'), path.join(OUT, 'site.css'));
fs.copyFileSync(path.join(__dirname, 'src', 'site.js'), path.join(OUT, 'site.js'));
// Search engines: where the pages are, and that everything may be crawled.
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[['/', '/en/'], [COPY.pl.privacyPath, COPY.en.privacyPath]].flatMap(([pl, en]) => [pl, en].map(p => `  <url><loc>${CFG.SITE_URL}${p}</loc><lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="pl" href="${CFG.SITE_URL}${pl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${CFG.SITE_URL}${en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${CFG.SITE_URL}${pl}"/>
  </url>`)).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${CFG.SITE_URL}/sitemap.xml\n`);
const todo = Object.entries(CFG).filter(([, v]) => /^\{.*\}$/.test(v)).map(([k]) => k);
console.log('Built site/public (PL + EN).' + (todo.length ? ` Placeholders still to fill in src/config.js: ${todo.join(', ')}` : ''));
