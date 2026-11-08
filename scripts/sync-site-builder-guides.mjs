import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {SITE_AGENT_GUIDES,SITE_KNOWLEDGE_VERSION,SITE_QUALITY_CONTRACT} from '../src/shared/skills/siteKnowledge.ts';
const base=new URL('../docs/site-builder/',import.meta.url);
const check=process.argv.includes('--check');
let changed=0;
for(const [agent,guide] of Object.entries(SITE_AGENT_GUIDES)){
 const url=new URL(agent.toUpperCase()+'.md',base);
 const expected=`# Site Builder · ${agent}\n\n${guide}\n\nCitește [contractul comun](./COMMON.md), apoi profilul de nișă și resursele relevante din AVYRON OS. Exportul operațional curent este disponibil prin GET /api/skills/site-builder/agents/${agent}.md?domain=DOMENIU, folosind autentificarea existentă. Nu pune tokenuri în acest fișier.\n\nPredă: contextul și versiunile, deciziile, modificările, validarea reală și limitele. Nu rescrie documentele istorice sau proiectele altor beneficiari.\n`;
 if(await readFile(url,'utf8')!==expected){changed++;if(check)console.error(`Instrucțiuni nesincronizate: ${fileURLToPath(url)}`);else await writeFile(url,expected);}
}
const common=new URL('COMMON.md',base),source=await readFile(common,'utf8');
const marker='## Citire progresivă';
if(!source.includes(marker))throw new Error('Lipsește secțiunea de citire progresivă din COMMON.md');
const expected=`# AVYRON · contract comun Site Builder\n\nVersiune: ${SITE_KNOWLEDGE_VERSION}.\n\n${SITE_QUALITY_CONTRACT}\n\n${source.slice(source.indexOf(marker))}`;
if(source!==expected){changed++;if(check)console.error('Contractul comun necesită sincronizare.');else await writeFile(common,expected);}
if(check&&changed)process.exitCode=1;
else console.log(check?'Instrucțiunile Site Builder sunt sincronizate.':`${changed} documente sincronizate.`);
