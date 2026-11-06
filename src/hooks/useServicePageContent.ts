import { useAuth } from "@/hooks/useAuth";
import { servicePageQueryKey } from "@/lib/servicePageQuery";
import snapshot from "@/shared/servicePublishedSnapshot.json";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { servicePagesApi } from "@/lib/servicePagesApi";
import {
  applyServiceText,
  type ServiceTextValues,
} from "@/shared/servicePagePolicy";
const empty: ServiceTextValues = {};
export function useServicePageContent<T>(
  pageKey: string,
  prefix: string,
  source: T,
): T {
  const { user, isStaff, isAdmin, isSuperAdmin, loading } = useAuth();
  const canPreview = !!user && !loading && (isStaff || isAdmin || isSuperAdmin);
  const params =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);
  const preview = params?.get("servicePreview") === pageKey;
  const revision = Number(params?.get("revision"));
  const initial = (snapshot as Record<string, { values: ServiceTextValues }>)[
    pageKey
  ]?.values;
  const query = useQuery({
    initialData: preview ? undefined : initial,
    initialDataUpdatedAt: 0,
    queryKey: servicePageQueryKey(
      pageKey,
      !!preview,
      revision,
      canPreview ? user!.id : "unauthorized",
    ),
    queryFn: async () => {
      if (preview)
        return (await servicePagesApi.version(pageKey, revision)).values;
      const response = await fetch(
        apiUrl(`/api/public/service-pages/${encodeURIComponent(pageKey)}`),
        { credentials: "omit" },
      );
      if (!response.ok)
        throw new Error("Conținutul paginii nu este disponibil.");
      return (
        ((await response.json()) as { values?: ServiceTextValues }).values ||
        empty
      );
    },
    staleTime: 60000,
    retry: 1,
    enabled:
      typeof window !== "undefined" &&
      !window.navigator.userAgent.toLowerCase().includes("jsdom") &&
      !!pageKey &&
      (!preview ||
        (canPreview && Number.isSafeInteger(revision) && revision > 0)),
  });

  return useMemo(
    () =>
      preview && (!canPreview || query.isError)
        ? source
        : query.data
          ? applyServiceText(source, prefix, query.data)
          : source,
    [source, prefix, query.data, preview, canPreview, query.isError],
  );
}
export const notifyServiceContentChanged = () => {
  window.dispatchEvent(new Event("avyron:service-content-changed"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("avyron-service-content");
    channel.postMessage("updated");
    channel.close();
  }
};
export { empty as EMPTY_SERVICE_VALUES };
