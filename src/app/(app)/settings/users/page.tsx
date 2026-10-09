import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AddUserDialog } from "@/components/users/add-user-dialog";
import { UserList } from "@/components/users/user-list";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await db.allowedUser.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, role: true },
  });

  return (
    <>
      <PageHeader
        title="Users"
        description="Only the people listed here can sign in. Admins can add and edit everything; staff can only view."
        actions={<AddUserDialog />}
      />
      <UserList users={users} currentEmail={me.email!.toLowerCase()} />
    </>
  );
}
