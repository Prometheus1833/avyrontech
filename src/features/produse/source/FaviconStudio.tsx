import { useEffect, useRef, useState, type ChangeEvent } from "react";

/**
 * FaviconStudio — Produse Avyron (avyron.ro/produse).
 * Componentă React independentă, cu procesare locală în browser.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */
type Settings = {
  text: string;
  foreground: string;
  first: string;
  second: string;
  background: "gradient" | "solid" | "transparent";
  shape: "rounded" | "square" | "circle";
  roundness: number;
  font: "system" | "serif" | "mono";
  angle: number;
  padding: number;
  fit: "contain" | "cover";
};
type Artwork = { canvas: HTMLCanvasElement; name: string };
type Issue = "format" | "size" | "dimensions" | "decode" | "export";
const sizes = [16, 32, 48, 96, 180, 192, 512];
const icoSizes = [16, 32, 48];
const families = { system: "system-ui, sans-serif", serif: "Georgia, serif", mono: "ui-monospace, monospace" };
const defaults = (text: string): Settings => ({
  text, foreground: "#ffffff", first: "#5b34bd", second: "#13597d",
  background: "gradient", shape: "rounded", roundness: 22, font: "system", angle: 135, padding: 16, fit: "contain",
});
const palettes = [
  { name: "Avyron", colors: ["#5b34bd", "#13597d"] },
  { name: "Petrol", colors: ["#073e49", "#12695a"] },
  { name: "Terracotta", colors: ["#79283e", "#a8431d"] },
] as const;

const shapePath = (ctx: CanvasRenderingContext2D, size: number, shape: Settings["shape"], roundness: number) => {
  ctx.beginPath();
  if (shape === "circle") ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
  else if (shape === "square") ctx.rect(0, 0, size, size);
  else {
    const r = size * roundness / 100;
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
  }
  ctx.closePath();
};

function renderIcon(size: number, options: Settings, artwork: Artwork | null) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  shapePath(ctx, size, options.shape, options.roundness);
  ctx.clip();
  if (options.background !== "transparent") {
    ctx.fillStyle = options.first;
    if (options.background === "gradient") {
      const angle = (options.angle - 90) * Math.PI / 180;
      const x = Math.cos(angle), y = Math.sin(angle), span = size * (Math.abs(x) + Math.abs(y)) / 2;
      const gradient = ctx.createLinearGradient(size / 2 - x * span, size / 2 - y * span, size / 2 + x * span, size / 2 + y * span);
      gradient.addColorStop(0, options.first);
      gradient.addColorStop(1, options.second);
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(0, 0, size, size);
  }
  const padding = size * options.padding / 100;
  const usable = size - 2 * padding;
  if (artwork) {
    const { canvas: source } = artwork;
    const ratio = options.fit === "cover"
      ? Math.max(usable / source.width, usable / source.height)
      : Math.min(usable / source.width, usable / source.height);
    const w = source.width * ratio, h = source.height * ratio;
    ctx.beginPath();
    ctx.rect(padding, padding, usable, usable);
    ctx.clip();
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, (size - w) / 2, (size - h) / 2, w, h);
  } else {
    const glyphs = Array.from(options.text.trim().toUpperCase()).slice(0, 3).join("") || "A";
    ctx.font = `800 ${Math.min(size * (glyphs.length > 1 ? .48 : .67), usable)}px ${families[options.font]}`;
    ctx.fillStyle = options.foreground;
    ctx.textAlign = "center";
    const metrics = ctx.measureText(glyphs);
    const center = size / 2 + ((metrics.actualBoundingBoxAscent || size * .36) - (metrics.actualBoundingBoxDescent || 0)) / 2;
    ctx.fillText(glyphs, size / 2, center, usable);
  }
  return canvas;
}

