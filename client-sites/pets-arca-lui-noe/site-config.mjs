import { clinic, copy } from './content.mjs';

export const siteDefaults = {
  clinic: {
    name: clinic.name,
    phone: clinic.phone,
    tel: clinic.tel,
    email: clinic.email,
    city: clinic.city,
    street: 'Str. Călărași nr. 18',
    weekdays: '09:00–17:00',
    saturday: '09:00–13:00',
    sunday: '',
    whatsapp: true,
    image: 'veterinar',
  },
  locales: Object.fromEntries(Object.entries(copy).map(([language, text]) => [language, {
    heroTitle: text.hero[1],
    heroAccent: text.hero[2],
    heroDescription: text.hero[3],
    bookingLabel: text.booking,
    servicesTitle: text.serviceHead[1],
    servicesDescription: text.serviceHead[2],
    services: text.services.map(([, title, description, preparation]) => ({
      title, description, preparation,
    })),
    visitTitle: text.visitHead[1],
    visitDescription: text.visitHead[2],
    reminderTitle: text.reminder[1],
    reminderDescription: text.reminder[2],
    contactTitle: text.contactHead[1],
    contactDescription: text.contactHead[2],
    faq: text.faq.map(([question, answer]) => ({ question, answer })),
    announcement: '',
    seoTitle: '',
    seoDescription: '',
  }])),
};
