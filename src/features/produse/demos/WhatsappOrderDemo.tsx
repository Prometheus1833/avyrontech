import { useState } from "react";
import WhatsappOrder, { type OrderLine } from "../source/WhatsappOrder";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

const CATALOG: OrderLine[] = [
  { name: "Miere de tei 500g", priceRon: 38 },
  { name: "Dulceață de caise", priceRon: 24 },
  { name: "Set 3 borcane", priceRon: 95 },
];

export default function WhatsappOrderDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [lines, setLines] = useState<OrderLine[]>([]);

  const toggle = (item: OrderLine) =>
    setLines((current) => (current.some((line) => line.name === item.name) ? current.filter((line) => line.name !== item.name) : [...current, { ...item, quantity: 1 }]));

  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 300, display: "grid", gap: 8 }}>
        <ul className="grid list-none gap-1.5 p-0">
          {CATALOG.map((item) => {
            const picked = lines.some((line) => line.name === item.name);
            return (
              <li key={item.name}>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  aria-pressed={picked}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[12px] ${picked ? "bg-white/[0.12] text-white" : "bg-white/[0.04] text-white/70"}`}
                >
                  <span>{item.name}</span>
                  <span className="pa-mono">{item.priceRon} lei</span>
                </button>
              </li>
            );
          })}
        </ul>
        <WhatsappOrder
          phone="40734605055"
          lines={lines}
          note={ro ? "Livrare în Cluj, plata la primire." : "Delivery in Cluj, payment on arrival."}
          label={ro ? "Comandă pe WhatsApp" : "Order on WhatsApp"}
          disabledLabel={ro ? "Alege cel puțin un produs" : "Pick at least one product"}
        />
      </div>
    </Stage>
  );
}
