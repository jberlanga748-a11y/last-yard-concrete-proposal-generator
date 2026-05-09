import { createClient } from "@supabase/supabase-js";

const supabaseEnv = import.meta.env || {};
const supabaseFrontendConfig = resolveSupabaseFrontendConfig(supabaseEnv);
const supabaseUrl = supabaseFrontendConfig.supabaseUrl;
const supabasePublicKey = supabaseFrontendConfig.supabasePublicKey;

export const supabaseFrontendConfigMessage =
  "Supabase frontend config missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

export const isSupabaseConfigured = supabaseFrontendConfig.configured;

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabasePublicKey) : null;

export function resolveSupabaseFrontendConfig(env = {}) {
  const supabaseUrl = firstNonEmptyEnvValue(env.VITE_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL);
  const supabasePublicKey = firstNonEmptyEnvValue(
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return {
    configured: Boolean(supabaseUrl && supabasePublicKey),
    supabasePublicKey,
    supabaseUrl,
  };
}

function firstNonEmptyEnvValue(...values) {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}
