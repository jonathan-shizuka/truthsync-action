import { describe, expect, it } from "vitest";

import { checkCommandDrift } from "../src/rules/commands";

describe("command drift", () => {
  it("finds missing package scripts", () => {
    const findings = checkCommandDrift(
      [
        {
          path: "package.json",
          content: JSON.stringify({ scripts: { test: "vitest" } }),
        },
        {
          path: "CONTRIBUTING.md",
          content: "Run `npm run lint` before opening a PR.",
        },
      ],
      [],
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("lint");
  });

  it("accepts declared npm scripts and Python tools", () => {
    const findings = checkCommandDrift(
      [
        {
          path: "package.json",
          content: JSON.stringify({ scripts: { lint: "tsc" } }),
        },
        { path: "pyproject.toml", content: 'dependencies = ["pytest>=8"]' },
        {
          path: "CONTRIBUTING.md",
          content: "Run `npm run lint` and `pytest -q`.",
        },
      ],
      ["pytest"],
    );

    expect(findings).toHaveLength(0);
  });

  it("does not treat YAML configuration lists as shell commands", () => {
    const findings = checkCommandDrift(
      [
        {
          path: "README.md",
          content: ["```yaml", "python-tools:", "  - pytest", "```"].join("\n"),
        },
      ],
      ["pytest"],
    );

    expect(findings).toHaveLength(0);
  });

  it("checks Python tools inside shell fences", () => {
    const findings = checkCommandDrift(
      [
        {
          path: "README.md",
          content: ["```bash", "pytest -q", "```"].join("\n"),
        },
      ],
      ["pytest"],
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("pytest");
  });
});
