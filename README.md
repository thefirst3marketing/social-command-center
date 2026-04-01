# Social Command Center
### Built for The First Three

A private dashboard that syncs TikTok and Instagram analytics via Apify.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy the example file and fill in your credentials:
```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:
- `APIFY_API_TOKEN` — from apify.com → Settings → Integrations
- `NEXT_PUBLIC_SUPABASE_URL` — from supabase.com → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from supabase.com → Settings → API → anon/public key (starts with eyJ...)

### 3. Set up the database
1. Go to your Supabase project
2. Click **SQL Editor** → **New Query**
3. Paste the contents of `supabase-setup.sql`
4. Click **Run**

### 4. Run locally
```bash
npm run dev
```
Open http://localhost:3000

---

## Usage

### Dashboard (you)
http://localhost:3000

- Toggle between "All accounts", "My accounts", "Clients"
- Click **↻ Sync now** to pull fresh data from Apify (takes ~2-3 min)
- View follower trends, engagement rates, top posts per account

### Client report (shareable)
http://localhost:3000/client  
*(or your-domain.vercel.app/client once deployed)*

- Clean, presentation-ready view showing only client accounts
- Safe to share directly with clients — no backend details visible

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your environment variables in Vercel dashboard → Settings → Environment Variables.

---

## Tracked accounts

**Tesia**
- Instagram: @tesiakuh, @atetheplate_, @thefirstthree.co
- TikTok: @atetheplate

**Clients**
- Zach for Controller: @zachforcontroller (IG + TT)

---

## Automating syncs
To auto-sync daily without clicking "Sync now":
1. In Apify, open each actor → Schedule → Add schedule → Every 24 hours
2. Set the webhook URL to: `https://your-domain.vercel.app/api/scrape`
3. Method: POST

Data will refresh automatically every morning.
