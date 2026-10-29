import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';
import type { NearbyHotel } from '@/lib/supabase';
import HotelsClient from './HotelsClient';

export default async function AdminHotelsPage() {
  await requireAdminAuth();

  const { data } = await supabaseServer
    .from('nearby_hotels')
    .select('*')
    .order('display_order', { ascending: true });

  const hotels = (data ?? []) as NearbyHotel[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Where to stay</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Nearby hotels</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              Drag to reorder. Active hotels appear on the stay page, numbered in this order. The page itself is switched on in Settings.
            </p>
          </div>
          <a
            href="/admin/setup"
            className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
          >
            ← Setup
          </a>
        </div>
      </div>
      <HotelsClient hotels={hotels} />
    </div>
  );
}
