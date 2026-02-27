# MCP Upgrade Research (Fundamentals Workshop)

_Last updated: 2026-02-26_

## Goal

Identify what changed in MCP since the November 2025 spec release and what
should be represented in this workshop material, with routing guidance for the
full 4-workshop series.

## Scope + sources used

- MCP spec releases from GitHub: `modelcontextprotocol/modelcontextprotocol`
  (starting with `2025-11-25`).
- MCP spec changelog + docs for:
  - `2025-11-25`
  - previous baseline used by this workshop: `2025-06-18`
- TypeScript SDK releases from GitHub: `modelcontextprotocol/typescript-sdk`,
  all tags from October 2025 onward (`1.19.0` through `v1.27.1`).
- Current workshop code/docs in this repo.

---

## Current state of this workshop repo (baseline)

### Version baseline in material

- Content links are pinned to MCP spec `2025-06-18` across chapter docs.
- Exercise packages are pinned to:
  - `@modelcontextprotocol/sdk: ^1.24.3`
  - `@modelcontextprotocol/inspector: ^0.17.5`

### Concepts currently represented

- Ping and lifecycle basics (stdio transport)
- Tools
- Resources + resource templates
- Resources embedded/linked in tool outputs
- Prompts
- Completions (via schema completion helpers in examples)

### Concepts not represented in this workshop today

- Elicitation (form/url modes)
- Sampling (including tool-enabled sampling)
- Tasks (experimental long-running request model)
- MCP auth/OAuth flows and remote transport hardening

---

## MCP spec changes since the November 2025 release

### Release reality check

- Since November 2025, the MCP spec has one stable release: `2025-11-25` (plus
  `2025-11-25-RC`).
- No newer stable spec revision exists yet beyond `2025-11-25`.

### Full delta assessment: added/removed/changed and workshop impact

The `2025-11-25` changelog is the authoritative delta from `2025-06-18`.

#### A) Directly affects this Fundamentals workshop (should be represented here)

1. **Icons metadata added for tools/resources/resource templates/prompts**
   (added)
   - New metadata can now be surfaced on all core server primitives this
     workshop teaches.
   - Impact: high for conceptual completeness, low implementation complexity.
   - Recommendation: add at least one worked example in each relevant chapter
     (tools, resources, prompts), while noting client support may vary.

2. **Tool naming guidance formalized (SEP-986)** (changed)
   - Naming guidance now explicitly recommends restricted character set/length
     and uniqueness constraints.
   - Impact: medium. This workshop teaches tool naming heavily.
   - Recommendation: add a concise naming rule box and a quick lint-like check
     in tests/docs. Current names (snake_case) are mostly compatible.

3. **JSON Schema 2020-12 is now the default dialect** (changed)
   - MCP now has explicit JSON Schema usage rules and default dialect behavior.
   - Impact: medium. This workshop teaches tool schemas and prompt args.
   - Recommendation: add a schema-dialect note; clarify when to set `$schema`
     explicitly and that no-arg tools should still use valid object schema.

4. **Tool error handling guidance tightened** (changed)
   - Spec clarifies input validation errors should be surfaced as tool execution
     errors (model-correctable), not generic protocol errors.
   - Impact: medium/high. Error handling is an explicit exercise objective.
   - Recommendation: refresh error-handling narrative and examples to match
     2025-11 terminology and intent.

5. **`Implementation.description` added** (added)
   - Optional description now appears in initialization metadata.
   - Impact: low, but a nice quality upgrade for introspection UIs.
   - Recommendation: mention it in initialization examples as optional metadata.

6. **stdio stderr clarification** (changed)
   - Clarified that stdio servers may use stderr for general logging (not only
     errors).
   - Impact: low. This workshop already logs startup messages to stderr.
   - Recommendation: add a short note confirming this is spec-consistent.

7. **Spec link/version anchor updates** (changed)
   - All chapter links currently reference `2025-06-18`.
   - Impact: high for learner trust and promised “updated workshop” deliverable.
   - Recommendation: migrate all spec links to `2025-11-25`.

#### B) Important MCP changes, but better routed to other workshops in the series

1. **URL-mode elicitation + required URL elicitation error (`-32042`)** (added)
2. **Elicitation schema updates (`EnumSchema` redesign, defaults on primitive
   types, single/multi-select support)** (changed)
3. **Sampling now supports tools + `toolChoice` loop semantics** (added)
4. **Experimental Tasks model for durable/async request handling** (added)
5. **Auth/OAuth discovery and consent flow updates**
   - OIDC discovery support
   - RFC 9728 protected resource metadata alignment
   - Incremental scope via `WWW-Authenticate`
   - OAuth client metadata document support
6. **Streamable HTTP/SSE polling + origin-handling clarifications** (changed)

These are significant, but they are not core to this Fundamentals repo’s current
scope.

---

## TypeScript SDK releases since October 2025 (significant changes)

Reviewed all releases from `1.19.0` (2025-10-02) through `v1.27.1` (2026-02-24)
via `gh`.

### Most important changes to represent in workshop material

1. **`1.22.0`**
   - SEP-986 tool naming support
   - SEP-1319 request payload/schema decoupling
   - SEP-1034/1330 elicitation schema defaults and enum compatibility
   - Why it matters: introduces key spec-alignment behavior that informs
     naming/schema guidance.

2. **`1.23.0`**
   - URL elicitation (SEP-1036)
   - Sampling with tools (SEP-1577)
   - JSON Schema 2020-12 support behavior (SEP-1613)
   - Zod v4 compatibility (while keeping v3.25+ compatibility)
   - Why it matters: foundational new concepts for Advanced workshop content and
     schema story.

