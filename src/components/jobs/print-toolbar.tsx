"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// A4 content box at 96 dpi with 8mm margins: 194mm × 281mm.
const PAGE_HEIGHT_PX = (281 / 25.4) * 96;

/** Shrinks the card to fit one A4 page if needed, then opens the print dialog. */
function fitToPage() {
  const card = document.getElementById("print-card");
  if (!card) return;
  const zoom = Math.min(1, PAGE_HEIGHT_PX / card.offsetHeight);
  document.documentElement.style.setProperty("--print-zoom", String(Math.floor(zoom * 1000) / 1000));
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
      <style>{`@page { size: A4; margin: 8mm; } @media print { #print-card { zoom: var(--print-zoom, 1); } }`}</style>
      <div className="mx-auto flex w-full max-w-[194mm] flex-wrap items-center gap-2 px-4 py-4 print:hidden sm:px-0">
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
