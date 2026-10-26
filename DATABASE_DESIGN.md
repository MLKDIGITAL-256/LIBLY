# Database design overview

## Main tables

| Table | Purpose |
|---|---|
| `staff_profiles` | Library staff identity, role, and active status |
| `students` | Student number, name, class, stream, and active status |
| `book_categories` | Subject/category classification |
| `library_shelves` | Shelf code and location description |
| `books` | One record per title/edition, including catalogue code and bibliographic details |
| `book_copies` | One record per physical copy, with unique copy code, shelf, condition, and status |
| `loans` | One borrowing event per physical copy; retained after return |
| `loan_audit_log` | Append-only audit events for loan creation, return, and edits |

## Important relationships

- One book title can have many physical copies.
- A physical copy can have many historical loans, but only one active loan at a time.
- A student can have many historical loans.
- Every loan records the staff account that checked it out; return records the staff account that processed the return.
- The default loan period is three days, using the database server's timestamp.

## Role boundaries

- **Administrator:** manages staff roles, students, catalogue titles, copies, categories, and shelves; can read the audit log.
- **Librarian:** can search/read student and catalogue records and create/update loan records.
- **Unauthenticated visitors:** have no access to the library data tables through these policies.

The SQL uses Row Level Security (RLS). RLS is an important baseline, but the complete application must still validate inputs and use atomic checkout/return operations to handle simultaneous actions safely.

## Test checklist after running the SQL

- [ ] A signed-out browser cannot read student or book records.
- [ ] A staff user without an active profile cannot read library records.
- [ ] An active librarian can search students/books and process permitted loan actions.
- [ ] A librarian cannot promote themselves or another account to administrator.
- [ ] An administrator can manage catalogue/student records and read the audit log.
- [ ] A book copy cannot have two active loans.
- [ ] Returning a book leaves the original loan row and adds a return audit event.
- [ ] Overdue report data matches the due date and return status.
- [ ] CSV imports reject duplicate student numbers/book codes/copy codes rather than silently overwriting records.

## Production cautions

This is a starter schema, not a substitute for a security review. Before real deployment, test the exact policies using separate user accounts and the Supabase API, confirm backups and recovery, and ensure the school's student-data handling rules are followed. Do not place the Supabase `service_role` secret in client-side code.
