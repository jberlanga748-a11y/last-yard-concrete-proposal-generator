-- Last Yard Proposal Generator - Supabase foundation schema
-- Last Yard Proposal Generator cloud schema, including proposal asset storage.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  proposal_number text,
  status text,
  proposal_type text,
  packet_mode text,
  contact_id uuid null references public.contacts(id) on delete set null,
  proposal_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lightweight proposal list/customer portal lookup columns.
-- These mirror customer-safe summary fields from proposal_data so the app does
-- not have to load photo-heavy JSON blobs just to render /proposals.
alter table public.proposals
  add column if not exists project_name text,
  add column if not exists client_name text,
  add column if not exists proposal_mode text,
  add column if not exists pricing_mode text,
  add column if not exists total_amount numeric,
  add column if not exists customer_share_enabled boolean not null default false,
  add column if not exists customer_share_token text,
  add column if not exists customer_share_expires_at timestamptz,
  add column if not exists customer_selection_status text,
  add column if not exists customer_approval_status text,
  add column if not exists proposal_status text;

create index if not exists companies_owner_id_idx on public.companies(owner_id);
create index if not exists company_settings_company_id_idx on public.company_settings(company_id);
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists proposals_company_id_idx on public.proposals(company_id);
create index if not exists proposals_contact_id_idx on public.proposals(contact_id);
create index if not exists proposals_status_idx on public.proposals(status);
create index if not exists proposals_company_updated_idx on public.proposals(company_id, updated_at desc);
create index if not exists proposals_customer_share_token_idx on public.proposals(customer_share_token);
create index if not exists proposals_company_status_idx on public.proposals(company_id, status);
create index if not exists proposals_company_proposal_mode_idx on public.proposals(company_id, proposal_mode);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_company_settings_updated_at on public.company_settings;
create trigger set_company_settings_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_contacts_updated_at on public.contacts;
create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

drop trigger if exists set_proposals_updated_at on public.proposals;
create trigger set_proposals_updated_at
before update on public.proposals
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_settings enable row level security;
alter table public.contacts enable row level security;
alter table public.proposals enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can read their companies" on public.companies;
create policy "Users can read their companies"
on public.companies for select
using (owner_id = auth.uid());

drop policy if exists "Users can insert their companies" on public.companies;
create policy "Users can insert their companies"
on public.companies for insert
with check (owner_id = auth.uid());

drop policy if exists "Users can update their companies" on public.companies;
create policy "Users can update their companies"
on public.companies for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can delete their companies" on public.companies;
create policy "Users can delete their companies"
on public.companies for delete
using (owner_id = auth.uid());

