import {describe,it,expect} from 'vitest';
import {safePaymentRedirect} from '@/lib/clientCommerce';
describe('payment navigation',()=>{
 it('allows only the actual hosted provider without forwarding account credentials',()=>{
  expect(safePaymentRedirect('https://checkout.stripe.com/c/pay/own','stripe')).toBe('https://checkout.stripe.com/c/pay/own');
  expect(safePaymentRedirect('https://billing.stripe.com/p/session/own','stripe')).toContain('billing.stripe.com');
  expect(safePaymentRedirect('https://checkout.revolut.com/pay/own','revolut')).toContain('checkout.revolut.com');
 });
 it.each(['https://checkout.stripe.com.attacker.test/pay','javascript:alert(1)','http://checkout.stripe.com/pay','https://user:password@checkout.stripe.com/pay','https://checkout.stripe.com:444/pay',null])('blocks an untrusted payment destination: %s',value=>{
  expect(()=>safePaymentRedirect(value,'stripe')).toThrow();
 });
});
