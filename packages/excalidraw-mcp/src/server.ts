import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  FileCheckpointStore,
  type CheckpointStore,
} from "./checkpoint-store.js";
import { createViewFromElementsInput, CreateViewError } from "./create-view.js";
import { TECHNICAL_PRECISION_REFERENCE } from "./technical-precision-reference.js";

const textResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

const errorResult = (text: string): CallToolResult => ({
  ...textResult(text),
  isError: true,
});

export const EXCALIDRAW_APP_RESOURCE_URI =
  "ui://excalidraw/mcp-app-professional-v3.html";
const LEGACY_EXCALIDRAW_APP_RESOURCE_URIS = [
  "ui://excalidraw/mcp-app-professional-v2.html",
];
const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";
const MAX_EXPORT_BYTES = 5 * 1024 * 1024;
export const DEFAULT_EXCALIDRAW_APP_URL = "http://127.0.0.1:35673/";
const DEFAULT_EXCALIDRAW_APP_ORIGIN = new URL(DEFAULT_EXCALIDRAW_APP_URL)
  .origin;
export const DEFAULT_EXCALIDRAW_BACKEND_V2_POST_URL =
  "https://json.excalidraw.com/api/v2/post/";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const appHtmlPath = path.join(serverDir, "assets", "mcp-app.html");

export type ServerSessionOptions = {
  defaultSessionId?: string;
};

const getSessionStore = (
  store: CheckpointStore,
  sessionId: string | undefined,
) => {
  if (!sessionId || !store.forSession) {
    return store;
  }

  return store.forSession(sessionId);
};

const readAppHtml = () => fs.readFile(appHtmlPath, "utf8");

export const toLocalExcalidrawUrl = (
  hash: string,
  appUrl = process.env.EXCALIDRAW_APP_URL ?? DEFAULT_EXCALIDRAW_APP_URL,
) => {
  const url = new URL(appUrl);
  url.search = "";
  url.hash = hash.startsWith("#") ? hash.slice(1) : hash;

  return url.toString();
};

const appToolMeta = (resourceUri = EXCALIDRAW_APP_RESOURCE_URI) => ({
  ui: { resourceUri },
  "ui/resourceUri": resourceUri,
  "openai/outputTemplate": resourceUri,
});

const appOnlyToolMeta = {
  ui: { visibility: ["app"] },
};

const appResourceMeta = {
  ui: {
    prefersBorder: true,
    csp: {
      resourceDomains: ["https://esm.sh", "data:"],
      connectDomains: [
        "https://esm.sh",
        "https://json-dev.excalidraw.com",
        "https://json.excalidraw.com",
        DEFAULT_EXCALIDRAW_APP_ORIGIN,
      ],
    },
    permissions: { clipboardWrite: {} },
  },
  "openai/widgetDescription":
    "Interactive Excalidraw diagram viewer with Technical Precision defaults.",
  "openai/widgetPrefersBorder": true,
  "openai/widgetCSP": {
    resource_domains: ["https://esm.sh", "data:"],
    connect_domains: [
      "https://esm.sh",
      "https://json-dev.excalidraw.com",
      "https://json.excalidraw.com",
      DEFAULT_EXCALIDRAW_APP_ORIGIN,
    ],
  },
};

const concatBuffers = (...buffers: Uint8Array[]) => {
  let total = 4;

  for (const buffer of buffers) {
    total += 4 + buffer.length;
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 1);

  let offset = 4;

  for (const buffer of buffers) {
    view.setUint32(offset, buffer.length);
    offset += 4;
    out.set(buffer, offset);
    offset += buffer.length;
  }

  return out;
};

const exportToExcalidraw = async (json: string) => {
  const encoder = new TextEncoder();
  const fileMetadata = encoder.encode(JSON.stringify({}));
  const dataBytes = encoder.encode(json);
  const innerPayload = concatBuffers(fileMetadata, dataBytes);
  const compressed = deflateSync(Buffer.from(innerPayload));
  const compressedBytes = compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength,
  ) as ArrayBuffer;

  const cryptoKey = await globalThis.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 128 },
    true,
    ["encrypt"],
  );
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    compressedBytes,
  );
  const encodingMeta = encoder.encode(
    JSON.stringify({
      version: 2,
      compression: "pako@1",
      encryption: "AES-GCM",
    }),
  );
  const payload = Buffer.from(
    concatBuffers(encodingMeta, iv, new Uint8Array(encrypted)),
  );
  const response = await fetch(
    process.env.EXCALIDRAW_BACKEND_V2_POST_URL ??
      DEFAULT_EXCALIDRAW_BACKEND_V2_POST_URL,
    {
      method: "POST",
      body: payload,
    },
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const { id } = (await response.json()) as { id?: string };
  const jwk = await globalThis.crypto.subtle.exportKey("jwk", cryptoKey);

  if (!id || !jwk.k) {
    throw new Error("Upload did not return a usable Excalidraw share id");
  }

  return toLocalExcalidrawUrl(`json=${id},${jwk.k}`);
};

