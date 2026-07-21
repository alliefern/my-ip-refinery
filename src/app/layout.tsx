import type { Metadata } from "next";
import { brand, isDemoMode } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {isDemoMode() && (
          <div
            role="status"
            className="bg-warn-soft text-warn border-line border-b px-4 py-1.5 text-center text-xs font-medium tracking-wide"
          >
            Demo mode — you are exploring a seeded example project. Connect
            Supabase and OpenAI to process real trainings.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
