import { requireAdminAuth } from '@/lib/adminAuth';

const setupItems = [
  {
    href: '/admin/settings',
    label: 'Wedding Settings',
    description: 'Configure wedding date, venue, RSVP cutoff, and global site settings.',
    accent: 'border-emerald-400/20 bg-emerald-400/5 hover:bg-emerald-400/10',
    badge: 'text-emerald-300/80',
  },
  {
    href: '/admin/faqs',
    label: 'FAQs',
    description: 'Add, edit, and reorder frequently asked questions shown on the invitation page.',
    accent: 'border-white/10 bg-white/5 hover:bg-white/10',
    badge: 'text-emerald-200/70',
  },
  {
    href: '/admin/questions',
    label: 'RSVP Questions',
    description: 'Create custom questions that appear on the RSVP form for matching households.',
    accent: 'border-white/10 bg-white/5 hover:bg-white/10',
    badge: 'text-emerald-200/70',
  },
];

export default async function AdminSetupPage() {
  await requireAdminAuth();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Setup</h1>
            <p className="mt-2 text-sm text-slate-400">Configure your wedding website settings, FAQs, and RSVP questions.</p>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            ← Dashboard
          </a>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {setupItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`group rounded-3xl border p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl transition ${item.accent}`}
          >
            <p className={`text-xs uppercase tracking-[0.3em] ${item.badge}`}>Configure</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{item.label}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.description}</p>
            <p className="mt-6 text-sm font-medium text-amber-300 transition group-hover:text-amber-200">
              Open →
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
