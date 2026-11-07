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
/** Current Gemma endpoints return OpenAI choices; callers consume the native response field. */
export function cloudflareModelOutput(value:unknown):unknown {
  if(!value||typeof value!=='object'||!('choices' in value)||!Array.isArray(value.choices))return value;
  if('response' in value&&typeof value.response==='string'&&value.response.trim())return value;
  const choice=value.choices[0];
  if(!choice||typeof choice!=='object'||!('message' in choice)||!choice.message||typeof choice.message!=='object')return value;
  const content='content' in choice.message?choice.message.content:null;
  const text=typeof content==='string'?content:Array.isArray(content)?content.filter(item=>item&&typeof item==='object'&&item.type==='text'&&typeof item.text==='string').map(item=>item.text).join(''):'';
  return text.trim()?{...value,response:text}:value;
}
