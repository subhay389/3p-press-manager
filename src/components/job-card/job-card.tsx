"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { knownClients, type KnownPaperType } from "@/components/paper/paper-type-fields";
import {
  Band,
  BoxInput,
  CardLabel,
  digits,
  FoldingChoice,
  JobCardModeProvider,
  LineInput,
  OptionBoxes,
  TickBox,
  ToggleBox,
  useReadOnly,
  type JobCardMode,
} from "@/components/job-card/parts";
import {
  BINDINGS,
  CATEGORY_BOXES,
  LAMINATIONS,
  PRINT_STYLES,
  SECTION_INFO,
  SECTIONS,
  sheetsByPaperType,
  type JobCardValues,
  type SectionKey,
  type SectionValues,
} from "@/lib/jobs";
import { formatAd, parseBs } from "@/lib/nepali-date";
import { formatSheets, normalizeCategory, normalizeClient, normalizeSize } from "@/lib/paper";
import { cn } from "@/lib/utils";

const PAPER_STOCK = [
  { value: "PRESS", label: "3P" },
  { value: "CLIENT", label: "Clients" },
] as const;

const CATEGORY_OPTIONS = CATEGORY_BOXES.map((c) => ({ value: c, label: c }));

/**
 * The Job Card Sheet, laid out like the paper form. One component for the
 * Enter Job form, the View details modal and print (`mode`).
 */
