import {it,expect} from 'vitest';
import {confirmedServiceItems} from '../shared/clientServices';
it('keeps paid services and verified legacy website packages without treating products or unknown packages as services',()=>{
 const items=[{type:'service',name:'SEO'},{type:'package',sku:'website-starter',name:'Website Starter'},{kind:'service',name:'Legacy service'},{type:'product',name:'Product'},{type:'package',sku:'unknown',name:'Unknown package'},{type:'subscription',name:'Maintenance'},null,{type:'service',name:''}];
 expect(confirmedServiceItems({id:'paid',status:'paid',items_json:JSON.stringify(items)}).map(i=>i.name)).toEqual(['SEO','Website Starter','Legacy service']);
 for(const status of ['requested','accepted','cancelled'])expect(confirmedServiceItems({id:'unpaid',status,items_json:JSON.stringify(items)})).toEqual([]);
 for(const items_json of ['bad','{}','null'])expect(confirmedServiceItems({id:'malformed',status:'paid',items_json})).toEqual([]);
});
