-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)

-- Accounts table: all tracked handles
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  platform text not null check (platform in ('instagram', 'tiktok')),
  owner text not null check (owner in ('tesia', 'client')),
  client_name text,
  created_at timestamptz default now(),
  unique(handle, platform)
);

-- Snapshots: one row per account per scrape run
create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  scraped_at timestamptz default now(),
  followers bigint,
  following bigint,
  posts_count int,
  avg_likes numeric,
  avg_comments numeric,
  avg_views numeric,
  avg_saves numeric,
  engagement_rate numeric,
  raw jsonb
);

-- Posts: individual post performance
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  post_id text not null,
  platform text not null,
  posted_at timestamptz,
  scraped_at timestamptz default now(),
  caption text,
  media_type text,
  thumbnail_url text,
  post_url text,
  likes bigint default 0,
  comments bigint default 0,
  views bigint default 0,
  saves bigint default 0,
  shares bigint default 0,
  engagement_rate numeric,
  unique(post_id, platform)
);

-- Seed accounts
insert into accounts (handle, platform, owner, client_name) values
  ('@tesiakuh', 'instagram', 'tesia', null),
  ('@atetheplate_', 'instagram', 'tesia', null),
  ('@thefirstthree.co', 'instagram', 'tesia', null),
  ('@atetheplate', 'tiktok', 'tesia', null),
  ('@zachforcontroller', 'instagram', 'client', 'Zach for Controller'),
  ('@zachforcontroller', 'tiktok', 'client', 'Zach for Controller')
on conflict (handle, platform) do nothing;

-- Index for fast queries
create index if not exists snapshots_account_id_idx on snapshots(account_id);
create index if not exists snapshots_scraped_at_idx on snapshots(scraped_at desc);
create index if not exists posts_account_id_idx on posts(account_id);
create index if not exists posts_posted_at_idx on posts(posted_at desc);
