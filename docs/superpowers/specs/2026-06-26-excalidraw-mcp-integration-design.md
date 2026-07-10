# Excalidraw MCP Integration Design

## Status

Approved direction: integrate a repo-native MCP server package that exposes Excalidraw drawing to AI agents while inheriting this repository's drawing defaults and Technical Precision design system.

## Context

The current repository is a Yarn 1 monorepo with workspaces for `excalidraw-app`, `packages/*`, and `examples/*`. The drawing defaults, fonts, palette, theme tokens, and canvas rendering behavior now live in the existing Excalidraw packages, especially `packages/common`, `packages/element`, and `packages/excalidraw`.

The upstream `excalidraw/excalidraw-mcp` project is a standalone MCP App server. It includes:

- Public model tools: `read_me` and `create_view`.
- App-only tools: export, save checkpoint, and read checkpoint.
- Local stdio and Streamable HTTP transports.
- A checkpoint store with file, memory, and Redis-backed variants.
- A bundled interactive Excalidraw app resource served as `ui://excalidraw/mcp-app.html`.

This integration should not fork a second copy of Excalidraw behavior inside the repo. The MCP package should depend on local workspace packages and use the same constants, palette, fonts, and element conversion behavior that the main app uses.

## Goals

- Add a first-party workspace package, `packages/excalidraw-mcp`, for an MCP server that AI agents can run locally or over HTTP.
- Expose a reliable drawing API centered on `read_me` and `create_view`.
- Make generated diagrams default to the Technical Precision style: Geist text, JetBrains Mono for code-like labels, primary navy strokes, MinIO/parity red, pale node red, neutral surface fills, 4px rounding, clean solid fills, and elbow arrows with triangle arrowheads.
- Support checkpoints so agents can iteratively update a diagram without resending the whole scene.
- Provide root-level scripts so developers can build and run the MCP server from this monorepo.
- Keep the integration small enough to review and test without destabilizing `@excalidraw/excalidraw`.

## Non-Goals

- Do not replace the main Excalidraw app runtime.
- Do not import the upstream repository as a git submodule.
- Do not publish or deploy a hosted MCP endpoint in the first pass.
- Do not add Redis or Vercel deployment configuration in the first pass.
- Do not copy the entire upstream interactive widget if the server can launch with a minimal local resource first.

## Approach Options

### Recommended: First-Party Workspace Package

Create `packages/excalidraw-mcp` as a workspace package. Port the small server-side pieces from upstream, then adapt them to import local Excalidraw packages. This keeps ownership inside the monorepo, makes tests run through the existing toolchain, and keeps design defaults shared.

Tradeoff: more integration work than a wrapper, but lower long-term drift.

### External Companion Wrapper

Keep `excalidraw-mcp` outside this repo and add scripts/docs that run it next to the local app.

Tradeoff: fast setup, but it keeps separate dependencies, separate default prompts, and a separate copy of Excalidraw rendering behavior.

### App-Embedded Endpoint

Add MCP routes directly to `excalidraw-app`.

Tradeoff: tight app integration, but it couples AI-agent infrastructure to the browser app and makes stdio usage awkward.

## Architecture

The implementation should add one isolated package:

`packages/excalidraw-mcp`

Responsibilities:

- Own the MCP server registration and transports.
- Own checkpoint storage for MCP sessions.
- Own the AI-facing Excalidraw element reference.
- Own MCP-specific validation and response shaping.
- Reuse local Excalidraw packages for constants, conversion, export helpers, and style defaults where those APIs are available.

The package should expose:

- `src/server.ts`: `registerTools()` and `createServer()`.
- `src/main.ts`: CLI entry for stdio or HTTP mode.
- `src/checkpoint-store.ts`: local file and memory checkpoint stores.
- `src/technical-precision-reference.ts`: model-facing guidance tuned to the design system.
- `src/element-defaults.ts`: small helper that applies Technical Precision defaults to incoming shorthand elements before they are passed to Excalidraw conversion.
- `src/index.ts`: package exports for embedding or tests.

## MCP Tools

### `read_me`

