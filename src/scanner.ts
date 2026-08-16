import { checkCommandDrift } from "./rules/commands";
import { checkStatusDrift } from "./rules/status";
import { checkVersionDrift } from "./rules/versions";
import type { ScanResult, TruthSyncConfig, WorkspaceFile } from "./types";

export function scan(
  files: WorkspaceFile[],
  config: TruthSyncConfig,
): ScanResult {
  const findings = [];
  const rulesRun: string[] = [];

  if (config.rules.status) {
    rulesRun.push("status-drift");
    findings.push(...checkStatusDrift(files));
  }
  if (config.rules.commands) {
    rulesRun.push("command-drift");
    findings.push(...checkCommandDrift(files, config.pythonTools));
  }
  if (config.rules.versions) {
    rulesRun.push("version-drift");
    findings.push(...checkVersionDrift(files));
  }

  return {
    findings: findings.sort((left, right) =>
      `${left.file}:${left.line}:${left.rule}`.localeCompare(
        `${right.file}:${right.line}:${right.rule}`,
      ),
    ),
    filesScanned: files.length,
    rulesRun,
  };
}
