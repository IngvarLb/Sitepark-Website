/* ==========================================================================
   Sitepark Design System — Styleguide-Logik
   Liest alle Werte live aus den CSS-Tokens: Die Dokumentation kann nicht
   vom Code abweichen.
   ========================================================================== */
(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  /* ---------- Farb-Helfer --------------------------------------------------- */
  const probeHost = document.createElement('div');
  probeHost.setAttribute('aria-hidden', 'true');
  probeHost.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  document.body.append(probeHost);

  function resolveColor(value, scheme) {
    const box = document.createElement('div');
    if (scheme) box.style.colorScheme = scheme;
    const el = document.createElement('span');
    el.style.color = value;
    box.append(el);
    probeHost.append(box);
    const c = getComputedStyle(el).color;
    box.remove();
    return parseColor(c);
  }
  function parseColor(str) {
    const m = str.match(/[\d.]+/g) || [0, 0, 0];
    let [r, g, b, a = 1] = m.map(Number);
    if (str.startsWith('color(')) { [r, g, b] = [r * 255, g * 255, b * 255]; }
    return { r, g, b, a };
  }
  const toHex = ({ r, g, b }) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const fmtColor = (c) => (c.a < 1 ? `${toHex(c)} · ${Math.round(c.a * 100)} %` : toHex(c));
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const WHITE = { r: 255, g: 255, b: 255, a: 1 };
  const INK = { r: 29, g: 29, b: 28, a: 1 };
  function badge(ratio, label) {
    const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA groß' : '—';
    const cls = ratio >= 4.5 ? 'sg-badge--pass' : ratio >= 3 ? '' : 'sg-badge--fail';
    return `<span class="sg-badge ${cls}" title="Kontrast ${label}">${label} ${ratio.toFixed(1)} · ${level}</span>`;
  }

  /* ---------- Theme-Umschalter (System / Hell / Dunkel) --------------------- */
  function initTheme() {
    const control = $('[data-theme-control]');
    if (!control) return;
    const options = $$('[data-theme-option]', control);
    let stored = 'system';
    try { stored = localStorage.getItem('sp-theme') || 'system'; } catch {}
    const apply = (mode) => {
      if (mode === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', mode);
      options.forEach((o, i) => {
        const on = o.dataset.themeOption === mode;
        o.setAttribute('aria-pressed', String(on));
        if (on) control.style.setProperty('--index', i);
      });
      try { localStorage.setItem('sp-theme', mode); } catch {}
      document.dispatchEvent(new CustomEvent('sg:theme'));
    };
    options.forEach((o) => o.addEventListener('click', () => apply(o.dataset.themeOption)));
    apply(stored);
  }

  /* ---------- Primitive Skalen ---------------------------------------------- */
  function initScales() {
    $$('[data-scale]').forEach((wrap) => {
      const names = wrap.dataset.scale.split(',').map((s) => s.trim());
      wrap.innerHTML = names.map((n) => {
        const c = resolveColor(`var(--${n})`);
        const onWhite = contrast(c, WHITE);
        const text = contrast(c, INK) >= contrast(c, WHITE) ? '#1D1D1C' : '#FFFFFF';
        return `<div class="sg-scale__step" style="background:var(--${n});color:${text}">
          <b>${n.replace(/^sp-(yellow|gray)-/, '')}</b><span>${toHex(c)}</span><span>${onWhite.toFixed(1)}:1</span></div>`;
      }).join('');
    });
  }

  /* ---------- Swatches mit Kontrastwerten ---------------------------------- */
  function initSwatches() {
    $$('[data-swatch]').forEach((el) => {
      const token = el.dataset.swatch;
      const c = resolveColor(`var(${token})`);
      const out = $('[data-hex]', el);
      if (out) out.textContent = toHex(c);
      const badges = $('[data-badges]', el);
      if (badges) badges.innerHTML = badge(contrast(c, WHITE), 'auf Weiß') + ' ' + badge(contrast(c, INK), 'auf Tinte');
    });
  }

  /* ---------- Semantische Tokens: Light & Dark nebeneinander --------------- */
  function initSemantic() {
    $$('[data-semantic]').forEach((row) => {
      const token = row.dataset.semantic;
      ['light', 'dark'].forEach((scheme) => {
        const cell = $(`[data-${scheme}]`, row);
        if (!cell) return;
        const c = resolveColor(`var(${token})`, scheme);
        const bg = scheme === 'light' ? '#FFFFFF' : '#121211';
        cell.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px">
          <span style="width:28px;height:28px;border-radius:8px;background:${bg};box-shadow:inset 0 0 0 1px rgb(127 127 127/.3);display:grid;place-items:center">
            <span style="width:18px;height:18px;border-radius:5px;background:rgba(${c.r},${c.g},${c.b},${c.a})"></span></span>
          <code class="sg-token">${fmtColor(c)}</code></span>`;
      });
    });
  }

  /* ---------- Typo-Skala: berechnete Werte beim aktuellen Viewport --------- */
  function initTypeScale() {
    const rows = $$('[data-type-sample]');
    const update = () => rows.forEach((sample) => {
      const cs = getComputedStyle(sample);
      const out = $('[data-type-live]', sample.closest('.sg-type-row'));
      if (!out) return;
      const size = parseFloat(cs.fontSize);
      const lh = cs.lineHeight === 'normal' ? '—' : `${Math.round(parseFloat(cs.lineHeight))} px`;
      const ls = cs.letterSpacing === 'normal' ? '0' : `${(parseFloat(cs.letterSpacing) / size).toFixed(3)} em`;
      out.textContent = `Jetzt: ${size.toFixed(1)} px / ${lh} · Tracking ${ls} · ${cs.fontWeight}`;
    });
    update();
    addEventListener('resize', update, { passive: true });
  }

  /* ---------- Variable Schrift: Gewicht live ------------------------------- */
  function initWeightSlider() {
    const slider = $('[data-weight-slider]');
    if (!slider) return;
    const target = $('[data-weight-target]');
    const out = $('[data-weight-value]');
    const update = () => {
      target.style.setProperty('--w', slider.value);
      out.textContent = slider.value;
      const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty('--fill', `${pct}%`);
    };
    slider.addEventListener('input', update);
    update();
  }

  /* ---------- Easing-Kurven zeichnen + abspielen --------------------------- */
  function easingPoints(value) {
    value = value.trim();
    if (value.startsWith('linear(')) {
      const nums = value.slice(7, -1).split(',').map((v) => parseFloat(v));
      return nums.map((y, i) => [i / (nums.length - 1), y]);
    }
    const m = value.match(/cubic-bezier\(([^)]+)\)/);
    if (m) {
      const [x1, y1, x2, y2] = m[1].split(',').map(Number);
      const bez = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
      return Array.from({ length: 61 }, (_, i) => { const t = i / 60; return [bez(t, x1, x2), bez(t, y1, y2)]; });
    }
    return [[0, 0], [1, 1]];
  }
  function initCurves() {
    const cs = getComputedStyle(root);
    $$('[data-curve]').forEach((card) => {
      const token = card.dataset.curve;
      const value = cs.getPropertyValue(token).trim();
      const pts = easingPoints(value);
      const W = 240, H = 150, pad = 14;
      const yMin = -0.1, yMax = 1.15;
      const X = (x) => pad + x * (W - 2 * pad);
      const Y = (y) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);
      const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ');
      const svg = $('svg', card);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.innerHTML = `<path class="sg-curve__guide" d="M${pad} ${Y(1)}H${W - pad}"/><path class="sg-curve__axis" d="M${pad} ${pad / 2}V${H - pad}H${W - pad}"/><path class="sg-curve__path" d="${d}"/>`;
      const meta = $('[data-curve-meta]', card);
      if (meta) meta.textContent = value.length > 70 ? `${value.slice(0, 64)} …)` : value;

      const track = $('.sg-track', card);
      const durToken = card.dataset.duration;
      const dur = durToken ? (durToken.startsWith('--') ? cs.getPropertyValue(durToken).trim() : durToken) : '600ms';
      track.style.setProperty('--d', dur);
      track.style.setProperty('--e', `var(${token})`);
      const play = () => {
        track.style.setProperty('--track-w', `${track.clientWidth}px`);
        track.classList.toggle('is-on');
      };
      $('[data-play]', card)?.addEventListener('click', play);
    });
  }

  /* ---------- Code-Beispiele automatisch aus der Live-Vorschau ------------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function highlight(code) {
    // Reihenfolge wichtig: erst Attribute (enthalten noch keine eigenen Spans),
    // dann Tags (matchen nur maskierte „&lt;"), zuletzt Kommentare.
    return esc(code)
      .replace(/([\w:-]+)="([^"]*)"/g, '<span class="tk-attr">$1</span>=<span class="tk-str">"$2"</span>')
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="tk-tag">$2</span>')
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tk-com">$1</span>');
  }
  function cleanMarkup(html) {
    let s = html
      .replace(/\s(data-reveal|data-fade)(="[^"]*")?/g, '')
      .replace(/\sstyle="--i:\s*\d+;?"/g, '')
      .replace(/\s(is-in|is-loaded|is-animated)\b/g, '')
      .replace(/\n\s*\n/g, '\n');
    const lines = s.replace(/^\n+|\s+$/g, '').split('\n');
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
    return lines.map((l) => l.slice(indent)).join('\n');
  }
  function initExamples() {
    $$('.sg-example').forEach((ex, i) => {
      const preview = $('.sg-example__preview', ex);
      if (!preview || ex.hasAttribute('data-no-code')) return;
      const code = cleanMarkup(preview.innerHTML);
      const details = document.createElement('details');
      details.className = 'sg-example__code';
      details.innerHTML = `<summary><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>HTML anzeigen</summary>
        <pre class="sg-code"><button class="sg-copy" type="button">Kopieren</button><code>${highlight(code)}</code></pre>`;
      details.dataset.raw = code;
      ex.append(details);
    });
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.sg-copy');
      if (!btn) return;
      const raw = btn.closest('details')?.dataset.raw ?? $('code', btn.parentElement).textContent;
      try { await navigator.clipboard.writeText(raw); btn.textContent = 'Kopiert ✓'; }
      catch { btn.textContent = 'Nicht möglich'; }
      setTimeout(() => { btn.textContent = 'Kopieren'; }, 1600);
    });
  }

  /* ---------- Vorher / Nachher ------------------------------------------- */
  function initCompare() {
    $$('.sg-compare').forEach((box) => {
      const input = $('input', box);
      const set = () => box.style.setProperty('--pos', `${input.value}%`);
      input.addEventListener('input', set);
      set();
    });
  }

  /* ---------- Demos erneut abspielen ------------------------------------- */
  function initReplays() {
    $$('[data-replay]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const stage = document.getElementById(btn.dataset.replay);
        if (!stage) return;
        const items = $$('[data-reveal], .stat, .scroll-demo', stage);
        items.forEach((el) => el.classList.remove('is-in', 'is-animated'));
        void stage.offsetWidth;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          items.forEach((el, i) => {
            el.style.setProperty('--i', String(i));
            el.classList.add(el.classList.contains('stat') ? 'is-animated' : 'is-in');
          });
          $$('[data-count-to]', stage).forEach((n) => {
            const target = Number(n.dataset.countTo); let t0;
            const step = (now) => { t0 ??= now; const t = Math.min(1, (now - t0) / 1800); n.textContent = Math.round(target * (t === 1 ? 1 : 1 - 2 ** (-10 * t))); if (t < 1) requestAnimationFrame(step); };
            requestAnimationFrame(step);
          });
        }));
      });
    });

    const toast = $('[data-toast]');
    if (toast) {
      let t;
      $$('[data-demo-toast]').forEach((btn) => btn.addEventListener('click', () => {
        $('[data-toast-text]', toast).textContent = 'Link kopiert';
        toast.classList.add('is-visible');
        clearTimeout(t); t = setTimeout(() => toast.classList.remove('is-visible'), 2200);
      }));
    }

    // Demo: Segmented Control
    $$('[data-segmented-demo]').forEach((ctrl) => {
      const opts = $$('.segmented__option', ctrl);
      opts.forEach((o, i) => o.addEventListener('click', () => {
        opts.forEach((x) => x.setAttribute('aria-pressed', String(x === o)));
        ctrl.style.setProperty('--index', i);
      }));
    });
  }

  initTheme();
  initExamples();
  initScales();
  initSwatches();
  initSemantic();
  initTypeScale();
  initWeightSlider();
  initCurves();
  initCompare();
  initReplays();

  document.addEventListener('sg:theme', () => { initSwatches(); });
  document.fonts?.ready.then(initTypeScale);
})();
