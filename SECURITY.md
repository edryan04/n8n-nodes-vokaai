# Security Policy

## Supported versions

The latest published version is supported. We do not backport security fixes to older minor versions.

## Reporting a vulnerability

**Do NOT open a public GitHub issue for security reports.**

Email **[security@vokaai.com](mailto:security@vokaai.com)** with:

- A description of the issue
- Steps to reproduce (or a proof-of-concept if you have one)
- Affected version(s)
- Your contact information for follow-up

We aim to acknowledge reports within 2 business days and ship a fix within 7 days for high-severity issues.

## Scope

This policy covers the `n8n-nodes-vokaai` package itself — credential handling, signature verification, and the n8n integration code.

For vulnerabilities in the **Voka AI platform** (API, dashboard, voice infrastructure), please report to the same email; we triage and route appropriately.

## Out of scope

- Issues already covered by [n8n's own security policy](https://github.com/n8n-io/n8n/security/policy)
- Vulnerabilities in third-party dependencies — please report those upstream first; we'll patch as soon as a fixed version is published
- Findings that require physical access to a victim's machine
- Self-XSS or social-engineering attacks

## Coordinated disclosure

If you would like coordinated disclosure or a CVE assignment, mention it in your report and we'll work with you on timing.
