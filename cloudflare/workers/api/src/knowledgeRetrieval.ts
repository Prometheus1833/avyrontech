import {websitePlans} from "./websiteSubscriptionPlans";
import {WEBSITE_SUBSCRIPTION_PATH} from "../../../../src/shared/websiteSubscriptions";
import { normalizeQuestion, explicitProduct, projectQuestion, serviceKeys } from "./publicChatCommerce";
export { normalizeQuestion } from "./publicChatCommerce";
import { SERVICE_COMMERCIAL_SOURCES } from "../../../../src/data/serviceCommercialSources";

export type KnowledgeEntry={id:string;category:string;language:string;question:string;answer:string;keywords:string;priority:number;source:string;agent_slug:string|null};
export type KnowledgeMatch={entry:KnowledgeEntry;exact:boolean;score:number};
const stop=new Set(['si','sau','care','este','sunt','pentru','vreau','cum','the','and','what','how','with','your','you','can','cat','costa','cost','costs','pret','pretul','preturi','price','pricing','tarif','much']);
export async function retrieveKnowledge(db:D1Database,agentSlug:string,language:string,question:string) {
 const terms=[...new Set(normalizeQuestion(question).split(' ').filter(word=>word.length>2&&!stop.has(word)))].slice(0,12);
 if(!terms.length)return [];
 const {results}=await db.prepare(`SELECT knowledge.id,knowledge.category,knowledge.language,knowledge.question,knowledge.answer,knowledge.keywords,knowledge.priority,knowledge.source,knowledge.agent_slug
   FROM ai_knowledge_fts JOIN ai_knowledge knowledge ON knowledge.rowid=ai_knowledge_fts.rowid
   WHERE ai_knowledge_fts MATCH ? AND knowledge.status='active'
     AND (knowledge.agent_slug IS NULL OR knowledge.agent_slug=?) AND (knowledge.language=? OR knowledge.language='ro')
     AND (knowledge.review_after IS NULL OR knowledge.review_after>?)
   ORDER BY bm25(ai_knowledge_fts,5,1,3),knowledge.priority DESC LIMIT 20`)
   .bind(terms.map(term=>`"${term}"`).join(' OR '),agentSlug,language,Date.now()).all<KnowledgeEntry>();
 return results.map(entry=>{
   const words=new Set(normalizeQuestion(`${entry.question} ${entry.keywords} ${entry.answer.slice(0,1200)}`).split(' '));
   const exact=normalizeQuestion(entry.question)===normalizeQuestion(question);
   return {entry,exact,score:exact?1:Math.min(0.95,terms.filter(term=>words.has(term)).length/terms.length)};
 }).sort((a,b)=>Number(b.exact)-Number(a.exact)||b.score-a.score||b.entry.priority-a.entry.priority).slice(0,4);
}
export function boundedKnowledgeContext(matches:{entry:KnowledgeEntry}[],limit=6000) {
 let remaining=limit;const chunks:string[]=[];
 for(const {entry} of matches){const chunk=`[${entry.id}] ${entry.question}\n${entry.answer}`.slice(0,Math.min(2200,remaining));if(!chunk)break;chunks.push(chunk);remaining-=chunk.length+2;}
 return chunks.join('\n\n');
}

const catalogAliases: Record<string, string> = {
  "premium-website": "site website web prezentare pagina",
  "logo-3d": "logo identitate brand",
  "social-identity": "social media instagram facebook identitate branding",
  "online-store": "magazin online ecommerce shop",
  apps: "aplicatie aplicatii app web mobil mobile software",
  "ai-agent": "agent ai chatbot asistent bot automatizare",
  audit: "audit site website analiza",
  "qa-testing": "testare qa verificare bug",
  "blog-profesional": "blog content hub articole",
};
const catalogStop = new Set([...stop, "cat", "costa", "cost", "pret", "price", "much", "does", "un", "o", "a", "de", "la", "in", "do", "ati", "aveti", "oferiti", "servicii", "produse", "produs", "produsul", "produsele", "product", "products", "proiect", "proiectul", "proiecte", "project", "projects", "pretul", "preturi", "buget", "costul", "costi", "dezvoltare", "development", "cat", "costa"]);
const catalogTerms = (question: string) => [...new Set(normalizeQuestion(question).split(" ").filter((word) => word.length > 2 && !catalogStop.has(word)))].slice(0, 10);
const catalogScore = (terms: string[], content: string) => {
  const words = new Set(normalizeQuestion(content).split(" "));
  return terms.length ? terms.filter((term) => words.has(term)).length / terms.length : 0;
};
const money = (minor: number, language: string, currency = "RON") => `${new Intl.NumberFormat(language === "en" ? "en-GB" : "ro-RO").format(minor / 100)} ${currency}`;
type CatalogRow = { entity_type: string; entity_key: string; base_price_minor: number | null; currency: string; price_model: string; billing_cycle: string; active: number };
function priceDetail(minor: number | null, language: string, currency: string, model: string, cycle: string) {
  if (minor === null || !["fixed", "starting_at"].includes(model)) return language === "en" ? "The price is confirmed in a tailored proposal." : "Prețul se confirmă printr-o ofertă personalizată.";
  const period = cycle === "monthly" ? (language === "en" ? " / month" : " / lună") : cycle === "annual" ? (language === "en" ? " / year" : " / an") : "";
  return `${model === "starting_at" ? (language === "en" ? "Starting at" : "Preț de pornire:") : (language === "en" ? "Listed price:" : "Preț afișat:")} ${money(minor, language, currency)}${period}.${model === "starting_at" ? (language === "en" ? " The final quote depends on the agreed scope." : " Oferta finală depinde de configurația agreată.") : ""}`;
}

