import { describe, expect, it } from "vitest";

import { checkVersionDrift } from "../src/rules/versions";

describe("version drift", () => {
  it("finds stale explicit documentation versions", () => {
    const findings = checkVersionDrift([
      { path: "package.json", content: JSON.stringify({ version: "2.1.0" }) },
      { path: "README.md", content: "Current version: 1.9.0" },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("2.1.0");
  });

  it("ignores changelog versions", () => {
    const findings = checkVersionDrift([
      { path: "package.json", content: JSON.stringify({ version: "2.1.0" }) },
      { path: "CHANGELOG.md", content: "Version: 1.9.0" },
    ]);

    expect(findings).toHaveLength(0);
  });
});
