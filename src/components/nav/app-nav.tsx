"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Settings, UserRound } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/auth-actions";

type NavUser = { email: string; name?: string | null; role: Role };

const TABS = [
  { href: "/jobs/new", label: "Enter Job", adminOnly: true },
  { href: "/jobs", label: "Job Records" },
  { href: "/paper/press", label: "Paper – 3P" },
  { href: "/paper/client", label: "Paper – Client" },
  { href: "/settings/users", label: "Settings", adminOnly: true, settings: true },
];

/** The tab whose href is the longest prefix of the current path. */
function activeHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
}

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  const mainTabs = tabs.filter((t) => !t.settings);
  const active = activeHref(pathname, tabs.map((t) => t.href));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          3P Press
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
          {mainTabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active === t.href ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active === t.href && "bg-muted text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Account menu">
                <UserRound />
                <span className="max-w-48 truncate">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm">{user.email}</div>
                <div className="text-xs text-muted-foreground">
                  {isAdmin ? "Admin" : "Staff"}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/settings/users">
                    <Settings /> Settings
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => signOutAction()}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>3P Press</SheetTitle>
              <p className="truncate text-sm text-muted-foreground">
                {user.email} · {isAdmin ? "Admin" : "Staff"}
              </p>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Main">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  aria-current={active === t.href ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
                    active === t.href && "bg-muted",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t p-4">
              <Button variant="outline" className="w-full" onClick={() => signOutAction()}>
                <LogOut /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
