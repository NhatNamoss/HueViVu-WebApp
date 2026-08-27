import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HueViVu — AI Travel Companion',
  description: 'Khám phá Huế cùng AI Travel Companion. Lên kế hoạch thông minh, khám phá di sản, trải nghiệm ẩm thực cố đô.',
  keywords: 'Huế, du lịch Huế, HueViVu, AI travel, lịch trình Huế',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#FF7F6B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
