import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import PWAControls from '@/components/pwa-controls';

export const metadata = {
  title: 'Gokulam360 — Sunday School Management',
  description: 'Multi-organization management platform for spiritual education',
  manifest: '/manifest.webmanifest',
  applicationName: 'Gokulam360',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Gokulam360' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport = {
  themeColor: '#ea580c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <PWAControls />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
