/** Shared UI helpers: dates, notices, toast messages and navigation display. */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function showToast(message) {
  const region = $("#toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

export function setCurrentYear() {
  $all("[data-current-year]").forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });
}

export function formatToday(date = new Date(), locale = "en-UG") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Kampala"
  }).format(date);
}

export function formatDate(dateValue, locale = "en-UG") {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Kampala"
  }).format(date);
}

export function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export function setConnectionStatus(isConnected) {
  const label = $("#connection-label");
  const dot = document.querySelector(".status-dot");
  if (label) label.textContent = isConnected ? "Supabase connected" : "Demo mode";
  if (dot) {
    dot.style.background = isConnected ? "#19815a" : "#d6ac5b";
    dot.style.boxShadow = isConnected ? "0 0 0 3px #e5f5ee" : "0 0 0 3px #fbf4e6";
  }
}

export function setLoginError(message = "") {
  const error = $("#login-error");
  if (!error) return;
  error.textContent = message;
  error.hidden = !message;
}

export function setFeedback(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.className = `form-feedback ${type}`;
  element.hidden = !message;
}
