# Supabase setup checklist

This guide prepares the starter to connect to Supabase. It does **not** provide a production database schema or production-ready access policies.

## 1. Create a Supabase project

1. Create a project in the Supabase dashboard.
2. Copy the project URL.
3. Copy the **publishable key** (older projects may label the public client key as `anon`).
4. Do not use the `service_role` key or a secret key in browser code.

## 2. Add public client configuration

Open `js/config.js` and fill in the values:

```js
export const SUPABASE_CONFIG = Object.freeze({
  url: "https://YOUR-PROJECT-REF.supabase.co",
  publishableKey: "YOUR_SUPABASE_PUBLISHABLE_KEY"
});
```

Replace the example strings with the actual values from your Supabase project. Do not commit real keys into a public repository unless you understand the exposure. A publishable/anon key is designed for client use, but **it is not a substitute for Row Level Security**.

## 3. Enable Authentication

1. In Supabase, open **Authentication** and review the sign-in settings.
2. Create a test user using the dashboard or a properly configured invitation flow.
3. Set allowed redirect URLs for your local development URL and production domain.
4. Test sign-in and sign-out.
5. Decide how school administrators invite and deactivate librarians.

The starter uses email/password sign-in when configuration is present. Demo-role buttons remain local previews and must never be treated as real authorisation.

## 4. Create the tenant/profile model before live data

A production schema should at minimum establish:

- `schools`: one row per school/tenant.
- `profiles`: a row associated with `auth.users.id`, containing the user's school membership and profile details.
- A trusted role/permission design for administrators and librarians.
- A school identifier on each school-owned record.
- Appropriate foreign keys and uniqueness constraints.

Do not allow a client to choose or edit their own trusted role or school membership. Set up invitations and profile creation through a controlled workflow.

## 5. Apply Row Level Security (RLS)

Before connecting real records:

- Enable RLS on every table exposed through the Supabase Data API.
- Write policies that restrict access to the authenticated user's authorised school.
- Restrict administrator-only actions to the appropriate role.
- Test with at least two separate schools and multiple users.
- Verify that changing a school ID in browser requests cannot reveal or alter another school's records.
- Never rely only on frontend navigation or hidden buttons for access control.

Use official documentation:
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/getting-started/quickstarts/javascript

## 6. Secure circulation transactions

When implementing real borrowing and returns, do not trust the browser to decide whether a copy is available or to supply the real transaction timestamp.

Use a PostgreSQL function (called through Supabase RPC) or another trusted backend operation to:

1. Confirm the authenticated user is authorised for the school.
2. Lock/check the requested physical copy.
3. Verify it is available (or currently on loan for a return).
4. Insert the loan or return event.
5. Record the authenticated librarian ID and server timestamp.
6. Update the copy/loan state in the same transaction.
7. Reject conflicting or invalid requests.

## 7. Data protection and backups

- Import only approved data.
- Collect only student details the school needs.
- Limit who can export student and borrower records.
- Configure database backups and test restoration.
- Decide on record retention and correction procedures with school management.
- Do not treat a successful sign-in as proof that the user belongs to the school entered in the login form.
