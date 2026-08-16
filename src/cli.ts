#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "./config";
import { renderMarkdown, shouldFail } from "./report";
import { scan } from "./scanner";
import type { FailOn } from "./types";
import { readWorkspace } from "./workspace";

function valueAfter(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = path.resolve(valueAfter("--path") ?? process.cwd());
const configPath = valueAfter("--config") ?? ".truthsync.yml";
const config = loadConfig(root, configPath);
const requestedFailOn = valueAfter("--fail-on");
const failOn: FailOn =
  requestedFailOn === "error" ||
  requestedFailOn === "warning" ||
  requestedFailOn === "never"
    ? requestedFailOn
    : config.failOn;

const result = scan(readWorkspace(root, config), config);
const jsonPath = path.join(root, ".truthsync-report.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${renderMarkdown(result)}\n`);
process.exitCode = shouldFail(result.findings, failOn) ? 1 : 0;
