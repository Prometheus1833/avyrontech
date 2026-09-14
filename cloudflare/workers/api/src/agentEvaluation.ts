import {retrieveKnowledge} from './knowledgeRetrieval';
export async function evaluateAgent(db:D1Database,slug:string,question:string,expectedKnowledgeId:string|null){
 const version=await db.prepare("SELECT * FROM ai_agent_versions WHERE agent_slug=? AND version=(SELECT current_version FROM ai_agents WHERE slug=?)").bind(slug,slug).first<{id:string;status:string;model:string;max_tokens:number;system_prompt:string;guardrails:string;tools_json:string}>();
 if(!version)return null;
 const matches=await retrieveKnowledge(db,slug,'ro',question);
 const checks=[
  {name:'approved_version',passed:version.status==='approved'},
  {name:'cloudflare_model',passed:version.model.startsWith('@cf/')},
  {name:'bounded_output',passed:version.max_tokens>=64&&version.max_tokens<=800},
  {name:'platform_instructions',passed:version.system_prompt.trim().length>0&&version.guardrails.trim().length>0},
  {name:expectedKnowledgeId?'expected_knowledge':'knowledge_coverage',passed:expectedKnowledgeId?matches.some(row=>row.entry.id===expectedKnowledgeId):matches.length>0},
 ];
 return {version_id:version.id,checks,score:checks.filter(row=>row.passed).length/checks.length,matches:matches.map(row=>({id:row.entry.id,question:row.entry.question,score:row.score,source:row.entry.source})),reply:matches[0]?.entry.answer||null,model_called:false};
}
