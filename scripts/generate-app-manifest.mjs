import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const appsDirName = "apps";
const manifestFileName = "apps-manifest.json";

function titleFromSlug(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "suc") return "SUC";
      if (lower === "v6") return "V6";
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function extractTitle(html, fallback) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : fallback;
}

function extractDescription(html) {
  const match = html.match(
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
  );
  return match ? cleanText(match[1]) : "Static field-guide webapp stored in the apps folder.";
}

export async function buildAppManifest(baseDir = rootDir) {
  const appsDir = path.join(baseDir, appsDirName);
  const entries = await readdir(appsDir, { withFileTypes: true });
  const apps = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const slug = entry.name;
    const relativePath = `${appsDirName}/${slug}/index.html`;
    const indexPath = path.join(baseDir, relativePath);

    try {
      const html = await readFile(indexPath, "utf8");
      apps.push({
        id: slug,
        title: extractTitle(html, titleFromSlug(slug)),
        description: extractDescription(html),
        path: relativePath
      });
    } catch {
      // App folders without an index.html are ignored.
    }
  }

  return {
    schemaVersion: 1,
    apps: apps.sort((a, b) => a.title.localeCompare(b.title))
  };
}

export async function writeAppManifest(baseDir = rootDir) {
  const manifest = await buildAppManifest(baseDir);
  const manifestPath = path.join(baseDir, manifestFileName);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const manifest = await writeAppManifest();
  console.log(`Wrote ${manifestFileName} with ${manifest.apps.length} app(s).`);
}
