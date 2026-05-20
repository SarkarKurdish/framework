# Contributing to @omss/framework

Thank you for taking the time to contribute! This document explains how to get set up, what conventions we follow, and how releases are cut.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Running Tests & Formatting](#running-tests--formatting)
- [Branching & Commit Conventions](#branching--commit-conventions)
- [Adding or Changing a Provider](#adding-or-changing-a-provider)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

---

## Development Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20.x ([download](https://nodejs.org/)) |
| TypeScript | ≥ 5.0 (installed as a dev dep) |

A TMDB API key is required to run the example server (`examples/basic-server.ts`). Grab one free at https://www.themoviedb.org/settings/api.

### First-time setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/framework.git
cd framework

# 2. Install dependencies
npm install

# 3. Copy the example env file and fill in your TMDB key
cp .env.example .env
# → set TMDB_API_KEY=<your key>

# 4. Start the dev server (watches for changes)
npm run dev
```

The dev server starts on `http://localhost:3000` by default.

---

## Running Tests & Formatting

```bash
# Run the full test suite once
npm run test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Build TypeScript → dist/
npm run build

# Format all source files with Prettier
npm run format
```

> **Before opening a PR:** run `npm run build && npm run test:ci && npm run format` locally and make sure both pass.

---

## Branching & Commit Conventions

### Branch names

| Type | Pattern | Example |
|---|---|---|
| New feature | `feat/<short-description>` | `feat/subtitle-language-filter` |
| Bug fix | `fix/<short-description>` | `fix/registry-duplicate-provider` |
| Documentation | `docs/<short-description>` | `docs/add-testing-guide` |
| Chores / CI | `chore/<short-description>` | `chore/update-vitest` |

`main` is **always releasable**. Direct pushes are disabled — all changes land via Pull Request with at least one passing CI run from dev.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). The release workflow reads your commit prefixes to auto-generate categorised release notes, so please follow this format:

```
<type>[optional scope]: <short description>

[optional body]

[optional footer, e.g. BREAKING CHANGE: ...]
```

**Valid types:**

| Prefix | Used for |
|---|---|
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `docs:` | Documentation only changes |
| `chore:` | Build process, CI, tooling, dependency updates |
| `test:` | Adding or fixing tests |
| `refactor:` | Code change that is neither a fix nor a feature |

**Breaking changes** must include `BREAKING CHANGE:` in the commit footer, or a `!` after the type (e.g. `feat!: rename ProviderRegistry config`). This triggers a major version bump.
Additionally, if your PR includes a breaking change, please add a clear description of the change and migration steps in the PR description. Also a discussion is required with the code owners to ensure the change is necessary and properly planned.

---

## Adding or Changing a Provider

Providers live in the consuming project, **not** in this framework repo. The framework ships `BaseProvider` and `ProviderRegistry` — provider implementations extend `BaseProvider` and are registered at runtime.

If you are contributing a change to `BaseProvider` or `ProviderRegistry` itself, here is the high-level checklist:

1. **Read the type definitions** in `src/core/types/main.ts` — especially `ProviderMediaObject`, `ProviderResult`, `ProviderCapabilities`, and `OMSSConfig`.
2. **Look at the example provider** in `examples/providers/my-provider.ts` to understand the expected implementation shape.
3. **Extend `BaseProvider`** — you must implement `getMovieSources` and `getTVSources`. Both receive a `ProviderMediaObject` and must return a `ProviderResult`.
4. **Register via `ProviderRegistry`** — call `registry.register(new YourProvider())` before starting `OMSSServer`, or use `registry.discoverProviders(dir)` for auto-discovery.
5. **Test your change** — if you modify `BaseProvider` or `ProviderRegistry`, add or update tests under `tests/unit/providers/`.
6. See the [README](README.md#creating-custom-providers) for the full API reference.
