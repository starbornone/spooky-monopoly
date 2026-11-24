import { createClient } from "@supabase/supabase-js";

export function getStatsDatabase() {
  const projectId = process.env.NEXT_HALLOWOPOLY_SUPABASE_PROJECT_ID;
  const key = process.env.NEXT_HALLOWOPOLY_SUPABASE_KEY;

  if (!projectId || !key) return null;

  return createClient(`https://${projectId}.supabase.co`, key);
}
