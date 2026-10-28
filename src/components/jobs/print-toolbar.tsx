"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

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
function fitToPage() {
  const card = document.getElementById("print-card");
  if (!card) return;
  const root = document.documentElement.style;
  const zoom =
    Math.floor(Math.min(1, PAGE_WIDTH_PX / card.offsetWidth, (PAGE_HEIGHT_PX - SAFETY_PX) / card.offsetHeight) * 1000) /
    1000;
  root.setProperty("--print-zoom", String(zoom));
  root.setProperty("--print-height", `${Math.floor((PAGE_HEIGHT_PX - SAFETY_PX) / zoom)}px`);
}

export function PrintToolbar({ jobNo, cancelled }: { jobNo: number; cancelled: boolean }) {
  useEffect(() => {
    let done = false;
    document.fonts.ready.then(() => {
      if (done) return;
      fitToPage();
      window.print();
    });
    return () => {
      done = true;
    };
  }, []);

  return (
    <>
      <style>{`@page { size: A4; margin: 5mm; } @media print { #print-card { zoom: var(--print-zoom, 1); display: flex; flex-direction: column; min-height: var(--print-height, auto); } }`}</style>
      <div className="mx-auto flex w-full max-w-[61rem] flex-wrap items-center gap-2 px-4 py-4 print:hidden sm:px-0">
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs">
            <ArrowLeft /> Job Records
          </Link>
        </Button>
        <p className="mr-auto text-sm text-muted-foreground">
          Job {jobNo}
          {cancelled && <span className="ml-2 font-medium text-destructive">Cancelled</span>}
        </p>
        <Button
          size="sm"
          onClick={() => {
            fitToPage();
            window.print();
          }}
        >
          <Printer /> Print
        </Button>
      </div>
    </>
  );
}
