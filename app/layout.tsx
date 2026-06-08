import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import QueryProvider from '@/components/QueryProvider';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});
const plexMono = IBM_Plex_Mono({ variable: '--font-plex-mono', subsets: ['latin'], weight: ['400'] });

export const metadata: Metadata = {
  title: 'Project Dashboard',
  description:
    'Track projects and tasks, see where the remaining work sits, and get a delivery-risk brief per project.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable} min-h-screen antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
