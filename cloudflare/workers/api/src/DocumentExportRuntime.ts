import { DurableObject } from "cloudflare:workers";
import {
  payloadSchema,
  type DocumentPayload,
} from "../../../../src/shared/documents/model";

/** Internal RPC only. One object per immutable version/format/approval state.
 * Coordinates concurrent renders without storing document content or invoking AI.
 * D1/R2 remain authoritative; an eviction simply permits a safe render retry. */
export class DocumentExportRuntime extends DurableObject {
  private pending: Promise<Uint8Array> | null = null;
  async health(): Promise<{ ok: boolean }> {
    return { ok: this.ctx.storage.sql.exec<{ ok: number }>("SELECT 1 AS ok").one().ok === 1 };
  }

  async render(
    payload: DocumentPayload,
    number: string,
    version: number,
    format: "pdf" | "docx",
    draft: boolean,
  ): Promise<Uint8Array> {
    if (
      !/^[A-Za-z0-9-]{1,100}$/.test(number) ||
      !Number.isSafeInteger(version) || version < 1 ||
      !["pdf", "docx"].includes(format) || typeof draft !== "boolean"
    )
      throw new Error("invalid_export_request");
    if (!this.pending) {
      const validated = payloadSchema.parse(payload);
      this.pending = import("./documentExports").then(({ exportDocument }) =>
        exportDocument(validated, number, version, format, draft),
      );
    }
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }
}
