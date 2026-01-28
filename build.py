import os
import shutil
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
DIST = ROOT / "docs"
CNAME_DEFAULT = "aensystems.com.br"

PAGES = {
    "index.html": ("aen_home.html", "/"),
    "sobre/index.html": ("aen_about.html", "/sobre"),
    "contato/index.html": ("aen_contact.html", "/contato"),
    "duvidas/index.html": ("aen_duvidas.html", "/duvidas"),
}


def url_for(endpoint, **values):
    if endpoint == "static":
        filename = values.get("filename", "")
        return f"/static/{filename}"
    routes = {
        "aen_home": "/",
        "aen_about": "/sobre",
        "aen_contact": "/contato",
        "aen_faq": "/duvidas",
    }
    return routes.get(endpoint, "/")


if __name__ == "__main__":
    cname_value = CNAME_DEFAULT
    cname_file = DIST / "CNAME"
    if cname_file.exists():
        cname_value = cname_file.read_text(encoding="utf-8").strip() or CNAME_DEFAULT

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)))
    env.globals["url_for"] = url_for

    for output, (template_name, _) in PAGES.items():
        target = DIST / output
        target.parent.mkdir(parents=True, exist_ok=True)
        template = env.get_template(template_name)
        html = template.render()
        target.write_text(html, encoding="utf-8")

    shutil.copytree(STATIC, DIST / "static")
    # Favicon at site root for browser tab
    favicon_src = ROOT / "static" / "favicon.ico"
    if favicon_src.exists():
        shutil.copy2(favicon_src, DIST / "favicon.ico")

    # Basic 404 fallback
    not_found = DIST / "404.html"
    not_found.write_text("<h1>404</h1>", encoding="utf-8")

    # GitHub Pages custom domain
    (DIST / "CNAME").write_text(cname_value, encoding="utf-8")
