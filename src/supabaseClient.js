import { createClient } from "@supabase/supabase-js";

const supabaseEnv = import.meta.env || {};
const supabaseUrl = supabaseEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = supabaseEnv.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
