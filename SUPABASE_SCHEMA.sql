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
