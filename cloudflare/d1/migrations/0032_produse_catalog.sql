-- Produse Avyron (Artefacte) — fundația magazinului de produse digitale.
--
-- Migrare append-only, LOCALĂ: nu a fost aplicată în preview sau producție.
-- Se aplică odată cu checkout-ul (faza F2). Cererile publice din pagină merg
-- deja în `leads`, deci pagina funcționează și fără aceste tabele.
--
-- Principii păstrate din modulul financiar: sumele sunt întregi în unități
-- minore, ștergerea e arhivare, istoricul e append-only, iar prețul afișat de
-- browser nu e niciodată de încredere — Worker-ul recalculează din catalog.

CREATE TABLE IF NOT EXISTS product_items (
  slug            TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('component','section','template','effect','tool','api','doc','logo')),
  category        TEXT NOT NULL,
  access          TEXT NOT NULL CHECK (access IN ('free','pro','studio')),
  price_ron_cents INTEGER CHECK (price_ron_cents IS NULL OR price_ron_cents >= 0),
  status          TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('draft','live','soon','archived')),
  released_at     INTEGER NOT NULL,
  -- Trecerea progresivă în parteneriate: calculată din released_at, dar
  -- stocată explicit ca să poată fi suprascrisă pentru un produs anume.
  pro_at          INTEGER,
  free_at         INTEGER,
  name_ro         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  weight_kb       REAL NOT NULL DEFAULT 0,
  requires_gpu    INTEGER NOT NULL DEFAULT 0 CHECK (requires_gpu IN (0,1)),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_items_type ON product_items(type, status);
CREATE INDEX IF NOT EXISTS idx_product_items_access ON product_items(access, released_at);

-- Versiunile livrabile. Codul stă în R2 (privat); aici doar referința, hash-ul
-- și metadatele, ca la documentele financiare.
CREATE TABLE IF NOT EXISTS product_versions (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL REFERENCES product_items(slug),
  version       TEXT NOT NULL,
  r2_key        TEXT NOT NULL,
  sha256        TEXT NOT NULL,
  bytes         INTEGER NOT NULL CHECK (bytes > 0),
  changelog     TEXT,
  created_at    INTEGER NOT NULL,
  UNIQUE (slug, version)
);

-- Ce are dreptul să obțină un cont: din parteneriat sau din cumpărare separată.
CREATE TABLE IF NOT EXISTS product_entitlements (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  slug         TEXT REFERENCES product_items(slug),
  plan         TEXT CHECK (plan IN ('free','pro','studio')),
  source       TEXT NOT NULL CHECK (source IN ('plan','purchase','grant','promo')),
  order_id     TEXT,
  granted_at   INTEGER NOT NULL,
  expires_at   INTEGER,
  revoked_at   INTEGER,
  -- Un drept e fie pe un produs (cumpărare), fie pe un plan (parteneriat).
  CHECK ((slug IS NOT NULL AND plan IS NULL) OR (slug IS NULL AND plan IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_product_entitlements_user ON product_entitlements(user_id, revoked_at);

-- Contorul limitelor zilnice. O linie per (cont, produs, zi): a doua obținere
-- a aceluiași produs în aceeași zi nu mai consumă, iar auditul rămâne complet.
CREATE TABLE IF NOT EXISTS product_copy_events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  slug         TEXT NOT NULL REFERENCES product_items(slug),
  day          TEXT NOT NULL,                        -- YYYY-MM-DD, ora României
  channel      TEXT NOT NULL CHECK (channel IN ('cli','code','zip','mcp','prompt')),
  counted      INTEGER NOT NULL DEFAULT 1 CHECK (counted IN (0,1)),
  created_at   INTEGER NOT NULL,
  UNIQUE (user_id, slug, day)
);
CREATE INDEX IF NOT EXISTS idx_product_copy_day ON product_copy_events(day, user_id);

-- Colecția din cont: favorite și dosare proprii.
CREATE TABLE IF NOT EXISTS product_collections (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS product_collection_items (
  collection_id TEXT NOT NULL REFERENCES product_collections(id),
  slug          TEXT NOT NULL REFERENCES product_items(slug),
  note          TEXT,
  added_at      INTEGER NOT NULL,
  PRIMARY KEY (collection_id, slug)
);

-- Cererile de funcții, cu voturi. Inboxul din AVYRON OS lucrează pe tabelul
-- `leads`; aici ajung doar cererile promovate în backlog public.
CREATE TABLE IF NOT EXISTS product_feature_requests (
  id           TEXT PRIMARY KEY,
  lead_id      TEXT,
  title        TEXT NOT NULL,
  detail       TEXT,
  category     TEXT,
  votes        INTEGER NOT NULL DEFAULT 0 CHECK (votes >= 0),
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','planned','building','shipped','declined')),
  shipped_slug TEXT REFERENCES product_items(slug),
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_feature_requests(status, votes);

-- Parteneriatele, ca produse vandabile. Prețurile rămân în catalogul de comerț
-- al Worker-ului; aici e doar definiția planului și limitele lui.
CREATE TABLE IF NOT EXISTS partnership_plans (
  id                TEXT PRIMARY KEY CHECK (id IN ('free','pro','studio')),
  name              TEXT NOT NULL,
  price_ron_cents   INTEGER NOT NULL CHECK (price_ron_cents >= 0),
  price_eur_cents   INTEGER NOT NULL CHECK (price_eur_cents >= 0),
  components_per_day INTEGER NOT NULL CHECK (components_per_day >= 0),
  sections_per_day   INTEGER NOT NULL CHECK (sections_per_day >= 0),
  templates_per_day  INTEGER NOT NULL CHECK (templates_per_day >= 0),
  updated_at        INTEGER NOT NULL
);

INSERT OR IGNORE INTO partnership_plans (id,name,price_ron_cents,price_eur_cents,components_per_day,sections_per_day,templates_per_day,updated_at)
VALUES
  ('free','AVY Partener Free',0,0,3,2,1,unixepoch()*1000),
  ('pro','AVY Partener Pro',27000,5000,10,5,3,unixepoch()*1000),
  ('studio','AVY Studio',52000,10000,25,10,5,unixepoch()*1000);
