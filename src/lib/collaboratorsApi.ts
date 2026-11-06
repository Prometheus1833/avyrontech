import { cfAuth } from "./cfAuth";
import type {
  Collaborator,
  CollaboratorInput,
  CollaboratorFile,
} from "@/shared/collaborators";
export type CollaborationDetail = {
  collaborator: Collaborator;
  files: CollaboratorFile[];
  uploadBlock: string | null;
};
export type CollaborationOptions = {
  clients: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  }[];
  accounts: { id: string; name: string; email: string }[];
};
const validRecord = (c: Collaborator) =>
  !!c &&
  typeof c.id === "string" &&
  typeof c.code === "string" &&
  typeof c.name === "string" &&
  [
    c.email,
    c.phone,
    c.whatsapp,
    c.specialization,
    c.contactName,
    c.summary,
    c.status,
    c.category,
  ].every((v) => typeof v === "string") &&
  typeof c.canManage === "boolean" &&
  typeof c.canUpload === "boolean" &&
  Number.isSafeInteger(c.revision) &&
  Number.isFinite(c.fileCount);
export const collaboratorsApi = {
  list: (params: URLSearchParams, portal = false, signal?: AbortSignal) =>
    cfAuth
      .request<{
        data: Collaborator[];
        total?: number;
        canManage?: boolean;
      }>(
        (portal ? "/api/my/collaborations" : "/api/collaborators") +
          "?" +
          params,
        { signal },
      )
      .then((r) => {
        if (!r || !Array.isArray(r.data) || !r.data.every(validRecord))
          throw new Error(
            "Lista colaborărilor nu a putut fi validată. Reîncearcă.",
          );
        return r;
      }),
  detail: (id: string, signal?: AbortSignal) =>
    cfAuth
      .request<CollaborationDetail>(
        "/api/collaborations/" + encodeURIComponent(id),
        { signal },
      )
      .then((r) => {
        if (!r || !validRecord(r.collaborator) || !Array.isArray(r.files))
          throw new Error("Fișa nu a putut fi validată. Reîncarcă datele.");
        return r;
      }),
  options: (q: string, client: string | null, signal?: AbortSignal) =>
    cfAuth.request<CollaborationOptions>(
      "/api/collaborators/options?" +
        new URLSearchParams({ q, ...(client ? { client } : {}) }),
      { signal },
    ),
  save: (
    id: string | null,
    input: CollaboratorInput,
    revision: number | undefined,
    archived: boolean,
    accountConfirmed: boolean,
    key: string,
  ) =>
    cfAuth.request<{ id?: string; code?: string }>(
      "/api/collaborators" + (id ? "/" + encodeURIComponent(id) : ""),
      {
        method: id ? "PATCH" : "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          input,
          ...(id ? { revision, archived } : {}),
          accountConfirmed,
        }),
      },
    ),
  upload: (id: string, file: File, visible: boolean, key: string) =>
    cfAuth
      .request<{ id: string; status: string }>(
        `/api/collaborations/${encodeURIComponent(id)}/files?visible=${visible ? "1" : "0"}`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": key,
            "X-File-Name": encodeURIComponent(file.name),
            "Content-Type":
              file.type ||
              (/\.docx$/i.test(file.name)
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : "application/octet-stream"),
          },
          body: file,
        },
      )
      .then((r) => {
        if (r?.status !== "clean_scanned" || typeof r.id !== "string")
          throw new Error(
            "Încărcarea nu are un verdict CLEAN confirmat. Fișierul nu este declarat disponibil.",
          );
        return r;
      }),
  fileChange: (
    id: string,
    fileId: string,
    revision: number,
    change: { visible?: boolean; remove?: true },
  ) =>
    cfAuth.request(
      `/api/collaborations/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...change, revision, confirmed: true }),
      },
    ),
  download: async (id: string, file: CollaboratorFile) => {
    const r = await cfAuth.requestResponse(
      `/api/collaborations/${encodeURIComponent(id)}/files/${encodeURIComponent(file.id)}`,
    );
    const url = URL.createObjectURL(await r.blob()),
      a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
