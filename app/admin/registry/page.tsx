import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, getSettings, type RegistryFund, type RegistryItem } from '@/lib/supabase';
import CatalogClient from './CatalogClient';

export const revalidate = 0;

export default async function AdminRegistryPage() {
  await requireAdminAuth();

  const [fundsRes, itemsRes, settings] = await Promise.all([
    supabaseServer.from('registry_funds').select('*').order('sort_order', { ascending: true }),
    supabaseServer.from('registry_items').select('*').order('sort_order', { ascending: true }),
    getSettings(),
  ]);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Registry</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Gifts &amp; funds</h1>
            <p className="mt-2 max-w-2xl text-sm text-admin-ink/60">
              Funds take any amount a guest chooses. Items are fixed-price gifts claimed outright. Inactive entries
              are hidden from guests without losing any past orders.
            </p>
          </div>
          <a
            href="/admin/registry/orders"
            className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
          >
            Orders →
          </a>
        </div>
      </div>

      <CatalogClient
        funds={(fundsRes.data ?? []) as RegistryFund[]}
        items={(itemsRes.data ?? []) as RegistryItem[]}
        settings={{
          registry_enabled: settings.registry_enabled,
          registry_hero_eyebrow: settings.registry_hero_eyebrow,
          registry_hero_heading: settings.registry_hero_heading,
          registry_hero_body: settings.registry_hero_body,
          registry_closing_message: settings.registry_closing_message,
          registry_payid: settings.registry_payid,
          registry_payid_name: settings.registry_payid_name,
          registry_payid_instructions: settings.registry_payid_instructions,
          registry_bank_bsb: settings.registry_bank_bsb,
          registry_bank_account_number: settings.registry_bank_account_number,
          registry_bank_account_name: settings.registry_bank_account_name,
          registry_hero_photo_url: settings.registry_hero_photo_url,
          registry_story_heading: settings.registry_story_heading,
          registry_story_body: settings.registry_story_body,
          registry_travel_photos: settings.registry_travel_photos,
        }}
      />
    </div>
  );
}
