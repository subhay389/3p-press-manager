import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy – 3P Press Manager" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-6 text-muted-foreground">
        <p>
          3P Press Manager is an internal tool used by the staff of 3P printing
          press to record print jobs and paper stock. It is not a public
          service, and only people invited by an administrator can sign in.
        </p>
        <p>
          When you sign in with Google, the app receives your name, email
          address and profile picture. The email address is used only to check
          that you are on the list of authorized users and to record who made
          each change. Nothing else from your Google account is accessed.
        </p>
        <p>
          Your information is stored in the app&apos;s database, is visible only
          to the press&apos;s own staff, and is never sold or shared with third
          parties. To have your access removed, ask a press administrator.
        </p>
      </div>
      <p className="mt-8 text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
