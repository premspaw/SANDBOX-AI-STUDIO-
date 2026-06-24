# Supabase Integration & Database Schema Documentation

This document provides a comprehensive overview of the Supabase integration, credentials, database schema, tables, and storage buckets used in **Sandbox AI Studio**.

---

## 🔑 Credentials & Environment Variables

The project connects to the remote Supabase database and storage instance using variables defined in [.env](file:///c:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/.env):

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | The URL endpoint of the Supabase project. |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous API key used in client-side components. |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin service role API key. **Bypasses RLS** (Row Level Security). Used securely in the backend server. |

---

## 📋 Database Tables Schema

The database consists of the following key tables in the `public` schema:

### 1. `profiles`
* **Purpose**: Stores user profile information and subscription metadata.
* **Columns**:
  - `id` (`uuid`, PRIMARY KEY, references `auth.users`)
  - `email` (`text`)
  - `full_name` (`text`)
  - `role` (`text`)
  - `tier` (`text`)
  - `shorts_balance` (`int`, default: `50`)
  - `subscription_id` (`text`)
  - `subscription_end_date` (`timestamp`)
  - `last_payment_at` (`timestamp with time zone`)
  - `brand_voice` (`jsonb`)
  - `marketing_emails` (`boolean`)
  - `security_alerts` (`boolean`)
  - `two_factor_enabled` (`boolean`)
  - `created_at` (`timestamp`)
  - `updated_at` (`timestamp`)
* **RLS Policies**: Users can read/update only their own profiles (`auth.uid() = id`).

### 2. `assets`
* **Purpose**: The central media registry tracking generated images, videos, and character files.
* **Columns**:
  - `id` (`uuid`, PRIMARY KEY, default `gen_random_uuid()`)
  - `user_id` (`uuid`, references `auth.users` on delete cascade)
  - `name` (`text` not null)
  - `type` (`text`, check constraint: `'video', 'image', 'character', 'upscaled'`)
  - `url` (`text`) - CDN URL or path to the file in Supabase Storage.
  - `model` (`text`)
  - `parameter_settings` (`jsonb`)
  - `metadata` (`jsonb`, default: `{}`)
  - `created_at` (`timestamp with time zone`)
* **RLS Policies**: Public read access. Authenticated insert access. Owner delete access.
* **Notes**: Marketing templates are saved inside this table with `type: 'marketing_template'`.

### 3. `avatar_generations`
* **Purpose**: Tracks AI character avatar generations.
* **Columns**:
  - `id` (`uuid`, PRIMARY KEY, default `gen_random_uuid()`)
  - `user_id` (`uuid`, references `auth.users` on delete cascade)
  - `type` (`text`)
  - `character_name` (`text`)
  - `style` (`text`)
  - `ref_image_url` (`text`)
  - `output_url` (`text`)
  - `prompt` (`text`)
  - `metadata` (`jsonb`, default: `{}`)
  - `created_at` (`timestamp with time zone`)
* **RLS Policies**: Users can read, insert, and delete only their own avatar generations.

### 4. `shorts_transactions`
* **Purpose**: Audit log for the "Shorts" credit system (credit balance deductions, top-ups, refunds).
* **Columns**:
  - `id` (`uuid`, PRIMARY KEY, default `gen_random_uuid()`)
  - `user_id` (`uuid`, references `auth.users`)
  - `amount` (`int`) - Negative for spent, positive for earned/refund/top-up.
  - `action_type` (`text`) - e.g., `'razorpay_payment'`
  - `reason` (`text`) - e.g., `'image_gen'`, `'ugc_video'`, `'product_shoot'`, `'topup'`
  - `created_at` (`timestamp`)
* **RLS Policies**: Users can view their own transactions.

### 5. `billing_history`
* **Purpose**: Real-time record of Razorpay payments and plan purchases.
* **Columns**:
  - `id` (`uuid`, PRIMARY KEY, default `gen_random_uuid()`)
  - `user_id` (`uuid`, references `auth.users` not null)
  - `plan_name` (`text` not null)
  - `amount` (`decimal(10, 2)` not null)
  - `currency` (`text`, default: `'INR'`)
  - `status` (`text`, default: `'SUCCESS'`)
  - `transaction_id` (`text`)
  - `created_at` (`timestamp with time zone`)
* **RLS Policies**: Users browse own billing history. Admin/System insert access is permitted.

### 6. `ugc_scene_templates`
* **Purpose**: Curated presets/templates for the UGC Video Studio.
* **Columns**:
  - `id` (`uuid`, PRIMARY KEY, default `gen_random_uuid()`)
  - `title` (`text` not null)
  - `scene_context` (`text`)
  - `prompt` (`text` not null)
  - `img` (`text` not null)
  - `created_at` (`timestamp with time zone`)
* **RLS Policies**: Viewable by everyone. Insertable/deletable by authenticated users.

### 7. `characters`
* **Purpose**: User-saved AI cinematic characters.
* **Columns**:
  - `id` (`uuid`, PRIMARY KEY)
  - `user_id` (`uuid`, references `auth.users` on delete cascade)
  - `name` (`text`)
  - `identity_kit` (`jsonb`)
  - `metadata` (`jsonb`)

---

## 📁 Storage Configuration (Cloudflare R2)

The application has been configured to use **Cloudflare R2** as the primary storage client. All assets (videos, images, characters) are uploaded directly to R2 and served via a public CDN URL.

### R2 Environment Variables
The following keys are defined in [.env](file:///c:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/.env):

| Variable | Description | Value in this workspace |
| :--- | :--- | :--- |
| `R2_ENDPOINT` | R2 S3-API connection endpoint. | `https://4e88f062bf55477ce55ad23d8e7c6394.r2.cloudflarestorage.com` |
| `R2_ACCOUNT_ID` | Cloudflare account identifier. | `4e88f062bf55477ce55ad23d8e7c6394` |
| `R2_ACCESS_KEY_ID` | API Access Key ID. | `6fed64d113e41fb3ad1115d06b7c7fdf` |
| `R2_SECRET_ACCESS_KEY`| API Secret Access Key. | `268f203d...3e65806c693e25c` |
| `R2_BUCKET_NAME` | The R2 Bucket name. | `zerolensbucket-cdn` |
| `GCS_CDN_BASE_URL` | The public R2 Dev subdomain or custom domain. | *(Leave blank or configure with your bucket's `pub-*.r2.dev` URL)* |

> [!IMPORTANT]
> To serve uploaded files publicly in the browser, you must enable the **R2.dev Subdomain** or configure a custom domain in your Cloudflare R2 dashboard (under **Bucket -> Settings -> Public Access**). Once enabled, set `GCS_CDN_BASE_URL` to this domain (e.g. `https://pub-yourhash.r2.dev`) in `.env`.

---

## 🛠️ Verification & Maintenance

Several testing scripts are available in [scripts/](file:///c:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/scripts):
1. **Database Tables status**: [check_all_tables.js](file:///c:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/scripts/check_all_tables.js)
2. **Storage R2 connectivity**: [test_storage_service.js](file:///c:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/scripts/test_storage_service.js)

To run the verification:
```bash
node scripts/test_storage_service.js
```

---

## 📚 Installed Agent Skills

This workspace is integrated with Supabase-specific agent skills:
* [Supabase Base Skill](file:///C:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/.agents/skills/supabase/SKILL.md): Standard practices for database, storage, RLS, and auth operations.
* [Postgres Best Practices](file:///C:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/.agents/skills/supabase-postgres-best-practices/SKILL.md): Performance optimization, indexing, and SQL advice.
