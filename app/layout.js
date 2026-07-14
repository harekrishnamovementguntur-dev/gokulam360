import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Gokulam360 — Sunday School Management',
  description: 'Multi-organization management platform for spiritual education',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
