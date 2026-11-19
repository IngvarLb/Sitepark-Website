# Sitepark Website · Redesign 2026

This is a redesign of [sitepark.com](https://www.sitepark.com). Content and functions are fully carried over. The existing design (yellow, anthracite, Source Sans, accent bar, diagonal image cut) was developed further according to the principles of the Apple Human Interface Guidelines. Shapes are deliberately angular, with only 1–4 px rounding (`--radius-*` in `tokens.css`).

| Page | File |
|---|---|
| Homepage | `index.html` |
| Privacy | `datenschutz.html` |
| Styleguide & design system | `styleguide.html` (internal, `noindex`) |

## Quick start

Open `index.html` directly in the browser. Fonts are embedded, so it also works without a server.

A local server comes closest to production. Page transitions (View Transitions) and the web manifest only work over HTTP:

```bash
python3 -m http.server 8765
# → http://localhost:8765
```

## Workflow

The pages are assembled from `src/`. Navigation, footer, icon sprite and `<head>` exist only once.

```bash
python3 tools/build.py          # src/pages + src/partials → *.html, embeds the fonts
python3 tools/export-tokens.py  # assets/css/tokens.css → design-system/tokens.json
```

**Don't edit the generated `*.html` files in the root directory by hand.** Changes always go into `src/`.

## Structure

```
assets/
  css/tokens.css        Design tokens (primitives, semantics, typography, grid, motion)
  css/base.css          Reset, typography, layout, surfaces, reveal animations
  css/components.css    All components
  css/fonts.css         generated: Source Sans 3 Variable as a data URI
  css/styleguide.css    documentation only
  js/main.js            Navigation, scroll spy, reveal, rings, sharing, email protection
  js/styleguide.js      Live tokens, curves, auto-generated code examples
  js/vendor/            iframe-resizer (carried over from the old site)
  fonts/ img/
src/pages/              Page sources with front matter
src/partials/           head, nav, footer, sprite
tools/                  build.py, export-tokens.py (Python 3, no dependencies)
design-system/          tokens.json in DTCG format (for Figma & co.)
```

## Carried over from the old site

- All texts, images, people, key figures, partners, the legal notice (Anbieterkennzeichnung) and the privacy policy
- Section anchors unchanged: `#ansprechpartner`, `#fakten-und-zahlen`, `#partner`, `#beratung-und-konzeption`
- Email protection: the address is assembled only in the browser, with a CSS fallback when JavaScript is off
- Honeypot addresses against spam harvesters (hidden)
- Sharing via Facebook and email, plus new: copy link and the native share sheet
- Animated key figures (rings + counters), scroll-in animations, image zoom on scroll
- Page transitions: Astro ClientRouter → native cross-document View Transitions
- iframe-resizer child script, JSON-LD organization, Open Graph, manifest, icons

## Preview on GitHub Pages

The site is published automatically from the `main` branch (root directory):
**https://ingvarlb.github.io/Sitepark-Website/**

- `.nojekyll` switches off Jekyll. Without it, GitHub would interpret the `{{> …}}` placeholders in `src/` as Liquid templates, and the build would fail.
- After changes: run `python3 tools/build.py`, then commit the generated `*.html` files as well and push them.
- The canonical tags point to `www.sitepark.com`, so search engines treat the preview as a copy, not the original.

## Deployment notes

- **Privacy URL:** the old address is `/datenschutz/`, the file is `datenschutz.html`. Deliver it on the server at the old URL (canonical and sitemap already point to `/datenschutz/`), e.g. with nginx:
  `location = /datenschutz/ { try_files /datenschutz.html =404; }`
- **Exclude from deployment, or protect it:** `styleguide.html`, `src/`, `tools/`, `design-system/`, `assets/img/styleguide/`, `assets/css/styleguide.css`, `assets/js/styleguide.js`.
- `robots.txt` and `sitemap.xml` have been updated. The old site referenced `sitemap-index.xml`.

## Browser support

Current Safari, Chrome, Edge and Firefox. Modern features are progressive enhancements with a fallback:

- `animation-timeline: view()`: scroll-driven image zoom (JS fallback included)
- `@view-transition`: smooth page transitions

`light-dark()` and `linear()` are required (supported in all current browsers since 2024).

## Quality

- axe-core audit (WCAG 2.2 AA + best practices): **0 violations** on the homepage and the privacy page, in light and dark mode
- Respects reduced motion, increased contrast and the system appearance (light/dark)
- No horizontal overflow from 375 to 1920 px
