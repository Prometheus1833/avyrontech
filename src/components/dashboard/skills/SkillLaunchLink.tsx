import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
export default function SkillLaunchLink({ leadId }: { leadId: string }) {
  const { isSuperAdmin, capabilities } = useAuth();
  const allowed =
    isSuperAdmin ||
    capabilities.includes("skills.use") ||
    (capabilities.includes("leads.read") &&
      capabilities.includes("ai_projects.read"));
  if (!allowed) return null;
  return (
    <Button asChild variant="outline" size="sm">
      <Link
        to={`/profil?tab=skill-site-builder&skillLead=${encodeURIComponent(leadId)}`}
      >
        <Sparkles className="mr-1.5 size-4" />
        Pregătește mockup
      </Link>
    </Button>
  );
}
