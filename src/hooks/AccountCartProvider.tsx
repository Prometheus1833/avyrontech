import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccountCartContext as Context } from "./useAccountCart";
import { useAuth } from "./useAuth";
import {
  ACCOUNT_CART_EVENT,
  ACCOUNT_CART_KEY,
  ACCOUNT_CART_OWNER_KEY,
  accountCartApi,
  cartStorage,
  hasPendingCart,
  prepareCartOwner,
  readLocalAccountCart,
  replayPendingCart,
  setCartBridge,
  writeLocalAccountCart,
  type AccountCartItem,
} from "@/lib/accountCart";
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
export function AccountCartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  return (
    <CartSession
      key={user?.id || "guest"}
      owner={user?.id}
      authLoading={loading}
    >
      {children}
    </CartSession>
  );
}
function CartSession({
  owner,
  authLoading,
  children,
}: {
  owner?: string;
  authLoading: boolean;
  children: ReactNode;
}) {
  const [items, setItems] = useState<AccountCartItem[]>([]),
    [ready, setReady] = useState(false),
    [synced, setSynced] = useState(false),
    [syncing, setSyncing] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const active = useRef(true),
    known = useRef(false),
    hydration = useRef<Promise<void>>(Promise.resolve()),
    inFlight = useRef<Promise<AccountCartItem[]> | null>(null),
    snapshot = useRef(items);
  const replace = useCallback(
    (
      value:
        | AccountCartItem[]
        | ((current: AccountCartItem[]) => AccountCartItem[]),
    ) => {
      const next = (
        typeof value === "function" ? value(snapshot.current) : value
      ).slice(0, 20);
      if (JSON.stringify(next) === JSON.stringify(snapshot.current)) return;
      snapshot.current = next;
      setItems(next);
      writeLocalAccountCart(next);
      setRevision((v) => v + 1);
      setSynced(false);
    },
    [],
  );
  const load = useCallback(async () => {
    if (!owner) return;
    try {
      const cloud = await accountCartApi.load();
      if (!active.current) return;
      const next = replayPendingCart(cloud);
      known.current = true;
      snapshot.current = next;
      setItems(next);
      writeLocalAccountCart(next, false);
      setSynced(!hasPendingCart());
      setError("");
    } catch {
      if (active.current) {
        known.current = false;
        setSynced(false);
        setError(
          "Sincronizarea coșului nu este disponibilă. Modificările locale sunt păstrate; reîncearcă.",
        );
      }
    } finally {
      if (active.current) {
        setReady(true);
        setRevision((v) => v + 1);
      }
    }
  }, [owner]);
  const flush = useCallback(
    async function persist(): Promise<AccountCartItem[]> {
      await hydration.current;
      if (!active.current || !owner || !known.current)
        throw new Error("cart_sync_unavailable");
      if (!hasPendingCart()) return snapshot.current;
      if (inFlight.current) {
        await inFlight.current;
        return hasPendingCart() ? persist() : snapshot.current;
      }
      setSyncing(true);
      const operation = accountCartApi.save(snapshot.current);
      inFlight.current = operation;
      try {
        await operation;
        if (active.current) {
          setSynced(!hasPendingCart());
          setError("");
        }
        return snapshot.current;
      } catch (cause) {
        if (active.current) {
          setSynced(false);
          setError(
            "Coșul este salvat local. Reîncearcă sincronizarea înainte de a continua pe alt dispozitiv.",
          );
        }
        throw cause;
      } finally {
        if (inFlight.current === operation) inFlight.current = null;
        if (active.current) setSyncing(false);
      }
    },
    [owner],
  );
  useClientLayoutEffect(() => {
    if (!authLoading) prepareCartOwner(owner || "guest");
  }, [owner, authLoading]);
  useEffect(() => {
    active.current = true;
    if (authLoading) return;
    const local = readLocalAccountCart();
    snapshot.current = local;
    setItems(local);
    const update = (event: Event) => {
      if (!active.current) return;
      const next =
        (event as CustomEvent<{ items?: AccountCartItem[] }>).detail?.items ||
        readLocalAccountCart();
      snapshot.current = next;
      setItems(next);
      setRevision((v) => v + 1);
    };
    const storage = (event: StorageEvent) => {
      if (
        event.key === ACCOUNT_CART_KEY &&
        cartStorage.getItem(ACCOUNT_CART_OWNER_KEY) === (owner || "guest")
      )
        update(event);
    };
    window.addEventListener(ACCOUNT_CART_EVENT, update);
    window.addEventListener("storage", storage);
    if (owner) {
      hydration.current = load();
      setCartBridge(flush);
    } else setReady(true);
    return () => {
      active.current = false;
      window.removeEventListener(ACCOUNT_CART_EVENT, update);
      window.removeEventListener("storage", storage);
      setCartBridge(null);
    };
  }, [owner, authLoading, load, flush]);
  useEffect(() => {
    if (!ready || !owner || !known.current || !hasPendingCart()) return;
    const timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 320);
    return () => clearTimeout(timer);
  }, [ready, owner, revision, flush]);
  const retry = useCallback(async () => {
    hydration.current = load();
    await hydration.current;
    if (known.current) await flush().catch(() => {});
  }, [load, flush]);
  return (
    <Context.Provider
      value={{
        items,
        loading: !ready,
        syncing,
        synced,
        error,
        replace,
        retry,
        flush,
      }}
    >
      {children}
    </Context.Provider>
  );
}
