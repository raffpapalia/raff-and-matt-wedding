import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseServer, getSettings, type NearbyHotel } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import StayView from './StayView';
import './stay.css';

// Lives under app/invite/[slug]/ so it inherits that layout's font variables, the
// .mr-v4 wrapper and design.css, like the registry. No booking, payment or guest
// data: guests book QT themselves on QT's site.

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Where to stay | Matt & Raff',
};

async function getStayData(slug: string) {
  const [settings, householdRes, hotelsRes] = await Promise.all([
    getSettings(),
    supabaseServer.from('households').select('id').eq('slug', slug).maybeSingle(),
    supabaseServer
      .from('nearby_hotels')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (!householdRes.data) return null;

  if (hotelsRes.error) {
    console.error('[stay:page] nearby_hotels fetch failed', hotelsRes.error);
  }

  return { settings, hotels: (hotelsRes.data ?? []) as NearbyHotel[] };
}

export default async function StayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getStayData(slug);

  if (!data) notFound();

  // stay_page_enabled is the couple's on/off switch, so the page can be built out
  // and reviewed before guests can reach it. Admins keep access either way, using
  // the same cookie the registry and the phase preview gate on.
  if (!data.settings.stay_page_enabled && !(await isAdminAuthenticated())) {
    notFound();
  }

  return <StayView slug={slug} settings={data.settings} hotels={data.hotels} />;
}