export function JobCard({
  mode,
  values,
  onChange = () => {},
  onSectionChange = () => {},
  paperTypes = [],
  jobNoError,
}: {
  mode: JobCardMode;
  values: JobCardValues;
  onChange?: (patch: Partial<JobCardValues>) => void;
  onSectionChange?: (key: SectionKey, patch: Partial<SectionValues>) => void;
  paperTypes?: KnownPaperType[];
  jobNoError?: string | null;
}) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;
  const isPress = values.paperStock === "PRESS";

  const dateTyped = values.date.trim();
  const dateAd = dateTyped ? parseBs(dateTyped) : null;
  const dateInvalid = /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(dateTyped) && !dateAd;

  // Stock Paper sheets requested per paper type across all sections, for shortage warnings.
  const requested = sheetsByPaperType(SECTIONS.map((k) => values.sections[k]));
  const clients = mode === "form" && !isPress ? knownClients(paperTypes) : [];

  return (
    <JobCardModeProvider value={mode}>
      <div
        className={cn(
          "group/card @container overflow-hidden rounded-xl border border-foreground/10 bg-card text-card-foreground",
          mode !== "print" && "shadow-sm",
        )}
        data-mode={mode}
      >
        {/* ---- Top band: title, Job No, Date ---- */}
        <Band className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 @xl:px-5">
          <h2 className="mr-auto text-lg font-bold tracking-wide uppercase @xl:text-xl">Job Card Sheet</h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor={f("jobNo")} className="text-base font-bold @xl:text-lg">
                Job No:
              </label>
              <BandPill
                id={f("jobNo")}
                inputMode="numeric"
                className="w-24"
                value={values.jobNo}
                onChange={(e) => onChange({ jobNo: digits(e.target.value) })}
                aria-invalid={!!jobNoError || undefined}
                aria-describedby={jobNoError ? f("jobNo-error") : undefined}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={f("date")} className="text-base font-bold @xl:text-lg">
                Date:
              </label>
              <BandPill
                  id={f("date")}
                  inputMode="numeric"
                  placeholder="YYYY/MM/DD"
                  className="w-32"
                  value={values.date}
                  onChange={(e) => onChange({ date: e.target.value })}
                  aria-invalid={dateInvalid || undefined}
                  title={dateAd ? formatAd(dateAd) : "BS date"}
                  required
                />
            </div>
          </div>
        </Band>
        {(jobNoError || dateInvalid || (mode === "form" && dateAd)) && (
          <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-b border-primary/20 bg-brand-soft px-4 py-1.5 text-xs @xl:px-5">
            {jobNoError && (
              <p id={f("jobNo-error")} role="alert" className="mr-auto font-medium text-destructive">
                {jobNoError}
              </p>
            )}
            {dateInvalid ? (
              <p role="alert" className="font-medium text-destructive">
                Not a valid BS date
              </p>
            ) : (
              dateAd && <p className="text-muted-foreground">Date = {formatAd(dateAd)} AD</p>
            )}
          </div>
        )}

        {/* ---- Header fields ---- */}
        <div className="grid gap-x-6 gap-y-3 bg-muted/60 px-4 py-4 group-data-[mode=print]/card:py-3 @xl:px-5 @2xl:grid-cols-2">
          <div className="grid content-start gap-2.5">
            <Line label="Client:" id={f("client")}>
              <LineInput
                id={f("client")}
                list={clients.length > 0 ? f("client-options") : undefined}
                value={values.client}
                onChange={(e) => onChange({ client: e.target.value })}
                required
              />
              {clients.length > 0 && (
                <datalist id={f("client-options")}>
                  {clients.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </Line>
            <div className="flex items-end gap-3">
              <Line label="Job:" id={f("job")} className="flex-1">
                <LineInput
                  id={f("job")}
                  value={values.jobName}
                  onChange={(e) => onChange({ jobName: e.target.value })}
                  required
                />
              </Line>
              <Line label="Qty:" id={f("qty")} className="w-28 shrink-0">
                <LineInput
                  id={f("qty")}
                  inputMode="numeric"
                  value={values.qty}
                  onChange={(e) => onChange({ qty: digits(e.target.value) })}
                />
              </Line>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-end gap-x-3 gap-y-1.5 pt-1 @xl:grid-cols-[auto_5rem_1fr]">
              <PlateRow label="Color Plates:" id={f("colorPlates")} value={values.colorPlates} onChange={(v) => onChange({ colorPlates: v })} />
              <PlateRow label="B/W Plates:" id={f("bwPlates")} value={values.bwPlates} onChange={(v) => onChange({ bwPlates: v })} />
              <PlateRow label="Spot Plates:" id={f("spotPlates")} value={values.spotPlates} onChange={(v) => onChange({ spotPlates: v })} />
              <div className="col-span-2 flex items-end justify-end gap-2 @xl:col-span-1 @xl:col-start-3 @xl:row-start-3 @xl:justify-start @xl:pl-3">
                <CardLabel htmlFor={f("totalPlates")} className="font-semibold">
                  Total Plates:
                </CardLabel>
                <LineInput
                  id={f("totalPlates")}
                  inputMode="numeric"
                  className="w-16 text-center font-semibold"
                  value={values.totalPlates}
                  onChange={(e) => onChange({ totalPlates: digits(e.target.value) })}
                  title="Adds up automatically. Type to override."
                />
              </div>
              <div className="col-span-2 flex items-end justify-end gap-2 @xl:col-span-1 @xl:col-start-3 @xl:row-start-1 @xl:justify-start @xl:pl-3">
                <TickBox
                  id={f("repeatJob")}
                  checked={values.repeatJob}
                  onChange={(repeatJob) => onChange({ repeatJob, ...(!repeatJob && { repeatOfJobNo: "" }) })}
                />
                <CardLabel htmlFor={f("repeatJob")} className="font-semibold">
                  Repeat Job
                </CardLabel>
                <LineInput
                  aria-label="Repeat of Job No"
                  placeholder="Job No"
                  inputMode="numeric"
                  className="w-20 text-center placeholder:text-muted-foreground/35"
                  value={values.repeatOfJobNo}
                  onChange={(e) => {
                    const repeatOfJobNo = digits(e.target.value);
                    onChange({ repeatOfJobNo, ...(repeatOfJobNo && { repeatJob: true }) });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid content-start gap-3 border-t border-foreground/10 pt-3 @2xl:border-t-0 @2xl:border-l @2xl:pt-0 @2xl:pl-5">
            <BoxRow label="Paper Stock">
              <OptionBoxes
                label="Paper Stock"
                options={PAPER_STOCK}
                value={values.paperStock}
                onChange={(v) => v && onChange({ paperStock: v })}
                required
              />
            </BoxRow>
            <BoxRow label="Lamination">
              <OptionBoxes
                label="Lamination"
                options={LAMINATIONS}
                value={values.lamination}
                onChange={(v) => onChange({ lamination: v })}
              />
              <ToggleBox
                label="B-Side"
                checked={values.laminationBSide}
                onChange={(laminationBSide) => onChange({ laminationBSide })}
              />
              <LineInput
                aria-label="Lamination note"
                className="min-w-24 flex-1"
                value={values.laminationNote}
                onChange={(e) => onChange({ laminationNote: e.target.value })}
              />
            </BoxRow>
            <BoxRow label="Binding">
              <OptionBoxes
                label="Binding"
                options={BINDINGS}
                value={values.binding === "OTHER" ? "" : values.binding}
                onChange={(v) => onChange({ binding: v, ...(v && { bindingOther: "" }) })}
              />
              <BoxInput
                aria-label="Other binding"
                className={cn("w-12 text-left", values.binding === "OTHER" && "border-primary bg-brand-soft font-semibold")}
                value={values.bindingOther}
                onChange={(e) =>
                  onChange({ bindingOther: e.target.value, binding: e.target.value.trim() ? "OTHER" : "" })
                }
              />
            </BoxRow>
            <Line label="Other:" id={f("other")}>
              <LineInput
                id={f("other")}
                value={values.other}
                onChange={(e) => onChange({ other: e.target.value })}
              />
            </Line>
          </div>
        </div>

        {/* ---- Paper sections A–D ---- */}
        <div className="divide-y divide-dashed divide-foreground/15 px-4 @xl:px-5">
          {SECTIONS.map((key) => (
            <PaperSection
              key={key}
              sectionKey={key}
              idPrefix={f(`s${key}`)}
              value={values.sections[key]}
              onChange={(patch) => onSectionChange(key, patch)}
              isPress={isPress}
              client={values.client}
              paperTypes={paperTypes}
              requested={requested}
            />
          ))}
        </div>

        {/* ---- Shop floor ---- */}
        <div className="grid gap-x-6 gap-y-2 px-4 pt-4 pb-3 group-data-[mode=print]/card:pt-2.5 group-data-[mode=print]/card:pb-2 @xl:grid-cols-3 @xl:px-5">
          <Line label="Provided by:" id={f("providedBy")} stacked>
            <LineInput id={f("providedBy")} value={values.providedBy} onChange={(e) => onChange({ providedBy: e.target.value })} />
          </Line>
          <Line label="Received by:" id={f("receivedBy")} stacked>
            <LineInput id={f("receivedBy")} value={values.receivedBy} onChange={(e) => onChange({ receivedBy: e.target.value })} />
          </Line>
          <Line label="Checked by:" id={f("checkedBy")} stacked>
            <LineInput id={f("checkedBy")} value={values.checkedBy} onChange={(e) => onChange({ checkedBy: e.target.value })} />
          </Line>
        </div>
        <Band className="px-4 py-1.5 @xl:px-5">
          <div className="flex w-full max-w-sm items-center gap-2 rounded-full bg-background py-0.5 pr-3 pl-3.5 text-foreground">
            <label htmlFor={f("takenTime")} className="shrink-0 text-xs font-bold tracking-wide uppercase">
              Taken Time:
            </label>
            <input
              id={f("takenTime")}
              autoComplete="off"
              readOnly={mode !== "form"}
              className="h-7 min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
              value={values.takenTime}
              onChange={(e) => onChange({ takenTime: e.target.value })}
            />
          </div>
        </Band>
        <div className="grid gap-3 bg-muted/60 px-4 py-4 group-data-[mode=print]/card:gap-2 group-data-[mode=print]/card:py-3 @xl:px-5">
          {SECTIONS.map((key) => (
            <TallyRow
              key={key}
              label={SECTION_INFO[key].tallyLabel}
              cells={values.sections[key].tally}
              onChange={(tally) => onSectionChange(key, { tally })}
            />
          ))}
        </div>
        <div className="grid gap-x-6 gap-y-2 px-4 pt-4 pb-3 group-data-[mode=print]/card:pt-2.5 group-data-[mode=print]/card:pb-2 @xl:grid-cols-3 @xl:px-5">
          <Line label="Completed by:" id={f("completedBy")} stacked>
            <LineInput id={f("completedBy")} value={values.completedBy} onChange={(e) => onChange({ completedBy: e.target.value })} />
          </Line>
          <Line label="Checked by:" id={f("finalCheckedBy")} stacked>
            <LineInput id={f("finalCheckedBy")} value={values.finalCheckedBy} onChange={(e) => onChange({ finalCheckedBy: e.target.value })} />
          </Line>
          <Line label="Handover To:" id={f("handoverTo")} stacked>
            <LineInput id={f("handoverTo")} value={values.handoverTo} onChange={(e) => onChange({ handoverTo: e.target.value })} />
          </Line>
        </div>
        <div className="mx-3 mb-3 rounded-md bg-brand-soft px-3 py-2 @xl:mx-4 @xl:mb-4">
          <label htmlFor={f("note")} className="text-sm font-semibold text-primary">
            Note:
          </label>
          <textarea
            id={f("note")}
            rows={mode === "print" ? 2 : 3}
            readOnly={mode !== "form"}
            className="mt-1 block w-full resize-y bg-transparent text-base outline-none placeholder:text-muted-foreground/70 md:text-sm"
            placeholder={mode === "form" ? "Ink coverage, wastage, anything else…" : undefined}
            value={values.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </div>
      </div>
    </JobCardModeProvider>
  );
}

/** White pill input inside the top band (Job No, Date). */
function BandPill({ className, ...props }: ComponentProps<"input">) {
  const readOnly = useReadOnly();
  return (
    <input
      autoComplete="off"
      readOnly={readOnly}
      {...props}
      className={cn(
        "h-8 rounded-full border-2 border-transparent bg-background px-3 text-center text-base font-semibold text-foreground tabular-nums outline-none transition-colors focus:border-navy aria-invalid:border-destructive aria-invalid:bg-red-50 aria-invalid:text-destructive",
        className,
      )}
    />
  );
}

/** "Label: ______" on one line, or label above the line when `stacked` on phones. */
function Line({
  label,
  id,
  className,
  stacked,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 items-end gap-2", stacked && "@xl:flex-col @xl:items-stretch @xl:gap-0", className)}>
      <CardLabel htmlFor={id}>{label}</CardLabel>
      {children}
    </div>
  );
}

function BoxRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.25rem_1fr] items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5">{children}</div>
    </div>
  );
}

function PlateRow({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <CardLabel htmlFor={id} className="font-semibold @xl:col-start-1">
        {label}
      </CardLabel>
      <LineInput
        id={id}
        inputMode="numeric"
        className="w-16 text-center @xl:col-start-2"
        value={value}
        onChange={(e) => onChange(digits(e.target.value))}
      />
    </>
  );
}

function PaperSection({
  sectionKey,
  idPrefix,
  value,
  onChange,
  isPress,
  client,
  paperTypes,
  requested,
}: {
  sectionKey: SectionKey;
  idPrefix: string;
  value: SectionValues;
  onChange: (patch: Partial<SectionValues>) => void;
  isPress: boolean;
  client: string;
  paperTypes: KnownPaperType[];
  requested: Map<string, number>;
}) {
  const readOnly = useReadOnly();
  const info = SECTION_INFO[sectionKey];
  // Category, GSM and the Stock Paper size pick the stock (3P, or this client's
  // paper) that the Stock Paper sheets come from (`paperTypeId`, set by the
  // form). The job's own Size and No. of Sheets are information only.
  const chosen = readOnly ? undefined : paperTypes.find((p) => p.id === value.paperTypeId);

  const category = normalizeCategory(value.category);
  const categoryIsBox = (CATEGORY_BOXES as readonly string[]).includes(category);
  const gsm = Number(value.gsm);
  const stockSize = normalizeSize(value.stockSize);
  const ownerKey = isPress ? "" : normalizeClient(client);
  const sizeOptions =
    readOnly || !(gsm > 0) || (!isPress && !ownerKey)
      ? []
      : paperTypes.filter(
          (p) => p.clientKey === ownerKey && p.gsm === gsm && (!category || p.category === category),
        );
  const noMatch = !readOnly && !!category && gsm > 0 && !!stockSize && !chosen;

  const need = chosen ? (requested.get(chosen.id) ?? 0) : 0;
  const short = !!chosen && need > chosen.balance;
  const sharedWithOther = !!chosen && need !== Number(value.stockSheets || 0);

  return (
    <section aria-label={info.title} className="grid gap-x-6 gap-y-2.5 py-4 group-data-[mode=print]/card:gap-y-1.5 group-data-[mode=print]/card:py-2.5 @2xl:grid-cols-[minmax(0,1fr)_10rem_16.5rem] @2xl:gap-x-4">
      {/* Row 1: title + GSM/Size | (stock paper) | category boxes */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 group-data-[mode=print]/card:gap-x-2 @2xl:col-start-1">
        <h3 className="w-full text-sm font-semibold tracking-wide text-primary uppercase @xl:w-46 @xl:shrink-0 @2xl:w-full @3xl:w-46">
          {info.title}:
        </h3>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BoxInput
            aria-label={`${info.title} GSM`}
            placeholder="GSM"
            inputMode="numeric"
            className="w-16 px-1 text-left group-data-[mode=print]/card:w-12 placeholder:text-muted-foreground/35"
            aria-invalid={noMatch || undefined}
            value={value.gsm}
            onChange={(e) => onChange({ gsm: digits(e.target.value) })}
          />
          <label htmlFor={`${idPrefix}-size`} className="ml-4 text-sm font-medium uppercase @xl:ml-6">
            Size:
          </label>
          <LineInput
            id={`${idPrefix}-size`}
            placeholder="e.g. 400mmx400mm"
            className="max-w-44 flex-1 whitespace-nowrap placeholder:text-muted-foreground/35"
            value={value.size}
            onChange={(e) => onChange({ size: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 @2xl:col-start-3">
        <OptionBoxes
          label={`${info.title} category`}
          options={CATEGORY_OPTIONS}
          value={categoryIsBox ? (category as (typeof CATEGORY_BOXES)[number]) : ""}
          onChange={(v) => onChange({ category: v })}
        />
        <BoxInput
          aria-label={`${info.title} other category`}
          placeholder="Other"
          className={cn("w-16", !categoryIsBox && category && "border-primary bg-brand-soft font-semibold")}
          value={categoryIsBox ? "" : category}
          onChange={(e) => onChange({ category: e.target.value })}
        />
      </div>

      {/* Row 2: format + pieces (stored as folding) | (stock paper) | print style */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-1.5 @xl:gap-x-6 @xl:pl-4 @2xl:col-start-1 @2xl:pl-0 @3xl:pl-4">
        <span className="flex items-center gap-3">
          <label htmlFor={`${idPrefix}-format`} className="min-w-24 text-sm">
            {info.formatLabel}:
          </label>
          <BoxInput
            id={`${idPrefix}-format`}
            inputMode="numeric"
            className="w-14"
            value={value.format}
            onChange={(e) => onChange({ format: digits(e.target.value) })}
          />
        </span>
        <span className="flex items-center gap-2">
          <span className="text-sm">Pieces:</span>
          <FoldingChoice
            label={`${info.title} pieces`}
            options={info.foldings}
            value={value.folding}
            onChange={(folding) => onChange({ folding })}
          />
        </span>
      </div>
      <OptionBoxes
        label={`${info.title} print style`}
        className="@2xl:col-start-3"
        options={PRINT_STYLES}
        value={value.printStyle}
        onChange={(printStyle) => onChange({ printStyle })}
      />

      {/* Row 3: job sheets | (stock paper) | front/back color */}
      <div className="flex items-center gap-3 @xl:pl-4 @2xl:col-start-1 @2xl:pl-0 @3xl:pl-4">
        <label htmlFor={`${idPrefix}-sheets`} className="min-w-24 text-sm">
          No. Of Sheets:
        </label>
        <LineInput
          id={`${idPrefix}-sheets`}
          inputMode="numeric"
          className="max-w-32 tabular-nums"
          value={value.sheets}
          onChange={(e) => onChange({ sheets: digits(e.target.value) })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 @2xl:flex-nowrap @2xl:justify-between @2xl:col-start-3">
        <span className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-front`} className="text-sm">
            Front Color
          </label>
          <BoxInput
            id={`${idPrefix}-front`}
            className="w-10"
            value={value.frontColor}
            onChange={(e) => onChange({ frontColor: e.target.value })}
          />
        </span>
        <span className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-back`} className="text-sm">
            Back Color
          </label>
          <BoxInput
            id={`${idPrefix}-back`}
            className="w-10"
            value={value.backColor}
            onChange={(e) => onChange({ backColor: e.target.value })}
          />
        </span>
      </div>

      {/* Stock Paper: the middle column on wide cards (its rows line up with the
          rows beside it), last on phones. */}
      <div
        role="group"
        aria-label={`${info.title} stock paper`}
        className="grid content-start gap-y-2 rounded-md border border-primary/30 bg-brand-soft/60 px-3 py-2 group-data-[mode=print]/card:py-1 @2xl:col-start-2 @2xl:row-span-3 @2xl:row-start-1 @2xl:grid-rows-subgrid"
      >
        <h4 className="self-center text-xs font-bold tracking-wide text-primary uppercase">Stock Paper</h4>
        <div className="flex min-w-0 items-center gap-2 self-center">
          <label htmlFor={`${idPrefix}-stock-size`} className="w-12 shrink-0 text-sm font-medium">
            Size:
          </label>
          <StockSizeInput
            id={`${idPrefix}-stock-size`}
            value={value.stockSize}
            invalid={noMatch}
            options={sizeOptions}
            showCategory={!category}
            onChange={(stockSize) => onChange({ stockSize })}
            onPick={(p) => onChange({ stockSize: p.size, ...(!category && { category: p.category }) })}
          />
        </div>
        <div className="grid gap-1 self-center">
          <div className="flex items-center gap-2">
            <label htmlFor={`${idPrefix}-stock-sheets`} className="w-12 shrink-0 text-sm font-medium">
              Sheets:
            </label>
            <LineInput
              id={`${idPrefix}-stock-sheets`}
              inputMode="numeric"
              className="min-w-0 max-w-40 flex-1 font-semibold tabular-nums"
              value={value.stockSheets}
              onChange={(e) => onChange({ stockSheets: digits(e.target.value) })}
              aria-invalid={short || undefined}
            />
          </div>
          {noMatch && (
            <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-destructive contain-inline-size">
              <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {isPress
                ? `No 3P paper ${category} · ${gsm} · ${stockSize}. Add it on Paper – 3P.`
                : client.trim()
                  ? `No paper from ${client.trim()}: ${category} · ${gsm} · ${stockSize}. Add it on Paper – Client.`
                  : "Enter the client to find their paper."}
            </p>
          )}
          {chosen && (
            <p
              role={short ? "alert" : undefined}
              className={cn(
                "flex items-start gap-1.5 text-xs contain-inline-size",
                short ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              {short && <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />}
              <span>
                {short ? "Not enough paper · " : ""}
                Balance {formatSheets(chosen.balance)}
                {sharedWithOther && ` · ${formatSheets(need)} needed across sections`}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Stock Paper size with a dropdown of the sizes in stock for the section's GSM
 * (and category, if ticked), each with its balance. Typing still works and
 * narrows the list.
 */
function StockSizeInput({
  id,
  value,
  invalid,
  options,
  showCategory,
  onChange,
  onPick,
}: {
  id: string;
  value: string;
  invalid: boolean;
  options: KnownPaperType[];
  showCategory: boolean;
  onChange: (size: string) => void;
  onPick: (paperType: KnownPaperType) => void;
}) {
  const [open, setOpen] = useState(false);
  const typed = normalizeSize(value);
  const shown = options.filter((p) => !typed || p.size.includes(typed));
  const listId = `${id}-options`;
  const expanded = open && shown.length > 0;

  return (
    <div
      className="relative min-w-0 max-w-40 flex-1"
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <LineInput
        id={id}
        placeholder="e.g. 24x36"
        className="w-full whitespace-nowrap placeholder:text-muted-foreground/35"
        aria-invalid={invalid || undefined}
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        value={value}
        onChange={(e) => {
          setOpen(true);
          onChange(e.target.value);
        }}
      />
      {expanded && (
        <ul
          id={listId}
          aria-label="Sizes in stock"
          className="absolute top-full left-0 z-20 mt-1 max-h-56 w-max min-w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {shown.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-baseline justify-between gap-4 rounded px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  p.size === typed && "bg-brand-soft font-semibold",
                )}
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                }}
              >
                <span className="whitespace-nowrap">
                  {p.size}
                  {showCategory && <span className="ml-1.5 text-xs text-muted-foreground">{p.category}</span>}
                </span>
                <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatSheets(p.balance)} sheets
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "B. INSIDE COLOR SHEETS:" with 7 boxes, each split into top and bottom cells (U9). */
function TallyRow({
  label,
  cells,
  onChange,
}: {
  label: string;
  cells: string[];
  onChange: (cells: string[]) => void;
}) {
  const readOnly = useReadOnly();
  const boxes = Array.from({ length: cells.length / 2 }, (_, i) => i);
  const set = (i: number, v: string) => onChange(cells.map((c, j) => (j === i ? v : c)));

  return (
    <div className="grid items-center gap-x-4 gap-y-1.5 @2xl:grid-cols-[15rem_1fr]">
      <span className="text-xs font-bold tracking-wide uppercase @xl:text-sm">{label}:</span>
      <div className="grid grid-cols-7 gap-1 @xl:gap-2" role="group" aria-label={`${label} tally`}>
        {boxes.map((b) => (
          <div key={b} className="grid overflow-hidden rounded-[3px] border border-foreground/50 bg-background">
            {[b * 2, b * 2 + 1].map((i) => (
              <input
                key={i}
                aria-label={`${label} box ${b + 1} ${i % 2 === 0 ? "top" : "bottom"}`}
                autoComplete="off"
                readOnly={readOnly}
                className={cn(
                  "h-7 w-full min-w-0 bg-transparent px-0.5 text-center group-data-[mode=print]/card:h-6 text-base tabular-nums outline-none focus:bg-brand-soft md:text-sm",
                  i % 2 === 0 && "border-b border-foreground/30",
                )}
                value={cells[i] ?? ""}
                onChange={(e) => set(i, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
