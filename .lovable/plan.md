## Etapa 1 — Fundația sistemului de cont

Această etapă livrează un sistem de autentificare 100% funcțional, gata de folosit. Etapele 2-5 (dashboard client, staff zone, chat, plăți) le facem ulterior, pe rând, în sprint-uri separate.

---

### 1. Backend (Lovable Cloud)

**Tabele noi în bază de date:**

- `profiles` — conectat 1-la-1 cu contul de auth
  - `id`, `display_name`, `avatar_url`, `phone`, `address`, `entity_type` (`individual` / `srl` / `pfa` / `ii` / `other`), `company_name`, `cui`, `social_facebook`, `social_instagram`, `social_tiktok`, `website`, `language` (`ro`/`en`), `theme` (`light`/`dark`/`system`), `created_at`, `updated_at`
- `user_roles` — tabel separat pentru securitate
  - `id`, `user_id`, `role` (enum: `user`, `staff`, `admin`)

**Funcții & triggere:**
- Enum `app_role`
- Funcție `has_role(_user_id, _role)` — `SECURITY DEFINER` pentru a evita recursiunea în RLS
- Trigger `on_auth_user_created` → creează automat `profiles` + atribuie rol `user` la signup

**RLS policies:**
- `profiles`: user-ul vede/editează doar propriul profil; staff-ul poate vedea toți
- `user_roles`: doar admin poate INSERT/UPDATE/DELETE; user vede doar rolurile proprii
- `examples` (existent) — nemodificat

**Storage bucket nou:** `avatars` (public) — pentru pozele de profil + RLS pe `storage.objects` (user încarcă doar în folderul `{user_id}/`)

**Auth config:**
- Email + parolă: confirmare email DEZACTIVATĂ (login direct după register)
- Google OAuth: activat (managed Lovable Cloud — fără setup)
- Apple OAuth: activat (managed Lovable Cloud — fără setup)
- `Site URL` și redirect URLs configurate corect

**Crearea staff-ului:** după ce conturile există, eu îți voi rula manual `INSERT INTO user_roles (user_id, role) VALUES (..., 'staff')` când îmi spui ce email să promovez.

---

### 2. Frontend — pagini noi

**`/auth`** — pagină unică cu tab-uri Login / Register
- Layout split-screen: stânga gradient brand + descriere persuasivă, dreapta formular
- Descriere copy (RO+EN) explicând beneficiile contului:
  - **Pentru clienți:** monitorizare produse achiziționate, status mentenanță, facturi, plată recurentă din platformă
  - **Pentru toți:** noutăți tech, sfaturi de securitate, acces la noile colaborări/funcții
- Butoane: **Continuă cu Google**, **Continuă cu Apple**, separator, apoi email + parolă
- Pe register: alegere `entity_type` (Persoană fizică / SRL / PFA / II / Altele)
- Validare cu `zod` (email regex, parolă min 8 caractere, etc.)
- Link **Am uitat parola** → `/forgot-password`

**`/forgot-password`**
- Input email → `resetPasswordForEmail` cu `redirectTo: /reset-password`
- Mesaj de confirmare

**`/reset-password`**
- Detectează `type=recovery` în URL hash
- Form parolă nouă + confirmare → `auth.updateUser({ password })`
- Redirect către `/profil` la succes

**`/profil`**
- Form complet de editare profil: nume, telefon, adresă, tip entitate (+ câmpuri condiționale CUI/denumire firmă), social links
- Upload avatar (drag & drop) — se salvează în bucket `avatars`, se reflectă imediat în meniul de sus
- Setări limbă & temă
- Buton **Schimbă parola**
- Buton **Deconectează-te**

---

### 3. Modificări UI existent

