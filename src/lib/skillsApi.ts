import type { SiteStageKey } from "@/shared/skills/siteStages";
import { cfAuth } from "./cfAuth";
import type {
  SkillSlug,
  SkillDetail,
  SkillRun,
  SkillBrief,
} from "@/shared/skills/model";
const root = (s: SkillSlug) => `/api/skills/${s}`;
export const skillsApi = {
  detail: (
    s: SkillSlug,
    signal?: AbortSignal,
    offset = 0,
    query = "",
    stage?: SiteStageKey,
  ) =>
    cfAuth.request<SkillDetail>(
      root(s) +
        "?" +
        new URLSearchParams({
          resourceOffset: String(offset),
          q: query,
          ...(stage ? { stage } : {}),
        }),
      { signal },
    ),
  runs: (s: SkillSlug, signal?: AbortSignal, offset = 0) =>
    cfAuth.request<{ data: SkillRun[]; nextOffset: number | null }>(
      root(s) + "/runs?offset=" + offset,
      { signal },
    ),
  run: (s: SkillSlug, id: string, signal?: AbortSignal) =>
    cfAuth.request<{ run: SkillRun }>(
      root(s) + "/runs/" + encodeURIComponent(id),
      { signal },
    ),
  create: (
    s: SkillSlug,
    brief: SkillBrief,
    mode: "template" | "ai" | "image",
    key: string,
    options?: { freeOnly: boolean },
  ) =>
    cfAuth.request<{ id: string; status: string }>(root(s) + "/runs", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({
        brief,
        mode,
        ...(options?.freeOnly ? { freeOnly: true } : {}),
      }),
    }),
  version: (
    s: SkillSlug,
    data: {
      revision: number;
      summary: string;
      instructions: string;
      paused: boolean;
    },
  ) =>
    cfAuth.request(root(s) + "/versions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  approve: (s: SkillSlug, revision: number) =>
    cfAuth.request(root(s) + "/approve", {
      method: "POST",
      body: JSON.stringify({ revision }),
    }),
  state: (s: SkillSlug, r: SkillRun, status: "approved" | "archived") =>
    cfAuth.request(root(s) + "/runs/" + encodeURIComponent(r.id) + "/state", {
      method: "POST",
      body: JSON.stringify({ revision: r.revision, status }),
    }),
  resource: (
    s: SkillSlug,
    data: {
      title: string;
      domain: string;
      body: string;
      sourceUrl: string;
      stageKey?: SiteStageKey | null;
    },
  ) =>
    cfAuth.request<{ id: string }>(root(s) + "/resources", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resourceState: (
    s: SkillSlug,
    id: string,
    revision: number,
    status: "approved" | "archived",
  ) =>
    cfAuth.request(
      root(s) + "/resources/" + encodeURIComponent(id) + "/state",
      { method: "POST", body: JSON.stringify({ revision, status }) },
    ),
  upload: (s: SkillSlug, id: string, file: File) =>
    cfAuth.request(root(s) + "/resources/" + encodeURIComponent(id) + "/file", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "text/plain",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    }),
  reviseResource: (
    s: SkillSlug,
    id: string,
    revision: number,
    data: {
      title: string;
      domain: string;
      body: string;
      sourceUrl: string;
      stageKey?: SiteStageKey | null;
    },
  ) =>
    cfAuth.request(root(s) + "/resources/" + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify({ ...data, revision }),
    }),
  download: async (path: string, filename: string) => {
    const blob = await (await cfAuth.requestResponse(path)).blob();
    const extension =
      blob.type === "image/jpeg"
        ? "jpg"
        : blob.type === "image/webp"
          ? "webp"
          : "png";
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".png")
      ? filename.replace(/\.png$/, "." + extension)
      : filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  path: root,
};
