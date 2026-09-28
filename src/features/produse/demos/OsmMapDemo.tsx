import OsmMap from "../source/OsmMap";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function OsmMapDemo({ values, lang }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <OsmMap
          lat={num(values.lat, 46.7712)}
          lon={num(values.lon, 23.6236)}
          label={str(values.label, lang === "ro" ? "Cluj-Napoca, Piața Unirii" : "Cluj-Napoca, Union Square")}
          height={190}
        />
      </div>
    </Stage>
  );
}
