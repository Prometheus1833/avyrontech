import {getAgentByName} from 'agents';
import type {AvyronAgentRuntime} from './AvyronAgentRuntime';
// Narrow the SDK boundary to avoid expanding the complete recursive Agent RPC
// surface through Hono bindings. Tests can replace only this remote boundary.
export const resolveAgentRuntime=getAgentByName as unknown as (namespace:unknown,name:string)=>Promise<DurableObjectStub<AvyronAgentRuntime>>;
