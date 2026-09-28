import GlassLogin from "../source/GlassLogin";
import type { DemoProps } from "./registry";

export default function LoginGlassDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden p-4">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(70% 60% at 25% 20%, #4c1d95, transparent 60%), radial-gradient(60% 60% at 80% 80%, #0e7490, transparent 60%), #070a12" }}
      />
      <GlassLogin
        title={ro ? "Intră în contul Avyron" : "Sign in to Avyron"}
        labels={ro ? undefined : { email: "Email", password: "Password", remember: "Remember me", submit: "Continue", forgot: "Forgot password?", show: "Show password", hide: "Hide password" }}
        onSubmit={() => new Promise((resolve) => window.setTimeout(resolve, 900))}
      />
    </div>
  );
}
