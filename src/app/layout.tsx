import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EZ-ACE",
  description: "Private classes, PDFs, and practice exams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
