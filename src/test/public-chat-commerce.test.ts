import { describe, expect, it } from 'vitest';
import { asksPrice, commercialContext, explicitProduct, groundedMoney, monetaryFacts, serviceKeys } from '../../cloudflare/workers/api/src/publicChatCommerce';
describe('Public commercial intent and monetary grounding', () => {
 it.each(['Cât costă un proiect?', 'Care e prețul?', 'Ce buget îmi trebuie?', 'How much does it cost?'])('detects pricing without inventing an entity: %s', question => { expect(asksPrice(question)).toBe(true); });
 it.each([
  ['Cât costă un site cu un plugin?', ['premium-website']],
  ['Cât costă o aplicație web?', ['apps']],
  ['Cât costă un audit website?', ['audit']],
  ['Cât costă un magazin online?', ['online-store']],
  ['Cât costă SEO & AI Visibility?', ['seo-ai']],
  ['Cât costă un site și SEO?', ['premium-website','seo-ai']],
  ['Cât costă Website la 0 lei?', ['website-subscription']],
 ])('identifies the requested service rather than generic web overlaps: %s',(question, keys)=>{expect(serviceKeys(question)).toEqual(keys);});
 it('distinguishes a digital product from developing a website with a component',()=>{
  expect(explicitProduct('Calculator de cost pentru proiect')).toBe(true);
  expect(explicitProduct('Un template pentru website')).toBe(true);
  expect(explicitProduct('Un site cu un plugin')).toBe(false);
 });
 it('does not inherit an old service after an explicit switch to a product',()=>{
  const c=commercialContext('Cât costă Calculator de cost pentru proiect?',[{role:'user',content:'Vreau un site'}],'/servicii/website-prin-abonament');expect(c.product).toBe(true);expect(c.keys).toEqual([]);expect(c.question).not.toContain('abonament');
 });
 it('uses a public product-page hint for a generic price question',()=>{
  const c=commercialContext('Cât costă?',[],'/produse/unelte/calculator-cost-proiect');expect(c.product).toBe(true);expect(c.question).toContain('calculator cost proiect');
 });
 it('does not turn a generic project question into the price of a previously viewed product',()=>{
  for(const history of [[],[{role:'user',content:'Calculator de cost pentru proiect'}],[{role:'user',content:'Vreau un magazin online'},{role:'user',content:'Calculator de cost pentru proiect'}]]){
   const c=commercialContext('Cât costă un proiect?',history,'/produse/unelte/calculator-cost-proiect');expect(c.product).toBe(false);expect(c.keys).toEqual([]);expect(c.question).toBe('Cât costă un proiect?');
  }
 });
 it('does not carry a service price into a full new question about an unrelated topic',()=>{
  const c=commercialContext('Cât costă un bilet de tren?',[{role:'user',content:'Vreau un site'}],'/servicii/website-prezentare-profesional');expect(c.keys).toEqual([]);expect(c.product).toBe(false);expect(c.price).toBe(false);expect(c.question).toBe('Cât costă un bilet de tren?');
 });
 it.each([
  ['1.450 RON', ['1450:RON']],['1,450 lei', ['1450:RON']],['50 de lei', ['50:RON']],['12,50 EUR / lună', ['12.5:EUR']],['1.450,50 RON', ['1450.5:RON']],['1,450.50 RON', ['1450.5:RON']],['€50', ['50:EUR']],['USD 50', ['50:USD']],
 ])('normalizes verified currency facts: %s',(text, expected)=>{expect(monetaryFacts(text)).toEqual(expected);});
 it('blocks invented amounts and currency conversions without a verified rate',()=>{
  expect(groundedMoney('Site complet pentru 50 de lei.','Site: de la 1.450 RON.')).toBe(false);
  expect(groundedMoney('Site pentru 1.450 EUR.','Site: de la 1.450 RON.')).toBe(false);
  expect(groundedMoney('Preț de pornire 1450 lei.','Site: de la 1.450 RON.')).toBe(true);
  expect(groundedMoney('Să clarificăm cerințele.','')).toBe(true);
  expect(groundedMoney('Site pentru cincizeci de lei.','Site: de la 1.450 RON.')).toBe(false);
  expect(groundedMoney('Website for fifty euros.','Website: 1450 RON.')).toBe(false);
  expect(groundedMoney('Website for €50.','Website: 1450 RON.')).toBe(false);
  expect(groundedMoney('Între 50 și 1.450 lei.','Site: 1.450 RON.')).toBe(false);
  expect(groundedMoney('Website: 50–1.450 lei.','Site: 1.450 RON.')).toBe(false);
 });
});
