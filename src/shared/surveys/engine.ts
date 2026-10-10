import { z } from 'zod';

export const fieldTypes = ['short','long','email','phone','url','number','currency','date','single','multi','yesno','dropdown','scale','rating','ranking','matrix','color','image-select','file','files','image','logo','document','consent','info'] as const;
export type FieldType = typeof fieldTypes[number];
export type Answers = Record<string, unknown>;
export const conditionSchema = z.object({ field: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/), op: z.enum(['eq','ne','includes','gt','lt','answered']), value: z.union([z.string(), z.number(), z.boolean()]).optional() }).strict();
export const ruleSchema = z.object({ action:z.enum(['SHOW IF','HIDE IF','REQUIRE IF','SKIP IF','RECOMMEND IF','BRANCH','DEPENDS ON','REPEAT']), when:z.array(conditionSchema).min(1).max(12), message:z.string().max(300).optional(), target:z.string().max(64).optional() }).strict();
export const questionSchema = z.object({
 id:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/), section:z.string().max(64), type:z.enum(fieldTypes), label:z.string().min(1).max(240), help:z.string().max(700).default(''),
 required:z.boolean().default(false), importance:z.enum(['critical','recommended','optional']).default('recommended'), options:z.array(z.string().min(1).max(120)).max(40).default([]), rows:z.array(z.string().min(1).max(120)).max(20).default([]),
 imageUrls:z.record(z.string(),z.string().refine(v=>/^\/assets\/[^?#]+$/.test(v)||/^https:\/\/(?:www\.)?avyron\.ro\/assets\/[^?#]+$/.test(v),'Folosește imagini din biblioteca publică AVYRON.')).optional(),
 min:z.number().optional(), max:z.number().optional(), rules:z.array(ruleSchema).max(20).default([]), repeat:z.object({source:z.string().max(64),max:z.number().int().min(1).max(20)}).optional(),
}).strict();
export const templateSchema = z.object({ title:z.string().min(2).max(160), description:z.string().max(600), service:z.string().max(80), sections:z.array(z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),title:z.string().min(1).max(100)}).strict()).min(1).max(20), questions:z.array(questionSchema).min(1).max(150) }).strict().superRefine((t,ctx)=>{
 const ids = new Set(t.questions.map(q=>q.id)); const sections=new Set(t.sections.map(s=>s.id));
 if(ids.size!==t.questions.length||sections.size!==t.sections.length)ctx.addIssue({code:'custom',message:'Identificatori duplicați.'});
 const edges=new Map<string,string[]>();
 for(const q of t.questions){
  if(!sections.has(q.section))ctx.addIssue({code:'custom',message:`Secțiune necunoscută: ${q.id}`});
  const deps=q.rules.flatMap(r=>r.when.map(w=>w.field)); if(q.repeat)deps.push(q.repeat.source);
  if(deps.some(d=>!ids.has(d)||d===q.id))ctx.addIssue({code:'custom',message:`Dependență invalidă: ${q.id}`});
  if(q.rules.some(r=>r.action==='BRANCH'&&(!r.target||!sections.has(r.target))))ctx.addIssue({code:'custom',message:`Ramură invalidă: ${q.id}`});
  if(q.rules.some(r=>r.action==='REPEAT')&&!q.repeat)ctx.addIssue({code:'custom',message:`Configurează repetarea: ${q.id}`});
  if(['single','multi','dropdown','image-select','ranking','matrix'].includes(q.type)&&!q.options.length)ctx.addIssue({code:'custom',message:`Lipsesc opțiunile: ${q.id}`});
  if(q.type==='matrix'&&!q.rows.length)ctx.addIssue({code:'custom',message:`Lipsesc rândurile: ${q.id}`});
  if(q.min!==undefined&&q.max!==undefined&&q.min>q.max)ctx.addIssue({code:'custom',message:`Limite invalide: ${q.id}`});
  edges.set(q.id,deps);
 }
 const done=new Set<string>(), visiting=new Set<string>();
 const visit=(id:string):boolean=>{if(visiting.has(id))return false;if(done.has(id))return true;visiting.add(id);for(const d of edges.get(id)||[])if(!visit(d))return false;visiting.delete(id);done.add(id);return true;};
 if(t.questions.some(q=>!visit(q.id)))ctx.addIssue({code:'custom',message:'Regulile conțin dependențe circulare.'});
});
export type SurveyTemplate = z.infer<typeof templateSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export const empty = (v:unknown):boolean=>v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length);
export function matches(c:Condition,a:Answers):boolean {
 const value=a[c.field];
 if(c.op==='answered')return !empty(value);
 if(c.op==='eq')return value===c.value;
 if(c.op==='ne')return !empty(value)&&value!==c.value;
 if(c.op==='includes')return Array.isArray(value)&&value.includes(c.value);
 if(c.op==='gt')return typeof value==='number'&&typeof c.value==='number'&&value>c.value;
 if(c.op==='lt')return typeof value==='number'&&typeof c.value==='number'&&value<c.value;
 return false;
}
const active=(rule:z.infer<typeof ruleSchema>,a:Answers)=>rule.when.every(c=>matches(c,a));
function visible(q:Question,a:Answers){return q.rules.every(r=>['SHOW IF','DEPENDS ON'].includes(r.action)?active(r,a):['HIDE IF','SKIP IF'].includes(r.action)?!active(r,a):true);}
export function surveyPath(t:SurveyTemplate,raw:Answers):Question[]{
 // Resolve upstream visibility first, so a hidden answer cannot activate descendants.
 const a={...raw},resolved=new Set<string>();
 const resolve=(q:Question)=>{if(resolved.has(q.id))return;for(const id of q.rules.flatMap(r=>r.when.map(c=>c.field))){const dependency=t.questions.find(x=>x.id===id);if(dependency)resolve(dependency);}resolved.add(q.id);if(!visible(q,a))delete a[q.id];};
 t.questions.forEach(resolve);
 let list=t.questions.filter(q=>visible(q,a));
 for(const q of list){for(const r of q.rules)if(r.action==='BRANCH'&&active(r,a)&&r.target){const from=t.sections.findIndex(s=>s.id===q.section),to=t.sections.findIndex(s=>s.id===r.target);if(to>from)list=list.filter(x=>{const n=t.sections.findIndex(s=>s.id===x.section);return n<=from||n>=to;});}}
 return list.flatMap(q=>{
  const repeat=q.repeat; if(!repeat||q.rules.some(r=>r.action==='REPEAT'&&!active(r,a)))return [q];
  const source=a[repeat.source];const labels=Array.isArray(source)?source:typeof source==='number'?Array.from({length:Math.min(repeat.max,Math.max(0,Math.floor(source)))},(_,i)=>String(i+1)):[];
  return labels.slice(0,repeat.max).map((label,i)=>({...q,id:`${q.id}__${i}`,label:`${q.label} · ${String(label).slice(0,120)}`,repeat:undefined}));
 });
}
export const required=(q:Question,a:Answers)=>q.required||q.rules.some(r=>r.action==='REQUIRE IF'&&active(r,a));
export const recommendation=(q:Question,a:Answers)=>q.rules.filter(r=>r.action==='RECOMMEND IF'&&active(r,a)).map(r=>r.message).filter(Boolean).join(' ');
export const uploadTypes:readonly string[]=['file','files','image','logo','document'];
export function answerError(q:Question,v:unknown,a:Answers):string|null{
 if(q.type==='info')return null;
 if(empty(v))return required(q,a)?'Completează acest răspuns.':null;
 if(q.type==='consent')return v===true?null:'Confirmă pentru a continua.';
 if(q.type==='yesno')return typeof v==='boolean'?null:'Alege Da sau Nu.';
 if(uploadTypes.includes(q.type))return Array.isArray(v)&&v.length<=(q.type==='files'?10:1)&&v.every(x=>typeof x==='string'&&/^[a-z0-9_-]{8,100}$/i.test(x))?null:'Fișier invalid.';
 if(['multi','ranking'].includes(q.type)){if(!Array.isArray(v)||v.length>q.options.length||new Set(v).size!==v.length||v.some(x=>!q.options.includes(String(x))))return 'Alege opțiunile disponibile.';if(q.type==='ranking'&&v.length!==q.options.length)return 'Ordonează toate opțiunile.';return null;}
 if(q.type==='matrix'){if(!v||typeof v!=='object'||Array.isArray(v))return 'Completează evaluarea.';const m=v as Record<string,unknown>;return Object.keys(m).some(k=>!q.rows.includes(k))||q.rows.some(r=>required(q,a)&&!q.options.includes(String(m[r])))||Object.values(m).some(x=>!q.options.includes(String(x)))?'Completează rândurile evaluării.':null;}
 if(['number','currency','rating','scale'].includes(q.type))return typeof v==='number'&&Number.isFinite(v)&&v>=(q.min??0)&&v<=(q.max??100000000)?null:'Valoare în afara intervalului.';
 if(typeof v!=='string'||v.length>(q.type==='long'?6000:500))return 'Răspuns prea lung sau invalid.';
 if(['single','dropdown','image-select'].includes(q.type)&&!q.options.includes(v))return 'Alege o opțiune disponibilă.';
 if(q.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))return 'Verifică adresa de email.';
 if(q.type==='phone'&&!/^\+?[\d ()-]{6,30}$/.test(v))return 'Verifică numărul de telefon.';
 if(q.type==='url'){try{const u=new URL(v);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return 'Folosește un URL http sau https.';}catch{return 'Introdu un URL complet, cu https://.';}}
 if(q.type==='color'&&!/^#[\da-f]{6}$/i.test(v))return 'Culoare invalidă.';
 if(q.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))return 'Dată invalidă.';
 return null;
}
export function evaluate(t:SurveyTemplate,answers:Answers){
 const path=surveyPath(t,answers), errors:Record<string,string>={},missingCritical:string[]=[],missingRecommended:string[]=[];let total=0,filled=0;
 for(const q of path){if(q.type==='info')continue;const weight=q.importance==='critical'?3:q.importance==='recommended'?2:1;total+=weight;const error=answerError(q,answers[q.id],answers);if(error)errors[q.id]=error;if(!empty(answers[q.id])&&!error)filled+=weight;else if(q.importance==='critical')missingCritical.push(q.id);else if(q.importance==='recommended')missingRecommended.push(q.id);}
 return {score:total?Math.round(filled/total*100):100,missingCritical,missingRecommended,errors,visible:path.map(q=>q.id)};
}
export function deterministicBrief(t:SurveyTemplate,a:Answers){const state=evaluate(t,a);return {title:t.title,service:t.service,completeness:state.score,sections:t.sections.map(s=>({title:s.title,answers:surveyPath(t,a).filter(q=>q.section===s.id&&q.type!=='info'&&!empty(a[q.id])).map(q=>({question_id:q.id,label:q.label,value:a[q.id]}))})),missingCritical:state.missingCritical,missingRecommended:state.missingRecommended,source:'client_answers' as const};}
