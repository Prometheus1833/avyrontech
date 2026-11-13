export const readingChoices = [
  {
    id: 'o-seara',
    occasion: 'Pentru o seară scurtă',
    slug: 'scrisori-dupa-miezul-noptii',
    teaser: 'Povestiri pe care le poți citi una câte una.',
    recommendation: 'Alege proza scurtă când vrei să intri repede într-o poveste. Aici, o scrisoare sau un gest schimbă sensul unei întâlniri. Poți închide cartea după o povestire și reveni când ai timp.',
    prompt: 'Ce ar câștiga sau pierde personajul dacă ar trimite scrisoarea?',
  },
  {
    id: 'un-weekend',
    occasion: 'Pentru un weekend liniștit',
    slug: 'arta-dorintei',
    teaser: 'Un roman care se întoarce la mare și la o poveste rămasă neterminată.',
    recommendation: 'Romanul pornește de la întoarcerea unei traducătoare la un manuscris abandonat. E o alegere pentru cititorii cărora le place să observe cum un loc familiar capătă alt sens odată cu personajul.',
    prompt: 'Ce se schimbă într-o poveste când o recitești după ani?',
  },
  {
    id: 'club-de-lectura',
    occasion: 'Pentru un club de lectură',
    slug: 'cheia-de-chihlimbar',
    teaser: 'Un roman care deschide o discuție despre loialitate și alegerile de familie.',
    recommendation: 'Cheia găsită de Mara leagă o alegere personală de istoria unei familii. Pentru o întâlnire de club, pornește de la un obiect din poveste și comparați ce crede fiecare că reprezintă.',
    prompt: 'În ce moment devine loialitatea o obligație pentru Mara?',
  },
];

export const partnerOptions = [
  {
    id: 'librarii',
    title: 'Librării',
    description: 'Dacă pregătești un raft tematic sau o selecție pentru cititorii librăriei tale, spune-ne ce titluri te interesează și ce cantitate estimezi.',
    draft: 'Bună! Reprezint o librărie și aș dori să discutăm o selecție de titluri Erotica. Vă pot trimite numele librăriei, orașul, titlurile de interes și o estimare a cantității.',
    action: 'Discută o selecție pentru librărie',
  },
  {
    id: 'cluburi',
    title: 'Cluburi de lectură',
    description: 'Spune-ne ce titlu ai ales, câți cititori participă și când are loc întâlnirea. Așa putem discuta despre exemplarele necesare și despre calendar.',
    draft: 'Bună! Coordonez un club de lectură și ne interesează un titlu Erotica pentru o întâlnire. Vă pot trimite titlul ales, data și numărul aproximativ de participanți.',
    action: 'Discută o întâlnire de club',
  },
  {
    id: 'evenimente',
    title: 'Evenimente literare',
    description: 'Pentru o lectură publică sau o discuție tematică, prezintă pe scurt formatul, locul, perioada și publicul evenimentului.',
    draft: 'Bună! Organizez un eveniment literar și aș dori să discutăm o colaborare cu Erotica. Vă pot trimite formatul, locul, perioada și câteva detalii despre public.',
    action: 'Propune un eveniment',
  },
];

export const questions = [
  ['disponibilitate', 'Cum aflu dacă o carte este disponibilă?', 'Deschide fișa cărții și folosește butonul WhatsApp. Mesajul include titlul ales, ca să poți întreba despre disponibilitate și preț.'],
  ['pret-si-plata', 'Unde aflu prețul și cum plătesc?', 'Cere în conversație prețul cărții, eventualele costuri de livrare și opțiunile de plată înainte de confirmarea comenzii.'],
  ['livrare', 'Cum stabilesc livrarea?', 'Întreabă ce opțiuni de livrare sunt disponibile pentru localitatea ta, cât costă și care este termenul estimat. Stabilește aceste detalii înainte de confirmare.'],
  ['mai-multe-carti', 'Pot cere mai multe titluri în același mesaj?', 'Da. Adaugă în mesaj titlurile și numărul de exemplare dorit pentru fiecare. Pentru o selecție de librărie, de club sau de eveniment, vezi <a href="parteneri.html">pagina de parteneriate</a>.'],
  ['fragmente', 'Pot citi un fragment înainte să aleg?', 'Fiecare fișă de carte include o descriere și un fragment ilustrativ. Poți porni și din <a href="ghid-de-lectura.html">ghidul de lectură</a>, dacă preferi să alegi după ritm sau subiect.'],
];
