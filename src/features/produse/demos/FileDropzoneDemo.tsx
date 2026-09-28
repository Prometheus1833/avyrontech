import FileDropzone from "../source/FileDropzone";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

export default function FileDropzoneDemo({ values, lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 330 }}>
        <FileDropzone
          accept="image/*,.pdf"
          maxMb={num(values.maxMb, 5)}
          label={ro ? "Trage aici pozele sau PDF-ul" : "Drop images or a PDF here"}
        />
      </div>
    </Stage>
  );
}