Returns a concise element-format reference for agents. It must describe the repo-native defaults, make new MCP sessions blank-first, and include only a generic Technical Precision style example so agents do not seed a starter diagram unless the user asks for one.

### `create_view`

Accepts a JSON array string of elements. It validates size, parses JSON, resolves `restoreCheckpoint`, applies delete pseudo-elements, saves a resolved checkpoint, and returns a `checkpointId`.

The first pass may return text plus structured checkpoint content without a rich MCP App widget. If a minimal `ui://excalidraw/mcp-app.html` resource is added, it should be clearly isolated and built from this package.

### `save_checkpoint` and `read_checkpoint`

Private app-only tools if the app resource is included. These should be hidden from normal model use.

## Data Flow

1. An agent calls `read_me` once.
2. The agent calls `create_view` with compact JSON.
3. The server parses the array and separates real Excalidraw elements from pseudo-elements.
4. The server resolves an optional checkpoint base.
5. The server applies deletes by element id and bound `containerId`.
6. The server applies Technical Precision defaults to elements that omit style fields.
7. The server saves the resolved scene and returns a checkpoint id.
8. Later calls can start with `{"type":"restoreCheckpoint","id":"..."}` and append or delete elements.

## Styling Defaults

MCP-generated diagrams should match the current app defaults:

- Stroke: `#0c2430`.
- Neutral fill: `#f3f3f8`.
- MinIO/parity fill: `#c8102e`.
- Node fill: `#ffdad8`.
- Interactive/flow accent: `#007aff`.
- Fill style: `solid`.
- Roughness: `0`.
- Stroke width: current medium technical default.
- Font: Geist for normal text.
- Code or technical labels: JetBrains Mono when explicitly requested by the agent reference.
- Rounded rectangles: adaptive roundness with the same compact corner radius used by the app.
- Arrows: elbow-style when the element shape supports it, triangle end arrowhead by default.

## Error Handling

- Reject `elements` inputs over the same 5 MB limit used upstream.
- Return an MCP tool error for invalid JSON with the JSON parse message.
- Return an MCP tool error when a requested checkpoint is missing.
- Validate checkpoint ids with a strict alphanumeric, hyphen, and underscore whitelist.
- Keep file-backed checkpoint writes inside a dedicated temp directory and guard against path traversal.
- Treat checkpoint pruning as best-effort so it never fails a successful drawing call.

## Testing

Unit tests should cover:

- `read_me` contains the Technical Precision colors and font guidance.
- `create_view` rejects invalid JSON.
- `create_view` rejects oversized input.
- `create_view` saves a checkpoint with defaulted Technical Precision styles.
- `restoreCheckpoint` plus `delete` removes matching element ids and bound text by `containerId`.
- Checkpoint id validation rejects path traversal and unsafe characters.

Integration checks should cover:

- `yarn test:typecheck`.
- A focused MCP package test command.
- Existing design-default tests that were added for the Technical Precision work.
- A local manual smoke run with stdio or HTTP mode.

## Rollout

First implementation pass:

1. Add the workspace package and dependencies.
2. Implement server registration, stores, defaulting helpers, and tests.
3. Add root scripts: `build:mcp`, `start:mcp`, and a focused test script if useful.
4. Update documentation with local AI-agent configuration examples.
5. Run focused tests and typecheck.
6. Commit and push to the existing `codex/technical-precision-design-system` branch.

Second implementation pass:

1. Add or port the interactive MCP App resource.
2. Add export-to-excalidraw support if required.
3. Add hosted deployment configuration only after the local package is stable.

## Open Decisions Resolved For First Pass

- Transport support: include both stdio and Streamable HTTP because agents vary in what they support.
- Storage: include file and memory stores only.
- Package location: `packages/excalidraw-mcp`.
- Visual resource: optional in first pass; do not block server/tool availability on it.
- Design defaults: source from the current repo defaults where possible, and mirror them in MCP reference text where an agent needs explicit guidance.

## References

- Upstream repository inspected: `https://github.com/excalidraw/excalidraw-mcp`.
- Upstream MCP registration reference: `src/server.ts`.
- Upstream checkpoint reference: `src/checkpoint-store.ts`.
- Local monorepo workspace reference: root `package.json`.
