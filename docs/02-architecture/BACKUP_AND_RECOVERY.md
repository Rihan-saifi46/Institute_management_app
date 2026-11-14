# Backup and Disaster Recovery Architecture

## 1. Data Safety Philosophy & Core Principles

For an educational institute, student admissions, attendance logs, and financial records represent critical business assets. System architecture must guarantee that data cannot be permanently lost due to software failure, accidental deletion, account compromise, or cloud provider outages.

> [!CRITICAL]
> **Mandatory Realities & Disclaimers:**
> 1. **Supabase Free Tier does NOT include automated daily downloadable backups or Point-in-Time Recovery (PITR).** Those features start at the $25/month Pro plan. Therefore, a verifiable, automated, off-site backup pipeline is mandatory.
> 2. **In-app CSV and JSON exports are data portability tools, NOT disaster recovery backups.** They do not preserve schemas, database constraints, user credentials, audit triggers, views, or database functions.
> 3. **Inactivity pausing is NOT data deletion.** Supabase Free pauses compute after 7 days of inactivity; all data remains safely stored in the underlying cloud volume and is restored in 2–4 minutes via the dashboard.

---

## 2. Multi-Tiered Backup Architecture

```mermaid
flowchart TD
    subgraph Trigger["Backup Triggers"]
        DailyCron["Scheduled Daily Cron (00:00 UTC)<br/><i>(Subject to runner queue jitter)</i>"]
        PreMigration["Pre-Migration Automated Hook"]
        ManualDispatch["Manual Workflow Dispatch (On-Demand)"]
    end

    subgraph Pipeline["GitHub Actions Secure Runner"]
        PGDump["pg_dump Utility<br/>(Full Schema + Data + RLS + Views)"]
        IntegrityGate["Integrity Verification Gate<br/>(File Size >= 10KB + Header Check + SHA-256)"]
        GPG["GPG Asymmetric Encryption<br/>(Public Key in GitHub Secrets)"]
        Heartbeat["Timestamp Heartbeat Tracker<br/>(latest_backup.json to R2)"]
        Alert["Alerting Engine (Email: saifirihan683@gmail.com)<br/>(Triggered on Failure or Stale > 24h)"]
    end

    subgraph PrimaryStorage["Primary Destination (Independent)"]
        R2["Cloudflare R2 Encrypted Bucket<br/>(S3-Compatible, 10 GB Free, Zero Egress)"]
    end

    subgraph SecondaryStorage["Secondary Destination (Independent Provider)"]
        GitHubReleases["GitHub Private Repository Releases / AWS S3"]
    end

    DailyCron --> PGDump
    PreMigration --> PGDump
    ManualDispatch --> PGDump

    PGDump --> IntegrityGate
    IntegrityGate -->|Passed| GPG
    IntegrityGate -.->|Failed (Empty / Corrupted)| Alert
    
    GPG -->|Upload Encrypted .sql.gpg + .sha256| R2
    GPG -->|Upload Duplicate Copy| SecondaryStorage
    GPG --> Heartbeat

    Heartbeat -.->|Stale > 24 Hours| Alert
    GPG -.->|Upload Error| Alert
```

---

## 3. The 10 Mandatory Data Safety Requirements

### 3.1 Daily Automated Full PostgreSQL Backups & Execution Realities
* **Cadence:** Scheduled daily at 00:00 UTC.
* **Cron Jitter Safeguard:** GitHub Actions scheduled workflows run on shared runner pools and are not guaranteed to execute at the exact minute scheduled (delays of 15–45 minutes can occur during peak global GitHub load).
* **Manual Trigger (`workflow_dispatch`):** The workflow includes a `workflow_dispatch` trigger, allowing the institute owner to run immediate on-demand backups with a single click.
* **Mechanism:** Runs native PostgreSQL `pg_dump` connecting via the direct connection string (port 5432).
* **Scope:** Captures full DDL schemas (`public`, `auth`), all table data, sequences, constraints, indexes, views, and functions.

### 3.2 Pre-Migration Encrypted Backups
* **Policy:** No DDL migration script may be executed against the production database without first taking a full, verified, timestamped backup.
* **Automation:** Integrated into the database migration deployment workflow.

### 3.3 Strict Retention Policy: 30 Daily & 12 Monthly Points
* **Daily Retention:** Retain **30 consecutive daily backups** (rolling 30-day window).
* **Monthly Retention:** Retain the first backup of each month for **12 months** (1 full calendar year) to satisfy annual financial auditing requirements.
* **Lifecycle Automation:** Cloudflare R2 object lifecycle rules automatically prune backups older than their designated retention window.

