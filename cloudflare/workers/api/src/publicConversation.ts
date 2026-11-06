const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function simpleConversationReply(
  message: string,
  language: string,
): string | null {
  const text = normalized(message),
    en = language === "en";
  if (
    /^(salut|buna|buna ziua|buna seara|buna dimineata|hello|hi|hey|good morning|good evening)$/.test(
      text,
    )
  )
    return en
      ? "Hello! What would you like to talk about or work on?"
      : "Bună! Despre ce ai vrea să discutăm sau cu ce te pot ajuta?";
  if (
    /^(multumesc|multumesc mult|mersi|merci|thanks|thank you|thank you very much)( frumos)?$/.test(
      text,
    )
  )
    return en
      ? "You're welcome! Let me know if you'd like to explore anything further."
      : "Cu plăcere! Spune-mi dacă vrei să aprofundăm ceva.";
  if (/^(la revedere|pe curand|bye|goodbye|see you)$/.test(text))
    return en
      ? "Goodbye! You can come back whenever you need help."
      : "Pe curând! Poți reveni când ai nevoie de ajutor.";
  return null;
}
export function isConversationFollowup(message: string) {
  const text = normalized(message);
  return (
    /^(si |dar |and |what about |how about |de ce|why|explica|explain|mai |detaliaza|cum |how |cat costa|how much|ce inseamna|what does)/.test(
      text,
    ) || /\b(asta|acesta|aceasta|that|it|same|acelasi)\b/.test(text)
  );
}
export function isAvyronBusinessQuestion(message: string) {
  return /\b(avyron|oferta|deviz|abonament|factura|facturare|contract|contact|serviciile voastre|preturile voastre|oferiti|aveti|your services|your prices|quotation)\b/.test(
    normalized(message),
  );
}
export function unavailableConversationReply(
  language: string,
  business: boolean,
) {
  if (business)
    return language === "en"
      ? "I don't have an approved answer for that AVYRON detail yet. The team can confirm it through the contact form or WhatsApp at +40 734 605 055."
      : "Nu am încă o informație aprobată pentru acest detaliu AVYRON. Echipa îl poate confirma prin formularul de contact sau pe WhatsApp la +40 734 605 055.";
  return language === "en"
    ? "The general conversation model is currently unavailable. I can still help with verified AVYRON information; you can retry this topic later."
    : "Modulul de conversație generală este momentan indisponibil. Pot răspunde în continuare din informațiile AVYRON verificate; poți reveni ulterior cu acest subiect.";
}