drop policy if exists "Users can read company settings" on public.company_settings;
create policy "Users can read company settings"
on public.company_settings for select
using (
  exists (
    select 1
    from public.companies
    where companies.id = company_settings.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert company settings" on public.company_settings;
create policy "Users can insert company settings"
on public.company_settings for insert
with check (
  exists (
    select 1
    from public.companies
    where companies.id = company_settings.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update company settings" on public.company_settings;
create policy "Users can update company settings"
on public.company_settings for update
using (
  exists (
    select 1
    from public.companies
    where companies.id = company_settings.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = company_settings.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete company settings" on public.company_settings;
create policy "Users can delete company settings"
on public.company_settings for delete
using (
  exists (
    select 1
    from public.companies
    where companies.id = company_settings.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read contacts" on public.contacts;
create policy "Users can read contacts"
on public.contacts for select
using (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert contacts" on public.contacts;
create policy "Users can insert contacts"
on public.contacts for insert
with check (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update contacts" on public.contacts;
create policy "Users can update contacts"
on public.contacts for update
using (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete contacts" on public.contacts;
create policy "Users can delete contacts"
on public.contacts for delete
using (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read proposals" on public.proposals;
create policy "Users can read proposals"
on public.proposals for select
using (
  exists (
    select 1
    from public.companies
    where companies.id = proposals.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert proposals" on public.proposals;
create policy "Users can insert proposals"
on public.proposals for insert
with check (
  exists (
    select 1
    from public.companies
    where companies.id = proposals.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update proposals" on public.proposals;
create policy "Users can update proposals"
on public.proposals for update
using (
  exists (
    select 1
    from public.companies
    where companies.id = proposals.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = proposals.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete proposals" on public.proposals;
create policy "Users can delete proposals"
on public.proposals for delete
using (
  exists (
    select 1
    from public.companies
    where companies.id = proposals.company_id
      and companies.owner_id = auth.uid()
  )
);

-- Phase 27E: proposal asset storage
--
-- Create a public bucket for uploaded proposal photos and plan/takeoff images.
-- Public reads keep print/PDF rendering reliable in the browser. Upload/update/delete
-- access is restricted to authenticated users who own the company folder in the path.
--
-- Expected object paths:
-- company/{companyId}/proposals/{proposalId}/featured/photo-1-{timestamp}.{ext}
-- company/{companyId}/proposals/{proposalId}/featured/photo-2-{timestamp}.{ext}
-- company/{companyId}/proposals/{proposalId}/featured/photo-3-{timestamp}.{ext}
-- company/{companyId}/proposals/{proposalId}/plans/{sheetId}-{timestamp}.{ext}

insert into storage.buckets (id, name, public)
values ('last-yard-proposal-assets', 'last-yard-proposal-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read proposal assets" on storage.objects;
drop policy if exists "Company owners can upload proposal assets" on storage.objects;
drop policy if exists "Company owners can update proposal assets" on storage.objects;
drop policy if exists "Company owners can delete proposal assets" on storage.objects;
drop function if exists public.current_user_owns_company(text);

create policy "Public can read proposal assets"
on storage.objects for select
using (bucket_id = 'last-yard-proposal-assets');

create policy "Company owners can upload proposal assets"
on storage.objects for insert
with check (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and companies.owner_id = auth.uid()
  )
);

create policy "Company owners can update proposal assets"
on storage.objects for update
using (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and companies.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and companies.owner_id = auth.uid()
  )
);

create policy "Company owners can delete proposal assets"
on storage.objects for delete
using (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and companies.owner_id = auth.uid()
  )
);

-- Phase 33: team / partner access
-- Run this block after the base schema to let invited signed-in users work under
-- the same company account. Existing owner-only policies are replaced below with
-- company-member-aware policies.

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  invite_email text,
  role text not null default 'admin' check (role in ('owner', 'admin', 'estimator', 'viewer')),
  status text not null default 'invited' check (status in ('invited', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_members_company_id_idx on public.company_members(company_id);
create index if not exists company_members_user_id_idx on public.company_members(user_id);
create index if not exists company_members_invite_email_idx on public.company_members (lower(invite_email));
create unique index if not exists company_members_company_user_unique_idx
  on public.company_members(company_id, user_id)
  where user_id is not null;

drop trigger if exists update_company_members_updated_at on public.company_members;
create trigger update_company_members_updated_at
before update on public.company_members
for each row execute function public.set_updated_at();

alter table public.company_members enable row level security;

create or replace function public.current_user_can_access_company(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies
    where companies.id = target_company_id
      and companies.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.company_members
    where company_members.company_id = target_company_id
      and company_members.user_id = auth.uid()
      and company_members.status = 'active'
  );
$$;

create or replace function public.current_user_can_edit_company(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies
    where companies.id = target_company_id
      and companies.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.company_members
    where company_members.company_id = target_company_id
      and company_members.user_id = auth.uid()
      and company_members.status = 'active'
      and company_members.role in ('owner', 'admin', 'estimator')
  );
$$;

create or replace function public.current_user_is_company_admin(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies
    where companies.id = target_company_id
      and companies.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.company_members
    where company_members.company_id = target_company_id
      and company_members.user_id = auth.uid()
      and company_members.status = 'active'
      and company_members.role in ('owner', 'admin')
  );
$$;

grant execute on function public.current_user_can_access_company(uuid) to authenticated;
grant execute on function public.current_user_can_edit_company(uuid) to authenticated;
grant execute on function public.current_user_is_company_admin(uuid) to authenticated;

create or replace function public.protect_company_member_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_is_company_admin(old.company_id) then
    return new;
  end if;

  if old.status = 'invited'
    and lower(old.invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and new.company_id = old.company_id
    and new.invite_email = old.invite_email
    and new.role = old.role
    and new.status = 'active'
    and new.user_id = auth.uid()
  then
    return new;
  end if;

  raise exception 'Only company admins can manage team member access.';
end;
$$;

drop trigger if exists protect_company_member_updates on public.company_members;
create trigger protect_company_member_updates
before update on public.company_members
for each row execute function public.protect_company_member_updates();

drop policy if exists "Users can read company members" on public.company_members;
create policy "Users can read company members"
on public.company_members for select
using (
  public.current_user_can_access_company(company_id)
  or lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Company admins can invite members" on public.company_members;
create policy "Company admins can invite members"
on public.company_members for insert
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company admins and invitees can update members" on public.company_members;
create policy "Company admins and invitees can update members"
on public.company_members for update
using (
  public.current_user_is_company_admin(company_id)
  or user_id = auth.uid()
  or lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.current_user_is_company_admin(company_id)
  or user_id = auth.uid()
  or lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Company admins can delete members" on public.company_members;
create policy "Company admins can delete members"
on public.company_members for delete
using (public.current_user_is_company_admin(company_id));

drop policy if exists "Users can read owned companies" on public.companies;
create policy "Users can read owned companies"
on public.companies for select
using (public.current_user_can_access_company(id));

drop policy if exists "Users can insert owned companies" on public.companies;
create policy "Users can insert owned companies"
on public.companies for insert
with check (owner_id = auth.uid());

drop policy if exists "Users can update owned companies" on public.companies;
create policy "Users can update owned companies"
on public.companies for update
using (public.current_user_is_company_admin(id))
with check (public.current_user_is_company_admin(id));

drop policy if exists "Users can delete owned companies" on public.companies;
create policy "Users can delete owned companies"
on public.companies for delete
using (owner_id = auth.uid());

drop policy if exists "Users can read company settings" on public.company_settings;
create policy "Users can read company settings"
on public.company_settings for select
using (public.current_user_can_access_company(company_id));

drop policy if exists "Users can insert company settings" on public.company_settings;
create policy "Users can insert company settings"
on public.company_settings for insert
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Users can update company settings" on public.company_settings;
create policy "Users can update company settings"
on public.company_settings for update
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Users can delete company settings" on public.company_settings;
create policy "Users can delete company settings"
on public.company_settings for delete
using (public.current_user_is_company_admin(company_id));

drop policy if exists "Users can read contacts" on public.contacts;
create policy "Users can read contacts"
on public.contacts for select
using (public.current_user_can_access_company(company_id));

drop policy if exists "Users can insert contacts" on public.contacts;
create policy "Users can insert contacts"
on public.contacts for insert
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can update contacts" on public.contacts;
create policy "Users can update contacts"
on public.contacts for update
using (public.current_user_can_edit_company(company_id))
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can delete contacts" on public.contacts;
create policy "Users can delete contacts"
on public.contacts for delete
using (public.current_user_is_company_admin(company_id));

drop policy if exists "Users can read proposals" on public.proposals;
create policy "Users can read proposals"
on public.proposals for select
using (public.current_user_can_access_company(company_id));

drop policy if exists "Users can insert proposals" on public.proposals;
create policy "Users can insert proposals"
on public.proposals for insert
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can update proposals" on public.proposals;
create policy "Users can update proposals"
on public.proposals for update
using (public.current_user_can_edit_company(company_id))
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can delete proposals" on public.proposals;
create policy "Users can delete proposals"
on public.proposals for delete
using (public.current_user_is_company_admin(company_id));

drop policy if exists "Company owners can upload proposal assets" on storage.objects;
drop policy if exists "Company owners can update proposal assets" on storage.objects;
drop policy if exists "Company owners can delete proposal assets" on storage.objects;
drop policy if exists "Company members can upload proposal assets" on storage.objects;
drop policy if exists "Company members can update proposal assets" on storage.objects;
drop policy if exists "Company members can delete proposal assets" on storage.objects;

create policy "Company members can upload proposal assets"
on storage.objects for insert
with check (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and public.current_user_can_edit_company(companies.id)
  )
);

create policy "Company members can update proposal assets"
on storage.objects for update
using (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and public.current_user_can_edit_company(companies.id)
  )
)
with check (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and public.current_user_can_edit_company(companies.id)
  )
);

create policy "Company members can delete proposal assets"
on storage.objects for delete
using (
  bucket_id = 'last-yard-proposal-assets'
  and split_part(name, '/', 1) = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = split_part(name, '/', 2)
      and public.current_user_is_company_admin(companies.id)
  )
);

-- Phase 34: AI Lead Finder foundation
-- The app currently stores Lead Finder data in company_settings.leadFinder to
-- match the local-first settings sync pattern. These tables prepare Supabase
-- for a future direct cloud-sync/search worker without exposing AI or web
-- search behavior yet.

create table if not exists public.lead_sources (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text,
  source_type text,
  url text,
  company_type text,
  location_focus text,
  trade_focus text,
  active boolean not null default true,
  notes text,
  check_frequency text,
  last_checked_date date,
  next_check_date date,
  source_status text,
  source_priority text,
  source_notes text,
  default_service_type text,
  default_company_mode text,
  source_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  title text,
  source_id text references public.lead_sources(id) on delete set null,
  source_name text,
  source_url text,
  company_name text,
  city text,
  state text,
  service_type text,
  project_type text,
  due_date date,
  contact_name text,
  contact_email text,
  contact_phone text,
  description text,
  estimated_value numeric,
  capacity_fit text,
  ai_fit_score numeric,
  ai_fit_label text,
  ai_fit_reason text,
  ai_risks text,
  ai_next_step text,
  suggested_company_mode text,
  score_status text,
  score_source text,
  scored_at timestamptz,
  score_error text,
  review_status text,
  reviewed_at timestamptz,
  reviewed_by text,
  missing_info_checklist jsonb not null default '[]'::jsonb,
  critical_questions jsonb not null default '[]'::jsonb,
  recommended_photos_or_docs jsonb not null default '[]'::jsonb,
  missing_info_risk_flags jsonb not null default '[]'::jsonb,
  proposal_readiness_score numeric,
  proposal_readiness_label text,
  missing_info_recommended_next_step text,
  customer_question_draft text,
  missing_info_last_checked_at timestamptz,
  missing_info_source text,
  missing_info_status text,
  status text,
  notes text,
  estimate_id text,
  proposal_id text,
  packet_id text,
  contact_id text,
  job_handoff_id text,
  handoff_history jsonb not null default '[]'::jsonb,
  last_contact_date date,
  last_contact_method text,
  next_follow_up_date date,
  follow_up_status text,
  contact_notes text,
  no_follow_up_reason text,
  lead_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists ai_fit_label text;
alter table public.leads add column if not exists ai_risks text;
alter table public.leads add column if not exists suggested_company_mode text;
alter table public.leads add column if not exists score_status text;
alter table public.leads add column if not exists score_source text;
alter table public.leads add column if not exists scored_at timestamptz;
alter table public.leads add column if not exists score_error text;
alter table public.leads add column if not exists review_status text;
alter table public.leads add column if not exists reviewed_at timestamptz;
alter table public.leads add column if not exists reviewed_by text;
alter table public.leads add column if not exists missing_info_checklist jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists critical_questions jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists recommended_photos_or_docs jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists missing_info_risk_flags jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists proposal_readiness_score numeric;
alter table public.leads add column if not exists proposal_readiness_label text;
alter table public.leads add column if not exists missing_info_recommended_next_step text;
alter table public.leads add column if not exists customer_question_draft text;
alter table public.leads add column if not exists missing_info_last_checked_at timestamptz;
alter table public.leads add column if not exists missing_info_source text;
alter table public.leads add column if not exists missing_info_status text;
alter table public.leads add column if not exists estimate_id text;
alter table public.leads add column if not exists proposal_id text;
alter table public.leads add column if not exists packet_id text;
alter table public.leads add column if not exists contact_id text;
alter table public.leads add column if not exists job_handoff_id text;
alter table public.leads add column if not exists handoff_history jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists last_contact_date date;
alter table public.leads add column if not exists last_contact_method text;
alter table public.leads add column if not exists next_follow_up_date date;
alter table public.leads add column if not exists follow_up_status text;
alter table public.leads add column if not exists contact_notes text;
alter table public.leads add column if not exists no_follow_up_reason text;
alter table public.lead_sources add column if not exists check_frequency text;
alter table public.lead_sources add column if not exists last_checked_date date;
alter table public.lead_sources add column if not exists next_check_date date;
alter table public.lead_sources add column if not exists source_status text;
alter table public.lead_sources add column if not exists source_priority text;
alter table public.lead_sources add column if not exists source_notes text;
alter table public.lead_sources add column if not exists default_service_type text;
alter table public.lead_sources add column if not exists default_company_mode text;

create index if not exists lead_sources_company_id_idx on public.lead_sources(company_id);
create index if not exists lead_sources_company_active_idx on public.lead_sources(company_id, active);
create index if not exists lead_sources_company_next_check_date_idx on public.lead_sources(company_id, next_check_date);
create index if not exists lead_sources_company_source_status_idx on public.lead_sources(company_id, source_status);
create index if not exists lead_sources_company_source_priority_idx on public.lead_sources(company_id, source_priority);
create index if not exists leads_company_id_idx on public.leads(company_id);
create index if not exists leads_company_status_idx on public.leads(company_id, status);
create index if not exists leads_company_service_type_idx on public.leads(company_id, service_type);
create index if not exists leads_company_due_date_idx on public.leads(company_id, due_date);
create index if not exists leads_source_id_idx on public.leads(source_id);
create index if not exists leads_estimate_id_idx on public.leads(estimate_id);
create index if not exists leads_proposal_id_idx on public.leads(proposal_id);
create index if not exists leads_packet_id_idx on public.leads(packet_id);
create index if not exists leads_contact_id_idx on public.leads(contact_id);
create index if not exists leads_job_handoff_id_idx on public.leads(job_handoff_id);
create index if not exists leads_company_follow_up_status_idx on public.leads(company_id, follow_up_status);
create index if not exists leads_company_next_follow_up_date_idx on public.leads(company_id, next_follow_up_date);

-- Phase 40: Job Handoff Packet bridge.
-- The app persists these packets through company_settings.jobHandoffs today.
-- This table prepares future direct sync to Concrete Ops without creating jobs.

create table if not exists public.job_handoffs (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  source_lead_id text,
  source_proposal_id text,
  source_estimate_id text,
  source_packet_id text,
  customer_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  project_name text,
  project_address text,
  city text,
  state text,
  service_type text,
  project_type text,
  accepted_proposal_amount numeric,
  proposal_title text,
  proposal_status text,
  lead_status text,
  scope_summary text,
  included_scope jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  missing_info_status text,
  proposal_readiness_label text,
  proposal_readiness_score numeric,
  follow_up_status text,
  next_follow_up_date date,
  internal_notes text,
  operations_notes text,
  start_date_target date,
  crew_notes text,
  schedule_notes text,
  document_links jsonb not null default '[]'::jsonb,
  handoff_status text,
  ops_job_draft_id text,
  handoff_history jsonb not null default '[]'::jsonb,
  ops_readiness_score numeric,
  ops_readiness_label text,
  ops_readiness_checklist jsonb not null default '[]'::jsonb,
  ops_readiness_issues jsonb not null default '[]'::jsonb,
  ops_readiness_last_checked_at timestamptz,
  ops_readiness_override boolean not null default false,
  ops_readiness_override_reason text,
  ops_readiness_tbd_fields jsonb not null default '[]'::jsonb,
  handoff_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_handoffs add column if not exists ops_readiness_score numeric;
alter table public.job_handoffs add column if not exists ops_job_draft_id text;
alter table public.job_handoffs add column if not exists handoff_history jsonb not null default '[]'::jsonb;
alter table public.job_handoffs add column if not exists ops_readiness_label text;
alter table public.job_handoffs add column if not exists ops_readiness_checklist jsonb not null default '[]'::jsonb;
alter table public.job_handoffs add column if not exists ops_readiness_issues jsonb not null default '[]'::jsonb;
alter table public.job_handoffs add column if not exists ops_readiness_last_checked_at timestamptz;
alter table public.job_handoffs add column if not exists ops_readiness_override boolean not null default false;
alter table public.job_handoffs add column if not exists ops_readiness_override_reason text;
alter table public.job_handoffs add column if not exists ops_readiness_tbd_fields jsonb not null default '[]'::jsonb;

create index if not exists job_handoffs_company_id_idx on public.job_handoffs(company_id);
create index if not exists job_handoffs_company_status_idx on public.job_handoffs(company_id, handoff_status);
create index if not exists job_handoffs_company_ops_readiness_idx on public.job_handoffs(company_id, ops_readiness_label);
create index if not exists job_handoffs_ops_job_draft_id_idx on public.job_handoffs(ops_job_draft_id);
create index if not exists job_handoffs_source_lead_id_idx on public.job_handoffs(source_lead_id);
create index if not exists job_handoffs_source_proposal_id_idx on public.job_handoffs(source_proposal_id);

drop trigger if exists set_job_handoffs_updated_at on public.job_handoffs;
create trigger set_job_handoffs_updated_at
before update on public.job_handoffs
for each row execute function public.set_updated_at();

alter table public.job_handoffs enable row level security;

drop policy if exists "Users can read job handoffs" on public.job_handoffs;
create policy "Users can read job handoffs"
on public.job_handoffs for select
using (public.current_user_can_access_company(company_id));

drop policy if exists "Users can insert job handoffs" on public.job_handoffs;
create policy "Users can insert job handoffs"
on public.job_handoffs for insert
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can update job handoffs" on public.job_handoffs;
create policy "Users can update job handoffs"
on public.job_handoffs for update
using (public.current_user_can_edit_company(company_id))
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can delete job handoffs" on public.job_handoffs;
create policy "Users can delete job handoffs"
on public.job_handoffs for delete
using (public.current_user_is_company_admin(company_id));

-- Phase 42: Concrete Ops Job Draft bridge.
-- Prep-only records shaped for a future Concrete Ops integration. These do not create real jobs.

create table if not exists public.ops_job_drafts (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  source_handoff_id text,
  source_lead_id text,
  source_proposal_id text,
  source_estimate_id text,
  source_packet_id text,
  customer_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  job_name text,
  job_address text,
  city text,
  state text,
  service_type text,
  project_type text,
  scope_summary text,
  included_scope jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  operations_notes text,
  crew_notes text,
  schedule_notes text,
  start_date_target date,
  assigned_crew_placeholder text,
  foreman_placeholder text,
  job_status text,
  ops_readiness_score numeric,
  ops_readiness_label text,
  ops_readiness_issues jsonb not null default '[]'::jsonb,
  proposal_amount numeric,
  proposal_link_or_id text,
  handoff_status text,
  draft_status text,
  concrete_ops_send_status text,
  concrete_ops_imported_draft_id text,
  concrete_ops_open_path text,
  concrete_ops_last_sent_at timestamptz,
  concrete_ops_send_message text,
  concrete_ops_send_error text,
  draft_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ops_job_drafts add column if not exists concrete_ops_send_status text;
alter table public.ops_job_drafts add column if not exists concrete_ops_imported_draft_id text;
alter table public.ops_job_drafts add column if not exists concrete_ops_open_path text;
alter table public.ops_job_drafts add column if not exists concrete_ops_last_sent_at timestamptz;
alter table public.ops_job_drafts add column if not exists concrete_ops_send_message text;
alter table public.ops_job_drafts add column if not exists concrete_ops_send_error text;

create index if not exists ops_job_drafts_company_id_idx on public.ops_job_drafts(company_id);
create index if not exists ops_job_drafts_company_status_idx on public.ops_job_drafts(company_id, draft_status);
create index if not exists ops_job_drafts_company_readiness_idx on public.ops_job_drafts(company_id, ops_readiness_label);
create index if not exists ops_job_drafts_source_handoff_id_idx on public.ops_job_drafts(source_handoff_id);
create index if not exists ops_job_drafts_company_send_status_idx on public.ops_job_drafts(company_id, concrete_ops_send_status);

drop trigger if exists set_ops_job_drafts_updated_at on public.ops_job_drafts;
create trigger set_ops_job_drafts_updated_at
before update on public.ops_job_drafts
for each row execute function public.set_updated_at();

alter table public.ops_job_drafts enable row level security;

drop policy if exists "Users can read ops job drafts" on public.ops_job_drafts;
create policy "Users can read ops job drafts"
on public.ops_job_drafts for select
using (public.current_user_can_access_company(company_id));

drop policy if exists "Users can insert ops job drafts" on public.ops_job_drafts;
create policy "Users can insert ops job drafts"
on public.ops_job_drafts for insert
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can update ops job drafts" on public.ops_job_drafts;
create policy "Users can update ops job drafts"
on public.ops_job_drafts for update
using (public.current_user_can_edit_company(company_id))
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can delete ops job drafts" on public.ops_job_drafts;
create policy "Users can delete ops job drafts"
on public.ops_job_drafts for delete
using (public.current_user_is_company_admin(company_id));

drop trigger if exists set_lead_sources_updated_at on public.lead_sources;
create trigger set_lead_sources_updated_at
before update on public.lead_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

alter table public.lead_sources enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Users can read lead sources" on public.lead_sources;
create policy "Users can read lead sources"
on public.lead_sources for select
using (public.current_user_can_access_company(company_id));

drop policy if exists "Users can insert lead sources" on public.lead_sources;
create policy "Users can insert lead sources"
on public.lead_sources for insert
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can update lead sources" on public.lead_sources;
create policy "Users can update lead sources"
on public.lead_sources for update
using (public.current_user_can_edit_company(company_id))
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can delete lead sources" on public.lead_sources;
create policy "Users can delete lead sources"
on public.lead_sources for delete
using (public.current_user_is_company_admin(company_id));

drop policy if exists "Users can read leads" on public.leads;
create policy "Users can read leads"
on public.leads for select
using (public.current_user_can_access_company(company_id));

drop policy if exists "Users can insert leads" on public.leads;
create policy "Users can insert leads"
on public.leads for insert
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can update leads" on public.leads;
create policy "Users can update leads"
on public.leads for update
using (public.current_user_can_edit_company(company_id))
with check (public.current_user_can_edit_company(company_id));

drop policy if exists "Users can delete leads" on public.leads;
create policy "Users can delete leads"
on public.leads for delete
using (public.current_user_is_company_admin(company_id));
