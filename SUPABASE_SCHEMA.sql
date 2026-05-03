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

create index if not exists companies_owner_id_idx on public.companies(owner_id);
create index if not exists company_settings_company_id_idx on public.company_settings(company_id);
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists proposals_company_id_idx on public.proposals(company_id);
create index if not exists proposals_contact_id_idx on public.proposals(contact_id);
create index if not exists proposals_status_idx on public.proposals(status);

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
create policy "Public can read proposal assets"
on storage.objects for select
using (bucket_id = 'last-yard-proposal-assets');

drop policy if exists "Company owners can upload proposal assets" on storage.objects;
create policy "Company owners can upload proposal assets"
on storage.objects for insert
with check (
  bucket_id = 'last-yard-proposal-assets'
  and (storage.foldername(name))[1] = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = (storage.foldername(name))[2]
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Company owners can update proposal assets" on storage.objects;
create policy "Company owners can update proposal assets"
on storage.objects for update
using (
  bucket_id = 'last-yard-proposal-assets'
  and (storage.foldername(name))[1] = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = (storage.foldername(name))[2]
      and companies.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'last-yard-proposal-assets'
  and (storage.foldername(name))[1] = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = (storage.foldername(name))[2]
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "Company owners can delete proposal assets" on storage.objects;
create policy "Company owners can delete proposal assets"
on storage.objects for delete
using (
  bucket_id = 'last-yard-proposal-assets'
  and (storage.foldername(name))[1] = 'company'
  and exists (
    select 1
    from public.companies
    where companies.id::text = (storage.foldername(name))[2]
      and companies.owner_id = auth.uid()
  )
);
