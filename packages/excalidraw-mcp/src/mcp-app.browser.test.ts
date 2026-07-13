import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

declare global {
  interface Window {
    __hostEvents?: Array<{
      id?: string | number;
      method: string;
      params?: any;
    }>;
    __hostReady?: boolean;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_EXCALIDRAW_URL =
  "http://127.0.0.1:35673/#json=browser-test,local-key";

const TOOL_ELEMENTS = [
  {
    id: "minio-box",
    type: "rectangle",
    role: "minio",
    x: 240,
    y: 120,
    width: 320,
    height: 82,
    label: { text: "MinIO" },
  },
  {
    id: "minio-to-erasure",
    type: "arrow",
    x: 400,
    y: 202,
    points: [
      [0, 0],
      [0, 92],
    ],
  },
  {
    id: "erasure-set",
    type: "rectangle",
    role: "erasureSet",
    x: 240,
    y: 294,
    width: 320,
    height: 78,
    label: { text: "ERASURE SET" },
  },
];

const findChromeExecutable = () => {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(candidate));
};

const widgetHarnessHtml = (
  openLinkResult: "success" | "blocked",
) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
      }

      iframe {
        border: 0;
        display: block;
        width: 960px;
        height: 720px;
      }
    </style>
    <script>
      window.__hostEvents = [];
      window.__hostReady = false;
      const localExcalidrawUrl = ${JSON.stringify(LOCAL_EXCALIDRAW_URL)};
      const toolElements = ${JSON.stringify(TOOL_ELEMENTS)};
      const openLinkResult = ${JSON.stringify(openLinkResult)};

      const postToWidget = (message) => {
        const iframe = document.getElementById("widget");
        iframe.contentWindow.postMessage(message, "*");
      };

      window.addEventListener("message", (event) => {
        const message = event.data;

        if (!message || message.jsonrpc !== "2.0") {
          return;
        }

        window.__hostEvents.push({
          id: message.id,
          method: message.method,
          params: message.params,
        });

        const reply = (result) => {
          if (message.id === undefined || event.source == null) {
            return;
          }

          event.source.postMessage(
            { jsonrpc: "2.0", id: message.id, result },
            "*",
          );
        };

        if (message.method === "ui/initialize") {
          reply({
            protocolVersion: message.params.protocolVersion,
            hostInfo: { name: "browser-test-host", version: "1.0.0" },
            hostCapabilities: {
              openLinks: {},
              serverTools: {},
              logging: {},
            },
            hostContext: {
              displayMode: "inline",
              availableDisplayModes: ["inline", "fullscreen"],
              containerDimensions: { width: 960, height: 720 },
              platform: "desktop",
            },
          });
          return;
        }

        if (message.method === "ui/notifications/initialized") {
          window.__hostReady = true;
          setTimeout(() => {
            postToWidget({
              jsonrpc: "2.0",
              method: "ui/notifications/tool-input",
              params: {
                arguments: { elements: JSON.stringify(toolElements) },
              },
            });
            postToWidget({
              jsonrpc: "2.0",
              method: "ui/notifications/tool-result",
              params: {
                structuredContent: { checkpointId: "browser-checkpoint" },
              },
            });
          }, 100);
          return;
        }

        if (message.method === "tools/call") {
          reply({
            content: [{ type: "text", text: localExcalidrawUrl }],
            isError: false,
          });
          return;
        }

        if (message.method === "ui/open-link") {
          reply(openLinkResult === "blocked" ? { isError: true } : {});
          return;
        }

        if (message.method === "ui/request-display-mode") {
          reply({ mode: "fullscreen" });
          return;
        }

        reply({});
      });
    </script>
  </head>
  <body>
    <iframe id="widget" src="/widget"></iframe>
  </body>
