import { Copy } from "lucide-react";
import { toast } from "sonner";

const filters = { recent: "Recente", unread: "Necitite", all: "Toate" } as const;
export type ChatListFilter = keyof typeof filters;

export function ChatListFilters({ value, onChange }: { value: ChatListFilter; onChange: (filter: ChatListFilter) => void }) {
  return (
    <div className="chat-list-filters" role="group" aria-label="Filtrează conversațiile">
      {(Object.keys(filters) as ChatListFilter[]).map(filter => (
        <button type="button" key={filter} aria-pressed={value === filter} onClick={() => onChange(filter)}>
          {filters[filter]}
        </button>
      ))}
    </div>
  );
}

export function ChatCopyButton({ content }: { content: string }) {
  return (
    <button type="button" className="chat-copy" aria-label="Copiază mesajul" title="Copiază mesajul" onClick={async () => {
      try {
        await navigator.clipboard.writeText(content);
        toast.success("Mesaj copiat.");
      } catch {
        toast.error("Copierea nu este disponibilă în acest browser. Poți selecta textul mesajului.");
      }
    }}>
      <Copy size={13} aria-hidden="true" />
    </button>
  );
}
