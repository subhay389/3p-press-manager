import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { role: Role } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    roleCheckedAt?: number;
  }
}

// How often a signed-in user's allowlist entry is re-checked.
const ROLE_RECHECK_MS = 5 * 60 * 1000;

async function findAllowedUser(email: string | null | undefined) {
  if (!email) return null;
  return db.allowedUser.findUnique({ where: { email: email.toLowerCase() } });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Only verified Google accounts that are on the allowlist may sign in.
    async signIn({ profile }) {
      if (!profile?.email_verified) return false;
      return (await findAllowedUser(profile.email)) !== null;
    },
    async jwt({ token, user }) {
      const stale =
        !token.roleCheckedAt || Date.now() - token.roleCheckedAt > ROLE_RECHECK_MS;
      if (user || stale) {
        const allowed = await findAllowedUser(token.email);
        if (!allowed) return null; // removed from allowlist → signed out
        token.role = allowed.role;
        token.roleCheckedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role ?? "STAFF";
      return session;
    },
  },
});

/** For pages/layouts: returns the signed-in user or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return session.user;
}

/**
 * For admin-only pages: re-checks the role in the DB (not just the session
 * token) and sends non-admins to Job Records.
 */
export async function requireAdmin() {
  const user = await requireUser();
  const allowed = await findAllowedUser(user.email);
  if (allowed?.role !== "ADMIN") redirect("/jobs");
  return user;
}