### 3.4 Primary Storage Independent of Supabase (Cloudflare R2)
* **Storage Location:** Primary backup archives are transferred directly from the runner to **Cloudflare R2**.
* **Provider Independence:** Even if the Supabase account is terminated, suspended, or experiences an outage, backup archives remain fully accessible in Cloudflare.
* **Cost:** 10 GB free storage, zero egress bandwidth fees.

### 3.5 Secondary Storage in an Independent Provider / Account
* **Storage Location:** A duplicate copy is stored in a completely separate cloud infrastructure (e.g. **GitHub Private Releases** or an independent AWS S3 bucket).
* **Defense Against Account Compromise:** If an attacker compromises Cloudflare credentials, the secondary archive in GitHub/AWS remains isolated and untouched.

### 3.6 Strict Asymmetric Encryption (Public Key in Cloud, Private Key Offline)
* **Architecture:** Backup encryption utilizes **GPG Asymmetric (Public/Private Key) Encryption**:
  - The GitHub Actions runner is configured with **ONLY the Public Encryption Key** (`GPG_PUBLIC_KEY`).
  - Backups are encrypted during creation: `gpg --encrypt --recipient "Z Institute Backup"`.
  - **The Private Decryption Key is kept strictly offline** in the owner's encrypted password manager / physical cold storage.
* **Zero Credential Exposure:** Even if GitHub repository secrets or the runner environment are compromised, an attacker **cannot decrypt historical backups** because the private key does not exist anywhere in the cloud.
* **Rule:** Never commit encryption keys, database credentials, or provider access tokens to version control.

### 3.7 Backup Integrity Verification Gate & Freshness Monitoring
* **Pre-Upload Integrity Verification:** A backup is not marked successful simply because `pg_dump` completed. The workflow validates:
  1. **File Size Check:** Output SQL dump file must be non-empty and exceed minimum expected schema size ($\ge 10 \text{ KB}$).
  2. **Header Syntax Check:** Verifies PostgreSQL dump header signature (`PostgreSQL database dump complete` marker).
  3. **Checksum Generation:** Generates a SHA-256 checksum (`.sha256`) uploaded alongside the encrypted archive.
* **Timestamp Tracking & Freshness Alerts:**
  - Upon successful upload, a metadata file `latest_backup_timestamp.json` is updated in Cloudflare R2 containing the execution ISO timestamp, archive file name, byte size, and SHA-256 hash.
  - A freshness monitoring check alerts the owner email (`saifirihan683@gmail.com`) if the last successful backup timestamp becomes older than **24 hours**.

### 3.8 Monthly Isolated Restore Verification
* **Requirement:** On the first Sunday of every month, an automated or manual restoration drill is executed against a temporary, isolated PostgreSQL instance (local Docker container or ephemeral database).
* **Validation:** Sanity queries confirm that student counts, payment ledger totals, and balance calculations match production metrics.

### 3.9 Comprehensive Recovery Procedures Across 4 Scenarios
The system maintains documented, tested recovery runbooks for:
1. **Accidental Record Deletion:** Immediate recovery from the latest daily snapshot.
2. **Data Corruption / Malicious Modification:** Rollback to a clean pre-corruption state.
3. **Account Compromise:** Spinning up a fresh database in an alternate cloud account and restoring from encrypted offsite archives using the offline private key.
4. **Cloud Provider Outage:** Deploying to an alternate PostgreSQL host (e.g. Neon, AWS RDS, or self-hosted) within 1 hour.

### 3.10 Realistic Recovery Objectives (RPO & RTO)

| Metric | Target SLA | Justification |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **$\le$ 24 Hours** (Daily Backups)<br>**0 Hours** (For planned migrations) | Backups execute every 24 hours. In the worst-case catastrophic failure, at most 1 day of attendance/payments requires re-entry. Planned migrations have 0-hour data loss. |
| **Recovery Time Objective (RTO)** | **$\le$ 45 Minutes** | Time required to provision a new PostgreSQL instance, decrypt the backup file with the offline key, and execute `psql -f restore.sql`. |

---

## 4. In-App Data Portability vs. Disaster Recovery

| Dimension | In-App CSV/JSON Export | Full PostgreSQL Off-Site Backup |
| :--- | :--- | :--- |
| **Target User** | Institute Owner / Operational Staff | Systems Administrator / Recovery Engine |
| **Data Scope** | Tabular business rows only | Full database: Schemas, Auth tables, RLS, Views, Functions |
| **Format** | `.json` / `.csv` | Encrypted `.sql.gpg` archive + `.sha256` checksum |
| **Storage Destination** | Local desktop / USB drive | Offsite Cloudflare R2 & GitHub Releases |
| **Restoration Capability**| Requires custom data ingestion script | Instant, native restoration via `psql` command |
| **Classification** | **User Data Portability** | **Authoritative Disaster Recovery** |
