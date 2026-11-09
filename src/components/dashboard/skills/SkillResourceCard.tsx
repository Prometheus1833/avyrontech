import { Archive, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SkillResource } from "@/shared/skills/model";
const panel = "rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5";
export default function SkillResourceCard({
  item,
  canApprove,
  canManage,
  busy,
  onState,
  onDownload,
  onEdit,
}: {
  item: SkillResource;
  canApprove: boolean;
  canManage: boolean;
  busy: boolean;
  onState: (status: "approved" | "archived") => void;
  onDownload: () => void;
  onEdit: () => void;
}) {
  return (
    <article className={panel + " min-w-0 !p-4"}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-semibold">
          {item.title}
        </h3>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-violet-200">
          {item.status === "approved" ? "Aprobat" : "Ciornă"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {item.domain} · revizia {item.revision}
        {item.file_name
          ? ` · backup ${item.backup_protected ? "protejat" : "neconfirmat"}`
          : ""}
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer py-1 text-xs text-slate-300">
          Citește instrucțiunea
        </summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
          {item.body}
        </p>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block break-all text-xs text-violet-200"
          >
            Proveniență ↗
          </a>
        )}
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.file_name && (
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="mr-1.5 size-3.5" />
            <span className="max-w-36 truncate">{item.file_name}</span>
          </Button>
        )}
        {canApprove && item.status === "draft" && (
          <Button size="sm" disabled={busy} onClick={() => onState("approved")}>
            Aprobă
          </Button>
        )}
        {canManage && (
          <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}>
            Editează
          </Button>
        )}
        {canManage && (
          <Button
            size="sm"
            disabled={busy}
            variant="ghost"
            onClick={() => onState("archived")}
            aria-label={`Arhivează resursa ${item.title}`}
          >
            <Archive className="size-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}
