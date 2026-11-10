import { useAuth } from "@/hooks/useAuth";
import ClientBillingRecurring from "./ClientBillingRecurring";
import { billingApi, type BillingAccount } from "@/lib/billingApi";
import { useSearchParams } from "react-router-dom";
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { InvoicesTab } from "./InvoicesTab";
import { OrdersTab } from "./OrdersTab";
import ClientPaymentHistory from "./ClientPaymentHistory";
const Settings = lazy(() => import("./BillingSettingsCard"));
export default function ClientBillingTab() {
  const {user}=useAuth();
  const cached = useRef<{userId:string|undefined;promise:Promise<BillingAccount>} | null>(null);
  const loadAccount = useCallback((force = false) => {
    if (force || cached.current?.userId!==user?.id) cached.current = null;
    if (!cached.current)
      cached.current = {userId:user?.id,promise:billingApi.account().catch((error) => {
        if(cached.current?.userId===user?.id)cached.current = null;
        throw error;
      })};
    return cached.current.promise;
  }, [user?.id]);
  const [params] = useSearchParams();
  const [showInvoices, setShowInvoices] = useState(false);
  useEffect(() => {
    if (params.get("billingView") === "invoices") setShowInvoices(true);
  }, [params]);
  return (
    <section className="min-w-0 space-y-5" aria-label="Plăți/Istoric">
      <header>
        <h1 className="text-2xl font-semibold">Plăți/Istoric</h1>
        <p className="mt-1 text-sm text-slate-300">
          Cardul salvat și plățile tale, într-un singur loc.
        </p>
      </header>
      <Suspense fallback={<p role="status">Se încarcă metoda de plată…</p>}>
        <Settings key={user?.id} embedded loadAccount={loadAccount} />
      </Suspense>
      <OrdersTab key={`orders:${user?.id}`} embedded pendingOnly loadAccount={loadAccount} />
      <ClientBillingRecurring key={`recurring:${user?.id}`} />
      <details
        open={showInvoices}
        className="rounded-xl border border-white/10 bg-white/[.02] p-3"
        onToggle={(event) => setShowInvoices(event.currentTarget.open)}
      >
        <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium">
          Facturi disponibile
        </summary>
        {showInvoices && (
          <div className="pt-2">
            <InvoicesTab key={`invoices:${user?.id}`} embedded loadAccount={loadAccount} />
          </div>
        )}
      </details>
      <ClientPaymentHistory key={`history:${user?.id}`} loadAccount={loadAccount} />
    </section>
  );
}
