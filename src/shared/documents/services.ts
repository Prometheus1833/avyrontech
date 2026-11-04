/** Extensible document profiles enrich the actual D1 catalog; they never define prices or final inventory. */
export type ServiceDocumentProfile = {
  fields: Record<string, string>;
  deliverables: string;
  documents: string[];
};
const profiles: Record<string, ServiceDocumentProfile> = {
  website: {
    fields: {
      pages: "Număr de pagini",
      design: "Design și revizii",
      features: "Funcționalități",
      domain: "Domeniu și titular",
      hosting: "Hosting și administrare",
      seo: "SEO inclus",
      maintenance: "Mentenanță",
    },
    deliverables:
      "Structură de pagini, design aprobat, implementare, verificări și predare în limitele confirmate.",
    documents: ["brief", "offer", "annex", "implementation", "handover"],
  },
  commerce: {
    fields: {
      catalog: "Catalog și variante",
      checkout: "Checkout și plăți",
      shipping: "Livrare și curieri",
      invoicing: "Facturare",
      integrations: "Integrări",
      acceptance: "Fluxuri de acceptanță",
    },
    deliverables:
      "Catalog, flux de comandă, integrările autorizate și verificarea traseului de cumpărare în mediile agreate.",
    documents: ["brief", "offer", "annex", "access", "handover"],
  },
  seo: {
    fields: {
      targets: "Pagini și proprietăți vizate",
      interventions: "Intervenții incluse",
      indicators: "Indicatori și surse de măsurare",
      period: "Perioadă",
      reporting: "Raportare",
    },
    deliverables:
      "Audit, priorități de intervenție, optimizările aprobate și raportarea indicatorilor disponibili; fără garantarea pozițiilor.",
    documents: ["audit", "offer", "annex", "report"],
  },
  ads: {
    fields: {
      platforms: "Platforme",
      media_budget: "Buget media separat de onorariu",
      campaigns: "Campanii",
      creative: "Materiale și drepturi de utilizare",
      goals: "Obiective",
      approvals: "Aprobările publicării",
    },
    deliverables:
      "Configurarea și administrarea campaniilor aprobate, verificarea măsurării și raportarea; bugetul media este separat.",
    documents: ["brief", "offer", "annex", "access", "report"],
  },
  social: {
    fields: {
      accounts: "Conturi și identități",
      frequency: "Frecvență",
      formats: "Postări, stories și reels",
      rights: "Drepturi asupra materialelor",
      publication: "Mandat de publicare",
      reporting: "Raportare",
    },
    deliverables:
      "Materiale și administrare conform calendarului aprobat, cu drepturi și permisiuni de publicare documentate.",
    documents: ["brief", "offer", "annex", "access", "report"],
  },
  ai: {
    fields: {
      scenarios: "Scenarii autorizate",
      integrations: "Integrări",
      sources: "Surse de date aprobate",
      limits: "Limite de autonomie și cost",
      handoff: "Intervenție umană",
      evaluation: "Evaluare și criterii de oprire",
    },
    deliverables:
      "Scenariile, integrările și politicile aprobate, evaluate pe criteriile agreate; fără autonomie sau acces implicit nelimitat.",
    documents: ["brief", "audit", "annex", "implementation", "report"],
  },
  brand: {
    fields: {
      concepts: "Concepte și revizii",
      formats: "Formate și fișiere",
      rights: "Drepturi și licențe",
      animation: "Animație și 3D",
      usage: "Utilizări și limite",
    },
    deliverables:
      "Identitatea și fișierele aprobate în formatele agreate, cu delimitarea drepturilor și a componentelor terților.",
    documents: ["brief", "offer", "annex", "handover"],
  },
  qa: {
    fields: {
      targets: "Aplicații și versiuni",
      devices: "Dispozitive și browsere",
      methodology: "Metodologie",
      evidence: "Dovezi și reproducere",
      severity: "Severitate și priorități",
    },
    deliverables:
      "Plan de testare, constatări susținute de dovezi și reverificări în perimetrul aprobat.",
    documents: ["audit", "annex", "report"],
  },
  accessibility: {
    fields: {
      targets: "Pagini și fluxuri",
      standard: "Standard și nivel agreat",
      assistive: "Tehnologii asistive",
      sampling: "Eșantion și limite",
      remediation: "Remedieri și reverificare",
    },
    deliverables:
      "Evaluare automată și manuală în perimetrul agreat, dovezi și recomandări; fără declararea conformității integrale pe baza unui scor.",
    documents: ["audit", "annex", "report"],
  },
  maintenance: {
    fields: {
      coverage: "Resurse acoperite",
      support: "Program și niveluri de suport",
      backups: "Fișiere și metadate salvate",
      restore: "Restaurare și verificare",
      retention: "Retenție",
      limits: "Limite și costuri",
    },
    deliverables:
      "Monitorizare, intervenții, backup și restaurare exclusiv în limitele tehnice și comerciale confirmate.",
    documents: ["sla", "access", "report"],
  },
  software: {
    fields: {
      flows: "Fluxuri și roluri",
      integrations: "API-uri și automatizări",
      platforms: "Platforme și medii",
      security: "Cerințe de securitate",
      acceptance: "Criterii de acceptare",
      handover: "Predare și documentație",
    },
    deliverables:
      "Implementarea fluxurilor și integrărilor specificate, testare și documentație conform criteriilor acceptate.",
    documents: ["brief", "annex", "implementation", "handover"],
  },
  digital: {
    fields: {
      sku: "Produs și SKU",
      license: "Licență aprobată",
      uses: "Utilizări permise",
      access: "Acces și cont",
      duration: "Durată",
      updates: "Actualizări și limite",
    },
    deliverables:
      "Accesul sau livrabilul digital conform produsului și licenței efectiv aprobate; fără transfer implicit de drepturi suplimentare.",
    documents: ["offer", "annex", "handover"],
  },
  general: {
    fields: {
      scope: "Scop",
      deliverables: "Livrabile",
      limits: "Limite și excluderi",
      dependencies: "Dependențe",
      acceptance: "Acceptanță",
    },
    deliverables:
      "Livrabile și limite definite explicit pentru serviciul selectat.",
    documents: ["brief", "offer", "annex", "report"],
  },
};
export function serviceDocumentProfile(
  item: { entity_key: string; category: string },
  custom?: string,
): ServiceDocumentProfile {
  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (
        parsed.fields &&
        typeof parsed.deliverables === "string" &&
        Array.isArray(parsed.documents)
      )
        return parsed;
    } catch {
      /* Unknown profiles use the explicit generic schema. */
    }
  }
  const key = item.entity_key.toLowerCase();
  const family = /wcag|accessib/.test(key)
    ? "accessibility"
    : /seo/.test(key)
      ? "seo"
      : /ads|marketing/.test(key)
        ? "ads"
        : /social/.test(key)
          ? "social"
          : /ai-agent|agent-ai/.test(key)
            ? "ai"
            : /logo|brand/.test(key)
              ? "brand"
              : /qa|audit/.test(key)
                ? "qa"
                : /hosting|maintenance|menten/.test(key)
                  ? "maintenance"
                  : /website|blog/.test(key)
                    ? "website"
                    : /store|shop/.test(key)
                      ? "commerce"
                      : /apps|automation|integrat|cinema|3d/.test(key)
                        ? "software"
                        : item.category === "digital"
                          ? "digital"
                          : "general";
  return profiles[family];
}
