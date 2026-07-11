'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

const STORAGE_KEY = 'admin-sidebar-collapsed';
const EXPANDED_W = 'w-[220px]';
const COLLAPSED_W = 'w-16';
// Sidebar (and its content padding) only exist at lg+; phones get the top bar
// + bottom tab bar instead.
const EXPANDED_PAD = 'lg:pl-[220px]';
const COLLAPSED_PAD = 'lg:pl-16';

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
  { href: '/admin/budget', label: 'Budget', icon: Wallet },
  { href: '/admin/runsheet', label: 'Run sheet', icon: CalendarClock },
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

// Bottom tab bar fits five tabs comfortably; the rest live in the "More" sheet.
const MOBILE_PRIMARY = NAV_ITEMS.filter((i) => i.label !== 'Responses' && i.label !== 'Setup');
const MOBILE_MORE = NAV_ITEMS.filter((i) => i.label === 'Responses' || i.label === 'Setup');

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
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const moreActive = MOBILE_MORE.some((item) => isActive(pathname, item));

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
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-admin-ink transition-[width] duration-200 lg:flex ${
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

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-admin-ink px-4 py-3 lg:hidden">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-admin-bone/50">Admin</p>
          <p className="text-sm font-semibold text-admin-bone">Wedding dashboard</p>
        </div>
        <form action="/admin/logout" method="post">
          <button
            type="submit"
            title="Log out"
            className="rounded-lg p-2 text-admin-bone/60 transition hover:bg-white/5 hover:text-admin-bone"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </header>

      <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? COLLAPSED_PAD : EXPANDED_PAD}`}>
        <main className="min-h-screen bg-admin-bone text-admin-ink">
          <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-10 lg:pb-10">{children}</div>
        </main>
      </div>

      {/* ── Mobile "More" sheet ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-admin-ink pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 shadow-2xl shadow-black/60">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-admin-bone/20" />
            {MOBILE_MORE.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3.5 text-sm ${
                    isActive(pathname, item) ? 'text-admin-persimmon' : 'text-admin-bone/80'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <form action="/admin/logout" method="post" className="border-t border-white/10">
              <button type="submit" className="flex w-full items-center gap-3 px-6 py-3.5 text-sm text-admin-bone/80">
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/10 bg-admin-ink pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
                active && !moreOpen ? 'text-admin-persimmon' : 'text-admin-bone/55'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            moreOpen || moreActive ? 'text-admin-persimmon' : 'text-admin-bone/55'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>
    </div>
  );
}
