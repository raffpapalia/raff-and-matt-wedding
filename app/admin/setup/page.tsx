import { requireAdminAuth } from '@/lib/adminAuth';

const setupItems = [
  {
    href: '/admin/settings',
    label: 'Wedding Settings',
    description: 'Configure wedding date, venue, RSVP cutoff, and global site settings.',
    accent: 'border-admin-green/30 bg-admin-green/5 hover:bg-admin-green/10',
    badge: 'text-admin-green',
  },
  {
    href: '/admin/faqs',
    label: 'FAQs',
    description: 'Add, edit, and reorder frequently asked questions shown on the invitation page.',
    accent: 'border-admin-sand/20 bg-white hover:bg-admin-bone/40',
    badge: 'text-admin-ink/50',
  },
  {
    href: '/admin/questions',
    label: 'RSVP Questions',
    description: 'Create custom questions that appear on the RSVP form for matching households.',
    accent: 'border-admin-sand/20 bg-white hover:bg-admin-bone/40',
    badge: 'text-admin-ink/50',
  },
];

export default async function AdminSetupPage() {
  await requireAdminAuth();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Setup</h1>
            <p className="mt-2 text-sm text-admin-ink/60">Configure your wedding website settings, FAQs, and RSVP questions.</p>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
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
            className={`group rounded-3xl border p-8 transition ${item.accent}`}
          >
            <p className={`text-xs uppercase tracking-[0.3em] ${item.badge}`}>Configure</p>
            <h2 className="mt-3 text-xl font-semibold text-admin-ink">{item.label}</h2>
            <p className="mt-3 text-sm leading-relaxed text-admin-ink/60">{item.description}</p>
            <p className="mt-6 text-sm font-medium text-admin-green transition group-hover:text-admin-green/80">
              Open →
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
