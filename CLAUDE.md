@AGENTS.md

# 3P Press Manager

Internal web app for the **3P printing press** (a family business) to record print jobs and track paper stock. It replaces four paper binders; photos are in [docs/reference/](docs/reference/).

- Operational use only. **No costs, prices or money fields, ever.**
- One press, ~2 admins and ~5 staff. Keep it simple.
- Staff use laptops and phones. Every page must work at 375px width.
- Phones use a home-screen icon that opens full screen (`display: "standalone"`, `src/app/manifest.ts`). There is no back or reload button there, so every page needs its own way back. iOS reads these settings only when the icon is added: after changing them, or the domain, each phone deletes and re-adds its icon from https://3ppress.vercel.app.
- Users aren't technical (e.g. the owner's father). Keep wording and controls literal: placeholder text inside a box was read as an already-entered value, so put examples **under** empty boxes (as in Add paper).
- The owner (subhay389@gmail.com) is a software engineer in the USA. The press is in Nepal.
- **UNKNOWN** marks an assumption still to confirm with the press. See [UNKNOWNS](#unknowns).

## Keeping this file current (instruction for Claude)

- Offer to update this file when a feature is finished, a decision changes, an UNKNOWN is resolved, or a new gotcha turns up. Don't wait to be asked.
- Keep it short and factual. Update **Project status** and **UNKNOWNS**, and delete stale lines instead of adding notes.
- Feature behaviour belongs in [docs/specs.md](docs/specs.md); update it when a tab changes.

## Project status

**Live:** https://3ppress.vercel.app (the old `3p-press-manager.vercel.app` redirects here)  
**Staging:** https://3ppress-staging.vercel.app: a practice copy for the owner's parents to learn on without touching real records (amber banner). Not a test gate; changes are tested locally.

| Service | Details |
|---|---|
| GitHub | `subhay389/3p-press-manager` (private). **Every push to `main` deploys to production**; `staging` deploys the staging site |
| Vercel | Hobby plan (deliberate). Functions in `sin1` (Singapore) |
| Vercel Blob | Public stores in `sin1` for Ink Coverage files: `3p-ink-coverage` (Production), `3p-ink-coverage-test` (Preview = staging, and Development = local `.env`) |
| Neon | AWS Singapore. Branch `production` = live app, `staging` = staging site (copied from production on 2026-10-13), `dev` = local `.env` |
| Google Cloud | Project "3P Press". OAuth consent screen is published |

**Done:** scaffold and full schema, Google login with allowlist and roles, app shell (brand, nav, page headers, empty states, 404), `/privacy`, Vercel pipeline, Settings → Users, Paper – 3P, Paper – Client (ledger per client paper), Create Job (create, with Stock Paper per section), Job Records (list, View/Print, Edit record, Edit job, Mark completed, Cancel, Ink Coverage photo/PDF).

**Production data:** test jobs and paper were cleared on 2026-10-28 (users kept). The data from before that is in the Neon branch `production-backup-2026-10-28`.

**Next:** all tabs are built. Confirm the [UNKNOWNS](#unknowns) with the press, then follow up on what they decide.

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
- Forms use plain `useState`, not react-hook-form.

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
  - `prisma migrate dev` is interactive and fails in Claude's shell. Instead write `prisma/migrations/<timestamp>_<name>/migration.sql` from `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (against the dev branch), add any data SQL, then `npx prisma migrate deploy` and `npx prisma generate`.
- **shadcn:**
  - `cn()` comes from the `cn` package via `@/lib/utils`.
  - Add components with `npx shadcn@latest add <name>`.
  - After adding components, check that `--font-sans` in `globals.css` is still `var(--font-geist-sans)`. A re-init once broke it and the app fell back to serif.
  - Re-adding `table` overwrites `src/components/ui/table.tsx`; put `hover:bg-row-hover` back on `TableRow`.

## Running locally

```bash
npm install          # also runs prisma generate
cp .env.example .env # fill in values for the Neon dev branch
npm run db:migrate
npm run db:seed      # makes SEED_ADMIN_EMAIL an admin
npm run dev          # http://localhost:3000
```

- Env vars: `DATABASE_URL` (pooled), `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SEED_ADMIN_EMAIL`, `BLOB_READ_WRITE_TOKEN` (the test store; `vercel env pull <file> --environment development` and copy the line). Never commit `.env`.
- Before finishing a change, run `npm run typecheck`, `npm run lint` and `npm test`.
- **Never** run destructive DB commands (`migrate reset`, `db push --force-reset` / `--accept-data-loss`) without explicit consent. Never point local tooling at the `production` branch.

### Deployment
- Vercel runs `vercel-build`: `prisma migrate deploy && prisma db seed && next build`. The seed is idempotent.
- Workflow: commit on `main` and push (owner tested locally; pushing is fine), then keep staging on the same code with `git push origin main:staging`.
- When checking the deployed site in the browser pane, use staging, not production.
- Production env vars are Production-scoped in Vercel and point at the Neon `production` branch. Staging env vars are Preview-scoped to the `staging` git branch only and point at the Neon `staging` branch, so previews of other branches fail to build (deliberate: they would otherwise migrate a database). Edit them under Settings → Environments; changes need a Redeploy.
- `StagingBanner` shows when `VERCEL_ENV=preview`.
- Vercel Authentication (Deployment Protection) is off, so staging is open like production; Google sign-in and its own allowlist still guard it.
- Don't add Vercel's Neon or Prisma marketplace integrations.
- `vercel blob create-store` / `vercel env pull` without a file name write `.env.local` (which overrides `.env`) and append `.env*` to `.gitignore` after `!.env.example`, which hides `.env.example`. Delete the file and revert `.gitignore`.
- Google OAuth client:
  - Origins and redirect URIs cover localhost, `3ppress.vercel.app`, `3ppress-staging.vercel.app` and the old `3p-press-manager.vercel.app` (`/api/auth/callback/google`). Add any new domain here before using it.
  - Don't upload a logo on the Branding page; it triggers Google verification.

### Workflow notes
- The owner works from several machines, so check the platform before running shell commands:
  - **Mac mini** (main, always on): macOS, zsh, Homebrew tools, Node 24 from `node@24`. The owner may be at it, or remote through Remote Control (claude.ai/code) and Chrome Remote Desktop. If remote, ask them to do Google sign-ins in the browser pane over Chrome Remote Desktop.
  - **Windows PC:** use Git Bash or PowerShell, and `node` for scripts. Bare `python` is a Store stub that hangs.
  - **Work laptop:** client only (claude.ai/code, Chrome Remote Desktop). Nothing is installed or run there.
- `gh` is logged in as `subhay389`.
- Check UI with the browser pane: `preview_start` with config `dev` (`.claude/launch.json`).
  - Use the `mobile` preset for phone layouts, then reset to `desktop`.
  - Claude can't type Google credentials. If the pane is signed out, ask the owner to sign in. Localhost and the live site have separate sessions.
  - The owner often uses the pane at the same time. Test in a background tab (`tabs_create`) and close it afterwards.
  - Print opens the browser's print dialog, which blocks the tab. To inspect it, stub `window.print` first.
- Print from regular Chrome/Edge. The Claude browser pane has no print preview.
- Vercel is live about 30–60s after a push.

## Auth and roles

- Login is Google only. `signIn` accepts only verified Google emails present in `AllowedUser` (stored lowercase). Anyone else lands on `/login?error=AccessDenied`.
- The allowlist is the only access control; the Google app is published to all accounts.
- Roles:
  - **ADMIN** edits everything.
  - **STAFF** is read-only.
- The JWT re-checks the allowlist every 5 minutes, so a removed user is signed out within that time.
- On first sign-in, the user's name is filled in from Google.
- Admins land on **Create Job**; staff land on **Job Records** (`src/lib/roles.ts`).
- **Enforce permissions on the server:**
  - `src/proxy.ts` is only an optimistic redirect.
  - Pages call `requireUser()` or `requireAdmin()`, which redirect.
  - Server actions call `assertAdmin()`, which throws. Both admin checks read the role from the DB.
- Public paths are listed in `PUBLIC` in `src/proxy.ts`. Currently only `/privacy`.
- Admin-only pages are regexes in `ADMIN_ONLY` in `src/proxy.ts` (`/jobs/new`, `/jobs/<id>/edit`, `/settings`).

## Navigation

| Tab | Path | Access |
|---|---|---|
| Create Job | `/jobs/new` | admin only (hidden for staff) |
| Job Records | `/jobs` | everyone |
| (Edit job) | `/jobs/[id]/edit` | admin only, opened from Job Records |
| Paper – 3P | `/paper/press`, `/paper/press/[id]` | everyone |
| Paper – Client | `/paper/client`, `/paper/client/[id]` | everyone |
| Settings → Users | `/settings/users` | admin only |

## Feature specs

Per-tab specs (fields, columns, row actions, edit/print flows) are in [docs/specs.md](docs/specs.md). Read the relevant section before changing a tab.

## Data model

`prisma/schema.prisma` is the source of truth. Key points:
- **PaperType** is one paper stock: 3P when `clientKey` is `""`, otherwise a client's paper (`client` = name as entered, `clientKey` = `normalizeClient(client)`). Unique on (clientKey, category, gsm, size). Categories are free-form, stored uppercase.
  - Normalize size by trimming, lowercasing, removing spaces and changing `X`/`×` to `x` (`"25 X 36"` → `"25x36"`).
- Balance is never stored. It is always `SUM(StockMovement.sheets)`.
- **StockMovement** is the ledger for both 3P and client paper:
  - `sheets` is signed (+ in, − out); `packets` is record only.
  - `type` is RECEIPT | JOB_ISSUE | JOB_CORRECTION | JOB_CANCEL | ADJUSTMENT.
- **Job** has `paperStock` (PRESS = "3P", CLIENT) and `status`. `bindings` is a list of binding boxes; Job Records Stitching is computed from it plus `other`. `recCol` (Collection) and `recFolding` are ticks on the job card and in Edit record. `recLamQty`, `recLamSize`, `deliveryQty` and `remarks` are the Job Records-only fields. `inkCoverage*` hold the one Ink Coverage file (Blob URLs; `kind` PHOTO | PDF; thumbnail for photos only).
- **JobPaperSection** is one row per section A–D. `size`/`sheets` are the job's own (information only). `stockSize`/`stockSheets` are the Stock Paper; `paperTypeId` links it to 3P or the job client's stock, and category, GSM and `stockSize` are copied from that paper type. Empty sections are not saved.
- Business dates are `@db.Date` columns.

## Inventory rules (critical)

1. **Never update or delete `StockMovement` rows.** Every change is a new row.
2. All stock logic lives in `src/server/inventory.ts`, inside one `$transaction` with the job write.
3. **Only Stock Paper touches stock.** The job's own Size / No. of Sheets never do.
4. **Create a job (3P or Client):** one `JOB_ISSUE` row per paper type (−sum of its sections' stockSheets), `particulars = "<client> – <job name>"`. A section's paper type must belong to the job's stock (3P, or the job's client), checked in `sectionRows`.
5. **Edit a job:** compare the job's net issued sheets per paper type against the new sections, and write a `JOB_CORRECTION` row per difference. This also covers switching 3P ↔ Clients, changing client and changing paper type.
6. **Cancel:** write `JOB_CANCEL` rows that return the job's net issued sheets to zero.
7. **Admin stock edit:** write an `ADJUSTMENT` row of `new − current`.
8. **Not enough paper blocks the save** (`assertEnoughPaper`: locks the paper type rows; a job being edited may reuse its own net issued sheets). Adjustments set a counted balance ≥ 0, so stock can't go negative through the app.
9. All maths uses sheets.

## Dates

- Store dates as AD. Convert only in `src/lib/nepali-date.ts`; never call the converter library from components.
- Display BS as `YYYY/MM/DD` (e.g. `2082/02/25`). Inputs are typed BS text (`BsDateInput`, U12).
- "Today" means `Asia/Kathmandu`.

## Code layout

- `src/app/(app)/`: signed-in pages (layout with nav, `loading.tsx`).
- `src/app/login`, `src/app/privacy`, `src/app/not-found.tsx`, `src/app/icon.svg`.
- `src/components/`:
  - `ui/`: shadcn, generated.
  - `brand/logo.tsx`, `nav/`, `page-header.tsx`, `empty-state.tsx`, `bs-date-input.tsx`, `users/`.
  - `paper/`: shared by Paper – 3P and Paper – Client (`paper-ledger.tsx` is the ledger page for both; `PaperTypeFields` has an optional Client field).
- `src/lib/`: `auth.ts`, `db.ts`, `roles.ts`, `utils.ts`, `validators/`.
- `src/lib/`: also `nepali-date.ts` (only place using the converter) and `paper.ts` (normalization incl. `normalizeClient`, labels, `paperHref`).
- `src/lib/jobs.ts`: Job Card constants, form value types, `nextJobNo`. `src/lib/validators/common.ts`: shared zod pieces (`bsDate`, `optionalText`, `optionalInt`).
- `src/components/job-card/`: `job-card.tsx` (the one Job Card, `mode` = form | view | print), `parts.tsx` (card-style inputs, option boxes), `job-card-form.tsx` (form state + submit for Create Job and Edit job).
- `src/components/jobs/`: Job Records list, view dialog, edit-record dialog, badges, `print-job.tsx` (prints the card in place).
- `src/lib/ink-coverage.ts` (paths, limits, URL checks) and `shrink-photo.ts` (browser only). `src/app/api/ink-coverage/route.ts` is the only API route besides auth: it issues Blob upload tokens.
- `src/server/`: `users.ts`, `paper.ts`, `jobs.ts` (actions), `ink-coverage.ts` (save/remove), `job-data.ts` (server-only job queries), `inventory.ts` (server-only stock/ledger logic), `auth-actions.ts`.
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
  - `row-hover`: pale navy for the table row under the mouse. Every table row uses `hover:bg-row-hover` (shadcn `TableRow` has it by default; hand-built `<tr>` rows add it). Change the colour only in `globals.css`.
  - `col-line` / `col-group`: table column lines. Every data table has the `col-lines` class: a faint `col-line` between sub-columns, and a darker `col-group` line before each main column or group (cells marked `border-l`). `border-l-0` removes a line (e.g. the actions/chevron column).
- **Logo:** use `Logo` / `LogoMark` from `@/components/brand/logo`, and keep `src/app/icon.svg` matching.

**Components**
- **One Job Card component** serves the form, the view modal and print, through a `mode` prop.
- Keep the paper-form labels and abbreviations (A/B, O/S, CS…). Staff know them.
- For a red confirm button, use `variant="destructive"` on `AlertDialogAction`. A `className` override doesn't win.
- A dialog opened from a `DropdownMenuItem` closes instantly unless the menu's `onCloseAutoFocus` is prevented (see `RowActions` in `job-records-list.tsx`).
- `JobCard` lays out with container queries (`@xl:`, `@2xl:`, `@3xl:`), not screen breakpoints, so it works in the modal and on A4. Print-only tweaks use `group-data-[mode=print]/card:`.
  - Paper sections A–D share fixed columns (`minmax(0,1fr)_10rem_16.5rem`: job fields | Stock Paper | option boxes) so they line up. Don't size them from content.
  - Print lays the card out at the View details width (61rem) and scales it to A4 with CSS `zoom`. Don't lay it out at 194mm; that switches to the narrow layout.
- Grids that hold a scrollable table or filter bar need `grid-cols-[minmax(0,1fr)] *:min-w-0`, or they overflow at 375px.

## UNKNOWNS

- **U1.** What does "R.P 1864" on the sample card mean? (Job size vs stock size is now answered: Stock Paper.)
- **U2.** Jobs that mix 3P and client paper aren't supported. That would need a source choice per section.
- **U4.** Packets are record only; the maths uses sheets.
- **U5.** Should Delivery be required when completing a job?
- **U6.** Full names of paper categories TC and DB, and the meaning of binding "JuJu". Is the category list complete?
- **U7.** Low-stock warning: the threshold and how to show it are undecided.
- **U9.** What the tally boxes mean is unclear. They are free-text cells (7 boxes × top/bottom) for now.
- **U10.** Un-cancelling a job isn't supported.
- **U12.** BS dates are a text input (`YYYY/MM/DD`, `BsDateInput`). A calendar picker may replace it later.
- **U13.** Required Qty is the job card Qty (planned, with wastage); Delivery is what was delivered. Assumed Required ≥ Delivery, but the binder has rows where Delivery is higher. Nothing is enforced; owner to confirm.
