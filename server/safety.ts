const crisisPatterns = [
  /\b(kill myself|end my life|suicide|self[-\s]?harm|hurt myself)\b/i,
  /\b(overdose|od|poisoned|can't breathe|chest pain|seizure)\b/i,
  /\b(severe withdrawal|withdrawal seizure|delirium tremens|dt's|hallucinating)\b/i,
  /\b(emergency|immediate danger|unsafe right now)\b/i
];

export function detectSafetyRisk(text: string): { flagged: boolean; reason?: string } {
  const normalized = text.trim();
  if (!normalized) return { flagged: false };

  const matched = crisisPatterns.find((pattern) => pattern.test(normalized));
  return matched ? { flagged: true, reason: matched.source } : { flagged: false };
}

export const safetyResponse =
  "This sounds like it may need immediate professional support. UrgeWise is not medical care or emergency help. If you may be in danger, facing severe withdrawal, overdose symptoms, or self-harm urges, contact local emergency services or a qualified crisis/medical professional now.";
