import { describe,expect,it } from 'vitest';
import { cloudflareModelInput } from '../../cloudflare/workers/api/src/aiModelInput';
import { MISTRAL_SMALL_MODEL } from '../../cloudflare/workers/api/src/agentRuntimePolicy';
import { surveyCostEstimate,surveyModelPricing } from '../../cloudflare/workers/api/src/surveys/cost';
describe('Cloudflare model compatibility',()=>{
  it('preserves a strict schema and the original request when translating for Mistral',()=>{
    const schema=Object.freeze({type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false});
    const input=Object.freeze({messages:[{role:'user',content:'Date sintetice'}],max_tokens:700,response_format:{type:'json_schema',json_schema:schema}});
    expect(cloudflareModelInput(MISTRAL_SMALL_MODEL,input)).toEqual({messages:input.messages,max_tokens:700,guided_json:schema});
    expect(input.response_format.json_schema).toBe(schema);
    expect(cloudflareModelInput(MISTRAL_SMALL_MODEL,{response_format:{type:'json_schema',json_schema:{name:'answer',schema}}})).toEqual({guided_json:schema});
  });
  it('supports JSON objects while leaving other models and unsupported formats unchanged',()=>{
    const input={response_format:{type:'json_object'},temperature:0};
    expect(cloudflareModelInput(MISTRAL_SMALL_MODEL,input)).toEqual({guided_json:{type:'object'},temperature:0});
    expect(cloudflareModelInput('@cf/meta/llama-3.3-70b-instruct-fp8-fast',input)).toBe(input);
    const invalid={response_format:{type:'json_schema',json_schema:null}};
    expect(cloudflareModelInput(MISTRAL_SMALL_MODEL,invalid)).toBe(invalid);
  });
  it('uses verified Mistral prices for bounded Surveys reservations without authorizing unknown pricing',()=>{
    expect(surveyModelPricing(MISTRAL_SMALL_MODEL)).toEqual({input:0.351,output:0.555});
    const source='x'.repeat(22000),rate=4.6;
    expect(surveyCostEstimate(source,1200,rate,MISTRAL_SMALL_MODEL)).toEqual({units:24700,minor:Math.ceil((23500*0.351+1200*0.555)*rate*1.5/10000)});
    expect(surveyModelPricing('unverified')).toBeUndefined();
    expect(()=>surveyCostEstimate(source,1200,rate,'unverified')).toThrow('unsupported_model_pricing');
  });
});
