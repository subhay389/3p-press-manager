# Feature specs

Detailed behaviour of each tab. Project rules, inventory rules and UNKNOWNS (U1, U2…) are in [CLAUDE.md](../CLAUDE.md).

## Create Job (Job Card form)
The tab and page are called **Create Job**. The page has no title heading, only a one-line description above the card.

Must look **almost identical** to [job-card-sheet.jpg](reference/job-card-sheet.jpg): same fields, order and grouping, magenta header bands, checkbox-style option boxes. On phones it may reflow to one column.

**Header**
- **Job No:** auto-filled with `max(5000, max(jobNo) + 1)` (owner: start at 5000), and editable.
  - It must be unique: check live, show a red border and *"Please enter a unique job number"*, and block submit.
  - The DB unique constraint is the final guard.
- **Date:** BS, defaults to today.
- **Client** and **Job**: free text. **Qty**: integer.
- **Paper Stock:** 3P or Clients, one choice for the whole job (U2).
- **Plates:** Color, B/W, Cover, Spot and Total. Total is auto-summed but editable.
- **Lamination:** Gloss / Matt / none (one choice), a **B-Side** box ticked on its own, and a blank note box. Shown as ticks in Job Records.
- **Binding:** CS / PB / SS / JuJu / other text.
- **Other:** free text.
- **Repeat Job:** tick box + job number (`repeatJob`, `repeatOfJobNo`), right of Color Plates. Typing a number ticks it; unticking clears it. Saved only; not linked to the other job.

