const categories = {
  vaccine: 'Rapel vaccin',
  parasites: 'Deparazitare',
  checkup: 'Control veterinar',
};
const species = { dog: 'Câine', cat: 'Pisică', other: 'Altă specie' };
const tabs = {
  prezentare: ['Prezentare', 'grid'],
  site: ['Editor site', 'layout'],
  termene: ['Termene', 'calendar'],
  pacienti: ['Proprietari și animale', 'paw'],
  email: ['E-mail și Resend', 'mail'],
};
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18m-12 0v11"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18m-12 5h6"/>',
  paw: '<circle cx="5" cy="9" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="20" cy="9" r="2"/><path d="M6 17c0-2 4-6 6-6s6 4 6 6c0 3-3 4-6 2-3 2-6 1-6-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const icon = key => `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const view = document.querySelector('#view');
const nav = document.querySelector('#admin-nav');
const dialog = document.querySelector('#record-dialog');
const recordView = document.querySelector('#record-view');
const feedback = document.querySelector('#feedback');
const dialogFeedback = document.querySelector('#dialog-feedback');
const prettyDate = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayLabel = value => prettyDate.format(new Date(value + 'T00:00:00Z'));
let state;
let draft;
let draftBase;
let active = 'prezentare';
let editorTab = 'ro';
let draftDirty = false;
let settingsDraft;
let settingsDirty = false;
let lastDialogTrigger;
let search = '';
let statusFilter = 'all';

