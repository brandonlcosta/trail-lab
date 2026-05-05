const progressBar = document.querySelector("#progressBar");
const topButton = document.querySelector(".top-button");
const navLinks = [...document.querySelectorAll(".section-nav a")];
const navTargets = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const appGrid = document.querySelector("#appGrid");
const appCount = document.querySelector("#appCount");

function updatePageState() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.width = `${Math.min(progress * 100, 100)}%`;
  topButton.classList.toggle("is-visible", window.scrollY > 480);

  let activeId = navTargets[0]?.id;
  for (const target of navTargets) {
    if (target.getBoundingClientRect().top < 150) {
      activeId = target.id;
    }
  }

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${activeId}`);
  });
}

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

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.text();
}

async function appFromIndex(slug, path) {
  const html = await fetchText(path);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent?.trim() || titleFromSlug(slug);
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    "Static field-guide webapp stored in the apps folder.";

  return {
    description,
    path,
    slug,
    title
  };
}

async function appsFromDirectoryListing() {
  const appsUrl = new URL("apps/", window.location.href);
  const html = await fetchText(appsUrl.href);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const slugs = [...doc.querySelectorAll("a[href]")]
    .map((link) => {
      const url = new URL(link.getAttribute("href"), appsUrl);
      if (!url.href.startsWith(appsUrl.href) || url.href === appsUrl.href) return null;
      return decodeURIComponent(url.href.slice(appsUrl.href.length)).split("/")[0];
    })
    .filter((slug) => slug && !slug.startsWith("."));

  return [...new Set(slugs)].map((slug) => ({
    path: `apps/${slug}/index.html`,
    slug
  }));
}

async function appsFromRegistry() {
  const registry = JSON.parse(await fetchText("library.json"));
  return (registry.apps || [])
    .filter((app) => app.appPath?.startsWith("apps/"))
    .map((app) => ({
      path: app.appPath,
      slug: app.id || app.sourceProject || app.appPath.split("/")[1]
    }));
}

async function loadApps() {
  let candidates = [];

  try {
    candidates = await appsFromDirectoryListing();
  } catch {
    candidates = await appsFromRegistry();
  }

  const apps = [];
  for (const candidate of candidates) {
    try {
      apps.push(await appFromIndex(candidate.slug, candidate.path));
    } catch {
      // Missing folders or stale registry entries are intentionally ignored.
    }
  }

  return apps.sort((a, b) => a.title.localeCompare(b.title));
}

function renderApps(apps) {
  appGrid.replaceChildren();
  appCount.textContent = `${apps.length} app${apps.length === 1 ? "" : "s"} found`;

  if (!apps.length) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "No app folders with an index.html were found.";
    appGrid.append(message);
    return;
  }

  apps.forEach((app, index) => {
    const article = document.createElement("article");
    article.className = "app-card";

    const link = document.createElement("a");
    link.href = app.path;

    const number = document.createElement("span");
    number.className = "card-index";
    number.textContent = String(index + 1).padStart(2, "0");

    const content = document.createElement("span");
    content.className = "card-body";

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = app.title;

    const description = document.createElement("span");
    description.className = "card-copy";
    description.textContent = app.description;

    const action = document.createElement("span");
    action.className = "card-action";
    action.textContent = "Open app";

    content.append(title, description, action);
    link.append(number, content);
    article.append(link);
    appGrid.append(article);
  });

  updatePageState();
}

window.addEventListener("scroll", updatePageState, { passive: true });
window.addEventListener("resize", updatePageState);
updatePageState();

topButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

loadApps()
  .then(renderApps)
  .catch(() => {
    appCount.textContent = "Unable to read apps";
    appGrid.innerHTML =
      '<p class="empty-message">Open this site through a static server so the landing page can read the apps folder.</p>';
  });
