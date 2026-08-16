import type { Finding, WorkspaceFile } from "../types";

const STATUS_LINE =
  /^(\s*)["']?(?:status|state)["']?\s*[:=]\s*["']?(live|stable|draft|deprecated|experimental)["']?/i;

const CONTRADICTIONS: Record<string, RegExp[]> = {
  live: [
    /\b(?:status|state)\s+(?:is|remains|currently)\s+(?:a\s+)?(?:draft|experimental)\b/i,
    /\b(?:still|currently)\s+(?:a\s+)?draft\b/i,
  ],
  stable: [
    /\b(?:status|state)\s+(?:is|remains|currently)\s+(?:a\s+)?(?:draft|experimental)\b/i,
    /\b(?:still|currently)\s+(?:a\s+)?draft\b/i,
  ],
  draft: [
    /\b(?:status|state)\s+(?:is|remains|currently)\s+(?:live|stable|production[- ]ready)\b/i,
  ],
  experimental: [
    /\b(?:status|state)\s+(?:is|remains|currently)\s+(?:live|stable|production[- ]ready)\b/i,
  ],
  deprecated: [
    /\b(?:status|state)\s+(?:is|remains|currently)\s+(?:live|stable|supported)\b/i,
  ],
};

function indentation(line: string): number {
  const whitespace = line.match(/^\s*/)?.[0] ?? "";
  return [...whitespace].reduce(
    (size, character) => size + (character === "\t" ? 2 : 1),
    0,
  );
}

function blockEnd(
  lines: string[],
  statusLine: number,
  statusIndent: number,
): number {
  const ownerIndent = Math.max(0, statusIndent - 2);
  for (let index = statusLine + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//"))
      continue;
    if (indentation(lines[index]) <= ownerIndent) return index;
  }
  return lines.length;
}

export function checkStatusDrift(files: WorkspaceFile[]): Finding[] {
  const findings: Finding[] = [];
  const structured = files.filter((file) =>
    /\.(?:ya?ml|toml|json)$/i.test(file.path),
  );

  for (const file of structured) {
    const lines = file.content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(STATUS_LINE);
      if (!match) continue;

      const actual = match[2].toLowerCase();
      const end = blockEnd(lines, index, indentation(lines[index]));
      const patterns = CONTRADICTIONS[actual] ?? [];

      for (let candidate = index + 1; candidate < end; candidate += 1) {
        const contradiction = patterns.find((pattern) =>
          pattern.test(lines[candidate]),
        );
        if (!contradiction) continue;

        findings.push({
          rule: "status-drift",
          severity: "error",
          file: file.path,
          line: candidate + 1,
          message: `Documentation says something incompatible with status '${actual}'.`,
          evidence: lines[candidate].trim(),
          suggestion: `Update the prose or the structured status so '${actual}' has one source of truth.`,
        });
      }
    }
  }

  return findings;
}
