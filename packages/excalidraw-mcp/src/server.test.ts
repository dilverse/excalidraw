import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { MemoryCheckpointStore } from "./checkpoint-store";
import {
  DEFAULT_EXCALIDRAW_APP_URL,
  createServer,
  EXCALIDRAW_APP_RESOURCE_URI,
  toLocalExcalidrawUrl,
} from "./server";

const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

const withClient = async <T>(
  fn: (client: Client) => Promise<T>,
): Promise<T> => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer(new MemoryCheckpointStore(), {
    defaultSessionId: "server-test",
  });
  const client = new Client({
    name: "excalidraw-mcp-server-test",
    version: "0.0.0",
  });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  try {
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
};

describe("Excalidraw MCP app resource", () => {
  it("builds local Excalidraw app URLs for exported diagrams", () => {
    expect(toLocalExcalidrawUrl("json=abc,key")).toBe(
      `${DEFAULT_EXCALIDRAW_APP_URL}#json=abc,key`,
    );
    expect(toLocalExcalidrawUrl("#json=abc,key", "http://localhost:35673")).toBe(
      "http://localhost:35673/#json=abc,key",
    );
  });

  it("advertises the app resource on create_view", async () => {
    await withClient(async (client) => {
      const { tools } = await client.listTools();
      const createView = tools.find((tool) => tool.name === "create_view");

      expect(createView?._meta).toMatchObject({
        ui: { resourceUri: EXCALIDRAW_APP_RESOURCE_URI },
        "ui/resourceUri": EXCALIDRAW_APP_RESOURCE_URI,
        "openai/outputTemplate": EXCALIDRAW_APP_RESOURCE_URI,
      });
    });
  });

  it("serves the MCP app HTML resource", async () => {
    await withClient(async (client) => {
      const result = await client.readResource({
        uri: EXCALIDRAW_APP_RESOURCE_URI,
      });
      const content = result.contents[0] as any;

      expect(content).toMatchObject({
        uri: EXCALIDRAW_APP_RESOURCE_URI,
        mimeType: MCP_APP_MIME_TYPE,
      });
      expect(content.text).toContain("<title>Excalidraw App</title>");
      expect(content.text).toContain("callServerTool");
      expect(content.text).toContain("#c8102e");
      expect(content.text).toContain("#9a0016");
      expect(content.text).toContain("#ffdad8");
      expect(content.text).toContain("Geist");
      expect(content.text).toContain('format("woff2")');
      expect(content.text).toContain("Open in local Excalidraw");
      expect(content.text).toContain("Open local app");
      expect(content.text).toContain("The host blocked automatic opening");
      expect(content._meta).toMatchObject({
        ui: {
          prefersBorder: true,
          csp: {
            resourceDomains: expect.arrayContaining(["data:"]),
            connectDomains: expect.arrayContaining([
              "https://json-dev.excalidraw.com",
              "https://json.excalidraw.com",
              "http://127.0.0.1:35673",
            ]),
          },
        },
        "openai/widgetPrefersBorder": true,
      });
    });
  });

  it("keeps the previous MCP app resource URI readable", async () => {
    await withClient(async (client) => {
      const result = await client.readResource({
        uri: "ui://excalidraw/mcp-app-professional-v2.html",
      });
      const content = result.contents[0] as any;

      expect(content).toMatchObject({
        uri: "ui://excalidraw/mcp-app-professional-v2.html",
        mimeType: MCP_APP_MIME_TYPE,
      });
      expect(content.text).toContain("Open in local Excalidraw");
    });
  });

  it("supports widget checkpoint round trips", async () => {
    await withClient(async (client) => {
      await client.callTool({
        name: "save_checkpoint",
        arguments: {
          id: "widget_checkpoint",
          data: JSON.stringify({
            elements: [{ type: "rectangle", id: "node" }],
          }),
        },
      });

      const result = await client.callTool({
        name: "read_checkpoint",
        arguments: { id: "widget_checkpoint" },
      });

      expect((result.content?.[0] as any).text).toBe(
        JSON.stringify({
          elements: [{ type: "rectangle", id: "node" }],
        }),
      );
    });
  });
});
