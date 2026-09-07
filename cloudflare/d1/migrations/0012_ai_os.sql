-- AI OS "AVY" — agenți, bază de cunoștințe, conversații, măsurare și auto-învățare.
-- Control total: doar prometheus@avyron.ro poate modifica (aplicat în Worker).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ai_agents (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  mission        TEXT NOT NULL DEFAULT '',
  channel        TEXT NOT NULL DEFAULT 'site',      -- site | whatsapp | meta | email | intern
  status         TEXT NOT NULL DEFAULT 'draft',     -- draft | active | paused
  visibility     TEXT NOT NULL DEFAULT 'private',   -- public | private
  model          TEXT NOT NULL DEFAULT '@cf/meta/llama-3.1-8b-instruct',
  temperature    REAL NOT NULL DEFAULT 0.3,
  max_tokens     INTEGER NOT NULL DEFAULT 600,
  autonomy       TEXT NOT NULL DEFAULT 'assist',    -- assist | semi | auto
  language       TEXT NOT NULL DEFAULT 'ro',
  accent         TEXT NOT NULL DEFAULT '#5B8CFF',
  greeting_ro    TEXT NOT NULL DEFAULT '',
  greeting_en    TEXT NOT NULL DEFAULT '',
  system_prompt  TEXT NOT NULL DEFAULT '',
  guardrails     TEXT NOT NULL DEFAULT '',
  tools_json     TEXT NOT NULL DEFAULT '[]',
  handoff_email  TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  updated_by     TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status, visibility);

CREATE TABLE IF NOT EXISTS ai_knowledge (
  id          TEXT PRIMARY KEY,
  agent_slug  TEXT,                                  -- NULL = disponibil tuturor agenților
  category    TEXT NOT NULL DEFAULT 'general',       -- agentie | produse | preturi | proces | contact | tehnic | obiectii
  language    TEXT NOT NULL DEFAULT 'ro',
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  keywords    TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'seed',          -- seed | site | social | manual | learned
  source_url  TEXT,
  priority    INTEGER NOT NULL DEFAULT 5,
  status      TEXT NOT NULL DEFAULT 'active',        -- active | draft | archived
  hits        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_lookup ON ai_knowledge(status, language, category);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id           TEXT PRIMARY KEY,
  agent_slug   TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'site',
  visitor_id   TEXT,
  user_id      TEXT,
  language     TEXT NOT NULL DEFAULT 'ro',
  page         TEXT,
  status       TEXT NOT NULL DEFAULT 'open',         -- open | handoff | closed
  intent       TEXT,
  lead_email   TEXT,
  converted    INTEGER NOT NULL DEFAULT 0,
  messages     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  last_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_conv_agent ON ai_conversations(agent_slug, created_at);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL,                     -- user | assistant | system
  content         TEXT NOT NULL,
  matched_ids     TEXT,
  confidence      REAL,
  latency_ms      INTEGER,
  helpful         INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id, created_at);

