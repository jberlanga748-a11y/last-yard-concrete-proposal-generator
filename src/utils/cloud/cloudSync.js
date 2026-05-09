import { isSupabaseConfigured, supabase, supabaseFrontendConfigMessage } from "../../supabaseClient.js";

export function canUseCloudSync(authUser) {
  return Boolean(isSupabaseConfigured && supabase && authUser?.id);
}

export function getCloudSignInMessage(signInLabel = "Sign in to sync proposals, contacts, and settings") {
  if (!isSupabaseConfigured) {
    return supabaseFrontendConfigMessage;
  }

  return signInLabel;
}

export function getCloudReadyMessage(authUser, cloudMessage, localMessage) {
  return canUseCloudSync(authUser) ? cloudMessage : localMessage;
}

export function hasTextValue(value) {
  return String(value ?? "").trim().length > 0;
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

export function createCloudFallbackId(prefix = "cloud") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
