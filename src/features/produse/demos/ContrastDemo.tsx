import ContrastChecker from "../source/ContrastChecker";
import type { DemoProps } from "./registry";

export default function ContrastDemo(_: DemoProps) {
  return (
    <div className="h-full w-full overflow-auto p-4">
      <ContrastChecker />
    </div>
  );
}