</html>`;

const startHarnessServer = async () => {
  const widgetHtml = await readFile(
    resolve(__dirname, "assets/mcp-app.html"),
    "utf8",
  );

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (url.pathname === "/widget") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(widgetHtml);
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      widgetHarnessHtml(
        url.searchParams.get("openLink") === "blocked" ? "blocked" : "success",
      ),
    );
  });

  await new Promise<void>((resolveServer) => server.listen(0, resolveServer));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not bind browser test harness server.");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
};

const getWidgetFrame = async (page: Page) => {
  await page.waitForFunction(() => window.__hostReady === true, {
    timeout: 15_000,
  });

  const frame = page
    .frames()
    .find((candidate) => candidate.url().endsWith("/widget"));

  if (!frame) {
    throw new Error("MCP widget iframe did not load.");
  }

  await frame.waitForFunction(
    () =>
      [...document.querySelectorAll("text")].some((text) =>
        text.textContent?.includes("MinIO"),
      ),
    { timeout: 15_000 },
  );

  return frame;
};

const clickWidgetButton = async (page: Page, title: string) => {
  const frame = await getWidgetFrame(page);

  await frame.waitForSelector(`button[title="${title}"]`, {
    timeout: 15_000,
  });
  await frame.$eval(`button[title="${title}"]`, (button) => {
    (button as HTMLButtonElement).click();
  });

  await frame.waitForFunction(
    () =>
      document
        .querySelector(".export-modal-title")
        ?.textContent?.includes("Local Excalidraw link ready"),
    { timeout: 15_000 },
  );

  return frame;
};

const getHostEvents = async (page: Page) =>
  page.evaluate(
    () =>
      window.__hostEvents as Array<{
        id?: string | number;
        method: string;
        params?: any;
      }>,
  );

const getLatestExportedScene = async (page: Page) => {
  const events = await getHostEvents(page);
  const toolCalls = events.filter(
    (event) =>
      event.method === "tools/call" &&
      event.params?.name === "export_to_excalidraw",
  );
  const latestCall = toolCalls.at(-1);

  if (!latestCall) {
    throw new Error("No export_to_excalidraw tool call was recorded.");
  }

  return JSON.parse(latestCall.params.arguments.json);
};

const expectLocalLinkModal = async (
  frame: Awaited<ReturnType<typeof getWidgetFrame>>,
) => {
  const href = await frame.$eval(
    "a.export-modal-confirm",
    (anchor) => (anchor as HTMLAnchorElement).href,
  );
  expect(href).toBe(LOCAL_EXCALIDRAW_URL);

  const modalText = await frame.$eval(".export-modal-text", (element) =>
    element.textContent?.trim(),
  );
  expect(modalText).toContain("If a tab did not open");
};

describe("MCP app browser integration", () => {
  let browser: Browser;
  let harness: Awaited<ReturnType<typeof startHarnessServer>>;

  beforeAll(async () => {
    const executablePath = findChromeExecutable();

    if (!executablePath) {
      throw new Error(
        "Chrome/Chromium is required for MCP browser integration tests. Set CHROME_BIN or PUPPETEER_EXECUTABLE_PATH.",
      );
    }

    harness = await startHarnessServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
    if (harness?.server) {
      await new Promise<void>((resolveServer) =>
        (harness.server as Server).close(() => resolveServer()),
      );
    }
  });

  it("always exposes a local Excalidraw link after Open, even when the host open-link request reports success", async () => {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window.open = () => null;
    });

    try {
      await page.goto(`${harness.url}/`, { waitUntil: "load" });
      const frame = await clickWidgetButton(page, "Open in local Excalidraw");

      await expectLocalLinkModal(frame);

      const events = await getHostEvents(page);
      expect(
        events.some(
          (event) =>
            event.method === "ui/open-link" &&
            event.params?.url === LOCAL_EXCALIDRAW_URL,
        ),
      ).toBe(true);

      const exportedScene = await getLatestExportedScene(page);
      const minioBox = exportedScene.elements.find(
        (element: any) =>
          element.type === "rectangle" && element.backgroundColor === "#c8102e",
      );
      const textElements = exportedScene.elements.filter(
        (element: any) => element.type === "text",
      );

      expect(minioBox).toMatchObject({
        strokeColor: "#9a0016",
        fillStyle: "solid",
        roughness: 0,
      });
      expect(
        exportedScene.elements.some(
          (element: any) =>
            element.type === "arrow" && element.endArrowhead === "triangle",
        ),
      ).toBe(true);
      expect(textElements.length).toBeGreaterThan(0);
      expect(
        textElements.every((element: any) => element.fontFamily === 11),
      ).toBe(true);
      expect(
        textElements.some(
          (element: any) =>
            element.text === "MinIO" && element.strokeColor === "#ffffff",
        ),
      ).toBe(true);

      const geistLoaded = await frame.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check("400 20px Geist");
      });
      expect(geistLoaded).toBe(true);
    } finally {
      await page.close();
    }
  }, 30_000);

  it("routes Edit to the local Excalidraw export path instead of the embedded fullscreen editor", async () => {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window.open = () => null;
    });

    try {
      await page.goto(`${harness.url}/?openLink=blocked`, {
        waitUntil: "load",
      });
      const frame = await clickWidgetButton(page, "Edit in local Excalidraw");

      await expectLocalLinkModal(frame);

      const events = await getHostEvents(page);
      expect(
        events.filter((event) => event.method === "tools/call"),
      ).toHaveLength(1);
      expect(
        events.some((event) => event.method === "ui/request-display-mode"),
      ).toBe(false);
      expect(
        events.some(
          (event) =>
            event.method === "ui/open-link" &&
            event.params?.url === LOCAL_EXCALIDRAW_URL,
        ),
      ).toBe(true);
    } finally {
      await page.close();
    }
  }, 30_000);
});
