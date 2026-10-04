# Versioning Report — Finance Made Simple

This document defines how versions are assigned, tracked, and released for the Finance Made Simple application (Next.js on Vercel, localStorage persistence, `/api/extract` OpenAI contract).

---

## 1. Semantic Versioning (SemVer) policy

We follow [Semantic Versioning 2.0.0](https://semver.org/): `MAJOR.MINOR.PATCH`.

| Segment | When to bump | Examples for this project |
|---------|----------------|---------------------------|
| **MAJOR** | Breaking change for users or integrators | Removing PDF export; changing localStorage key without migration; breaking `/api/extract` response shape without backward compatibility |
| **MINOR** | New backward-compatible capability | New chart type; optional CSV export; new `docType` on extract API with old clients still valid |
| **PATCH** | Backward-compatible fixes | UI typo; extraction prompt tweak; PDF layout fix; dependency security patch |

### What is versioned separately

1. **Application release** — `package.json` `"version"` and git tag `vX.Y.Z`.
2. **localStorage schema** — integer `version` inside stored JSON (`financeMadeSimple:v1` key; field `version: 1`).
3. **HTTP API contract** — `/api/extract` request/response documented below; breaking changes require MAJOR app bump or explicit API version path in future (e.g. `/api/v2/extract`).
4. **OpenAI model** — pinned in `lib/config.js` as `OPENAI_MODEL`; changing model is a **MINOR** if output shape stays the same, **MAJOR** if JSON schema changes without adapter.

### Pre-1.0 exception

This project ships at **1.0.0**. Before 1.0.0, MINOR could break storage; from 1.0.0 onward, storage and API stability guarantees apply as in this document.

---

## 2. App release tags and changelog

- **Git tags:** `v1.0.0`, `v1.1.0`, etc., matching `package.json`.
- **Changelog:** [CHANGELOG.md](../CHANGELOG.md) using [Keep a Changelog](https://keepachangelog.com/) sections: Added, Changed, Deprecated, Removed, Fixed, Security.
- **Release notes:** Copy relevant changelog section to GitHub/Git release when tagging.

### Release checklist

1. Ensure `npm run build` and `npm run lint` pass locally.
2. Update [CHANGELOG.md](../CHANGELOG.md) with date and version section.
3. Bump `"version"` in [package.json](../package.json).
4. If storage schema changed, bump `SCHEMA_VERSION` in [lib/storage.js](../lib/storage.js) and add `migrateV{n}toV{n+1}`.
5. If API contract changed, document in this file and CHANGELOG.
6. Commit: `chore: release vX.Y.Z`.
7. Tag: `git tag vX.Y.Z`.
8. Push branch and tags; verify Vercel production deploy.
9. Smoke-test: upload image, confirm planilha, charts, PDF.

---

## 3. localStorage schema versioning

**Storage key:** `financeMadeSimple:v1` (defined in `lib/config.js`).

**Current schema version:** `1` (`SCHEMA_VERSION` in `lib/storage.js`).

### Document shape (v1)

```json
{
  "version": 1,
  "balances": [],
  "transactions": [],
  "bills": [],
  "savingsPlan": null,
  "settings": { "locale": "pt-BR", "currency": "BRL" }
}
```

### Migration rules

- On `loadState()`, run `migrate(data)`.
- If `data.version < SCHEMA_VERSION`, apply sequential migrations: `migrateV1toV2`, etc.
- If migration is impossible, reset to `emptyState()` and log (future: optional export-before-reset UI).
- **MINOR** releases may add optional fields without bumping schema if readers ignore unknown keys.
- **MAJOR** releases that change required fields must bump `SCHEMA_VERSION` and implement migration.

### Changing the storage key

Renaming `financeMadeSimple:v1` to a new key is a **MAJOR** user-facing change (data appears “lost”). Prefer keeping the key and only bumping inner `version`.

---

## 4. API contract versioning — `/api/extract`

### Request (v1)

```json
{
  "image": "data:image/jpeg;base64,...",
  "docType": "balance" | "extrato" | "bill"
}
```

### Success response (v1)

```json
{
  "docType": "extrato",
  "data": { }
}
```

`data` shape by `docType`:

| docType | `data` shape |
|---------|----------------|
| `balance` | `{ "balance": { "source", "amount", "currency", "asOf" } }` |
| `extrato` | `{ "transactions": [ { "date", "description", "category", "amount", "type" } ] }` |
| `bill` | `{ "bills": [ { "name", "dueDate", "amount", "status" } ] }` |

### Error response (v1)

```json
{ "error": "string" }
```

HTTP status: 400 validation, 413 payload too large, 500 server, 502 empty AI response.

### Breaking vs non-breaking API changes

| Change | Bump |
|--------|------|
| New optional request field | MINOR |
| New `docType` value | MINOR (client must opt in) |
| Rename or remove response field | MAJOR |
| Change `type` enum values | MAJOR |

Future: introduce `/api/v2/extract` and keep v1 for one MAJOR cycle if needed.

---

## 5. Dependency versioning

### package.json ranges

- **Runtime dependencies** (`next`, `react`, `openai`, `recharts`, `jspdf`, etc.): use caret `^` for compatible updates per npm semver.
- **Lockfile:** `package-lock.json` is committed and is the **source of truth** for CI and Vercel installs (`npm ci`).

### When to upgrade

| Dependency | Guidance |
|------------|----------|
| `next` | Align `eslint-config-next` to same major.minor; run `npm run build` after upgrade; PATCH often safe on Vercel |
| `react` / `react-dom` | Match versions; follow Next.js peer requirements |
| `openai` | MINOR SDK updates usually safe; verify `chat.completions` + `response_format` |
| `recharts` | Test all three charts after MINOR |
| `jspdf` / `jspdf-autotable` / `html2canvas` | Test PDF export after any bump |

### Node.js engine

Recommend adding to `package.json` when stabilizing:

```json
"engines": { "node": ">=20" }
```

Vercel uses Node version from project settings; document the chosen version in README.

### Security

- Run `npm audit` periodically; apply PATCH updates for high severity when compatible.
- Avoid `npm audit fix --force` on production without a full build/test cycle.

---

## 6. Environment and model versioning

| Variable | Scope | Versioning |
|----------|--------|------------|
| `OPENAI_API_KEY` | Server only (Vercel env) | Rotating key is not an app version bump |
| `OPENAI_MODEL` | Code constant in `lib/config.js` | Document in CHANGELOG when changed |

### Model upgrade process

1. Change `OPENAI_MODEL` in `lib/config.js`.
2. Run manual extraction tests for all three `docType` values.
3. If JSON shape differs, update prompts and parsers; bump MINOR or MAJOR per API rules.
4. Note model ID in CHANGELOG.

---

## 7. UI and assets

- Footer displays app version string (sync with `package.json` on release).
- Theme tokens in `app/globals.css` are not independently versioned; breaking visual redesigns are **MINOR** unless they remove features.

---

## 8. Compatibility matrix

| App version | Storage schema | `/api/extract` | Notes |
|-------------|----------------|----------------|-------|
| 1.0.x | 1 | v1 (implicit) | Initial release |
| 1.1.x | 1 (expected) | v1 + optional fields | Add features without migration |
| 2.0.0 | 2+ | v1 or v2 | Requires migration functions |

### Client-only data

Users on version 1.0.0 who refresh after deploy to 1.1.0 keep data if schema unchanged. Users jumping 1.x → 2.0.0 need migration code shipped in 2.0.0 before release.

---

## 9. Branching and deployment alignment

- **Production (Vercel):** tracks `main` (or your default branch); production env has `OPENAI_API_KEY`.
- **Preview deployments:** each PR; use same env var in Vercel preview or extraction will fail with 500.
- **Version display:** optional future improvement — inject `NEXT_PUBLIC_APP_VERSION` at build from `package.json` for footer accuracy.

---

## 10. Summary

| Artifact | Location | Version identifier |
|----------|----------|-------------------|
| App release | `package.json`, git tag | `1.0.0` |
| User data | localStorage | `version: 1` inside JSON |
| Extract API | `app/api/extract/route.js` | Implicit v1 (documented here) |
| AI model | `lib/config.js` | `gpt-4o-mini` |
| Dependencies | `package-lock.json` | Exact resolved versions |

Maintainers should treat **storage schema** and **extract JSON shape** as the highest-risk surfaces for MAJOR bumps; UI and PDF tweaks are typically PATCH or MINOR.
