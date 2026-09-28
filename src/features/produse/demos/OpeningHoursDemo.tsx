import OpeningHours from "../source/OpeningHours";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function OpeningHoursDemo() {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 300 }}>
        <OpeningHours
          week={{
            0: null,
            1: { open: "09:00", close: "18:00" },
            2: { open: "09:00", close: "18:00" },
            3: { open: "09:00", close: "18:00" },
            4: { open: "09:00", close: "18:00" },
            5: { open: "09:00", close: "16:00" },
            6: { open: "10:00", close: "14:00" },
          }}
          holidays={["2026-12-01", "2026-12-25", "2026-12-26"]}
        />
      </div>
    </Stage>
  );
}
