import type { Finding, ScanResult } from "./types";

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderMarkdown(result: ScanResult): string {
  const errors = result.findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const warnings = result.findings.length - errors;
  const lines = [
    "# TruthSync report",
    "",
    `Scanned **${result.filesScanned} files** with **${result.rulesRun.length} rules**.`,
    "",
    `- Errors: **${errors}**`,
    `- Warnings: **${warnings}**`,
    "",
  ];

  if (result.findings.length === 0) {
    lines.push("✅ No documentation drift detected.");
    return lines.join("\n");
  }

  lines.push(
    "| Severity | Rule | Location | Finding |",
    "| --- | --- | --- | --- |",
  );
  for (const finding of result.findings) {
    lines.push(
      `| ${finding.severity} | ${finding.rule} | ${finding.file}:${finding.line} | ${escapeCell(finding.message)} |`,
    );
  }
  lines.push(
    "",
    "TruthSync reports evidence; maintainers decide whether the source or the prose is wrong.",
  );
  return lines.join("\n");
}

export function shouldFail(
  findings: Finding[],
  failOn: "error" | "warning" | "never",
): boolean {
  if (failOn === "never") return false;
  if (failOn === "warning") return findings.length > 0;
  return findings.some((finding) => finding.severity === "error");
}
