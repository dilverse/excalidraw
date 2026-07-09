#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import { pathToFileURL } from "node:url";

import { FileCheckpointStore } from "./checkpoint-store.js";
import { createServer } from "./server.js";

export const startStdioServer = async (
  createMcpServer: () => McpServer,
): Promise<void> => {
  await createMcpServer().connect(new StdioServerTransport());
};

export const startStreamableHTTPServer = async (
  createMcpServer: () => McpServer,
  port = Number.parseInt(process.env.PORT ?? "3001", 10),
): Promise<void> => {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("MCP error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Excalidraw MCP server listening on http://localhost:${port}/mcp`);
  });
};

const main = async () => {
  const store = new FileCheckpointStore();
  const createMcpServer = () => createServer(store);

  if (process.argv.includes("--stdio")) {
    await startStdioServer(createMcpServer);
    return;
  }

  await startStreamableHTTPServer(createMcpServer);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