/** Only published catalogue rows and explicitly approved public documents may reach a public chat. */
export async function retrievePublicSources(db: D1Database, language: string, question: string): Promise<KnowledgeMatch[]> {
  const terms = catalogTerms(question);
  const browseProducts = !terms.length && /\b(produse|catalog|products|catalogue)\b/.test(normalizeQuestion(question));
  if (!terms.length && !browseProducts) return [];
  const selectedServices = serviceKeys(question);
  const productIntent = explicitProduct(question);
  const codes = (await db.prepare("SELECT entity_type,entity_key,base_price_minor,currency,price_model,billing_cycle,active FROM commercial_catalog_codes WHERE entity_type='service' OR (entity_type='product' AND entity_key IN (SELECT slug FROM product_items WHERE status='live' AND released_at<=? ORDER BY name_ro LIMIT 250))").bind(Date.now()).all<CatalogRow>()).results;
  const configured = new Map(codes.map(row => [`${row.entity_type}:${row.entity_key}`, row]));
  // Only known public service identities are eligible; an internal accounting
  // code alone is not permission to publish a new service or its staff label.
  const serviceSources = SERVICE_COMMERCIAL_SOURCES.filter(service => !service.entity_key.startsWith("website-sub-"));
  const services: KnowledgeMatch[] = productIntent ? [] : serviceSources.flatMap((service) => {
    const code = configured.get(`service:${service.entity_key}`);
    if (code && !code.active) return [];
    const name = service.display_name;
    if (selectedServices.length && !selectedServices.some(key => key === service.entity_key || serviceKeys(name).includes(key))) return [];
    const model = code ? code.price_model : "price_model" in service ? service.price_model : service.base_price_minor === null ? "quote" : "starting_at";
    const cycle = code ? code.billing_cycle : "billing_cycle" in service ? service.billing_cycle : "one_time";
    // An explicit null/unreviewed value in D1 must never fall back to an old price.
    const detail = priceDetail(code ? code.base_price_minor : service.base_price_minor, language, code?.currency || "RON", model, cycle);
    const entry: KnowledgeEntry = { id: `service:${service.entity_key}`, category: "servicii", language, question: name, answer: `${name}. ${detail}`, keywords: catalogAliases[service.entity_key] || "", priority: 10, source: "public-service-catalog", agent_slug: null };
    const score = selectedServices.includes(service.entity_key) ? 1 : catalogScore(terms, `${entry.question} ${entry.keywords}`);
    return score >= 0.5 ? [{ entry, exact: false, score }] : [];
  });

  // Discovery is contextual, not part of the general services directory. Keep
  // monthly plans out of ambiguous one-time website price answers.
  if(selectedServices.includes("website-subscription")) {
    const plans=await websitePlans(db);
    const detail=plans.map(p=>`${p.name}: ${p.available&&p.priceMinor!==null?`${money(p.priceMinor,language)} / ${language==="en"?"month":"lună"}`:language==="en"?"request a monthly quote":"solicită oferta lunară"}`).join("; ");
    const answer=language==="en"?`Website subscription: bespoke development is included at 0 RON; the monthly subscription is paid. The client provides the main domain. ${detail}. Details: ${WEBSITE_SUBSCRIPTION_PATH.en}. Terms require explicit acceptance; no automatic twelve-month commitment is implied.`:`Website la 0 lei: dezvoltare personalizată inclusă — 0 lei; abonamentul lunar este contra cost. Clientul furnizează domeniul principal. ${detail}. Detalii: ${WEBSITE_SUBSCRIPTION_PATH.ro}. Termenii se acceptă explicit; ciclul de 12 luni nu presupune automat o perioadă obligatorie.`;
    services.push({entry:{id:"service:website-subscription",category:"servicii",language,question:language==="en"?"Website subscription":"Website la 0 lei",answer,keywords:"site website abonament subscription",priority:11,source:"public-service-catalog",agent_slug:null},exact:false,score:1});
  }

  const products = await db.prepare(
    `SELECT slug,type,access,price_ron_cents,name_ro,name_en FROM product_items WHERE status='live' AND released_at<=? ORDER BY name_ro LIMIT 250`,
  ).bind(Date.now()).all<{slug:string;type:string;access:string;price_ron_cents:number|null;name_ro:string;name_en:string}>();
  const productMatches: KnowledgeMatch[] = selectedServices.length || (projectQuestion(question) && !productIntent) ? [] : products.results.flatMap((product) => {
    const name = language === "en" ? product.name_en : product.name_ro;
    const code = configured.get(`product:${product.slug}`);
    if (code && !code.active) return [];
    const detail = priceDetail(code ? code.base_price_minor : product.price_ron_cents, language, code?.currency || "RON", code?.price_model || "fixed", code?.billing_cycle || "one_time");
    const entry: KnowledgeEntry = { id: `product:${product.slug}`, category: "produse", language, question: name, answer: `${name}. ${detail}`, keywords: `${product.slug} ${product.type} ${product.access}`, priority: 8, source: "live-product-catalog", agent_slug: null };
    const score = catalogScore(terms, `${name} ${product.slug}`);
    const nameWords = new Set(normalizeQuestion(`${name} ${product.slug}`).split(" "));
    const identified = productIntent || normalizeQuestion(question).includes(normalizeQuestion(name)) || terms.filter(term => nameWords.has(term)).length >= 2;
    return score >= 0.5 && identified ? [{ entry, exact: false, score }] : [];
  });

  if (browseProducts && products.results.length) {
    const examples = products.results.slice(0, 5).map((product) => language === "en" ? product.name_en : product.name_ro).join(", ");
    const answer = language === "en"
      ? `${products.results.length} products are currently published. Examples: ${examples}. Explore the full catalogue at /produse.`
      : `${products.results.length} produse sunt publicate acum. Exemple: ${examples}. Vezi catalogul complet la /produse.`;
    productMatches.push({ entry: { id: "product:catalog", category: "produse", language, question: language === "en" ? "Available products" : "Produse disponibile", answer, keywords: "catalog produse", priority: 9, source: "live-product-catalog", agent_slug: null }, exact: false, score: 1 });
  }

  const documents = await db.prepare(
    `SELECT document.id,document.title,document.content_text
       FROM knowledge_documents document
       JOIN knowledge_sources source ON source.id=document.source_id
       LEFT JOIN source_connections connection ON connection.id=source.connection_id
      WHERE document.status='approved' AND document.visibility='public' AND document.organization_id IS NULL
        AND document.language=? AND source.status='active' AND source.visibility='public'
        AND source.organization_id IS NULL AND source.trust_level='verified'
        AND (source.connection_id IS NULL OR connection.status='active')
      ORDER BY document.updated_at DESC LIMIT 100`,
  ).bind(language).all<{id:string;title:string;content_text:string}>();
  const documentMatches: KnowledgeMatch[] = documents.results.map((document) => {
    const score = catalogScore(terms, `${document.title} ${document.content_text.slice(0, 4000)}`);
    const entry: KnowledgeEntry = { id: `document:${document.id}`, category: "document", language, question: document.title, answer: document.content_text.slice(0, 2200), keywords: "", priority: 7, source: "approved-public-document", agent_slug: null };
    return { entry, exact: false, score };
  }).filter((match) => match.score >= 0.5);

  const namedProducts = productMatches.filter(match => {
    const q = normalizeQuestion(question);
    const name = normalizeQuestion(match.entry.question);
    const slug = normalizeQuestion(match.entry.id.slice("product:".length));
    return q.includes(name) || (slug.includes(" ") && q.includes(slug));
  });
  return [...services, ...(namedProducts.length ? namedProducts : productMatches), ...documentMatches].sort((a,b) => b.score-a.score || b.entry.priority-a.entry.priority).slice(0, 4);
}
