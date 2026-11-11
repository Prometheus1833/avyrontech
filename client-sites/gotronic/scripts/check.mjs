import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const root = new URL('../dist/',import.meta.url);
const paths=['/','/aprinderi/','/aprinderi/at011/','/garduri-electrice/','/ghiduri/','/contact/','/mentiuni-legale/','/confidentialitate/','/cookies/','/termeni/','/404.html'];
const locate = path => new URL(path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1),root);
const html = new Map(await Promise.all(paths.map(async path=>[path,await readFile(locate(path),'utf8')])));
const pageTitles = new Set();
for (const [path,source] of html) {
 assert.equal((source.match(/<h1[ >]/g)??[]).length,1,path);
 assert.equal((source.match(/<main[ >]/g)??[]).length,1,path);
 assert.match(source,/<html lang="ro">/);
 assert.match(source,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(source,/<meta name="description" content="[^"]+">/);
 assert.equal((source.match(/class="float float-/g)??[]).length,2,path);
 assert.doesNotMatch(source,/<iframe|<script src="https?:|src="https?:|href="http:/i);
 const title = source.match(/<title>([^<]+)<\/title>/)?.[1];
 assert.ok(title&&!pageTitles.has(title),path); pageTitles.add(title);
 const ids=[...source.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,path);
 for (const [,value] of source.matchAll(/(?:href|src|srcset|action)="([^" ]+)"/g)) {
  if (!value.startsWith('/') && !value.startsWith('#')) continue;
  const [url,hash] = value.split('#');
  const target = url || path;
  if (target.endsWith('/') || hash) {
   assert.ok(html.has(target),`${path}: ${value}`);
   if (hash) assert.ok(html.get(target).includes(`id="${hash}"`),`${path}: ${value}`);
  } else await stat(locate(target));
 }
}
assert.match(await readFile(new URL('robots.txt',root),'utf8'),/Disallow: \//);
const dir = await readdir(new URL('assets/brand/',root));
for (const asset of dir.filter(a=>a.endsWith('.avif'))) {
 const size=(await stat(new URL(`assets/brand/${asset}`,root))).size;
 assert.ok(size<125*1024,`${asset}: ${size}`);
}
if(process.argv.includes('--with-client')){
 for (const file of ['at011','at011-montaj','at01','at010','at012','pastor','atelier']) for(const ext of ['avif','webp']) await stat(new URL(`assets/client/${file}.${ext}`,root));
 assert.match(html.get('/'),/Fotografie de montaj/);
}
console.log(`${paths.length} pagini verificate: rute, ancore, resurse, noindex, buget hero și contacte.`);
