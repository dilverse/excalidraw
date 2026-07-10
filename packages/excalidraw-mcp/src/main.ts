#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import { FileCheckpointStore } from "./checkpoint-store.js";
import { createServer } from "./server.js";

export const startStdioServer = async (
  createMcpServer: () => McpServer,
): Promise<void> => {
  await createMcpServer().connect(new StdioServerTransport());
};

export const startStreamableHTTPServer = async (
  createMcpServer: (sessionId?: string) => McpServer,
  port = Number.parseInt(process.env.PORT ?? "3001", 10),
): Promise<void> => {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(
    cors({
      allowedHeaders: [
        "accept",
        "content-type",
        "last-event-id",
        "mcp-session-id",
      ],
      exposedHeaders: ["mcp-session-id"],
    }),
  );

  const sessions = new Map<
    string,
    { server: McpServer; transport: StreamableHTTPServerTransport }
  >();

  const getSessionId = (req: Request) => {
    const header = req.headers["mcp-session-id"];
    return Array.isArray(header) ? header[0] : header;
  };

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const requestSessionId = getSessionId(req);
      const existingSession =
        requestSessionId && sessions.get(requestSessionId);

      if (existingSession) {
        await existingSession.transport.handleRequest(req, res, req.body);
        return;
      }

      if (requestSessionId || !isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid MCP session id provided",
          },
          id: null,
        });
        return;
      }

      let transport: StreamableHTTPServerTransport;
      let server: McpServer;

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          sessions.set(sessionId, { server, transport });
        },
        onsessionclosed: (sessionId) => {
          sessions.delete(sessionId);
        },
      });
      server = createMcpServer();
      transport.onclose = () => {
        const sessionId = transport.sessionId;

        if (sessionId) {
          sessions.delete(sessionId);
        }

        server.close().catch(() => {});
      };

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

  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    const session = sessionId && sessions.get(sessionId);

    if (!session) {
      res.status(400).send("Invalid or missing MCP session id");
      return;
    }

    await session.transport.handleRequest(req, res, req.body);
  };

  app.get("/mcp", handleSessionRequest);
  app.delete("/mcp", handleSessionRequest);

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Excalidraw MCP server listening on http://localhost:${port}/mcp`);
  });
};

const main = async () => {
  const store = new FileCheckpointStore();
  const stdioSessionId =
    process.env.EXCALIDRAW_MCP_SESSION_ID ?? `stdio-${randomUUID()}`;
  const createMcpServer = (sessionId = stdioSessionId) =>
    createServer(store, { defaultSessionId: sessionId });

  if (process.argv.includes("--stdio")) {
    await startStdioServer(() => createMcpServer(stdioSessionId));
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
