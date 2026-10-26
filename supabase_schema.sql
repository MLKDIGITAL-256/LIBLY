-- LIBLY School Library Management System
-- Phase 2: Supabase database schema
-- Run in Supabase Dashboard -> SQL Editor, after creating your Supabase project.
-- Review the security notes in SUPABASE_DATABASE_GUIDE.md before using real student data.

create extension if not exists pgcrypto;

-- 1. Staff profiles. Authentication accounts are managed by Supabase Auth.
create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'librarian'
    check (role in ('admin', 'librarian')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- New auth users get a librarian profile by default.
-- An administrator must promote the appropriate account manually after verifying it.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.staff_profiles (user_id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'Library Staff'),
    'librarian'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_library_profile on auth.users;
create trigger on_auth_user_created_library_profile
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Helper functions for row-level security. These read the caller's own staff profile.
create or replace function public.is_library_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  );
$$;

create or replace function public.is_library_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'admin'
      and p.is_active = true
  );
$$;

-- 2. Students. Keep only information the school actually needs.
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  first_name text not null,
  last_name text not null,
  class_name text not null,
  stream text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staff_profiles(user_id) on delete set null
);

create index if not exists students_name_search_idx
  on public.students (lower(last_name), lower(first_name));
create index if not exists students_class_idx
  on public.students (class_name, stream);

