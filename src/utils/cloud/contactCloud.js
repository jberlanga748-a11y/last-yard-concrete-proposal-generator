import { supabase } from "../../supabaseClient.js";
import { createCloudFallbackId, isPlainObject, isUuid } from "./cloudSync.js";

function normalizeContactForCloud(contact = {}, deps = {}) {
  if (deps.normalizeContact) {
    return deps.normalizeContact(contact);
  }

  const now = new Date().toISOString();
  return {
    id: contact.id || createCloudFallbackId("contact"),
    companyName: contact.companyName || "",
    contactName: contact.contactName || "",
    phone: contact.phone || "",
    email: contact.email || "",
    billingAddress: contact.billingAddress || contact.address || "",
    defaultProjectAddress: contact.defaultProjectAddress || contact.projectAddress || "",
    contactType: contact.contactType || "",
    notes: contact.notes || "",
    createdAt: contact.createdAt || now,
    updatedAt: contact.updatedAt || now,
  };
}

export async function loadOrSeedCloudContacts(companyId, localContacts = [], deps = {}) {
  const cloudContacts = await fetchCloudContacts(companyId, deps);

  if (cloudContacts.length > 0) {
    return {
      contacts: cloudContacts,
      message: `Loaded ${cloudContacts.length} cloud contact${cloudContacts.length === 1 ? "" : "s"}.`,
    };
  }

  const normalizedContacts = localContacts.filter(isPlainObject).map((contact) => normalizeContactForCloud(contact, deps));

  if (normalizedContacts.length > 0) {
    await replaceCloudContacts(companyId, normalizedContacts, deps);

    return {
      contacts: normalizedContacts,
      message: `Seeded ${normalizedContacts.length} local contact${normalizedContacts.length === 1 ? "" : "s"} to Supabase.`,
    };
  }

  return {
    contacts: [],
    message: "No cloud contacts found yet.",
  };
}

export async function fetchCloudContacts(companyId, deps = {}) {
  const { data, error } = await supabase
    .from("contacts")
    .select("id,contact_data,created_at,updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeCloudContactRow(row, deps));
}

export async function replaceCloudContacts(companyId, contacts = [], deps = {}) {
  const { error: deleteError } = await supabase.from("contacts").delete().eq("company_id", companyId);

  if (deleteError) {
    throw deleteError;
  }

  const rows = contacts.filter(isPlainObject).map((contact) => createCloudContactRow(companyId, contact, deps));

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("contacts").insert(rows).select("id,contact_data,created_at,updated_at");

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeCloudContactRow(row, deps));
}

export async function saveCloudContact(companyId, contact, deps = {}) {
  const row = createCloudContactRow(companyId, contact, deps);

  if (row.id) {
    const { error } = await supabase.from("contacts").upsert(row, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("contacts").insert(row);

  if (error) {
    throw error;
  }
}

export async function deleteCloudContact(companyId, contactId) {
  if (!isUuid(contactId)) {
    return;
  }

  const { error } = await supabase.from("contacts").delete().eq("company_id", companyId).eq("id", contactId);

  if (error) {
    throw error;
  }
}

function createCloudContactRow(companyId, contact, deps = {}) {
  const normalizedContact = normalizeContactForCloud(contact, deps);
  const row = {
    company_id: companyId,
    contact_data: normalizedContact,
  };

  if (isUuid(normalizedContact.id)) {
    row.id = normalizedContact.id;
  }

  return row;
}

function normalizeCloudContactRow(row = {}, deps = {}) {
  return normalizeContactForCloud(
    {
      ...(isPlainObject(row.contact_data) ? row.contact_data : {}),
      id: row.contact_data?.id || row.id,
      createdAt: row.contact_data?.createdAt || row.created_at,
      updatedAt: row.contact_data?.updatedAt || row.updated_at,
    },
    deps,
  );
}
