import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Bebas_Neue } from 'next/font/google';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import AdminSidebarShell from './components/AdminSidebar';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas-neue',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wedding Admin',
  manifest: '/manifest.json',
  icons: { apple: '/icon.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Wedding Admin',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B2118',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // No sidebar on the pre-auth login screen — it only renders once signed in.
  const authed = await isAdminAuthenticated();

  return (
    <div className={`${geistMono.variable} ${bebasNeue.variable} admin-light min-h-screen bg-admin-ink text-white`}>
      {authed ? (
        <AdminSidebarShell>{children}</AdminSidebarShell>
      ) : (
        <div className="mx-auto min-h-screen max-w-7xl bg-admin-bone px-4 py-10 text-admin-ink sm:px-6 lg:px-8">
          {children}
        </div>
      )}
    </div>
  );
}