-- 3. Catalogue organisation.
create table if not exists public.book_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.library_shelves (
  id uuid primary key default gen_random_uuid(),
  shelf_code text not null unique,
  location_description text,
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  book_code text not null unique,
  title text not null,
  author text,
  isbn text,
  publisher text,
  publication_year integer check (publication_year is null or publication_year between 1000 and 2200),
  edition text,
  category_id uuid references public.book_categories(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staff_profiles(user_id) on delete set null
);

create index if not exists books_title_search_idx on public.books (lower(title));
create index if not exists books_author_search_idx on public.books (lower(author));
create index if not exists books_category_idx on public.books (category_id);

-- A book title can have several physical copies, each with its own barcode/ID.
create table if not exists public.book_copies (
  id uuid primary key default gen_random_uuid(),
  copy_code text not null unique,
  book_id uuid not null references public.books(id) on delete restrict,
  shelf_id uuid references public.library_shelves(id) on delete set null,
  condition text not null default 'good'
    check (condition in ('new', 'good', 'worn', 'damaged')),
  status text not null default 'available'
    check (status in ('available', 'maintenance', 'lost', 'withdrawn')),
  acquired_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staff_profiles(user_id) on delete set null
);

create index if not exists book_copies_book_idx on public.book_copies (book_id);
create index if not exists book_copies_shelf_idx on public.book_copies (shelf_id);
create index if not exists book_copies_status_idx on public.book_copies (status);

-- 4. Loan records. History is retained; returning a book updates returned_at rather than deleting a loan.
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  book_copy_id uuid not null references public.book_copies(id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '3 days'),
  returned_at timestamptz,
  borrowed_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  returned_by uuid references public.staff_profiles(user_id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  check (due_at > borrowed_at),
  check (returned_at is null or returned_at >= borrowed_at)
);

-- A physical copy cannot be on two active loans at once.
create unique index if not exists one_active_loan_per_copy
  on public.loans (book_copy_id)
  where returned_at is null;
create index if not exists loans_student_history_idx
  on public.loans (student_id, borrowed_at desc);
create index if not exists loans_due_active_idx
  on public.loans (due_at)
  where returned_at is null;
create index if not exists loans_borrowed_by_idx on public.loans (borrowed_by);

-- 5. Append-only audit trail for loan actions.
create table if not exists public.loan_audit_log (
  id bigint generated always as identity primary key,
  loan_id uuid not null references public.loans(id) on delete restrict,
  action text not null check (action in ('borrowed', 'returned', 'edited')),
  actor_user_id uuid references public.staff_profiles(user_id) on delete set null,
  occurred_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb
);

create index if not exists loan_audit_loan_idx
  on public.loan_audit_log (loan_id, occurred_at desc);
create index if not exists loan_audit_actor_idx
  on public.loan_audit_log (actor_user_id, occurred_at desc);

create or replace function public.audit_loan_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'borrowed';
    insert into public.loan_audit_log (loan_id, action, actor_user_id, new_values)
    values (new.id, v_action, coalesce(new.borrowed_by, (select auth.uid())),
      jsonb_build_object(
        'student_id', new.student_id,
        'book_copy_id', new.book_copy_id,
        'borrowed_at', new.borrowed_at,
        'due_at', new.due_at
      ));
    return new;
  elsif tg_op = 'UPDATE' then
    if old.returned_at is null and new.returned_at is not null then
      v_action := 'returned';
    else
      v_action := 'edited';
    end if;

    insert into public.loan_audit_log (loan_id, action, actor_user_id, old_values, new_values)
    values (
      new.id,
      v_action,
      case when v_action = 'returned' then coalesce(new.returned_by, (select auth.uid()))
           else (select auth.uid()) end,
      jsonb_build_object(
        'student_id', old.student_id,
        'book_copy_id', old.book_copy_id,
        'borrowed_at', old.borrowed_at,
        'due_at', old.due_at,
        'returned_at', old.returned_at
      ),
      jsonb_build_object(
        'student_id', new.student_id,
        'book_copy_id', new.book_copy_id,
        'borrowed_at', new.borrowed_at,
        'due_at', new.due_at,
        'returned_at', new.returned_at,
        'returned_by', new.returned_by
      )
    );
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists loans_audit_changes on public.loans;
create trigger loans_audit_changes
after insert or update on public.loans
for each row execute procedure public.audit_loan_change();

-- 6. Updated-at helper for editable records.
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

drop trigger if exists staff_profiles_updated_at on public.staff_profiles;
create trigger staff_profiles_updated_at before update on public.staff_profiles
for each row execute procedure public.set_updated_at();
drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at before update on public.students
for each row execute procedure public.set_updated_at();
drop trigger if exists books_updated_at on public.books;
create trigger books_updated_at before update on public.books
for each row execute procedure public.set_updated_at();
drop trigger if exists book_copies_updated_at on public.book_copies;
create trigger book_copies_updated_at before update on public.book_copies
for each row execute procedure public.set_updated_at();

-- 7. Enable row-level security on every application table.
alter table public.staff_profiles enable row level security;
alter table public.students enable row level security;
alter table public.book_categories enable row level security;
alter table public.library_shelves enable row level security;
alter table public.books enable row level security;
alter table public.book_copies enable row level security;
alter table public.loans enable row level security;
alter table public.loan_audit_log enable row level security;

-- Staff may read their own profile. Admins can read all profiles and manage roles.
drop policy if exists "staff read own profile or admin reads all" on public.staff_profiles;
create policy "staff read own profile or admin reads all"
on public.staff_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_library_admin()));

drop policy if exists "admins manage staff profiles" on public.staff_profiles;
create policy "admins manage staff profiles"
on public.staff_profiles for all to authenticated
using ((select public.is_library_admin()))
with check ((select public.is_library_admin()));

-- Students: all active library staff can search/read; admins maintain the student register.
drop policy if exists "staff read students" on public.students;
create policy "staff read students"
on public.students for select to authenticated
using ((select public.is_library_staff()));

drop policy if exists "admins manage students" on public.students;
create policy "admins manage students"
on public.students for all to authenticated
using ((select public.is_library_admin()))
with check ((select public.is_library_admin()));

-- Catalogue: staff can read; admins maintain books, copies, categories and shelves.
drop policy if exists "staff read categories" on public.book_categories;
create policy "staff read categories"
on public.book_categories for select to authenticated
using ((select public.is_library_staff()));
drop policy if exists "admins manage categories" on public.book_categories;
create policy "admins manage categories"
on public.book_categories for all to authenticated
using ((select public.is_library_admin()))
with check ((select public.is_library_admin()));

