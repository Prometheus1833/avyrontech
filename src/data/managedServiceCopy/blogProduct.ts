import {
  CalendarClock,
  Check,
  Eye,
  FileText,
  Image as ImageIcon,
  LayoutList,
  Moon,
  Smartphone,
  Tags,
  Type,
  Users,
} from "lucide-react";
export const cms = {
  ro: {
    eyebrow: "Panoul de administrare",
    title: "Un CMS pe care îl folosești fără manual",
    lead: "Fiecare secțiune are funcțiile ei clare: editor, SEO, media, planificare, categorii și echipă. Publici în minute, nu în ședințe.",
    tabs: [
      { id: "editor", label: "Editor", icon: Type },
      { id: "seo", label: "SEO", icon: Eye },
      { id: "media", label: "Media", icon: ImageIcon },
      { id: "plan", label: "Planificare", icon: CalendarClock },
      { id: "taxonomy", label: "Categorii", icon: Tags },
      { id: "team", label: "Echipă", icon: Users },
    ],
    panes: {
      editor: {
        d: "Scrii articolul în blocuri, cu salvare automată.",
        lines: ["Blocuri: titlu, citat, listă, cod, galerie, CTA", "Salvare automată și istoric versiuni", "Previzualizare instant, desktop și mobil"],
        actions: ["Adaugă bloc", "Compară versiuni", "Previzualizare"],
      },
      seo: {
        d: "Verifici cum arată articolul în Google înainte să apeși publică.",
        lines: ["Titlu SEO, descriere și slug editabile", "Previzualizare rezultat Google și card social", "Verificări automate: lungimi, linkuri, alt text"],
        actions: ["Analizează articolul", "Editează slug", "Adaugă redirect"],
      },
      media: {
        d: "Bibliotecă ordonată, imagini optimizate automat.",
        lines: ["Conversie automată în formate moderne", "Text alternativ obligatoriu pentru accesibilitate", "Căutare, foldere și înlocuire fișier"],
        actions: ["Încarcă", "Decupează", "Setează imagine principală"],
      },
      plan: {
        d: "Calendar editorial cu stări clare pentru fiecare articol.",
        lines: ["Programare la dată și oră", "Stări: ciornă, în revizuire, programat, publicat", "Notificări pentru articolele blocate"],
        actions: ["Programează", "Trimite la revizuire", "Duplică articol"],
      },
      taxonomy: {
        d: "Categorii, subcategorii și etichete cu reguli proprii.",
        lines: ["Reguli per categorie: layout, autor implicit, CTA", "Etichete și pagini de arhivă optimizate", "Reordonare și îmbinare fără linkuri stricate"],
        actions: ["Creează categorie", "Setează CTA implicit", "Îmbină etichete"],
      },
      team: {
        d: "Fiecare rol vede exact ce are nevoie.",
        lines: ["Roluri: administrator, editor, autor, colaborator", "Aprobare înainte de publicare", "Profiluri de autor cu bio și rețele"],
        actions: ["Invită autor", "Schimbă rol", "Vezi jurnal activitate"],
      },
    },
    meta: [
      { icon: Tags, label: "Categorii & clase" },
      { icon: Users, label: "Roluri" },
      { icon: LayoutList, label: "Fluxuri de lucru" },
      { icon: FileText, label: "Ciorne nelimitate" },
    ],
    fnLabel: "Funcții rapide",
  },
  en: {
    eyebrow: "Admin panel",
    title: "A CMS you can use without a manual",
    lead: "Every section has its own clear functions: editor, SEO, media, planning, categories and team. You publish in minutes, not in meetings.",
    tabs: [
      { id: "editor", label: "Editor", icon: Type },
      { id: "seo", label: "SEO", icon: Eye },
      { id: "media", label: "Media", icon: ImageIcon },
      { id: "plan", label: "Planning", icon: CalendarClock },
      { id: "taxonomy", label: "Categories", icon: Tags },
      { id: "team", label: "Team", icon: Users },
    ],
    panes: {
      editor: {
        d: "Write the article in blocks, with autosave.",
        lines: ["Blocks: heading, quote, list, code, gallery, CTA", "Autosave and version history", "Instant preview, desktop and mobile"],
        actions: ["Add block", "Compare versions", "Preview"],
      },
      seo: {
        d: "Check how the article looks in Google before hitting publish.",
        lines: ["Editable SEO title, description and slug", "Google result and social card preview", "Automatic checks: lengths, links, alt text"],
        actions: ["Analyse article", "Edit slug", "Add redirect"],
      },
      media: {
        d: "A tidy library with automatically optimised images.",
        lines: ["Automatic conversion to modern formats", "Alt text required for accessibility", "Search, folders and file replace"],
        actions: ["Upload", "Crop", "Set cover image"],
      },
      plan: {
        d: "An editorial calendar with clear states per article.",
        lines: ["Schedule by date and time", "States: draft, in review, scheduled, published", "Notifications for stalled articles"],
        actions: ["Schedule", "Send to review", "Duplicate article"],
      },
      taxonomy: {
        d: "Categories, subcategories and tags with their own rules.",
        lines: ["Per-category rules: layout, default author, CTA", "Optimised tags and archive pages", "Reorder and merge without breaking links"],
        actions: ["Create category", "Set default CTA", "Merge tags"],
      },
      team: {
        d: "Every role sees exactly what it needs.",
        lines: ["Roles: admin, editor, author, contributor", "Approval before publishing", "Author profiles with bio and socials"],
        actions: ["Invite author", "Change role", "View activity log"],
      },
    },
    meta: [
      { icon: Tags, label: "Categories & classes" },
      { icon: Users, label: "Roles" },
      { icon: LayoutList, label: "Workflows" },
      { icon: FileText, label: "Unlimited drafts" },
    ],
    fnLabel: "Quick functions",
  },
} as const;
export const reader = {
  ro: {
    eyebrow: "Experiența de lectură",
    title: "Conținut care se citește, nu doar se deschide",
    lead: "Tipografie editorială, ritm vizual, mod întunecat și o experiență mobilă construită pentru atenție.",
    items: [
      { icon: Type, t: "Tipografie editorială", d: "Ierarhie clară, lungime optimă a rândului, contrast corect." },
      { icon: LayoutList, t: "Cuprins interactiv", d: "Navigare rapidă în articolele lungi, cu secțiune activă." },
      { icon: Eye, t: "Progres lectură", d: "Indicator subtil care menține contextul." },
      { icon: Moon, t: "Mod întunecat", d: "Aceleași contraste corecte în ambele teme." },
      { icon: Smartphone, t: "Mobil întâi", d: "Layout gândit pentru citit cu o singură mână." },
      { icon: FileText, t: "Articole conectate", d: "Recomandări relevante la finalul lecturii." },
    ],
    demo: { toc: "Cuprins", sections: ["Introducere", "Structura articolului", "Distribuție", "Măsurare"] },
  },
  en: {
    eyebrow: "Reading experience",
    title: "Content that gets read, not just opened",
    lead: "Editorial typography, visual rhythm, dark mode and a mobile experience built for attention.",
    items: [
      { icon: Type, t: "Editorial typography", d: "Clear hierarchy, optimal line length, correct contrast." },
      { icon: LayoutList, t: "Interactive table of contents", d: "Fast navigation in long reads with an active section." },
      { icon: Eye, t: "Reading progress", d: "A subtle indicator that keeps the context." },
      { icon: Moon, t: "Dark mode", d: "The same correct contrast in both themes." },
      { icon: Smartphone, t: "Mobile first", d: "A layout designed for one-handed reading." },
      { icon: FileText, t: "Connected articles", d: "Relevant recommendations at the end of the read." },
    ],
    demo: { toc: "Contents", sections: ["Introduction", "Article structure", "Distribution", "Measurement"] },
  },
} as const;