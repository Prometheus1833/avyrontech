import {it,expect,vi,afterEach} from 'vitest';
import {verifyFinancialConnection} from '../../cloudflare/workers/api/src/financialConnectionVerification';
import type {Env} from '../../cloudflare/workers/api/src/types';
afterEach(()=>vi.unstubAllGlobals());
const env={APP_ENV:'production',REVOLUT_MERCHANT_SECRET_KEY:'synthetic',REVOLUT_MERCHANT_WEBHOOK_SECRET:'synthetic-signing'} as Env;
it.each([{webhooks:[]},{webhooks:[{id:'x',url:'https://other.example/api/billing/webhooks/revolut',events:['ORDER_COMPLETED']}]},{webhooks:[{id:'x',url:'https://avyron.ro/api/billing/webhooks/revolut',events:['ORDER_CANCELLED']}]}])('does not report a configured Merchant connection for missing/wrong destinations: %j',async({webhooks})=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({webhooks})));
 expect(await verifyFinancialConnection(env,'revolut_merchant')).toEqual({ok:false,code:'revolut_avyron_webhook_required'});
});
it('accepts only an actual AVYRON destination subscribed to completion, without claiming delivery',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({webhooks:[{id:'x',url:'https://avyron.ro/api/billing/webhooks/revolut',events:['ORDER_COMPLETED']}]})));
 expect(await verifyFinancialConnection(env,'revolut_merchant')).toMatchObject({ok:true,capabilities:expect.arrayContaining(['avyron_webhook_destination_verified']),detail:expect.stringContaining('livrarea se confirmă separat')});
});
it('rejects untrusted API roots before sending authorization headers',async()=>{
 const spy=vi.fn();vi.stubGlobal('fetch',spy);
 expect(await verifyFinancialConnection({...env,REVOLUT_MERCHANT_API_URL:'https://other.example/api'},'revolut_merchant')).toEqual({ok:false,code:'merchant_origin_rejected'});expect(spy).not.toHaveBeenCalled();
});
