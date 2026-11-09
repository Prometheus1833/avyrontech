# Mesaje necitite în Suport Staff

Contorul clientului însumează conversațiile proiectelor și răspunsurile din solicitările de suport. Fiecare sursă folosește propriile mesaje native și aceeași autorizare ca vizualizarea conversației. Mesajele proprii sunt excluse. Numărul este actualizat periodic în prim-plan și după confirmarea citirii.

Migrarea aditivă `0114_support_ticket_read_cursors.sql` introduce numai pozițiile de citire ale suportului. Pentru istoricul anterior, care nu avea dovada citirii, creează un punct de referință etichetat `is_baseline=1` pentru destinatarii autorizați la activare. Nu pretinde că acesta reprezintă o citire istorică. Mesajele existente sunt păstrate integral. Confirmarea reală schimbă eticheta în `0`.

API-uri autentificate, fără cache partajat:
- `GET /api/workspace/support-unread-count`: numai cont client, cu granturi active.
- `POST /api/workspace/tickets/:id/read`: verifică accesul înaintea unui răspuns idempotent; corp limitat, identificatorul mesajului verificat în aceeași solicitare; cursorul nu poate reveni în timp.
- `GET /api/workspace/tickets/:id/messages?recent=1`: ultima pagină, ordonată cronologic; `offset` permite istoricul anterior. Cererile existente fără `recent` își păstrează ordinea.

Interfața confirmă citirea la afișarea capătului conversației, numai în prim-plan. Eșecurile păstrează mesajele necitite și permit reîncercarea. Nu sunt trimise mesaje reale prin aceste operațiuni.

Release-ul folosește verificarea și bookmark-ul D1 existente înaintea migrării. Rollback-ul codului păstrează tabela aditivă; nu șterge mesaje, granturi ori documente. Starea merge/deploy și dovezile finale se consemnează în PR. Fără servicii, secrete, infrastructură sau costuri noi.
