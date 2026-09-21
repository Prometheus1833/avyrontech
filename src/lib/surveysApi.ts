import { apiUrl } from './apiBase';
import { cfAuth } from './cfAuth';
import type { Answers,SurveyTemplate } from '@/shared/surveys/engine';
export type SurveyFile={id:string;question_id:string;original_filename:string;mime_type:string;size:number};
export type SurveySession={survey:{id:string;title:string;status:string;completion:number;expires_at:number|null;followup:string[]};template:SurveyTemplate;answers:Answers;context:Answers;revision:number;files:SurveyFile[]};
export class SurveyError extends Error {constructor(public code:string,public status:number,public fields?:Record<string,string>){super(code);}}
let hadSurveyAccount=false;
async function surveyAccessToken(){const current=cfAuth.getToken();if(current){hadSurveyAccount=true;return current;}if(hadSurveyAccount){hadSurveyAccount=await cfAuth.refresh();return cfAuth.getToken();}return null;}
export async function surveyRequest<T>(path:string,body?:unknown,token?:string,method=body===undefined?'GET':'POST'):Promise<T>{
 const headers:Record<string,string>={'Content-Type':'application/json'};if(token)headers['X-Survey-Token']=token;
 const access=await surveyAccessToken();if(access)headers.Authorization=`Bearer ${access}`;
 const res=await fetch(apiUrl(`/api/surveys/${path}`),{method,headers,credentials:'include',body:body===undefined?undefined:JSON.stringify(body)});
 const value=await res.json() as T & {error?:{code?:string;fields?:Record<string,string>}};if(!res.ok)throw new SurveyError(value.error?.code||'request_failed',res.status,value.error?.fields);return value;
}
export async function uploadSurveyFile(file:File,question:string,token:string,onProgress:(n:number)=>void):Promise<SurveyFile>{const access=await surveyAccessToken();return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open('POST',apiUrl(`/api/surveys/files?question=${encodeURIComponent(question)}`));xhr.withCredentials=true;xhr.setRequestHeader('X-Survey-Token',token);xhr.setRequestHeader('X-File-Name',encodeURIComponent(file.name));xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');if(access)xhr.setRequestHeader('Authorization',`Bearer ${access}`);xhr.timeout=120000;
 xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};xhr.onerror=()=>reject(new SurveyError('upload_failed',0));xhr.ontimeout=xhr.onerror;xhr.onload=()=>{try{const data=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new SurveyError(data.error?.code||'upload_failed',xhr.status));}catch{reject(new SurveyError('upload_failed',xhr.status));}};xhr.send(file);
});}
export async function surveyFileBlob(file:SurveyFile,token?:string,surveyId?:string){
 const access=await surveyAccessToken();
 const response=token?await fetch(apiUrl(`/api/surveys/files/${file.id}`),{headers:{'X-Survey-Token':token,...(access?{Authorization:`Bearer ${access}`}:{})},credentials:'include'}):await cfAuth.raw(`/api/survey-admin/surveys/${surveyId}/files/${file.id}`);if(!response.ok)throw new Error('download_failed');return response.blob();
}
export async function downloadSurveyFile(file:SurveyFile,token?:string,surveyId?:string){const url=URL.createObjectURL(await surveyFileBlob(file,token,surveyId)),a=document.createElement('a');a.href=url;a.download=file.original_filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}

export const surveyMessage=(e:unknown)=>({revision_conflict:'Acest chestionar a fost modificat pe alt dispozitiv. Verifică versiunea nouă înainte de a continua.',link_unavailable:'Linkul nu este disponibil. Poate fi expirat, închis sau rezervat unui cont. Contactează echipa AVYRON.',captcha_failed:'Verificarea de securitate a expirat. Te rugăm să încerci din nou.',rate_limited:'Ai făcut mai multe încercări. Așteaptă puțin și revino.',file_quota_exceeded:'Ai atins limita de fișiere: maximum 20 de fișiere și 60 MB în total.',file_type_or_size:'Fișier neacceptat sau mai mare de 10 MB.',file_signature:'Conținutul fișierului nu corespunde formatului declarat.',unsafe_svg:'Acest SVG conține elemente nesigure. Trimite o variantă PNG sau PDF.',survey_read_only:'Chestionarul este închis pentru editare.',incomplete:'Mai sunt câteva răspunsuri obligatorii de completat.',detach_file_first:'Elimină mai întâi fișierul din răspuns.',survey_delivery_failed:'Livrarea emailului nu a reușit. Rezultatul rămâne salvat în OS.'} as Record<string,string>)[e instanceof Error?e.message:'']||'Nu am putut finaliza operațiunea. Verifică conexiunea și încearcă din nou.';
