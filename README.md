<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4cb9e95e-9fa4-4413-b256-888629351014

## Run Locally

**Prerequisites:** Node.js, Supabase project

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `SUPABASE_URL` — your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Project Settings → API
   - `SUPABASE_ACCESS_TOKEN` — personal access token for migrations
3. **Restore your Supabase project** if it is paused (Dashboard → project → Restore).
4. Run database migration:
   `npm run db:migrate`
5. Run the app:
   `npm run dev`

Data is stored in Supabase tables: `dumps`, `citizen_reports`, `verification_logs`.
