import { supabaseServer } from './supabase';
import type { BudgetItem, RunsheetItem, RunsheetSection, RunsheetSettings } from './supabase';

export type RunsheetVendor = Pick<
  BudgetItem,
  'id' | 'supplier_name' | 'category' | 'contact_name' | 'contact_phone'
>;

export interface RunsheetData {
  sections: RunsheetSection[];
  items: RunsheetItem[];
  vendors: RunsheetVendor[];
  settings: RunsheetSettings | null;
  // Max updated_at across items — the "version" stamp shown on views/exports.
  versionDate: string | null;
}

// Single server-side fetch shared by the admin page, the public share view,
// and both export routes. Service-role client — the runsheet tables have no
// anon policies.
export async function fetchRunsheetData(): Promise<RunsheetData> {
  const [sectionsRes, itemsRes, vendorsRes, settingsRes] = await Promise.all([
    supabaseServer.from('runsheet_sections').select('*'),
    supabaseServer.from('runsheet_items').select('*'),
    supabaseServer
      .from('budget_items')
      .select('id, supplier_name, category, contact_name, contact_phone')
      .order('supplier_name'),
    supabaseServer.from('runsheet_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  const items = (itemsRes.data ?? []) as RunsheetItem[];
  const versionDate = items.reduce<string | null>(
    (max, i) => (max === null || i.updated_at > max ? i.updated_at : max),
    null
  );

  return {
    sections: (sectionsRes.data ?? []) as RunsheetSection[],
    items,
    vendors: (vendorsRes.data ?? []) as RunsheetVendor[],
    settings: (settingsRes.data as RunsheetSettings | null) ?? null,
    versionDate,
  };
}

// Vendors that appear on at least one run sheet item — the "key contacts" list.
export function usedVendors(data: Pick<RunsheetData, 'items' | 'vendors'>): RunsheetVendor[] {
  const used = new Set(data.items.flatMap(i => i.vendor_ids));
  return data.vendors.filter(v => used.has(v.id));
}
