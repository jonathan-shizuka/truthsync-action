import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

import type { FailOn, TruthSyncConfig } from "./types";

export const DEFAULT_CONFIG: TruthSyncConfig = {
  include: ["**/*.{md,mdx,yml,yaml,json,toml}"],
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/.git/**",
  ],
  rules: {
    status: true,
    commands: true,
    versions: true,
  },
  failOn: "error",
  pythonTools: ["pytest", "ruff", "mypy", "pyright", "black", "isort"],
};

function isFailOn(value: unknown): value is FailOn {
  return value === "error" || value === "warning" || value === "never";
}

export function loadConfig(root: string, configPath: string): TruthSyncConfig {
  const absolute = path.resolve(root, configPath);
  if (!fs.existsSync(absolute)) {
    return structuredClone(DEFAULT_CONFIG);
  }

  const parsed = YAML.parse(fs.readFileSync(absolute, "utf8")) ?? {};
  const configuredFailOn = isFailOn(parsed.failOn)
    ? parsed.failOn
    : DEFAULT_CONFIG.failOn;

  return {
    include: Array.isArray(parsed.include)
      ? parsed.include.map(String)
      : [...DEFAULT_CONFIG.include],
    exclude: Array.isArray(parsed.exclude)
      ? [...DEFAULT_CONFIG.exclude, ...parsed.exclude.map(String)]
      : [...DEFAULT_CONFIG.exclude],
    rules: {
      status: parsed.rules?.status ?? DEFAULT_CONFIG.rules.status,
      commands: parsed.rules?.commands ?? DEFAULT_CONFIG.rules.commands,
      versions: parsed.rules?.versions ?? DEFAULT_CONFIG.rules.versions,
    },
    failOn: configuredFailOn,
    pythonTools: Array.isArray(parsed.pythonTools)
      ? parsed.pythonTools.map(String)
      : [...DEFAULT_CONFIG.pythonTools],
  };
}
