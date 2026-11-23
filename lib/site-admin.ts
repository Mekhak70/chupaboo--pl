import type { User } from "@supabase/supabase-js";

export function isSiteAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.site_admin === true;
}
