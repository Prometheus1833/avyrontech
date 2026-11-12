const form = document.querySelector('[data-whatsapp]');

form.addEventListener('input', (event) => {
  event.target.setCustomValidity('');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const fields = ['pickup', 'destination', 'vehicle'];
  const empty = fields.find((name) => !values.get(name).trim());
  if (empty) {
    const field = form.elements.namedItem(empty);
    field.setCustomValidity('Completează acest câmp.');
    field.reportValidity();
    return;
  }

  const message = [
    'Bună! Aș dori o ofertă pentru o platformă auto.',
    'Preluare: ' + values.get('pickup').trim(),
    'Destinație: ' + values.get('destination').trim(),
    'Mașină și situație: ' + values.get('vehicle').trim(),
  ].join('\n');

  const destination = new URL(form.dataset.whatsapp);
  destination.searchParams.set('text', message);
  window.location.assign(destination);
});

form.hidden = false;
