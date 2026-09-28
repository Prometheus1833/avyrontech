import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const SCRIPTS = {
  ro: [
    { from: "client", text: "Bună! Aveți disponibil pentru sâmbătă dimineață?" },
    { from: "agent", text: "Bună! Da, sâmbătă avem liber la 9:30 și la 11:00. Care vă convine?" },
    { from: "client", text: "11:00. Cât durează?" },
    { from: "agent", text: "Aproximativ 45 de minute. V-am rezervat 11:00 și v-am trimis confirmarea pe email." },
  ],
  en: [
    { from: "client", text: "Hi! Do you have anything free on Saturday morning?" },
    { from: "agent", text: "Hi! Yes, Saturday is open at 9:30 and at 11:00. Which suits you?" },
    { from: "client", text: "11:00. How long does it take?" },
    { from: "agent", text: "About 45 minutes. I have booked 11:00 and sent the confirmation to your email." },
  ],
};

/**
 * AIA-F1 — bulă de chat cu streaming.
 *
 * Textul curge cuvânt cu cuvânt, cu indicator de tastare înainte. Diferența
 * față de un răspuns care apare dintr-o dată e enormă: percepția de latență
 * scade, chiar dacă timpul total e identic.
 */
export default function ChatStream() {
  const { lang } = useLang();
  const [visible, setVisible] = useState<Array<{ from: string; text: string }>>([]);
  const [typing, setTyping] = useState(false);
  const [partial, setPartial] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const script = SCRIPTS[lang];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(script);
      return;
    }

    let cancelled = false;

    const play = async () => {
      for (const line of script) {
        if (cancelled) return;
        if (line.from === "agent") {
          setTyping(true);
          await new Promise((resolve) => timers.current.push(window.setTimeout(resolve, 900)));
          if (cancelled) return;
          setTyping(false);

          const words = line.text.split(" ");
          for (let i = 0; i < words.length; i++) {
            if (cancelled) return;
            setPartial(words.slice(0, i + 1).join(" "));
            await new Promise((resolve) => timers.current.push(window.setTimeout(resolve, 55)));
          }
          setPartial("");
          setVisible((prev) => [...prev, line]);
        } else {
          await new Promise((resolve) => timers.current.push(window.setTimeout(resolve, 700)));
          if (cancelled) return;
          setVisible((prev) => [...prev, line]);
        }
      }
    };

    void play();
    return () => {
      cancelled = true;
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, [lang]);

  return (
    <div className="flex min-h-[280px] flex-col justify-end gap-2 p-6">
      {visible.map((line, index) => (
        <div
          key={index}
          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
            line.from === "agent"
              ? "self-start rounded-bl-sm bg-emerald-400/15 text-emerald-50"
              : "self-end rounded-br-sm bg-white/10 text-white/85"
          }`}
        >
          {line.text}
        </div>
      ))}

      {partial && (
        <div className="max-w-[80%] self-start rounded-2xl rounded-bl-sm bg-emerald-400/15 px-3.5 py-2 text-sm text-emerald-50">
          {partial}
          <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-emerald-200 align-middle" />
        </div>
      )}

      {typing && (
        <div className="flex w-14 justify-center gap-1 self-start rounded-2xl rounded-bl-sm bg-emerald-400/15 px-3 py-2.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-emerald-200/80"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
