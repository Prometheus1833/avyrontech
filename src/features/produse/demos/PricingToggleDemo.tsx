import PricingToggle from "../source/PricingToggle";
import type { DemoProps } from "./registry";

export default function PricingToggleDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-auto p-4">
      <PricingToggle
        locale={ro ? "ro-RO" : "en-IE"}
        labels={ro ? undefined : { monthly: "Monthly", yearly: "Yearly", save: "you save", perMonth: "/mo", perYear: "/yr", recommended: "Recommended" }}
        plans={[
          { id: "start", name: ro ? "Start" : "Start", monthly: 100, yearly: 1000, perks: ro ? ["Actualizări lunare", "Backup săptămânal"] : ["Monthly updates", "Weekly backup"], cta: ro ? "Alege Start" : "Choose Start" },
          { id: "plus", name: "Plus", monthly: 200, yearly: 1900, recommended: true, perks: ro ? ["Tot din Start", "2 modificări/lună", "Monitorizare"] : ["Everything in Start", "2 changes/month", "Monitoring"], cta: ro ? "Alege Plus" : "Choose Plus" },
          { id: "pro", name: "Pro", monthly: 300, yearly: 2800, perks: ro ? ["Tot din Plus", "Suport prioritar", "Raport lunar"] : ["Everything in Plus", "Priority support", "Monthly report"], cta: ro ? "Alege Pro" : "Choose Pro" },
        ]}
      />
    </div>
  );
}
