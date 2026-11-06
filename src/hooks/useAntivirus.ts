import { useQuery } from "@tanstack/react-query";
import { cfAuth } from "@/lib/cfAuth";
import { useAuth } from "@/hooks/useAuth";
import type { AntivirusOverview } from "@/shared/antivirus";
export function useAntivirus(source = "") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["antivirus", user?.id, source],
    enabled: !!user?.id,
    queryFn: async ({ signal }) => {
      const d = await cfAuth.request<AntivirusOverview>(
        "/api/antivirus" +
          (source ? "?source=" + encodeURIComponent(source) : ""),
        { signal },
      );
      if (
        !d ||
        d.provider !== "bouncer" ||
        typeof d.configured !== "boolean" ||
        typeof d.enabled !== "boolean" ||
        typeof d.storageVerified !== "boolean" ||
        typeof d.sensitiveApproved !== "boolean" ||
        !d.counts ||
        typeof d.counts !== "object" ||
        Array.isArray(d.counts) ||
        !Number.isFinite(d.storageBytes) ||
        ![d.jobs, d.events, d.legacy, d.complianceReasons].every(Array.isArray)
      )
        throw new Error("Datele de monitorizare antivirus sunt nevalide.");
      return d;
    },
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 1,
  });
}
