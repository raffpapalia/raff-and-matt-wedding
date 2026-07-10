import { requireAdminAuth } from '@/lib/adminAuth';
import { getSettings } from '@/lib/supabase';
import { fetchRunsheetData } from '@/lib/runsheetData';
import RunsheetClient from './RunsheetClient';

export default async function AdminRunsheetPage() {
  await requireAdminAuth();

  const [data, settings] = await Promise.all([fetchRunsheetData(), getSettings()]);

  return (
    <RunsheetClient
      initialSections={data.sections}
      initialItems={data.items}
      vendors={data.vendors}
      initialShare={{
        enabled: data.settings?.share_enabled ?? false,
        token: data.settings?.share_token ?? null,
      }}
      weddingDate={settings.wedding_date}
      guestSchedule={settings.wedding_schedule}
    />
  );
}
