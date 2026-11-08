import type { Env } from "./types";
import {readCoreHealth} from './overviewHealth';
import {
  documentActor,
  documentCapability,
  documentVisibility,
} from "./documentPolicy";

async function boundedProbe(read: () => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      read(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("storage_probe_timeout")),
          5000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function readStorageStatus(env: Env, userId: string) {
  const actor = await documentActor(env.DB, userId);
  if (!actor?.platform) return null;
  const visible = documentVisibility(actor, "d");
  const modules = await env.DB.prepare(
    `SELECT
    (SELECT count(*) FROM clients) clients,(SELECT count(*) FROM projects) projects,
    (SELECT count(*) FROM product_items WHERE status='live') products,
    (SELECT count(*) FROM ai_knowledge WHERE status='active') knowledge,
    (SELECT count(*) FROM documents d WHERE ${visible.sql}) documents`,
  )
    .bind(...visible.values)
    .first<Record<string, number>>();
  const probes: {
    id: string;
    label: string;
    read: (() => Promise<unknown>) | null;
  }[] = [
    {
      id: "d1",
      label: "Date operaționale · D1",
      read: () => env.DB.prepare("SELECT 1 ok").first(),
    },
    {
      id: "kv",
      label: "Configurări și cache · KV",
      read: env.KV ? () => env.KV.get("os:storage-readiness:v1") : null,
    },
    {
      id: "backups",
      label: "Backup documente · R2",
      read: env.DOCUMENT_BACKUPS
        ? () => env.DOCUMENT_BACKUPS!.list({ limit: 1 })
        : null,
    },
    {
      id: "exports",
      label: "Exporturi · SQLite Durable Object",
      read: env.DOCUMENT_EXPORTS
        ? async () => {
            const result =
              await env.DOCUMENT_EXPORTS.getByName("health-v1").health();
            if (!result.ok) throw new Error("export_storage_unavailable");
          }
        : null,
    },
  ];
  if (documentCapability(actor, "documents.company.owner"))
    probes.push({
      id: "company-backups",
      label: "Backup privat al firmei · R2",
      read: env.DOCUMENT_COMPANY_BACKUPS
        ? () => env.DOCUMENT_COMPANY_BACKUPS!.list({ limit: 1 })
        : null,
    });
  const resources = await Promise.all(
    probes.map(async (probe) => {
      if (!probe.read)
        return {
          id: probe.id,
          label: probe.label,
          status: "neconfigurat",
          detail: "Resursa nu este asociată acestui mediu.",
        };
      try {
        await boundedProbe(probe.read);
        return {
          id: probe.id,
          label: probe.label,
          status: "funcțional",
          detail: "Citirea autorizată a resursei a reușit.",
        };
      } catch {
        return {
          id: probe.id,
          label: probe.label,
          status: "eroare",
          detail:
            "Citirea resursei a eșuat. Reîncearcă verificarea sau consultă configurarea mediului.",
        };
      }
    }),
  );
  return {
    checkedAt: Date.now(),
    environment: env.APP_ENV === "preview" ? "preview" : "production",
    modules: modules || {},
    resources: [...resources,...await readCoreHealth(env)],
  };
}
