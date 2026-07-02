import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, DEFAULT_SETTINGS } from '@/lib/supabase';
import type { Settings } from '@/lib/supabase';
import SettingsClient from './SettingsClient';

export default async function AdminSettingsPage() {
  await requireAdminAuth();

  const { data } = await supabaseServer.from('settings').select('key, value');
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }
  const settings: Settings = { ...DEFAULT_SETTINGS, ...map } as Settings;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Configuration</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Wedding settings</h1>
          </div>
          <a
            href="/admin/setup"
            className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
          >
            ← Setup
          </a>
        </div>
      </div>
      <SettingsClient initial={settings} />
    </div>
  );
}
