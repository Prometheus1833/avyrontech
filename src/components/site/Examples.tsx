import { useMemo, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import IndustryDeviceShowcase from "./IndustryDeviceShowcase";

const order = ["beauty", "resto", "public", "turism", "pro", "local", "auto", "ecommerce", "national", "other"] as const;
type Category = (typeof order)[number];

export default function Examples() {
  const { t } = useLang();
  const [active, setActive] = useState<Category>("beauty");
  const domains = useMemo(() => order.map((key) => ({
    key,
    label: t.examples.cats[key].label,
    title: t.examples.data[key].title,
    description: t.examples.data[key].benefit,
  })), [t]);

  return (
    <section id="exemple" className="device-examples">
      <div className="device-examples__intro">
        <p className="device-examples__eyebrow">AVYRON · DIGITAL EXPERIENCES</p>
        <h2 className="font-display">{t.examples.title}</h2>
        <p>{t.examples.subtitle}</p>
      </div>
      <IndustryDeviceShowcase
        domains={domains}
        activeDomain={active}
        onDomainChange={(key) => setActive(key as Category)}
      />
    </section>
  );
}
