# TruthSync

[![CI](https://github.com/jonathan-shizuka/truthsync-action/actions/workflows/ci.yml/badge.svg)](https://github.com/jonathan-shizuka/truthsync-action/actions/workflows/ci.yml)

**Keep repository facts and human-facing documentation in sync.**

TruthSync is a deterministic GitHub Action and CLI that catches documentation drift before it merges. It does not send source code to an LLM and needs only read access to the checked-out repository.

## Why

Documentation often fails while every unit test stays green:

- structured metadata says `status: live`, while nearby prose still says “status is draft”;
- a contribution guide asks newcomers to run an npm script or Python tool the project no longer declares;
- a README advertises a version that differs from the package manifest.

These are not cosmetic defects. They break the repository's source of truth and make users decide from contradictory evidence.

TruthSync was motivated by two real first-contribution incidents in `secops-ng-framework`: [a live/draft status contradiction](https://github.com/secops-ng/secops-ng-framework/pull/941) and [stale validation commands in the PR template](https://github.com/secops-ng/secops-ng-framework/issues/942).

## Quick start

Create `.github/workflows/truthsync.yml`:

```yaml
name: TruthSync

on:
  pull_request:

permissions:
  contents: read

jobs:
  docs-reality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jonathan-shizuka/truthsync-action@v1
        with:
          fail-on: error
```

The action adds file annotations, writes a GitHub job summary, exposes finding counts as outputs, and saves `.truthsync-report.json` for evidence or downstream automation.

## Rules

### `status-drift`

Finds explicit prose that contradicts a nearby structured `status` or `state` value in YAML, JSON, or TOML. It focuses on high-confidence statements such as “Status is draft,” not every historical use of the word “draft.”

### `command-drift`

Checks documented `npm run`, `pnpm`, and `yarn` scripts against root `package.json`. It also checks common Python quality commands against `pyproject.toml`, requirements files, lockfiles, or `tox.ini`.

### `version-drift`

Compares explicit “current/project/package/action version” statements in Markdown with the root package manifest. Changelogs and release notes are excluded.

## Configuration

TruthSync works without configuration. Add `.truthsync.yml` when a repository needs narrower paths or rules:

```yaml
include:
  - "**/*.{md,mdx,yml,yaml,json,toml}"
exclude:
  - "vendor/**"
  - "examples/**"
rules:
  status: true
  commands: true
  versions: true
pythonTools:
  - pytest
  - ruff
  - mypy
failOn: error
```

`fail-on` accepts:

- `error` — block only high-confidence status contradictions (default);
- `warning` — block any finding;
- `never` — observation mode; annotate and report without failing.

Start with `never` in an established repository, review the evidence, then raise the threshold.

## CLI

From a local checkout, install dependencies and package the CLI:

```bash
npm install
npm run package
node dist/cli/index.js --path . --config .truthsync.yml --fail-on error
```

## Security and trust

- deterministic checks; no model calls;
- no network access in the scanner;
- no secrets required;
- read-only workflow permissions;
- files larger than 1 MiB and symbolic links are skipped;
- evidence and limitations are included with every finding.

## Development

```bash
npm install
npm run all
```

`dist/` is committed because GitHub Actions executes the bundled JavaScript directly.

## Roadmap

- configurable cross-file truth assertions;
- OpenAPI and generated-reference drift;
- SARIF output;
- optional local-model semantic checks with an explicit privacy boundary;
- precision metrics and per-rule suppression with reasons.

## License

[MIT](LICENSE)
