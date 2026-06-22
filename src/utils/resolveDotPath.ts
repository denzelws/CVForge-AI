export type DotPathResolution = {
  found: boolean;
  value?: unknown;
};

export function resolveDotPath(source: unknown, path: string): DotPathResolution {
  if (path.length === 0) {
    return { found: false };
  }

  const segments = path.split(".");
  let current = source;

  for (const segment of segments) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object" ||
      !(segment in current)
    ) {
      return { found: false };
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return { found: true, value: current };
}
