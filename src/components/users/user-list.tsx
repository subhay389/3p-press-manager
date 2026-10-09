"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/generated/prisma/enums";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleSelect } from "@/components/users/role-select";
import { removeUser, setUserRole, type ActionResult } from "@/server/users";

type User = { id: string; email: string; name: string | null; role: Role };

export function UserList({ users, currentEmail }: { users: User[]; currentEmail: string }) {
  const admins = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
        <span>
          {users.length} {users.length === 1 ? "person" : "people"} · {admins}{" "}
          {admins === 1 ? "admin" : "admins"}
        </span>
        <span className="hidden sm:inline">Role</span>
      </div>
      <ul className="divide-y">
        {users.map((u) => (
          <UserRow key={u.id} user={u} isMe={u.email === currentEmail} />
        ))}
      </ul>
    </div>
  );
}

function UserRow({ user, isMe }: { user: User; isMe: boolean }) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-primary"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{user.name ?? user.email}</span>
            {isMe && <Badge variant="outline">You</Badge>}
          </div>
          {user.name && (
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pl-12 sm:pl-0">
        <RoleSelect
          value={user.role}
          onChange={(role) => run(() => setUserRole(user.id, role))}
          disabled={isMe || pending}
          className="w-28"
          aria-label={`Role for ${user.email}`}
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isMe || pending}
              aria-label={`Remove ${user.email}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {user.name ?? user.email}?</AlertDialogTitle>
              <AlertDialogDescription>
                {user.email} will no longer be able to sign in. If they are signed in
                right now, they will be signed out within 5 minutes. You can add
                them again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => run(() => removeUser(user.id))}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