**Paper sections A–D**: A Cover, B Inside Color, C Inside, D Inside. All optional.
- Three columns on wide cards: job fields | **Stock Paper** box | option boxes (category, print style, colours). Stock Paper's three rows line up with the rows beside it (CSS subgrid). On phones it comes last in the section.
- **Size** and **No. of Sheets** (left column) describe the job, e.g. 18x24 × 100. **Information only**: never matched or deducted.
- **No. of Sheets** is free text, typed and shown exactly as entered, so wastage goes in it: "500 + 100 wastage" or "500 with wastage" (issue #4).
- **Stock Paper → Size / Sheets** is the paper taken from stock, e.g. 24x36 × 50. It is the **only** link to a paper record, for 3P and Client jobs alike:
  - The form matches **Category + GSM + Stock Size** (`matchPaperType`) to 3P stock, or, for Clients, to the paper of the client typed on the card (client name compared case- and space-insensitively). Changing Paper Stock or the client re-links every section.
  - Stock Sheets is the number deducted. Sections that use the same paper are added up into one ledger row for the job; different papers get one row each in their own ledger.
  - No match shows a red "No 3P paper…" / "No paper from <client>…" line.
  - The Client box suggests clients that have paper (Clients jobs only).
  - The GSM box has a dropdown of the GSMs in stock (3P, or the client's paper once the client is entered), lowest first, narrowed to the ticked category (`SuggestInput`).
  - Once GSM is typed, the Stock Paper Size shows a dropdown of the sizes in stock for that GSM (3P, or this client), narrowed to the ticked category, each with its balance (`StockSizeInput`). Picking one also ticks its category if none is ticked. Typing still works and filters the list.
- Every section that takes paper (anything filled in besides tally boxes) **must** have Stock Size, a matching paper type, and Stock Sheets, or it can't be saved.
- **Category options:** A/B (Art Board), A/P (Art Paper), W/F (Wood Free), DUP (Duplex), TC, DB, other.
- **Format:** a typed whole number. **Pieces** (the circled number; stored as `folding`) sits beside it: A is 1/2/4/8/16; B–D are 1/2/4/8/16/32.
- **Print style:** O/S, F/B, W/T, W/Tumble.
- **Front Color** and **Back Color.**

**Shop-floor fields**, optional text:
- Provided by, Received by, Checked by, Taken Time.
- Sheet-tally rows for A–D: 7 boxes each, split top/bottom, stored as 14 strings in `tally` (U9).
- Completed by, Checked by, Handover To, Note.

**Not enough paper blocks saving** (3P and Client):
- The live balance shows under each Stock Paper's Sheets.
- If a paper type's requested Stock Sheets (summed across sections) exceed its balance, the section shows **"Not enough paper"**, the bottom bar says so, and Save is disabled.
- The server re-checks inside the save transaction (`assertEnoughPaper`, which locks the paper type rows).

## Job Records
Reference: [job-record.jpg](reference/job-record.jpg).
- Search by job no, client or job name. Filter by status. Sort by clicking a column header (not the ticks or Ink Coverage); phones pick from a "Sort by" list above the cards. Starts newest first. Clicking anywhere on a row (or a card on phones) opens View details; the row's action menu does not.
- Columns:
  - Date, Client, Job Name, Job No.
  - Binding: Col. (tick), Stitching, Folding.
  - Lamination: Matt, Gloss, B-Side (ticks, the same values as the job card's Lamination), Qty, Size.
  - Required Qty, Delivery, Remarks.
  - Ink Coverage: a thumbnail of the photo (opens it in a dialog with "Open full size") or a PDF tile (opens the PDF in a new tab). Empty when there is none. On phones it sits on the card beside the ⋯ menu.
  - Status badge.
- **Record-only fields** (Col. through Remarks) are free text apart from the ticks, edited here through an "Edit record" dialog, not on the job form.
- Row actions:
  - **View details** (everyone): read-only Job Card in a modal, rendered as HTML, with **Print**.
  - **Edit job** (admin): reopens the form; saving re-applies inventory. Cancelled jobs can't be edited. Details below.
  - **Mark completed** (admin).
  - **Cancel** (admin, with a confirm step): keeps the record and restores its paper.
  - **Add Ink Coverage** (admin, any status, cancelled too): see below. Once a job has one, the menu shows **Replace Ink Coverage** and **Remove Ink Coverage** (with a confirm step).
- **Ink Coverage**: one photo or PDF per job (the press's ink coverage sheet), not printed on the job card.
  - The dialog has two buttons: **Take photo** (`capture="environment"`: opens the camera on a phone) and **Upload photo or PDF** (file picker). One button can't do both: allowing PDFs makes Android show an app chooser instead of the camera. The file saves as soon as it is picked; no Save button.
  - Photos are shrunk in the browser (`src/lib/shrink-photo.ts`) to 2400px on the long side, JPEG 0.85 (~0.2–1 MB, so the small zone numbers stay readable when zoomed), plus a 240px thumbnail (~10 KB) that Job Records loads. PDFs are kept as they are, up to 10 MB.
  - Files go from the browser straight to **Vercel Blob** (`upload()` with a token from `/api/ink-coverage`, which checks admin, the job and the file type), then `saveInkCoverage` stores the URLs on the job. Replacing or removing deletes the old files from Blob.
  - Blob links are public but contain a long random suffix (owner decision: no extra security).
  - View details shows an **Ink Coverage** button that opens the file.
- **Statuses:** `CREATED` → `COMPLETED`; either → `CANCELLED`. Of the status changes, only cancelling changes stock.
- **Edit job** (`/jobs/[id]/edit`, admin):
  - `JobCardForm` with `jobId` and initial values from `getJobCard`. Completed jobs can be edited; cancelled ones redirect to their View details.
  - `isJobNoTaken(jobNo, jobId)` ignores the job being edited.
  - Balance shown per paper type = current balance + the job's own net issued sheets (`netIssuedByJob`), so the job doesn't block itself.
  - `updateJob` replaces the sections, then `correctJobPaper` writes one `JOB_CORRECTION` row per paper type where new sheets ≠ net issued: `sheets = net issued − new sheets` (maths in `paperCorrections`, `src/lib/jobs.ts`). Dated today in Nepal, particulars `"Edited: <client> – <job name>"`. One transaction.
  - After save: back to Job Records with a toast.
  - Entry points (admin, not cancelled): row menu and the View details modal.
- **Print** (View details and the row menu) opens the browser's print dialog on the same page, with no new page or URL. `PrintJob` (`print-job.tsx`) portals the Job Card into `body` off-screen, hides everything else in `@media print`, lays the card out at the View details width (61rem) so it looks the same, scales it with CSS `zoom` to fit one A4 page (5mm margins, 200 × 287mm content box) in both directions, stretches the Note box so the card reaches the bottom of the page, and calls `window.print()`.
- **Required Qty** is the job card's Qty (U13). `/jobs?q=<no>&view=<id>` opens that job's card in Job Records.

## Paper – 3P
Reference: [paper-record-press.jpg](reference/paper-record-press.jpg).
- **List:** paper types with Category, GSM, Size, Balance (sheets) and last movement date. Searchable. Sort by clicking a column header (first click A to Z / lowest first, second click reverses; an arrow marks the sorted column). Phones pick from a "Sort by" list above the cards. Empty values (e.g. no last entry) always go last. Sorting is `src/lib/sort.ts` + `src/components/sort-controls.tsx`, shared with Job Records.
- **Ledger** (`/paper/press/[id]`), headed CATEGORY · GSM · SIZE:
  - Rows by date: Date, Particulars, Job No, Received (Pkts, Sheets), Used (Pkts, Sheets), running Balance, Remarks. Paper-received rows have a soft green background, adjustments a soft amber one (`ROW_TINT` in `ledger-table.tsx`).
  - Job numbers open the job's View details dialog on top of the ledger, so you stay on the paper tab (`LedgerTable`). Ctrl/⌘-click still opens it in Job Records in a new tab.
- **Add paper** (admin):
  - Type Category/GSM/Size. Matching existing types show in a live dropdown; a new combination shows an amber "New paper type" notice and the button changes, so types aren't created by mistake.
  - Then enter Date, Particulars, Pkts (record only), Sheets and Remarks. Particulars and Sheets are required. Client paper has no Particulars field.
- **Adjust stock** (admin): enter the counted balance and a reason. It writes an `ADJUSTMENT` row. Wrong entries are fixed this way too; ledger rows are never edited (owner decision).
- **Edit paper type** (admin): with the duplicate check.
- Low-stock warning: not yet (U7).

## Paper – Client
Reference: [paper-record-client.jpg](reference/paper-record-client.jpg).
- Works exactly like Paper – 3P, with a **Client** in front: one stock per **Client + Category + GSM + Size**. All of a client's jobs with that paper draw on the same stock; a different paper is a separate stock.
- **List** (`/paper/client`): Client, Category, GSM, Size, Balance, last entry. Searchable by client too.
- **Ledger** (`/paper/client/[id]`): same columns as 3P, but Particulars is headed **Job**. Client jobs write `JOB_ISSUE` / `JOB_CORRECTION` / `JOB_CANCEL` rows automatically.
- **Add paper** (admin): Client (suggests known clients), Category, GSM, Size; new combinations get the amber notice. Record a client's paper **before** entering their job, or the job can't be saved.
- **Adjust stock** and **Edit paper type** as on 3P. Edit can fix a typo in the client name; jobs match by name, so keep it the same as on the job cards.
- Nothing is deleted; mistakes are fixed with Adjust stock.
