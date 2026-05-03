/**
 * Deterministic, dependency-free ID generator using a djb2-style string hash.
 * Produces a base36 string suitable for stable file/source/feature/unit IDs.
 */
export function generateId(input: string): string {
  let hash = 0;
  for (const char of input) {
    const code = char.charCodeAt(0);
    hash = ((hash << 5) - hash + code) | 0;
  }
  return Math.abs(hash).toString(36);
}
