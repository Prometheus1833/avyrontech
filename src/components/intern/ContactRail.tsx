import { Mail } from "lucide-react";
import { AVYRON_CONTACT_EMAILS, AVYRON_ADMIN_EMAIL } from "@/lib/contactEmails";

/**
 * Bara subtilă cu emailurile Avyron. Se afișează în dashboard-ul clientului
 * și în pagina de proiect ca să știe unde să scrie pentru fiecare tip de cerere.
 * Toate adresele sunt rutate prin Cloudflare Email Routing către avyrontech@gmail.com.
 */
export const ContactRail = ({ compact = false }: { compact?: boolean }) => (
  <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
    <div className="flex items-center gap-2 mb-2">
      <Mail className="size-3.5 text-muted-foreground" />
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        // scrie-ne pe adresa potrivită
      </p>
    </div>
    <div className={compact ? "flex flex-wrap gap-1.5" : "grid gap-2 sm:grid-cols-2"}>
      {AVYRON_CONTACT_EMAILS.map((e) => (
        <a
          key={e.address}
          href={`mailto:${e.address}`}
          className="group flex items-start gap-2 rounded-lg border bg-background/60 px-2.5 py-2 text-xs transition hover:border-primary/50 hover:bg-background"
          title={e.topic}
        >
          <span className="font-medium text-foreground group-hover:text-primary">{e.address}</span>
          {!compact && <span className="text-muted-foreground">— {e.topic}</span>}
        </a>
      ))}
    </div>
    <p className="mt-2 text-[11px] text-muted-foreground">
      Toate ajung la administrator principal ({AVYRON_ADMIN_EMAIL}).
    </p>
  </div>
);

export default ContactRail;
