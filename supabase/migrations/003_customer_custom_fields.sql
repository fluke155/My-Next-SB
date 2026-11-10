-- =====================================================================
-- Custom Fields: admin เพิ่มช่องข้อมูลลูกค้าเองได้ผ่านหน้าเว็บ
-- วิธีใช้: Supabase Dashboard -> SQL Editor -> วางไฟล์นี้แล้วกด Run (รันซ้ำได้)
--
-- แนวคิด:
--   customer_fields  = รายการนิยามช่อง (ชื่อ ชนิด บังคับกรอกไหม ตัวเลือก)
--   customers.extra  = ค่าของแต่ละช่อง เก็บเป็น JSON { "<key>": <value> }
-- =====================================================================

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
