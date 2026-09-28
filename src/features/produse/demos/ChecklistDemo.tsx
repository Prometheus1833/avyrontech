import LaunchChecklist from "../source/LaunchChecklist";
import type { DemoProps } from "./registry";

export default function ChecklistDemo(_: DemoProps) {
  return (
    <div className="h-full w-full overflow-auto p-4">
      <LaunchChecklist />
    </div>
  );
}
