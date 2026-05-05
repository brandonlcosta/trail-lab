import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeAppManifest } from "./generate-app-manifest.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = Number(process.argv[2] || 8765);
const host = "127.0.0.1";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"]
]);

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(body);
}

function filePathFromRequest(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";

  const filePath = path.resolve(rootDir, `.${pathname}`);
  if (!filePath.startsWith(rootDir)) return null;
  return filePath;
}

await writeAppManifest(rootDir);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    if (url.pathname === "/apps-manifest.json") {
      await writeAppManifest(rootDir);
    }

    const filePath = filePathFromRequest(request.url);
    if (!filePath) {
      send(response, 403, "Forbidden");
      return;
    }

    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      send(response, 404, "Not found");
      return;
    }

    const content = await readFile(filePath);
    const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  } catch {
    send(response, 404, "Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Trail Lab preview running at http://${host}:${port}/index.html`);
});
