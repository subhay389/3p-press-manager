# Feature specs

Detailed behaviour of each tab. Project rules, inventory rules and UNKNOWNS (U1, U2…) are in [CLAUDE.md](../CLAUDE.md).

## Enter Job (Job Card form)
Must look **almost identical** to [job-card-sheet.jpg](reference/job-card-sheet.jpg): same fields, order and grouping, magenta header bands, checkbox-style option boxes. On phones it may reflow to one column.

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
- **Repeat Job:** tick box + job number (`repeatJob`, `repeatOfJobNo`), right of Color Plates. Typing a number ticks it; unticking clears it. Saved only; not linked to the other job.

**Paper sections A–D**: A Cover, B Inside Color, C Inside, D Inside. All optional.
- **Category / GSM / Size:**
  - Typed the same way for 3P and Clients: GSM box, Size line, category boxes.
  - 3P: the form links the typed values to the matching paper type (`matchPaperType`), which is what gets deducted. A combination not in stock shows a red "No 3P paper…" line and can't be saved with sheets.
  - Client jobs keep them as plain text, with no inventory link.
- **Category options:** A/B (Art Board), A/P (Art Paper), W/F (Wood Free), DUP (Duplex), TC, DB, other.
- **Format:** a typed whole number. **Folding** (how many times it is folded) sits beside it: A is 1/2/4/8/16; B–D are 1/2/4/8/16/32. Jobs saved before this change had their circled number moved to Folding.
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

## Job Records
Reference: [job-record.jpg](reference/job-record.jpg).
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
- **Edit job** (`/jobs/[id]/edit`, admin):
  - `JobCardForm` with `jobId` and initial values from `getJobCard`. Completed jobs can be edited; cancelled ones redirect to their View details.
  - `isJobNoTaken(jobNo, jobId)` ignores the job being edited.
  - Balance shown per paper type = current balance + the job's own net issued sheets (`netIssuedByJob`), so the job doesn't flag itself.
  - `updateJob` replaces the sections, then `correctJobPaper` writes one `JOB_CORRECTION` row per paper type where new sheets ≠ net issued: `sheets = net issued − new sheets` (maths in `paperCorrections`, `src/lib/jobs.ts`). Dated today in Nepal, particulars `"Edited: <client> – <job name>"`. `paperShortage` is recomputed. One transaction.
  - After save: back to Job Records with a toast.
  - Entry points (admin, not cancelled): row menu and the View details modal.
- **Print:** `/jobs/[id]/print` (outside the `(app)` group, so no nav) renders the Job Card at A4 width (194mm), scales it to one page with CSS `zoom`, and calls `window.print()`.
- **Required Qty** is the job card's Qty (U13). Ledger job numbers link to `/jobs?q=<no>&view=<id>`, which opens that job's card.

## Paper – 3P
Reference: [paper-record-press.jpg](reference/paper-record-press.jpg).
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

## Paper – Client
Reference: [paper-record-client.jpg](reference/paper-record-client.jpg).
- A standalone list of client paper receipts, not linked to jobs (U3). Searchable by client, job or job no. Admins can add, edit and delete (delete has a confirm step; it is a hard delete, as these rows touch no stock).
- Columns:
  - Date, Client.
  - Paper: GSM, Category, Size, Pkts, Sheets.
  - Cutting: Job, Job No (text, e.g. "1941/1942"), Pkts, Sheets.
  - Balance: Pkts, Sheets.
  - Remarks.
- Only Date and Client are required; Cutting is often filled in later via Edit.
- Balance Sheets = Sheets − Cutting Sheets (`clientBalanceSheets` in `src/lib/paper.ts`), shown "—" at 0 and red below 0. Balance Pkts is entered by hand.
