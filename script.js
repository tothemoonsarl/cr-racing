const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lang = document.documentElement.lang;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Défilement fluide
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ duration: 1.2, easing: t => 1 - Math.pow(1 - t, 4) });
  (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
}
const goTo = el => lenis ? lenis.scrollTo(el, { duration: 1.4 }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });

// Barres de transition : montent, on agit pendant qu'elles couvrent l'écran, puis elles repartent
const bars = document.querySelector('.bars');
function wipe(action) {
  if (reduce) { action(); return; }
  bars.classList.remove('out'); bars.classList.add('in');
  setTimeout(() => { action(); bars.classList.remove('in'); bars.classList.add('out'); }, 650);
  setTimeout(() => bars.classList.remove('out'), 1400);
}

// Menu
const menuBtn = document.querySelector('.menu-btn');
const menu = document.getElementById('menu');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', open);
  menu.hidden = !open;
  if (lenis) open ? lenis.stop() : lenis.start();
}
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  wipe(() => setMenu(open));
});
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) wipe(() => setMenu(false)); });

// Liens internes
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  const target = id.length > 1 && document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  if (a.dataset.tab) selectTab(a.dataset.tab);
  if (!menu.hidden) wipe(() => { setMenu(false); lenis ? lenis.scrollTo(target, { immediate: true }) : target.scrollIntoView(); });
  else goTo(target);
  history.replaceState(null, '', id);
}));

// Apparitions des titres et blocs
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .2 });
  document.querySelectorAll('main h2,.big-statement,.track p,.notch,.races li,.hall-more,.partners-head p,.contact-box,.contact-head p,.serif-p').forEach(el => {
    if (el.closest('.hero')) return;
    el.classList.add('rv'); io.observe(el);
  });
  // Gribouillis tracés quand ils entrent à l'écran
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('drawn'); so.unobserve(e.target); }
  }), { threshold: .4 });
  document.querySelectorAll('.scribble:not(.s-hero)').forEach(s => so.observe(s));
}

// Moteur de défilement : tous les effets liés au scroll
const hero = document.querySelector('[data-hero]');
const lines = [...document.querySelectorAll('.hero-lines .line span')];
const para = [...document.querySelectorAll('[data-speed]')];
const fan = document.querySelector('[data-fan]');
const cards = fan ? [...fan.querySelectorAll('.f-card')] : [];

function frame() {
  const vh = innerHeight;
  // 1. Hero : p = progression dans la section figée
  if (hero) {
    const r = hero.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - vh));
    const p1 = clamp(p / .5);                 // rétraction de la photo + fond noir
    const p2 = clamp((p - .45) / .4);         // tracé du gribouillis
    hero.style.setProperty('--p', p.toFixed(4));
    hero.style.setProperty('--p1', p1.toFixed(4));
    hero.style.setProperty('--p2', p2.toFixed(4));
    lines.forEach((s, i) => {
      const dir = i % 2 ? 1 : -1;
      const max = s.scrollWidth - innerWidth;
      s.style.transform = `translate3d(${dir < 0 ? -p * max * .7 : -max * .7 + p * max * .7}px,0,0)`;
    });
  }
  // Parallaxe : chaque élément se décale selon sa vitesse
  para.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const off = (r.top + r.height / 2 - vh / 2);
    el.style.transform = `translate3d(0,${(-off * parseFloat(el.dataset.speed)).toFixed(1)}px,0)`;
  });
  // Éventail : les cartes s'écartent et pivotent
  if (fan) {
    const r = fan.getBoundingClientRect();
    const f = clamp((vh - r.top) / (vh * .9));
    const spread = Math.min(innerWidth * .2, 190);
    cards.forEach((c, i) => {
      const k = i - (cards.length - 1) / 2;
      c.style.transform = `translate(-50%,-50%) translate(${k * spread * f}px,${Math.abs(k) * 22 * f}px) rotate(${k * 9 * f}deg) scale(${1 - Math.abs(k) * .06 * f})`;
    });
  }
}
if (reduce) {
  if (hero) { hero.style.setProperty('--p1', 1); hero.style.setProperty('--p2', 1); }
} else {
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
}

