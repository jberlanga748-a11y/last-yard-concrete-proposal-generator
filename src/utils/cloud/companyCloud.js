import { SEED_PROPOSAL } from "../../proposalData.js";
import { supabase } from "../../supabaseClient.js";
import { canUseCloudSync, isPlainObject } from "./cloudSync.js";
import { TEAM_INVITE_ROLES, normalizeTeamMember, normalizeTeamRole } from "./teamAccess.js";

function getFallbackCompanySettings() {
  return {
    companyName: SEED_PROPOSAL.company.name,
  };
}

function normalizeSettings(settings, deps = {}) {
  const normalizeCompanySettings = deps.normalizeCompanySettings || ((value) => ({ ...getFallbackCompanySettings(), ...(value || {}) }));
  return normalizeCompanySettings(settings || getFallbackCompanySettings());
}

export async function ensureCloudCompany(user, settings = getFallbackCompanySettings(), deps = {}) {
  if (!canUseCloudSync(user)) {
    throw new Error("Sign in to sync proposals, contacts, and settings.");
  }

  const normalizedSettings = normalizeSettings(settings, deps);
  const email = user.email || "";

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      email,
      id: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  const activeMembership = await claimInvitedMembership(user);

  if (activeMembership?.companyId) {
    const memberCompany = await fetchCloudCompanyById(activeMembership.companyId);

    if (memberCompany?.id) {
      return {
        ...memberCompany,
        role: activeMembership.role,
      };
    }
  }

  const { data: existingCompanies, error: companyLoadError } = await supabase
    .from("companies")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (companyLoadError) {
    throw companyLoadError;
  }

  if (existingCompanies?.length > 0) {
    const ownedCompany = {
      ...existingCompanies[0],
      role: "owner",
    };
    await ensureOwnerCompanyMembership(ownedCompany, user);
    return ownedCompany;
  }

  const { data: createdCompany, error: companyCreateError } = await supabase
    .from("companies")
    .insert({
      name: normalizedSettings.companyName || "Last Yard Concrete LLC",
      owner_id: user.id,
    })
    .select("id,name")
    .single();

  if (companyCreateError) {
    throw companyCreateError;
  }

  const ownedCompany = {
    ...createdCompany,
    role: "owner",
  };
  await ensureOwnerCompanyMembership(ownedCompany, user);
  return ownedCompany;
}

export function isMissingTeamTableError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return error?.code === "42P01" || message.includes("company_members") || message.includes("does not exist");
}

export async function fetchCloudCompanyById(companyId) {
  if (!companyId) {
    return null;
  }

  const { data, error } = await supabase.from("companies").select("id,name,owner_id").eq("id", companyId).maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function claimInvitedMembership(user) {
  const email = String(user?.email || "").trim().toLowerCase();

  if (!email) {
    return null;
  }

  const inviteResult = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .ilike("invite_email", email)
    .eq("status", "invited")
    .order("created_at", { ascending: true })
    .limit(1);

  if (inviteResult.error) {
    if (isMissingTeamTableError(inviteResult.error)) {
      return null;
    }

    throw inviteResult.error;
  }

  const invite = inviteResult.data?.[0];

  if (invite) {
    const { data, error } = await supabase
      .from("company_members")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
        user_id: user.id,
      })
      .eq("id", invite.id)
      .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
      .single();

    if (error) {
      if (isMissingTeamTableError(error)) {
        return null;
      }

      throw error;
    }

    return normalizeTeamMember(data);
  }

  const activeResult = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  if (activeResult.error) {
    if (isMissingTeamTableError(activeResult.error)) {
      return null;
    }

    throw activeResult.error;
  }

  if (activeResult.data?.length > 0) {
    return normalizeTeamMember(activeResult.data[0]);
  }

  return null;
}

