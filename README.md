# Skills Validator

Static safety checks for AI agent skill repositories.

Skills Validator reads a local directory or a public GitHub repository and reports patterns that deserve review before a skill is trusted. It does not run files from the target, install target dependencies, invoke package scripts, or pass the target the caller's full environment.

## MVP scope

- Validates `SKILL.md` frontmatter with `name` and `description`.
- Checks source, shell, JSON, and configuration files as text.
- Reports download-and-execute pipelines, destructive commands, path traversal writes, sensitive credential paths, sensitive environment reads, environment-value network exfiltration, dependency installation commands, and invalid JSON configuration.
- Emits terminal text, Markdown, or JSON.
- Scans local directories and canonical public GitHub repository URLs.
- Uses stable exit codes: `0` clean, `1` findings, `2` invalid input or scanner error.

This is a static signal, not a sandbox and not a guarantee that a skill is safe. Review findings and the skill's purpose before use. Runtime isolation, SARIF, more skill formats, and dependency vulnerability databases are planned for later releases.

## Quick start

Requirements: Node.js 20 or newer and Git for public repository scans.

```bash
npm install
npm run build

# Scan a local skill
node dist/index.js scan ./fixtures/safe-skill

# Scan a public repository
node dist/index.js scan https://github.com/owner/repository --format markdown --output report.md
```

The command never writes into the target. A GitHub checkout is shallow, temporary, and removed after the report is produced.

## GitHub Actions

The repository includes a CI workflow and a composite action. To use the action from a checked-out copy:

```yaml
- uses: sincoolly-svg/skills-validator@master
  with:
    target: ./skills/my-skill
    format: markdown
```

Pin an immutable release or commit in production workflows. Findings return exit code `1`, so the workflow fails until the review is completed.

## Development

```bash
npm test
npm run build
npm run check
```

The test suite uses temporary fixtures and verifies that scanner input is never executed. The `fixtures/unsafe-skill` directory is intentionally unsafe and is only used by tests; do not use it as a skill.

## Security boundary

The scanner follows symlinks neither into nor out of the target and ignores `.git`, `node_modules`, and `dist`. It skips files whose names begin with `.env` and never includes file contents or environment values in reports. Static matching can miss obfuscated or runtime-only behavior; treat a clean report as one review signal, not approval.

## License

MIT. See [LICENSE](LICENSE).
