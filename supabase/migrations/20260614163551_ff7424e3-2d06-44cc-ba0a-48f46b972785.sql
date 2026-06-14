CREATE TABLE IF NOT EXISTS public.exchange_rates (
  pair TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL,
  source TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exchange_rates TO anon, authenticated;
GRANT ALL ON public.exchange_rates TO service_role;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read exchange rates" ON public.exchange_rates FOR SELECT USING (true);