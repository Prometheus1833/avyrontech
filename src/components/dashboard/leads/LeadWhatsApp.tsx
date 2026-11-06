import { MessageCircle } from "lucide-react";
import { leadWhatsAppUrl } from "@/shared/leadArchive";
export default function LeadWhatsApp({phone,message="",label="Deschide WhatsApp"}:{phone:string|null;message?:string;label?:string}) {
  const href=leadWhatsAppUrl(phone,message);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title="Deschide conversația; mesajul se trimite manual în WhatsApp" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-400/25 px-2.5 py-2 text-xs text-emerald-500 hover:bg-emerald-400/10"><MessageCircle className="size-3.5" />{label}</a> : null;
}
