# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release.
- `Voka AI` action node — Call (List, Get, Get Transcript, Place Outbound), Assistant (List, Get).
- `Voka AI Trigger` REST Hook node — `call.completed`, `call.insight.received`, `call.transcript.ready` events with HMAC-SHA256 signature verification and 5-minute replay protection.
- `Voka AI API` credential type with `/api/v1/auth/whoami` connection test.
- CI workflow: lint + typecheck + build on every PR.
- Secret scanning workflow (Gitleaks).
- npm publish workflow with provenance attestation on tag push.
- Dependabot weekly checks for npm + GitHub Actions versions.
- Security policy ([SECURITY.md](SECURITY.md)).
