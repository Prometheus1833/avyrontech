import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pages } from '../content.mjs';
import { articlePages } from '../articles.mjs';

const dest = resolve(process.argv[2] || 'dist');
import { render } from '../site-render.mjs';

mkdirSync(dest,{recursive:true});
mkdirSync(resolve(dest,'en'),{recursive:true});
cpSync(new URL('../assets',import.meta.url),resolve(dest,'assets'),{recursive:true});
for(const [key,ro,en] of [...pages, ...articlePages]){
  writeFileSync(resolve(dest,ro),render('ro',key));
  writeFileSync(resolve(dest,'en',en),render('en',key));
}
writeFileSync(resolve(dest,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log(`Built ${(pages.length + articlePages.length) * 2} concept pages in ${dest}`);
