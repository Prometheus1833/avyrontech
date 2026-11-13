(() => {
  const nav = document.querySelector('#navigatie');
  const menu = document.querySelector('.menu-button');
  const narrow = window.matchMedia('(max-width:960px)');
  const setMenu = (open) => {
    menu.hidden = !narrow.matches;
    nav.hidden = narrow.matches && !open;
    menu.setAttribute('aria-expanded', String(narrow.matches && open));
  };
  setMenu(false);
  menu.addEventListener('click', () => setMenu(nav.hidden));
  document.querySelector('.site-head').addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && narrow.matches && !nav.hidden) {
      setMenu(false);
      menu.focus();
    }
  });
  nav.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!narrow.matches || !link) return;
    setMenu(false);
    document.getElementById(link.hash.slice(1))?.focus({preventScroll: true});
  });
  const resetMenu = () => setMenu(false);
  if (narrow.addEventListener) narrow.addEventListener('change', resetMenu);
  else narrow.addListener(resetMenu);

  const filterGroup = document.querySelector('.filters');
  if (filterGroup) {
    const options = [...filterGroup.querySelectorAll('button[data-filter]')];
    const cards = [...document.querySelectorAll('[data-category]')];
    const status = document.querySelector('#filter-status');
    filterGroup.hidden = false;
    for (const option of options) option.addEventListener('click', () => {
      for (const button of options) button.setAttribute('aria-pressed', String(option === button));
      const value = option.dataset.filter;
      for (const card of cards) card.hidden = value !== 'all' && value !== card.dataset.category;
      const count = cards.filter((card) => !card.hidden).length;
      status.textContent = count === 1 ? '1 titlu' : count + ' titluri';
    });
  }

  const partnerExample = document.querySelector('#mesaj-partener');
  if (partnerExample && window.location.hash === '#mesaj-partener') partnerExample.open = true;

  const dialog = document.querySelector('#dialog-comanda');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const draft = document.querySelector('#draft');
  const status = document.querySelector('#copy-status');
  const copyButton = document.querySelector('#copy-draft');
  let trigger = null;
  for (const button of document.querySelectorAll('[data-draft]')) {
    button.hidden = false;
    button.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = button;
      draft.value = button.dataset.draft;
      status.textContent = '';
      dialog.showModal();
    });
  }
  dialog.addEventListener('close', () => trigger?.focus());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(draft.value);
      status.textContent = 'Mesaj copiat.';
    } catch {
      draft.focus();
      draft.select();
      status.textContent = 'Mesaj selectat. Folosește comanda Copiază.';
    }
  });
})();
