import { cfAuth } from "./cfAuth";
import type {
  VisualAsset,
  VisualAssetInput,
  VisualOptions,
} from "@/shared/visualAssets";
const root = "/api/visual-assets";
export const visualAssetsApi = {
  context: (id: string) =>
    cfAuth.request<{ write: boolean }>(
      root + "/context?project=" + encodeURIComponent(id),
    ),
  options: () => cfAuth.request<VisualOptions>(root + "/options"),
  list: (p: URLSearchParams) =>
    cfAuth.request<{
      data: VisualAsset[];
      total: number;
      limit: number;
      offset: number;
    }>(`${root}?${p}`),
  upload: (file: File, input: VisualAssetInput, key: string) => {
    const meta = encodeURIComponent(JSON.stringify(input));
    if (meta.length > 10000)
      throw new Error("Scurtează descrierea și etichetele fișierului.");
    return cfAuth.request<{ id: string; scanStatus: "quarantined" }>(
      root + "/upload",
      {
        method: "POST",
        headers: {
          "X-Asset-Metadata": meta,
          "X-Asset-Filename": encodeURIComponent(file.name),
          "Content-Type": file.type,
          "Idempotency-Key": key,
        },
        body: file,
      },
    );
  },
  save: (
    a: VisualAsset,
    input: {
      title: string;
      category: string;
      description: string;
      tags: string[];
      archived: boolean;
    },
  ) =>
    cfAuth.request(root + "/" + a.id, {
      method: "PATCH",
      body: JSON.stringify({ ...input, revision: a.revision }),
    }),
  content: async (a: VisualAsset, preview = false) => {
    const r = await cfAuth.requestResponse(
      `${root}/${a.id}/content?inspect=${a.canInspect ? "1" : "0"}&preview=${preview ? "1" : "0"}`,
    );
    return URL.createObjectURL(await r.blob());
  },
  download: async (a: VisualAsset) => {
    const url = await visualAssetsApi.content(a),
      el = document.createElement("a");
    el.href = url;
    el.download = a.file_name;
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  backups: (id: string) =>
    cfAuth.request<{
      data: {
        id: string;
        sha256: string;
        size_bytes: number;
        created_at: number;
      }[];
      configured: boolean;
    }>(`${root}/${id}/backups`),
  backup: (id: string) =>
    cfAuth.request(`${root}/${id}/backup`, {
      method: "POST",
      body: JSON.stringify({ confirmed: true }),
    }),
  restore: (id: string, backupId: string) =>
    cfAuth.request(`${root}/${id}/restore`, {
      method: "POST",
      body: JSON.stringify({ backupId, confirmed: true }),
    }),
};
