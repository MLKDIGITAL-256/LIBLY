/**
 * Authentication and demo preview.
 * Demo mode is intentionally local-only; it does not grant database access.
 */
import { $, setLoginError, showToast } from "./ui.js";
import { isSupabaseConfigured } from "./config.js";
import { signInWithPassword, signOutFromSupabase } from "./supabase-client.js";

let onAuthenticated = () => {};

export function initAuth({ onLogin }) {
  onAuthenticated = onLogin;

  $("#login-form")?.addEventListener("submit", handleLogin);
  $("#toggle-password")?.addEventListener("click", togglePasswordVisibility);

  document.querySelectorAll("[data-demo-role]").forEach(button => {
    button.addEventListener("click", () => {
      const role = button.dataset.demoRole === "admin" ? "admin" : "librarian";
      const user = role === "admin"
        ? { name: "Library Admin", email: "admin@demo.school", role: "admin", schoolName: readSchoolName() }
        : { name: "J. Okello", email: "librarian@demo.school", role: "librarian", schoolName: readSchoolName() };
      onAuthenticated({ user, mode: "demo" });
    });
  });

  const notice = $("#demo-notice");
  if (notice && isSupabaseConfigured()) {
    notice.innerHTML = "<strong>Supabase sign-in enabled</strong><span>Use an account created for your Supabase project. Demo preview is also available below.</span>";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setLoginError("");

  const email = $("#email")?.value.trim() ?? "";
  const password = $("#password")?.value ?? "";
  const schoolName = readSchoolName();

  if (!email || !password) {
    setLoginError("Enter your email address and password, or choose a demo role below.");
    return;
  }

  if (!isSupabaseConfigured()) {
    setLoginError("Supabase is not configured yet. Use a demo preview, or add your project URL and publishable key in js/config.js.");
    return;
  }

  const submitButton = $("#login-form button[type='submit']");
  const originalText = submitButton?.innerHTML;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Signing in…";
  }

  try {
    const { data, error } = await signInWithPassword(email, password);
    if (error) throw error;
    if (!data?.user) throw new Error("Sign-in did not return a user account.");

    // In production, resolve the user's school and role from a protected profile
    // record or trusted server-side function; never accept a role from the browser.
    onAuthenticated({
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || email.split("@")[0],
        email: data.user.email,
        role: "user",
        schoolName
      },
      mode: "supabase"
    });
  } catch (error) {
    setLoginError(error?.message || "Sign-in failed. Check your details and try again.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText || "Sign in";
    }
  }
}

function togglePasswordVisibility() {
  const input = $("#password");
  const button = $("#toggle-password");
  if (!input || !button) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  button.textContent = show ? "Hide" : "Show";
  button.setAttribute("aria-label", show ? "Hide password" : "Show password");
}

function readSchoolName() {
  return $("#school-name")?.value.trim() || "Demo School";
}

export async function signOut({ mode } = {}) {
  if (mode === "supabase") {
    const { error } = await signOutFromSupabase();
    if (error) showToast(`Sign-out issue: ${error.message}`);
  }
}
