import CountrySelect from "../source/CountrySelect";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function CountriesDemo(_: DemoProps) {
  return (
    <Stage>
      <CountrySelect />
    </Stage>
  );
}
