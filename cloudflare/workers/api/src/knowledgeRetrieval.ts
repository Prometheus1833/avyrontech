export type KnowledgeEntry={id:string;category:string;language:string;question:string;answer:string;keywords:string;priority:number;source:string;agent_slug:string|null};
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
