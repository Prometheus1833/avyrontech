import { SERVICE_PAGES } from '../../../../src/shared/servicePagePolicy';
import { WEBSITE_SUBSCRIPTION_PATH } from '../../../../src/shared/websiteSubscriptions';
import type { KnowledgeMatch } from './knowledgeRetrieval';
import { lastConversationTopic } from './publicConversation';

export const normalizeQuestion = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ');
export const asksPrice = (text: string) => /\b(pret(?:ul|uri|urile)?|costa|cost(?:ul|uri|urile|s)?|tarif(?:ul|e|ele)?|buget(?:ul)?|estimare|price|pricing|budget|quote|quotation|how much)\b/.test(normalizeQuestion(text));
export function explicitProduct(text: string) {
  const q = normalizeQuestion(text);
  const product = q.search(/\b(produs(?:ul|e|ele)?|products?|component[ae]?|templates?|sablon(?:ul|e)?|efect(?:e|ul)?|artefacte?|widgets?|plugins?|calculator(?:ul)?|tools?|unelte?)\b/);
  const service = q.search(/\b(site|siteul|website|magazin|aplicatie|aplicatii|logo)\b/);
  // A website with a plugin is a development request; a template for a website is a product.
  return product >= 0 && (service < 0 || product < service);
}
export const projectQuestion = (text: string) => /\b(proiect(?:ul(?:ui)?|e(?:le|lor)?)?|projects?|servici(?:u|ul|i|ile)|dezvoltare|development|afacere|business)\b/.test(normalizeQuestion(text));

/** Explicit entities win over generic word overlap ("web" is not four different services). */
export function serviceKeys(text: string): string[] {
  const q = normalizeQuestion(text);
  if (explicitProduct(q)) return [];
  if (/\b(website|site|web)\b/.test(q) && (/\b(abonament(?:e|ul)?|subscriptions?|0 lei|zero lei)\b/.test(q) || (/\b(gratuit|gratis|free)\b/.test(q) && !/\b(audit|seo|qa|testare)\b/.test(q)))) return ['website-subscription'];
  const found: string[] = [];
  const rules: Array<[string, RegExp]> = [
    ['online-store', /\b(magazin(?:ul|e)?|ecommerce|commerce|shop|store)\b/],
    ['apps', /\b(aplicati[aei]|aplicatii|applications?|apps?|software|platform[ae])\b/],
    ['logo-3d', /\b(logo|sigla|logoul|logo?uri)\b/],
    ['social-identity', /\b(social|instagram|facebook|tiktok)\b/],
    ['seo-ai', /\b(seo|visibility|vizibilitate)\b/],
    ['marketing-ads', /\b(ads|publicitate|marketing|campanii|campaigns?)\b/],
    ['ai-agent', /\b(automatizari|automatizare|automations?|chatbots?|agent(?:i|ul|ii)? ai|ai agents?|inteligenta artificiala|artificial intelligence)\b/],
    ['qa-testing', /\b(qa|testare|testing)\b/],
    ['audit', /\b(audit|evaluare)\b/],
    ['blog-profesional', /\b(blog|blogul)\b/],
    ['maintenance', /\b(mentenanta|maintenance|hosting|sla)\b/],
  ];
  for (const [key, pattern] of rules) if (pattern.test(q)) found.push(key);
  if (found.includes('seo-ai') && found.includes('ai-agent')) found.splice(found.indexOf('ai-agent'), 1);
  if (/\b(prezentare|presentation)\b/.test(q) || (!found.some(key => ['apps', 'online-store', 'audit', 'qa-testing'].includes(key)) && /\b(site|siteul|website|websites?)\b/.test(q))) found.unshift('premium-website');
  return [...new Set(found)];
}

