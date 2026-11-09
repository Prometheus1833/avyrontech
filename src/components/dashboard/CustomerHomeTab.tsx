import { STUDIO_PATHS } from "@/data/logoStudioCopy";
import { useLang } from "@/i18n/LanguageContext";
import { publicSiteHref } from "@/lib/appHost";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  CreditCard,
  LibraryBig,
  Repeat,
  PenTool,
  BadgeCheck,
  UserRound,
} from "lucide-react";
import type { SectionId } from "@/lib/access";
import { useAuth } from "@/hooks/useAuth";
import { internApi } from "@/lib/internApi";
import { projectKindLabel, projectStageLabel } from "@/shared/projectSummary";

type ProjectList = Awaited<ReturnType<typeof internApi.listProjects>>;
type OpenSection = (
  section: SectionId,
  params?: Record<string, string>,
) => void;
const panel =
  "min-w-0 rounded-2xl border border-white/[.09] bg-[#10162a]/80 p-4 sm:p-5";
const action =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";

export function CustomerHomeTab({
  displayName,
  onOpenSection,
}: {
  displayName: string;
  onOpenSection: OpenSection;
}) {
  const { user } = useAuth();
  const { lang } = useLang();
  const [projects, setProjects] = useState<ProjectList | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  const userId = user?.id;
  useEffect(() => {
    let active = true;
    setError(false);
    setProjects(null);
    if (userId)
      void internApi
        .listProjects(true)
        .then((data) => {
          if (active) setProjects(data);
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
    };
  }, [userId, refresh]);
  useEffect(() => {
    window.addEventListener("avyron:projects-changed", reload);
    return () => window.removeEventListener("avyron:projects-changed", reload);
  }, [reload]);
  const rows = projects?.data || [];
  const purchases = (projects?.purchases || []).filter(
    (p) => p.kind === "service",
  );
  return (
    <div className="space-y-4">
      <header className="relative overflow-hidden rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,.22),transparent_45%),linear-gradient(135deg,#11162a,#0a1020)] p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-violet-300">
          Contul tău AVYRON
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
          Bună, {displayName}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Proiectele, serviciile și produsele într-un singur loc de unde le
          gestionezi simplu și inteligent.
        </p>
      </header>
      <div
        className="grid grid-cols-2 items-start gap-3"
        aria-label="Secțiunile mele"
      >
        {[
          {
            id: "projects" as const,
            label: "Proiectele mele",
            description: "Progres, livrabile și proiecte finalizate.",
            icon: Boxes,
          },
          {
            id: "subscriptions" as const,
            label: "Mentenanță / Abonamente",
            description: "Planurile active și serviciile incluse.",
            icon: Repeat,
          },
          {
            id: "collection" as const,
            label: "Produsele mele",
            description: "Achizițiile confirmate și livrabilele disponibile.",
            icon: BadgeCheck,
          },
          {
            id: "catalog" as const,
            label: "Servicii",
            description: "Serviciile AVYRON pentru proiectul tău.",
            icon: Boxes,
          },
          {
            id: "documents" as const,
            label: "Documentele Mele",
            description: "Documentele alocate contului tău.",
            icon: BookOpen,
          },
          {
            id: "payments" as const,
            label: "Plăți/Istoric",
            description: "Cardul salvat, plățile și facturile tale.",
            icon: CreditCard,
          },
        ].map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onOpenSection(card.id)}
            className={`${panel} h-full text-left transition hover:border-violet-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400`}
          >
            <card.icon className="size-5 text-violet-300" aria-hidden />
            <h2 className="mt-2 break-words text-sm font-semibold">
              {card.label}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              {card.description}
            </p>
          </button>
        ))}
      </div>
      <section className={panel} aria-label="Proiectele tale recente">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Proiectele tale recente</h2>
          <button
            type="button"
            className={action}
            onClick={() => onOpenSection("projects")}
          >
            Vezi proiectele <ArrowUpRight className="size-3.5" />
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-amber-200">
            Proiectele nu pot fi încărcate.{" "}
            <button className="underline" onClick={reload}>
              Reîncearcă
            </button>
          </p>
        ) : !projects ? (
          <p role="status" className="mt-3 text-xs text-slate-300">
            Se încarcă proiectele…
          </p>
        ) : !rows.length && !purchases.length ? (
          <p className="mt-3 text-xs text-slate-300">
            Proiectele și serviciile alocate vor apărea aici.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10">
            {rows.slice(0, 3).map((project) => (
              <li key={project.id}>
                <Link
                  to={`/intern/projects/${encodeURIComponent(project.slug)}`}
                  className="flex min-h-12 min-w-0 flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="min-w-0 break-words font-medium">
                    {project.name}
                    <span className="mt-1 block text-xs font-normal text-slate-300">
                      {projectKindLabel(project.kind)}
                    </span>
                  </span>
                  <span className="rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200">
                    {projectStageLabel(project)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!!purchases.length && (
          <div className="mt-2 divide-y divide-white/10">
            {purchases.slice(0, 2).map((purchase) => (
              <button
                key={purchase.id}
                type="button"
                onClick={() => onOpenSection("projects")}
                className="flex min-h-12 w-full min-w-0 items-center justify-between gap-2 py-2 text-left text-sm"
              >
                <span className="break-words font-medium">{purchase.name}</span>
                <span className="shrink-0 text-[11px] text-emerald-300">
                  Achiziție confirmată
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section
        aria-label="Creație și achiziții"
        className="grid gap-3 sm:grid-cols-2"
      >
        <a
          href={publicSiteHref(STUDIO_PATHS[lang])}
          className={`${panel} transition hover:border-violet-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400`}
        >
          <PenTool className="size-5 text-violet-300" aria-hidden />
          <h2 className="mt-2 text-sm font-semibold">Creează Logo</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Deschide simulatorul de logo și personalizează variantele pentru
            brandul tău.
          </p>
        </a>
        <button
          type="button"
          onClick={() => onOpenSection("profile")}
          className={`${panel} text-left transition hover:border-violet-400/40`}
        >
          <UserRound className="size-5 text-violet-300" />
          <h2 className="mt-2 text-sm font-semibold">Profil</h2>
          <p className="mt-1 text-xs text-slate-300">
            Datele de contact și informațiile contului.
          </p>
        </button>
      </section>
      <section
        aria-label="Lectură și inspirație"
        className="grid gap-3 sm:grid-cols-2"
      >
        {[
          {
            href: "/blog",
            label: "Blog Avyron",
            description: "Idei, ghiduri și noutăți pentru proiectele tale.",
            icon: BookOpen,
          },
          {
            href: "/biblioteca",
            label: "Biblioteca Artefacte",
            description:
              "Exemple vizuale, efecte și integrări pentru inspirație.",
            icon: LibraryBig,
          },
        ].map((card) => (
          <Link
            key={card.href}
            to={publicSiteHref(card.href)}
            className={`${panel} group transition hover:border-violet-400/40`}
          >
            <card.icon className="size-5 text-violet-300" />
            <h2 className="mt-3 text-sm font-semibold">{card.label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {card.description}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
