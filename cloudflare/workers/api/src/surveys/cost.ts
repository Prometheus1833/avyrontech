import type { Env } from '../types';
const FX_KEY='survey:usd-ron:v1';
const FX_URL='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
export function parseSurveyFx(xml:string,now=Date.now()){
 const date=xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
 const value=(currency:string)=>Number(xml.match(new RegExp(`currency=['"]${currency}['"]\\s+rate=['"]([0-9.]+)['"]`))?.[1]);
 const usd=value('USD'),ron=value('RON'),at=Date.parse(date||'');
 if(!Number.isFinite(at)||at>now+86400000||now-at>7*86400000||usd<0.1||usd>3||ron<1||ron>15)throw new Error('fx_unavailable');
 const rate=ron/usd;if(!Number.isFinite(rate)||rate<1||rate>15)throw new Error('fx_unavailable');return {rate,at};
}
export async function surveyFx(env:Env){
 const cached=await env.KV.get(FX_KEY,'json') as {rate:number;at:number;cachedAt:number}|null;
 if(cached&&Date.now()-cached.cachedAt<86400000&&Date.now()-cached.at<7*86400000&&Number.isFinite(cached.rate)&&cached.rate>1&&cached.rate<15)return cached.rate;
 try{const response=await fetch(FX_URL,{signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error('fx_unavailable');const value=parseSurveyFx(await response.text());await env.KV.put(FX_KEY,JSON.stringify({...value,cachedAt:Date.now()}),{expirationTtl:7*86400});return value.rate;}catch{if(cached&&Date.now()-cached.at<7*86400000&&cached.rate>1&&cached.rate<15)return cached.rate;throw new Error('fx_unavailable');}
}
/** Conservative RON minor-unit reservation including a 50% FX/tax buffer. */
export function surveyCostEstimate(source:string,maxOutput:number,ronPerUsd:number){
 if(!Number.isFinite(ronPerUsd)||ronPerUsd<=0||!Number.isInteger(maxOutput)||maxOutput<1)throw new Error('invalid_estimate');
 const input=new TextEncoder().encode(source).length+1500;
 return {units:input+maxOutput,minor:Math.max(1,Math.ceil((input*0.152+maxOutput*0.287)*ronPerUsd*1.5/10000))};
}
