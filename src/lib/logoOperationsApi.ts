import { cfAuth } from "./cfAuth";
import type { LogoBrief } from "@/data/logoStudio";
import type { LogoConfig } from "@/features/produse/components/logoConfig";
export type LogoSimulation={id:string;kind:string;source:string;brief_json:string;concept_count:number;lead_id:string|null;created_at:number};
export type LogoOverview={product:{slug:string;name_ro:string;price_ron_cents:number|null;access:string;status:string}|null;version:{version:string;bytes:number;created_at:number}|null;simulations:LogoSimulation[];summary:{source:string;total:number}[];nextOffset:number|null;canFinance:boolean;canManageCatalog:boolean;scope:string;variants:number;prices:{standard:number;assistedAi:number};finances:{orders:{id:string;status:string;currency:string;total_cents:number;quantity:number;unit_price_cents:number;created_at:number}[];totals:{currency:string;paid_orders:number;paid_minor:number}[];limit:number;source:string}|null;infrastructure:{database:string;storage:string;packageScan:string;payment:string}};
export const logoOperationsApi={
  overview:(mode:"2d"|"3d",offset=0,signal?:AbortSignal)=>cfAuth.request<LogoOverview>(`/api/logo-studio/admin/overview?mode=${mode}&offset=${offset}`,{signal}),
  interest:(config:LogoConfig,key:string)=>cfAuth.request<{id:string}>("/api/logo-studio/product-interest",{method:"POST",headers:{"Idempotency-Key":key},body:JSON.stringify({config})}),
};
export function simulationBrief(row:LogoSimulation):Partial<LogoBrief>{try{return JSON.parse(row.brief_json);}catch{return {};}}
