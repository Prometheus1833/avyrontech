import { z } from 'zod';
export const presentationSchema=z.object({
 summary:z.string().max(300).default(''),description:z.string().max(700).default(''),
 features:z.array(z.string().min(1).max(90)).max(4).default([]),fit:z.string().max(250).default(''),
 steps:z.array(z.string().min(1).max(180)).max(4).default([]),outcome:z.string().max(350).default(''),cta:z.string().max(70).default(''),
}).strict();
export type SurveyPresentation=z.infer<typeof presentationSchema>;
export const hiddenPublicTemplates=new Set(['seo','feedback','onboarding','content']);
// Initial content only. The public API uses the editable presentation saved in D1.
export const seedPresentations:Record<string,SurveyPresentation>={
  "website": {
    "summary": "Prezintă clar ce oferi și ajută vizitatorii să facă următorul pas: să te contacteze, să ceară o ofertă sau să se programeze.",
    "description": "Un website începe cu o explicație bună a afacerii tale. Clarificăm mesajul, structura paginilor și drumul de la prima vizită la o discuție cu echipa ta.",
    "features": [
      "Servicii ușor de înțeles",
      "Contact și programări",
      "Experiență pe mobil"
    ],
    "fit": "Afaceri care își construiesc prezența online sau vor un website mai convingător.",
    "steps": [
      "Stabilim publicul, serviciile și obiectivul principal.",
      "Alegem paginile, limbile și funcțiile necesare.",
      "Inventariem textele, fotografiile și stilul vizual."
    ],
    "outcome": "O direcție clară pentru website: ce trebuie să comunice, cum se organizează și ce materiale mai lipsesc.",
    "cta": "Conturăm website-ul"
  },
  "ecommerce": {
    "summary": "Transformă un catalog într-un parcurs de cumpărare clar, de la găsirea produsului până la plată și livrare.",
    "description": "Punem experiența cumpărătorului alături de operațiunile magazinului. Astfel, brief-ul ține cont atât de vânzare, cât și de gestionarea comenzilor de către echipă.",
    "features": [
      "Catalog și stocuri",
      "Plăți și livrare",
      "Facturare și integrări"
    ],
    "fit": "Magazine la început de drum sau afaceri care își extind vânzările online.",
    "steps": [
      "Înțelegem produsele, variantele și dimensiunea catalogului.",
      "Clarificăm plățile, curierii și facturarea.",
      "Identificăm importurile, stocurile și sistemele de conectat."
    ],
    "outcome": "Cerințele magazinului puse în ordine, cu fluxurile comerciale și dependențele tehnice de clarificat.",
    "cta": "Pregătim magazinul"
  },
  "blog": {
    "summary": "Pune expertiza ta în valoare prin articole ușor de descoperit, citit și organizat într-o publicație coerentă.",
    "description": "Pornim de la cititori și de la subiectele pe care le cunoști bine. Definim structura editorială și un mod de publicare potrivit ritmului echipei tale.",
    "features": [
      "Categorii și subiecte",
      "Autori și aprobare",
      "Publicare și migrare"
    ],
    "fit": "Specialiști, companii și publicații care vor să construiască încredere prin conținut.",
    "steps": [
      "Identificăm cititorii, temele și categoriile principale.",
      "Stabilim autorii, aprobările și ritmul de publicare.",
      "Clarificăm limbile și articolele existente de migrat."
    ],
    "outcome": "Baza unui brief editorial și tehnic: pentru cine scrii, cum publici și ce conținut ai deja.",
    "cta": "Conturăm blogul"
  },
  "application": {
    "summary": "Simplifică un proces important pentru clienți sau echipă printr-o aplicație construită în jurul modului real de lucru.",
    "description": "Nu începem cu o listă lungă de funcții. Înțelegem problema, utilizatorii și acțiunile esențiale, apoi conturăm ce merită inclus în prima versiune.",
    "features": [
      "Fluxuri și roluri",
      "Web, iOS și Android",
      "Date și integrări"
    ],
    "fit": "Echipe care au nevoie de un produs digital sau de un instrument intern adaptat activității lor.",
    "steps": [
      "Descriem utilizatorii, rolurile și acțiunile esențiale.",
      "Alegem platformele și sistemele care trebuie conectate.",
      "Clarificăm categoriile de date și prioritățile primei versiuni."
    ],
    "outcome": "Un punct de pornire pentru definirea aplicației, cu fluxuri, responsabilități și întrebări tehnice explicite.",
    "cta": "Definim aplicația"
  },
  "ai": {
    "summary": "Identifică unde un asistent AI poate ajuta concret, folosind surse aprobate și limite clare pentru intervenția umană.",
    "description": "Definim sarcina utilă înaintea tehnologiei. Stabilim ce informații poate folosi agentul, ce nu are voie să facă și când trebuie să preia conversația un coleg.",
    "features": [
      "Sarcini bine definite",
      "Surse aprobate",
      "Transfer către echipă"
    ],
    "fit": "Afaceri care vor să exploreze asistența pentru clienți sau automatizarea unor sarcini repetitive.",
    "steps": [
      "Alegem sarcinile și canalele în care agentul ar fi util.",
      "Inventariem informațiile și sursele pe care le poate utiliza.",
      "Definim limitele, aprobările și transferul către un operator."
    ],
    "outcome": "O misiune clară pentru agent, cu limite de utilizare și dependențe de verificat înainte de implementare.",
    "cta": "Definim agentul AI"
  },
  "branding": {
    "summary": "Fă-ți brandul ușor de recunoscut printr-o prezență coerentă: aceeași personalitate, de la profil la mesaj.",
    "description": "Clarificăm ce vrei să transmită afacerea și cum se adaptează comunicarea la fiecare canal. Păstrăm legătura dintre identitatea vizuală, ton și public.",
    "features": [
      "Personalitate de brand",
      "Ton și mesaje",
      "Coerență între canale"
    ],
    "fit": "Branduri care își lansează prezența socială sau vor o direcție mai unitară.",
    "steps": [
      "Definim valorile, publicul și personalitatea brandului.",
      "Alegem canalele și tonul de comunicare potrivit.",
      "Strângem referințe, materiale și abordări de evitat."
    ],
    "outcome": "O direcție de identitate și comunicare pe care o putem transforma împreună într-un proiect bine delimitat.",
    "cta": "Clarificăm identitatea"
  },
  "qa": {
    "summary": "Verifică experiențele care contează înainte de lansare: ce trebuie să funcționeze, pe ce dispozitive și după ce criterii.",
    "description": "Pornim de la acțiunile reale ale utilizatorilor. Clarificăm fluxurile critice, problemele cunoscute și condițiile în care produsul poate fi considerat pregătit.",
    "features": [
      "Fluxuri critice",
      "Desktop și mobil",
      "Criterii de acceptare"
    ],
    "fit": "Website-uri și aplicații aflate înaintea lansării sau a unei actualizări importante.",
    "steps": [
      "Identificăm parcursurile importante și problemele observate.",
      "Stabilim dispozitivele și browserele relevante.",
      "Definim criteriile de acceptare și prioritățile verificării."
    ],
    "outcome": "Un brief de testare concentrat pe riscurile și experiențele relevante pentru utilizatorii tăi.",
    "cta": "Pregătim testarea"
  },
  "maintenance": {
    "summary": "Păstrează proiectul util și actualizat: descrie ce trebuie îmbunătățit, ce te blochează și ce fel de suport ai nevoie.",
    "description": "Separăm solicitările urgente de îmbunătățirile planificate. Putem discuta și despre Plus, Pro sau Pro Activ, în funcție de nevoile proiectului, fără activare automată.",
    "features": [
      "Actualizări planificate",
      "Impact și urgență",
      "Plus, Pro, Pro Activ"
    ],
    "fit": "Afaceri cu un website sau o aplicație existentă, care caută suport și continuitate.",
    "steps": [
      "Descriem modificarea, incidentul sau nevoia de suport.",
      "Clarificăm impactul asupra activității și nivelul de urgență.",
      "Notăm abonamentul existent sau interesul pentru un plan potrivit."
    ],
    "outcome": "O solicitare documentată, cu context suficient pentru evaluare și prioritizare de către echipa AVYRON.",
    "cta": "Descriem solicitarea"
  },
  "audit": {
    "summary": "Înțelege ce merită îmbunătățit la produsul actual înainte să investești într-un redesign sau într-o dezvoltare nouă.",
    "description": "Punem problemele observate în contextul obiectivelor afacerii. Stabilim ce analizăm și unde este nevoie de claritate pentru o decizie informată.",
    "features": [
      "Performanță și SEO",
      "Accesibilitate și securitate",
      "Fluxuri comerciale"
    ],
    "fit": "Afaceri care au deja un website sau un software și vor să decidă următorii pași.",
    "steps": [
      "Identificăm produsul, obiectivele și problemele observate.",
      "Alegem ariile de analiză relevante pentru situația ta.",
      "Clarificăm impactul problemelor și întrebările la care vrei răspuns."
    ],
    "outcome": "Un scop de audit bine definit, care ajută echipa să analizeze ceea ce contează pentru afacerea ta.",
    "cta": "Pregătim auditul"
  }
};
