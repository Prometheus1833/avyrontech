import JsonLdStudio from "../source/JsonLdStudio";
import type { DemoProps } from "./registry";

export default function JsonLdDemo(_: DemoProps) {
  return (
    <div className="h-full w-full overflow-auto p-4">
      <JsonLdStudio />
    </div>
  );
}
