# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-05-12

### Fixed
- **Critical: HMAC verification silent-dropped every delivery.** Voka sends
  `X-Voka-Timestamp` as Unix seconds (Stripe convention). Previous code used
  `new Date(timestamp).getTime()` which returns NaN for a bare numeric
  string. Now parses 10-digit Unix seconds, with fallbacks for 13-digit
  milliseconds and ISO-8601.
- **Critical: idempotent subscribe replay lost the signing secret.** Voka's
  `POST /webhook-subscriptions` returns the existing row WITHOUT `secret`
  when the same (url, events) is already subscribed (typical on Zap save
  / re-activate). Trigger now detects the missing-secret case and
  auto-recovers via DELETE + re-POST so HMAC verification keeps working.

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
