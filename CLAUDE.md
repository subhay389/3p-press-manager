@AGENTS.md

# 3P Press Manager

Internal web app for the **3P printing press** (a family business) to record print jobs and track paper stock. It replaces four paper binders; photos are in [docs/reference/](docs/reference/).

- Operational use only. **No costs, prices or money fields, ever.**
- One press, ~2 admins and ~5 staff. Keep it simple.
- Staff use laptops and phones. Every page must work at 375px width.
- The owner (subhay389@gmail.com) is a software engineer in the USA. The press is in Nepal.
- **UNKNOWN** marks an assumption still to confirm with the press. See [UNKNOWNS](#unknowns).

## Keeping this file current (instruction for Claude)

- Offer to update this file when a feature is finished, a decision changes, an UNKNOWN is resolved, or a new gotcha turns up. Don't wait to be asked.
- Keep it short and factual. Update **Project status** and **UNKNOWNS**, and delete stale lines instead of adding notes.

## Project status

**Live:** https://3p-press-manager.vercel.app

| Service | Details |
|---|---|
| GitHub | `subhay389/3p-press-manager` (private). Only `main`; **every push to `main` deploys to production** |
| Vercel | Hobby plan (deliberate). Functions in `sin1` (Singapore) |
| Neon | AWS Singapore. Branch `production` = live app, branch `dev` = local `.env` |
| Google Cloud | Project "3P Press". OAuth consent screen is published |

**Done:** scaffold and full schema, Google login with allowlist and roles, app shell (brand, nav, page headers, empty states, 404), `/privacy`, Vercel pipeline, Settings → Users, Paper – 3P, Enter Job (create), Job Records (list, View/Print, Edit record, Mark completed, Cancel).

**Next, in order:**
1. **Edit job** (admin): reopen `JobCardForm` with the saved values; `JOB_CORRECTION` rows per inventory rule 4.
2. **Paper – Client.**

Build each feature fully styled. There is no later "beautify" pass.

If locked out, run this in the Neon SQL Editor on the right branch:
`INSERT INTO "AllowedUser" (id, email, role, "updatedAt") VALUES (gen_random_uuid()::text, 'x@gmail.com', 'ADMIN', now());`

## Tech stack

- Next.js **16** (App Router) + React 19 + TypeScript strict.
- Auth.js v5 (`next-auth@5.0.0-beta.32`): Google provider, JWT sessions.
- Prisma **7** + `@prisma/adapter-neon`, Postgres on Neon.
- Tailwind v4 + shadcn/ui (radix), `lucide-react`, `sonner` toasts, `zod`.
- Vitest. npm.
- `nepali-date-converter` for BS dates. Tables are plain JSX with client-side filtering (no table library).
- `cmdk` (shadcn `command` + `popover`) for the 3P paper combobox. Forms use plain `useState`, not react-hook-form.

### Version gotchas
- **Next 16:** read `node_modules/next/dist/docs/` before using an unfamiliar API.
  - Middleware is `src/proxy.ts` (export `proxy`).
  - `params` and `searchParams` are Promises.
  - `PageProps<"/route">` and `LayoutProps<"/route">` are generated global types.
- **Prisma 7:**
  - URLs live in `prisma.config.ts`, not in the schema.
  - The client is generated to `src/generated/prisma` (gitignored). Import from `@/generated/prisma/client`; client components import enums from `@/generated/prisma/enums`.
  - The CLI uses `DIRECT_URL`; the app uses the pooled `DATABASE_URL` (`src/lib/db.ts`).
  - Stay on 7.x (8 is RC) and ignore the upgrade banner.
- **shadcn:**
  - `cn()` comes from the `cn` package via `@/lib/utils`.
  - Add components with `npx shadcn@latest add <name>`.
  - After adding components, check that `--font-sans` in `globals.css` is still `var(--font-geist-sans)`. A re-init once broke it and the app fell back to serif.

## Running locally

```bash
npm install          # also runs prisma generate
cp .env.example .env # fill in values for the Neon dev branch
npm run db:migrate
npm run db:seed      # makes SEED_ADMIN_EMAIL an admin
npm run dev          # http://localhost:3000
```

- Env vars: `DATABASE_URL` (pooled), `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SEED_ADMIN_EMAIL`. Never commit `.env`.
- Before finishing a change, run `npm run typecheck`, `npm run lint` and `npm test`.
- **Never** run destructive DB commands (`migrate reset`, `db push --force-reset` / `--accept-data-loss`) without explicit consent. Never point local tooling at the `production` branch.

### Deployment
- Vercel runs `vercel-build`: `prisma migrate deploy && prisma db seed && next build`. The seed is idempotent.
- Production env vars are Production-scoped in Vercel and point at the Neon `production` branch. Edit them under Settings → Environments → Production; changes need a Redeploy.
- Don't add Vercel's Neon or Prisma marketplace integrations.
- Google OAuth client:
  - Origins and redirect URIs cover localhost and the vercel.app URL (`/api/auth/callback/google`).
  - Don't upload a logo on the Branding page; it triggers Google verification.

### Workflow notes
- Windows machine. Use Git Bash or PowerShell, and `node` for scripts. Bare `python` is a Store stub that hangs.
- `gh` is logged in as `subhay389`.
- Check UI with the browser pane: `preview_start` with config `dev` (`.claude/launch.json`).
  - Use the `mobile` preset for phone layouts, then reset to `desktop`.
  - Claude can't type Google credentials. If the pane is signed out, ask the owner to sign in. Localhost and the live site have separate sessions.
- Vercel is live about 30–60s after a push.

## Auth and roles

- Login is Google only. `signIn` accepts only verified Google emails present in `AllowedUser` (stored lowercase). Anyone else lands on `/login?error=AccessDenied`.
- The allowlist is the only access control; the Google app is published to all accounts.
- Roles:
  - **ADMIN** edits everything.
  - **STAFF** is read-only.
- The JWT re-checks the allowlist every 5 minutes, so a removed user is signed out within that time.
- On first sign-in, the user's name is filled in from Google.
- Admins land on **Enter Job**; staff land on **Job Records** (`src/lib/roles.ts`).
- **Enforce permissions on the server:**
  - `src/proxy.ts` is only an optimistic redirect.
  - Pages call `requireUser()` or `requireAdmin()`, which redirect.
  - Server actions call `assertAdmin()`, which throws. Both admin checks read the role from the DB.
- Public paths are listed in `PUBLIC` in `src/proxy.ts`. Currently only `/privacy`.

## Navigation

| Tab | Path | Access |
|---|---|---|
| Enter Job | `/jobs/new` | admin only (hidden for staff) |
| Job Records | `/jobs` | everyone |
| Paper – 3P | `/paper/press` | everyone |
| Paper – Client | `/paper/client` | everyone |
| Settings → Users | `/settings/users` | admin only |

## Feature specs

### Enter Job (Job Card form)
Must look **almost identical** to [job-card-sheet.jpg](docs/reference/job-card-sheet.jpg): same fields, order and grouping, magenta header bands, checkbox-style option boxes. On phones it may reflow to one column.

**Header**
- **Job No:** auto-filled with `max(5000, max(jobNo) + 1)` (owner: start at 5000), and editable.
  - It must be unique: check live, show a red border and *"Please enter a unique job number"*, and block submit.
  - The DB unique constraint is the final guard.
- **Date:** BS, defaults to today.
- **Client** and **Job**: free text. **Qty**: integer.
- **Paper Stock:** 3P or Clients, one choice for the whole job (U2).
- **Plates:** Color, B/W, Spot and Total. Total is auto-summed but editable.
- **Lamination:** Gloss / Matt / none, plus a note (e.g. "B-side").
- **Binding:** CS / PB / SS / JuJu / other text.
- **Other:** free text.

**Paper sections A–D**: A Cover, B Inside Color, C Inside, D Inside. All optional.
- **Category / GSM / Size:**
  - 3P jobs pick a press paper type from a searchable combobox (`Category · GSM · Size`). That type is what gets deducted.
  - Client jobs type them as plain text, with no inventory link.
- **Category options:** A/B (Art Board), A/P (Art Paper), W/F (Wood Free), DUP (Duplex), TC, DB, other.
- **Format:** A is 1/2/4/8/16; B–D are 1/2/4/8/16/32.
- **Print style:** O/S, F/B, W/T, W/Tumble.
- **Front Color** and **Back Color.**
- **No. of Sheets:** entered by hand. For 3P jobs this exact number is deducted; size never affects it (U1).

**Shop-floor fields**, optional text:
- Provided by, Received by, Checked by, Taken Time.
- Sheet-tally rows for A–D: 7 boxes each, split top/bottom, stored as 14 strings in `tally` (U9).
- Completed by, Checked by, Handover To, Note.

**Shortage (3P only):**
- Show the live balance next to each chosen paper type.
- If a paper type's requested sheets exceed its balance, warn **"Not enough paper"** but still allow saving.
- Save the job with `paperShortage = true`.

### Job Records
Reference: [job-record.jpg](docs/reference/job-record.jpg).
- Search by job no, client or job name. Filter by status.
- Columns:
  - Date, Client, Job Name, Job No.
  - Binding: Col., Stitching, Folding.
  - Lamination: Matt, Glossy, Qty, Size.
  - Required Qty, Delivery, Remarks.
  - Status badge, plus a red "Not enough paper" badge.
- **Record-only fields** (Col. through Remarks) are free text, edited here through an "Edit record" dialog, not on the job form.
- Row actions:
  - **View details** (everyone): read-only Job Card in a modal, rendered as HTML, with **Print**.
  - **Edit job** (admin): reopens the form; saving re-applies inventory. Cancelled jobs can't be edited. Details below.
  - **Mark completed** (admin).
  - **Cancel** (admin, with a confirm step): keeps the record and restores its paper.
- **Statuses:** `CREATED` → `COMPLETED`; either → `CANCELLED`. Of the status changes, only cancelling changes stock.
- **Edit job** (decided, not built yet):
  - Route `/jobs/[id]/edit`, admin only: `requireAdmin()` and add it to `ADMIN_ONLY` in `src/proxy.ts` (currently only `/jobs/new`, `/settings`). Cancelled jobs redirect or 404.
  - Reuse `JobCardForm` with initial values from `jobToCardValues` (`getJobCard` in `job-data.ts`). Completed jobs can be edited.
  - `isJobNoTaken` must ignore the job being edited.
  - Shortage while editing: balance shown per paper type = current balance + the job's own net issued sheets (`netIssuedByJob`), so the job doesn't flag itself.
  - Saving: update the job and replace its sections, then one `JOB_CORRECTION` row per paper type where new sheets ≠ net issued, with `sheets = net issued − new sheets` (more paper used → negative row). Date = today in Nepal (`todayAd()`), particulars `"Edited: <client> – <job name>"`. Recompute `paperShortage`. All in one transaction in `inventory.ts`.
  - After save: back to Job Records with a toast (not the Enter Job reset).
  - Entry points (admin): "Edit job" in the row menu and in the View details modal. The Edit record dialog's hint "Change it with Edit job" should then hold.
- **Print:** `/jobs/[id]/print` (outside the `(app)` group, so no nav) renders the Job Card at A4 width (194mm), scales it to one page with CSS `zoom`, and calls `window.print()`.
- **Required Qty** is the job card's Qty (U13). Ledger job numbers link to `/jobs?q=<no>&view=<id>`, which opens that job's card.

### Paper – 3P
Reference: [paper-record-press.jpg](docs/reference/paper-record-press.jpg).
- **List:** paper types with Category, GSM, Size, Balance (sheets) and last movement date. Searchable.
- **Ledger** (`/paper/press/[id]`), headed CATEGORY · GSM · SIZE:
  - Rows by date: Date, Particulars, Job No, Received (Pkts, Sheets), Used (Pkts, Sheets), running Balance, Remarks.
  - Job rows link to the job.
- **Add paper** (admin):
  - Type Category/GSM/Size. Matching existing types show in a live dropdown; a new combination shows an amber "New paper type" notice and the button changes, so types aren't created by mistake.
  - Then enter Date, Particulars, Pkts (record only), Sheets and Remarks.
- **Adjust stock** (admin): enter the counted balance and a reason. It writes an `ADJUSTMENT` row. Wrong entries are fixed this way too; ledger rows are never edited (owner decision).
- **Edit paper type** (admin): with the duplicate check.
- Low-stock warning: not yet (U7).

### Paper – Client
Reference: [paper-record-client.jpg](docs/reference/paper-record-client.jpg).
- A standalone list of client paper receipts, not linked to jobs (U3). Searchable by client or job. Admins can add and edit.
- Columns:
  - Date, Client.
  - Paper: GSM, Category, Size, Pkts, Sheets.
  - Cutting: Job, Job No (text, e.g. "1941/1942"), Pkts, Sheets.
  - Balance: Pkts, Sheets.
  - Remarks.
- Balance Sheets = Sheets − Cutting Sheets. Pkts are entered by hand.

## Data model

`prisma/schema.prisma` is the source of truth. Key points:
- **PaperType** is unique on (category, gsm, size). Categories are free-form, stored uppercase.
  - Normalize size by trimming, lowercasing, removing spaces and changing `X`/`×` to `x` (`"25 X 36"` → `"25x36"`).
- Balance is never stored. It is always `SUM(StockMovement.sheets)`.
- **StockMovement** is the press ledger:
  - `sheets` is signed (+ in, − out); `packets` is record only.
  - `type` is RECEIPT | JOB_ISSUE | JOB_CORRECTION | JOB_CANCEL | ADJUSTMENT.
- **Job** has `paperStock` (PRESS = "3P", CLIENT), `status` and `paperShortage`. Its `rec*` fields plus `deliveryQty` and `remarks` are the Job Records-only fields.
- **JobPaperSection** is one row per section A–D. `paperTypeId` is set only for 3P jobs. A 3P section also stores a copy of its paper type's category, GSM and size. Empty sections are not saved.
- Business dates are `@db.Date` columns.

## Inventory rules (critical)

1. **Never update or delete `StockMovement` rows.** Every change is a new row.
2. All stock logic lives in `src/server/inventory.ts`, inside one `$transaction` with the job write.
3. **Create a 3P job:** one `JOB_ISSUE` row (−sheets) per section with a paper type, `particulars = "<client> – <job name>"`.
4. **Edit a job:** compare the job's net issued sheets per paper type against the new sections, and write a `JOB_CORRECTION` row per difference. This also covers switching 3P ↔ Clients and changing paper type.
5. **Cancel:** write `JOB_CANCEL` rows that return the job's net issued sheets to zero.
6. **Admin stock edit:** write an `ADJUSTMENT` row of `new − current`.
7. **`paperShortage`:** recompute on create and edit. It's true if any paper type it uses ends up below 0. It is a snapshot (U8).
8. Negative stock is allowed.
9. All maths uses sheets.

## Dates

- Store dates as AD. Convert only in `src/lib/nepali-date.ts`; never call the converter library from components.
- Display BS as `YYYY/MM/DD` (e.g. `2082/02/25`). Inputs are BS pickers.
- "Today" means `Asia/Kathmandu`.

## Code layout

- `src/app/(app)/`: signed-in pages (layout with nav, `loading.tsx`).
- `src/app/login`, `src/app/privacy`, `src/app/not-found.tsx`, `src/app/icon.svg`.
- `src/components/`:
  - `ui/`: shadcn, generated.
  - `brand/logo.tsx`, `nav/`, `page-header.tsx`, `empty-state.tsx`, `bs-date-input.tsx`, `users/`, `paper/`.
- `src/lib/`: `auth.ts`, `db.ts`, `roles.ts`, `utils.ts`, `validators/`.
- `src/lib/`: also `nepali-date.ts` (only place using the converter) and `paper.ts` (normalization, labels).
- `src/lib/jobs.ts`: Job Card constants, form value types, `nextJobNo`. `src/lib/validators/common.ts`: shared zod pieces (`bsDate`, `optionalText`, `optionalInt`).
- `src/components/job-card/`: `job-card.tsx` (the one Job Card, `mode` = form | view | print), `parts.tsx` (card-style inputs, option boxes), `paper-type-combobox.tsx`, `job-card-form.tsx` (Enter Job state + submit).
- `src/components/jobs/`: Job Records list, view dialog, edit-record dialog, badges, print toolbar. `src/app/jobs/[id]/print/`: print page.
- `src/server/`: `users.ts`, `paper.ts`, `jobs.ts` (actions), `job-data.ts` (server-only job queries), `inventory.ts` (server-only stock/ledger logic), `auth-actions.ts`.
- Planned: `src/server/client-paper.ts`.
- `tests/`: Vitest.

## Conventions

**Server actions**
- Mutations are server actions in `src/server/*`. No REST API.
- Each action follows the pattern in `src/server/users.ts` and `src/components/users/`:
  1. `assertAdmin()`;
  2. zod parse (shared schema in `src/lib/validators/`);
  3. DB work;
  4. `revalidatePath`;
  5. return `ActionResult` (`{ ok, message } | { ok: false, error }`), shown with `toast`.

**Pages**
- `export const metadata = { title: "<Tab>" }`. The root adds " · 3P Press".
- Start with `<PageHeader title description actions />`, with buttons in `actions`.
- Use `<EmptyState>` for empty lists.

**Colours**
- Use the tokens from `globals.css`, not raw colours. The app is light mode only.
  - `primary`: magenta, taken from the job card. Buttons, active tab, focus ring.
  - `navy`: logo and page titles.
  - `brand-soft`: magenta tint for selected states.
  - `page`: background behind cards.
- **Logo:** use `Logo` / `LogoMark` from `@/components/brand/logo`, and keep `src/app/icon.svg` matching.

**Components**
- **One Job Card component** serves the form, the view modal and print, through a `mode` prop.
- Keep the paper-form labels and abbreviations (A/B, O/S, CS…). Staff know them.
- For a red confirm button, use `variant="destructive"` on `AlertDialogAction`. A `className` override doesn't win.
- A dialog opened from a `DropdownMenuItem` closes instantly unless the menu's `onCloseAutoFocus` is prevented (see `RowActions` in `job-records-list.tsx`).
- `JobCard` lays out with container queries (`@xl:`, `@2xl:`), not screen breakpoints, so it works in the modal and on A4. Print-only tweaks use `group-data-[mode=print]/card:`.
- Grids that hold a scrollable table or filter bar need `grid-cols-[minmax(0,1fr)] *:min-w-0`, or they overflow at 375px.

## UNKNOWNS

- **U1.** Is the job card's size a cut size (e.g. 525×740) while stock is in parent sizes (25×36)? What does "R.P 1864" on the sample card mean? For now, sheets are typed and deducted as-is.
- **U2.** Jobs that mix 3P and client paper aren't supported. That would need a source choice per section.
- **U3.** Client paper isn't linked to jobs. Is the Balance calculation right?
- **U4.** Packets are record only; the maths uses sheets.
- **U5.** What does "Col." mean (collating?). Should Delivery be required when completing a job?
- **U6.** Full names of paper categories TC and DB, and the meaning of binding "JuJu". Is the category list complete?
- **U7.** Low-stock warning: the threshold and how to show it are undecided.
- **U8.** Should the shortage flag clear automatically when stock is topped up?
- **U9.** What the tally boxes mean is unclear. They are free-text cells (7 boxes × top/bottom) for now.
- **U10.** Un-cancelling a job isn't supported.
- **U12.** BS dates are a text input (`YYYY/MM/DD`, `BsDateInput`). A calendar picker may replace it later.
- **U13.** Required Qty is the job card Qty (planned, with wastage); Delivery is what was delivered. Assumed Required ≥ Delivery, but the binder has rows where Delivery is higher. Nothing is enforced; owner to confirm.
