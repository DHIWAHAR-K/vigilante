# Supabase setup

This directory contains the reviewed database contract for Vigilante web v1.

## Current state

- No Supabase project has been created or selected for Vigilante yet.
- The local Supabase CLI is not installed on this machine at the time this foundation was created.
- Migrations must not be applied to an existing or new Supabase project without explicit owner confirmation.

## Production sequence

1. Choose or create the Vigilante Supabase project in the confirmed organization.
2. Confirm project cost before creation when using the Supabase connector.
3. Review the migration SQL in `migrations/`.
4. Apply migrations to a development branch or local database first.
5. Run RLS tests with `supabase test db`.
6. Configure Vercel environment variables with the project URL and publishable key.
7. Configure Supabase Auth redirect URLs for local, preview, and production callback URLs.

Keep service-role and secret keys out of browser code and source control.
