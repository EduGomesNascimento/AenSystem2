import os
import shutil
import subprocess
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
    "area-gps/index.html": ("aen_area_gps.html", "/area-gps"),
}


def git_output(*args: str) -> str:
    return subprocess.check_output(
        ["git", *args],
        cwd=ROOT,
        text=True,
    ).strip()


def get_site_version() -> str:
    override = os.environ.get("AEN_SITE_VERSION", "").strip()
    if override:
        return override
    try:
        count = git_output("rev-list", "--count", "HEAD")
        short_hash = git_output("rev-parse", "--short", "HEAD")
        return f"v{count}-{short_hash}"
    except Exception:
        return "v0-dev"


def url_for(endpoint, **values):
    if endpoint == "static":
        filename = values.get("filename", "")
        return f"/static/{filename}"
    routes = {
        "aen_home": "/",
        "aen_about": "/sobre",
        "aen_contact": "/contato",
        "aen_faq": "/duvidas",
        "aen_gp_area": "/area-gps",
    }
    return routes.get(endpoint, "/")


def write_supabase_config(target: Path) -> None:
    url = os.environ.get("AEN_SUPABASE_URL", "").strip()
    anon_key = os.environ.get("AEN_SUPABASE_ANON_KEY", "").strip()
    target.write_text(
        "window.AEN_SUPABASE_CONFIG = Object.freeze({\n"
        f"  url: {url!r},\n"
        f"  anonKey: {anon_key!r},\n"
        "  storageKey: 'aensystems-gp-auth'\n"
        "});\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    site_version = get_site_version()
    cname_value = CNAME_DEFAULT
    cname_file = DIST / "CNAME"
    if cname_file.exists():
        cname_value = cname_file.read_text(encoding="utf-8").strip() or CNAME_DEFAULT

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)))
    env.globals["url_for"] = url_for
    env.globals["site_version"] = site_version
    env.globals["asset_version"] = site_version

    for output, (template_name, _) in PAGES.items():
        target = DIST / output
        target.parent.mkdir(parents=True, exist_ok=True)
        template = env.get_template(template_name)
        html = template.render()
        target.write_text(html, encoding="utf-8")

    shutil.copytree(STATIC, DIST / "static")
    write_supabase_config(DIST / "static" / "js" / "aen-supabase-config.js")

    favicon_ico = ROOT / "static" / "favicon.ico"
    favicon_32 = ROOT / "static" / "favicon-32.png"
    favicon_16 = ROOT / "static" / "favicon-16.png"
    if favicon_ico.exists():
        shutil.copy2(favicon_ico, DIST / "favicon.ico")
    if favicon_32.exists():
        shutil.copy2(favicon_32, DIST / "favicon-32.png")
    if favicon_16.exists():
        shutil.copy2(favicon_16, DIST / "favicon-16.png")

    not_found = DIST / "404.html"
    not_found.write_text("<h1>404</h1>", encoding="utf-8")

    (DIST / "CNAME").write_text(cname_value, encoding="utf-8")
