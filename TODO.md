# MCP Spec Update TODO

These notes assume the videos were recorded against the 2025-06-18 MCP spec and
should be refreshed for the 2025-11-25 release plus likely June 2026 changes.

Sources to re-check before recording:

- 2025-11-25 changelog:
  https://modelcontextprotocol.io/specification/2025-11-25/changelog
- Draft schema:
  https://modelcontextprotocol.io/specification/draft/schema
- SEPs:
  https://modelcontextprotocol.io/seps
- MCP Apps extension:
  https://modelcontextprotocol.io/docs/extensions/apps

## Video Impact Legend

- `[video required]`: the current video teaches materially inaccurate guidance
  and should be rerecorded or replaced.
- `[verify transcript]`: inspect the named segment before deciding; current
  evidence was incomplete or conditional.
- `[content-only]`: update README/code/comments/callouts; the existing video can
  remain.

## Recommended Strategy

Keep this workshop focused on the core primitives. Do not add new exercises for
Tasks, URL elicitation, sampling tools, OAuth client registration, or MCP Apps.
Those belong in the other workshops. The work here should be mostly copy updates
and small example improvements so beginners learn the current vocabulary without
expanding the workshop.

## Global Updates

- [ ] [content-only] Update all spec links from `2025-06-18` to the current released spec once
  the June 2026 release lands. Until then, use `2025-11-25` for stable docs and
  only mention draft behavior in notes.
- [ ] [content-only] Add a short "spec version" note to the root README explaining that MCP is
  release-versioned and that the workshop intentionally covers stable server
  fundamentals, not every optional feature.
- [ ] [content-only] Audit every JSON Schema example and generated schema for JSON Schema
  2020-12 compatibility. Basic object schemas are fine, but examples should not
  imply draft-07 is the default.
- [ ] [content-only] For no-argument tools, prefer explicit empty object schemas such as
  `{ type: "object", additionalProperties: false }` instead of `null` or vague
  "no args" language.
- [ ] [content-only] Add the optional `description`, `icons`, and `websiteUrl` fields to the
  server `Implementation` example if the installed TypeScript SDK supports them.
  Keep this as metadata polish, not a core exercise objective.

## Exercise 01: Ping

- [ ] [verify transcript] Keep the handshake/connection exercise simple, but update prose to mention
  that the protocol is moving toward more stateless HTTP patterns in the June
  cycle. Avoid teaching transport internals here. Verify the video segment that
  describes open connections/SSE if June stateless changes land.
- [ ] [verify transcript] If the exercise shows Streamable HTTP requests directly, add the current
  requirement that follow-up HTTP requests include `MCP-Protocol-Version` and
  mention that future HTTP transport versions may surface MCP routing data in
  headers such as `Mcp-Method` and `Mcp-Name`. Verify any direct HTTP transport
  walkthrough before rerecording.
- [ ] [content-only] Do not introduce `server/discover`, `messages/listen`, or stateless
  initialization unless they are finalized in the June 2026 release. If they
  land, add a brief callout and leave implementation to a future transport
  workshop.

## Exercise 02: Tools

- [ ] [content-only] Add the 2025-11 tool naming guidance: tool names should be 1-64 chars,
  case-sensitive, and limited to ASCII letters, digits, `_`, `-`, `.`, and `/`.
- [ ] [content-only] Check every workshop tool name for compliance. Rename only if necessary;
  aliases are not worth teaching in fundamentals.
- [ ] [content-only] Update the error handling exercise so input validation failures are shown
  as tool execution errors with `isError: true`, not JSON-RPC protocol errors.
  Protocol errors should be reserved for unknown tools, malformed requests, and
  server failures. Transcript already generally supports `isError: true`.
- [ ] [content-only] Add one sentence explaining that `title` is for user-facing display and
  `name` is the stable model/protocol identifier.
- [ ] [content-only] Do not add sampling-with-tools here. It belongs in
  `advanced-mcp-features`.

## Exercise 03: Resources

- [ ] [content-only] Add optional `icons` metadata to one resource or resource template example
  if the SDK supports it. This is a good low-cost way to show the 2025-11
  metadata additions without changing the exercise flow.
- [ ] [content-only] Reword the warning that "popular clients are limited in their use of
  resources" to be less time-sensitive. Resource support is improving, and MCP
  Apps now uses resources as UI templates.
- [ ] [content-only] Mention that `ui://` is now reserved by MCP Apps. This workshop should not
  teach UI resources, but it should avoid using `ui://` for non-UI examples.
- [ ] [content-only] Keep resource subscriptions/list change notifications out of this workshop.
  They are already covered in `advanced-mcp-features`.

## Exercise 04: Resource Tools

- [ ] [content-only] Keep this exercise if it is still helpful pedagogically, but clarify the
  distinction between embedded resources, resource links, and tool structured
  output.
- [ ] [content-only] If MCP Apps examples are added elsewhere, avoid implying that returning an
  embedded `text/html` resource from a tool is the modern UI pattern. The modern
  pattern is predeclared `ui://` resources linked by tool `_meta.ui.resourceUri`.

## Exercise 05: Prompts

- [ ] [content-only] Add optional `icons` metadata to one prompt example if supported by the SDK.
- [ ] [content-only] Audit prompt argument schemas for JSON Schema 2020-12 assumptions.
- [ ] [content-only] Leave prompt change notifications in `advanced-mcp-features`; do not add
  more prompt exercises here.
- [ ] [verify transcript] Re-check the prompt completion video/transcript before
  changing completion-specific guidance; the available Epicshop transcript for
  that video was missing.

## Things To Explicitly Not Add Here

- Tasks and durable polling.
- URL mode elicitation.
- Sampling with tools.
- OAuth Client ID Metadata Documents.
- MCP Apps.
- Stateless transport rewrites.

Those are important, but adding them here would make the fundamentals workshop
too broad.