export const registerTools = (
  server: McpServer,
  store: CheckpointStore,
  options: ServerSessionOptions = {},
) => {
  for (const resourceUri of [
    EXCALIDRAW_APP_RESOURCE_URI,
    ...LEGACY_EXCALIDRAW_APP_RESOURCE_URIS,
  ]) {
    server.registerResource(
      "Excalidraw MCP App",
      resourceUri,
      {
        mimeType: MCP_APP_MIME_TYPE,
        description: "Interactive Excalidraw MCP app resource.",
        _meta: appResourceMeta,
      },
      async (): Promise<ReadResourceResult> => ({
        contents: [
          {
            uri: resourceUri,
            mimeType: MCP_APP_MIME_TYPE,
            text: await readAppHtml(),
            _meta: appResourceMeta,
          },
        ],
      }),
    );
  }

  server.registerTool(
    "read_me",
    {
      description:
        "Returns the Excalidraw element format reference and Technical Precision style defaults. Call once before create_view.",
      annotations: { readOnlyHint: true },
    },
    async () => textResult(TECHNICAL_PRECISION_REFERENCE),
  );

  server.registerTool(
    "create_view",
    {
      title: "Draw Excalidraw Diagram",
      description:
        "Creates or updates an Excalidraw diagram from a JSON array string and returns a checkpoint id for later edits.",
      inputSchema: {
        elements: z
          .string()
          .describe(
            "JSON array string of Excalidraw elements. Supports cameraUpdate, restoreCheckpoint, and delete pseudo-elements.",
          ),
      },
      annotations: { readOnlyHint: true },
      _meta: appToolMeta(),
    },
    async ({ elements }, extra): Promise<CallToolResult> => {
      try {
        const sessionStore = getSessionStore(
          store,
          extra.sessionId ?? options.defaultSessionId,
        );
        const result = await createViewFromElementsInput(
          elements,
          sessionStore,
        );
        const warningText = result.warnings.length
          ? `\nWarnings:\n- ${result.warnings.join("\n- ")}`
          : "";

        return {
          content: [
            {
              type: "text",
              text: `Diagram checkpoint created: "${result.checkpointId}". Start a future edit with [{"type":"restoreCheckpoint","id":"${result.checkpointId}"}, ...newElements].${warningText}`,
            },
          ],
          structuredContent: {
            checkpointId: result.checkpointId,
            elements: result.elements,
          },
        };
      } catch (error) {
        if (error instanceof CreateViewError) {
          return errorResult(error.message);
        }

        return errorResult(
          `Failed to create diagram: ${(error as Error).message}`,
        );
      }
    },
  );

  server.registerTool(
    "save_checkpoint",
    {
      description: "Private app tool for saving user-edited Excalidraw state.",
      inputSchema: {
        id: z.string(),
        data: z.string(),
      },
      _meta: appOnlyToolMeta,
    },
    async ({ id, data }, extra): Promise<CallToolResult> => {
      if (Buffer.byteLength(data, "utf8") > MAX_EXPORT_BYTES) {
        return errorResult(
          `Checkpoint data exceeds ${MAX_EXPORT_BYTES} byte limit`,
        );
      }

      try {
        const sessionStore = getSessionStore(
          store,
          extra.sessionId ?? options.defaultSessionId,
        );
        await sessionStore.save(id, JSON.parse(data));
        return textResult("ok");
      } catch (error) {
        return errorResult(`save failed: ${(error as Error).message}`);
      }
    },
  );

  server.registerTool(
    "read_checkpoint",
    {
      description:
        "Private app tool for reading a saved Excalidraw checkpoint.",
      inputSchema: {
        id: z.string(),
      },
      annotations: { readOnlyHint: true },
      _meta: appOnlyToolMeta,
    },
    async ({ id }, extra): Promise<CallToolResult> => {
      try {
        const sessionStore = getSessionStore(
          store,
          extra.sessionId ?? options.defaultSessionId,
        );
        const data = await sessionStore.load(id);

        return textResult(data ? JSON.stringify(data) : "");
      } catch (error) {
        return errorResult(`read failed: ${(error as Error).message}`);
      }
    },
  );

  server.registerTool(
    "export_to_excalidraw",
    {
      description:
        "Private app tool for opening a diagram in the local Excalidraw app server.",
      inputSchema: {
        json: z.string(),
      },
      _meta: appOnlyToolMeta,
    },
    async ({ json }): Promise<CallToolResult> => {
      if (Buffer.byteLength(json, "utf8") > MAX_EXPORT_BYTES) {
        return errorResult(
          `Export data exceeds ${MAX_EXPORT_BYTES} byte limit`,
        );
      }

      try {
        return textResult(await exportToExcalidraw(json));
      } catch (error) {
        return errorResult(`Export failed: ${(error as Error).message}`);
      }
    },
  );
};

export const createServer = (
  store: CheckpointStore = new FileCheckpointStore(),
  options: ServerSessionOptions = {},
) => {
  const server = new McpServer({
    name: "Excalidraw Technical Precision",
    version: "0.1.0",
  });

  registerTools(server, store, options);

  return server;
};
