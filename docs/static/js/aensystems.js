(function () {
  const carousels = document.querySelectorAll('[data-aen-carousel]');
  carousels.forEach((carousel) => {
    const track = carousel.querySelector('[data-aen-carousel-track]');
    const slides = Array.from(carousel.querySelectorAll('[data-aen-carousel-slide]'));
    const prev = carousel.querySelector('[data-aen-carousel-prev]');
    const next = carousel.querySelector('[data-aen-carousel-next]');
    if (!track || slides.length === 0) return;
    let index = 0;

    const update = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
    };

    if (prev) {
      prev.addEventListener('click', () => {
        index = Math.max(0, index - 1);
        update();
      });
    }

    if (next) {
      next.addEventListener('click', () => {
        index = Math.min(slides.length - 1, index + 1);
        update();
      });
    }

    update();
  });

  const form = document.querySelector('[data-aen-mailto-form]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const nome = data.get('nome') || '';
      const empresa = data.get('empresa') || '';
      const assunto = data.get('assunto') || 'Contato AEN Systems';
      const mensagem = data.get('mensagem') || '';

      const body = `Nome: ${nome}\nEmpresa: ${empresa}\n\nMensagem:\n${mensagem}`;
      const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=aensistemas@gmail.com&su=${encodeURIComponent(assunto)}&body=${encodeURIComponent(body)}`;
      window.open(gmail, '_blank', 'noopener');
    });
  }

  const faqItems = document.querySelectorAll('.aen-faq-toggle');
  faqItems.forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const panelId = button.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      button.setAttribute('aria-expanded', (!expanded).toString());
      const icon = button.querySelector('.aen-faq-icon');
      if (icon) icon.textContent = expanded ? '+' : '−';
      if (panel) panel.hidden = expanded;
    });
  });

  const themeSwitch = document.getElementById('aen-theme-switch');
  if (themeSwitch) {
    const applyTheme = (mode) => {
      if (mode === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeSwitch.checked = true;
      } else {
        document.body.removeAttribute('data-theme');
        themeSwitch.checked = false;
      }
    };
    const stored = localStorage.getItem('aen-theme');
    if (stored) applyTheme(stored);
    themeSwitch.addEventListener('change', () => {
      const mode = themeSwitch.checked ? 'dark' : 'light';
      localStorage.setItem('aen-theme', mode);
      applyTheme(mode);
    });
  }
})();


