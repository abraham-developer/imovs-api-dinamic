import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iMOVS API Dinamic - Workflow Automation Platform",
  description: "Modern workflow automation platform. Build powerful integrations with a visual node-based editor. Powered by iMOVS API Dinamic.",
  keywords: ["iMOVS", "API", "Workflow", "Automation", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
  authors: [{ name: "iMOVS Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "iMOVS API Dinamic",
    description: "Workflow automation with a visual node-based editor",
    siteName: "iMOVS API Dinamic",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "iMOVS API Dinamic",
    description: "Workflow automation with a visual node-based editor",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
