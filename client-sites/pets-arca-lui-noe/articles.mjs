export const articles = [
  {
    slug: 'prima-vizita-la-veterinar',
    image: 'blog-vizita',
    ro: {
      category: 'Prima vizită', title: 'Ce să iei la prima vizită la veterinar',
      summary: 'O listă scurtă cu documentele și întrebările utile la prima consultație.',
      alt: 'Câine în lesă în zona de recepție',
      sections: [
        ['Pregătește documentele', 'Pune la un loc carnetul de sănătate, eventualele rezultate și instrucțiunile de la vizite anterioare. Dacă animalul urmează un tratament, notează numele medicamentului și schema prescrisă sau fotografiază eticheta.'],
        ['Notează motivul vizitei', 'Scrie ce te-a făcut să ceri consultația și când ai observat primele schimbări. Două sau trei exemple concrete sunt mai ușor de povestit decât o listă lungă din memorie.'],
        ['Rezervă timp pentru întrebări', 'Întreabă dacă este nevoie de un control ulterior, când ar trebui să revii și ce informații să urmărești până atunci. Dacă ai primit instrucțiuni înainte de vizită, ia-le cu tine.'],
      ],
    },
    en: {
      category: 'First visit', title: 'What to bring to the first vet visit',
      summary: 'A short checklist of records and questions for your first appointment.',
      alt: 'Dog on a lead in a reception area',
      sections: [
        ['Bring the records', 'Pack the health booklet, relevant test results and instructions from previous visits. If your pet takes medication, write down the name and the prescribed schedule or bring a photo of the label.'],
        ['Write down the reason for the visit', 'Note what prompted the appointment and when you first noticed any changes. A few examples are easier to share than a long list from memory.'],
        ['Make time for questions', 'Ask whether a follow-up is needed, when to return and what information to keep track of in the meantime. Bring any instructions you received before the visit.'],
      ],
    },
  },
  {
    slug: 'carnetul-si-termenele',
    image: 'blog-carnet',
    ro: {
      category: 'Prevenție', title: 'Cum ții evidența termenelor din carnet',
      summary: 'Notează data recomandată de medic și pregătește următoarea programare.',
      alt: 'Carnet de sănătate lângă o pisică',
      sections: [
        ['Separă vizita de termenul următor', 'După consultație, notează ce s-a făcut și data la care medicul ți-a recomandat să revii. Dacă data este orientativă, notează și când ar fi util să suni pentru programare.'],
        ['Alege un singur loc pentru date', 'Păstrează carnetul la îndemână și trece data recomandată într-un calendar. Dacă ai mai multe animale, adaugă numele fiecăruia lângă termen.'],
        ['Actualizează data după reprogramare', 'Dacă vizita se mută, actualizează intrarea din calendar și păstrează data stabilită cu cabinetul. Pentru intervalele de vaccinare, deparazitare sau control, urmează planul făcut cu medicul pentru animalul tău.'],
      ],
    },
    en: {
      category: 'Preventive care', title: 'Keep track of dates in your pet’s health record',
      summary: 'Record your vet’s recommended date and prepare for the next appointment.',
      alt: 'Health booklet beside a cat',
      sections: [
        ['Separate the visit from the next due date', 'Record what happened at the appointment and the date your vet recommended for the next visit. If the date is approximate, note when to call to book.'],
        ['Keep the dates together', 'Keep the health booklet handy and add the recommended date to your calendar. If you have several pets, put their names next to each date.'],
        ['Update the date after rescheduling', 'If the visit moves, update your calendar with the date agreed with the practice. Follow the schedule your vet has drawn up for your pet.'],
      ],
    },
  },
  {
    slug: 'pisica-si-transportorul',
    image: 'blog-transportor',
    source: 'https://catvets.com/resource/2025-transportation-of-cats-in-motor-vehicles-position-statement/',
    ro: {
      category: 'Pisici', title: 'Cum obișnuiești pisica cu transportorul',
      summary: 'Pregătirea începe acasă, cu transportorul la îndemână și timp pentru explorare.',
      alt: 'Pisică într-un transportor rigid deschis',
      sections: [
        ['Lasă transportorul la vedere', 'Așază-l deschis într-un loc liniștit, cu o pătură familiară în interior. Lasă pisica să se apropie și să intre în ritmul ei.'],
        ['Folosește un transportor potrivit', 'Alege un model stabil, bine ventilat și suficient de mare pentru pisică. În mașină, fixează-l astfel încât să nu alunece sau să se răstoarne.'],
        ['Pregătește drumul din timp', 'Verifică închiderea înainte să ieși din casă. Păstrează transportorul închis în mașină și în sala de așteptare până când personalul îți spune că îl poți deschide.'],
      ],
    },
    en: {
      category: 'Cats', title: 'Help your cat get used to the carrier',
      summary: 'Start at home by keeping the carrier nearby and allowing time to explore.',
      alt: 'Cat in an open rigid carrier',
      sections: [
        ['Keep the carrier in sight', 'Leave it open in a quiet place with a familiar blanket inside. Let your cat approach and enter at their own pace.'],
        ['Use a suitable carrier', 'Choose a stable, well-ventilated carrier that fits your cat. Secure it inside the car so it cannot slide or tip.'],
        ['Prepare for the journey', 'Check the latch before leaving home. Keep the carrier closed in the car and the waiting room until the team tells you it is safe to open.'],
      ],
    },
  },
];

export const articlePages = [
  ['blog', 'blog.html', 'blog.html'],
  ...articles.map(({ slug }) => [slug, slug + '.html', slug + '.html']),
];
