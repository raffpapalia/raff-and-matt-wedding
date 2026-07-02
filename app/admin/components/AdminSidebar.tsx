'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings,
  Users,
} from 'lucide-react';

const STORAGE_KEY = 'admin-sidebar-collapsed';
const EXPANDED_W = 'w-[220px]';
const COLLAPSED_W = 'w-16';
const EXPANDED_PAD = 'pl-[220px]';
const COLLAPSED_PAD = 'pl-16';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  // Extra route prefixes that should light this item up (Setup's child pages
  // live at /admin/settings, /admin/faqs, /admin/questions — not under /admin/setup).
  alsoMatches?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/guests', label: 'Guests', icon: Users },
  { href: '/admin/comms', label: 'Comms', icon: Send },
  { href: '/admin/responses', label: 'Responses', icon: ClipboardList },
  {
    href: '/admin/setup',
    label: 'Setup',
    icon: Settings,
    alsoMatches: ['/admin/settings', '/admin/faqs', '/admin/questions'],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  const prefixes = [item.href, ...(item.alsoMatches ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function itemClass(active: boolean, collapsed: boolean): string {
  const base = `flex w-full items-center gap-3 border-l-[3px] py-2.5 text-sm transition ${
    collapsed ? 'justify-center px-0' : 'px-4'
  }`;
  return active
    ? `${base} border-admin-persimmon bg-admin-persimmon/10 text-admin-bone`
    : `${base} border-transparent text-admin-bone/60 hover:bg-white/5 hover:text-admin-bone`;
}

// Approach (a): one client wrapper owns the collapsed state and renders both the
// fixed sidebar and the margin-adjusted content area, so the server layout stays simple.
export default function AdminSidebarShell({ children }: { children: ReactNode }) {
  // Default expanded on first server render; sync from localStorage after mount
  // (never during render) to avoid an SSR/hydration mismatch.
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      window.localStorage.setItem(STORAGE_KEY, String(!current));
      return !current;
    });
  }

  return (
    <div className="min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-admin-ink transition-[width] duration-200 ${
          collapsed ? COLLAPSED_W : EXPANDED_W
        }`}
      >
        <div className={`flex items-center gap-2 py-4 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-admin-bone/50">Admin</p>
              <p className="mt-1 truncate text-sm font-semibold text-admin-bone">Wedding dashboard</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="shrink-0 rounded-lg p-1.5 text-admin-bone/60 transition hover:bg-white/5 hover:text-admin-bone"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={itemClass(active, collapsed)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <form action="/admin/logout" method="post" className="border-t border-white/10 py-3">
          <button type="submit" title={collapsed ? 'Log out' : undefined} className={itemClass(false, collapsed)}>
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </form>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? COLLAPSED_PAD : EXPANDED_PAD}`}>
        <main className="min-h-screen bg-admin-bone text-admin-ink">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
