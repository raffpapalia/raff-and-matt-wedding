import type { ReactNode } from 'react';
import { Geist_Mono, Bebas_Neue } from 'next/font/google';

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

export const metadata = {
  title: 'Wedding Admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${geistMono.variable} ${bebasNeue.variable} min-h-screen bg-[#06120B] text-white`}>
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
