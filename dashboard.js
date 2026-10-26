/** Dashboard display logic and demo values. */
import { $, formatToday, initials, setConnectionStatus, showToast } from "./ui.js";
import { navigateTo } from "./navigation.js";

export function initDashboard() {
  const date = $("#today-date");
  if (date) date.textContent = formatToday();
  $("#demo-banner .notice-dismiss")?.addEventListener("click", () => {
    $("#demo-banner").hidden = true;
  });
}

export function showDashboard({ user, mode }) {
  $("#login-view").hidden = true;
  $("#dashboard-view").hidden = false;

  const schoolName = user.schoolName || "Demo School";
  $("#sidebar-school-name").textContent = schoolName;
  $("#user-name").textContent = user.name || "Library User";
  $("#user-role").textContent = roleLabel(user.role);
  $("#user-avatar").textContent = initials(user.name || "Library User");
  const schoolAvatar = document.querySelector(".school-avatar");
  if (schoolAvatar) schoolAvatar.textContent = initials(schoolName);
  setConnectionStatus(mode === "supabase");

  const banner = $("#demo-banner");
  if (banner) banner.hidden = mode !== "demo";

  const title = $("#page-title");
  if (title) title.textContent = `Good morning, ${(user.name || "Admin").split(" ")[0]}`;
  const date = $("#today-date");
  if (date) date.textContent = formatToday();

  // These are mock metrics. Live database counts should replace them after
  // the schema and secure query functions have been implemented.
  if (mode === "supabase") {
    showToast("Signed in. Live library data is not connected in this starter yet.");
  }
  navigateTo("overview");
}

export function showLogin() {
  $("#dashboard-view").hidden = true;
  $("#login-view").hidden = false;
  $("#email")?.focus();
}

function roleLabel(role) {
  if (role === "admin") return "Library administrator";
  if (role === "librarian") return "Librarian";
  return "Authenticated user";
}
