begin;

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'gp_company'
  ) then
    create type public.gp_company as enum ('INTELECTA', 'PRODALY');
  else
    if exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typnamespace = 'public'::regnamespace and t.typname = 'gp_company' and e.enumlabel = 'Intelect'
    ) then
      alter type public.gp_company rename value 'Intelect' to 'INTELECTA';
    end if;
    if exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typnamespace = 'public'::regnamespace and t.typname = 'gp_company' and e.enumlabel = 'Prodali'
    ) then
      alter type public.gp_company rename value 'Prodali' to 'PRODALY';
    end if;
    if not exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typnamespace = 'public'::regnamespace and t.typname = 'gp_company' and e.enumlabel = 'INTELECTA'
    ) then
      alter type public.gp_company add value 'INTELECTA';
    end if;
    if not exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typnamespace = 'public'::regnamespace and t.typname = 'gp_company' and e.enumlabel = 'PRODALY'
    ) then
      alter type public.gp_company add value 'PRODALY';
    end if;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'gp_role'
  ) then
    create type public.gp_role as enum ('gp', 'consultor', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'gp_priority'
  ) then
    create type public.gp_priority as enum ('Baixa', 'Media', 'Alta', 'Critica');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists empresa public.gp_company;
alter table public.profiles add column if not exists role public.gp_role not null default 'gp';
alter table public.profiles add column if not exists ativo boolean not null default true;
alter table public.profiles add column if not exists mfa_required boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_email_key' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_email_key unique (email);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_consultor_requires_mfa' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_consultor_requires_mfa
      check (role <> 'consultor' or mfa_required = true);
  end if;
end
$$;

create table if not exists public.demandas (
  id uuid primary key default gen_random_uuid()
);

alter table public.demandas add column if not exists referencia_externa text;
alter table public.demandas add column if not exists empresa public.gp_company;
alter table public.demandas add column if not exists cliente text;
alter table public.demandas add column if not exists gerente_projetos text;
alter table public.demandas add column if not exists consultor text;
alter table public.demandas add column if not exists titulo text;
alter table public.demandas add column if not exists descricao text;
alter table public.demandas add column if not exists documento_lrc_email text;
alter table public.demandas add column if not exists os_item_ticket text;
alter table public.demandas add column if not exists status text;
alter table public.demandas add column if not exists responsavel text;
alter table public.demandas add column if not exists prioridade public.gp_priority not null default 'Media';
alter table public.demandas add column if not exists horas_previstas numeric(10, 2) not null default 0;
alter table public.demandas add column if not exists horas_gastas numeric(10, 2) not null default 0;
alter table public.demandas add column if not exists data_criacao timestamptz not null default timezone('utc', now());
alter table public.demandas add column if not exists data_atualizacao timestamptz not null default timezone('utc', now());

update public.demandas set empresa = 'INTELECTA' where empresa::text = 'Intelect';
update public.demandas set empresa = 'PRODALY' where empresa::text = 'Prodali';

alter table public.demandas alter column referencia_externa set not null;
alter table public.demandas alter column empresa set not null;
alter table public.demandas alter column cliente set not null;
alter table public.demandas alter column titulo set not null;
alter table public.demandas alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'demandas_empresa_referencia_key' and conrelid = 'public.demandas'::regclass
  ) then
    alter table public.demandas add constraint demandas_empresa_referencia_key unique (empresa, referencia_externa);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'demandas_horas_validas' and conrelid = 'public.demandas'::regclass
  ) then
    alter table public.demandas add constraint demandas_horas_validas
      check (horas_previstas >= 0 and horas_gastas >= 0);
  end if;
end
$$;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  empresa public.gp_company,
  role public.gp_role,
  event_type text not null,
  event_status text not null default 'success',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists demandas_empresa_status_updated_idx
  on public.demandas (empresa, status, data_atualizacao desc);
create index if not exists demandas_empresa_priority_owner_idx
  on public.demandas (empresa, prioridade, responsavel);
create index if not exists audit_logs_user_created_idx
  on public.audit_logs (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_table_schema = 'public' and tg_table_name in ('profiles', 'demandas') then
    new.updated_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_demandas_updated_at on public.demandas;
create trigger set_demandas_updated_at
before update on public.demandas
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
select u.id, lower(u.email) from auth.users as u
on conflict (id) do update
  set email = coalesce(excluded.email, public.profiles.email),
      updated_at = timezone('utc', now());

create or replace function public.current_aal()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1')
$$;

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_existing_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  v_email := lower(nullif(auth.jwt() ->> 'email', ''));

  if v_email is not null then
    select p.id
    into v_existing_id
    from public.profiles as p
    where lower(coalesce(p.email, '')) = v_email
    order by p.updated_at desc, p.created_at desc
    limit 1;
  end if;

  if exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
  ) then
    update public.profiles
    set email = coalesce(v_email, public.profiles.email),
        updated_at = timezone('utc', now())
    where id = auth.uid();
  elsif v_existing_id is not null then
    update public.profiles
    set id = auth.uid(),
        email = coalesce(v_email, public.profiles.email),
        updated_at = timezone('utc', now())
    where id = v_existing_id;
  else
    insert into public.profiles (id, email)
    values (auth.uid(), v_email);
  end if;

  if v_email = 'aensistemas@gmail.com' then
    update public.profiles
    set nome = coalesce(nome, 'Administrador AEN SYSTEMS'),
        empresa = null,
        role = 'admin',
        ativo = true,
        mfa_required = false,
        updated_at = timezone('utc', now())
    where id = auth.uid();
  end if;
