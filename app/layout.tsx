import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitSpace | مدیریت باشگاه",
  description: "مدیریت اعضا، اشتراک‌ها، تمرین و فروش باشگاه در یک فضای یکپارچه",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
