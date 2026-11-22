import { ValidationError, choice, email, integer, text } from './validation.mjs';

export const kinds = {
  vaccine: { ro: 'Rapel vaccin', en: 'Vaccine booster' },
  parasites: { ro: 'Deparazitare', en: 'Parasite treatment' },
  checkup: { ro: 'Control veterinar', en: 'Veterinary checkup' },
};

export const defaultSettings = {
  senderName: 'Pets Arca lui Noe',
  fromEmail: 'programari@cabinet.example',
  replyTo: 'pets.arcaluinoe@gmail.com',
  enabled: true,
  sendTime: '09:00',
  leadDays: { vaccine: 7, parasites: 3, checkup: 1 },
  templates: {
    ro: {
      subject: 'Se apropie termenul pentru {{animal}}',
      body: 'Bună ziua,\n\nVă reamintim că termenul recomandat pentru {{animal}} este {{data}} ({{serviciu}}). Pentru o programare, ne puteți răspunde la acest e-mail.\n\nEchipa Pets Arca lui Noe',
    },
    en: {
      subject: 'Upcoming due date for {{animal}}',
      body: 'Hello,\n\nA quick reminder that {{animal}} is due for {{serviciu}} on {{data}}. Please reply to this email to request a visit.\n\nThe Pets Arca lui Noe team',
    },
  },
};

const tokens = ['animal', 'data', 'serviciu'];

function validateTemplate(value, label, max) {
  const content = text(value, max, label);
  const remaining = content.replace(/\{\{([a-z]+)\}\}/g, (_, name) => {
    choice(name, tokens, 'variabilă de șablon');
    return '';
  });
  if (/[{}]/.test(remaining)) throw new ValidationError(`Verifică variabilele din „${label}”.`);
  return content;
}

export function mailSettings(value) {
  const senderName = text(value?.senderName, 64, 'Numele expeditorului');
  const sendTime = text(value?.sendTime, 5, 'Ora de trimitere');
  if (/[\r\n<>]/.test(senderName)) throw new ValidationError('Verifică numele expeditorului.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) throw new ValidationError('Alege o oră validă.');
  const templates = {};
  for (const language of ['ro', 'en']) {
    const subject = validateTemplate(value.templates?.[language]?.subject, 'Subiect', 140);
    const body = validateTemplate(value.templates?.[language]?.body, 'Mesaj', 1500);
    if (/[\r\n]/.test(subject)) throw new ValidationError('Subiectul trebuie să ocupe un singur rând.');
    if (!body.includes('{{data}}')) throw new ValidationError('Mesajul trebuie să includă variabila {{data}}.');
    templates[language] = { subject, body };
  }
  return {
    senderName,
    fromEmail: email(value.fromEmail, 'Adresa expeditorului'),
    replyTo: email(value.replyTo, 'Adresă pentru răspuns'),
    enabled: value.enabled === true,
    sendTime,
    templates,
    leadDays: Object.fromEntries(Object.keys(kinds).map(kind => [
      kind, integer(value.leadDays?.[kind], 0, 90, kinds[kind].ro),
    ])),
  };
}

export function prepareResendEmail(settings, reminder, language = reminder.language) {
  const formattedDate = new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {
    dateStyle: 'long', timeZone: 'UTC',
  }).format(new Date(reminder.due_on + 'T00:00:00Z'));
  const variables = { animal: reminder.pet, data: formattedDate, serviciu: kinds[reminder.kind][language] };
  const fill = template => template.replace(/\{\{([a-z]+)\}\}/g, (_, name) => variables[name]);
  return {
    endpoint: 'https://api.resend.com/emails',
    idempotencyKey: `vet-reminder/${reminder.id}/${reminder.revision}`,
    body: {
      from: `${settings.senderName} <${settings.fromEmail}>`,
      to: [reminder.email],
      reply_to: settings.replyTo,
      subject: fill(settings.templates[language].subject),
      text: fill(settings.templates[language].body),
    },
  };
}
