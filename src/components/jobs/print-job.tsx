"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { JobCard } from "@/components/job-card/job-card";
import type { JobCardValues } from "@/lib/jobs";

// A4 content box at 96 dpi with 5mm margins: 200mm × 287mm.
const PAGE_WIDTH_PX = (200 / 25.4) * 96;
const PAGE_HEIGHT_PX = (287 / 25.4) * 96;
// Kept free at the bottom so rounding in the print engine can't spill onto a second page.
const SAFETY_PX = 4;

/**
 * The card is laid out at the View details width; scale it so it fits one A4
 * page in both directions (it is centred if the height is the limit), then
 * stretch it (the Note box grows) so it reaches the bottom of the page.
 */
function fitToPage(card: HTMLElement) {
  const root = document.documentElement.style;
  const zoom =
    Math.floor(Math.min(1, PAGE_WIDTH_PX / card.offsetWidth, (PAGE_HEIGHT_PX - SAFETY_PX) / card.offsetHeight) * 1000) /
    1000;
  root.setProperty("--print-zoom", String(zoom));
  root.setProperty("--print-height", `${Math.floor((PAGE_HEIGHT_PX - SAFETY_PX) / zoom)}px`);
}

const PRINT_CSS = `
@page { size: A4; margin: 5mm; }
@media print {
  body { background: white; }
  body > *:not(#print-root) { display: none !important; }
  #print-root { position: static !important; }
  #print-card { zoom: var(--print-zoom, 1); display: flex; flex-direction: column; min-height: var(--print-height, auto); }
}`;

/**
 * Prints the Job Card on one A4 page, colours kept, from the page you are on:
 * the card is laid out off-screen and is the only thing shown when printing.
 * Opens the browser's print dialog on mount; remount (new `key`) to print again.
 */
export function PrintJob({ values, onDone }: { values: JobCardValues; onDone?: () => void }) {
  useEffect(() => {
    let done = false;
    const after = () => onDone?.();
    window.addEventListener("afterprint", after, { once: true });
    document.fonts.ready.then(() => {
      const card = document.getElementById("print-card");
      if (done || !card) return;
      fitToPage(card);
      window.print();
    });
    return () => {
      done = true;
      window.removeEventListener("afterprint", after);
    };
  }, [onDone]);

  return createPortal(
    <div id="print-root" aria-hidden inert className="fixed top-0 left-[-10000px] bg-white [print-color-adjust:exact]">
      <style>{PRINT_CSS}</style>
      {/* Laid out at the View details width so print looks the same, then scaled to fit A4. */}
      <div id="print-card" className="w-[61rem]">
        <JobCard mode="print" values={values} />
      </div>
    </div>,
    document.body,
  );
}
