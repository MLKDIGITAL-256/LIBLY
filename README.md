# LIBLY — Phase 2: Supabase database setup

This phase creates the database foundation for the school library website. It includes student records, book titles, physical copies, shelves, categories, loans, return history, staff roles, and an audit trail.

## Files
- `supabase_schema.sql` — the SQL schema to run in Supabase.
- `DATABASE_DESIGN.md` — table overview, security model, and test checklist.

## Setup steps

1. Create a Supabase project in the Supabase dashboard.
2. Open **SQL Editor**.
3. Open `supabase_schema.sql`, copy all its contents, and run it.
4. In **Authentication**, create the first staff user. Use a real, controlled staff email address.
5. In **Table Editor → staff_profiles**, find that user's `user_id`. Verify the identity before promoting the account.
6. In SQL Editor, run the following with the verified UUID:
   ```sql
   update public.staff_profiles
   set role = 'admin'
   where user_id = 'PASTE-VERIFIED-USER-UUID-HERE';
   ```
7. Add the Supabase project URL and **publishable/anon key** to the frontend config when we connect the app. Do not put the `service_role` key in HTML, JavaScript, a public repository, or a browser.
8. Test using separate admin and librarian accounts before importing real data.

## Important implementation notes

- New Auth users are assigned the `librarian` role by default. Promote only the intended first administrator after verifying the account.
- Row Level Security (RLS) is enabled. Staff must have an active `staff_profiles` record to access library data.
- Admins manage the student register and catalogue. Librarians can search records and manage loans/returns.
- Loans default to a three-day period. The due date can be explicitly supplied by the app if the school chooses a different loan duration.
- Returning a book updates the original loan row; it does not delete the history.
- An audit trigger records who borrowed/returned a book and when.
- A partial unique index prevents one physical copy from having two active loans.
- Do not use real student data until the school has approved the system and you have tested access controls and backups.

## Known next step

The schema is the database foundation, not yet a complete production system. Next, connect the frontend and implement safe checkout/return database functions, CSV imports with validation, catalogue/student screens, and reports. For a school deployment, have a knowledgeable reviewer test RLS and audit behaviour before launch.
