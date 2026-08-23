import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const apply = (mode: string) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : mode;
  root.classList.add(resolved);
  return resolved;
};

const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const [resolved, setResolved] = useState<string>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme") || "system";
    return saved === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : saved;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("theme") || "system") === "system") {
        setResolved(apply("system"));
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next = resolved === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    setResolved(apply(next));
  };

  return (
    <button
      onClick={toggle}
      aria-label={resolved === "dark" ? "Activează tema luminoasă" : "Activează tema întunecată"}
      title={resolved === "dark" ? "Light" : "Dark"}
      className={`group size-6 grid place-items-center rounded-full bg-muted/70 text-foreground transition-all duration-200 ease-out hover:bg-muted hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {resolved === "dark" ? <Sun className="size-3 transition-transform duration-300 ease-out group-hover:rotate-45" aria-hidden="true" focusable="false" /> : <Moon className="size-3 transition-transform duration-300 ease-out group-hover:-rotate-12" aria-hidden="true" focusable="false" />}
    </button>
  );
};

export default ThemeToggle;
