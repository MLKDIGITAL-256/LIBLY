/**
 * Supabase client setup.
 * The CDN import is used so this plain HTML/CSS/JS starter needs no build tool.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG, isSupabaseConfigured } from "./config.js";

let client = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return client;
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return { session: null, error: null };
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error };
}

export async function signInWithPassword(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured yet. Use demo preview or add your project URL and publishable key in js/config.js.") };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}
