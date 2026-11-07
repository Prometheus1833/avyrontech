import { MISTRAL_SMALL_MODEL } from './agentRuntimePolicy';

/** Mistral's Workers AI schema uses guided_json rather than response_format. */
export function cloudflareModelInput(model:string,input:Record<string,unknown>):Record<string,unknown>{
  if(model!==MISTRAL_SMALL_MODEL)return input;
  const format=input.response_format;
  if(!format||typeof format!=='object'||Array.isArray(format))return input;
  const value=format as Record<string,unknown>;
  let schema:unknown;
  if(value.type==='json_object')schema={type:'object'};
  else if(value.type==='json_schema'&&value.json_schema&&typeof value.json_schema==='object'&&!Array.isArray(value.json_schema)){
    const definition=value.json_schema as Record<string,unknown>;
    schema=definition.schema&&typeof definition.schema==='object'&&!Array.isArray(definition.schema)?definition.schema:definition;
  }else return input;
  const converted:Record<string,unknown>={...input,guided_json:schema};
  delete converted.response_format;
  return converted;
}
