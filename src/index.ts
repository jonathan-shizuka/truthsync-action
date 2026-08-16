import fs from "node:fs";
import path from "node:path";

import * as core from "@actions/core";

import { loadConfig } from "./config";
import { renderMarkdown, shouldFail } from "./report";
import { scan } from "./scanner";
import type { FailOn } from "./types";
import { readWorkspace } from "./workspace";

function inputFailOn(value: string, fallback: FailOn): FailOn {
  return value === "error" || value === "warning" || value === "never"
    ? value
    : fallback;
}

export async function run(): Promise<void> {
  try {
    const root = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const configPath = core.getInput("config") || ".truthsync.yml";
    const config = loadConfig(root, configPath);
    const failOn = inputFailOn(core.getInput("fail-on"), config.failOn);
    const files = readWorkspace(root, config);
    const result = scan(files, config);

    for (const finding of result.findings) {
      const properties = {
        file: finding.file,
        startLine: finding.line,
        title: finding.rule,
      };
      const detail = `${finding.message} Evidence: ${finding.evidence} Suggestion: ${finding.suggestion}`;
      if (finding.severity === "error") core.error(detail, properties);
      else core.warning(detail, properties);
    }

    const reportPath = path.join(root, ".truthsync-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
    await core.summary.addRaw(renderMarkdown(result)).write();

    const errors = result.findings.filter(
      (finding) => finding.severity === "error",
    ).length;
    core.setOutput("findings-count", result.findings.length);
    core.setOutput("errors-count", errors);
    core.setOutput("warnings-count", result.findings.length - errors);
    core.setOutput("report-path", reportPath);

    if (shouldFail(result.findings, failOn)) {
      core.setFailed(
        `TruthSync found ${result.findings.length} documentation drift issue(s).`,
      );
    } else {
      core.info(
        `TruthSync scanned ${result.filesScanned} files and found ${result.findings.length} issue(s).`,
      );
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

void run();
