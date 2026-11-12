const dialog = document.querySelector('#booking');
const step = dialog.querySelector('[data-book-step]');
const form = step.querySelector('form');
const result = dialog.querySelector('[data-book-result]');
const menu = document.querySelector('.mobile-nav');
let trigger;
function resetStep() {
  step.hidden = false;
  result.hidden = true;
  dialog.setAttribute('aria-labelledby', 'booking-title');
}
result.querySelector('h2').id = 'booking-result-title';
document.querySelectorAll('[data-book]').forEach(button => {
  button.addEventListener('click', () => {
    trigger = button;
    resetStep();
    form.reset();
    menu.open = false;
    dialog.showModal();
    form.elements.pet.focus();
  });
});
dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { trigger?.focus(); });
form.addEventListener('submit', event => {
  event.preventDefault();
  ['pet','reason','period'].forEach(key => {
    result.querySelector(`[data-result="${key}"]`).textContent = form.elements[key].selectedOptions[0].text;
  });
  step.hidden = true;
  result.hidden = false;
  dialog.setAttribute('aria-labelledby', 'booking-result-title');
  result.querySelector('h2').focus();
});
result.querySelector('[data-book-reset]').addEventListener('click', () => {
  resetStep();
  form.elements.pet.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open && !dialog.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});
document.addEventListener('click', event => { if (menu.open && !menu.contains(event.target)) menu.open = false; });

const demo = document.querySelector('[data-reminder]');
if (demo) {
  const type = demo.querySelector('[data-reminder-type]');
  const days = demo.querySelector('[data-reminder-days]');
  const dates = demo.dataset.dates.split(',');
  const format = new Intl.DateTimeFormat(document.documentElement.lang === 'ro' ? 'ro-RO' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' });
  function setTime(element, date) {
    element.dateTime = date.toISOString().slice(0,10);
    element.textContent = format.format(date);
  }
  function render() {
    const due = new Date(dates[Number(type.value)]);
    const send = new Date(due);
    send.setUTCDate(send.getUTCDate() - Number(days.value));
    demo.querySelector('[data-demo-reason]').textContent = type.selectedOptions[0].text;
    demo.querySelectorAll('[data-demo-due]').forEach(item => setTime(item, due));
    setTime(demo.querySelector('[data-demo-send]'), send);
  }
  type.addEventListener('change', render);
  days.addEventListener('change', render);
  render();
}

document.documentElement.classList.add('interactive');
