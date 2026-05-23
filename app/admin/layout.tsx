import type { ReactNode } from 'react';

export const metadata = {
  title: 'Wedding Admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#06120B] text-white">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
