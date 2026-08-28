// Site keys are public by design. The environment override keeps local/staging
// builds flexible, while the production fallback ensures Cloudflare and Lovable
// builds cannot silently ship without the anti-spam widget.
export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || "0x4AAAAAAEZlUK1pwab2LeY_";
