# Known Platform Limitations & Operational Constraints

## 1. Overview & Disclaimer

This document records the architectural boundaries, free-tier quotas, and known operational characteristics of the chosen technology stack (**Supabase PostgreSQL, Cloudflare Pages, Cloudflare R2, GitHub Actions**).

> [!CAUTION]
> **Free-Tier Policy Notice:** Free tiers are subject to change according to cloud provider terms of service. While these platforms currently offer robust, sustainable free allowances suitable for a small institute, free plans cannot be assumed to remain identical indefinitely. The automated offsite backup safeguards documented here guarantee complete data sovereignty and enable seamless migration to any PostgreSQL host if provider policies ever change.

---

## 2. Supabase Free Plan Limitations & Mitigations

### 2.1 7-Day Inactivity Project Pausing
* **Constraint:** Supabase Free Plan projects are automatically paused if **no API requests occur for 7 consecutive days**.
* **Impact:** If the institute closes for an extended vacation (e.g. 10 days for Diwali or summer break), the database compute engine will pause.
* **Important Fact: Pausing is NOT Deletion:** 
  - Inactive pausing simply shuts down the database compute engine to save cloud resources.
  - **All tables, records, schemas, auth users, and configurations remain 100% intact** in cloud storage.
* **Restoration Procedure:** Unpausing requires the owner to log into the Supabase Dashboard and click **"Restore Project"**, which spins up the database in **2 to 4 minutes**.
* **Mitigation During Normal Operations:** Normal daily institute operations (marking attendance and collecting fees 5–6 days a week) naturally prevent project pausing.

### 2.2 Lack of Automated Daily Backups on Free Tier
* **Constraint:** Supabase Free Plan does **not** include automated daily downloadable backups or Point-in-Time Recovery (PITR); these start on the $25/month Pro plan.
* **Mitigation:** Completely solved by our independent, automated daily backup pipeline running via GitHub Actions, dumping the database via `pg_dump`, encrypting with GPG AES-256, and uploading to Cloudflare R2 and GitHub Releases.

### 2.3 500 MB Database Storage Limit
* **Constraint:** Free tier projects include **500 MB of PostgreSQL database storage**.
* **Real-World Capacity Analysis:** An institute with 500 students, 10,000 payment records, and 50,000 attendance records consumes approximately **12 to 18 MB** of relational data. The 500 MB quota easily accommodates 10+ years of operational records.

### 2.4 50,000 Monthly Active Users (MAU) for Auth
* **Constraint:** Supabase Auth free tier accommodates 50,000 active users per month.
* **Real-World Impact:** The institute management system is a closed administrative dashboard with 1–3 administrative users. This consumes less than **0.01%** of the free allowance.

---

## 3. Cloudflare Pages & R2 Limitations

### 3.1 Cloudflare Pages
* **Bandwidth:** **Unlimited free bandwidth**.
* **Builds:** 500 builds per month (application updates require ~10–20 builds/month).
* **Domain:** Free `*.pages.dev` subdomain provided with automatic wildcard SSL certificate.

### 3.2 Cloudflare R2 Object Storage (Primary Backup)
* **Storage Limit:** **10 GB free storage per month**.
* **Operation Limits:** 1,000,000 Class A operations (writes) and 10,000,000 Class B operations (reads) per month.
* **Zero Egress Fees:** Cloudflare R2 does not charge for bandwidth when downloading backup files.
* **Capacity:** Retaining 30 daily compressed backups (~1–2 MB each) and 12 monthly archives consumes **< 100 MB**, well under the 10 GB free limit.

---

## 4. GitHub Actions Quota

* **Constraint:** 2,000 runner minutes per month for private repositories.
* **Impact:** The automated daily backup workflow executes in ~1.5 minutes per day (~45 minutes/month out of 2,000 free minutes). This consumes less than **2.5%** of the monthly allowance.

---

## 5. Disaster Recovery & Availability Matrix

| Event | Recovery Time (RTO) | Data Loss Window (RPO) | Operational Mechanism |
| :--- | :--- | :--- | :--- |
| **Accidental Inactivity Pausing (Holidays)** | 2 to 4 minutes | 0 minutes (Zero data loss) | 1-Click "Restore Project" in Supabase Dashboard |
| **Accidental Table Drop / Corruption** | $\le 45$ minutes | $\le 24$ hours (or latest snapshot) | Restore decrypted daily `.sql.gpg` dump via `psql` |
| **Catastrophic Provider Outage (Supabase)** | $\le 60$ minutes | $\le 24$ hours | Spin up alternate PostgreSQL instance & restore from Cloudflare R2 |
| **Local Hardware / Network Failure** | Immediate | 0 minutes | Cloud-hosted web application accessible from any internet device |
