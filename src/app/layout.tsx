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
  title: "Cubeark API Dynamic — Workflow Automation Platform",
  description: "Build powerful workflow automations with a visual node-based editor. HTTP requests, code execution, webhooks and more. cubeark.dev",
  keywords: ["Cubeark", "API", "Workflow", "Automation", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
  authors: [{ name: "Cubeark Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Cubeark API Dynamic",
    description: "Workflow automation with a visual node-based editor",
    siteName: "Cubeark API Dynamic",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cubeark API Dynamic",
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
