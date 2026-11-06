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
  const { user, hasCollaborations } = useAuth();
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
  const rows = projects?.data || [],
    purchases = projects?.purchases || [];
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
      <section aria-labelledby="account-projects-title" className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="account-projects-title"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <Boxes className="size-5 text-violet-300" />
            Proiectele mele
          </h2>
          <button
            type="button"
            onClick={() => onOpenSection("projects")}
            className={action}
          >
            Vezi toate <ArrowUpRight className="size-3.5" />
          </button>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Proiectele în care ești inclus și serviciile achiziționate, în
          dezvoltare sau finalizate.
        </p>
        {error ? (
          <div
            role="alert"
            className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300"
          >
            Proiectele nu pot fi încărcate acum.
            <button type="button" className={action} onClick={reload}>
              Reîncearcă
            </button>
          </div>
        ) : !projects ? (
          <p role="status" className="mt-3 text-sm text-slate-400">
            Se încarcă proiectele…
          </p>
        ) : !rows.length && !purchases.length ? (
          <p className="mt-3 rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-400">
            Proiectele și achizițiile confirmate vor apărea aici după alocarea
            în cont.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {rows.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                to={`/intern/projects/${encodeURIComponent(project.slug)}`}
                className="min-w-0 rounded-xl border border-white/10 bg-white/[.025] p-3 transition hover:border-violet-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <span className="block break-words text-sm font-medium">
                  {project.name}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {projectKindLabel(project.kind)}
                </span>
                <span className="mt-2 inline-flex rounded-md bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">
                  {projectStageLabel(project)}
                </span>
              </Link>
            ))}
            {purchases.slice(0, 4).map((purchase) => (
              <button
                key={purchase.id}
                type="button"
                onClick={() => onOpenSection("projects")}
                className="min-w-0 rounded-xl border border-white/10 bg-white/[.025] p-3 text-left transition hover:border-violet-400/40"
              >
                <span className="block break-words text-sm font-medium">
                  {purchase.name}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {purchase.kind === "service"
                    ? "Serviciu achiziționat"
                    : purchase.kind === "subscription"
                      ? "Abonament"
                      : "Produs achiziționat"}
                </span>
                <span className="mt-2 inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                  Plată confirmată
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="account-maintenance-title" className={panel}>
        <h2
          id="account-maintenance-title"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <Repeat className="size-5 text-violet-300" />
          Mentenanță
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Abonamentele, activitățile și colaborările tale, cu termenele și
          plățile aferente.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={action}
            onClick={() => onOpenSection("subscriptions")}
          >
            Abonamente și activități <ArrowUpRight className="size-3.5" />
          </button>
          {hasCollaborations && (
            <button
              type="button"
              className={action}
              onClick={() =>
                onOpenSection("subscriptions", {
                  recurringView: "collaborations",
                })
              }
            >
              Colaborările mele
            </button>
          )}
          <button
            type="button"
            className={action}
            onClick={() =>
              onOpenSection("payments", { billingView: "invoices" })
            }
          >
            Plăți și facturi
          </button>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            id: "profile" as const,
            label: "Profil",
            description: "Datele tale de contact și informațiile contului.",
            icon: UserRound,
          },
          {
            id: "payments" as const,
            label: "Metode de plată salvate",
            description: "Carduri mascate, procesator și date de facturare.",
            icon: CreditCard,
          },
        ].map((card) => (
          <button
            key={card.id}
            type="button"
            className={`${panel} group text-left transition hover:border-violet-400/40`}
            onClick={() =>
              onOpenSection(
                card.id,
                card.id === "payments"
                  ? { billingView: "settings" }
                  : undefined,
              )
            }
          >
            <card.icon className="size-5 text-violet-300" />
            <h2 className="mt-3 text-sm font-semibold">{card.label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {card.description}
            </p>
          </button>
        ))}
      </div>
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
