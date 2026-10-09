"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ClipboardList,
  FilePlus2,
  Layers,
  LogOut,
  Menu,
  PackageOpen,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/auth-actions";

type NavUser = { email: string; name?: string | null; role: Role };
type Tab = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

const TABS: Tab[] = [
  { href: "/jobs/new", label: "Enter Job", icon: FilePlus2, adminOnly: true },
  { href: "/jobs", label: "Job Records", icon: ClipboardList },
  { href: "/paper/press", label: "Paper – 3P", icon: Layers },
  { href: "/paper/client", label: "Paper – Client", icon: PackageOpen },
];
const SETTINGS: Tab = { href: "/settings/users", label: "Settings", icon: Settings, adminOnly: true };

/** The tab whose href is the longest prefix of the current path. */
function activeHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
}

function RoleBadge({ role }: { role: Role }) {
  return role === "ADMIN" ? (
    <Badge className="bg-brand-soft text-primary">Admin</Badge>
  ) : (
    <Badge variant="secondary">Staff</Badge>
  );
}

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  const allTabs = isAdmin ? [...tabs, SETTINGS] : tabs;
  const active = activeHref(pathname, allTabs.map((t) => t.href));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" aria-label="3P Press home" className="rounded-lg">
          <Logo />
        </Link>

        <nav className="hidden h-full flex-1 items-stretch gap-1 md:flex" aria-label="Main">
          {tabs.map((t) => {
            const isActive = active === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent",
                  isActive && "text-primary after:bg-primary hover:text-primary",
                )}
              >
                <t.icon className="size-4" aria-hidden="true" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Account menu" className="gap-2">
                <UserRound />
                <span className="max-w-48 truncate">{user.email}</span>
                <RoleBadge role={user.role} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href={SETTINGS.href}>
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
          <SheetContent side="right" className="w-72">
            <SheetHeader className="border-b">
              <SheetTitle asChild>
                <div>
                  <Logo subtitle="Press Manager" />
                </div>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 pt-2">
                <span className="truncate">{user.email}</span>
                <RoleBadge role={user.role} />
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-3" aria-label="Main">
              {allTabs.map((t) => {
                const isActive = active === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted",
                      isActive && "bg-brand-soft text-primary hover:bg-brand-soft",
                    )}
                  >
                    <t.icon className="size-4" aria-hidden="true" />
                    {t.label}
                  </Link>
                );
              })}
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
