import { createContext, useContext } from "react";
import type { AccountCartItem } from "@/lib/accountCart";
type Value = {
  items: AccountCartItem[];
  loading: boolean;
  syncing: boolean;
  synced: boolean;
  error: string;
  replace: (
    items:
      | AccountCartItem[]
      | ((current: AccountCartItem[]) => AccountCartItem[]),
  ) => void;
  retry: () => Promise<void>;
  flush: () => Promise<AccountCartItem[]>;
};
export const AccountCartContext = createContext<Value | null>(null);
export function useAccountCart() {
  const value = useContext(AccountCartContext);
  if (!value) throw new Error("AccountCartProvider missing");
  return value;
}
