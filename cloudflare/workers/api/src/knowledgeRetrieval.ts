import { SERVICE_COMMERCIAL_SOURCES } from "../../../../src/data/serviceCommercialSources";

export type KnowledgeEntry={id:string;category:string;language:string;question:string;answer:string;keywords:string;priority:number;source:string;agent_slug:string|null};
export type KnowledgeMatch={entry:KnowledgeEntry;exact:boolean;score:number};
export const normalizeQuestion=(text:string)=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').trim().replace(/\s+/g,' ');
const stop=new Set(['si','sau','care','este','sunt','pentru','vreau','cum','the','and','what','how','with','your','you','can']);
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
const catalogStop = new Set([...stop, "cat", "costa", "cost", "pret", "price", "much", "does", "un", "o", "a", "de", "la", "in", "do", "ati", "aveti", "oferiti", "servicii", "produse"]);
const catalogTerms = (question: string) => [...new Set(normalizeQuestion(question).split(" ").filter((word) => word.length > 2 && !catalogStop.has(word)))].slice(0, 10);
const catalogScore = (terms: string[], content: string) => {
  const words = new Set(normalizeQuestion(content).split(" "));
  return terms.length ? terms.filter((term) => words.has(term)).length / terms.length : 0;
};
const money = (minor: number, language: string) => `${new Intl.NumberFormat(language === "en" ? "en-GB" : "ro-RO").format(minor / 100)} RON`;

/** Only published catalogue rows and explicitly approved public documents may reach a public chat. */
export async function retrievePublicSources(db: D1Database, language: string, question: string): Promise<KnowledgeMatch[]> {
  const terms = catalogTerms(question);
  const browseProducts = !terms.length && /\b(produse|catalog|products|catalogue)\b/.test(normalizeQuestion(question));
  if (!terms.length && !browseProducts) return [];
  const services: KnowledgeMatch[] = SERVICE_COMMERCIAL_SOURCES.map((service) => {
    const price = service.base_price_minor === null
      ? (language === "en" ? "Price is confirmed after an audit." : "Prețul se stabilește după audit.")
      : (language === "en" ? `Starting at ${money(service.base_price_minor, language)}.` : `Preț de pornire: ${money(service.base_price_minor, language)}.`);
    const answer = `${service.display_name}. ${price}`;
    const entry: KnowledgeEntry = { id: `service:${service.entity_key}`, category: "servicii", language, question: service.display_name, answer, keywords: catalogAliases[service.entity_key] || "", priority: 10, source: "public-service-catalog", agent_slug: null };
    return { entry, exact: false, score: catalogScore(terms, `${entry.question} ${entry.keywords}`) };
  }).filter((match) => match.score >= 0.5);

  const products = await db.prepare(
    `SELECT slug,type,access,price_ron_cents,name_ro,name_en FROM product_items WHERE status='live' AND released_at<=? ORDER BY name_ro LIMIT 250`,
  ).bind(Date.now()).all<{slug:string;type:string;access:string;price_ron_cents:number|null;name_ro:string;name_en:string}>();
  const productMatches: KnowledgeMatch[] = products.results.map((product) => {
    const name = language === "en" ? product.name_en : product.name_ro;
    const detail = product.price_ron_cents === null
      ? (language === "en" ? "Check availability in the product catalogue." : "Verifică disponibilitatea în catalogul de produse.")
      : (language === "en" ? `Listed price: ${money(product.price_ron_cents, language)}.` : `Preț afișat: ${money(product.price_ron_cents, language)}.`);
    const entry: KnowledgeEntry = { id: `product:${product.slug}`, category: "produse", language, question: name, answer: `${name}. ${detail}`, keywords: `${product.slug} ${product.type} ${product.access}`, priority: 8, source: "live-product-catalog", agent_slug: null };
    return { entry, exact: false, score: catalogScore(terms, `${name} ${product.slug}`) };
  }).filter((match) => match.score >= 0.5);
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

  return [...services, ...productMatches, ...documentMatches].sort((a,b) => b.score-a.score || b.entry.priority-a.entry.priority).slice(0, 4);
}