3. **`1.24.0`**
   - Protocol alignment to `2025-11-25`
   - Tasks support (SEP-1686)
   - Why it matters: this is the first “spec-2025-11-25 aligned” release line.

4. **`1.24.2`**
   - Optional resource annotations support
   - Why it matters: improves resource/tool UX metadata story (relevant to
     richer examples).

5. **`1.25.0`**
   - Stricter spec-compliance typing (removal of loose/passthrough shapes)
   - Protocol date validation
   - Why it matters: helps prevent teaching patterns that no longer type-check
     cleanly.

6. **`v1.26.0`** (security-critical)
   - Fix for cross-client response data leak advisory (GHSA-345p-7cg4-v4c7)
   - Why it matters: should be your minimum safe baseline for refreshed
     workshops.

7. **`v1.27.0` + `v1.27.1`**
   - Task streaming methods for elicitation/sampling
   - OAuth server discovery caching backport
   - Additional security fix: command injection prevention in example URL
     opening
   - Why it matters: better conformance and safer baseline.

### Notable patch-line items to keep in mind

- `1.23.1` / `1.24.3`: SSE priming/back-compat fixes.
- `v1.25.2`: URI template ReDoS fix.
- `v1.25.3`: sampling-with-tools validation fix.
- `1.21.1` / `1.21.2`: auth discovery/scope regression fixes.

### Practical baseline recommendation

For updated 2026 workshop material, target
**`@modelcontextprotocol/sdk >= v1.27.1`** to pick up the latest
spec/backport/security fixes from this period.

---

## What’s missing in this Fundamentals workshop right now (concept gaps)

These are gaps _within this repo_ that should be addressed to claim a credible
2025-11+ refresh:

1. **Spec version references are stale** (`2025-06-18` links throughout docs).
2. **No explicit treatment of tool naming constraints/guidance.**
3. **No examples of icons metadata on tools/resources/prompts/templates.**
4. **No explicit JSON Schema dialect guidance (2020-12 default behavior).**
5. **Error-handling section should be refreshed to the newer “tool-execution vs
   protocol” framing language.**

---

## What to route to which workshop in the 4-workshop series

_Assuming the series split is Fundamentals / Advanced MCP Features / Remote with
Authentication / MCP-UI._

### Keep in **Fundamentals** (this repo)

- Core server primitives: tools/resources/prompts
- Updated schema + naming conventions
- Metadata quality upgrades (icons, basic annotations awareness)
- Clear compatibility/versioning framing (2025-11-25 baseline)

### Put in **Advanced MCP Features**

- Sampling with tools (`tools`, `toolChoice`, tool loop constraints)
- Elicitation deep dive (form/url modes, enum/default evolution)
- Tasks (experimental long-running flow, polling/result retrieval)
- Optional: richer structured outputs + advanced annotations patterns

### Put in **Remote with Authentication**

- OIDC discovery enhancements
- Protected resource metadata + `.well-known` fallback behavior
- Incremental scope consent and `WWW-Authenticate` patterns
- OAuth client metadata docs and pre-registration flows
- Client-credentials and remote transport auth patterns

### Put in **MCP-UI**

- How icons metadata should be surfaced in UX
- How annotations (`audience`, `priority`, `lastModified`) inform UI behavior
- Prompt/resource affordance design around richer metadata

---

## Proposed upgrade backlog (planning starter)

## P0 — Immediate trust-restoring refresh (this repo)

1. Update all spec links from `2025-06-18` to `2025-11-25`.
2. Bump SDK baseline to `v1.27.1` (and align inspector version accordingly).
3. Re-run exercise tests and adjust any typing/schema breakage from stricter SDK
   types.
4. Add a short “protocol revision baseline” note at workshop intro.

## P1 — Fundamentals concept alignment

1. Add tool naming guidance callout (SEP-986 era guidance).
2. Add icons metadata examples in:
   - tools chapter,
   - resources chapter (including template),
   - prompts chapter.
3. Add JSON Schema usage callout (default 2020-12, explicit `$schema` if
   needed).
4. Update error-handling chapter wording/examples for 2025-11 semantics.

## P2 — Cross-series coordination

1. Build Advanced workshop modules for:
   - sampling-with-tools,
   - modern elicitation modes/schema,
   - tasks.
2. Build Remote Auth workshop updates for 2025-11 auth discovery/consent
   changes.
3. Add MCP-UI guidance for metadata-driven UX (icons/annotations).

---

## Risks / notes

- **Tasks are explicitly experimental** in spec `2025-11-25`; avoid
  over-promising stability in learner messaging.
- **Client support is uneven** for some newer features; workshop copy should
  distinguish “spec-defined” vs “widely implemented in clients today.”
- **Version drift risk** remains high if docs pin old spec URLs; treat link
  updates as mandatory, not optional polish.

---

## Appendix: release windows reviewed

### Spec repo releases checked

- `2025-11-25` (stable)
- `2025-11-25-RC` (pre-release)
- previous workshop baseline: `2025-06-18`

### TypeScript SDK releases checked (Oct 2025 onward)

- `1.19.0`
- `1.20.0`, `1.20.1`, `1.20.2`
- `1.21.0`, `1.21.1`, `1.21.2`
- `1.22.0`
- `1.23.0-beta.0`, `1.23.0`, `1.23.1`
- `1.24.0`, `1.24.1`, `1.24.2`, `1.24.3`
- `1.25.0`, `1.25.1`, `v1.25.2`, `v1.25.3`
- `v1.26.0`
- `v1.27.0`, `v1.27.1`
