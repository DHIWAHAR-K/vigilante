import type { Metadata } from "next";
import { Geist_Mono, Gentium_Book_Plus } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { RuntimeProvider } from "@/components/providers/RuntimeProvider";

const gentium = Gentium_Book_Plus({
  weight: ["400", "700"],
  variable: "--font-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vigilante",
  description: "Ask anything. Own everything.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${gentium.variable} ${geistMono.variable} antialiased font-serif`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RuntimeProvider>
            <AppShell>
              {children}
            </AppShell>
          </RuntimeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