drop policy if exists "staff read shelves" on public.library_shelves;
create policy "staff read shelves"
on public.library_shelves for select to authenticated
using ((select public.is_library_staff()));
drop policy if exists "admins manage shelves" on public.library_shelves;
create policy "admins manage shelves"
on public.library_shelves for all to authenticated
using ((select public.is_library_admin()))
with check ((select public.is_library_admin()));

drop policy if exists "staff read books" on public.books;
create policy "staff read books"
on public.books for select to authenticated
using ((select public.is_library_staff()));
drop policy if exists "admins manage books" on public.books;
create policy "admins manage books"
on public.books for all to authenticated
using ((select public.is_library_admin()))
with check ((select public.is_library_admin()));

drop policy if exists "staff read copies" on public.book_copies;
create policy "staff read copies"
on public.book_copies for select to authenticated
using ((select public.is_library_staff()));
drop policy if exists "admins manage copies" on public.book_copies;
create policy "admins manage copies"
on public.book_copies for all to authenticated
using ((select public.is_library_admin()))
with check ((select public.is_library_admin()));

-- Borrow/return records: active staff may create loans and return/update them.
-- Deletes are deliberately not allowed by any browser policy.
drop policy if exists "staff read loans" on public.loans;
create policy "staff read loans"
on public.loans for select to authenticated
using ((select public.is_library_staff()));

drop policy if exists "staff create loans" on public.loans;
create policy "staff create loans"
on public.loans for insert to authenticated
with check (
  (select public.is_library_staff())
  and borrowed_by = (select auth.uid())
);

drop policy if exists "staff update loans" on public.loans;
create policy "staff update loans"
on public.loans for update to authenticated
using ((select public.is_library_staff()))
with check ((select public.is_library_staff()));

-- Audit records are readable by admins only; insertion is performed by the trigger.
drop policy if exists "admins read audit log" on public.loan_audit_log;
create policy "admins read audit log"
on public.loan_audit_log for select to authenticated
using ((select public.is_library_admin()));

-- No insert/update/delete policy for audit logs means browser clients cannot alter them directly.

-- 8. Helpful report view: active loans, overdue loans and student/book details.
create or replace view public.active_loan_report
with (security_invoker = true)
as
select
  l.id as loan_id,
  s.student_number,
  s.first_name,
  s.last_name,
  s.class_name,
  s.stream,
  b.book_code,
  b.title as book_title,
  bc.copy_code,
  l.borrowed_at,
  l.due_at,
  (l.due_at < now()) as is_overdue,
  l.borrowed_by
from public.loans l
join public.students s on s.id = l.student_id
join public.book_copies bc on bc.id = l.book_copy_id
join public.books b on b.id = bc.book_id
where l.returned_at is null;

-- 9. Starter categories (safe to re-run).
insert into public.book_categories (name, description) values
  ('Fiction', 'Novels, short stories and other fictional works'),
  ('Non-fiction', 'Informational and factual works'),
  ('Science', 'Science and related subjects'),
  ('History', 'History and biographies'),
  ('Reference', 'Dictionaries, encyclopedias and reference works'),
  ('Religious Studies', 'Religious and spiritual study materials'),
  ('Languages', 'Language and literature learning resources'),
  ('ICT', 'Computing and information technology')
on conflict (name) do nothing;

-- IMPORTANT:
-- 1) Create the first staff account through Supabase Auth / the app.
-- 2) Verify the account's UUID in Authentication -> Users.
-- 3) Promote it to admin in SQL Editor using:
--    update public.staff_profiles set role = 'admin' where user_id = 'PASTE-VERIFIED-USER-UUID-HERE';
-- Never expose a service_role key in frontend code.