end;
$$;

create or replace function public.log_audit_event(
  p_event_type text,
  p_event_status text default 'success',
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    return;
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    return;
  end if;

  insert into public.audit_logs (user_id, empresa, role, event_type, event_status, details)
  values (auth.uid(), v_profile.empresa, v_profile.role, p_event_type, coalesce(p_event_status, 'success'), coalesce(p_details, '{}'::jsonb));
end;
$$;

alter table public.profiles enable row level security;
alter table public.demandas enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.demandas from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant select on public.demandas to authenticated;
grant insert, update, delete on public.demandas to authenticated;
grant select on public.audit_logs to authenticated;
revoke execute on function public.log_audit_event(text, text, jsonb) from public, anon;
revoke execute on function public.current_aal() from public, anon;
revoke execute on function public.ensure_my_profile() from public, anon;
grant execute on function public.log_audit_event(text, text, jsonb) to authenticated;
grant execute on function public.current_aal() to authenticated;
grant execute on function public.ensure_my_profile() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
as restrictive
for select
to authenticated
using (auth.uid() is not null and id = auth.uid());

drop policy if exists "profiles_insert_self_bootstrap" on public.profiles;
create policy "profiles_insert_self_bootstrap"
on public.profiles
as restrictive
for insert
to authenticated
with check (
  auth.uid() is not null
  and id = auth.uid()
  and lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and (
    (
      lower(coalesce(email, '')) = 'aensistemas@gmail.com'
      and role = 'admin'
      and empresa is null
      and ativo = true
      and mfa_required = false
    )
    or (
      lower(coalesce(email, '')) <> 'aensistemas@gmail.com'
      and role = 'gp'
      and ativo = true
      and mfa_required = false
    )
  )
);

drop policy if exists "demandas_select_authorized" on public.demandas;
create policy "demandas_select_authorized"
on public.demandas
as restrictive
for select
to authenticated
using (
  (
    exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.ativo = true
        and p.role = 'admin'
        and lower(coalesce(p.email, '')) = 'aensistemas@gmail.com'
        and (
          p.mfa_required = false
          or public.current_aal() = 'aal2'
        )
    )
  )
  or (
    status = any (array['Aprovar', 'Iniciar', 'Desenvolvimento']::text[])
    and exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.ativo = true
        and p.empresa = demandas.empresa
        and (
          p.mfa_required = false
          or public.current_aal() = 'aal2'
        )
    )
  )
);

drop policy if exists "demandas_insert_admin" on public.demandas;
create policy "demandas_insert_admin"
on public.demandas
as restrictive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role = 'admin'
      and lower(coalesce(p.email, '')) = 'aensistemas@gmail.com'
      and (
        p.mfa_required = false
        or public.current_aal() = 'aal2'
      )
  )
);

drop policy if exists "demandas_update_admin" on public.demandas;
create policy "demandas_update_admin"
on public.demandas
as restrictive
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role = 'admin'
      and lower(coalesce(p.email, '')) = 'aensistemas@gmail.com'
      and (
        p.mfa_required = false
        or public.current_aal() = 'aal2'
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role = 'admin'
      and lower(coalesce(p.email, '')) = 'aensistemas@gmail.com'
      and (
        p.mfa_required = false
        or public.current_aal() = 'aal2'
      )
  )
);

drop policy if exists "demandas_delete_admin" on public.demandas;
create policy "demandas_delete_admin"
on public.demandas
as restrictive
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role = 'admin'
      and lower(coalesce(p.email, '')) = 'aensistemas@gmail.com'
      and (
        p.mfa_required = false
        or public.current_aal() = 'aal2'
      )
  )
);

drop policy if exists "audit_logs_select_self_or_admin" on public.audit_logs;
create policy "audit_logs_select_self_or_admin"
on public.audit_logs
as restrictive
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role = 'admin'
      and lower(coalesce(p.email, '')) = 'aensistemas@gmail.com'
      and (p.mfa_required = false or public.current_aal() = 'aal2')
  )
);

commit;
