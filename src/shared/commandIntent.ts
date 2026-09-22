export const normalizeCommand=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const months=['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
export type CommandIntent={type:'client';query:string}|{type:'invoices'}|{type:'wcag'}|{type:'report';month:string}|{type:'lead'};
export function commandIntent(query:string,now=new Date()):CommandIntent|null {
 const text=normalizeCommand(query);
 if(/^(creeaza|adauga)( un)? lead/.test(text))return {type:'lead'};
 if(/factur.*(neachitat|restant|neplatit)/.test(text))return {type:'invoices'};
 if(/wcag|scanare accesibilitate/.test(text))return {type:'wcag'};
 const client=/^(?:deschide|arata|cauta) client(?:ul)?\s+(.+)$/.exec(text);
 if(client)return {type:'client',query:query.trim().replace(/^\S+\s+\S+\s+/, '')};
 if(/raport/.test(text)){
  const explicit=/\b(20\d{2})-(0[1-9]|1[0-2])\b/.exec(text);
  if(explicit)return {type:'report',month:explicit[0]};
  const month=months.findIndex(m=>new RegExp(`\\b${m}\\b`).test(text));
  if(month>=0){const year=/\b20\d{2}\b/.exec(text);return {type:'report',month:`${year?Number(year[0]):now.getUTCFullYear()-(month>now.getUTCMonth()?1:0)}-${String(month+1).padStart(2,'0')}`};}
 }
 return null;
}
