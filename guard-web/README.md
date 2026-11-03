# Park-IT Staff Portal

The portal is a role-gated React/Vite client for guards and administrators. It uses the same Supabase Auth project and row-level policies as the mobile app; no service-role key belongs in this client.

## Local setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project.
2. From this directory, run `npm install`, then `npm run dev`.
3. Configure the portal's deployed `/invite-accept` URL and `parkit://reset-password` in Supabase Auth's allowed redirect URLs.

## Initial database and administrator setup

1. Apply `my-app/database/schema.sql` in the Supabase SQL Editor.
2. Before any administrator exists, insert a one-time pending invitation for the first administrator:

   ```sql
   INSERT INTO public.account_invitations (email, role)
   VALUES (LOWER('admin@example.edu'), 'admin');
   ```

3. In Supabase Auth, invite that same email address with the redirect URL set to the portal's `/invite-accept` path. The database trigger creates the administrator profile from the pending invitation. The administrator accepts the email invitation and chooses a password on the portal.
4. Once signed in, administrators can add student signup invitations and email guard invitations through the portal. Students create their own passwords in the mobile signup screen using their invited Student ID/email pair.

The student invitation roster in the schema is pending only; it does not create accounts or passwords. Students choose their password after signup using the invited Student ID/email pair.

## Edge Functions

From `my-app`, deploy both functions and configure the staff invite redirect:

```sh
supabase functions deploy student-login --project-ref <project-ref>
supabase functions deploy invite-account --project-ref <project-ref>
supabase secrets set INVITE_REDIRECT_URL=https://your-portal.example/invite-accept --project-ref <project-ref>
```

Allow that portal URL and `parkit://reset-password` in Supabase Auth's redirect URL settings. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; never expose the service-role key in the mobile app or portal.

Both functions disable automatic JWT verification in `my-app/supabase/config.toml` because student-ID login is unauthenticated by design and newer publishable keys are not JWTs. `invite-account` independently validates the caller's access token and active administrator role before it uses the service key.
