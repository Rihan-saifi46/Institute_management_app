# Technology Stack Specification

## 1. Stack Components & Justification

| Layer | Selected Technology | Version / Spec | Primary Selection Reasons |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React.js** | 18.x / 19.x | Declarative component model, massive ecosystem, battle-tested state management, zero server runtime. |
| **Build Tool** | **Vite** | 5.x / 6.x | Near-instant Hot Module Replacement (HMR), optimized tree-shaken static production bundles. |
| **CSS & Styling** | **Tailwind CSS** | 3.4.x / 4.x | Utility-first styling, minimal production CSS bundle, responsive design utilities, cohesive color palette. |
| **Iconography** | **Lucide React** | Latest stable | Clean, lightweight SVG icons with consistent visual style and zero layout shift. |
| **Backend as a Service & DB** | **Supabase (PostgreSQL)** | PostgreSQL 15/16 | Relational SQL engine, native ACID transactions, auto-generated PostgREST APIs, and built-in Auth. |
| **Database Client** | **`@supabase/supabase-js`** | 2.x | Official client library providing authenticated REST queries, RPC calls, and session management. |
| **Static Hosting** | **Cloudflare Pages** | Cloudflare Edge | Unlimited free bandwidth, automated GitHub CI/CD deployments, zero cold starts for static files, commercial use allowed. |
| **Primary Backup Storage** | **Cloudflare R2** | S3-Compatible API | 10 GB free storage, zero egress bandwidth fees, independent of primary database host. |
| **Secondary Backup Storage** | **GitHub Private Releases** | Git LFS / Release Assets | Co-located with version control, independent infrastructure, encrypted offsite copy. |
| **Version Control & CI/CD** | **GitHub** | Private Repository | Free private code hosting, 2,000 free Actions runner minutes/month for CI/CD and automated backups. |

---

## 2. Official Documentation & Reference Links

* **Supabase Documentation:** [https://supabase.com/docs](https://supabase.com/docs)
* **Supabase Pricing & Free Plan Limits:** [https://supabase.com/pricing](https://supabase.com/pricing)
* **Supabase JavaScript Client:** [https://supabase.com/docs/reference/javascript/introduction](https://supabase.com/docs/reference/javascript/introduction)
* **PostgreSQL Row Level Security:** [https://supabase.com/docs/guides/auth/row-level-security](https://supabase.com/docs/guides/auth/row-level-security)
* **Cloudflare Pages Documentation:** [https://developers.cloudflare.com/pages/](https://developers.cloudflare.com/pages/)
* **Cloudflare R2 Storage Documentation:** [https://developers.cloudflare.com/r2/](https://developers.cloudflare.com/r2/)
* **Cloudflare R2 Free Tier Pricing:** [https://developers.cloudflare.com/r2/pricing/](https://developers.cloudflare.com/r2/pricing/)
* **Tailwind CSS Documentation:** [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
* **Vite Documentation:** [https://vitejs.dev/guide/](https://vitejs.dev/guide/)

---

## 3. Platform Free-Tier Quotas & Sustainable Capacity

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FREE-TIER USAGE AUDIT                           │
├─────────────────────────┬──────────────────────┬───────────────────────┤
│ Resource                │ Monthly Free Quota   │ Institute Peak Load   │
├─────────────────────────┼──────────────────────┼───────────────────────┤
│ Supabase DB Storage     │ 500 MB PostgreSQL    │ ~10–25 MB (10+ years) │
│ Supabase Auth (MAU)     │ 50,000 active users  │ 1–3 admin users       │
│ Supabase API Requests   │ Unlimited on free    │ ~300–800 per day      │
│ Cloudflare Pages Bandwidth│ Unlimited          │ ~2–5 GB/month         │
│ Cloudflare Pages Builds │ 500 builds/month     │ ~10–20 builds/month   │
│ Cloudflare R2 Storage   │ 10 GB (Zero egress)  │ ~100–300 MB (Backups) │
│ GitHub Actions Minutes  │ 2,000 min/month      │ ~45–60 min/month      │
└─────────────────────────┴──────────────────────┴───────────────────────┘
```

---

## 4. Architectural Evaluations & Discarded Alternatives

### 4.1 Why Was Cloudflare Workers Omitted for Standard CRUD?
In the previous architectural iteration, an intermediate Cloudflare Worker API gateway was proposed. Upon rigorous review, this proxy layer was omitted for the following reasons:
* **Unnecessary Indirection:** Supabase is designed specifically for direct client access using PostgREST. PostgREST maps HTTP operations directly to PostgreSQL tables, protected securely by **Row Level Security (RLS)**.
* **Maintenance & Complexity Reduction:** Bypassing an intermediate Worker removes custom API routing code, duplicate validation logic, and deployment complexity.
* **Transactional Stored Functions:** Atomic multi-statement workflows (such as batch attendance marking and authorized payment reversals) are handled directly by PostgreSQL stored functions (`rpc`), preserving complete transaction isolation without needing a custom server layer.

### 4.2 Why Supabase Over Neon for this Project?
* **All-in-One Operational Simplicity:** Supabase integrates the PostgreSQL database, Authentication service, and PostgREST API under a single unified dashboard, eliminating the need to coordinate multiple decoupled services.
* **Turnkey Table Editor & GUI:** Supabase provides an accessible web interface for the institute owner to audit data directly, inspect SQL views, and manage administrative accounts.
* **Proven Ecosystem:** Supabase Auth and PostgREST have years of production hardening, compared to newer alternative auth frameworks.
* **Inactivity Realities:** While Neon offers auto-wake-up, Supabase's 7-day inactivity pause is easily managed during normal institute operations. For prolonged holidays, unpausing takes 2 to 4 minutes with a single click, and data is permanently safe.

### 4.3 Why Not Next.js App Router on Vercel?
* **Commercial Restrictions:** Section 2 of Vercel's Terms of Service restricts the Hobby tier strictly to personal, non-commercial projects. Running an institute business on Vercel Hobby risks account suspension or forced upgrades to $20/month Pro.
* **SSR Overhead:** Server-side rendering (SSR) is unnecessary for an authenticated admin portal where public search engine indexing (SEO) is completely irrelevant.
