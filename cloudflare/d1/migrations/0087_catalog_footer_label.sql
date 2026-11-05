-- Align the existing public artefact label; retain its stable slug and every
-- commercial/access field. A customized internal title is never overwritten.
UPDATE product_items
SET name_ro='Bara ANPC și SAL pentru subsol',
    updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE slug='bara-anpc-sol' AND name_ro='Bara ANPC și SOL pentru subsol';
