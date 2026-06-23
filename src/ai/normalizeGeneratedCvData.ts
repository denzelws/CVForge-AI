function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyCertification(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const name = value.name ?? value.title ?? value.value;
  const issuer = value.issuer;
  const year = value.year;

  return [name, issuer, year].filter((part) => typeof part === "string" && part.length > 0).join(" - ");
}

function stringifyLanguage(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const language = value.language ?? value.name;
  const level = value.level ?? value.proficiency;

  return [language, level].filter((part) => typeof part === "string" && part.length > 0).join(" — ");
}

export function normalizeGeneratedCvData(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const normalized: Record<string, unknown> = { ...value };

  if (isRecord(normalized.education)) {
    normalized.education = [normalized.education];
  }

  if (Array.isArray(normalized.certifications)) {
    normalized.certifications = normalized.certifications.map(stringifyCertification);
  }

  if (Array.isArray(normalized.languages)) {
    normalized.languages = normalized.languages.map(stringifyLanguage);
  }

  return normalized;
}