export function commercialContext(message: string, history: { role: string; content: string }[], page?: string) {
  let question = message;
  let keys = serviceKeys(message);
  let product = explicitProduct(message);
  const previous = history.filter(item => item.role === 'user').slice(-3);
  const shortSelection = /^(?:(?:si|dar|pentru|and|for|what about) )?(?:(?:un|o|a|an|the) )?(?:site(?: de prezentare)?|website(?: de prezentare)?|magazin online|online store|aplicatie(?: mobila)?|mobile app|logo(?: 3d)?|seo|ads|mentenanta|maintenance|abonament|produs|produsul)$/.test(normalizeQuestion(message));
  const projectBrief = !message.includes('?') && /^(?:(?:vreau|as vrea|i want|i need) )?(?:un|o|a|an) (?:site|website|magazin|online store|aplicatie|app|mobile app|logo)\b/.test(normalizeQuestion(message));
  const price = asksPrice(message) || ((shortSelection || projectBrief) && Boolean(keys.length || product) && previous.length > 0 && asksPrice(previous.at(-1)!.content));
  const genericProject = projectQuestion(message) && !keys.length && !product;
  const priceWords = new Set(['si','cat','costa','how','much','does','it','cost','care','este','e','pretul','pret','price','what','is','the','and','dar','but','aproximativ','roughly','cam','un','o','de','la','voi','acum','aici','here','now','buget','bugetul']);
  const elliptical = normalizeQuestion(message).split(' ').every(word => priceWords.has(word));
  const reference = /\b(acesta|aceasta|asta|acelasi|aceeasi|proiectul|proiectului|this|that|it|same)\b/.test(normalizeQuestion(message));
  if (!keys.length && !product && (reference || (asksPrice(message) && elliptical))) {
    const prior = lastConversationTopic(previous);
    if (prior && (serviceKeys(prior).length || (!genericProject && explicitProduct(prior))) && !/\b(nou|noua|new|alt|alta|another)\b/.test(normalizeQuestion(message))) {
      question = `${prior} ${message}`;
      keys = serviceKeys(prior);
      product = explicitProduct(prior);
    } else if (!prior && !genericProject) {
      const path = (page || '').split(/[?#]/, 1)[0].replace(/\/+$/, '');
      if (Object.values(WEBSITE_SUBSCRIPTION_PATH).some(value => value === path)) {
        question += ' website abonament'; keys = ['website-subscription'];
      } else {
        const entry = SERVICE_PAGES.find(entry => entry.key !== 'overview' && (entry.ro === path || entry.en === path));
        if (entry) { question += ` ${entry.name}`; keys = [entry.key]; }
        else if (/^\/(?:produse|en\/products)(?:\/|$)/.test(path)) {
          const slug = path.match(/^\/(?:produse|en\/products)\/[a-z0-9-]+\/([a-z0-9-]+)$/)?.[1];
          question += ` produs ${slug ? slug.replace(/-/g, ' ') : ''}`; product = true;
        }
      }
    }
  }
  const commercial = keys.length > 0 || product || projectQuestion(message) || /\b(avyron|oferte?|pricing)\b/.test(normalizeQuestion(message)) || /^(cat (?:m ar )?costa|care (?:e|este) pretul|ce pret|how much|what (?:is the )?price)$/.test(normalizeQuestion(message));
  return { question, keys, product, price: price && commercial };
}

export function clarifyPrice(language: string, product = false, keys: string[] = []) {
  if (product) return language === 'en'
    ? 'Happy to help. Which digital product do you mean? Share its name or catalogue link so I can check the right price.'
    : 'Sigur, te ajut. La ce produs digital te referi? Spune-mi denumirea sau trimite linkul din catalog, ca să verific prețul potrivit.';
  if (keys.includes('maintenance')) return language === 'en'
    ? 'We can work out the right maintenance plan for your project. I cannot confirm a tariff without its scope. Which website or application needs support, and what should the monthly care cover?'
    : 'Putem stabili planul de mentenanță potrivit proiectului tău. Tariful se confirmă în funcție de ce trebuie acoperit. Pentru ce site sau aplicație ai nevoie de suport și ce ai vrea să includă mentenanța lunară?';
  return language === 'en'
    ? 'Happy to help you find a useful starting point. Are you planning a business website, an online store, an app or something else? Tell me what you want to build and the main thing it should do; then we can look at the relevant catalogue price and what affects the final quote.'
    : 'Sigur, te ajut să conturăm un buget potrivit. Te gândești la un site de prezentare, un magazin online, o aplicație sau alt tip de proiect? Spune-mi pe scurt ce vrei să construim și care ar fi funcția principală; apoi îți pot indica reperul relevant din catalog și ce influențează oferta finală.';
}

export function priceReply(matches: KnowledgeMatch[], language: string, question = "") {
  const relevant = matches.filter(match => ['servicii', 'produse'].includes(match.entry.category));
  if (!relevant.length) return null;
  const lines = relevant.slice(0, 3).map(match => match.entry.answer).join('\n\n');
  const keys = relevant.map(match => match.entry.id);
  const q = normalizeQuestion(question);
  const followup = keys.includes('service:premium-website')
    ? /\b(programari|bookings?|calendar)\b/.test(q)
      ? (language === 'en' ? 'Do you already have a booking platform to integrate, or do you need a new booking flow?' : 'Ai deja o platformă de programări pe care vrei s-o integrăm sau ai nevoie de un flux nou?')
      : /\b(salon|clinica|cabinet|restaurant|afacerea)\b/.test(q)
        ? (language === 'en' ? 'Roughly how many pages and languages do you need for the first version?' : 'Aproximativ câte pagini și în ce limbi ai nevoie pentru prima versiune?')
        : (language === 'en' ? 'What does your business do, and should the website mainly bring enquiries, bookings or sales?' : 'Cu ce se ocupă afacerea ta și ce ai vrea să obții prin site: cereri de ofertă, programări sau vânzări?')
    : keys.includes('service:online-store')
      ? (language === 'en' ? 'Roughly how many products will you sell, and which payment or delivery integrations do you need?' : 'Aproximativ câte produse vei vinde și ce integrări de plată sau livrare ai nevoie?')
      : keys.includes('service:apps')
        ? (language === 'en' ? 'What should users be able to do in the first version of your app?' : 'Ce ar trebui să poată face utilizatorii în prima versiune a aplicației?')
        : relevant.every(match => match.entry.category === 'produse')
          ? (language === 'en' ? 'Would you like help checking whether this product fits your project?' : 'Vrei să verificăm dacă acest produs se potrivește proiectului tău?')
          : (language === 'en' ? 'What would you like this service to achieve for your business?' : 'Ce rezultat ai vrea să obții pentru afacerea ta prin acest serviciu?');
  return `${language === 'en' ? 'Here is the relevant catalogue information:' : 'Îți pot da următorul reper din catalog:'}\n\n${lines}\n\n${followup}`;
}

/** Currency-aware facts: a model cannot silently turn a 50 RON product into a project quote. */
const moneyKey = (amount: string, symbol: string) => {
  const value = amount.trim().replace(/[\s\u00a0]/g, '').replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const currency = /^(ron|lei|leu)$/i.test(symbol) ? 'RON' : /^(eur|euros?|€)$/i.test(symbol) ? 'EUR' : /^(gbp|pounds?|£)$/i.test(symbol) ? 'GBP' : /^chf$/i.test(symbol) ? 'CHF' : 'USD';
  return `${Number(value)}:${currency}`;
};
export function monetaryFacts(text: string): string[] {
  const suffix = [...text.matchAll(/([+-]?\d+(?:[.,\s\u00a0]\d+)*)(?:\s+de)?\s*(RON|lei|leu|EUR|euros?|USD|dollars?|GBP|pounds?|CHF|€|£|\$)(?=\b|\s|[.,;!?/)]|$)/gi)].map(match => moneyKey(match[1], match[2]));
  const prefix = [...text.matchAll(/(?:\b(RON|EUR|USD|GBP|CHF)|([€£$]))\s*([+-]?\d+(?:[.,\s\u00a0]\d+)*)/gi)].map(match => moneyKey(match[3], match[1] || match[2]));
  const ranges = [...text.matchAll(/([+-]?\d+(?:[.,]\d+)*)\s*(?:[-–—]|to|and|si|și)\s*([+-]?\d+(?:[.,]\d+)*)\s*(RON|lei|leu|EUR|euros?|USD|dollars?|GBP|pounds?|CHF|€|£|\$)(?=\b|\s|[.,;!?/)]|$)/gi)].flatMap(match => [moneyKey(match[1], match[3]), moneyKey(match[2], match[3])]);
  return [...suffix, ...prefix, ...ranges];
}
export function groundedMoney(reply: string, context: string) {
  // Catalogue amounts are numeric. Written-out amounts cannot be checked
  // reliably, so retain the verified catalogue answer instead of guessing.
  const numberWords = 'zero|un|unu|o|doi|doua|trei|patru|cinci|sase|sapte|opt|noua|zece|unsprezece|doisprezece|douazeci|treizeci|patruzeci|cincizeci|saizeci|saptezeci|optzeci|nouazeci|suta|sute|mie|mii|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|hundred|thousand|si|and';
  const writtenAmount = new RegExp(`\\b(?:${numberWords})(?: +(?:${numberWords})){0,10} +(?:de +)?(?:lei|leu|ron|eur|euros?|usd|dollars?|gbp|pounds?|chf)\\b`, 'i');
  if (writtenAmount.test(normalizeQuestion(reply))) return false;
  const allowed = new Set(monetaryFacts(context));
  return monetaryFacts(reply).every(fact => allowed.has(fact));
}
