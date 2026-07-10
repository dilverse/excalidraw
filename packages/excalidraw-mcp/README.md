# Excalidraw MCP

This workspace package exposes a local MCP server for AI agents that need to create Excalidraw diagrams. It uses the repository's Technical Precision defaults, so generated diagrams use the same colors, fonts, fills, arrowheads, and clean rendering defaults as the app.

## Build

```bash
corepack yarn build:mcp
```

## Run Over Stdio

```bash
corepack yarn build:mcp
node packages/excalidraw-mcp/dist/main.js --stdio
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "excalidraw": {
      "command": "node",
      "args": [
        "/Users/dil/github/excalidraw/packages/excalidraw-mcp/dist/main.js",
        "--stdio"
      ]
    }
  }
}
```

## Run Over Streamable HTTP

```bash
corepack yarn start:mcp
```

The endpoint is:

```text
http://localhost:3001/mcp
```

Set `PORT` to use a different port:

```bash
PORT=3010 corepack yarn --cwd packages/excalidraw-mcp start
```

## Tools

- `read_me`: returns the element format reference and Technical Precision style defaults.
- `create_view`: accepts a JSON array string of Excalidraw elements and returns a `checkpointId`.

New MCP sessions are blank-first: the server does not create a starter diagram, and agents should call `create_view` only after the user asks for a diagram or a concrete edit.

`create_view` supports these pseudo-elements:

- `cameraUpdate`: records viewport framing instructions for clients.
- `restoreCheckpoint`: starts from a previous checkpoint.
- `delete`: removes element ids, including bound text via `containerId`.

## Diagram Defaults

When fields are omitted, the server applies the repo defaults:

- Stroke: `#0c2430`
- Neutral fill: `#f3f3f8`
- MinIO/parity red: `#c8102e`
- Node fill: `#ffdad8`
- Active flow accent: `#007aff`
- Font: Geist
- Code font guidance: JetBrains Mono
- Fill style: solid
- Roughness: `0`
- Arrow end: triangle
- Arrow shape: elbowed

## Local Verification

```bash
corepack yarn test:mcp
corepack yarn build:mcp
```

For an end-to-end local smoke test, start both servers:

```bash
corepack yarn start
corepack yarn start:mcp
```

Then call the MCP server at `http://localhost:3001/mcp` from an MCP-capable agent or client.
