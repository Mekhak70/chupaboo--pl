import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_POLAND_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_POLAND_SUPABASE_PUBLISHABLE_KEY;

export const polandAdminConfigured = Boolean(url && key);
export const polandCatalogEnabled = polandAdminConfigured && process.env.NEXT_PUBLIC_POLAND_MANAGED_CATALOG === "true";

export const polandSupabase = createClient(
  url || "https://unconfigured.invalid",
  key || "unconfigured",
  { auth: { storageKey: "chupaboo-pl-auth" } },
);
