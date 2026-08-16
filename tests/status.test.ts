import { describe, expect, it } from "vitest";

import { checkStatusDrift } from "../src/rules/status";

describe("status drift", () => {
  it("finds prose that contradicts a live structured status", () => {
    const findings = checkStatusDrift([
      {
        path: "catalog.yml",
        content: `entries:\n  - id: article-73\n    status: live\n    notes: >-\n      Status is draft on this authoring pass.\n`,
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "status-drift",
      severity: "error",
      file: "catalog.yml",
      line: 5,
    });
  });

  it("does not flag historical use of the word draft", () => {
    const findings = checkStatusDrift([
      {
        path: "catalog.yml",
        content: `status: live\nnotes: Promoted from the 2025 draft after review.\n`,
      },
    ]);

    expect(findings).toHaveLength(0);
  });
});
