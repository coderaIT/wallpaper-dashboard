import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { ConfirmProvider, ToastProvider } from "@/components/feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "استوديو الخلفيات",
  description: "لوحة إدارة محتوى الخلفيات",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
