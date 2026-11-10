-- เพิ่มวันเดือนปีเกิดของลูกค้า
-- วิธีใช้: Supabase Dashboard -> SQL Editor -> วางไฟล์นี้แล้วกด Run (รันซ้ำได้)
alter table public.customers add column if not exists birth_date date;
