-- 0061_avy_public_offer_sync.sql
-- Sincronizează răspunsurile publice AVY cu oferta curentă a website-ului.
-- Istoricul migrațiilor rămâne neschimbat; actualizăm numai intrările active.

PRAGMA foreign_keys = ON;

UPDATE ai_knowledge
   SET answer = 'Website-ul de prezentare profesional pornește de la 1.450 lei. Include design personalizat, conținut, SEO tehnic, panou de administrare și email pe domeniu. Prețul final depinde de structură, funcționalități și oferta agreată. Poți vedea o estimare în configuratorul serviciului sau poți discuta cu echipa pe WhatsApp la +40 734 605 055.',
       keywords = 'pret site website prezentare cat costa tarif 1450 lei',
       source = 'public-offer-sync-2026-10-12',
       priority = 10,
       updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
 WHERE id = 'kb2_ro_pret_site';

UPDATE ai_knowledge
   SET answer = 'The Professional Presentation Website starts at 1,450 RON. It includes custom design, content, technical SEO, an administration panel and domain email. The final price depends on structure, features and the agreed proposal. Use the service configurator for an estimate or contact the team on WhatsApp at +40 734 605 055.',
       keywords = 'price professional presentation website cost 1450 ron',
       source = 'public-offer-sync-2026-10-12',
       priority = 10,
       updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
 WHERE id = 'kb2_en_site_price';

PRAGMA optimize;