export async function ensureOwnerCompanyMembership(companyRecord, user) {
  if (!companyRecord?.id || !user?.id) {
    return null;
  }

  const email = String(user.email || "").trim().toLowerCase();
  const { data: existingRows, error: loadError } = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("company_id", companyRecord.id)
    .eq("user_id", user.id)
    .limit(1);

  if (loadError) {
    if (isMissingTeamTableError(loadError)) {
      return null;
    }

    throw loadError;
  }

  if (existingRows?.length > 0) {
    const existingMember = normalizeTeamMember(existingRows[0]);

    if (existingMember.role === "owner" && existingMember.status === "active") {
      return existingMember;
    }

    const { data, error } = await supabase
      .from("company_members")
      .update({
        invite_email: existingMember.inviteEmail || email,
        role: "owner",
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMember.id)
      .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
      .single();

    if (error) {
      if (isMissingTeamTableError(error)) {
        return null;
      }

      throw error;
    }

    return normalizeTeamMember(data);
  }

  const { data, error } = await supabase
    .from("company_members")
    .insert({
      company_id: companyRecord.id,
      invite_email: email,
      role: "owner",
      status: "active",
      user_id: user.id,
    })
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingTeamTableError(error)) {
      return null;
    }

    throw error;
  }

  return normalizeTeamMember(data);
}

export async function fetchCloudTeamMembers(companyId) {
  if (!companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTeamTableError(error)) {
      return [];
    }

    throw error;
  }

  return (data || []).map((row) => normalizeTeamMember(row));
}

export async function createCloudTeamInvite(companyId, inviteEmail, role = "estimator") {
  const normalizedEmail = String(inviteEmail || "").trim().toLowerCase();
  const normalizedRole = TEAM_INVITE_ROLES.includes(normalizeTeamRole(role)) ? normalizeTeamRole(role) : "estimator";

  if (!companyId) {
    throw new Error("Cloud company is not ready yet.");
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Enter a valid invite email.");
  }

  const existingResult = await supabase
    .from("company_members")
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .eq("company_id", companyId)
    .eq("invite_email", normalizedEmail)
    .limit(1);

  if (existingResult.error) {
    if (isMissingTeamTableError(existingResult.error)) {
      throw new Error("Run the Phase 33 Supabase SQL before inviting team members.");
    }

    throw existingResult.error;
  }

  const existingMember = existingResult.data?.[0];

  if (existingMember) {
    const { data, error } = await supabase
      .from("company_members")
      .update({
        role: normalizedRole,
        status: existingMember.user_id ? "active" : "invited",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMember.id)
      .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    return normalizeTeamMember(data);
  }

  const { data, error } = await supabase
    .from("company_members")
    .insert({
      company_id: companyId,
      invite_email: normalizedEmail,
      role: normalizedRole,
      status: "invited",
    })
    .select("id,company_id,user_id,invite_email,role,status,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return normalizeTeamMember(data);
}

export async function deactivateCloudTeamMember(companyId, memberId) {
  if (!companyId || !memberId) {
    throw new Error("Choose a team member to deactivate.");
  }

  const { error } = await supabase
    .from("company_members")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", memberId);

  if (error) {
    throw error;
  }
}

export async function loadOrSeedCloudCompanySettings(companyId, localSettings = getFallbackCompanySettings(), deps = {}) {
  const cloudSettingsRow = await fetchCloudCompanySettingsRow(companyId);

  if (isPlainObject(cloudSettingsRow?.settings) && Object.keys(cloudSettingsRow.settings).length > 0) {
    return {
      message: "Loaded company settings from Supabase.",
      settings: normalizeSettings(cloudSettingsRow.settings, deps),
    };
  }

  const normalizedSettings = normalizeSettings(localSettings, deps);
  await saveCloudCompanySettings(companyId, normalizedSettings, cloudSettingsRow?.id, deps);

  return {
    message: "Seeded Supabase company settings from local defaults.",
    settings: normalizedSettings,
  };
}

export async function fetchCloudCompanySettingsRow(companyId) {
  const { data, error } = await supabase
    .from("company_settings")
    .select("id,settings")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function saveCloudCompanySettings(companyId, settings, existingRowId = "", deps = {}) {
  const normalizedSettings = normalizeSettings(settings, deps);
  const rowId = existingRowId || (await fetchCloudCompanySettingsRow(companyId))?.id;
  const payload = {
    company_id: companyId,
    settings: normalizedSettings,
  };

  if (rowId) {
    const { error } = await supabase.from("company_settings").update(payload).eq("id", rowId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("company_settings").insert(payload);

  if (error) {
    throw error;
  }
}
