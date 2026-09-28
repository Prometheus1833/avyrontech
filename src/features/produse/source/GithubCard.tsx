import { useEffect, useState } from "react";

/**
 * GithubCard — Avyron Products (avyron.ro/produse)
 * Cardul unui depozit public, din API-ul GitHub fără autentificare
 * (`https://api.github.com/repos/{owner}/{repo}`). Bun pentru portofolii și
 * pagini de produs open-source. API-ul neautentificat are ~60 de cereri pe oră
 * per IP, deci răspunsul se ține în `sessionStorage` cât ține sesiunea.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

type Repo = { full_name: string; description: string | null; stargazers_count: number; forks_count: number; language: string | null; html_url: string };

export function GithubCard({ owner, repo }: { owner: string; repo: string }) {
  const [data, setData] = useState<Repo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = `gh:${owner}/${repo}`;
    try {
      const cached = window.sessionStorage.getItem(key);
      if (cached) {
        setData(JSON.parse(cached) as Repo);
        return;
      }
    } catch {
      /* sesiune fără storage: cerem normal */
    }
    const controller = new AbortController();
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { signal: controller.signal, headers: { accept: "application/vnd.github+json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(response.status === 403 ? "limită atinsă" : String(response.status)))))
      .then((json: Repo) => {
        setData(json);
        try {
          window.sessionStorage.setItem(key, JSON.stringify(json));
        } catch {
          /* nimic de păstrat */
        }
      })
      .catch((reason: Error) => !controller.signal.aborted && setError(reason.message));
    return () => controller.abort();
  }, [owner, repo]);

  if (error) return <p style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>GitHub nu a răspuns ({error}).</p>;
  if (!data) return <p style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>Se încarcă depozitul…</p>;

  return (
    <a
      href={data.html_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "grid",
        gap: 6,
        width: "100%",
        padding: ".8rem .9rem",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(255,255,255,.04)",
        color: "#fff",
        textDecoration: "none",
      }}
    >
      <strong style={{ fontSize: 13.5 }}>{data.full_name}</strong>
      {data.description && <span style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,.65)" }}>{data.description}</span>}
      <span style={{ display: "flex", gap: 12, fontSize: 11.5, color: "rgba(255,255,255,.55)" }}>
        <span>★ {data.stargazers_count.toLocaleString("ro-RO")}</span>
        <span>⑂ {data.forks_count.toLocaleString("ro-RO")}</span>
        {data.language && <span>{data.language}</span>}
      </span>
    </a>
  );
}

export default GithubCard;
