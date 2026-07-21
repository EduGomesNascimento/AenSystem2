# AENSYSTEMS no GitHub Pages

Este repositório publica o site institucional da AENSYSTEMS em hospedagem estática (GitHub Pages).

## Arquitetura

- Site estático gerado por `Python + Jinja`.
- Build em [`build.py`](./build.py) para a pasta `docs/`.
- Páginas públicas:
  - `/` — Home
  - `/sobre` — Sobre & Serviços
  - `/duvidas` — Dúvidas
  - `/contato` — Contato

### Princípio de segurança

O site no GitHub Pages entrega apenas arquivos estáticos. Nenhum segredo
fica no navegador — o conteúdo publicado é totalmente público.

## Arquivos principais

- [`build.py`](./build.py)
- [`templates/aen_base.html`](./templates/aen_base.html)
- [`templates/aen_home.html`](./templates/aen_home.html)
- [`templates/aen_about.html`](./templates/aen_about.html)
- [`templates/aen_contact.html`](./templates/aen_contact.html)
- [`templates/aen_duvidas.html`](./templates/aen_duvidas.html)
- [`static/css/aensystems.css`](./static/css/aensystems.css)
- [`static/js/aensystems.js`](./static/js/aensystems.js)

## Como gerar o site

```powershell
python build.py
```

Depois:

1. revise `docs/`
2. faça commit
3. publique via GitHub Pages apontando para `docs/`
4. mantenha o domínio em `HTTPS`

O `build.py` renderiza os templates de `templates/`, copia os assets de
`static/` e escreve tudo em `docs/`, junto com `CNAME`, favicons e a
página `404.html`.
