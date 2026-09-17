import type { Metadata } from "next";
import { Crimson_Text, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const crimson = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibm = IBM_Plex_Mono({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PAMSA: Double Materiality and Pricing",
  description:
    "Shared team workspace for double materiality assessments, undisclosed-issue discovery, and pricing models you can defend.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${crimson.variable} ${inter.variable} ${ibm.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cloud text-charcoal">{children}</body>
    </html>
  );
}
