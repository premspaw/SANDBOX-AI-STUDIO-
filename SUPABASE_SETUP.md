# Supabase Integration for AI Cinema Studio

This guide helps you set up Supabase as the backend for your AI Cinema Studio.

## 1. Create a Supabase Project

1.  Go to [Supabase](https://supabase.com/) and create a new project.
2.  Wait for the database to start.

## 2. Get API Keys

1.  Go to **Project Settings** -> **API**.
2.  Copy `Project URL`.
3.  Copy `anon` public key.
4.  Paste them into your `.env` file:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Create Storage Bucket

1.  Go to **Storage** from the sidebar.
2.  Create a new bucket named `assets`.
3.  **Important**: Make it a **Public Bucket**.
4.  Save.

## 4. Create Database Table

1.  Go to **SQL Editor** from the sidebar.
2.  Paste and run the following SQL query to create the `assets` table and enable RLS:

```sql
-- Table 1: Assets
create table public.assets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text,
  type text,
  path text,
  url text,
  size text
);

alter table public.assets enable row level security;
create policy "Allow public read access" on public.assets for select to public using ( true );
create policy "Allow public insert access" on public.assets for insert to public with check ( true );

-- Table 2: Characters
create table public.characters (
  id uuid default gen_random_uuid() primary key,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  name text,
  visual_style text,
  origin text,
  image text,
  identity_kit jsonb,
  metadata jsonb
);

alter table public.characters enable row level security;
create policy "Allow public read access" on public.characters for select to public using ( true );
create policy "Allow public insert access" on public.characters for insert to public with check ( true );
create policy "Allow public update access" on public.characters for update to public using ( true );
create policy "Allow public delete access" on public.characters for delete to public using ( true );
```

## 5. Run the Server

Since the backend API handles saving integrations, you must run the backend server alongside the frontend.

1.  Open a new terminal.
2.  Run: `npm run server` (or `node server.js`)
3.  Keep `npm run dev` running in your other terminal.

## Updates Made

-   **Frontend**: `AssetsLibrary.jsx` now fetches directly from Supabase.
-   **Backend**: `server.js` now uploads generated images to Supabase Storage and records them in the Database.
