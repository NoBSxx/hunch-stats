# Hunch Stats Dashboard

Live analytics dashboard for Hunch, fetching directly from Supabase.

## Local Development

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_SERVICE_KEY=your-service-role-key
   ```

2. Install and run:
   ```powershell
   npm install
   npm run dev
   ```

## Deploy to GitHub Pages

1. Create a new GitHub repo (private recommended).

2. Add three repository secrets in Settings → Secrets → Actions:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SERVICE_KEY`
   - `STATS_PASSWORD` — the password visitors will enter to view the dashboard

3. Enable GitHub Pages in Settings → Pages → Source: **GitHub Actions**.

4. Push to `main`. The workflow builds, encrypts with StatiCrypt, and deploys.

5. Visit `https://your-username.github.io/hunch-stats/` and enter your password.

## Updating the base path

If your repo is named something other than `hunch-stats`, update the `base` value in `vite.config.ts` to match: `base: '/your-repo-name/'`.
