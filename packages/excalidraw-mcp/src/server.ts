import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  FileCheckpointStore,
  type CheckpointStore,
} from "./checkpoint-store.js";
import {
  createViewFromElementsInput,
  CreateViewError,
} from "./create-view.js";
import { TECHNICAL_PRECISION_REFERENCE } from "./technical-precision-reference.js";

const textResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

const errorResult = (text: string): CallToolResult => ({
  ...textResult(text),
  isError: true,
});

export const registerTools = (server: McpServer, store: CheckpointStore) => {
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
    },
    async ({ elements }): Promise<CallToolResult> => {
      try {
        const result = await createViewFromElementsInput(elements, store);
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

        return errorResult(`Failed to create diagram: ${(error as Error).message}`);
      }
    },
  );
};

export const createServer = (
  store: CheckpointStore = new FileCheckpointStore(),
) => {
  const server = new McpServer({
    name: "Excalidraw Technical Precision",
    version: "0.1.0",
  });

  registerTools(server, store);

  return server;
};
