import {describe,it,expect} from 'vitest';
import {parseSurveyFx,surveyCostEstimate} from '../../cloudflare/workers/api/src/surveys/cost';
describe('survey AI cost reservation',()=>{
 it('converts ECB cross rates and rejects stale or missing rates',()=>{const xml="<Cube time='2026-09-21'><Cube currency='USD' rate='1.15'/><Cube currency='RON' rate='5.27'/></Cube>";expect(parseSurveyFx(xml,Date.parse('2026-09-22')).rate).toBeCloseTo(5.27/1.15);expect(()=>parseSurveyFx(xml,Date.parse('2026-10-22'))).toThrow();expect(()=>parseSurveyFx("<Cube time='2026-09-21' />",Date.parse('2026-09-22'))).toThrow();});
 it('reserves a positive conservative RON estimate including all bounded output',()=>{const small=surveyCostEstimate('Un text',500,4.6),large=surveyCostEstimate('x'.repeat(22000),1200,4.6);expect(small.minor).toBeGreaterThan(0);expect(large.minor).toBeGreaterThan(small.minor);expect(large.units).toBe(24700);expect(large.minor).toBeLessThanOrEqual(20);expect(()=>surveyCostEstimate('test',500,NaN)).toThrow();});
});
