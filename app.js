/** Application entry point. Keep feature-specific logic in its own module. */
import { initAuth, signOut } from "./auth.js";
import { initNavigation } from "./navigation.js";
import { initDashboard, showDashboard, showLogin } from "./dashboard.js";
import { initCirculationDemo } from "./circulation-demo.js";
import { setCurrentYear, $ } from "./ui.js";
import { getCurrentSession, getSupabaseClient } from "./supabase-client.js";

let currentAuthContext = { mode: "demo" };

async function startApp() {
  setCurrentYear();
  initNavigation();
  initDashboard();
  initCirculationDemo();

  initAuth({
    onLogin: context => {
      currentAuthContext = context;
      showDashboard(context);
    }
  });

  $("#sign-out-button")?.addEventListener("click", async () => {
    await signOut(currentAuthContext);
    currentAuthContext = { mode: "demo" };
    showLogin();
  });

  // If a real Supabase session exists, restore the signed-in shell.
  // The user's school and role must still be loaded from trusted profile data
  // and verified by RLS before live school data is displayed.
  if (getSupabaseClient()) {
    const { session, error } = await getCurrentSession();
    if (error) console.error("Could not restore Supabase session:", error.message);
    if (session?.user) {
      currentAuthContext = {
        mode: "supabase",
        user: {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Library User",
          email: session.user.email,
          role: "user",
          schoolName: "Your school"
        }
      };
      showDashboard(currentAuthContext);
    }
  }
}

startApp().catch(error => {
  console.error("Application failed to start:", error);
});
