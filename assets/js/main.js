/* ==========================================================================
   Sitepark — main.js
   Progressive Enhancement: Die Seite ist ohne JavaScript vollständig lesbar.
   Alle Animationen respektieren „Bewegung reduzieren".
   ========================================================================== */
(() => {
  'use strict';
  window.__sitepark = true;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  /** rAF-gedrosselter Scroll-/Resize-Listener */
  function onFrame(fn) {
    let queued = false;
    const run = () => { queued = false; fn(); };
    const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    fn();
    return schedule;
  }

  /* ------------------------------------------------------------------------
     1 · E-Mail-Adressen zusammensetzen (Schutz vor Adress-Sammlern)
     ------------------------------------------------------------------------ */
  function initEmails() {
    $$('.js-email').forEach((el) => {
      const { emailUser, emailHost, emailTld } = el.dataset;
      if (!emailUser || !emailHost || !emailTld) return;
      const address = `${emailUser}@${emailHost}.${emailTld}`;
      el.setAttribute('href', `mailto:${address}`);
      if (!el.textContent.trim()) el.textContent = address;
    });
  }

  /* ------------------------------------------------------------------------
     2 · Globale Navigation: Material beim Scrollen, Menü, Fokusführung
     ------------------------------------------------------------------------ */
  function initNav() {
    const nav = $('[data-globalnav]');
    if (!nav) return;

    onFrame(() => nav.classList.toggle('is-scrolled', window.scrollY > 4));

    const toggle = $('[data-menu-toggle]');
    const menu = $('#menu');
    if (!toggle || !menu) return;

    const background = $$('body > main, body > footer, .skip-link');
    menu.inert = true;

    const setOpen = (open, { restoreFocus = true } = {}) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Navigation schließen' : 'Navigation öffnen');
      menu.classList.toggle('is-open', open);
      menu.inert = !open;
      root.classList.toggle('menu-open', open);
      background.forEach((el) => { el.inert = open; });
      if (open) {
        const first = $('a', menu);
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
      } else if (restoreFocus) {
        toggle.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, { restoreFocus: false }); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
    });
    window.matchMedia('(min-width: 1069px)').addEventListener('change', (e) => {
      if (e.matches && menu.classList.contains('is-open')) setOpen(false, { restoreFocus: false });
    });
  }

  /* ------------------------------------------------------------------------
     3 · Scroll-Spy (Hauptnavigation + Inhaltsverzeichnis)
     ------------------------------------------------------------------------ */
  function initScrollSpy() {
    $$('[data-scrollspy]').forEach((container) => {
      const pairs = $$('.globalnav__link, .toc__link, [data-spy]', container)
        .map((link) => {
          const id = decodeURIComponent(link.hash.slice(1));
          const target = id && document.getElementById(id);
          // Nur Ziele auf derselben Seite
          return target && link.pathname === location.pathname ? { link, target } : null;
        })
        .filter(Boolean);
      if (!pairs.length) return;

      const indicator = $('.globalnav__indicator', container);
      let active = null;

      const moveIndicator = (link, animate) => {
        if (!indicator) return;
        if (!link || link.offsetParent === null) { indicator.classList.remove('is-visible'); return; }
        const wasHidden = !indicator.classList.contains('is-visible');
        if (wasHidden || !animate) indicator.style.transition = 'none';
        indicator.style.setProperty('--x', `${link.offsetLeft}px`);
        indicator.style.setProperty('--w', `${link.offsetWidth}px`);
        if (wasHidden || !animate) {
          void indicator.offsetWidth; // Reflow, damit kein Hineingleiten von links
          indicator.style.transition = '';
        }
        indicator.classList.add('is-visible');
      };

      const setActive = (link) => {
        if (link === active) return;
        active = link;
        pairs.forEach(({ link: l }) => {
          if (l === link) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
        moveIndicator(link, true);
      };

      onFrame(() => {
        const line = window.innerHeight * 0.32;
        let current = null;
        for (const pair of pairs) {
          if (pair.target.getBoundingClientRect().top <= line) current = pair;
        }
        // Sektionen gelten nur, solange sie die Linie noch überdecken
        if (current && current.target.tagName === 'SECTION' && current.target.getBoundingClientRect().bottom < line) {
          current = null;
        }
        // Am Seitenende den letzten Eintrag aktivieren
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && !indicator) {
          current = pairs[pairs.length - 1];
        }
        setActive(current ? current.link : null);
      });

      addEventListener('resize', () => moveIndicator(active, false), { passive: true });
      document.fonts?.ready.then(() => moveIndicator(active, false));
    });
  }

  /* ------------------------------------------------------------------------
     3b · „Nach oben" & Logo: sauber zum Seitenanfang, Fokus nach oben
     ------------------------------------------------------------------------ */
  function initToTop() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href="#top"]');
      if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', location.pathname + location.search);
      // Tastatur-Nutzer starten wieder oben (erstes Element der Navigation)
      const first = $('.globalnav__logo, .sg-bar__brand');
      if (first && link !== first) first.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------------
     4 · Einblenden beim Scrollen — gestaffelt innerhalb eines Schubs
     ------------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target)
        .forEach((el, i) => {
          el.style.setProperty('--i', String(i));
          el.classList.add('is-in');
          io.unobserve(el);
        });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     5 · Statement: Wörter „leuchten" mit dem Scrollfortschritt auf
     ------------------------------------------------------------------------ */
  function initScrollLit() {
    const blocks = $$('.scroll-lit');
    if (!blocks.length || reduceMotion.matches) return;

    blocks.forEach((block) => {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = part;
          frag.append(span);
        });
        node.replaceWith(frag);
      });
      block._words = $$('.word', block);
    });

    onFrame(() => {
      const vh = window.innerHeight;
      blocks.forEach((block) => {
        const r = block.getBoundingClientRect();
        const start = vh * 0.9;   // Beginn: Oberkante bei 90 % der Höhe
        const end = vh * 0.5;     // Ende: Unterkante bei 50 % der Höhe
        const p = clamp((start - r.top) / (r.height + start - end));
        const lit = Math.round(p * block._words.length);
        block._words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      });
    });
  }

  /* ------------------------------------------------------------------------
     6 · Kennzahlen: Ringe schließen sich, Zahlen zählen hoch
     ------------------------------------------------------------------------ */
  function initStats() {
    const stats = $$('.stat');
    if (!stats.length) return;
    const fmt = new Intl.NumberFormat('de-DE');
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const run = (stat, index) => {
      stat.style.setProperty('--i', String(index));
      stat.classList.add('is-animated');
      const num = $('[data-count-to]', stat);
      if (!num || reduceMotion.matches) return;
      const target = Number(num.dataset.countTo);
      const duration = 1800;
      let t0 = null;
      num.textContent = '0';
      const step = (now) => {
        t0 ??= now;
        const t = clamp((now - t0) / duration);
        num.textContent = fmt.format(Math.round(target * easeOutExpo(t)));
        if (t < 1) requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), index * 140);
    };

    if (!('IntersectionObserver' in window)) { stats.forEach((s) => s.classList.add('is-animated')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting).map((e) => e.target).forEach((s, i) => {
        io.unobserve(s);
        run(s, i);
      });
    }, { threshold: 0.35 });
    stats.forEach((s) => io.observe(s));
  }

  /* ------------------------------------------------------------------------
     7 · Teilen: Link kopieren, natives Teilen (Share Sheet)
     ------------------------------------------------------------------------ */
  let toastTimer;
  function toast(message) {
    const el = $('[data-toast]');
    if (!el) return;
    $('[data-toast-text]', el).textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  function initShare() {
    const canonical = $('link[rel="canonical"]')?.href || location.href;

    $$('[data-share="copy"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(canonical);
          toast('Link kopiert');
        } catch {
          toast('Kopieren nicht möglich');
        }
      });
    });

    if (navigator.share) {
      $$('[data-share-native-item]').forEach((item) => { item.hidden = false; });
      $$('[data-share="native"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          navigator.share({ title: document.title, url: canonical }).catch(() => {});
        });
      });
    }
  }

  /* ------------------------------------------------------------------------
     8 · Bilder weich einblenden, sobald geladen
     ------------------------------------------------------------------------ */
  function initImages() {
    $$('img[data-fade]').forEach((img) => {
      const done = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  }

  /* ------------------------------------------------------------------------
     9 · Parallax-Rückfall für Browser ohne scroll-getriebene Animationen
     ------------------------------------------------------------------------ */
  function initParallaxFallback() {
    if (reduceMotion.matches || (window.CSS && CSS.supports('animation-timeline: view()'))) return;
    const hero = $('.hero__media img');
    const feature = $('.feature__media img');
    onFrame(() => {
      const vh = window.innerHeight;
      if (hero) {
        const r = hero.parentElement.getBoundingClientRect();
        const p = clamp(-r.top / r.height);
        hero.style.transform = `translateY(${14 * p}%) scale(${1 + 0.1 * p})`;
      }
      if (feature) {
        const r = feature.parentElement.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const p = clamp((vh - r.top) / (vh + r.height));
          feature.style.transform = `scale(${1.16 - 0.16 * p}) translateY(${-3 + 6 * p}%)`;
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */
  initEmails();
  initNav();
  initScrollSpy();
  initToTop();
  initReveal();
  initScrollLit();
  initStats();
  initShare();
  initImages();
  initParallaxFallback();
})();
