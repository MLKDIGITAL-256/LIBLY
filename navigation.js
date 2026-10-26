/** Sidebar navigation and mobile navigation behaviour. */
import { $, $all, showToast } from "./ui.js";

const pageMeta = {
  overview: { title: "Overview", eyebrow: "LIBRARY OVERVIEW", heading: "Good morning", description: "Here's what's happening in your library today." },
  catalogue: { title: "Book catalogue", eyebrow: "LIBRARY COLLECTION", heading: "Book catalogue", description: "Organise titles, copies, categories and shelf locations." },
  students: { title: "Students", eyebrow: "READER DIRECTORY", heading: "Student records", description: "Find students and review their library activity." },
  circulation: { title: "Borrow & return", eyebrow: "CIRCULATION DESK", heading: "Borrow & return", description: "Record loans and returns with a clear audit trail." },
  reports: { title: "Reports", eyebrow: "LIBRARY INSIGHTS", heading: "Library reports", description: "Review overdue loans, stock and circulation trends." },
  activity: { title: "Activity log", eyebrow: "ACCOUNTABILITY", heading: "Activity log", description: "Review user actions and transaction history." }
};

export function initNavigation() {
  $all("[data-page]").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.page));
  });
  $all("[data-navigate]").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.navigate));
  });
  $all("[data-toast]").forEach(button => {
    button.addEventListener("click", () => showToast(button.dataset.toast));
  });

  $("#mobile-menu-button")?.addEventListener("click", toggleMobileSidebar);
  document.addEventListener("click", event => {
    const sidebar = $("#sidebar");
    const menuButton = $("#mobile-menu-button");
    if (!sidebar?.classList.contains("is-open")) return;
    if (!sidebar.contains(event.target) && !menuButton?.contains(event.target)) closeMobileSidebar();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMobileSidebar();
  });
}

export function navigateTo(pageName) {
  if (!pageMeta[pageName]) return;
  $all("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== pageName; });
  $all("[data-page]").forEach(button => {
    const active = button.dataset.page === pageName;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const meta = pageMeta[pageName];
  const breadcrumb = $("#breadcrumb-current");
  const title = $("#page-title");
  const eyebrow = $("#page-eyebrow");
  const description = $("#page-description");
  if (breadcrumb) breadcrumb.textContent = meta.title;
  if (title) {
    title.textContent = meta.heading;
    if (pageName === "overview") {
      const name = $("#user-name")?.textContent || "Admin";
      title.textContent = `Good morning, ${name.split(" ")[0]}`;
    }
  }
  if (eyebrow) eyebrow.textContent = meta.eyebrow;
  if (description) description.textContent = meta.description;
  closeMobileSidebar();
  $("#main-content")?.focus({ preventScroll: true });
}

function toggleMobileSidebar() {
  const sidebar = $("#sidebar");
  const button = $("#mobile-menu-button");
  const open = !sidebar?.classList.contains("is-open");
  sidebar?.classList.toggle("is-open", open);
  button?.setAttribute("aria-expanded", String(open));
  button?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
}

function closeMobileSidebar() {
  $("#sidebar")?.classList.remove("is-open");
  $("#mobile-menu-button")?.setAttribute("aria-expanded", "false");
  $("#mobile-menu-button")?.setAttribute("aria-label", "Open navigation");
}
