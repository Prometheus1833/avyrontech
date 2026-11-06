import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess } from "@/lib/access";
import type { DocumentView } from "./presentation";
const ClientDocuments = lazy(() => import("./ClientDocuments"));
const AgencyDocuments = lazy(() => import("./AgencyDocumentCenter"));
export default function DocumentCenter(props: {
  projectId?: string;
  clientId?: string;
  serviceId?: string;
  subscriptionId?: string;
  initialView?: DocumentView;
  embedded?: boolean;
}) {
  const { roles, capabilities, isSuperAdmin } = useAuth();
  const access = buildAccess({ roles, capabilities, superadmin: isSuperAdmin });
  return (
    <Suspense fallback={<p role="status">Se încarcă documentele…</p>}>
      {access.isClient ? (
        <ClientDocuments {...props} />
      ) : (
        <AgencyDocuments {...props} />
      )}
    </Suspense>
  );
}
