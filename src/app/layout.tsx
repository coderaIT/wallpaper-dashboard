import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ConfirmProvider, ToastProvider } from "@/components/feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallpaper Studio",
  description: "Wallpaper content admin",
  robots: { index: false, follow: false },
};

const localeBoot = `(function(){try{var l=localStorage.getItem("dashboard_locale")||"";var n=(navigator.language||"en").slice(0,2).toLowerCase();var c=l==="ar"||l==="tr"||l==="en"?l:(n==="ar"||n==="tr"||n==="en"?n:"en");document.documentElement.lang=c;document.documentElement.dir=c==="ar"?"rtl":"ltr";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeBoot }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>{children}</AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
