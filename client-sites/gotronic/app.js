const form = document.querySelector('#fit-form');
const dialog = document.querySelector('#wa-dialog');
const draft = document.querySelector('#wa-text');
const copyStatus = document.querySelector('#wa-status');
const defaultMessage = draft?.value ?? '';
let lastMessage = '';
const getLabel = (field, fallback) => field.value ? field.selectedOptions[0]?.textContent.trim() : fallback;

if (form) {
  form.querySelector('button[type=submit]').disabled = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const {vehicle, year, voltage, distributor} = form.elements;
    const knownDucellier = ['dacia','renault'].includes(vehicle.value) && voltage.value === '12' && distributor.value === 'ducellier';
    let title = 'Cere o verificare GOTRONIC';
    let note = 'Datele nu identifică încă o configurație suficient de precis. Trimite detaliile cunoscute; dacă ai un cod de piesă, îl poți adăuga în mesaj.';
    if (knownDucellier) {
      title = 'Opțiune de discutat: AT011 cu senzor 011';
      note = 'GOTRONIC documentează această variantă pentru distribuitorul Ducellier. Confirmă bobina și configurația exactă înainte de alegere.';
    } else if (voltage.value === '6') {
      title = 'Instalație de 6 V: verificare individuală';
      note = 'Pentru alegere mai pot conta polaritatea la masă, bobina și sensul de rotație. GOTRONIC poate confirma varianta după ce identifică instalația.';
    } else if (distributor.value === 'bosch') {
      title = 'Distribuitor Bosch: confirmă codul exact';
      note = 'GOTRONIC documentează senzori diferiți pentru anumite distribuitoare Bosch. Codul și sensul de rotație pot schimba alegerea.';
    }
    document.querySelector('#fit-title').textContent = title;
    document.querySelector('#fit-note').textContent = note;
    document.querySelector('#fit-product').hidden = !knownDucellier;
    lastMessage = [
      'Bună ziua, GOTRONIC! Aș dori să verific compatibilitatea unui modul de aprindere.', '',
      `Vehicul: ${getLabel(vehicle, 'nespecificat')}`,
      `An: ${/^[0-9]{4}$/.test(year.value) ? year.value : 'nespecificat'}`,
      `Tensiune: ${getLabel(voltage, 'necunoscută')}`,
      `Distribuitor / instalație: ${getLabel(distributor, 'necunoscut(ă)')}`,
      ...(knownDucellier ? ['Opțiune de discutat: AT011 cu senzor 011.'] : []), '', 'Îmi puteți confirma varianta potrivită? Mulțumesc!',
    ].join('\r\n');
    document.querySelector('#fit-email').href = `mailto:office@gotronic.ro?subject=${encodeURIComponent('GOTRONIC — verificare compatibilitate')}&body=${encodeURIComponent(lastMessage)}`;
    document.querySelector('#fit-result').hidden = false;
  });
}

if (dialog?.showModal && draft && copyStatus) {
  let trigger;
  for (const link of document.querySelectorAll('[data-wa]')) link.addEventListener('click', event => {
    event.preventDefault();
    trigger = link;
    draft.value = lastMessage || defaultMessage;
    copyStatus.textContent = '';
    dialog.showModal();
  });
  dialog.addEventListener('close', () => trigger?.focus());
  dialog.querySelector('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(draft.value);
      copyStatus.textContent = 'Mesaj copiat.';
    } catch {
      draft.focus();
      draft.select();
      copyStatus.textContent = 'Textul este selectat. Folosește comanda Copiază a dispozitivului.';
    }
  });
}
const filter = document.querySelector('.filter');
if (filter) {
  filter.hidden = false;
  const buttons = [...filter.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.product-card[data-kind]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    cards.forEach(card => {card.hidden = button.dataset.filter !== 'all' && button.dataset.filter !== card.dataset.kind;});
    const count = cards.filter(card => !card.hidden).length;
    document.querySelector('#filter-status').textContent = `${count} produse afișate`;
  }));
}
const mobile = document.querySelector('.mobile-nav');
if (mobile) {
  mobile.addEventListener('click', event => {if (event.target.closest('a')) mobile.open = false;});
  mobile.addEventListener('keydown', event => {if (event.key === 'Escape' && mobile.open) {mobile.open = false;mobile.querySelector('summary').focus();}});
  document.addEventListener('pointerdown', event => {if (mobile.open && !mobile.contains(event.target)) mobile.open = false;});
}
