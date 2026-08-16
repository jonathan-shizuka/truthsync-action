import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/config";
import { scan } from "../src/scanner";

describe("scanner", () => {
  it("returns evidence from each enabled rule", () => {
    const result = scan(
      [
        {
          path: "package.json",
          content: JSON.stringify({ version: "1.0.0", scripts: {} }),
        },
        {
          path: "README.md",
          content: "Current version: 0.9.0\nRun `npm run verify`.",
        },
        {
          path: "catalog.yml",
          content:
            "entries:\n  - id: example\n    status: live\n    notes: Status is draft today.",
        },
      ],
      DEFAULT_CONFIG,
    );

    expect(new Set(result.findings.map((finding) => finding.rule))).toEqual(
      new Set(["status-drift", "command-drift", "version-drift"]),
    );
  });
});