async function api(route, data) {
  const response = await fetch('/admin/api/' + route, data === undefined ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function showMessage(message = '', isError = false, inDialog = false) {
  const target = inDialog ? dialogFeedback : feedback;
  target.hidden = !message;
  target.classList.toggle('error', isError);
  target.textContent = message;
}

function acceptState(next, saved = '') {
  state = next;
  if (saved === 'site') draftDirty = false;
  if (saved === 'settings') settingsDirty = false;
  if (!draftDirty) {
    draft = structuredClone(state.site.draft);
    draftBase = state.site.revision;
  }
  if (!settingsDirty) settingsDraft = structuredClone(state.settings);
}

function button(label, action, options = {}) {
  const style = options.style ? ' ' + options.style : '';
  const id = options.id === undefined ? '' : ` data-id="${options.id}"`;
  return `<button type="button" class="button${style}" data-action="${action}"${id}>${options.icon ? icon(options.icon) : ''}${esc(label)}</button>`;
}

function field(label, name, value, options = {}) {
  const attrs = `name="${name}" ${options.optional ? '' : 'required'} ${options.attrs || ''}`;
  let control;
  if (options.values) {
    control = `<select ${attrs}>${Object.entries(options.values).map(([key, text]) =>
      `<option value="${esc(key)}"${String(value) === key ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>`;
  } else if (options.area) {
    control = `<textarea ${attrs} rows="3">${esc(value)}</textarea>`;
  } else {
    control = `<input ${attrs} type="${options.type || 'text'}" value="${esc(value)}">`;
  }
  return `<label>${esc(label)}${control}${options.help ? `<small>${esc(options.help)}</small>` : ''}</label>`;
}

const check = (label, name, value) =>
  `<label class="checkbox"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}>${esc(label)}</label>`;
const submit = label => `<button class="button" type="submit">${esc(label)}</button>`;
const header = (title, description, actions = '') =>
  `<header class="page-head"><div><h1>${title}</h1><p>${description}</p></div>${actions}</header>`;
const badge = (text, tone = '') => `<span class="tag ${tone}">${text}</span>`;
const isPending = item => item.status === 'active' && !item.simulated && item.due_on >= state.today && item.email_allowed;

function statusOf(item) {
  if (item.status === 'cancelled') return ['Anulat', 'neutral', 'closed'];
  if (item.status === 'done') return ['Finalizat', '', 'closed'];
  if (item.simulated) return ['Simulat', '', 'simulated'];
  if (item.due_on < state.today) return ['Termen depășit', 'bad', 'expired'];
  if (!item.email_allowed) return ['E-mail oprit', 'neutral', 'blocked'];
  if (!state.settings.enabled) return ['Remindere în pauză', 'neutral', 'blocked'];
  if (item.send_on <= state.today) return ['De simulat', 'warning', 'pending'];
  return ['Programat', '', 'pending'];
}

function overview() {
  const pending = state.reminders.filter(isPending);
  const ready = state.settings.enabled ? pending.filter(item => item.send_on <= state.today).length : 0;
  const metrics = [
    ['calendar', 'Termene în coadă', pending.length, `${ready} ${ready === 1 ? 'eligibil azi' : 'eligibile azi'}`],
    ['paw', 'Animale înregistrate', state.pets.length, `${state.owners.length} proprietari`],
    ['mail', 'Evenimente simulate', state.events.length, 'Istoric de test'],
  ];
  return header('Panoul cabinetului', 'Termene, clienți și conținutul site-ului într-un singur loc.',
    button('Adaugă termen', 'reminder', { icon: 'plus' })) +
    `<dl class="grid stats">${metrics.map(([symbol, label, value, description]) => `<div class="panel metric"><dt><span class="metric-icon">${icon(symbol)}</span>${label}</dt><dd>${value}<small>${description}</small></dd></div>`).join('')}</dl>
    <div class="grid split"><section class="panel"><div class="panel-head"><h2>Următoarele remindere</h2><a href="#termene" class="inline-link">Vezi toate</a></div>
    ${pending.length ? `<ul class="record-list">${pending.slice(0, 5).map(item => `<li><div><strong>${esc(item.pet)} · ${categories[item.kind]}</strong><small>Termen ${dayLabel(item.due_on)} · e-mail ${dayLabel(item.send_on)} · ${item.language.toUpperCase()}</small></div>${badge(...statusOf(item))}</li>`).join('')}</ul>` : '<p class="muted">Coada este goală.</p>'}</section>
    <section class="panel feature"><img src="/assets/${esc(state.site.draft.clinic.image)}-640.webp" width="640" height="427" alt=""><div class="feature-content">${badge('Versiunea ' + state.site.publishedRevision)}<h2>Site-ul cabinetului</h2><p>Actualizează textele, programul, serviciile și anunțurile în ambele limbi.</p><a class="button secondary" href="#site">Deschide editorul</a></div></section></div>`;
}

const localeFields = {
  heroTitle: ['Titlul principal', 64], heroAccent: ['Al doilea rând', 64],
  heroDescription: ['Introducere', 230, true], bookingLabel: ['Butonul de programare', 42],
  servicesTitle: ['Titlu servicii', 82], servicesDescription: ['Introducere servicii', 230, true],
  visitTitle: ['Titlu prima vizită', 82], visitDescription: ['Introducere prima vizită', 230, true],
  reminderTitle: ['Titlu remindere', 82], reminderDescription: ['Introducere remindere', 230, true],
  contactTitle: ['Titlu contact', 82], contactDescription: ['Introducere contact', 230, true],
  announcement: ['Anunț pe site', 140, true, true], seoTitle: ['Titlu pentru motoarele de căutare', 80, false, true],
  seoDescription: ['Descriere pentru motoarele de căutare', 170, true, true],
};
function editor() {
  const preview = editorTab === 'en' ? '/preview/en/' : '/preview/';
  const status = draftDirty ? 'Modificări nesalvate' :
    state.site.revision === state.site.publishedRevision ? 'Ciorna este aplicată' : 'Ciornă salvată, în așteptarea aplicării';
  const controls = `<div class="editor-tools"><div><strong id="draft-status">${status}</strong><p>Versiune afișată ${state.site.publishedRevision} · Revizie ciornă ${state.site.revision}</p></div><div class="actions">
    <a class="button secondary" href="${preview}" target="_blank" rel="noopener">Vezi ciorna salvată ↗</a>
    <button class="button secondary" type="submit" form="editor-form">Salvează ciorna</button>
    ${button('Aplică în preview', 'publish')}</div></div>`;
  let fields;
  if (editorTab === 'general') {
    const c = draft.clinic;
    fields = `<div class="grid form-grid"><section class="panel"><h2>Contact și locație</h2>
      ${field('Denumire', 'name', c.name)}${field('Localitate', 'city', c.city)}${field('Adresă', 'street', c.street)}
      ${field('Telefon afișat', 'phone', c.phone)}${field('Telefon internațional', 'tel', c.tel, { type: 'tel' })}
      ${field('E-mail de contact', 'email', c.email, { type: 'email' })}${check('Afișează WhatsApp', 'whatsapp', c.whatsapp)}</section>
      <section class="panel"><h2>Program și imagine</h2>
      ${field('Luni – Vineri', 'weekdays', c.weekdays, { optional: true })}
      ${field('Sâmbătă', 'saturday', c.saturday, { optional: true })}
      ${field('Duminică', 'sunday', c.sunday, { optional: true, help: 'Lasă necompletat pentru Închis.' })}
      ${field('Fotografie de copertă', 'image', c.image, { values: { veterinar: 'Câine la consultație', pisica: 'Pisică în coșul de transport' } })}</section></div>`;
  } else {
    const locale = draft.locales[editorTab];
    const localized = (...names) => names.map(name => {
      const [label, max, area, optional] = localeFields[name];
      return field(label, name, locale[name], { area, optional, attrs: `maxlength="${max}"` });
    }).join('');
    fields = `<div class="grid form-grid">
      <section class="panel"><h2>Prima impresie</h2>${localized('heroTitle', 'heroAccent', 'heroDescription', 'bookingLabel')}</section>
      <section class="panel"><h2>Anunț și SEO</h2>${localized('announcement', 'seoTitle', 'seoDescription')}</section>
      <section class="panel"><h2>Secțiuni</h2>${localized('servicesTitle', 'servicesDescription', 'visitTitle', 'visitDescription', 'reminderTitle', 'reminderDescription', 'contactTitle', 'contactDescription')}</section>
      <section class="panel"><h2>Întrebări frecvente</h2>${locale.faq.map((item, i) => `<fieldset><legend>Întrebarea ${i + 1}</legend>
        ${field('Întrebare', `faq.${i}.question`, item.question, { attrs: 'maxlength="105"' })}
        ${field('Răspuns', `faq.${i}.answer`, item.answer, { area: true, attrs: 'maxlength="340"' })}</fieldset>`).join('')}</section>
      <section class="panel"><h2>Servicii</h2>${locale.services.map((item, i) => `<fieldset><legend>Serviciul ${i + 1}</legend>
        ${field('Titlu', `services.${i}.title`, item.title, { attrs: 'maxlength="70"' })}
        ${field('Descriere', `services.${i}.description`, item.description, { area: true, attrs: 'maxlength="220"' })}
        ${field('Pregătire pentru vizită', `services.${i}.preparation`, item.preparation, { area: true, attrs: 'maxlength="250"' })}</fieldset>`).join('')}</section>
      </div>`;
  }
  const options = { ro: 'Română', en: 'English', general: 'Date generale' };
  return header('Editor site', 'Salvează o ciornă, verifică pagina și aplică revizia în preview.') + controls +
    `<div class="tabs" role="group" aria-label="Secțiuni editor">${Object.entries(options).map(([key, title]) =>
      `<button type="button" class="button secondary" data-editor-tab="${key}" aria-pressed="${editorTab === key}">${title}</button>`).join('')}</div>
    <form id="editor-form">${fields}<div class="actions">${submit('Salvează ciorna')}</div></form>`;
}

const reminderLabels = ['Animal', 'Tip', 'Termen', 'E-mail', 'Stare', 'Acțiuni'];
function reminderRows() {
  const query = search.toLocaleLowerCase('ro').trim();
  const items = state.reminders.filter(item => {
    const matches = [item.pet, item.owner, categories[item.kind]].join(' ').toLocaleLowerCase('ro').includes(query);
    return matches && (statusFilter === 'all' || statusOf(item)[2] === statusFilter);
  });
  if (!items.length) return '<tr><td colspan="6" class="empty">Nu există termene pentru filtrul ales.</td></tr>';
  return items.map(item => {
    const columns = [
      `<div><strong>${esc(item.pet)}</strong><small>${esc(item.owner)}</small></div>`,
      categories[item.kind], dayLabel(item.due_on),
      `<div>${dayLabel(item.send_on)}<small>${item.language.toUpperCase()} · ${item.lead_days} zile înainte</small></div>`,
      badge(...statusOf(item)),
      button(item.status === 'active' ? 'Deschide' : 'Vezi', 'reminder', { id: item.id, style: 'secondary' }),
    ];
    return `<tr>${columns.map((value, i) => `<td data-label="${reminderLabels[i]}">${value}</td>`).join('')}</tr>`;
  }).join('');
}

function remindersView() {
  return header('Termene', 'Stabilește data recomandată și când să apară e-mailul în coadă.',
    button('Adaugă termen', 'reminder', { icon: 'plus' })) +
    `<section class="panel filters" aria-label="Filtre termene">
      ${field('Caută', 'search', search, { optional: true, type: 'search', attrs: 'id="search" placeholder="Animal, proprietar sau termen"' })}
      ${field('Stare', 'status', statusFilter, { attrs: 'id="status-filter"', values: { all: 'Toate', pending: 'În coadă', simulated: 'Simulate', blocked: 'Oprite', expired: 'Depășite', closed: 'Închise' } })}
      ${button('Simulează coada', 'simulate', { style: 'secondary' })}
    </section><div class="panel table-panel"><table>
      <caption>Calendarul notificărilor</caption><thead><tr>${reminderLabels.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
      <tbody id="reminder-rows">${reminderRows()}</tbody></table></div>`;
}

function directory() {
  return header('Proprietari și animale', 'Gestionează fișele demo și preferințele pentru remindere.',
    button('Adaugă proprietar', 'owner', { icon: 'plus' })) +
    `<div class="grid form-grid">${state.owners.map(owner => {
      const pets = state.pets.filter(pet => pet.owner_id === owner.id);
      return `<section class="panel"><div class="panel-head"><h2>${esc(owner.name)}</h2>${button('Editează', 'owner', { id: owner.id, style: 'secondary' })}</div>
        <p class="muted">${esc(owner.email)} · ${owner.language.toUpperCase()}</p>
        ${badge(owner.email_allowed ? 'Primește remindere' : 'Remindere oprite', owner.email_allowed ? '' : 'neutral')}
        <ul class="record-list">${pets.map(pet => `<li><div><strong>${esc(pet.name)}</strong><small>${species[pet.species]}</small></div>${button('Editează animalul', 'pet-edit', { id: pet.id, style: 'secondary' })}</li>`).join('')}</ul>
        ${button('Adaugă animal', 'pet', { id: owner.id, style: 'secondary', icon: 'plus' })}</section>`;
    }).join('')}</div>`;
}

function mailView() {
  const config = settingsDraft;
  return header('E-mail și Resend', 'Configurează mesajele și verifică modul în care se vor programa.') +
    `<form id="settings-form"><div class="grid form-grid">
      <section class="panel"><div class="panel-head"><h2>Identitate expeditor</h2>${badge('Resend neconectat', 'neutral')}</div>
        ${field('Nume afișat', 'senderName', config.senderName)}${field('Adresă expeditor', 'fromEmail', config.fromEmail, { type: 'email' })}
        ${field('Adresă de răspuns', 'replyTo', config.replyTo, { type: 'email' })}
        <p class="muted">Domeniul expeditorului va fi verificat în Resend. Cheia API se configurează pe server.</p></section>
      <section class="panel"><h2>Reguli de notificare</h2>
        ${check('Remindere active în demo', 'enabled', config.enabled)}
        ${field('Ora de trimitere · Europe/Bucharest', 'sendTime', config.sendTime, { type: 'time' })}
        ${Object.entries(categories).map(([kind, label]) =>
          field(label + ' · zile înainte', 'leadDays.' + kind, config.leadDays[kind], { type: 'number', attrs: 'min="0" max="90" data-number' })).join('')}
        <p class="muted">Valorile implicite se aplică termenelor noi.</p></section>
      ${Object.entries(config.templates).map(([language, template]) => `<section class="panel"><h2>Șablon ${language.toUpperCase()}</h2>
        ${field('Subiect', `templates.${language}.subject`, template.subject, { attrs: 'maxlength="140"' })}
        ${field('Mesaj', `templates.${language}.body`, template.body, { area: true, attrs: 'maxlength="1500"' })}
        <p class="muted">Variabile disponibile <code>{{animal}}</code>, <code>{{data}}</code> și <code>{{serviciu}}</code>.</p></section>`).join('')}
      </div><div class="actions">${submit('Salvează setările')}${button('Previzualizează mesajul', 'mail-preview', { style: 'secondary' })}${button('Simulează coada', 'simulate', { style: 'secondary' })}</div></form>
    <section class="panel mail-history"><h2>Istoricul simulărilor</h2>${state.events.length ?
      `<ul class="record-list">${state.events.map(item => `<li><div><strong>${esc(item.pet)} · ${categories[item.reminder_kind]}</strong><small>${dayLabel(item.simulated_on)} · ${item.send_time} · Revizia ${item.revision}</small></div>${badge('Simulat')}</li>`).join('')}</ul>` :
      '<p class="muted">Rulează o simulare pentru a vedea rezultatele aici.</p>'}</section>`;
}

function render() {
  const current = location.hash.slice(1);
  active = Object.hasOwn(tabs, current) ? current : 'prezentare';
  document.querySelector('#breadcrumb').textContent = ' / ' + tabs[active][0];
  nav.innerHTML = Object.entries(tabs).map(([key, [label, symbol]]) =>
    `<a href="#${key}" ${key === active ? 'aria-current="page"' : ''}>${icon(symbol)}${label}</a>`).join('');
  view.innerHTML = { prezentare: overview, site: editor, termene: remindersView, pacienti: directory, email: mailView }[active]();
}

function showDialog(title, content, form = '') {
  showMessage('', false, true);
  recordView.innerHTML = `<h2 id="record-title">${title}</h2>${form ? `<form id="${form}">${content}</form>` : content}`;
  if (!dialog.open) {
    lastDialogTrigger = document.activeElement;
    dialog.showModal();
  }
  (recordView.querySelector('input:not([type="hidden"]), select, button') || document.querySelector('#dialog-close')).focus();
}

function petChoices() {
  return Object.fromEntries(state.pets.map(pet => [
    pet.id, `${pet.name} · ${state.owners.find(owner => owner.id === pet.owner_id).name}`,
  ]));
}

function reminderDialog(item) {
  if (!state.pets.length) {
    showDialog('Adaugă termen', '<p>Adaugă mai întâi un proprietar și un animal.</p><a href="#pacienti" class="button" data-action="close">Deschide registrul</a>');
    return;
  }
  if (item && item.status !== 'active') {
    showDialog('Termen închis', `<p>${esc(item.pet)} · ${categories[item.kind]} · ${dayLabel(item.due_on)}</p>${badge(...statusOf(item))}`);
    return;
  }
  const kind = item?.kind || 'vaccine';
  const hidden = item ? `<input type="hidden" name="id" value="${item.id}"><input type="hidden" name="revision" value="${item.revision}">` : '';
  showDialog(item ? 'Detalii termen' : 'Adaugă termen', hidden +
    field('Animal', 'petId', item?.pet_id ?? state.pets[0].id, { values: petChoices() }) +
    field('Tip de termen', 'kind', kind, { values: categories }) +
    field('Data recomandată', 'dueOn', item?.due_on || '', { type: 'date', attrs: `min="${state.today}"` }) +
    field('Zile înainte', 'leadDays', item?.lead_days ?? state.settings.leadDays[kind], { type: 'number', attrs: 'min="0" max="90"' }) +
    `<p id="schedule-preview" aria-live="polite"></p><div class="actions">${submit('Salvează termenul')}
      ${item ? button('Vezi e-mailul', 'mail-preview', { id: item.id, style: 'secondary' }) : ''}</div>
      ${item ? `<div class="actions">${button('Marchează finalizat', 'done', { id: item.id, style: 'secondary' })}${button('Anulează termenul', 'cancelled', { id: item.id, style: 'danger' })}</div>` : ''}`, 'reminder-form');
  updateSchedule();
}

function updateSchedule() {
  const form = document.querySelector('#reminder-form');
  if (!form) return;
  const due = form.elements.dueOn.value;
  const lead = form.elements.leadDays.value;
  const preview = document.querySelector('#schedule-preview');
  if (!due || lead === '' || !form.elements.leadDays.validity.valid) {
    preview.textContent = '';
    return;
  }
  const send = new Date(due + 'T00:00:00Z');
  send.setUTCDate(send.getUTCDate() - Number(lead));
  preview.textContent = `E-mail calculat pentru ${prettyDate.format(send)}, la ${state.settings.sendTime}.`;
}

function ownerDialog(item) {
  showDialog(item ? 'Editează proprietarul' : 'Adaugă proprietar',
    (item ? `<input type="hidden" name="id" value="${item.id}">` : '') +
    field('Nume', 'name', item?.name) + field('E-mail fictiv', 'email', item?.email, {
      type: 'email', help: 'Folosește o adresă de forma nume@example.com.',
    }) +
    field('Limba reminderului', 'language', item?.language || 'ro', { values: { ro: 'Română', en: 'English' } }) +
    check('Primește remindere', 'emailAllowed', item?.email_allowed) + '<div>' + submit('Salvează proprietarul') + '</div>', 'owner-form');
}

function petDialog(owner, pet) {
  showDialog(pet ? 'Editează animalul' : 'Adaugă animal', `<p>Proprietar: ${esc(owner.name)}</p>
    <input type="hidden" name="ownerId" value="${owner.id}">${pet ? `<input type="hidden" name="id" value="${pet.id}">` : ''}
    ${field('Nume', 'name', pet?.name)}${field('Specie', 'species', pet?.species || 'dog', { values: species })}
    <div>${submit('Salvează animalul')}</div>`, 'pet-form');
}

function simulateDialog() {
  showDialog('Simulează coada', '<p>Alege data la care vrei să verifici termenele eligibile. Rezultatul apare în istoricul demo.</p>' +
    field('Data simulării', 'date', state.today, { type: 'date' }) + '<div>' + submit('Rulează simularea') + '</div>', 'simulate-form');
}

function previewDialog(id) {
  const reminder = state.reminders.find(item => item.id === id) || state.reminders[0];
  if (!reminder) return showDialog('Previzualizare e-mail', '<p>Adaugă mai întâi un termen.</p>');
  const options = Object.fromEntries(state.reminders.map(item => [item.id, `${item.pet} · ${categories[item.kind]} · ${dayLabel(item.due_on)}`]));
  showDialog('Previzualizare e-mail',
    field('Termen', 'id', reminder.id, { values: options }) +
    field('Limba mesajului', 'language', reminder.language, { values: { ro: 'Română', en: 'English' } }) +
    '<div>' + submit('Generează previzualizarea') + '</div><section id="mail-result" aria-live="polite"></section>', 'preview-form');
  loadPreview(document.querySelector('#preview-form'));
}

let previewRequest = 0;
async function loadPreview(form) {
  const current = ++previewRequest;
  try {
    const data = await api('mail/preview', { id: Number(form.elements.id.value), language: form.elements.language.value, settings: settingsDraft });
    if (current !== previewRequest || !form.isConnected || !dialog.open) return;
    const body = data.body;
    form.querySelector('#mail-result').innerHTML = `<div class="mail-meta"><strong>De la</strong> ${esc(body.from)}<br><strong>Către</strong> ${esc(body.to[0])}<br><strong>Răspuns</strong> ${esc(body.reply_to)}</div><div class="mail-copy"><strong>${esc(body.subject)}</strong><br><br>${esc(body.text)}</div>`;
    showMessage('', false, true);
  } catch (error) {
    if (current === previewRequest && form.isConnected && dialog.open) showMessage(error.message, true, true);
  }
}

function storeField(object, input) {
  const names = input.name.split('.');
  const key = names.pop();
  const parent = names.reduce((value, part) => value[part], object);
  parent[key] = input.type === 'checkbox' ? input.checked :
    input.hasAttribute('data-number') ? (input.value === '' ? null : Number(input.value)) : input.value;
}

view.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'search') {
    search = input.value;
    document.querySelector('#reminder-rows').innerHTML = reminderRows();
  } else if (input.form?.getAttribute('id') === 'editor-form') {
    storeField(editorTab === 'general' ? draft.clinic : draft.locales[editorTab], input);
    draftDirty = true;
    document.querySelector('#draft-status').textContent = 'Modificări nesalvate';
  } else if (input.form?.getAttribute('id') === 'settings-form') {
    storeField(settingsDraft, input);
    settingsDirty = true;
  }
});

view.addEventListener('change', event => {
  if (event.target.id === 'status-filter') {
    statusFilter = event.target.value;
    document.querySelector('#reminder-rows').innerHTML = reminderRows();
  }
});

dialog.addEventListener('input', event => {
  if (event.target.form?.getAttribute('id') !== 'reminder-form') return;
  if (event.target.name === 'kind') {
    event.target.form.elements.leadDays.value = state.settings.leadDays[event.target.value];
  }
  updateSchedule();
});

document.addEventListener('click', async event => {
  const tab = event.target.closest('[data-editor-tab]');
  if (tab) {
    editorTab = tab.dataset.editorTab;
    render();
    view.querySelector('[aria-pressed="true"]').focus();
    return;
  }
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  const id = Number(trigger.dataset.id);
  if (action === 'close') return dialog.close();
  if (action === 'reminder') return reminderDialog(state.reminders.find(item => item.id === id));
  if (action === 'owner') return ownerDialog(state.owners.find(owner => owner.id === id));
  if (action === 'pet') return petDialog(state.owners.find(owner => owner.id === id));
  if (action === 'pet-edit') {
    const pet = state.pets.find(item => item.id === id);
    return petDialog(state.owners.find(owner => owner.id === pet.owner_id), pet);
  }
  if (action === 'simulate') return simulateDialog();
  if (action === 'mail-preview') return previewDialog(id);
  if (action === 'publish') {
    if (draftDirty) {
      showMessage('Salvează ciorna înainte să aplici modificările.', true);
      return;
    }
    trigger.disabled = true;
    try {
      acceptState(await api('site/publish', { revision: state.site.revision }), 'site');
      render();
      showMessage('Ciorna a fost aplicată în versiunea demo a site-ului.');
      view.querySelector('[data-action="publish"]').focus();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      trigger.disabled = false;
    }
  }
  if (action === 'done' || action === 'cancelled') {
    const item = state.reminders.find(reminder => reminder.id === id);
    showDialog(action === 'done' ? 'Finalizează termenul' : 'Anulează termenul',
      `<p>${esc(item.pet)} · ${categories[item.kind]} · ${dayLabel(item.due_on)}</p><input type="hidden" name="id" value="${id}"><input type="hidden" name="revision" value="${item.revision}"><input type="hidden" name="status" value="${action}"><div>${submit(action === 'done' ? 'Confirmă finalizarea' : 'Confirmă anularea')}</div>`, 'status-form');
  }
});

const saveRoutes = {
  'editor-form': ['site/draft', 'Ciornă salvată.', 'site'],
  'settings-form': ['settings', 'Setările au fost salvate.', 'settings'],
  'owner-form': ['owners', 'Proprietarul a fost salvat.'],
  'pet-form': ['pets', 'Animalul a fost salvat.'],
  'reminder-form': ['reminders', 'Termenul a fost salvat.'],
  'status-form': ['reminders/status', 'Starea termenului a fost actualizată.'],
  'simulate-form': ['mail/simulate', ''],
};

document.addEventListener('submit', async event => {
  const form = event.target;
  const formId = form.getAttribute('id');
  if (formId === 'preview-form') {
    event.preventDefault();
    return loadPreview(form);
  }
  if (!Object.hasOwn(saveRoutes, formId)) return;
  event.preventDefault();
  const [route, success, saved] = saveRoutes[formId];
  const submitter = event.submitter;
  if (submitter) submitter.disabled = true;
  const fields = Object.fromEntries(new FormData(form));
  for (const key of ['id', 'ownerId', 'petId', 'revision', 'leadDays']) {
    if (fields[key] !== undefined) fields[key] = Number(fields[key]);
  }
  if (route === 'owners') fields.emailAllowed = form.elements.emailAllowed.checked;
  let payload = fields;
  if (route === 'site/draft') payload = { config: draft, revision: draftBase };
  if (route === 'settings') payload = settingsDraft;
  const inDialog = dialog.contains(form);
  try {
    const result = await api(route, payload);
    acceptState(result.state || result, saved);
    if (inDialog) dialog.close();
    render();
    showMessage(success || `${result.count} e-mailuri simulate. Istoricul a fost actualizat.`);
    if (inDialog) document.querySelector('#admin-main').focus();
    else view.querySelector(`#${formId} [type="submit"]`)?.focus();
  } catch (error) {
    showMessage(error.message, true, inDialog);
  } finally {
    if (submitter) submitter.disabled = false;
  }
});

document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (lastDialogTrigger?.isConnected) lastDialogTrigger.focus();
});
window.addEventListener('hashchange', () => {
  if (state) {
    showMessage();
    render();
    document.querySelector('#admin-main').focus();
  }
});
window.addEventListener('beforeunload', event => {
  if (draftDirty || settingsDirty) event.preventDefault();
});

try {
  acceptState(await api('state'));
  render();
} catch (error) {
  showMessage(error.message, true);
  view.textContent = 'Dashboardul nu a putut fi deschis. Reîncarcă pagina în câteva momente.';
}
