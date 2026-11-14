# Phase 3: Frontend Foundation & Authentication Shell

## 1. Objective
Scaffold the frontend single-page application using React.js and Vite, establish the Tailwind CSS design system and typography, integrate Lucide React iconography, build the responsive dashboard shell (sidebar, header, mobile navigation), and implement the Supabase authentication state context with protected route guards.

---

## 2. Scope
* Initialize React (Vite, TypeScript) in `client/`.
* Configure Tailwind CSS with the institute color palette and responsive breakpoints.
* Install and configure Lucide React icons.
* Build the application layout shell:
  - Collapsible desktop sidebar.
  - Mobile bottom navigation / hamburger drawer.
  - Global top header with user profile, role badge, and logout action.
* Build the Authentication module:
  - Login page (`/login`) with email and password inputs.
  - Client-side Auth Context (`AuthContext`) listening to `supabase.auth.onAuthStateChange`.
  - Higher-Order Component (`<ProtectedRoute>`) redirecting unauthenticated visitors to `/login`.

---

## 3. Out-of-Scope Items
* Building the detailed student, fee, or attendance screens (handled in Phases 4, 5, and 6).
* Offline service workers.

---

## 4. Prerequisites
* Completion and approval of Phase 2 (Supabase client and service layer established).
* Node.js and npm available locally.

---

## 5. Step-by-Step Tasks

### Task 3.1: Initialize React Application
```bash
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install lucide-react react-router-dom
```

### Task 3.2: Configure Tailwind CSS
Configure `client/tailwind.config.js` with modern neutral palettes, brand indigo/slate shades, and custom container utilities.

### Task 3.3: Implement Auth Context & Token Management
Create `client/src/context/AuthContext.tsx`:
- Listens to `supabase.auth.onAuthStateChange` to track active session.
- Fetches administrator role from `public.admins` matching `session.user.id`.
- Provides `login`, `logout`, `user`, `role`, and `isLoading` to all children.

### Task 3.4: Build Route Guards
Create `client/src/components/ProtectedRoute.tsx`:
- Renders loading spinner while session initializes.
- Redirects to `/login` if unauthenticated.
- Renders `<Outlet />` if authenticated.

### Task 3.5: Build Responsive Dashboard Shell
Create `client/src/components/layout/DashboardLayout.tsx`:
- Sidebar navigation links:
  - Dashboard Overview (`/`)
  - Students Directory (`/students`)
  - Fee Management (`/fees`)
  - Attendance Sheet (`/attendance`)
  - Settings & Backups (`/settings`)
- Responsive collapse behavior for tablet and mobile screens.

### Task 3.6: Build Login Screen
Create `client/src/pages/Login.tsx`:
- Clean, focused card layout.
- Email and password fields with validation and loading states.
- Error banner for invalid credentials.

---

## 6. Expected Files & Deliverables
* `client/src/App.tsx` (Route definitions)
* `client/src/context/AuthContext.tsx`
* `client/src/components/ProtectedRoute.tsx`
* `client/src/components/layout/DashboardLayout.tsx`
* `client/src/components/layout/Sidebar.tsx`
* `client/src/components/layout/Header.tsx`
* `client/src/pages/Login.tsx`
* `client/src/pages/DashboardOverview.tsx`
* `client/tailwind.config.js`

---

## 7. Database Changes
* None in this phase.

---

## 8. Security Requirements
* Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are bundled in the frontend.
* Sanitize all inputs before transmission.
* Route transitions to protected pages must fail closed if authentication cannot be verified.

---

## 9. Testing Strategy
* **Route Protection Test:** Navigate directly to `http://localhost:5173/students` in an incognito window $\rightarrow$ Must redirect immediately to `/login`.
* **Login Flow Test:** Enter valid Super Admin credentials $\rightarrow$ Redirects to Dashboard with user name displayed in header.
* **Responsive Layout Test:** Verify navigation sidebar renders as a drawer on mobile viewports (< 768px).

---

## 10. Acceptance Criteria
* [ ] Application compiles cleanly with zero TypeScript or Vite errors.
* [ ] Login screen authenticates against Supabase Auth and persists session.
* [ ] Route guard intercepts unauthenticated visitors.
* [ ] Dashboard layout is fully responsive across mobile, tablet, and desktop.

---

## 11. Rollback Plan
* Revert frontend files to initial Vite template via Git if styling or layout anomalies occur.

---

## 12. Dependencies on Previous Phases
* **Depends on:** Phase 2 (Supabase client configuration).
