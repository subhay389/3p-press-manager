@AGENTS.md

# 3P Press Manager

Internal web app for the **3P printing press** to record print jobs and track paper stock. It replaces four paper binders (photos in [docs/reference/](docs/reference/)). Operational use only: **no costs, prices or financials anywhere in the app.**

- One press, ~2 admins + ~5 staff. Keep everything simple; do not over-engineer.
- Admins use laptops (occasionally phones). Staff use laptops and phones. Every page must work at phone width.
- Anything marked **UNKNOWN** is a working assumption pending confirmation from the press admins. See [UNKNOWNS](#unknowns) at the bottom.
- The owner (subhay389@gmail.com) is a software engineer in the USA. The press staff are in Nepal. It is a family business app.

---

## Keeping this file current (instruction for Claude)

The owner relies on this file to carry context between conversations.
- **Remind the owner to update CLAUDE.md** whenever enough new context has built up in a conversation. For example:
  - a feature finished
  - a decision made or changed
  - an UNKNOWN resolved
  - new setup or services
  - a changed workflow or gotcha learned
- Phrase it as an offer, e.g. *"We've decided X and finished Y. Want me to update CLAUDE.md?"*
- Don't wait to be asked, and check again before a long conversation wraps up.
- When updating it, keep **Project status** and **UNKNOWNS** accurate. Remove stale statements instead of piling notes on top.

---

## Project status (keep this section current)

**Live:** https://3p-press-manager.vercel.app. Google sign-in works there, against the production database.

| Service | Details |
|---|---|
| GitHub | `subhay389/3p-press-manager` (private). `main` is the only branch, and **pushing to `main` deploys to production** |
| Vercel | Hobby plan (a deliberate choice for this family app). Project `3p-press-manager`, functions in `sin1` |
| Neon | Project in AWS Singapore (ap-southeast-1), with branches `production` (live app) and `dev` (local `.env`) |
| Google Cloud | Project "3P Press", OAuth client "3P local + prod". The consent screen is **published** (In production) |

**Done:**
- Scaffold, with the full Prisma schema and initial migration on both Neon branches.
- Google login with the allowlist, and ADMIN/STAFF roles.
- App shell with the nav and empty placeholder pages for every tab.
- `/privacy` page.
- Vercel deploy pipeline.

**Next steps, in order:**
1. **App shell polish.**
   - Magenta accent (taken from the job card) and a navy-blue "3P" text logo mark. There is no logo file.
   - Login page, nav with active tab and role badge, mobile menu.
   - Consistent page header with an actions slot, empty states.
   - Favicon, per-page titles, 404 and loading states.
2. **Settings → Users**: small, and it unblocks onboarding family/staff without SQL.
3. **Paper – 3P**: paper types, add paper, ledger, edit stock. Jobs depend on this.
4. **Enter Job**: the Job Card form, with inventory deduction.
5. **Job Records**: list, view/print, edit, complete, cancel, record-only fields.
6. **Paper – Client.**

Build each feature fully styled with shadcn defaults (no separate "beautify later" pass). The Job Card must match the paper form.

### Adding users before Settings → Users exists
Users can only sign in if their email is in `AllowedUser`. Add them in the **Neon console → SQL Editor**, choosing the right branch (`production` for the live site, `dev` for local):

```sql
INSERT INTO "AllowedUser" (id, email, role, "updatedAt")
VALUES (gen_random_uuid()::text, lower('person@gmail.com'), 'STAFF', now());  -- or 'ADMIN'
```

---

## Tech stack

| Concern | Choice (pinned version) |
|---|---|
| Framework | Next.js **16** (App Router, Turbopack) + React 19 + TypeScript (strict) |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.32`), Google provider, JWT sessions, DB allowlist |
| Database | PostgreSQL on **Neon** (Singapore). `dev` branch for local work, `production` branch for the live app |
| ORM | Prisma **7** with the Neon driver adapter (`@prisma/adapter-neon`) |
| UI | Tailwind CSS v4 + shadcn/ui (radix base), `lucide-react` icons |
| Tables | `@tanstack/react-table` (client-side search/sort; data volume is small), to be added |
| Forms | `react-hook-form` + `zod` (`@hookform/resolvers`), to be added |
| Nepali dates | `nepali-date-converter` for AD↔BS plus a BS date picker, to be added (UNKNOWN U12) |
| Tests | Vitest (focus on inventory/ledger logic) |
| Hosting | Vercel (region `sin1`, next to the Neon database) |
| Package manager | npm |

### Version-specific gotchas (read before coding)
- **Next.js 16 differs from older versions.** See [AGENTS.md](AGENTS.md) and read `node_modules/next/dist/docs/` before using an unfamiliar API.
  - Middleware is now **`src/proxy.ts`** (exported `proxy`), and it runs on Node.
  - `params` and `searchParams` are Promises.
  - `PageProps<"/route">` and `LayoutProps<"/route">` are global generated types (`next typegen`).
- **Prisma 7:**
  - Connection URLs live in `prisma.config.ts`, not in `schema.prisma`.
  - The client is generated to `src/generated/prisma` (gitignored; regenerated on `npm install`).
  - Import with `@/generated/prisma/client`. Client components import enums from `@/generated/prisma/enums`.
  - The CLI (migrate, seed, studio) uses `DIRECT_URL`. The app uses the pooled `DATABASE_URL` via `src/lib/db.ts`.
- **Prisma 8 is in RC.** Stay on 7.x until 8 is stable, and ignore the CLI's upgrade banner.
- **shadcn `cn()`** comes from the `cn` package, re-exported from `@/lib/utils`. Add components with `npx shadcn@latest add <name>`.

---

## Running locally

Prerequisites:
- Node.js 22+ (developed on 24)
- A Neon project with a `dev` branch
- A Google Cloud OAuth client

No Docker is needed.

```bash
npm install                   # also runs prisma generate
cp .env.example .env          # then fill in values (Neon dev branch!)
npm run db:migrate            # prisma migrate dev
npm run db:seed               # adds SEED_ADMIN_EMAIL as ADMIN
npm run dev                   # http://localhost:3000
```

npm scripts:
- `dev`, `build`, `start`, `lint`
- `typecheck` (`next typegen && tsc --noEmit`)
- `test` (`vitest run`)
- `db:migrate`, `db:deploy` (production migrations), `db:seed`, `db:studio`

Before finishing any change, run `npm run typecheck`, `npm run lint` and `npm test`.

**Never run destructive database commands** (`migrate reset`, `db push --force-reset` / `--accept-data-loss`) without the user's explicit consent. Never point local tooling at the Neon `production` branch.

### Environment variables
See [.env.example](.env.example):
- `DATABASE_URL`: Neon pooled connection string
- `DIRECT_URL`: Neon direct connection string
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `SEED_ADMIN_EMAIL`

`.env` is gitignored and must never be committed.

### Google OAuth setup
1. In Google Cloud Console → Google Auth Platform, set up Branding (app name and emails).
2. Audience: External. Data Access: only `openid`, `userinfo.email` and `userinfo.profile`.
3. The app is **published** (Audience → In production).
   - Branding has the home page `https://3p-press-manager.vercel.app` and the privacy policy `/privacy`.
   - Any Google account can reach Google's consent screen, so **our `AllowedUser` table is the only access control.**
   - Don't upload a logo on the Branding page, because that triggers Google verification.
4. Clients → Web application.
   - Origins: `http://localhost:3000` (+ production URL).
   - Redirect URIs: `http://localhost:3000/api/auth/callback/google` (+ `https://<prod-domain>/api/auth/callback/google`).

### Deployment (Vercel)
- Vercel project linked to the GitHub repo. **Every push to `main` deploys to production.**
- Functions run in `sin1` (Singapore, via `vercel.json`), next to the Neon database.
- Vercel runs the `vercel-build` script: `prisma migrate deploy && prisma db seed && next build`.
  - Migrations are applied automatically.
  - The seed is idempotent and only ensures `SEED_ADMIN_EMAIL` is an admin.
- Production environment variables are set in Vercel (Production scope only) and point at the Neon **production** branch. `AUTH_SECRET` differs from local.
- `/privacy` is a public page, needed for Google OAuth branding. Public paths are listed in `PUBLIC` in `src/proxy.ts`.
- To change environment variables in the Vercel dashboard: **Settings → Environments → Production → Environment Variables**. Changes only apply after a **Redeploy**.
- Don't add Vercel's Neon or Prisma Postgres marketplace integrations. The database is already connected through environment variables.

### Local workflow notes
- The dev machine is Windows. Use the Bash tool (Git Bash) or PowerShell. `gh` is installed and logged in as `subhay389`.
- `.claude/launch.json` defines the `dev` server (port 3000). Use the browser pane's `preview_start` with `dev` to run the app and check UI changes.
- Prisma blocks destructive commands from AI agents unless the user consents explicitly. Ask first, always.
- Before committing, check that no secrets are staged (`.env` is ignored; `.gitattributes` forces LF line endings).

---

## Authentication & roles

- Login is Google only. Anyone can attempt it, but the `signIn` callback **rejects any email that isn't a verified Google email in the `AllowedUser` table**. Rejected users go back to `/login?error=AccessDenied`, which shows a "not authorized" message.
- Emails are stored and compared lowercased.
- Roles:
  - **ADMIN** can create and edit everything.
  - **STAFF** is read-only and can view everything.
- The `jwt` callback re-checks the allowlist every 5 minutes. A user removed from it is signed out on their next request after that.
- `requireAdmin()` always checks the role in the DB, not just the session token.
- Seed: `subhay389@gmail.com` as ADMIN (from `SEED_ADMIN_EMAIL`). Other admins and staff are added in the app at `/settings/users`, which is admin-only.
- **Enforce permissions on the server.**
  - `src/proxy.ts` is only an optimistic redirect.
  - Pages call `requireUser()` or `requireAdmin()` from `src/lib/auth.ts`.
  - Every mutating server action must check that the user is an admin before touching the DB.
  - Hiding buttons in the UI is only for convenience, not security.
- Landing page after login (`landingPathFor` in `src/lib/roles.ts`): admins → **Enter Job**; staff → **Job Records**.

---

## App structure (navigation)

Top nav with four tabs, plus an admin-only settings link:

1. **Enter Job** (`/jobs/new`): admin only; hidden for staff.
2. **Job Records** (`/jobs`)
3. **Paper – 3P** (`/paper/press`)
4. **Paper – Client** (`/paper/client`)
5. Settings → Users (`/settings/users`): admin only; manages the allowlist.

On mobile the nav collapses to a menu or bottom bar.

---

## Feature specs

### 1. Enter Job: the Job Card form
Reference: [docs/reference/job-card-sheet.jpg](docs/reference/job-card-sheet.jpg). The on-screen form must look **almost identical** to the paper Job Card Sheet: same fields, same order, same grouping, same magenta/pink header bands, checkbox-style option boxes. On phones it may reflow into one column, but it keeps the same sections and styling.

**Header**
- **Job No**: auto-filled with `max(jobNo) + 1` (numbering starts at **1**). Admins can edit it.
  - It must be unique. Check live while typing; on a duplicate, show a red border and the small text *"Please enter a unique job number"*, and disable submit.
  - The DB also has a unique constraint, as the final guard.
- **Date** (BS, defaults to today)
- **Client**: free text
- **Job**: name, free text
- **Qty**: required quantity, integer
- **Paper Stock**: one choice for the whole job, either **3P** or **Clients**. See UNKNOWN U2.
- **Color Plates**, **B/W Plates**, **Spot Plates**, **Total Plates**: integers. Total is auto-summed but editable.
- **Lamination**: Gloss / Matt / none, plus a free-text note (e.g. "B-side")
- **Binding**: CS / PB / SS / JuJu / other (free text)
- **Other**: free text

**Paper sections A–D**: A = Cover Paper, B = Inside Color Paper, C = Inside Paper, D = Inside Paper. Each section is optional; a job may fill only A. Fields per section:
- **GSM**, **Size**, **Category**:
  - When Paper Stock = **3P**, these come from picking a **press paper type** in a searchable combobox. Its options are existing paper types shown as `Category · GSM · Size`. That paper type is what gets deducted.
  - When Paper Stock = **Clients**, they are plain inputs and nothing links to inventory.
- **Category** options: A/B (Art Board), A/P (Art Paper), W/F (Wood Free), DUP (Duplex), TC, DB, plus free-text other.
- **Format**: A is 1/2/4/8/16; B–D are 1/2/4/8/16/32.
- **Print style**: O/S (One Side), F/B (Front/Back), W/T (Work & Turn), W/Tumble
- **Front Color**, **Back Color**: small text or number inputs
- **No. of Sheets**: integer, entered by hand. **This exact number is deducted from inventory** for 3P jobs. Size never affects the number (UNKNOWN U1).

**Shop-floor fields**: all optional free-text inputs, left blank if empty:
- Provided by, Received by, Checked by, Taken Time
- Sheet-tally boxes for sections A–D (UNKNOWN U9)
- Completed by, Checked by, Handover To, Note

**Paper shortage warning (3P only)**
- While the admin fills the form, show the live available balance next to each chosen paper type.
- If total sheets requested for a paper type are more than its balance, show a clear **"Not enough paper"** warning, but **still allow saving**.
- When saved, the job is flagged `paperShortage = true`.

### 2. Job Records
Reference: [docs/reference/job-record.jpg](docs/reference/job-record.jpg). A searchable table showing a subset of job data. The search box matches job no, client and job name. Add a status filter.

Columns:
- Date (BS), Client, Job Name, Job No
- Binding: **Col.**, **Stitching**, **Folding**
- Lamination: **Matt**, **Glossy**, **Qty**, **Size**
- **Required Qty** (= job Qty), **Delivery**, **Remarks**
- **Status** badge, plus a red **"Not enough paper"** badge when flagged

**Record-only fields**: Col., Stitching, Folding, Lamination Matt/Glossy/Qty/Size, Delivery and Remarks are **not on the job form**. Admins fill them from this page through an "Edit record" dialog. Store them as free text, because the paper ledger uses ticks, "C.S.", notes and so on.

Row actions:
- **View details** (everyone): a modal that renders the full Job Card read-only, in the same layout as the form, as HTML rather than an image. The modal has a **Print** button.
- **Edit job** (admin): opens the Job Card form prefilled. Saving re-applies inventory (see the ledger rules). Completed jobs are editable; cancelled jobs are not.
- **Mark completed** (admin)
- **Cancel job** (admin, with confirmation): sets status CANCELLED, keeps the record, and **restores its paper** to stock.

Statuses: `CREATED` → `COMPLETED`; either one → `CANCELLED`. Status alone does not change stock, except that cancelling restores paper.

**Print**: `/jobs/[id]/print` renders the Job Card print-optimized (A4, `@media print`, colors kept) and calls `window.print()`. The view modal's Print button opens this route.

### 3. Paper – 3P (press stock)
Reference: [docs/reference/paper-record-press.jpg](docs/reference/paper-record-press.jpg).

**Main view**: a searchable table of press paper types.
- Columns: Category, GSM, Size, Balance (sheets), Last movement date.
- Click a row to open that paper type's **ledger page**.

**Ledger page** (`/paper/press/[id]`) mirrors the paper binder page.
- Header: CATEGORY · GSM · SIZE.
- Rows ordered by date: Date (BS), Particulars, Job No, Received (Pkts, Sheets), Used (Pkts, Sheets), **running Balance (sheets)**, Remarks.
- Job rows link to the job.

**Add paper** (admin; button on the main view):
- Pick or create a paper type in a combobox that filters as you type. A new type is created inline, with the duplicate check below.
- Then enter Date, Particulars (free text), Pkts (optional, for the record only), Sheets (required), and Remarks.

**Edit stock** (admin; on the ledger page):
- Enter the **new balance in sheets** and a reason.
- The app records an `ADJUSTMENT` movement for the difference. It never overwrites history.

**Edit paper type** (admin): change Category/GSM/Size, subject to the duplicate check.

**Low-stock warning**: not built yet (UNKNOWN U7).

### 4. Paper – Client
Reference: [docs/reference/paper-record-client.jpg](docs/reference/paper-record-client.jpg).

For now this is **just a list of client paper receipts**, not linked to jobs or to press inventory (UNKNOWN U3). It is a searchable table with Add and Edit (admin). Search matches client and job.

Columns, matching the binder:
- Date (BS), Client (free text)
- Paper: GSM, Category, Size, Pkts, Sheets
- Cutting: Job (text), Job No (text, since it can be "1941/1942"), Pkts, Sheets
- Balance: Pkts, Sheets
- Remarks

Balance Sheets is auto-calculated as `Sheets − Cutting Sheets`. Pkts fields are entered by hand and only kept for the record.

### 5. Settings → Users (admin)
List, add and remove allowed emails, and set each one's role. An admin cannot remove or demote themselves if they are the last admin.

---

## Data model (Prisma, summary)

- **AllowedUser**: `email` (unique, lowercase), `name?`, `role` (ADMIN | STAFF), timestamps.
- **PaperType**: `category`, `gsm` (int), `size` (normalized string), timestamps. **Unique on (category, gsm, size).**
  - Size normalization: trim, lowercase, remove spaces, `X`/`×` → `x`. So `"25 X 36"` → `"25x36"`.
  - The balance is **not stored**. It is always `SUM(StockMovement.sheets)`.
- **StockMovement** is the press ledger. Fields:
  - `paperTypeId`, `date` (AD date)
  - `type`: RECEIPT | JOB_ISSUE | JOB_CORRECTION | JOB_CANCEL | ADJUSTMENT
  - `sheets` (signed int: + into stock, − out of stock)
  - `packets?` (record only), `particulars?`, `remarks?`
  - `jobId?`, `createdByEmail`, `createdAt`
- **Job**: `jobNo` (int, unique) and `date`. Other fields:
  - Job card header: `client`, `jobName`, `qty`, `paperStock` (PRESS | CLIENT), plate counts, `lamination`, `laminationNote`, `binding`, `bindingOther`, `other`.
  - Shop-floor text fields.
  - `status` (CREATED | COMPLETED | CANCELLED) and `paperShortage` (bool).
  - Record-only text fields: `recCol`, `recStitching`, `recFolding`, `recLamMatt`, `recLamGlossy`, `recLamQty`, `recLamSize`, `deliveryQty`, `remarks`.
  - Timestamps and `createdByEmail`.
- **JobPaperSection**: `jobId`, `section` (A | B | C | D), `paperTypeId?` (set only for 3P jobs), `category`, `gsm`, `size`, `format`, `printStyle`, `frontColor`, `backColor`, `sheets`, `tally` (JSON string array). Unique on (jobId, section).
- **ClientPaperRecord**: the fields from the Paper – Client columns above.

## Inventory / ledger rules (critical)

1. **Never update or delete `StockMovement` rows.** Every change is a new row. The ledger must always add up.
2. All stock-changing operations live in `src/server/inventory.ts` and run inside a single `prisma.$transaction` together with the job write.
3. **Create 3P job** writes one `JOB_ISSUE` row per section with a paper type and sheets > 0 (−sheets), with `particulars = "<client> – <job name>"`.
4. **Edit job**:
   - Compute the job's current net issued sheets per paper type from its movements, and compare it with the new sections.
   - Write a `JOB_CORRECTION` row for each difference.
   - This also covers switching between 3P and Clients, and changing which paper type a section uses.
5. **Cancel job** writes `JOB_CANCEL` rows that bring the job's net issued sheets back to zero.
6. **Admin stock edit** writes an `ADJUSTMENT` row of `newBalance − currentBalance`.
7. **paperShortage** is recalculated whenever a job is created or edited: true if any paper type it uses would have a balance below 0 after the write. It is a snapshot (UNKNOWN U8).
8. Stock may go negative. That is allowed and is how a shortage shows up.
9. All calculations use **sheets**. Packets are stored for the record only.

## Dates

- Store real dates as AD (`DATE` columns). Convert only at the edges, through `src/lib/nepali-date.ts`; never call the converter library directly from components.
- Display BS as `YYYY/MM/DD` (e.g. `2082/02/25`). All date inputs are BS pickers.
- Use Nepal time (`Asia/Kathmandu`) when working out "today".

---

## Directory layout

```
3p/
├── CLAUDE.md, AGENTS.md       AGENTS.md = Next.js agent rules (managed by `next dev`)
├── docs/reference/            photos of the original paper forms (design reference)
├── prisma.config.ts           Prisma 7 config (CLI uses DIRECT_URL, seed command)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                seeds admin allowlist
├── src/
│   ├── proxy.ts               Next 16 "middleware": optimistic auth redirects
│   ├── generated/prisma/      generated Prisma client (gitignored)
│   ├── app/
│   │   ├── layout.tsx, page.tsx   root layout; "/" redirects by role
│   │   ├── login/             sign-in page (also shows AccessDenied message)
│   │   ├── (app)/             authenticated layout with nav
│   │   │   ├── jobs/          Job Records list
│   │   │   ├── jobs/new/      Enter Job form
│   │   │   ├── jobs/[id]/edit/        (to add)
│   │   │   ├── jobs/[id]/print/       (to add)
│   │   │   ├── paper/press/   3P stock list
│   │   │   ├── paper/press/[id]/      ledger page (to add)
│   │   │   ├── paper/client/
│   │   │   └── settings/users/
│   │   └── api/auth/[...nextauth]/
│   ├── components/
│   │   ├── ui/                shadcn components (generated; avoid heavy hand edits)
│   │   ├── nav/               app nav (desktop tabs + mobile sheet)
│   │   ├── page-header.tsx
│   │   ├── job-card/          ONE Job Card component, used in edit, view and print modes (to add)
│   │   └── tables/            (to add)
│   ├── lib/
│   │   ├── auth.ts            Auth.js config, requireUser/requireAdmin
│   │   ├── roles.ts           landingPathFor (pure; safe to import anywhere)
│   │   ├── db.ts              Prisma client singleton (Neon adapter, pooled URL)
│   │   ├── utils.ts           cn()
│   │   ├── nepali-date.ts     AD↔BS helpers (to add; only place that touches the date lib)
│   │   ├── paper.ts           size normalization, category/format/print-style constants (to add)
│   │   └── validators/        zod schemas shared by client and server (to add)
│   └── server/                server actions + business logic
│       ├── auth-actions.ts    sign in / sign out
│       ├── inventory.ts       ALL stock movement logic (to add)
│       └── jobs.ts, paper.ts, client-paper.ts, users.ts   (to add)
├── tests/                     vitest
└── .env.example
```

## Conventions

- Mutations go through **server actions** in `src/server/*`. There is no REST API except the Auth.js route.
- Each server action:
  1. calls `requireAdmin()` (or `requireUser()` for reads);
  2. validates input with the shared zod schema;
  3. does the DB work;
  4. calls `revalidatePath` on the affected pages.
- The **Job Card component is the single source of truth** for the job layout. Form, view modal and print all reuse it with a `mode` prop, so they never drift apart.
- Keep labels and abbreviations exactly as on the paper forms (A/B, O/S, CS, etc.). The staff already know them.
- No cost, price or money fields, ever.

---

## UNKNOWNS

Working assumptions to confirm with the press admins. Update this list as items are resolved.

- **U1. Sheets vs size.** No. of Sheets is entered by hand and deducted as-is. The Size on the job card is display-only and does not affect quantity, so cutting calculations happen outside the app. Still unclear: is the job card size a cut size (e.g. 525×740) while stock is held in parent sizes (e.g. 25×36)? Also, what does "R.P 1864" on the sample card mean?
- **U2. Mixed paper sources.** Paper Stock is one choice per job (3P **or** Clients). Jobs that use both press and client paper are not supported yet. That would need a source choice per section.
- **U3. Client paper not linked to jobs.** Paper – Client is a standalone list of receipts. Client-sourced job sections do not draw from it. Is the Balance auto-calculation right?
- **U4. Packets.** Recorded for the record only. All maths uses sheets.
- **U5. Job Record-only fields.** Col. (meaning unknown, maybe collating?), Stitching, Folding, Lamination Matt/Glossy/Qty/Size and Delivery are entered from Job Records, not the job form. Should Delivery be required when marking a job Completed?
- **U6. Abbreviations.** Paper categories TC and DB are used as-is (full names unknown). The meaning of binding "JuJu" is unknown. Is the category list complete?
- **U7. Low-stock warning.** Wanted, but the threshold and how it is shown are undecided. Not built.
- **U8. Shortage flag.** It is a snapshot taken when the job is saved. Should it clear automatically when stock is topped up later?
- **U9. Tally boxes.** The exact structure of the sheet-tally boxes on the job card is unclear. Currently they are free-text boxes per section.
- **U10. Un-cancelling** a job is not supported.
- **U11. Other admins and staff emails**: to be added via Settings → Users.
- **U12. BS date picker library**: not chosen yet. Keep it wrapped in `src/lib/nepali-date.ts` and a single picker component so it can be replaced.
