#!/usr/bin/env python3
"""Builds the single-page docs viewer (PROJECT, ARCHITECTURE, ROADMAP, CLAUDE) as HTML.

Output: tools/docs-page/out/nuclearwinter-docs.html (git-ignored). Publish it to this
game's own docs artifact (the URL is recorded in CLAUDE.md).
"""
import base64
import pathlib

here = pathlib.Path(__file__).resolve().parent
root = here.parent.parent
html = (here / "template.html").read_text()


def esc(s: str) -> str:
    # keep the markdown from closing its <script> container
    return s.replace("</script", "<\\/script")


for key in ["PROJECT", "ARCHITECTURE", "ROADMAP", "CLAUDE"]:
    html = html.replace(f"__{key}__", esc((root / f"{key}.md").read_text()))

# Header art: an 8-frame, 64x64 explosion from the art pack. Use the copy in
# public/assets once the game ships it; until then read the shared pack.
candidates = [
    root / "public/assets/fx/explosion-1-b.png",
    root / "legacy/Explosions and Magic/Explosions pack/explosion-1-b/spritesheet.png",
]
boom = next(p for p in candidates if p.exists())
html = html.replace("__BOOM__", "data:image/png;base64," + base64.b64encode(boom.read_bytes()).decode())

out = here / "out"
out.mkdir(exist_ok=True)
(out / "nuclearwinter-docs.html").write_text(html)
print(out / "nuclearwinter-docs.html")
