import AnpcBar from "../source/AnpcBar";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function AnpcBarDemo() {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <AnpcBar
          company={{
            name: "Exemplu Digital SRL",
            cui: "RO12345678",
            regCom: "J40/1234/2020",
            address: "Str. Exemplu 10, Cluj-Napoca",
            email: "contact@exemplu.ro",
            phone: "0734 605 055",
          }}
        />
      </div>
    </Stage>
  );
}
