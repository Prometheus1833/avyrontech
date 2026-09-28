import QrStudio from "../source/QrStudio";
import type { DemoProps } from "./registry";

export default function QrDemo(_: DemoProps) {
  return (
    <div className="h-full w-full overflow-auto p-4">
      <QrStudio />
    </div>
  );
}
