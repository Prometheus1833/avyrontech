import { useAuth } from "@/hooks/useAuth";
import { servicePageQueryKey } from "@/lib/servicePageQuery";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SERVICE_PAGES } from "@/shared/servicePagePolicy";
import { servicePagesApi } from "@/lib/servicePagesApi";
export default function ServiceContentPreviewStatus() {
  const client = useQueryClient();
  const { user, isStaff, isAdmin, isSuperAdmin, loading } = useAuth();
  const canPreview = !!user && !loading && (isStaff || isAdmin || isSuperAdmin);
  useEffect(() => {
    const refresh = () =>
      void client.invalidateQueries({ queryKey: ["service-page-content"] });
    window.addEventListener("avyron:service-content-changed", refresh);
    const channel =
      typeof window.BroadcastChannel === "undefined"
        ? null
        : new window.BroadcastChannel("avyron-service-content");
    if (channel) channel.onmessage = refresh;
    return () => {
      window.removeEventListener("avyron:service-content-changed", refresh);
      channel?.close();
    };
  }, [client]);
  const { search } = useLocation(),
    params = new URLSearchParams(search),
    key = params.get("servicePreview"),
    revision = Number(params.get("revision"));
  const enabled =
    SERVICE_PAGES.some((page) => page.key === key) &&
    Number.isSafeInteger(revision) &&
    revision > 0 &&
    canPreview;
  const query = useQuery({
    queryKey: servicePageQueryKey(
      key || "",
      true,
      revision,
      canPreview ? user!.id : "unauthorized",
    ),
    queryFn: async () => (await servicePagesApi.version(key!, revision)).values,
    enabled,
    staleTime: 60000,
    retry: 1,
  });
  if (!key) return null;
  return (
    <>
      <div aria-hidden className="h-9" />
      <div
        role={query.isError ? "alert" : "status"}
        className={`fixed inset-x-0 top-0 z-[100] border-b px-4 py-2 text-center text-xs ${query.isError || !enabled ? "border-rose-500/30 bg-rose-950 text-rose-100" : "border-violet-400/30 bg-[#17102f] text-violet-100"}`}
      >
        {loading
          ? "Se verifică accesul la previzualizare…"
          : !enabled
            ? "Previzualizare indisponibilă. Este necesară o sesiune staff autorizată."
            : query.isError
              ? "Ciorna nu poate fi încărcată sau nu ai acces. Se afișează conținutul original."
              : query.isPending
                ? "Se încarcă versiunea privată…"
                : `Previzualizare privată · versiunea ${revision} · fără publicare automată`}
      </div>
    </>
  );
}
