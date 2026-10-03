export const AVY_PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
export const AVY_PROMPT_DELAY_MS = 24_000;

const PAGE_INTENTS = [
  { match: /website|site|prodotti|produkte|produits|produkty/i, words: /site|website|produs|product|produkt|produit/i },
  { match: /produse|products/i, words: /produs|product|component/i },
  { match: /servicii|services/i, words: /estim|ofert|quote|service|servici/i },
] as const;

export function normalizePromptList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const prompts = [...new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 120))]
    .slice(0, 8);
  return prompts.length > 0 ? prompts : [...fallback];
}

export function selectProactivePrompt(prompts: readonly string[], pathname: string): string | null {
  if (prompts.length === 0) return null;
  const intent = PAGE_INTENTS.find(({ match }) => match.test(pathname));
  if (intent) {
    const matched = prompts.find((prompt) => intent.words.test(prompt));
    if (matched) return matched;
  }
  const stableIndex = [...pathname].reduce((sum, character) => sum + character.charCodeAt(0), 0) % prompts.length;
  return prompts[stableIndex] ?? prompts[0];
}

export function canShowProactivePrompt(lastShown: number | null, now = Date.now()): boolean {
  return lastShown === null || !Number.isFinite(lastShown) || now - lastShown >= AVY_PROMPT_COOLDOWN_MS;
}
