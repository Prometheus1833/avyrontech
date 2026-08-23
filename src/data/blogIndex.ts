export type BlogIndexEntry = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  tags: string[];
  category: string;
  published_at: string;
  updated_at: string;
};

/** Public article metadata snapshot used for prerendering and sitemap output. */
export const BLOG_INDEX: BlogIndexEntry[] = [
  {
    id: "b2da7874-14c4-4c18-afe7-6ef12306090f",
    title: "Meta lansează conturile plătite pe Facebook și Instagram: ce înseamnă pentru utilizatori și branduri",
    slug: "meta-conturi-platite-facebook-instagram-2026",
    excerpt: "Meta extinde abonamentele plătite pe Facebook și Instagram. Analizăm reacțiile, costurile și impactul pentru creatori și afaceri.",
    cover_image_url: null,
    tags: ["meta", "facebook", "instagram", "abonamente", "social-media", "2026"],
    category: "tech",
    published_at: "2026-06-02T04:58:50.799028+00:00",
    updated_at: "2026-06-02T04:58:50.799028+00:00",
  },
  {
    id: "67c81192-3954-4b98-ae03-4112c54bfce3",
    title: "De ce un website este vital pentru afacerea ta în 2026",
    slug: "importanta-website-afacere-2026",
    excerpt: "În 2026, un website nu mai este un lux — este vitrina, biroul și cartea de vizită a afacerii tale.",
    cover_image_url: "/news/importanta-website-2026.jpg",
    tags: ["website", "2026", "business", "digital"],
    category: "business",
    published_at: "2026-05-15T22:33:26.25089+00:00",
    updated_at: "2026-05-15T22:33:26.25089+00:00",
  },
  {
    id: "11603ca0-b79f-44e3-8e89-f9655bad2add",
    title: "De ce să alegi Avyron: studio-ul care îți construiește prezența digitală cu dedicare",
    slug: "de-ce-alegi-avyron-studio-prezenta-digitala",
    excerpt: "Nu vindem template-uri. Construim identități digitale gândite pentru afacerea ta — design, cod, SEO, mentenanță și suport real.",
    cover_image_url: "/og/home.jpg",
    tags: ["avyron", "despre-noi", "servicii", "agentie"],
    category: "avyron",
    published_at: "2026-05-02T13:32:14.247985+00:00",
    updated_at: "2026-05-02T13:32:14.247985+00:00",
  },
  {
    id: "4e02bb0b-7df3-4965-b5be-064f42e817c6",
    title: "De ce un website profesionist este identitatea ta digitală în 2026",
    slug: "website-profesionist-identitate-digitala-2026",
    excerpt: "În era AI și a căutărilor vocale, un site bine construit nu mai e opțional — e cartea ta de vizită globală.",
    cover_image_url: null,
    tags: ["webdesign", "identitate", "branding", "avyron"],
    category: "web-design",
    published_at: "2026-05-02T13:24:19.854279+00:00",
    updated_at: "2026-05-02T13:24:19.854279+00:00",
  },
  {
    id: "09c79fe5-ffdb-4e8c-944d-c612b2726ad3",
    title: "SEO în 2026: cum apari primul pe Google și în răspunsurile AI",
    slug: "seo-2026-google-ai-search",
    excerpt: "Algoritmii s-au schimbat. Iată ce contează acum pentru vizibilitatea în căutări și în răspunsurile generate de AI.",
    cover_image_url: null,
    tags: ["seo", "google", "ai", "optimizare"],
    category: "seo",
    published_at: "2026-05-02T13:24:19.854279+00:00",
    updated_at: "2026-05-02T13:24:19.854279+00:00",
  },
  {
    id: "cfd7e077-d0f6-46a0-9549-aa187844664c",
    title: "Securitatea pe internet: 7 greșeli pe care le fac afacerile mici",
    slug: "securitate-internet-greseli-afaceri-mici",
    excerpt: "Un ghid practic despre riscurile uzuale ale firmelor mici și măsurile care reduc expunerea.",
    cover_image_url: null,
    tags: ["securitate", "gdpr", "ssl", "protectie"],
    category: "securitate",
    published_at: "2026-05-02T13:24:19.854279+00:00",
    updated_at: "2026-05-02T13:24:19.854279+00:00",
  },
];

export const BLOG_SLUGS = BLOG_INDEX.map((post) => post.slug);
