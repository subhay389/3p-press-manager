import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StagingBanner } from "@/components/staging-banner";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "3P Press Manager", template: "%s · 3P Press" },
  description: "Job and paper stock records for 3P press",
  // Home-screen name on iPhone (otherwise it uses the page title).
  applicationName: "3P",
  // Opens full screen from the iPhone home screen. iOS reads this only when the
  // icon is added, so phones re-add their icon after a change here.
  appleWebApp: { title: "3P", capable: true, statusBarStyle: "default" },
};

// White, like the header, so the phone's status bar blends into it.
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <StagingBanner />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
