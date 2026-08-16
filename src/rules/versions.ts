import path from "node:path";

import type { Finding, WorkspaceFile } from "../types";

function packageVersion(files: WorkspaceFile[]): string | undefined {
  const manifest = files.find((file) => file.path === "package.json");
  if (!manifest) return undefined;
  try {
    const version = JSON.parse(manifest.content).version;
    return typeof version === "string" ? version : undefined;
  } catch {
    return undefined;
  }
}

function pythonVersion(
  files: WorkspaceFile[],
): { version: string; line: number } | undefined {
  const manifest = files.find((file) => file.path === "pyproject.toml");
  if (!manifest) return undefined;
  const lines = manifest.content.split(/\r?\n/);
  let eligibleSection = false;
  for (let index = 0; index < lines.length; index += 1) {
    const section = lines[index].match(/^\s*\[([^\]]+)]/);
    if (section)
      eligibleSection =
        section[1] === "project" || section[1] === "tool.poetry";
    if (!eligibleSection) continue;
    const match = lines[index].match(
      /^\s*version\s*=\s*["'](\d+\.\d+\.\d+)["']/,
    );
    if (match) return { version: match[1], line: index + 1 };
  }
  return undefined;
}

export function checkVersionDrift(files: WorkspaceFile[]): Finding[] {
  const findings: Finding[] = [];
  const nodeVersion = packageVersion(files);
  const pyVersion = pythonVersion(files);

  if (nodeVersion && pyVersion && nodeVersion !== pyVersion.version) {
    findings.push({
      rule: "version-drift",
      severity: "warning",
      file: "pyproject.toml",
      line: pyVersion.line,
      message: `Root manifests disagree: package.json is ${nodeVersion}, pyproject.toml is ${pyVersion.version}.`,
      evidence: `package.json=${nodeVersion}; pyproject.toml=${pyVersion.version}`,
      suggestion:
        "Align the versions or disable the version rule when the manifests describe separate packages.",
    });
  }

  const canonical = nodeVersion ?? pyVersion?.version;
  if (!canonical) return findings;

  const explicitVersion =
    /\b(?:(?:current|package|project|action)\s+)?version\s*(?:is|:|=)\s*["']?v?(\d+\.\d+\.\d+)/i;
  for (const file of files.filter((candidate) =>
    /\.(?:md|mdx)$/i.test(candidate.path),
  )) {
    const name = path.posix.basename(file.path).toLowerCase();
    if (name.startsWith("changelog") || name.startsWith("release")) continue;
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(explicitVersion);
      if (!match || match[1] === canonical) return;
      findings.push({
        rule: "version-drift",
        severity: "warning",
        file: file.path,
        line: index + 1,
        message: `Documented version ${match[1]} differs from manifest version ${canonical}.`,
        evidence: line.trim(),
        suggestion: `Update the documentation to ${canonical} or identify a different version source.`,
      });
    });
  }

  return findings;
}
