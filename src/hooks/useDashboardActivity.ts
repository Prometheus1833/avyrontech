import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cfAuth } from "@/lib/cfAuth";
import { ACTIVITY_CHANGED } from "@/lib/dashboardActivity";
export function useDashboardActivity(userId:string|undefined,enabled:boolean,authorizationKey="") {
  const client=useQueryClient();
  const result=useQuery({queryKey:["dashboard-activity",userId,authorizationKey],enabled:enabled&&!!userId,
    queryFn:({signal})=>cfAuth.request<{counts:Record<string,number>;generatedAt:number}>("/api/workspace/activity-counts",{signal}),
    staleTime:10000,refetchInterval:30000,refetchIntervalInBackground:false,refetchOnWindowFocus:true,retry:false});
  useEffect(()=>{
    if(!enabled)return;
    const changed=()=>void client.invalidateQueries({queryKey:["dashboard-activity",userId]});
    window.addEventListener(ACTIVITY_CHANGED,changed);
    return()=>window.removeEventListener(ACTIVITY_CHANGED,changed);
  },[client,userId,enabled]);
  return enabled&&!result.isError?result.data?.counts||{}:{};
}
