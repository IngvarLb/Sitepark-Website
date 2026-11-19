#!/usr/bin/env python3
"""Exportiert die CSS-Tokens aus assets/css/tokens.css als JSON im
Design-Tokens-Format (W3C DTCG) nach design-system/tokens.json.

- Referenzen wie var(--sp-gray-0) werden zu Aliasen {color.sp-gray-0}
- light-dark(a, b) wird zu $value = a und $extensions.mode.dark = b
- Gruppierung nach Präfix (color, text, space, radius, …)

Aufruf:  python3 tools/export-tokens.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "css" / "tokens.css"
TARGET = ROOT / "design-system" / "tokens.json"

GROUPS = [
    ("sp-", "color", "color"),
    ("color-", "color", "color"),
    ("text-", "typography.size", "dimension"),
    ("leading-", "typography.lineHeight", "number"),
    ("tracking-", "typography.letterSpacing", "dimension"),
    ("weight-", "typography.weight", "fontWeight"),
    ("font-", "typography.family", "fontFamily"),
    ("space-", "space", "dimension"),
    ("radius-", "radius", "dimension"),
    ("shadow-", "shadow", "shadow"),
    ("material-", "material", "color"),
    ("spring-", "motion.spring", "cubicBezier"),
    ("ease-", "motion.easing", "cubicBezier"),
    ("duration-", "motion.duration", "duration"),
    ("z-", "zIndex", "number"),
]


def root_block(css: str) -> str:
    """Erster :root-Block (Light-Definition) ohne Kommentare."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    start = css.index(":root {")
    depth, i = 0, start
    while True:
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
            if depth == 0:
                return css[start:i]
        i += 1


def split_top_level(value: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in value:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += ch
    parts.append(cur.strip())
    return parts


def group_for(name: str):
    for prefix, group, kind in GROUPS:
        if name.startswith(prefix):
            return group, kind
    return "other", None


def alias(value: str, lookup: dict[str, str]) -> str:
    def repl(m: re.Match) -> str:
        ref = m.group(1)
        group, _ = group_for(ref)
        return "{" + f"{group}.{ref}" + "}" if ref in lookup else m.group(0)
    return re.sub(r"var\(--([\w-]+)\)", repl, value)


def main() -> None:
    block = root_block(SOURCE.read_text(encoding="utf-8"))
    decls = dict(re.findall(r"--([\w-]+)\s*:\s*([^;]+);", block))
    tree: dict = {}
    for name, raw in decls.items():
        raw = " ".join(raw.split())
        group, kind = group_for(name)
        node = tree
        for part in group.split("."):
            node = node.setdefault(part, {})
        token: dict = {}
        if kind:
            token["$type"] = kind
        if raw.startswith("light-dark("):
            light, dark = split_top_level(raw[len("light-dark("):-1])
            token["$value"] = alias(light, decls)
            token["$extensions"] = {"mode": {"light": alias(light, decls), "dark": alias(dark, decls)}}
        else:
            token["$value"] = alias(raw, decls)
        node[name] = token
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    meta = {"$description": "Sitepark Design System 2.0 – generiert aus assets/css/tokens.css"}
    TARGET.write_text(json.dumps({**meta, **tree}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(decls)} Tokens → {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
