/*
  shim: pages/lib/supabase.js
  Re-exports the real lib located at the repository root (../.. /lib/supabase).
  This keeps existing relative imports working for files under pages/pages/...
*/
export * from "../../lib/supabase.js";
export { default } from "../../lib/supabase.js";
