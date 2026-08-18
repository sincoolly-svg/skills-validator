# Changelog

## 0.1.0 - 2026-08-19

- Replaces the legacy deploy-and-execute flow with static-only skill scanning.
- Adds local directory and public GitHub repository targets.
- Adds text, Markdown, and JSON reports with stable exit codes.
- Adds static rules for dangerous shell behavior, downloads, sensitive access, external leakage, dependency installs, path traversal, and invalid manifests/configuration.
- Adds tests, example fixtures, MIT licensing, a GitHub Actions workflow, and a reusable composite action.

This is the first MVP release. It does not sandbox or execute untrusted skills.
