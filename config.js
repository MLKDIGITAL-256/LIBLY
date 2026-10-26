/**
 * Public frontend configuration.
 *
 * Add your Supabase project URL and publishable (anon) key here.
 * Never put a service-role key or any secret key in browser code.
 */
export const SUPABASE_CONFIG = Object.freeze({
  url: "https://nujyknfibxrxbnlwival.supabase.co",
  publishableKey: "sb_publishable_4B2NPLGA_yT_YWB2xliNvg_BXpyr2Kj"
});

export const APP_CONFIG = Object.freeze({
  appName: "Library Management System",
  defaultLoanDays: 3,
  timeZone: "Africa/Kampala"
});

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.publishableKey &&
    /^https:\/\/.+/.test(SUPABASE_CONFIG.url)
  );
}
