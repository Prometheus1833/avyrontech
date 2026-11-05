import { useRef, useState } from "react";
import { toast } from "sonner";
import { errorText } from "./clientPresentation";
export function useClientMutation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    retry = useRef({ hash: "", key: crypto.randomUUID() });
  const run = async <T>(
    body: unknown,
    action: (key: string) => Promise<T>,
    success: (result: T) => void | Promise<void>,
  ) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify(body)),
          ),
        ),
      )
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      if (hash !== retry.current.hash)
        retry.current = { hash, key: crypto.randomUUID() };
      const result = await action(retry.current.key);
      await success(result);
      retry.current = { hash: "", key: crypto.randomUUID() };
    } catch (e) {
      setError(errorText(e));
      toast.error(errorText(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { run, busy, error, setError };
}
