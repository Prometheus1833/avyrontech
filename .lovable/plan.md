## Modificări cerute

### 1. Secțiunea „De ce ai nevoie de un site?" (`src/i18n/translations.ts` + `src/components/site/Problem.tsx`)

**Înlocuire item „Pare complicat":**
- Titlu nou: `Nu ești vizibil pentru AI`
- Descriere nouă: `Fără un site oficial cu o descriere relevantă și profesionistă, motoarele AI și asistenții moderni nu te recomandă atunci când clienții întreabă despre serviciile tale.`
- Iconul actual `FileQuestion` se schimbă într-unul potrivit pentru AI (ex. `Bot` sau `Sparkles`) în `Problem.tsx`.

**Rescriere item „Credibilitate fragilă":**
- Titlu păstrat: `Credibilitate fragilă`
- Descriere nouă (orientată pe beneficiile unui site oficial, înlocuind „afacere" cu „activitate"):
  `Un site oficial confirmă că activitatea ta este reală și profesionistă — oferă transparență, contact clar și încredere instant, exact ce caută clienții înainte să aleagă.`

Aceleași modificări se aplică și în versiunea engleză (`en.problem.items`), cu „business" → „activity" și traducere echivalentă.

### 2. Secțiunea „Alege domeniul tău și vezi cum ar arăta." (`src/components/site/Examples.tsx` + assets noi)

În prezent, fiecare categorie afișează o **singură poză** statică în partea stângă. Cerința: înlocuim acea poză cu un **mock-up de pagină de prezentare relevant** pentru fiecare categorie — adică un mic „dashboard/homepage" stilizat, construit în React/Tailwind, care reflectă conținutul tipic al categoriei și include funcționalități proprii.

**Structură nouă:**
- Cream un folder `src/components/site/mockups/` cu câte un component per categorie:
  - `BeautyMockup.tsx` — header salon + grilă servicii cu prețuri + buton „Programează" + mini-galerie (folosește `salon` foto ca background într-un card)
  - `RestoMockup.tsx` — meniul zilei + card rezervare + linkuri Glovo/Tazz (folosește `resto` foto)
  - `PublicMockup.tsx` — anunțuri oficiale + documente descărcabile + program audiențe (folosește `publicImg`)
  - `TurismMockup.tsx` — card cameră cu preț/noapte + buton „Rezervă" + rating (folosește `hotel` foto)
  - `ProMockup.tsx` — listă arii de practică + CTA „Programează consultație" + secțiune documente (folosește `lawyer` foto)
  - `LocalMockup.tsx` — buton apel mare + formular cerere ofertă + zonă acoperire (folosește `local` foto)
  - `NationalMockup.tsx` — wallet Retuvo + scanare cod + hartă puncte (folosește `retuvoLogo`)
  - `OtherMockup.tsx` — card „spune-ne ideea ta" cu input demo
- Fiecare mockup este un mini-layout în stilul unui browser/dashboard (bara cu cele 3 puncte colorate sus, conținut dedesubt), responsive, fără interactivitate reală — pur vizual + structural.
- În `Examples.tsx`: înlocuim blocul `<img>` / `<HelpCircle>` cu un switch care randează componentul de mockup corespunzător categoriei active, păstrând aceeași tranziție AnimatePresence și aceleași dimensiuni de container.

### 3. Înlocuire texte „mockup" / „vizual"

**În `src/i18n/translations.ts`:**
- `ro.cta.bullets[0]`: `"✓ Mockup vizual personalizat"` → `"✓ Produs vizual+funcțional personalizat"`
- `en.cta.bullets[0]`: traducere echivalentă, ex. `"✓ Personalized visual+functional product"`

Verificare globală cu `rg` pentru alte apariții ale cuvintelor „mockup" / „vizual" în traduceri și înlocuire unde apar în context similar.

## Detalii tehnice

- Mockup-urile sunt componente pur prezentaționale (fără state), stilizate cu Tailwind, încadrate într-un wrapper cu `aspect-[4/3]` pentru a păstra aspectul cardului existent.
- Pozele existente (`work-*.jpg`) sunt refolosite ca elemente de background/hero în interiorul mockup-urilor, nu eliminate.
- `Examples.tsx`: `images` map devine `mockups` map cu referințe la componente; condiția `{img ? ... : ...}` devine un randare directă a `<MockupComponent />`.
- Iconul nou pentru „Nu ești vizibil pentru AI" se importă din `lucide-react` (recomandat: `Bot`).
- Nu se modifică structura grid-ului (tot `md:grid-cols-2`), nu se modifică panoul cu features din dreapta.
