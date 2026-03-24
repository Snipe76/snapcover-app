# Storage Migration: Supabase → Cloudflare R2

> **When to migrate:** When Supabase storage (1GB free) is running low, or before launching to avoid bandwidth costs.

---

## Why R2?

| Provider | Free tier | After free |
|---|---|---|
| Supabase Storage | 1GB | $5/100GB |
| **Cloudflare R2** | **10GB + no egress fees** | $0.015/GB/month |

Egress fees are what kills you on AWS S3. R2 has none.

---

## Steps

### 1. Create an R2 bucket

1. Sign up at https://dash.cloudflare.com
2. Go to **R2 Object Storage** → **Create bucket**
3. Name it `snapcover-receipts`
4. Set public bucket or use a custom domain

### 2. Add R2 credentials

1. In R2 dashboard → **Manage API Tokens**
2. Create a token with **Edit** permission
3. Copy: Account ID, Access Key ID, Secret Access Key

### 3. Update Supabase external storage

Supabase supports S3-compatible external storage:

1. Supabase Dashboard → Storage → Settings
2. Add a new S3-compatible provider: R2
3. Enter credentials:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` = `auto`
   - `AWS_BUCKET` = `snapcover-receipts`
   - `AWS_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com`

### 4. Update app code

No code changes needed — Supabase Storage handles it transparently.

If using the S3 client directly instead of Supabase Storage SDK:

```ts
// Replace Supabase storage with @aws-sdk/client-s3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

### 5. Migrate existing receipts (one-time)

Run a script to copy existing Supabase receipts to R2 and update the DB URLs.

---

## Environment variables to add

```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=snapcover-receipts
```
