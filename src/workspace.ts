import fs from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";

import type { TruthSyncConfig, WorkspaceFile } from "./types";

const MAX_FILE_BYTES = 1024 * 1024;

function normalize(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function walk(root: string, current: string, files: string[]): void {
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(current, entry.name);
    const relative = normalize(path.relative(root, absolute));

    if (entry.isDirectory()) {
      if (
        [".git", "node_modules", "dist", "build", "coverage"].includes(
          entry.name,
        )
      ) {
        continue;
      }
      walk(root, absolute, files);
      continue;
    }

    if (entry.isFile()) files.push(relative);
  }
}

export function readWorkspace(
  root: string,
  config: TruthSyncConfig,
): WorkspaceFile[] {
  const candidates: string[] = [];
  walk(root, root, candidates);

  return candidates
    .filter((file) =>
      config.include.some((pattern) => minimatch(file, pattern, { dot: true })),
    )
    .filter(
      (file) =>
        !config.exclude.some((pattern) =>
          minimatch(file, pattern, { dot: true }),
        ),
    )
    .flatMap((file) => {
      const absolute = path.join(root, file);
      if (fs.statSync(absolute).size > MAX_FILE_BYTES) return [];
      return [{ path: file, content: fs.readFileSync(absolute, "utf8") }];
    });
}
