export type Severity = "error" | "warning";
export type FailOn = Severity | "never";

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface Finding {
  rule: "status-drift" | "command-drift" | "version-drift";
  severity: Severity;
  file: string;
  line: number;
  message: string;
  evidence: string;
  suggestion: string;
}

export interface TruthSyncConfig {
  include: string[];
  exclude: string[];
  rules: {
    status: boolean;
    commands: boolean;
    versions: boolean;
  };
  failOn: FailOn;
  pythonTools: string[];
}

export interface ScanResult {
  findings: Finding[];
  filesScanned: number;
  rulesRun: string[];
}
