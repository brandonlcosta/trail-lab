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

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.text();
}

async function loadApps() {
  const manifest = JSON.parse(await fetchText("apps-manifest.json"));
  return (manifest.apps || [])
    .filter((app) => app.path?.startsWith("apps/") && app.title)
    .sort((a, b) => a.title.localeCompare(b.title));
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
    appCount.textContent = "Unable to read manifest";
    appGrid.innerHTML =
      '<p class="empty-message">Run the app manifest generator, then refresh this page.</p>';
  });
