import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { Recycle, Smartphone, ScanLine, Wallet, MapPin, ArrowRight, Check, TrendingUp, Award, Leaf } from "lucide-react";

const RetuvoDemo = () => {
  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: "Retuvo — Demo aplicație reciclare și garanție realizată de Avyron",
        description:
          "Exemplu de aplicație mobilă pentru reciclare ambalaje și recuperarea garanției: hartă puncte, scanare coduri și parteneri, realizată de Avyron.",
        path: "/exemple/retuvo",
      })
    );
  }, []);

  return (
    <DemoFrame displayUrl="retuvo.avyron.ro" brandName="Retuvo" accent="#10b981">
      <div className="bg-white text-[#0f1f1a]">
        {/* NAV */}
        <header className="border-b border-emerald-100 bg-white/95 backdrop-blur sticky top-[52px] z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500 grid place-items-center">
                <Recycle className="size-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">retuvo</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-emerald-900/70">
              <a href="#cum" className="hover:text-emerald-600">Cum funcționează</a>
              <a href="#harta" className="hover:text-emerald-600">Hartă puncte</a>
              <a href="#parteneri" className="hover:text-emerald-600">Parteneri</a>
              <a href="#download" className="hover:text-emerald-600">Aplicație</a>
            </nav>
            <a href="#download" className="inline-flex items-center gap-1.5 bg-emerald-500 text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-emerald-600">
              <Smartphone className="size-4" /> Descarcă
            </a>
          </div>
        </header>

        {/* HERO */}
        <section className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Leaf className="size-3" /> Sustenabilitate națională
              </span>
              <h1 className="font-display font-bold text-5xl md:text-6xl leading-[0.95] mt-4 text-emerald-950">
                Returnează.<br />
                <span className="text-emerald-500">Recuperează</span><br />
                garanția.
              </h1>
              <p className="text-base text-emerald-900/70 mt-4 max-w-md leading-relaxed">
                Scanează codul de bare al recipientelor PET, aluminiu sau sticlă. Primești instant 0,5 RON în walletul digital. Simplu, rapid, eco.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <a href="#download" className="inline-flex items-center gap-2 bg-emerald-500 text-white rounded-full px-6 py-3 text-sm font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/30">
                  Descarcă aplicația <ArrowRight className="size-4" />
                </a>
                <a href="#cum" className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500/30 text-emerald-700 px-5 py-3 text-sm font-semibold hover:bg-emerald-50">
                  Vezi cum funcționează
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 pt-6 border-t border-emerald-100">
                {[["2.4M+", "recipiente"], ["120K+", "utilizatori"], ["1.2M RON", "returnați"]].map(([v, l]) => (
                  <div key={l}>
                    <div className="font-display font-bold text-2xl text-emerald-600 leading-none">{v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-900/60 mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone mockup */}
            <div className="relative max-w-xs mx-auto">
              <div className="relative aspect-[9/19] rounded-[2.5rem] bg-emerald-950 p-3 shadow-2xl">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-emerald-950 rounded-b-2xl z-10" />
                <div className="h-full rounded-[2rem] bg-gradient-to-b from-emerald-500 to-emerald-600 overflow-hidden flex flex-col text-white">
                  <div className="px-5 pt-12 pb-6">
                    <div className="text-xs opacity-80">Wallet retuvo</div>
                    <div className="font-display font-bold text-4xl mt-1">42,50 <span className="text-base font-normal opacity-80">RON</span></div>
                  </div>
                  <div className="bg-white text-emerald-950 flex-1 rounded-t-[2rem] p-5 space-y-3">
                    <button className="w-full bg-emerald-500 text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-bold shadow-lg">
                      <ScanLine className="size-5" /> Scanează cod
                    </button>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-900/60 pt-2">Ultimele returnări</div>
                    {[["PET 0.5L · Coca-Cola", "+0,50"], ["Aluminiu · Ursus", "+0,50"], ["Sticlă · Borsec", "+0,50"]].map(([n, v]) => (
                      <div key={n} className="flex items-center justify-between text-xs py-2 border-b border-emerald-100">
                        <span className="truncate pr-2">{n}</span>
                        <span className="font-bold text-emerald-600 shrink-0">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="cum" className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-xs uppercase tracking-[0.25em] text-emerald-600 font-bold">3 pași</span>
              <h2 className="font-display font-bold text-3xl md:text-4xl mt-2">Cum recuperezi garanția</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                [ScanLine, "Scanează", "Folosește camera telefonului pentru a scana codul de bare al recipientului."],
                [MapPin, "Predă la punct", "Mergi la cel mai apropiat punct de colectare din rețeaua noastră națională."],
                [Wallet, "Primești instant", "0,5 RON pe recipient în wallet, retragi prin transfer bancar sau vouchere."],
              ].map(([Icon, t, d], i) => (
                <div key={t as string} className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6">
                  <div className="size-12 rounded-2xl bg-emerald-500 text-white grid place-items-center mb-4">
                    <Icon className="size-6" />
                  </div>
                  <div className="text-xs font-bold text-emerald-600 mb-1">PAS {i + 1}</div>
                  <div className="font-display font-bold text-xl">{t as string}</div>
                  <div className="text-sm text-emerald-900/70 mt-2">{d as string}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARTNERS */}
        <section id="parteneri" className="bg-emerald-950 text-white py-16">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-emerald-300 font-bold">Pentru parteneri</span>
              <h2 className="font-display font-bold text-3xl md:text-4xl mt-2">
                Dashboard dedicat pentru retaileri, RetuRO și primării
              </h2>
              <p className="text-emerald-100/70 mt-3 max-w-md">
                Statistici în timp real, integrare cu sisteme de plăți și transfer bancar, vouchere partenere și API pentru integrări custom.
              </p>
              <ul className="mt-5 space-y-2">
                {["Statistici live cu volume colectate", "Integrare API & webhooks", "Decontări automate către parteneri", "Scalabilitate la milioane tranzacții/zi"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="size-4 text-emerald-400 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                [TrendingUp, "+312%", "creștere lunară"],
                [Award, "37 jud.", "acoperire națională"],
                [Recycle, "2.4M", "recipiente colectate"],
                [Wallet, "1.2M RON", "returnați utilizatorilor"],
              ].map(([Icon, v, l]) => (
                <div key={l as string} className="bg-emerald-900/50 border border-emerald-700/40 rounded-2xl p-4">
                  <Icon className="size-6 text-emerald-400 mb-2" />
                  <div className="font-display font-bold text-2xl">{v as string}</div>
                  <div className="text-xs text-emerald-200/70 mt-1">{l as string}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DOWNLOAD */}
        <section id="download" className="py-16 bg-emerald-50/40">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="font-display font-bold text-3xl md:text-4xl">Descarcă aplicația retuvo</h2>
            <p className="text-emerald-900/70 mt-3">Disponibilă gratuit pentru iOS și Android</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button className="inline-flex items-center justify-center gap-2 bg-black text-white rounded-2xl px-6 py-3.5 font-semibold">
                <Smartphone className="size-5" /> App Store
              </button>
              <button className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-2xl px-6 py-3.5 font-semibold hover:bg-emerald-600">
                <Smartphone className="size-5" /> Google Play
              </button>
            </div>
          </div>
        </section>
      </div>
    </DemoFrame>
  );
};

export default RetuvoDemo;
