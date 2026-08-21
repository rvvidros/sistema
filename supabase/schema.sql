-- ============================================================
-- ALÔ SERRALHEIRO - SISTEMA INTERNO
-- SCHEMA PARA SUPABASE (SQL EDITOR)
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (usuários vinculados ao Supabase Auth)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- Trigger: cria um profile automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. CLIENTES
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  works_counter integer not null default 0,
  transactions_counter integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. OBRAS
-- ============================================================
create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  status text not null default 'em_aberto'
    check (status in ('em_aberto', 'em_andamento', 'concluida', 'cancelada')),
  budget_price numeric(12,2) not null default 0,
  client_id uuid references public.clients (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists works_client_id_idx on public.works (client_id);

-- ============================================================
-- 4. TIPOLOGIAS (catálogo: Suprema / Temperado / Gold)
-- ============================================================
create table if not exists public.typologies (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  category text not null default 'suprema'
    check (category in ('suprema', 'temperado', 'gold')),
  description text,
  created_at timestamptz not null default now()
);

-- Linhas de cada tipologia (Suprema, Gold)
create table if not exists public.typology_lines (
  id uuid primary key default gen_random_uuid(),
  typology_id uuid not null references public.typologies (id) on delete cascade,
  name text not null,
  price_factor numeric(6,3) not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. TIPOLOGIAS DA OBRA (itens adicionados à obra)
-- ============================================================
create table if not exists public.work_typologies (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  typology_id uuid references public.typologies (id),
  line_id uuid references public.typology_lines (id),
  quantity integer not null default 1,
  width numeric(10,2),
  height numeric(10,2),
  profile_color text,
  glass_type text,
  notes text,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_typologies_work_idx on public.work_typologies (work_id);

-- ============================================================
-- 6. LISTA DE COMPRAS / MATERIAIS
-- ============================================================
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  category text,
  name text not null,
  color text,
  unit text,
  quantity numeric(12,3) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists materials_work_idx on public.materials (work_id);

-- ============================================================
-- 7. ORÇAMENTOS
-- ============================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  code text,
  production_cost numeric(12,2) not null default 0,
  installation_cost numeric(12,2) not null default 0,
  gain_percentage numeric(5,2) not null default 0,
  summary jsonb not null default '{}'::jsonb,
  components jsonb not null default '[]'::jsonb,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budgets_work_idx on public.budgets (work_id);

-- ============================================================
-- 8. VENDAS / PEDIDOS
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  budget_id uuid references public.budgets (id) on delete set null,
  code text,
  components_own_cost numeric(12,2) not null default 0,
  glasses_own_cost numeric(12,2) not null default 0,
  profiles_own_cost numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'gerado',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_work_idx on public.orders (work_id);

-- ============================================================
-- 9. UPDATED_AT AUTOMÁTICO (updated_at)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
  for each row execute procedure public.set_updated_at();

drop trigger if exists works_set_updated_at on public.works;
create trigger works_set_updated_at before update on public.works
  for each row execute procedure public.set_updated_at();

drop trigger if exists work_typologies_set_updated_at on public.work_typologies;
create trigger work_typologies_set_updated_at before update on public.work_typologies
  for each row execute procedure public.set_updated_at();

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at before update on public.materials
  for each row execute procedure public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 10. INCREMENTO DO CONTADOR DE OBRAS DO CLIENTE
-- ============================================================
create or replace function public.increment_client_works_counter()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.client_id is not null then
    update public.clients
    set works_counter = works_counter + 1
    where id = new.client_id;
  end if;
  return new;
end;
$$;

drop trigger if exists works_increment_client_counter on public.works;
create trigger works_increment_client_counter
  after insert on public.works
  for each row execute procedure public.increment_client_works_counter();

-- ============================================================
-- 11. SEEDS (tipologias padrão: Suprema e Temperado)
-- ============================================================
insert into public.typologies (slug, name, category, description) values
  ('janela-correr-2', 'Janela de Correr 2 Folhas', 'suprema', 'Janela de correr com duas folhas'),
  ('janela-correr-4', 'Janela de Correr 4 Folhas', 'suprema', 'Janela de correr com quatro folhas'),
  ('janela-maximar', 'Janela Maxim-Ar', 'suprema', 'Janela tipo maxim-ar'),
  ('janela-basculante', 'Janela Basculante', 'suprema', 'Janela basculante'),
  ('porta-correr-2', 'Porta de Correr 2 Folhas', 'suprema', 'Porta de correr com duas folhas'),
  ('porta-abrir-1', 'Porta de Abrir 1 Folha', 'suprema', 'Porta de abrir com uma folha'),
  ('box-temperado', 'Box de Vidro Temperado', 'temperado', 'Box para banho em vidro temperado'),
  ('vidro-temperado-avulso', 'Vidro Temperado (corte sob medida)', 'temperado', 'Vidro temperado cortado sob medida'),
  ('guarda-corpo-temperado', 'Guarda-Corpo de Vidro Temperado', 'temperado', 'Guarda-corpo em vidro temperado'),
  ('sacada', 'Sacada / Envidraçamento', 'suprema', 'Envidraçamento de sacada')
on conflict (slug) do nothing;

-- Linhas para cada tipologia
insert into public.typology_lines (typology_id, name, price_factor)
select t.id, l.name, l.factor
from public.typologies t
cross join (values ('Suprema', 1.0), ('Gold', 1.3)) as l(name, factor)
on conflict do nothing;

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- Habilitado para todas as tabelas. Apenas usuários autenticados
-- podem acessar. Ajuste conforme sua necessidade.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.works enable row level security;
alter table public.typologies enable row level security;
alter table public.typology_lines enable row level security;
alter table public.work_typologies enable row level security;
alter table public.materials enable row level security;
alter table public.budgets enable row level security;
alter table public.orders enable row level security;

-- Profiles: cada usuário vê o próprio perfil
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Tabelas de negócio: acesso total para usuários autenticados
create policy "clients_all" on public.clients
  for all using (auth.role() = 'authenticated');
create policy "works_all" on public.works
  for all using (auth.role() = 'authenticated');
create policy "typologies_all" on public.typologies
  for all using (auth.role() = 'authenticated');
create policy "typology_lines_all" on public.typology_lines
  for all using (auth.role() = 'authenticated');
create policy "work_typologies_all" on public.work_typologies
  for all using (auth.role() = 'authenticated');
create policy "materials_all" on public.materials
  for all using (auth.role() = 'authenticated');
create policy "budgets_all" on public.budgets
  for all using (auth.role() = 'authenticated');
create policy "orders_all" on public.orders
  for all using (auth.role() = 'authenticated');