-- Coadă de auto-îmbunătățire: întrebările fără răspuns bun intră aici.
CREATE TABLE IF NOT EXISTS ai_learning_queue (
  id            TEXT PRIMARY KEY,
  agent_slug    TEXT NOT NULL,
  language      TEXT NOT NULL DEFAULT 'ro',
  question      TEXT NOT NULL,
  occurrences   INTEGER NOT NULL DEFAULT 1,
  best_score    REAL NOT NULL DEFAULT 0,
  draft_answer  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',     -- pending | approved | rejected
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_learn_status ON ai_learning_queue(status, occurrences);

-- Seed: agenți
INSERT OR IGNORE INTO ai_agents
  (id, slug, name, mission, channel, status, visibility, autonomy, language, accent,
   greeting_ro, greeting_en, system_prompt, guardrails, tools_json, handoff_email, created_at, updated_at)
VALUES
  ('agent_avy', 'avy', 'AVY — Asistent Avyron',
   'Răspunde vizitatorilor despre agenție, produse, prețuri și proces, și îi transformă în lead-uri calificate.',
   'site', 'active', 'public', 'semi', 'ro', '#5B8CFF',
   'Salut! Sunt AVY, asistentul Avyron. Te ajut cu prețuri, produse sau o ofertă rapidă.',
   'Hi! I am AVY, the Avyron assistant. Ask me about products, pricing or get a quick quote.',
   'Ești AVY, asistentul oficial al agenției Avyron. Ton profesionist, prietenos, tech, concis. Răspunzi DOAR pe baza contextului furnizat despre Avyron. Dacă nu știi, spui sincer și oferi contactul echipei. Orientezi discuția spre conversie: recomanzi produsul potrivit și propui o ofertă sau o discuție.',
   'Nu inventa prețuri sau termene. Nu cere date sensibile (card, CNP). Maxim 120 de cuvinte pe răspuns. Răspunde în limba utilizatorului.',
   '["knowledge_search","recommend_product","capture_lead"]', 'contact@avyron.ro',
   strftime('%s','now'), strftime('%s','now')),
  ('agent_leads', 'leads', 'AVY Leads',
   'Preia și califică cererile din Meta, Instagram, WhatsApp și formulare, răspunde rapid și programează discuții.',
   'meta', 'draft', 'private', 'semi', 'ro', '#7C5CFF',
   'Bună! Îți răspund în câteva secunde cu detalii și un preț estimativ.',
   'Hello! I will reply in seconds with details and an estimated price.',
   'Ești agentul de lead-uri Avyron. Califici cererea (buget, tip proiect, termen), răspunzi scurt și propui următorul pas concret.',
   'Nu promite termene ferme. Escaladează către echipă la buget peste 5000 lei.',
   '["qualify_lead","capture_lead","handoff"]', 'contact@avyron.ro',
   strftime('%s','now'), strftime('%s','now')),
  ('agent_support', 'support', 'AVY Support',
   'Răspunde clienților existenți despre mentenanță, facturi, domenii și status proiect.',
   'site', 'draft', 'private', 'assist', 'ro', '#22C7A9',
   'Salut! Te ajut cu proiectul, mentenanța sau facturile tale.',
   'Hi! I can help with your project, care plan or invoices.',
   'Ești agentul de suport Avyron pentru clienți existenți. Ton calm, clar, orientat pe rezolvare.',
   'Nu accesa date financiare. Escaladează orice cerere de rambursare.',
   '["knowledge_search","handoff"]', 'contact@avyron.ro',
   strftime('%s','now'), strftime('%s','now')),
  ('agent_content', 'content', 'AVY Content',
   'Generează idei, briefuri și structuri SEO pentru blogul Avyron și pentru clienți.',
   'intern', 'draft', 'private', 'assist', 'ro', '#F5A524',
   'Îți pregătesc un brief editorial în câteva secunde.',
   'I can draft an editorial brief in seconds.',
   'Ești agentul editorial Avyron. Produci structuri SEO, titluri și briefuri clare.',
   'Fără conținut plagiat. Respectă tonul brandului.',
   '["knowledge_search"]', NULL,
   strftime('%s','now'), strftime('%s','now'));

-- Seed: bază de cunoștințe orientată spre conversie
INSERT OR IGNORE INTO ai_knowledge (id, agent_slug, category, language, question, answer, keywords, source, priority, created_at, updated_at) VALUES
 ('kb_ro_agentie', NULL, 'agentie', 'ro', 'Cine este Avyron?',
  'Avyron este o agenție digitală românească care construiește website-uri premium, magazine online, bloguri profesionale, identitate social media și agenți AI. Lucrăm rapid, transparent și cu focus pe rezultate măsurabile: trafic, lead-uri și vânzări.',
  'avyron agentie cine sunteti despre', 'seed', 9, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_produse', NULL, 'produse', 'ro', 'Ce servicii oferă Avyron?',
  'Servicii principale: website de prezentare premium, magazin online, blog profesional & content hub, identitate social media, aplicații web și mobile, agent AI personalizat, testare QA și pachete de mentenanță.',
  'servicii produse oferta ce faceti', 'seed', 9, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_blog', NULL, 'preturi', 'ro', 'Cât costă blogul profesional?',
  'Blog Profesional & Content Hub pornește de la 1.500 lei (în loc de 2.400 lei). Include structură SEO, panou de administrare, performanță și optimizare pentru indexare. Extra: limbi suplimentare (+100 lei de la a 3-a) și AI Content Intelligence (1.000 lei).',
  'blog pret cost profesional content hub', 'seed', 8, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_preturi', NULL, 'preturi', 'ro', 'Cum se stabilește prețul unui proiect?',
  'Prețul depinde de tipul proiectului, numărul de pagini, funcționalități și termen. Ai configuratoare pe paginile de produs pentru o estimare instantă, iar oferta finală o primești în maximum 24 de ore după o scurtă discuție.',
  'pret cost buget oferta estimare', 'seed', 8, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_proces', NULL, 'proces', 'ro', 'Cum decurge colaborarea?',
  'Pași: 1) discuție scurtă și brief, 2) ofertă și plan, 3) design și construcție, 4) revizii, 5) lansare și indexare, 6) mentenanță opțională. Primul livrabil vizual apare de regulă în 3–7 zile.',
  'proces pasi colaborare timp durata livrare', 'seed', 7, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_contact', NULL, 'contact', 'ro', 'Cum vă contactez?',
  'Ne scrii la contact@avyron.ro, pe WhatsApp din butonul flotant, sau completezi formularul de pe site. Răspundem de regulă în aceeași zi lucrătoare.',
  'contact email telefon whatsapp programare', 'seed', 9, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_tehnic', NULL, 'tehnic', 'ro', 'Ce tehnologii folosiți?',
  'Construim pe infrastructură Cloudflare (Workers, D1, R2, KV) cu front-end modern React/Vite. Rezultatul: viteză mare, securitate, costuri mici de operare și scor bun în Core Web Vitals.',
  'tehnologii stack cloudflare viteza performanta seo', 'seed', 6, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_obiectii', NULL, 'obiectii', 'ro', 'De ce nu un site pe un template ieftin?',
  'Un template arată ca al tuturor, se încarcă greu și rareori aduce clienți. Noi livrăm structură orientată pe conversie, viteză reală și SEO tehnic, plus suport uman. Diferența se vede în lead-uri, nu doar în design.',
  'de ce scump template wordpress ieftin diferenta', 'seed', 6, strftime('%s','now'), strftime('%s','now')),
 ('kb_ro_social', NULL, 'agentie', 'ro', 'Unde vă găsesc pe rețele sociale?',
  'Suntem pe Instagram (@avyrontech), Facebook (Avyron Dev), TikTok (@avyron4) și LinkedIn (Avyron Solutions). Acolo publicăm proiecte recente și rezultate.',
  'instagram facebook tiktok linkedin social retele', 'site', 5, strftime('%s','now'), strftime('%s','now')),
 ('kb_en_about', NULL, 'agentie', 'en', 'What is Avyron?',
  'Avyron is a Romanian digital agency building premium websites, online stores, professional blogs, social media identity and custom AI agents, with a focus on measurable results.',
  'avyron about agency who', 'seed', 9, strftime('%s','now'), strftime('%s','now')),
 ('kb_en_pricing', NULL, 'preturi', 'en', 'How much does a project cost?',
  'Pricing depends on project type, pages, features and deadline. Each product page has a configurator for an instant estimate; the final quote arrives within 24 hours after a short call. The Professional Blog starts at 1,500 RON (from 2,400 RON).',
  'price cost budget quote estimate blog', 'seed', 8, strftime('%s','now'), strftime('%s','now')),
 ('kb_en_contact', NULL, 'contact', 'en', 'How do I contact Avyron?',
  'Email contact@avyron.ro, message us on WhatsApp using the floating button, or fill in the site form. We usually reply the same business day.',
  'contact email whatsapp form reply', 'seed', 9, strftime('%s','now'), strftime('%s','now'));
