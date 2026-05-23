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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Configuration</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Wedding settings</h1>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            ← Dashboard
          </a>
        </div>
      </div>
      <SettingsClient initial={settings} />
    </div>
  );
}
