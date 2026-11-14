import { siteDefaults } from '../site-config.mjs';

export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function text(value, max, label, optional = false) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if ((!trimmed && !optional) || trimmed.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(trimmed)) {
    throw new ValidationError(`Verifică „${label}” (maximum ${max} de caractere).`);
  }
  return trimmed;
}

export function email(value, label = 'E-mail') {
  const result = text(value, 160, label);
  if (!/^[^\s@<>,]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(result)) {
    throw new ValidationError(`Verifică adresa pentru „${label}”.`);
  }
  return result;
}

export function choice(value, choices, label) {
  if (!choices.includes(value)) throw new ValidationError(`Alege o valoare pentru „${label}”.`);
  return value;
}

export function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`„${label}” trebuie să fie între ${min} și ${max}.`);
  }
  return value;
}

export function date(value) {
  if (typeof value !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(value)) {
    throw new ValidationError('Alege o dată validă între 2000 și 2099.');
  }
  const parsed = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError('Alege o dată validă.');
  }
  return value;
}

export function shiftDay(value, days) {
  const result = new Date(value + 'T00:00:00Z');
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function todayInBucharest() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts();
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const localeLimits = {
  heroTitle: 64, heroAccent: 64, heroDescription: 230, bookingLabel: 42,
  servicesTitle: 82, servicesDescription: 230, visitTitle: 82, visitDescription: 230,
  reminderTitle: 82, reminderDescription: 230, contactTitle: 82, contactDescription: 230,
  announcement: 140, seoTitle: 80, seoDescription: 170,
};

export function siteConfig(value) {
  const input = value?.clinic;
  if (!input || !value.locales) throw new ValidationError('Conținutul site-ului este incomplet.');
  const phone = text(input.phone, 30, 'Telefon');
  const tel = text(input.tel, 16, 'Telefon internațional');
  if (!/^\+\d{8,15}$/.test(tel)) throw new ValidationError('Folosește formatul internațional pentru apel și WhatsApp, de exemplu +40700123456.');
  const clinic = {
    name: text(input.name, 55, 'Denumire'),
    phone, tel, email: email(input.email), city: text(input.city, 55, 'Localitate'),
    street: text(input.street, 70, 'Adresă'),
    weekdays: text(input.weekdays, 35, 'Program în timpul săptămânii', true),
    saturday: text(input.saturday, 35, 'Program sâmbătă', true),
    sunday: text(input.sunday, 35, 'Program duminică', true),
    whatsapp: input.whatsapp === true,
    image: choice(input.image, ['veterinar', 'pisica'], 'Imagine principală'),
  };
  const locales = {};
  for (const language of ['ro', 'en']) {
    const locale = value.locales[language];
    if (!locale || !Array.isArray(locale.services) || !Array.isArray(locale.faq) ||
        locale.services.length !== siteDefaults.locales[language].services.length ||
        locale.faq.length !== siteDefaults.locales[language].faq.length) {
      throw new ValidationError(`Completează versiunea ${language.toUpperCase()} a site-ului.`);
    }
    const fields = Object.entries(localeLimits).map(([key, max]) => [
      key, text(locale[key], max, key, ['announcement', 'seoTitle', 'seoDescription'].includes(key)),
    ]);
    locales[language] = {
      ...Object.fromEntries(fields),
      services: locale.services.map(service => ({
        title: text(service?.title, 70, 'Titlul serviciului'),
        description: text(service?.description, 220, 'Descrierea serviciului'),
        preparation: text(service?.preparation, 250, 'Pregătire'),
      })),
      faq: locale.faq.map(item => ({
        question: text(item?.question, 105, 'Întrebare'),
        answer: text(item?.answer, 340, 'Răspuns'),
      })),
    };
  }
  return { clinic, locales };
}
