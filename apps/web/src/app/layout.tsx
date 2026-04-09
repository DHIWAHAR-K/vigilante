import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DesktopShell } from "@/components/desktop/DesktopShell";

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
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <DesktopShell>{children}</DesktopShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
