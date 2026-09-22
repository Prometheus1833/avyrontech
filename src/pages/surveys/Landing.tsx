import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Globe, Layers, ShieldCheck, Sparkles, ShoppingBag, BookOpen, AppWindow, Bot, Palette, Files, ClipboardCheck, Wrench, Search, type LucideIcon } from 'lucide-react';
import SurveyShell, { ContactLinks } from '@/components/surveys/SurveyShell';
import Turnstile from '@/components/site/Turnstile';
import { seedTemplates } from '@/shared/surveys/templates';
import { hiddenPublicTemplates, seedPresentations, type SurveyPresentation } from '@/shared/surveys/catalog';
import { surveyRequest, surveyMessage } from '@/lib/surveysApi';
import { setPageMeta } from '@/lib/seo';

type PublicTemplate = { id: string; title: string; service: string; description: string; presentation?: SurveyPresentation };
const icons: Record<string, LucideIcon> = { website: Globe, ecommerce: ShoppingBag, blog: BookOpen, application: AppWindow, ai: Bot, branding: Palette, content: Files, qa: ClipboardCheck, maintenance: Wrench, audit: Search };
const initialTemplates: PublicTemplate[] = seedTemplates.filter(t => !hiddenPublicTemplates.has(t.id)).map(({ id, template }) => ({ id, title: template.title, service: template.service, description: template.description, presentation: seedPresentations[id] }));

