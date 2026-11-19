#!/usr/bin/env python3
"""Sitepark — minimaler Seiten-Build ohne Abhängigkeiten.

Setzt die Seiten aus src/pages/*.html und den Bausteinen aus src/partials/
zusammen und schreibt sie ins Projektverzeichnis.

Syntax in den Quelldateien:
  ---                     Front-Matter (key: value) am Dateianfang
  {{> name}}              bindet src/partials/name.html ein (rekursiv)
  {{key}}                 setzt einen Front-Matter-Wert ein

Aufruf:  python3 tools/build.py
"""
from __future__ import annotations

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages"
PARTIALS = ROOT / "src" / "partials"

INCLUDE = re.compile(r"\{\{>\s*([\w-]+)\s*\}\}")
VARIABLE = re.compile(r"\{\{\s*([\w-]+)\s*\}\}")


def parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    head, _, body = text[4:].partition("\n---\n")
    data = {}
    for line in head.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            data[key.strip()] = value.strip()
    return data, body


def render(text: str, data: dict[str, str], depth: int = 0) -> str:
    if depth > 10:
        raise RecursionError("Zu tief verschachtelte Partials")

    def include(match: re.Match) -> str:
        path = PARTIALS / f"{match.group(1)}.html"
        if not path.exists():
            raise FileNotFoundError(f"Partial fehlt: {path.relative_to(ROOT)}")
        return render(path.read_text(encoding="utf-8"), data, depth + 1)

    text = INCLUDE.sub(include, text)

    def variable(match: re.Match) -> str:
        key = match.group(1)
        if key not in data:
            raise KeyError(f"Variable '{key}' ist im Front-Matter nicht definiert")
        return data[key]

    return VARIABLE.sub(variable, text)


FONT_FACES = [
    ("source-sans-3-var.woff2", "normal"),
    ("source-sans-3-var-italic.woff2", "italic"),
]


def build_fonts() -> None:
    """Bettet die variablen Schriften als Data-URI in assets/css/fonts.css ein.
    Dadurch funktionieren sie auch bei file:// (Chrome blockiert dort
    Schriftdateien) und erscheinen ohne Nachladen (kein Font-Flackern)."""
    css = ["/* Automatisch erzeugt von tools/build.py – nicht von Hand bearbeiten. */"]
    for filename, style in FONT_FACES:
        data = base64.b64encode((ROOT / "assets" / "fonts" / filename).read_bytes()).decode("ascii")
        css.append(
            "@font-face {\n"
            '  font-family: "Source Sans 3";\n'
            f'  src: url("data:font/woff2;base64,{data}") format("woff2");\n'
            "  font-weight: 200 900;\n"
            f"  font-style: {style};\n"
            "  font-display: swap;\n"
            "}"
        )
    (ROOT / "assets" / "css" / "fonts.css").write_text("\n".join(css) + "\n", encoding="utf-8")


def main() -> int:
    build_fonts()
    built = []
    for page in sorted(PAGES.glob("*.html")):
        data, body = parse_front_matter(page.read_text(encoding="utf-8"))
        html = render(body, data).lstrip()
        out = ROOT / page.name
        out.write_text(html, encoding="utf-8")
        built.append(out.name)
    print("Gebaut:", ", ".join(built))
    return 0


if __name__ == "__main__":
    sys.exit(main())
