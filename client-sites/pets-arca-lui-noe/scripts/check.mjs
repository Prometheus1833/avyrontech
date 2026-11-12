import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pages } from '../content.mjs';

const root=resolve(process.argv[2]||'dist');
const read=path=>readFileSync(path,'utf8');
for(const [,ro,en] of pages){
  for(const [lang,path,alt] of [['ro',ro,'en/'+en],['en','en/'+en,'../'+ro]]){
    const file=resolve(root,path);
    const html=read(file);
    assert.match(html,new RegExp(`<html lang="${lang}">`));
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'), path);
    assert.equal((html.match(/<h1>/g)||[]).length,1,path);
    assert.ok(html.includes(`href="${alt}"`),`Missing translated route: ${path}`);
    assert.doesNotMatch(html,/<form[^>]+(?:action|method)=|<input\b|fetch\(/i);
    const localLinks=[...Array.from(html.matchAll(/(?:href|src)="([^"]+)"/g),m=>m[1]),
      ...Array.from(html.matchAll(/srcset="([^"]+)"/g),m=>m[1]).flatMap(value=>value.split(',').map(part=>part.trim().split(/\s/)[0]))];
    for(const href of localLinks){
      if(/^(?:[a-z]+:|#)/i.test(href)) continue;
      assert.ok(!href.startsWith('/'),`Nonportable link: ${href}`);
      const [target,hash]=href.split('#');
      const resource=resolve(dirname(file),target);
      assert.ok(existsSync(resource),`${path}: broken resource ${href}`);
      if(hash) assert.ok(read(resource).includes(`id="${hash}"`),`${path}: broken fragment ${href}`);
    }
  }
}
assert.match(read(resolve(root,'robots.txt')),/^User-agent: \*\nDisallow: \/\n$/);
console.log('10 static pages: links, images, bilingual routes and preview safeguards verified.');
