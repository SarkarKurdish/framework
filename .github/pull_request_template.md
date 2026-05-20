## Summary

<!-- Describe what this PR does and why. Link to the issue(s) it addresses. -->

Closes #<!-- issue number -->

---

## Type of Change

<!-- Check all that apply. -->

- [ ] `feat:` New feature (non-breaking)
- [ ] `fix:` Bug fix (non-breaking)
- [ ] `docs:` Documentation change
- [ ] `chore:` Build, CI, or tooling change
- [ ] `test:` New or updated tests only
- [ ] `refactor:` Code refactor (no functional change)
- [ ] `perf:` Performance improvement
- [ ] ⚠️ **Breaking change** — existing behaviour changes or public API is removed/renamed

---

## Checklist

### Code quality
- [ ] `npm run build` passes locally
- [ ] `npm run test:ci` passes locally (all tests green)
- [ ] New public API surfaces are covered by tests in `tests/`
- [ ] `npm run format` has been run (or code is already formatted)

### Provider / registry changes <!-- (skip if not applicable) -->
- [ ] `BaseProvider` contract is unchanged **OR** breaking changes are documented below
- [ ] Example in `examples/providers/my-provider.ts` still works after the change
- [ ] `ProviderRegistry.discoverProviders()` still discovers providers from the examples folder

### Documentation
- [ ] README is updated if user-facing behaviour changed
- [ ] In-code JSDoc comments are added/updated for any new or changed public types/methods
- [ ] `CONTRIBUTING.md` is updated if the dev workflow changed

---

## Breaking Changes

<!-- If this is a breaking change, describe what changes for consumers and provide a migration snippet. -->

**Before:**
```ts
// old API
```

**After:**
```ts
// new API
```

---

## Additional Notes

<!-- Screenshots, benchmark results, edge cases, known limitations, or anything else reviewers should know. -->