// Onglets du formulaire
const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
function selectTab(name) {
  tabs.forEach(t => {
    const on = t.id === 't-' + name;
    t.setAttribute('aria-selected', on);
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
}
tabs.forEach(t => t.addEventListener('click', () => selectTab(t.id.slice(2))));

// Formulaires : envoi réel via Netlify Forms sur le site en ligne, simulé ailleurs (aperçu)
const MSG = {
  fr: { preview: "Aperçu : l'envoi sera actif sur le site en ligne.", sending: 'Envoi…', ok: 'Message envoyé. Nous vous répondons rapidement.', ko: "L'envoi a échoué. Réessayez dans un instant." },
  en: { preview: 'Preview: sending will be active on the live site.', sending: 'Sending…', ok: 'Message sent. We will get back to you shortly.', ko: 'Sending failed. Please try again in a moment.' },
  de: { preview: 'Vorschau: Der Versand ist auf der Live-Website aktiv.', sending: 'Wird gesendet…', ok: 'Nachricht gesendet. Wir melden uns umgehend.', ko: 'Der Versand ist fehlgeschlagen. Bitte versuchen Sie es gleich noch einmal.' },
  it: { preview: "Anteprima: l'invio sarà attivo sul sito online.", sending: 'Invio…', ok: 'Messaggio inviato. Vi risponderemo a breve.', ko: 'Invio non riuscito. Riprovate tra un istante.' }
}[lang] || {};
const live = /cr-racing\.ch$|netlify\.app$/.test(location.hostname);
document.querySelectorAll('form[data-netlify]').forEach(form => {
  const status = form.querySelector('.form-note');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!live) { status.textContent = MSG.preview; return; }
    status.textContent = MSG.sending;
    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!r.ok) throw 0;
      form.reset();
      status.innerHTML = '<span class="sent"></span>';
      status.firstChild.textContent = MSG.ok;
    } catch { status.textContent = MSG.ko; }
  });
});

// Lignes topographiques animées dans tous les fonds .topo :
// les contours « respirent » et des traits vert, blanc et rouge filent le long des lignes.
(async () => {
  const layers = [...document.querySelectorAll('.topo')];
  if (!layers.length) return;
  try {
    const src = await (await fetch('assets/topo.svg')).text();
    const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
    const paths = [...doc.querySelectorAll('path')].map(p => p.getAttribute('d'));
    const viewBox = doc.documentElement.getAttribute('viewBox');
    const NS = 'http://www.w3.org/2000/svg';
    const svgs = layers.map((layer, n) => {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', viewBox);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      svg.classList.add('topo-live');
      const base = document.createElementNS(NS, 'g'); base.classList.add('base');
      const glow = document.createElementNS(NS, 'g'); glow.classList.add('glow');
      paths.forEach((d, i) => {
        const a = document.createElementNS(NS, 'path'); a.setAttribute('d', d); base.appendChild(a);
        if ((i + n) % 2) return;
        const g = document.createElementNS(NS, 'path'); g.setAttribute('d', d); g.setAttribute('pathLength', '1000');
        g.style.setProperty('--d', (12 + ((i + n * 5) * 7) % 14) + 's');
        g.style.setProperty('--delay', -(((i + n) * 3.1) % 16).toFixed(1) + 's');
        glow.appendChild(g);
      });
      svg.append(base, glow);
      layer.classList.add('live');
      layer.appendChild(svg);
      return svg;
    });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
      addEventListener('mousemove', e => {
        const x = (e.clientX / innerWidth - .5) * -24, y = (e.clientY / innerHeight - .5) * -24;
        svgs.forEach(svg => { svg.style.transform = `translate3d(${x}px,${y}px,0)`; });
      }, { passive: true });
    }
  } catch { /* le fond fixe reste en place */ }
})();

// Photos du collage : dévoilement en balayage à l'entrée dans l'écran
if (!reduce && 'IntersectionObserver' in window) {
  const items = [...document.querySelectorAll('.c-item')];
  const co = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); requestAnimationFrame(() => e.target.classList.remove('pre')); co.unobserve(e.target);
  }), { threshold: .2, rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => { el.classList.add('pre'); co.observe(el); });
}
