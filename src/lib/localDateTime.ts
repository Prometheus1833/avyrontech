export type SiteLanguage = "ro" | "en";

const cityNames: Record<string, Record<SiteLanguage, string>> = {
  Bucharest: { ro: "București", en: "Bucharest" },
};

const getTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const formatLocalDateTime = (date: Date, lang: SiteLanguage, timeZone = getTimeZone()) => {
  const locale = lang === "ro" ? "ro-RO" : "en-GB";
  const timeZoneParts = timeZone.split("/");
  const rawCity = timeZone === "UTC" || timeZone.startsWith("Etc/")
    ? "UTC"
    : (timeZoneParts[timeZoneParts.length - 1] || timeZone).replace(/_/g, " ");

  return {
    date: new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone,
    }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(date),
    city: cityNames[rawCity]?.[lang] || rawCity,
    timeZone,
  };
};