function rasterHeader(buffer: ArrayBuffer) {
  const b = new Uint8Array(buffer), view = new DataView(buffer);
  const match = (offset: number, ...values: number[]) => values.every((value, index) => b[offset + index] === value);
  if (match(0, 137, 80, 78, 71, 13, 10, 26, 10)) {
    if (b.length >= 24 && match(12, 73, 72, 68, 82))
      return { mime: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
  } else if (match(0, 255, 216, 255)) {
    for (let pos = 2; pos + 3 < b.length;) {
      if (b[pos++] !== 255) break;
      while (b[pos] === 255) pos++;
      const marker = b[pos++];
      if (marker === 0xda || marker === 0xd9 || pos + 2 > b.length) break;
      const length = view.getUint16(pos);
      if (length < 2 || pos + length > b.length) break;
      if (length >= 8 && marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { mime: "image/jpeg", width: view.getUint16(pos + 5), height: view.getUint16(pos + 3) };
      pos += length;
    }
  } else if (match(0, 82, 73, 70, 70) && match(8, 87, 69, 66, 80)) {
    const u24 = (i: number) => b[i] + b[i + 1] * 256 + b[i + 2] * 65536;
    if (b.length >= 30 && match(12, 86, 80, 56, 88))
      return { mime: "image/webp", width: 1 + u24(24), height: 1 + u24(27) };
    if (b.length >= 25 && match(12, 86, 80, 56, 76) && b[20] === 47) {
      const bits = view.getUint32(21, true);
      return { mime: "image/webp", width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    if (b.length >= 30 && match(12, 86, 80, 56, 32) && match(23, 157, 1, 42))
      return { mime: "image/webp", width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  } else throw new Error("format");
  throw new Error("decode");
}

const checkDimensions = (width: number, height: number) => {
  if (!width || !height) throw new Error("decode");
  if (width > 4096 || height > 4096) throw new Error("dimensions");
};

async function readArtwork(file: File): Promise<Artwork> {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("size");
  const buffer = await file.arrayBuffer();
  const header = rasterHeader(buffer);
  checkDimensions(header.width, header.height);
  const url = URL.createObjectURL(new Blob([buffer], { type: header.mime }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("decode"));
      image.src = url;
    });
    const { naturalWidth: width, naturalHeight: height } = image;
    checkDimensions(width, height);
    const ratio = Math.min(1, 1024 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("decode");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { canvas, name: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodePng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("png_export")), "image/png"),
  );
}

async function encodeIco(settings: Settings, artwork: Artwork | null) {
  const png = await Promise.all(icoSizes.map(size => encodePng(renderIcon(size, settings, artwork))));
  const header = new ArrayBuffer(6 + 16 * png.length);
  const view = new DataView(header);
  view.setUint16(2, 1, true);
  view.setUint16(4, png.length, true);
  let offset = header.byteLength;
  png.forEach((blob, i) => {
    const start = 6 + 16 * i;
    view.setUint8(start, icoSizes[i]);
    view.setUint8(start + 1, icoSizes[i]);
    view.setUint16(start + 4, 1, true);
    view.setUint16(start + 6, 32, true);
    view.setUint32(start + 8, blob.size, true);
    view.setUint32(start + 12, offset, true);
    offset += blob.size;
  });
  return new Blob([header, ...png], { type: "image/x-icon" });
}

const copy = {
  ro: {
    title: "Editor Favicon", intro: "Creează pictograma din inițiale sau importă un logo ori o schiță. Verific-o la dimensiune reală înainte de export.",
    editor: "Setări favicon", text: "Inițiale", image: "Importă imagine sau schiță", reading: "Se citește imaginea…",
    limits: "PNG, JPEG sau WebP · maximum 5 MB și 4096 px pe latură. Fișierul rămâne în browser.",
    remove: "Elimină imaginea", background: "Fundal", gradient: "Gradient", solid: "Culoare solidă", transparent: "Transparent",
    shape: "Formă", rounded: "Colțuri rotunde", square: "Pătrat", circle: "Cerc", roundness: "Rotunjire", first: "Culoare fundal", second: "A doua culoare",
    ink: "Culoare text", font: "Font", sans: "Fără serife", serif: "Cu serife", mono: "Monospațiat", padding: "Spațiu interior",
    angle: "Unghi gradient", fit: "Încadrare imagine", contain: "Păstrează imaginea întreagă", cover: "Umple cadrul",
    preview: "Previzualizare favicon", light: "Filă luminoasă", dark: "Filă întunecată", reset: "Resetează editorul", export: "Descarcă favicon",
    ico: "ICO · 16 / 32 / 48 px", sizes: "Dimensiune PNG", png: "Descarcă PNG", preparing: "Se pregătește…",
    hints: "16–48 px pentru file și browsere; 180 px pentru Apple Touch; 192 și 512 px pentru manifestul aplicației.",
    errors: { format: "Alege o imagine PNG, JPEG sau WebP.", size: "Imaginea trebuie să aibă între 1 octet și 5 MB.", dimensions: "Imaginea depășește 4096 px pe una dintre laturi.", decode: "Imaginea nu poate fi deschisă. Încearcă un alt fișier.", export: "Exportul nu a reușit. Încearcă din nou." },
  },
  en: {
    title: "Favicon Editor", intro: "Create an icon from initials or import a logo or sketch. Check it at actual size before exporting.",
    editor: "Favicon settings", text: "Initials", image: "Import an image or sketch", reading: "Reading image…",
    limits: "PNG, JPEG or WebP · up to 5 MB and 4096 px per side. Your file stays in this browser.",
    remove: "Remove image", background: "Background", gradient: "Gradient", solid: "Solid colour", transparent: "Transparent",
    shape: "Shape", rounded: "Rounded corners", square: "Square", circle: "Circle", roundness: "Corner radius", first: "Background colour", second: "Second colour",
    ink: "Text colour", font: "Font", sans: "Sans serif", serif: "Serif", mono: "Monospace", padding: "Inner padding",
    angle: "Gradient angle", fit: "Image fitting", contain: "Keep the entire image", cover: "Fill the frame",
    preview: "Favicon preview", light: "Light tab", dark: "Dark tab", reset: "Reset editor", export: "Download favicon",
    ico: "ICO · 16 / 32 / 48 px", sizes: "PNG size", png: "Download PNG", preparing: "Preparing…",
    hints: "16–48 px for tabs and browsers; 180 px for Apple Touch; 192 and 512 px for the web app manifest.",
    errors: { format: "Choose a PNG, JPEG or WebP image.", size: "The image must be between 1 byte and 5 MB.", dimensions: "The image exceeds 4096 px on one side.", decode: "The image could not be opened. Try a different file.", export: "The download failed. Try again." },
  },
};

export function FaviconStudio({ initial = "AV", lang = "ro", onTextChange }: {
  initial?: string; lang?: "ro" | "en"; onTextChange?: (text: string) => void;
}) {
  const t = copy[lang];
  const [options, setOptions] = useState(() => defaults(initial));
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [preview, setPreview] = useState<{ large: string; small: string } | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [size, setSize] = useState(32);
  const importId = useRef(0);
  const change = <K extends keyof Settings,>(key: K, value: Settings[K]) => setOptions(current => ({ ...current, [key]: value }));

  useEffect(() => () => { importId.current++; }, []);
  useEffect(() => {
    try {
      setPreview({ large: renderIcon(192, options, artwork).toDataURL("image/png"), small: renderIcon(16, options, artwork).toDataURL("image/png") });
    } catch { setPreview(null); }
  }, [options, artwork]);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const id = ++importId.current;
    setIssue(null);
    setReading(true);
    try {
      const loaded = await readArtwork(file);
      if (id === importId.current) setArtwork(loaded);
    } catch (error) {
      if (id === importId.current) {
        const code = error instanceof Error ? error.message : "";
        setIssue(code === "format" || code === "size" || code === "dimensions" ? code : "decode");
      }
    } finally { if (id === importId.current) setReading(false); }
  };
  const remove = () => {
    importId.current++;
    setArtwork(null);
    setReading(false);
    setIssue(null);
  };
  const reset = () => {
    remove();
    setOptions(defaults(initial));
    setSize(32);
    onTextChange?.(initial);
  };
  const download = async (format: "png" | "ico") => {
    setIssue(null);
    setSaving(true);
    try {
      const blob = format === "ico" ? await encodeIco(options, artwork) : await encodePng(renderIcon(size, options, artwork));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "ico" ? "favicon.ico" : `favicon-${size}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setIssue("export"); }
    finally { setSaving(false); }
  };

  return (
    <section className="av-favicon" aria-label={t.title}>
      <style>{styles}</style>
      <header className="av-favicon-head">
        <div><h2>{t.title}</h2><p>{t.intro}</p></div>
        <button type="button" onClick={reset}>{t.reset}</button>
      </header>
      <div className="av-favicon-layout">
        <div className="av-favicon-preview">
          <div className="av-favicon-board">{preview && <img src={preview.large} alt={t.preview} width={192} height={192} />}</div>
          <div className="av-favicon-tabs">
            <div>{preview && <img src={preview.small} alt="" width={16} height={16} />}{t.light} <small>16 px</small></div>
            <div>{preview && <img src={preview.small} alt="" width={16} height={16} />}{t.dark} <small>16 px</small></div>
          </div>
          <fieldset className="av-favicon-export">
            <legend>{t.export}</legend>
            <div className="av-favicon-actions">
              <label>{t.sizes}<select value={size} onChange={event => setSize(Number(event.target.value))}>{sizes.map(px => <option key={px} value={px}>{px} × {px}</option>)}</select></label>
              <button type="button" disabled={saving || reading || !preview} onClick={() => void download("png")}>{saving ? t.preparing : t.png}</button>
              <button type="button" disabled={saving || reading || !preview} onClick={() => void download("ico")}>{t.ico}</button>
            </div>
            <p>{t.hints}</p>
          </fieldset>
        </div>
        <fieldset className="av-favicon-controls">
          <legend>{t.editor}</legend>
          <label className="av-favicon-file">{t.image}<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={event => void handleImport(event)} /><small>{t.limits}</small></label>
          {reading && <p role="status">{t.reading}</p>}
          {artwork && <div className="av-favicon-file-row"><span>{artwork.name}</span><button type="button" onClick={remove}>{t.remove}</button></div>}
          <div className="av-favicon-settings">
            {!artwork && <label>{t.text}<input type="text" value={options.text} maxLength={6} onChange={event => { const text = Array.from(event.target.value).slice(0, 3).join(""); change("text", text); onTextChange?.(text); }} /></label>}
            {!artwork && <label>{t.font}<select value={options.font} onChange={event => change("font", event.target.value as Settings["font"])}><option value="system">{t.sans}</option><option value="serif">{t.serif}</option><option value="mono">{t.mono}</option></select></label>}
            <label>{t.shape}<select value={options.shape} onChange={event => change("shape", event.target.value as Settings["shape"])}><option value="rounded">{t.rounded}</option><option value="square">{t.square}</option><option value="circle">{t.circle}</option></select></label>
            {options.shape === "rounded" && <label>{t.roundness} · {options.roundness}%<input type="range" min={0} max={50} value={options.roundness} onChange={event => change("roundness", Number(event.target.value))} /></label>}
            <label>{t.background}<select value={options.background} onChange={event => change("background", event.target.value as Settings["background"])}><option value="gradient">{t.gradient}</option><option value="solid">{t.solid}</option><option value="transparent">{t.transparent}</option></select></label>
            {!artwork && <label>{t.ink}<input type="color" value={options.foreground} onChange={event => change("foreground", event.target.value)} /></label>}
            {options.background !== "transparent" && <label>{t.first}<input type="color" value={options.first} onChange={event => change("first", event.target.value)} /></label>}
            {options.background === "gradient" && <label>{t.second}<input type="color" value={options.second} onChange={event => change("second", event.target.value)} /></label>}
            {artwork && <label>{t.fit}<select value={options.fit} onChange={event => change("fit", event.target.value as Settings["fit"])}><option value="contain">{t.contain}</option><option value="cover">{t.cover}</option></select></label>}
            <label>{t.padding} · {options.padding}%<input type="range" min={0} max={38} value={options.padding} onChange={event => change("padding", Number(event.target.value))} /></label>
            {options.background === "gradient" && <label>{t.angle} · {options.angle}°<input type="range" min={0} max={360} step={5} value={options.angle} onChange={event => change("angle", Number(event.target.value))} /></label>}
          </div>
          <div className="av-favicon-actions">{palettes.map(({ name, colors }) => <button key={name} type="button" onClick={() => setOptions(current => ({ ...current, first: colors[0], second: colors[1], background: "gradient" }))}>{name}</button>)}</div>
          {issue && <p className="av-favicon-error" role="alert">{t.errors[issue]}</p>}
        </fieldset>
      </div>
    </section>
  );
}

const styles = `
.av-favicon{color:#e9edfc;background:#101524;border:1px solid #343e58;border-radius:20px;padding:clamp(12px,3vw,24px);text-align:left;font:14px/1.5 system-ui,sans-serif;color-scheme:dark}
.av-favicon *{box-sizing:border-box;min-width:0}.av-favicon h2{font-size:clamp(1.3rem,3vw,2rem);font-weight:750;margin:0}.av-favicon p{margin:5px 0;color:#c3cce2;font-size:.85rem}
.av-favicon-head{display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.av-favicon-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:14px;align-items:start}
.av-favicon-preview,.av-favicon-controls{display:grid;gap:10px}.av-favicon-board{min-height:200px;display:grid;place-items:center;padding:10px;border-radius:14px;border:1px solid #39445d;background:repeating-conic-gradient(#202b42 0% 25%,#26324b 0% 50%) 0 0/24px 24px}
.av-favicon-board img{max-width:100%;height:auto}.av-favicon-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.av-favicon-tabs div{display:flex;align-items:center;gap:6px;padding:8px;border-radius:8px;background:#e5eaf6;color:#182235;font-size:12px;flex-wrap:wrap}
.av-favicon-tabs div+div{background:#283450;color:#f0f3fb}.av-favicon-tabs small{margin-left:auto;color:inherit}.av-favicon-tabs img{flex:none}
.av-favicon fieldset{margin:0;border:1px solid #45516d;border-radius:12px;padding:10px;min-inline-size:0}.av-favicon legend{font-weight:700;padding:0 5px}
.av-favicon-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.av-favicon label{display:grid;gap:4px;color:#dfe7fc;font-size:12px}
.av-favicon input,.av-favicon select,.av-favicon button{font:inherit;min-height:38px;color:#f0f3ff;border:1px solid #576681;border-radius:8px;background:#1d2740;padding:5px 8px;max-width:100%}
.av-favicon input[type=text],.av-favicon input[type=file],.av-favicon select,.av-favicon input[type=range]{width:100%}
.av-favicon input[type=color]{width:48px;min-height:38px;padding:3px}.av-favicon input[type=range]{accent-color:#b8adff}
.av-favicon button{cursor:pointer}.av-favicon button:hover:not(:disabled){background:#323d62}.av-favicon button:disabled{opacity:.55;cursor:default}
.av-favicon :focus-visible{outline:2px solid #c4b6ff;outline-offset:2px}
.av-favicon-actions,.av-favicon-file-row{display:flex;flex-wrap:wrap;gap:6px;align-items:end}.av-favicon-file-row{align-items:center;justify-content:space-between;overflow-wrap:anywhere}
.av-favicon small{color:#c6cfe4;font-size:12px}.av-favicon .av-favicon-error{color:#ffc9ca}
@media(max-width:720px){.av-favicon-layout{grid-template-columns:minmax(0,1fr)}.av-favicon-board{min-height:150px}.av-favicon-board img{width:120px}.av-favicon input,.av-favicon select,.av-favicon button{min-height:44px}.av-favicon input[type=text],.av-favicon select{font-size:16px}}
`;

export default FaviconStudio;