export default function SurveyLanding() {
  const [selected, setSelected] = useState('website');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(0);
  const [templates, setTemplates] = useState<PublicTemplate[]>(initialTemplates);
  const [ready, setReady] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const campaign = new URLSearchParams(window.location.search).get('campaign') || undefined;

  useEffect(() => {
    setPageMeta({ title: 'AVYRON Smart Survey — Un început clar pentru proiectul tău', description: 'Alege un brief pentru website, magazin online, aplicație, AI sau servicii digitale. Întrebări adaptate proiectului tău, cu răspunsuri salvate în siguranță.', path: '/surveys' });
    document.querySelector('link[rel=canonical]')?.setAttribute('href', 'https://surveys.avyron.ro/');
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://surveys.avyron.ro/');
    surveyRequest<{ data: PublicTemplate[]; campaign?: string }>(`templates${campaign ? '?campaign=' + encodeURIComponent(campaign) : ''}`).then(r => {
      setTemplates(r.data);
      setSelected(r.campaign || r.data[0]?.id || '');
      setReady(r.data.length > 0);
    }).catch(e => setError(surveyMessage(e)));
  }, [campaign]);

  const choose = (id: string) => {
    setSelected(id);
    requestAnimationFrame(() => {
      const top = detailRef.current?.getBoundingClientRect().top;
      if (!window.matchMedia('(max-width: 700px)').matches && top !== undefined && top >= 0 && top < window.innerHeight - 100) return;
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
  };
  const start = async () => {
    setBusy(true); setError('');
    try {
      const storageKey = `avyron-survey-start:${campaign || selected}`;
      let requestKey = sessionStorage.getItem(storageKey);
      if (!requestKey) { requestKey = crypto.randomUUID(); sessionStorage.setItem(storageKey, requestKey); }
      const attribution = Object.fromEntries([...new URLSearchParams(window.location.search)].filter(([k]) => k.startsWith('utm_')));
      const result = await surveyRequest<{ token: string }>('start', { template: selected, campaign, turnstileToken: token, requestKey, attribution });
      sessionStorage.removeItem(storageKey);
      window.location.assign(`/s/${result.token}`);
    } catch (e) { setError(surveyMessage(e)); setReset(x => x + 1); setToken(''); }
    finally { setBusy(false); }
  };
  const chosen = templates.find(t => t.id === selected);
  const presentation = chosen?.presentation;
  const steps = presentation?.steps?.length ? presentation.steps : ['Înțelegem contextul proiectului.', 'Clarificăm prioritățile și materialele disponibile.', 'Pregătim un brief pentru echipa AVYRON.'];

  return <SurveyShell><main><section className="survey-hero"><div className="survey-hero-copy"><p className="survey-eyebrow"><span className="survey-live-dot"/> UN ÎNCEPUT BUN SCHIMBĂ TOTUL</p><h1>Ideile tale.<br/><span>Un început clar.</span></h1><p className="survey-lead">Tu îți cunoști afacerea. Noi te ajutăm să transformi ceea ce ai în minte într-un proiect bine definit.</p><p className="survey-hero-note">Un interviu scurt, adaptat răspunsurilor tale. Fără cont, fără presiune. Îl poți continua în ritmul tău.</p><a className="survey-button primary" href="#alege">Să conturăm proiectul <ArrowRight size={19}/></a><div className="survey-trust"><span><Check size={15}/>Se adaptează la tine</span><span><ShieldCheck size={15}/>Răspunsuri private</span></div></div><div className="survey-orbit" aria-hidden="true"><div className="orbit-ring r1"/><div className="orbit-ring r2"/><div className="orbit-ring r3"/><div className="orbit-core">A<span>AVYRON</span></div><div className="orbit-chip chip1"><span>01</span> Ideile tale</div><div className="orbit-chip chip2"><Sparkles size={16}/> Mai multă claritate</div><div className="orbit-chip chip3"><Check size={16}/> Un brief pentru echipă</div><span className="orbit-caption">DE LA CONVERSAȚIE LA DIRECȚIE</span></div></section>
    <section className="survey-choice-section" id="alege">
      <div className="survey-section-heading"><div><p className="survey-eyebrow">ALEGE PUNCTUL DE PORNIRE</p><h2>Ce construim împreună?</h2></div><p>Alege direcția potrivită.<br/>Vezi ce clarificăm înainte să începi.</p></div>
      <div className="survey-selection">
        <div className="survey-service-grid" aria-label="Opțiuni de brief">
          {templates.map(template => {
            const Icon = icons[template.id] || Layers;
            return <button type="button" key={template.id} className={`survey-service ${template.id === selected ? 'selected' : ''} ${template.id === 'website' ? 'featured' : ''}`} onClick={() => choose(template.id)} disabled={!!campaign} aria-pressed={template.id === selected} aria-controls="brief-details">
              <span className="service-icon"><Icon size={22}/></span>
              <span className="survey-service-copy">
                {template.id === 'website' && <small>PRIMUL PAS RECOMANDAT</small>}
                <strong>{template.service}</strong>
                <em>{template.presentation?.summary || template.description}</em>
                {!!template.presentation?.features?.length && <span className="survey-service-features">{template.presentation.features.map(feature => <span key={feature}>{feature}</span>)}</span>}
                <span className="survey-service-discover">{template.id === selected ? 'Vezi brief-ul ales' : 'Descoperă brief-ul'} <ArrowUpRight size={13}/></span>
              </span>
              <span className="service-check" aria-hidden="true">{template.id === selected ? <Check size={16}/> : <ArrowUpRight size={16}/>}</span>
            </button>;
          })}
        </div>
        <aside id="brief-details" ref={detailRef} tabIndex={-1} aria-labelledby="brief-title" className="survey-start-card">
          <span className="survey-eyebrow">BRIEF PERSONALIZAT</span>
          <h3 id="brief-title" aria-live="polite">{chosen?.service}</h3>
          <p>{presentation?.description || chosen?.description}</p>
          {presentation?.fit && <div className="survey-fit"><h4>Potrivit pentru</h4><p>{presentation.fit}</p></div>}
          <h4 className="survey-detail-label">Ce clarificăm împreună</h4>
          <ol>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol>
          {presentation?.outcome && <div className="survey-outcome"><Sparkles size={18}/><div><h4>Cu ce rămâi după brief</h4><p>{presentation.outcome}</p></div></div>}
          <div className="survey-saving-note"><ShieldCheck size={17}/><span>Progres salvat automat.<br/>Link privat pentru reluare.</span></div>
          <Turnstile action="survey-start" onToken={setToken} resetKey={reset}/>
          <button className="survey-button primary" onClick={() => void start()} disabled={busy || !token || !ready}>{busy ? 'Pregătim interviul…' : presentation?.cta || 'Începe brief-ul'}<ArrowRight size={18}/></button>
          {error && <p role="alert" className="survey-error">{error}</p>}
          <small>Nu trebuie să ai toate răspunsurile. Poți alege „nu sunt sigur”; clarificăm împreună ce lipsește.</small>
          {!campaign && <a className="survey-compare" href="#alege">Compară celelalte opțiuni ↑</a>}
        </aside>
      </div>
    </section>
    <ContactLinks/>
  </main></SurveyShell>;
}
