-- =====================================================================
-- Customer Manager: database schema
-- วิธีใช้: เปิด Supabase Dashboard -> SQL Editor -> New query
--          วางไฟล์นี้ทั้งไฟล์ แล้วกด Run (รันซ้ำได้ ไม่พัง)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ลบตาราง todos ที่ใช้เทส
-- ---------------------------------------------------------------------
drop table if exists public.todos cascade;

-- ---------------------------------------------------------------------
-- 1. profiles: ข้อมูลผู้ใช้ + role (ผูกกับ auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- สร้าง profile อัตโนมัติเมื่อมีคนสมัคร (role เริ่มต้นเป็น user เสมอ)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- เช็กว่าคนที่ login อยู่เป็น admin หรือไม่ (security definer กัน RLS วนซ้ำ)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "profiles: admin delete" on public.profiles;
create policy "profiles: admin delete"
  on public.profiles for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 2. customers
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text,
  phone text,
  email text,
  address text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- สำหรับฐานข้อมูลที่สร้างไว้ก่อนมีคอลัมน์วันเกิด
alter table public.customers add column if not exists birth_date date;

alter table public.customers enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop policy if exists "customers: authenticated read" on public.customers;
create policy "customers: authenticated read"
  on public.customers for select
  to authenticated
  using (true);

drop policy if exists "customers: admin insert" on public.customers;
create policy "customers: admin insert"
  on public.customers for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "customers: admin update" on public.customers;
create policy "customers: admin update"
  on public.customers for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "customers: admin delete" on public.customers;
create policy "customers: admin delete"
  on public.customers for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 3. orders: ประวัติการสั่งซื้อ (1 ออเดอร์ = 1 สลิป)
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  order_date date not null default current_date,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  note text,
  slip_path text,
  created_at timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on public.orders (customer_id);

alter table public.orders enable row level security;

drop policy if exists "orders: authenticated read" on public.orders;
create policy "orders: authenticated read"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "orders: admin insert" on public.orders;
create policy "orders: admin insert"
  on public.orders for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update"
  on public.orders for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "orders: admin delete" on public.orders;
create policy "orders: admin delete"
  on public.orders for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 3.5 Custom Fields (ช่องข้อมูลลูกค้าที่ admin เพิ่มเองได้)
--     ดูคำอธิบายใน supabase/migrations/003_customer_custom_fields.sql
-- ---------------------------------------------------------------------
-- 1. ค่าของฟิลด์เสริม เก็บรวมในคอลัมน์ JSONB เดียว
alter table public.customers
  add column if not exists extra jsonb not null default '{}'::jsonb;

-- 2. นิยามฟิลด์
create table if not exists public.customer_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  label text not null check (length(trim(label)) > 0),
  type text not null check (type in ('text', 'textarea', 'number', 'date', 'select', 'checkbox')),
  required boolean not null default false,
  options text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists customer_fields_sort_idx
  on public.customer_fields (sort_order, created_at);

alter table public.customer_fields enable row level security;

drop policy if exists "customer_fields: authenticated read" on public.customer_fields;
create policy "customer_fields: authenticated read"
  on public.customer_fields for select
  to authenticated
  using (true);

drop policy if exists "customer_fields: admin insert" on public.customer_fields;
create policy "customer_fields: admin insert"
  on public.customer_fields for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "customer_fields: admin update" on public.customer_fields;
create policy "customer_fields: admin update"
  on public.customer_fields for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "customer_fields: admin delete" on public.customer_fields;
create policy "customer_fields: admin delete"
  on public.customer_fields for delete
  to authenticated
  using ((select public.is_admin()));

-- 3. ลบฟิลด์ + ลบค่าของฟิลด์นั้นออกจากลูกค้าทุกคน (ในคำสั่งเดียว)
--    security invoker = ทำงานด้วยสิทธิ์ของคนเรียก RLS จึงยอมให้เฉพาะ admin
create or replace function public.delete_customer_field(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_key text;
begin
  delete from public.customer_fields where id = p_id returning key into v_key;
  if v_key is null then
    raise exception 'ไม่พบฟิลด์ หรือไม่มีสิทธิ์ลบ';
  end if;

  update public.customers
     set extra = extra - v_key
   where extra ? v_key;
end;
$$;

revoke execute on function public.delete_customer_field(uuid) from anon;
grant execute on function public.delete_customer_field(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Storage: bucket "slips" (private, รูปไม่เกิน 5 MB)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slips', 'slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "slips: authenticated read" on storage.objects;
create policy "slips: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'slips');

drop policy if exists "slips: admin insert" on storage.objects;
create policy "slips: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'slips' and (select public.is_admin()));

drop policy if exists "slips: admin update" on storage.objects;
create policy "slips: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'slips' and (select public.is_admin()))
  with check (bucket_id = 'slips' and (select public.is_admin()));

drop policy if exists "slips: admin delete" on storage.objects;
create policy "slips: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'slips' and (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 5. สร้าง profile ให้ผู้ใช้ที่สมัครไว้ก่อนรันไฟล์นี้ (ถ้ามี)
-- ---------------------------------------------------------------------
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', ''), 'user'
from auth.users u
on conflict (id) do nothing;

-- =====================================================================
-- ตั้ง admin คนแรก: สมัครผ่านหน้าเว็บก่อน แล้วรันคำสั่งนี้ (เปลี่ยนอีเมล)
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- =====================================================================