**`Nav.tsx`** (meniul hamburger sus-dreapta):
- **Dacă NU e logat:** deasupra link-urilor existente (De ce ai nevoie / Exemple / Proces / FAQ) apare un buton **Conectează-te / Înregistrează-te**
- **Dacă ESTE logat (user normal):** apare avatar (sau hamburger pe mobil) → la click se deschide meniu cu:
  1. **Profil** (cu avatar + nume sus)
  2. *Produsul meu* — placeholder "În curând" (Etapa 2)
  3. *Abonamentul meu* — placeholder "În curând" (Etapa 2)
  4. *Setări* — placeholder "În curând" (Etapa 2)
  5. *Noutăți* — placeholder "În curând" (Etapa 2)
  6. *Contact* (link existent)
  7. **Deconectează-te**
- **Dacă ESTE logat (staff):** meniu cu placeholder-e:
  1. **Profil** (funcțional)
  2. *Proiectele mele* — "În curând" (Etapa 3)
  3. *Mentenanță* — "În curând" (Etapa 3)
  4. *Intern* — "În curând" (Etapa 3)
  5. *Resurse* — "În curând" (Etapa 3)
  6. *Setări* — "În curând"
  7. **Deconectează-te**
- Pe mobil: avatar înlocuiește iconul hamburger (cum ai cerut)

**Translations (`i18n/translations.ts`):**
- Toate textele auth + profil + meniuri în RO și EN

---

### 4. Logică de sesiune (critical)

**Hook nou `useAuth`** care:
- Setează `onAuthStateChange` listener PRIMA, apoi `getSession()` (regula obligatorie Supabase)
- Expune `{ user, session, profile, role, loading, signOut }`
- Profile-ul se citește separat după ce sesiunea e setată (cu `setTimeout(0)` pentru a evita deadlock-uri)

**Componentă `<ProtectedRoute>`:**
- Pentru `/profil` → redirect la `/auth` dacă nu e logat
- Va fi reutilizată în Etapele 2-3 pentru paginile staff/client

---

### 5. Design

- 100% shadcn + Tailwind cu tokens existenți din `index.css`
- Estetică: minimal-tech, în linie cu landing-ul Avyron
- Pagina `/auth`: gradient subtil pe partea stângă cu copy persuasiv, card alb cu formular pe dreapta
- Avatar fallback: inițiale pe gradient brand
- Responsive complet (mobil: tab-urile login/register sus, formularul full-width)

---

### Ce NU face Etapa 1 (lăsăm pentru sprint-urile următoare)

- ❌ Pagini Produsul meu / Abonamentul meu / Setări detaliate / Noutăți (Etapa 2)
- ❌ Zona staff: Proiecte / Mentenanță / Intern / Resurse (Etapa 3)
- ❌ Chat realtime tip WhatsApp/Discord (Etapa 4)
- ❌ Plăți recurente Stripe (Etapa 5)
- ❌ Facebook / Instagram OAuth (nesuportat de backend-ul Lovable)

Toate butoanele lor vor exista în meniu, dar deschise vor afișa "În curând" — astfel structura UI e gata și adăugăm conținutul ulterior fără să schimbăm meniul.

---

### Detalii tehnice (pentru referință)

```text
Fișiere noi:
├── src/pages/Auth.tsx
├── src/pages/ForgotPassword.tsx
├── src/pages/ResetPassword.tsx
├── src/pages/Profile.tsx
├── src/components/auth/AuthForm.tsx
├── src/components/auth/SocialButtons.tsx
├── src/components/auth/ProtectedRoute.tsx
├── src/components/auth/UserMenu.tsx          (înlocuiește hamburger când e logat)
├── src/hooks/useAuth.tsx                      (provider + hook)
├── src/lib/validators/auth.ts                 (zod schemas)
└── supabase/migrations/<timestamp>_auth.sql

Fișiere modificate:
├── src/App.tsx                  (adaugă AuthProvider + rute noi)
├── src/components/site/Nav.tsx  (buton login / user menu)
└── src/i18n/translations.ts     (RO + EN)
```

După aprobare, implementez tot mai sus într-o singură rulare. Apoi tu testezi register/login/profil/upload avatar și, când zici "ok", trecem la Etapa 2.