export type ClientPayment = {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  paid_at: number | null;
  date_kind: "payment" | "confirmation";
  invoice_id: string | null;
  invoice_number: string | null;
  order_id: string | null;
  provider: string | null;
  download_available: 0 | 1;
};
