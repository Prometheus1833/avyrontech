import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
export function useSubscriptionData<T>(loader: () => Promise<T>) {
  const { user } = useAuth(),
    [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    sequence = useRef(0),
    alive = useRef(false);
  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    try {
      const result = await loader();
      if (alive.current && seq === sequence.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (alive.current && seq === sequence.current) {
        setData(null);
        setError(
          e instanceof Error ? e.message : "Datele nu pot fi încărcate.",
        );
      }
    } finally {
      if (alive.current && seq === sequence.current) setLoading(false);
    }
  }, [loader]);
  const deactivate = useCallback(() => {
    alive.current = false;
    ++sequence.current;
  }, []);
  useEffect(() => {
    alive.current = true;
    setData(null);
    setLoading(true);
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    window.addEventListener("avyron:subscriptions-changed", update);
    return () => {
      deactivate();
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("avyron:subscriptions-changed", update);
    };
  }, [refresh, user?.id, deactivate]);
  return { data, error, loading, refresh };
}
