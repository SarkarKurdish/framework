# Security Policy

Thank you for helping keep `@omss/framework` and its consumers safe.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report them privately using one of these channels:

1. **Preferred:** GitHub Security Advisories for this repository.
2. **Fallback:** Email the maintainers / OMSS Foundation security contact.

Please include:

- A clear description of the issue.
- Affected version(s) of `@omss/framework`.
- Steps to reproduce or a proof of concept.
- Impact assessment (what an attacker could do).
- Any suggested mitigation, if known.

We will acknowledge receipt as quickly as possible and work with you on triage, remediation, and coordinated disclosure.

## Scope

This policy covers vulnerabilities in:

- The framework runtime itself (`src/`)
- Build and release workflows
- Published npm package contents

This policy generally does **not** cover vulnerabilities in third-party provider implementations built on top of the framework, unless the framework directly causes the issue.

## Supported Versions

We aim to provide security fixes for the latest published minor release.

| Version | Supported |
|---|---|
| Latest minor | ✅ |
| Older minors | ⚠️ Best effort |
| Unsupported majors | ❌ |

## Disclosure

Please give maintainers a reasonable amount of time to investigate and patch the issue before any public disclosure.
