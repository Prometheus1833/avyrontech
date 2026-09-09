import type { CategoryTheme } from "@/data/subscriptionPlans";
import ParticleLayer from "./ParticleLayer";

type Props = { theme: CategoryTheme };

/**
 * Fiecare tip de serviciu are propriul fundal: grilă pentru site, rafturi
 * pentru magazin, coloane editoriale pentru blog, rețea de noduri pentru
 * agentul AI și cadre de dispozitiv pentru aplicații. Totul e desenat cu
 * gradienți și SVG inline, ca să nu coste nicio cerere în plus.
 */
const SectionBackdrop = ({ theme }: Props) => {
  const hue = theme.hue;
  const soft = `hsl(${hue} / 0.12)`;
  const line = `hsl(${hue} / 0.16)`;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70rem 32rem at 50% -10%, hsl(${hue} / 0.14), transparent 65%)`,
        }}
      />

      <ParticleLayer hue={hue} />

      {theme.backdrop === "grid" && (
        <>
          <div
            className="avyron-backdrop-drift absolute -inset-24 opacity-60"
            style={{
              backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at 50% 25%, black 20%, transparent 72%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 25%, black 20%, transparent 72%)",
            }}
          />
          <svg className="absolute left-1/2 top-8 size-[38rem] -translate-x-1/2 opacity-40" viewBox="0 0 400 400" fill="none">
            <ellipse cx="200" cy="200" rx="190" ry="64" stroke={line} />
            <ellipse cx="200" cy="200" rx="150" ry="50" stroke={soft} />
            <ellipse cx="200" cy="200" rx="104" ry="34" stroke={soft} />
          </svg>
        </>
      )}

      {theme.backdrop === "shelf" && (
        <>
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: `repeating-linear-gradient(180deg, transparent 0 118px, ${line} 118px 119px)`,
              maskImage: "linear-gradient(180deg, transparent, black 22%, black 78%, transparent)",
              WebkitMaskImage: "linear-gradient(180deg, transparent, black 22%, black 78%, transparent)",
            }}
          />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent 0 172px, ${soft} 172px 173px)`,
              maskImage: "linear-gradient(90deg, transparent, black 30%, black 70%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 30%, black 70%, transparent)",
            }}
          />
          <div
            className="avyron-backdrop-pulse absolute -bottom-24 -left-16 size-80 rounded-full blur-3xl"
            style={{ background: `hsl(${hue} / 0.16)` }}
          />
        </>
      )}

      {theme.backdrop === "editorial" && (
        <>
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent 0 15.5rem, ${line} 15.5rem 15.55rem)`,
              maskImage: "linear-gradient(180deg, transparent, black 18%, black 82%, transparent)",
              WebkitMaskImage: "linear-gradient(180deg, transparent, black 18%, black 82%, transparent)",
            }}
          />
          <div
            className="absolute inset-x-0 top-0 h-40 opacity-70"
            style={{
              backgroundImage: `repeating-linear-gradient(180deg, ${soft} 0 1px, transparent 1px 11px)`,
              maskImage: "linear-gradient(180deg, black, transparent)",
              WebkitMaskImage: "linear-gradient(180deg, black, transparent)",
            }}
          />
          <span
            className="absolute -left-4 top-10 select-none font-display text-[16rem] leading-none opacity-[0.07]"
            style={{ color: `hsl(${hue})`, fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            &ldquo;
          </span>
        </>
      )}

      {theme.backdrop === "neural" && (
        <svg className="absolute inset-0 size-full opacity-70" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 400" fill="none">
          <g stroke={line}>
            <path d="M60 90 L180 150 L300 96 L430 168 L540 110" />
            <path d="M80 250 L200 200 L318 268 L440 214 L556 262" />
            <path d="M180 150 L200 200" />
            <path d="M300 96 L318 268" />
            <path d="M430 168 L440 214" />
            <path d="M60 90 L80 250" />
          </g>
          {[
            [60, 90], [180, 150], [300, 96], [430, 168], [540, 110],
            [80, 250], [200, 200], [318, 268], [440, 214], [556, 262],
          ].map(([cx, cy], index) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={index % 3 === 0 ? 4.5 : 3}
              fill={`hsl(${hue} / 0.55)`}
              className="avyron-backdrop-pulse"
              style={{ animationDelay: `${index * 320}ms` }}
            />
          ))}
        </svg>
      )}

      {theme.backdrop === "device" && (
        <>
          <div
            className="absolute inset-0 opacity-55"
            style={{
              backgroundImage: `radial-gradient(${line} 1px, transparent 1px)`,
              backgroundSize: "22px 22px",
              maskImage: "radial-gradient(ellipse at 50% 30%, black 15%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 15%, transparent 70%)",
            }}
          />
          <svg className="absolute right-6 top-10 hidden h-64 w-80 opacity-50 md:block" viewBox="0 0 320 260" fill="none">
            <rect x="8" y="18" width="212" height="150" rx="12" stroke={line} />
            <path d="M8 46 H220" stroke={soft} />
            <circle cx="26" cy="32" r="3" fill={`hsl(${hue} / 0.45)`} />
            <circle cx="38" cy="32" r="3" fill={`hsl(${hue} / 0.3)`} />
            <rect x="222" y="72" width="84" height="164" rx="16" stroke={line} />
            <path d="M252 84 H276" stroke={soft} strokeLinecap="round" />
          </svg>
        </>
      )}
    </div>
  );
};

export default SectionBackdrop;
