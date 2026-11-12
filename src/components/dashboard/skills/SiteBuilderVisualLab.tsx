import { useState, type CSSProperties } from "react";
import { ArrowRight, ExternalLink, Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_DOMAIN_PLAYBOOKS } from "@/shared/skills/siteKnowledge";
import { SITE_VISUAL_EFFECTS, SITE_VISUAL_REVIEWED, SITE_VISUAL_SOURCES, siteVisualDirection, type SiteVisualDemo } from "@/shared/skills/siteVisualLibrary";
import "./siteBuilderVisualLab.css";

const panel = "min-w-0 rounded-2xl border border-white/10 bg-white/[.025] p-4";
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro");
const categories = [...new Set(SITE_VISUAL_EFFECTS.map(effect => effect.category))];

function VisualDemo({ demo, color, active }: { demo: SiteVisualDemo; color: string; active: boolean }) {
  return (
    <div className="sb-visual-stage" data-demo={demo} data-active={active} style={{ "--sb-accent": color } as CSSProperties} aria-hidden="true">
      {demo === "route" ? (
        <svg viewBox="0 0 320 120" className="sb-visual-route" focusable="false">
          <path d="M24 82 H72 Q100 82 114 63 L141 31 Q152 19 171 20 H210 Q227 20 239 37 L257 60 Q266 72 295 72" />
          <path className="sb-visual-route-accent" d="M24 82 H72 Q100 82 114 63 L141 31 Q152 19 171 20 H210 Q227 20 239 37 L257 60 Q266 72 295 72" pathLength="100" />
          <circle cx="24" cy="82" r="5" /><circle cx="171" cy="20" r="5" /><circle cx="295" cy="72" r="5" />
        </svg>
      ) : <div className="sb-visual-forms"><i /><i /><i /></div>}
    </div>
  );
}

export default function SiteBuilderVisualLab({ domain, onDomain, onUse }: { domain: string; onDomain: (value: string) => void; onUse: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [demoId, setDemoId] = useState("");
  const [playing, setPlaying] = useState(false);
  const direction = siteVisualDirection(domain);
  const matches = (showAll ? SITE_VISUAL_EFFECTS : direction.recommended).filter(effect =>
    (!category || effect.category === category) && fold(`${effect.name} ${effect.category} ${effect.medium} ${effect.purpose} ${effect.technique}`).includes(fold(query.trim())),
  );
  const preview = matches.find(effect => effect.id === demoId && effect.demo);
  const changeScope = (all: boolean) => { setShowAll(all); setCategory(""); setDemoId(""); setPlaying(false); };

  return (
    <section className="space-y-4" aria-label="Efecte și surse Site Builder">
      <header className={panel}>
        <p className="font-mono text-xs uppercase tracking-widest text-violet-300">Site Builder · bibliotecă vizuală</p>
        <h2 className="mt-1 font-display text-xl font-semibold">Efecte și surse</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">Alege efectul după ce trebuie să înțeleagă vizitatorul. Găsești rețete adaptate pe domenii, demonstrații fără active externe și documentație gratuită.</p>
      </header>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside className={panel}>
          <label className="block text-sm font-medium">
            Domeniu pentru direcția vizuală
            <select value={domain} onChange={event => { onDomain(event.target.value); setDemoId(""); setPlaying(false); }} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#10162a] px-3 text-base sm:text-sm">
              {!SITE_DOMAIN_PLAYBOOKS.some(profile => profile.id === domain) && <option value={domain}>{domain} · direcție generală adaptabilă</option>}
              {SITE_DOMAIN_PLAYBOOKS.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
            </select>
          </label>
          <h3 className="mt-4 text-base font-semibold">{direction.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{direction.treatment}</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-100">De evitat: {direction.avoid}</p>
          <Button type="button" className="mt-4 min-h-11" onClick={onUse}>Folosește în brief <ArrowRight className="ml-2 size-4" aria-hidden="true" /></Button>
        </aside>

        <div className={panel}>
          <div className="flex flex-wrap gap-2" aria-label="Selecția efectelor">
            <Button type="button" variant={showAll ? "outline" : "default"} aria-pressed={!showAll} onClick={() => changeScope(false)}>Recomandate</Button>
            <Button type="button" variant={showAll ? "default" : "outline"} aria-pressed={showAll} onClick={() => changeScope(true)}>Toate · {SITE_VISUAL_EFFECTS.length}</Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Caută efecte<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex. poster, traseu, material" className="os-workspace-input mt-1 w-full" /></label>
            {showAll && <label className="text-xs text-slate-300">Categorie<select value={category} onChange={event => setCategory(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#10162a] px-3 text-base sm:text-sm"><option value="">Toate categoriile</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>}
          </div>
          <p role="status" className="mt-3 text-xs text-slate-400">{matches.length} rețete</p>
          <div className="mt-2 grid gap-2">
            {matches.map(effect => (
              <article key={effect.id} className="min-w-0 rounded-xl border border-white/10 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{effect.name}</h3><span className="text-xs text-cyan-200">{effect.category} · {effect.medium}</span></div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{effect.purpose}</p>
                <details className="mt-2 text-xs leading-relaxed">
                  <summary className="cursor-pointer text-violet-200">Cum îl construiești și ce păstrezi fără animație</summary>
                  <p className="mt-2 text-slate-300">{effect.technique}</p>
                  <p className="mt-1 text-slate-300"><strong>Fallback:</strong> {effect.fallback}</p>
                  <a href={SITE_VISUAL_SOURCES[effect.source].url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-violet-200 underline">Documentație <ExternalLink className="size-3" aria-hidden="true" /></a>
                </details>
                {effect.demo && <Button type="button" size="sm" variant="ghost" className="mt-1 px-2" aria-pressed={demoId === effect.id} onClick={() => { setDemoId(effect.id); setPlaying(false); }}><Sparkles className="mr-1.5 size-3.5" aria-hidden="true" /> Demo · {effect.name}</Button>}
                {preview?.id === effect.id && preview.demo && (
                  <figure className="mt-4 overflow-hidden rounded-xl border border-white/10" aria-label={`Demo · ${preview.name}`}>
                    <VisualDemo demo={preview.demo} color={direction.color} active={playing} />
                    <figcaption className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-slate-300">
                      <span>{preview.name} · exemplu schematic</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPlaying(!playing)}>{playing ? <RotateCcw className="mr-2 size-4" aria-hidden="true" /> : <Play className="mr-2 size-4" aria-hidden="true" />}{playing ? "Resetează" : "Redă efectul"}</Button>
                    </figcaption>
                  </figure>
                )}
              </article>
            ))}
          </div>
          {!matches.length && <p className="mt-3 text-sm text-slate-300">Niciun efect pentru filtrele curente.</p>}
        </div>
      </div>

      <section className={panel} aria-labelledby="site-builder-free-sources">
        <h3 id="site-builder-free-sources" className="text-sm font-semibold">Surse publice gratuite</h3>
        <p className="mt-1 text-xs text-slate-300">Verificate la {SITE_VISUAL_REVIEWED.split("-").reverse().join(".")}. Lectura este gratuită. Licențele pentru active și extensii se verifică separat, înainte de reutilizare.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.values(SITE_VISUAL_SOURCES).map(source => <article key={source.url} className="min-w-0 rounded-xl border border-white/10 p-3">
            <p className="text-[11px] text-cyan-200">{source.group}</p>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet-200 underline">{source.title}<ExternalLink className="size-3 shrink-0" aria-hidden="true" /></a>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{source.use}</p>
          </article>)}
        </div>
      </section>
    </section>
  );
}
