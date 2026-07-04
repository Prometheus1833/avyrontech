# Rute prefixate pe limbă pentru SEO bilingv

Google va putea indexa separat varianta RO (URL curent) și EN (prefixat `/en/`) pentru paginile cheie. RO rămâne canonical la rădăcină (fără prefix), EN primește prefix.

## Pagini incluse

| RO (canonical)              | EN                             |
| --------------------------- | ------------------------------ |
| `/`                         | `/en`                          |
| `/costurisiproduse`         | `/en/pricing`                  |
| `/despre-si-portofoliu`     | `/en/about`                    |
| `/blog`                     | `/en/blog`                     |
| `/gdpr`                     | `/en/privacy`                  |

Exclus (rămân doar RO): rute demo `/exemple/*`, pagini interne (`/auth`, `/profil`, `/intern`, `/reset-password`, etc.), pagini de eroare.

## Ce se schimbă

### 1. Router (`src/App.tsx`)
- Adaug rutele `/en`, `/en/pricing`, `/en/about`, `/en/blog`, `/en/privacy` mapate pe aceleași componente ca RO.
- Wrap-uiesc cele două grupuri (RO + EN) într-o componentă `LanguageRoute` care detectează prefixul din URL și forțează limba corectă în `LanguageContext` la mount.

### 2. `LanguageContext` (`src/i18n/LanguageContext.tsx`)
- Adaug o metodă internă `setLangFromRoute(lang)` care schimbă limba fără a scrie în `localStorage` (URL-ul e sursa de adevăr când există prefix).
- Când nu există prefix `/en`, se păstrează comportamentul actual (localStorage).

### 3. SEO (`src/lib/seo.ts` + pagini)
- `setPageMeta` primește un nou parametru opțional `altPath` (URL-ul variantei alternative).
- `canonical` = URL-ul curent (RO fără prefix / EN cu prefix).
- `hreflang` alternates devin URL-uri distincte:
  - `ro` → varianta RO
  - `en` → varianta EN
  - `x-default` → varianta RO
- Fiecare pagină cheie transmite ambele path-uri (RO + EN) către `setPageMeta`.

### 4. Language switch (`src/components/site/LangSwitch.tsx`)
- La schimbarea limbii, navighez la URL-ul echivalent (map RO↔EN) în loc să setez doar localStorage.
- Folosesc un map simplu `pathname → equivalent` pentru cele 5 pagini traduse; alte rute rămân neschimbate cu update pe context.

### 5. Sitemap (`public/sitemap.xml`)
- Adaug intrări pentru variantele `/en/*`.
- Fiecare `<url>` primește `<xhtml:link rel="alternate" hreflang="...">` pentru RO/EN/x-default (standard sitemap i18n Google).

### 6. `robots.txt`
- Nicio schimbare — noile rute sunt sub `Allow: /` implicit.

## Detalii tehnice

**Detecție limbă din URL:** un helper `getLangFromPath(pathname)` returnează `"en"` dacă începe cu `/en` (sau este exact `/en`), altfel `"ro"`.

**LangSwitch map:**
```
{ "/": "/en",
  "/costurisiproduse": "/en/pricing",
  "/despre-si-portofoliu": "/en/about",
  "/blog": "/en/blog",
  "/gdpr": "/en/privacy" }
```
(și invers pentru EN→RO)

**setPageMeta actualizat:**
```
setPageMeta({
  title, description,
  path: "/costurisiproduse",       // curent
  alternates: {
    ro: "/costurisiproduse",
    en: "/en/pricing",
  },
})
```

**Ce NU fac:** nu introduc `react-i18next`, nu schimb `LanguageProvider` la nivel de tip, nu creez SSR. Traducerile existente din `translations.ts` rămân neschimbate — doar sursa limbii (URL în loc de localStorage) se schimbă pentru rutele prefixate.

## Confirmare

E o schimbare mai amplă (router + context + SEO + sitemap + switch). Confirmi să continui cu implementarea?
