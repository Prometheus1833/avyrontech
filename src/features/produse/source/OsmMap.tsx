/**
 * OsmMap — Avyron Products (avyron.ro/produse)
 * Harta locației din OpenStreetMap, fără cheie, fără cont și fără scripturi de
 * urmărire: un `<iframe>` cu harta încadrată pe punctul tău, plus legături
 * pentru indicații de drum. Se încarcă leneș, deci nu costă la primul ecran.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export function OsmMap({
  lat,
  lon,
  label,
  zoomSpan = 0.006,
  height = 240,
}: {
  lat: number;
  lon: number;
  label: string;
  /** Cât de „strâns" e cadrul în grade. Mai mic = mai aproape. */
  zoomSpan?: number;
  height?: number | string;
}) {
  const bbox = [lon - zoomSpan, lat - zoomSpan / 2, lon + zoomSpan, lat + zoomSpan / 2].map((value) => value.toFixed(5)).join("%2C");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`;

  return (
    <figure style={{ margin: 0, display: "grid", gap: 8, width: "100%" }}>
      <iframe
        title={`Harta locației: ${label}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ width: "100%", height, border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, background: "#0b0d16" }}
      />
      <figcaption style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11.5, color: "rgba(255,255,255,.65)" }}>
        <span>{label}</span>
        <a href={`https://www.openstreetmap.org/directions?to=${lat}%2C${lon}`} target="_blank" rel="noopener noreferrer" style={{ color: "#7dd3fc" }}>
          Indicații (OpenStreetMap)
        </a>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`} target="_blank" rel="noopener noreferrer" style={{ color: "#7dd3fc" }}>
          Indicații (Google Maps)
        </a>
      </figcaption>
    </figure>
  );
}

export default OsmMap;
