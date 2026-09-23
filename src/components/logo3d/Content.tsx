import { useState } from "react";
import { Link } from "react-router-dom";
import { Box, Check, Gauge, Layers, MessageCircle, Plus, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import {
  LOGO3D_AUDIENCES,
  LOGO3D_CTA,
  LOGO3D_FAQ,
  LOGO3D_FORMATS,
  LOGO3D_PACKS_COPY,
  LOGO3D_PROCESS,
  LOGO3D_STATES,
  LOGO3D_TIERS,
  LOGO3D_TOOLS,
  LOGO3D_TRUST,
  whatsappUrl,
} from "@/data/logo3d";
import FlatMark from "./FlatMark";
import { conceptByKey, type SegmentKey } from "./marks";
import { ClosingMark } from "./Interactive";
import { ripple, useLeiPrice } from "./utils";

// ------------------------------------------------------------------ three states

const STATE_ICONS = [Layers, Box, Sparkles];

export function States() {
  const { lang } = useLang();
  const s = LOGO3D_STATES[lang];
  return (
    <section id="ce-este" className="l3d-section" data-palette="#8b5cf6,#38bdf8" aria-labelledby="states-title">
      <div className="l3d-wrap">
        <h2 id="states-title" className="l3d-h2 l3d-wipe">
          {s.title}
        </h2>
        <p className="l3d-lead" data-reveal>
          {s.lead}
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {s.items.map((it, i) => {
            const Icon = STATE_ICONS[i];
            return (
              <article key={it.title} data-reveal style={{ ["--i" as string]: i }} className="border-t border-[var(--l3d-line-strong)] pt-5">
                <Icon className="size-5 text-[var(--l3d-violet)]" aria-hidden />
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{it.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--l3d-muted)]">{it.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ audiences

const SEGMENT_CONCEPT: Record<SegmentKey, string> = {
  personal: "irisa",
  small: "brava",
  medium: "nordis",
  brand: "olea",
  startup: "fluxa",
};

function Mockups({ segment }: { segment: SegmentKey }) {
  const c = conceptByKey(SEGMENT_CONCEPT[segment]);
  const face = c.material === "neon" ? c.glow : c.face;
  const side = c.material === "neon" ? "#0e7490" : c.side;
  return (
    <div className="l3d-mock" aria-hidden>
      {/* Business card */}
      <div
        className="left-[4%] top-[18%] h-40 w-64 rounded-2xl border border-white/10 p-4 shadow-2xl"
        style={{ background: "linear-gradient(135deg,#1b1530,#0d0a18)", ["--rx" as string]: "12deg", ["--ry" as string]: "-22deg" }}
      >
        <FlatMark draw={c.draw} face={face} side={side} className="size-14" />
        <div className="mt-6 text-sm font-semibold text-white/90">{c.name}</div>
        <div className="mt-1 h-1.5 w-24 rounded bg-white/15" />
      </div>
      {/* Phone */}
      <div
        className="right-[8%] top-[4%] h-64 w-32 rounded-[1.6rem] border border-white/15 p-2 shadow-2xl"
        style={{ background: "#07060d", ["--rx" as string]: "6deg", ["--ry" as string]: "18deg", animationDelay: "-2.5s" }}
      >
        <div className="grid h-full place-items-center rounded-[1.2rem]" style={{ background: `radial-gradient(circle at 50% 40%, ${c.glow}33, transparent 70%)` }}>
          <FlatMark draw={c.draw} face={face} side={side} className="size-16" />
        </div>
      </div>
      {/* Badge / sticker */}
      <div
        className="bottom-[2%] left-[40%] grid size-20 place-items-center rounded-full border border-white/10"
        style={{ background: `radial-gradient(circle, ${c.glow}44, #120e22)`, ["--rx" as string]: "-8deg", ["--ry" as string]: "10deg", animationDelay: "-4s" }}
      >
        <FlatMark draw={c.draw} face={face} side={side} className="size-12" />
      </div>
    </div>
  );
}

export function Audiences() {
  const { lang } = useLang();
  const a = LOGO3D_AUDIENCES[lang];
  const tiers = LOGO3D_TIERS[lang];
  const [active, setActive] = useState<SegmentKey>("small");
  const item = a.items.find((i) => i.key === active) ?? a.items[0];
  const tier = tiers.find((t) => t.key === item.pack)!;

  return (
    <section id="pentru-cine" className="l3d-section" data-palette="#38bdf8,#f472b6" aria-labelledby="aud-title">
      <div className="l3d-wrap">
        <h2 id="aud-title" className="l3d-h2 l3d-wipe">
          {a.title}
        </h2>
        <p className="l3d-lead" data-reveal>
          {a.lead}
        </p>
        <div role="tablist" aria-label={a.title} className="l3d-tabs mt-7" data-reveal style={{ ["--i" as string]: 1 }}>
          {a.items.map((it) => (
            <button
              key={it.key}
              id={`tab-${it.key}`}
              role="tab"
              type="button"
              className="l3d-chip"
              aria-selected={active === it.key}
              aria-controls="aud-panel"
              tabIndex={active === it.key ? 0 : -1}
              onClick={() => setActive(it.key)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const idx = a.items.findIndex((x) => x.key === active);
                const next = a.items[(idx + (e.key === "ArrowRight" ? 1 : a.items.length - 1)) % a.items.length];
                setActive(next.key);
                document.getElementById(`tab-${next.key}`)?.focus();
              }}
            >
              {it.title}
            </button>
          ))}
        </div>
        <div key={item.key} id="aud-panel" role="tabpanel" aria-labelledby={`tab-${item.key}`} className="l3d-panel">
          <div>
            <p className="text-[var(--l3d-muted)]">{item.who}</p>
            <ul className="l3d-list mt-5">
              {item.gets.map((g) => (
                <li key={g}>
                  <Check className="size-4 text-[var(--l3d-lime)]" aria-hidden />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-[var(--l3d-muted)]">
              <span className="text-[var(--l3d-text)]">{lang === "ro" ? "Unde îl folosești: " : "Where you use it: "}</span>
              {item.uses}
            </p>
            <a href={`#pachet-${tier.key}`} className="l3d-link mt-5 inline-block text-sm font-semibold">
              {a.recommended}: {tier.name}
            </a>
          </div>
          <Mockups segment={item.key} />
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ packages

export function Packages({ onPreview }: { onPreview: (tier: string) => void }) {
  const { lang } = useLang();
  const p = LOGO3D_PACKS_COPY[lang];
  const tiers = LOGO3D_TIERS[lang];
  const trust = LOGO3D_TRUST[lang];
  const lei = useLeiPrice(lang);

  return (
    <section id="preturi" className="l3d-section" data-palette="#7c3aed,#38bdf8" aria-labelledby="packs-title">
      <div className="l3d-wrap">
        <h2 id="packs-title" className="l3d-h2 l3d-wipe">
          {p.title}
        </h2>
        <p className="l3d-lead" data-reveal>
          {p.lead}
        </p>
        <div className="l3d-tiers">
          {tiers.map((t, i) => (
            <article
              key={t.key}
              id={`pachet-${t.key}`}
              className="l3d-tier"
              data-featured={Boolean(t.featured)}
              data-reveal
              style={{ ["--i" as string]: i }}
              aria-labelledby={`tier-${t.key}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 id={`tier-${t.key}`} className="text-xl font-bold tracking-tight">
                  {t.name}
                </h3>
                {t.featured && (
                  <span className="rounded-full bg-[var(--l3d-lime)] px-3 py-1 text-xs font-bold text-[#14200a]">{p.featured}</span>
                )}
              </div>
              <p className="mt-2 min-h-[3rem] text-sm text-[var(--l3d-muted)]">{t.for}</p>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-sm text-[var(--l3d-muted)]">{p.from}</span>
                <span className="l3d-price">{lei(t.priceRon)}</span>
              </p>
              <p className="mt-3 text-sm text-[var(--l3d-muted)]">
                {p.delivery}: <span className="text-[var(--l3d-text)]">{t.delivery}</span>
                <br />
                {t.concepts} · {t.revisions}
              </p>
              <ul className="l3d-list mt-5 border-t border-[var(--l3d-line)] pt-4">
                {t.includes.map((inc) => (
                  <li key={inc}>
                    <Check className="size-4 text-[var(--l3d-lime)]" aria-hidden />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-semibold text-[var(--l3d-dim)]">{p.plus}</p>
              <ul className="l3d-list">
                {t.extras.map((x) => (
                  <li key={x}>
                    <Plus className="size-4 text-[var(--l3d-cyan)]" aria-hidden />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-2 pt-6">
                <a
                  className={`l3d-btn ${t.featured ? "l3d-btn-primary" : "l3d-btn-ghost"}`}
                  href={whatsappUrl(p.whatsapp(t.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    ripple(e);
                    trackEvent("contact_click", { method: "whatsapp", location: `logo3d_tier_${t.key}`, product: "logo-dinamic-3d" });
                  }}
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {p.choose(t.name)}
                </a>
                <button type="button" className="l3d-link py-2 text-sm" onClick={() => onPreview(t.name)}>
                  {lang === "ro" ? "Sau cere întâi o previzualizare gratuită" : "Or request a free preview first"}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div data-reveal>
            <h3 className="text-lg font-semibold">{p.addonsTitle}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {p.addons.map((x) => (
                <li key={x} className="rounded-full border border-[var(--l3d-line-strong)] px-3 py-1.5 text-sm text-[var(--l3d-muted)]">
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-[var(--l3d-dim)]">{p.note}</p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2">
            {trust.map((t, i) => (
              <li key={t.title} data-reveal style={{ ["--i" as string]: i }} className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 flex-none text-[var(--l3d-violet)]" aria-hidden />
                <div>
                  <h4 className="font-semibold">{t.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--l3d-muted)]">{t.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ formats

export function Formats() {
  const { lang } = useLang();
  const f = LOGO3D_FORMATS[lang];
  return (
    <section id="livrabile" className="l3d-section" data-palette="#38bdf8,#a78bfa" aria-labelledby="formats-title">
      <div className="l3d-wrap">
        <h2 id="formats-title" className="l3d-h2 l3d-wipe">
          {f.title}
        </h2>
        <p className="l3d-lead" data-reveal>
          {f.lead}
        </p>
        <ul className="l3d-formats">
          {f.items.map((it, i) => (
            <li key={it.ext} className="l3d-format" data-reveal="flip" style={{ ["--i" as string]: i }}>
              <b>{it.ext}</b>
              <span>{it.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ tools

export function Tools() {
  const { lang } = useLang();
  const t = LOGO3D_TOOLS[lang];
  const names = t.items.map((i) => i.name);
  return (
    <section id="tehnologii" className="l3d-section" data-palette="#a78bfa,#bef264" aria-labelledby="tools-title">
      <div className="l3d-wrap">
        <h2 id="tools-title" className="l3d-h2 l3d-wipe">
          {t.title}
        </h2>
        <p className="l3d-lead" data-reveal>
          {t.lead}
        </p>
      </div>
      <div className="l3d-marquee" aria-hidden>
        <div className="l3d-marquee-track">
          {[...names, ...names].map((n, i) => (
            <span key={`${n}-${i}`}>{n}</span>
          ))}
        </div>
      </div>
      <div className="l3d-wrap mt-10 grid gap-10 lg:grid-cols-2">
        <dl className="grid gap-5 sm:grid-cols-2">
          {t.items.map((it, i) => (
            <div key={it.name} data-reveal style={{ ["--i" as string]: i }}>
              <dt className="font-semibold">{it.name}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-[var(--l3d-muted)]">{it.text}</dd>
            </div>
          ))}
        </dl>
        <div data-reveal="left" className="rounded-[1.75rem] border border-[var(--l3d-line)] bg-[rgba(10,8,18,0.6)] p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Gauge className="size-5 text-[var(--l3d-lime)]" aria-hidden />
            {t.promisesTitle}
          </h3>
          <ul className="l3d-list mt-3">
            {t.promises.map((pr) => (
              <li key={pr}>
                <Check className="size-4 text-[var(--l3d-lime)]" aria-hidden />
                <span>{pr}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ process

export function Process() {
  const { lang } = useLang();
  const p = LOGO3D_PROCESS[lang];
  return (
    <section id="proces" className="l3d-section" data-palette="#8b5cf6,#38bdf8" aria-labelledby="process-title">
      <div className="l3d-wrap">
        <h2 id="process-title" className="l3d-h2 l3d-wipe">
          {p.title}
        </h2>
        <p className="l3d-lead" data-reveal>
          {p.lead}
        </p>
        <ol className="l3d-timeline" data-timeline>
          {p.steps.map((s, i) => (
            <li key={s.title} data-reveal style={{ ["--i" as string]: i + 2 }}>
              <p className="text-xs font-semibold text-[var(--l3d-violet)]">{s.time}</p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--l3d-muted)]">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ FAQ

export function Faq() {
  const { lang } = useLang();
  const items = LOGO3D_FAQ[lang];
  return (
    <section id="faq" className="l3d-section" data-palette="#a78bfa,#38bdf8" aria-labelledby="faq-title">
      <div className="l3d-wrap grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 id="faq-title" className="l3d-h2 l3d-wipe">
          {lang === "ro" ? "Întrebări frecvente" : "Frequently asked questions"}
        </h2>
        <div className="l3d-faq">
          {items.map((it, i) => (
            <details key={it.q} data-reveal style={{ ["--i" as string]: i }}>
              <summary>
                {it.q}
                <Plus className="size-5 text-[var(--l3d-violet)]" aria-hidden />
              </summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ final CTA

export function FinalCta({ onPreview }: { onPreview: () => void }) {
  const { lang } = useLang();
  const c = LOGO3D_CTA[lang];
  const related = lang === "ro"
    ? [
        { to: "/produse/website-prezentare-premium", label: "Site Prezentare Profesional" },
        { to: "/produse/identitate-social-media", label: "Identitate Social Media" },
      ]
    : [
        { to: "/en/products/premium-presentation-website", label: "Business website" },
        { to: "/en/products/social-media-identity", label: "Social Media Identity" },
      ];
  return (
    <section id="contact" className="l3d-section text-center" data-palette="#38bdf8,#8b5cf6" aria-labelledby="final-title">
      <div className="l3d-wrap">
        <ClosingMark label={lang === "ro" ? "Marca Avyron asamblându-se în 3D" : "The Avyron mark assembling in 3D"} />
        <h2 id="final-title" className="l3d-h2 mx-auto mt-6 l3d-wipe">
          {c.title}
        </h2>
        <p className="l3d-lead mx-auto" data-reveal>
          {c.text}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3" data-reveal style={{ ["--i" as string]: 1 }}>
          <button
            type="button"
            className="l3d-btn l3d-btn-primary"
            onClick={(e) => {
              ripple(e);
              onPreview();
            }}
          >
            <Sun className="size-4" aria-hidden />
            {c.primary}
          </button>
          <a
            className="l3d-btn l3d-btn-ghost"
            href={whatsappUrl(c.whatsappText)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              ripple(e);
              trackEvent("contact_click", { method: "whatsapp", location: "logo3d_final", product: "logo-dinamic-3d" });
            }}
          >
            <MessageCircle className="size-4" aria-hidden />
            {c.whatsapp}
          </a>
        </div>
        <p className="mt-10 text-sm text-[var(--l3d-muted)]" data-reveal style={{ ["--i" as string]: 2 }}>
          {c.related}:{" "}
          {related.map((r, i) => (
            <span key={r.to}>
              {i > 0 && " · "}
              <Link className="l3d-link" to={r.to}>
                {r.label}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
