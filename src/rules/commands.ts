import path from "node:path";

import type { Finding, WorkspaceFile } from "../types";

interface ScriptReference {
  manager: "npm" | "pnpm" | "yarn";
  script: string;
}

function packageScripts(files: WorkspaceFile[]): Set<string> | undefined {
  const manifest = files.find((file) => file.path === "package.json");
  if (!manifest) return undefined;
  try {
    const parsed = JSON.parse(manifest.content);
    return new Set(Object.keys(parsed.scripts ?? {}));
  } catch {
    return undefined;
  }
}

function scriptReferences(line: string): ScriptReference[] {
  const references: ScriptReference[] = [];
  const patterns: Array<[ScriptReference["manager"], RegExp]> = [
    ["npm", /\bnpm\s+run\s+([\w:@-]+)/g],
    ["pnpm", /\bpnpm\s+(?:run\s+)?([\w:@-]+)/g],
    ["yarn", /\byarn\s+(?:run\s+)?([\w:@-]+)/g],
  ];

  for (const [manager, pattern] of patterns) {
    for (const match of line.matchAll(pattern)) {
      references.push({ manager, script: match[1] });
    }
  }
  return references;
}

function manifestCorpus(files: WorkspaceFile[]): string {
  return files
    .filter((file) =>
      /(?:^|\/)(?:pyproject\.toml|requirements[^/]*\.txt|uv\.lock|poetry\.lock|tox\.ini)$/i.test(
        file.path,
      ),
    )
    .map((file) => file.content.toLowerCase())
    .join("\n");
}

function isDocumentation(file: WorkspaceFile): boolean {
  const name = path.posix.basename(file.path).toLowerCase();
  return (
    /\.(?:md|mdx)$/i.test(file.path) &&
    !name.startsWith("changelog") &&
    !name.startsWith("release")
  );
}

function commandSnippets(line: string, inCommandFence: boolean): string[] {
  const snippets = [...line.matchAll(/`([^`]+)`/g)].map((match) =>
    match[1].trim(),
  );
  const trimmed = line.trim().replace(/^(?:\$|>)\s+/, "");
  if (inCommandFence || /^(?:\$|>)\s+/.test(line.trim()))
    snippets.push(trimmed);
  return snippets;
}

export function checkCommandDrift(
  files: WorkspaceFile[],
  pythonTools: string[],
): Finding[] {
  const findings: Finding[] = [];
  const scripts = packageScripts(files);
  const manifests = manifestCorpus(files);

  for (const file of files.filter(isDocumentation)) {
    const lines = file.content.split(/\r?\n/);
    let insideFence = false;
    let inCommandFence = false;
    lines.forEach((line, index) => {
      const fence = line.trim().match(/^```\s*([\w-]*)/);
      if (fence) {
        if (insideFence) {
          insideFence = false;
          inCommandFence = false;
        } else {
          insideFence = true;
          inCommandFence = /^(?:|bash|sh|shell|console|powershell|ps1)$/i.test(
            fence[1],
          );
        }
        return;
      }

      for (const reference of scriptReferences(line)) {
        if (scripts?.has(reference.script)) continue;
        findings.push({
          rule: "command-drift",
          severity: "warning",
          file: file.path,
          line: index + 1,
          message: `${reference.manager} script '${reference.script}' is documented but missing from package.json.`,
          evidence: line.trim(),
          suggestion: `Add the '${reference.script}' script or update the documented command.`,
        });
      }

      for (const tool of pythonTools) {
        const command = new RegExp(`^${tool}(?=\\s|$)`, "i");
        const install = new RegExp(
          `(?:pip|pipx|uv\\s+tool)\\s+install[^\\n]*\\b${tool}\\b`,
          "i",
        );
        const snippets = commandSnippets(line, inCommandFence);
        if (
          !snippets.some((snippet) => command.test(snippet)) ||
          install.test(line)
        )
          continue;
        if (new RegExp(`\\b${tool}\\b`, "i").test(manifests)) continue;

        findings.push({
          rule: "command-drift",
          severity: "warning",
          file: file.path,
          line: index + 1,
          message: `Python tool '${tool}' is documented but not declared in a project manifest.`,
          evidence: line.trim(),
          suggestion: `Declare '${tool}' as a development dependency or remove the stale command.`,
        });
      }
    });
  }

  const unique = new Map<string, Finding>();
  for (const finding of findings) {
    unique.set(
      `${finding.rule}:${finding.file}:${finding.line}:${finding.message}`,
      finding,
    );
  }
  return [...unique.values()];
}
