import { notFound } from 'next/navigation';
import { supabaseServer, getSettings, type Household } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { householdRef } from '@/lib/registry/beneficiaryRef';
import '../v4/registry.css';
import RegistryClient, { type CatalogFund, type CatalogItem } from './RegistryClient';

// Lives under app/invite/[slug]/ so it inherits that layout's font variables,
// the .mr-v4 wrapper and design.css — the same design system the four phases
// use — while keeping the household slug in the URL for attribution.

export const revalidate = 0;

async function getRegistryData(slug: string) {
  const [settings, householdRes, fundsRes, itemsRes] = await Promise.all([
    getSettings(),
    supabaseServer.from('households').select('*').eq('slug', slug).maybeSingle(),
    supabaseServer
      .from('registry_funds')
      .select('id, name, description, suggested_amounts, category, image_url')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabaseServer
      .from('registry_items')
      .select('id, name, description, price, category, image_url, quantity_available, quantity_claimed')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (!householdRes.data) return null;

  if (fundsRes.error || itemsRes.error) {
    console.error('[registry:page] catalogue fetch failed', fundsRes.error ?? itemsRes.error);
  }

  return {
    settings,
    household: householdRes.data as Household,
    funds: (fundsRes.data ?? []) as CatalogFund[],
    items: (itemsRes.data ?? []) as CatalogItem[],
  };
}

export default async function RegistryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getRegistryData(slug);

  if (!data) notFound();

  // registry_enabled is the couple's on/off switch, so the page can be built out
  // and reviewed before guests can reach it. Admins keep access either way, using
  // the same cookie the /admin routes and the phase preview already gate on.
  if (!data.settings.registry_enabled && !(await isAdminAuthenticated())) {
    notFound();
  }

  return (
    <RegistryClient
      slug={slug}
      householdName={data.household.name}
      // Same opaque ref shape the search endpoint returns, so the panel can
      // treat "me" and "someone else on the list" as one kind of tag.
      householdRef={householdRef(data.household.id)}
      settings={{
        coupleNames: data.settings.couple_names,
        heroEyebrow: data.settings.registry_hero_eyebrow,
        heroHeading: data.settings.registry_hero_heading,
        heroBody: data.settings.registry_hero_body,
        closingMessage: data.settings.registry_closing_message,
        heroPhotoUrl: data.settings.couple_photo_url || '',
        payidConfigured: Boolean(data.settings.registry_payid),
      }}
      funds={data.funds}
      items={data.items}
      isPreview={!data.settings.registry_enabled}
    />
  );
}
