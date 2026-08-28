/**
 * Canonical public profiles used by navigation and Schema.org `sameAs`.
 * Keep only profiles with a real destination; placeholders weaken entity signals
 * and create dead links for visitors and crawlers.
 */
export const SOCIAL_PROFILES = [
  {
    id: "instagram",
    name: "Instagram",
    handle: "@avyrontech",
    url: "https://www.instagram.com/avyrontech/",
  },
  {
    id: "facebook",
    name: "Facebook",
    handle: "Avyron Dev",
    url: "https://www.facebook.com/people/Avyron-Dev/61560319432764/",
  },
  {
    id: "tiktok",
    name: "TikTok",
    handle: "@avyron4",
    url: "https://www.tiktok.com/@avyron4",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    handle: "Avyron Solutions",
    url: "https://www.linkedin.com/in/avyron-solutions-757595406",
  },
] as const;

export const SOCIAL_PROFILE_URLS = SOCIAL_PROFILES.map((profile) => profile.url);

export function socialProfile(id: (typeof SOCIAL_PROFILES)[number]["id"]) {
  return SOCIAL_PROFILES.find((profile) => profile.id === id)!;
}
