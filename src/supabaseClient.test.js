import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveSupabaseFrontendConfig, supabaseFrontendConfigMessage } from "./supabaseClient.js";

const supabaseClientSource = readFileSync(new URL("./supabaseClient.js", import.meta.url), "utf8");
const viteConfigSource = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
const customerPortalApiSource = readFileSync(new URL("../api/customer-proposal.js", import.meta.url), "utf8");

test("frontend Supabase config works with VITE Supabase env vars", () => {
  const config = resolveSupabaseFrontendConfig({
    VITE_SUPABASE_URL: " https://vite-project.supabase.co ",
    VITE_SUPABASE_ANON_KEY: " vite-anon-key ",
  });

  assert.equal(config.configured, true);
  assert.equal(config.supabaseUrl, "https://vite-project.supabase.co");
  assert.equal(config.supabasePublicKey, "vite-anon-key");
});

test("frontend Supabase config works with NEXT_PUBLIC anon key env vars", () => {
  const config = resolveSupabaseFrontendConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://next-public-project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "next-public-anon-key",
  });

  assert.equal(config.configured, true);
  assert.equal(config.supabaseUrl, "https://next-public-project.supabase.co");
  assert.equal(config.supabasePublicKey, "next-public-anon-key");
});

test("frontend Supabase config works with NEXT_PUBLIC publishable key env vars", () => {
  const config = resolveSupabaseFrontendConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://publishable-project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  });

  assert.equal(config.configured, true);
  assert.equal(config.supabaseUrl, "https://publishable-project.supabase.co");
  assert.equal(config.supabasePublicKey, "publishable-key");
});

test("frontend Supabase config missing is detected safely", () => {
  const config = resolveSupabaseFrontendConfig({});

  assert.equal(config.configured, false);
  assert.equal(config.supabaseUrl, "");
  assert.equal(config.supabasePublicKey, "");
  assert.equal(
    supabaseFrontendConfigMessage,
    "Supabase frontend config missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
});

test("frontend Supabase client uses only public keys and lets Supabase JS send apikey headers", () => {
  const config = resolveSupabaseFrontendConfig({
    VITE_SUPABASE_URL: "https://project.supabase.co",
    VITE_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "server-secret",
    SUPABASE_SECRET_KEY: "server-secret",
  });

  assert.equal(config.configured, true);
  assert.equal(config.supabasePublicKey, "anon-key");
  assert.match(supabaseClientSource, /createClient\(supabaseUrl,\s*supabasePublicKey\)/);
  assert.doesNotMatch(supabaseClientSource, /SERVICE_ROLE|SUPABASE_SECRET|POSTGRES/);
});

test("Vite exposes VITE and NEXT_PUBLIC prefixes only", () => {
  assert.match(viteConfigSource, /envPrefix:\s*\[\s*"VITE_",\s*"NEXT_PUBLIC_"\s*\]/);
  assert.doesNotMatch(viteConfigSource, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|POSTGRES/);
});

test("customer portal server route still uses only server-side service role config", () => {
  assert.match(customerPortalApiSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(customerPortalApiSource, /SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(customerPortalApiSource, /import\.meta\.env/);
  assert.doesNotMatch(customerPortalApiSource, /VITE_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});
