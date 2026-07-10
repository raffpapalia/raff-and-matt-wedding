import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { getSettings } from '@/lib/supabase';
import { fetchRunsheetData, usedVendors } from '@/lib/runsheetData';
import { fmtDay, fmtTime, groupByDay, sortItems } from '@/lib/runsheet';

export const runtime = 'nodejs';

const INK = 'FF0B2118';
const BONE = 'FFF6EEDD';
const GREEN = 'FF0F7A52';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [data, settings] = await Promise.all([fetchRunsheetData(), getSettings()]);
  const vendorNameById = new Map(data.vendors.map(v => [v.id, v.supplier_name]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.couple_names;
  workbook.created = new Date();

  // ── Sheet 1: the run sheet ──
  const sheet = workbook.addWorksheet('Run sheet', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [
    { header: 'Day', key: 'day', width: 24 },
    { header: 'Section', key: 'section', width: 20 },
    { header: 'Start', key: 'start', width: 10 },
    { header: 'End', key: 'end', width: 10 },
    { header: 'Item', key: 'title', width: 34 },
    { header: 'Description', key: 'description', width: 46 },
    { header: 'Location', key: 'location', width: 22 },
    { header: 'Who', key: 'owner', width: 18 },
    { header: 'Vendors', key: 'vendors', width: 28 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: BONE } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const itemsBySection = new Map<string, typeof data.items>();
  for (const item of data.items) {
    const list = itemsBySection.get(item.section_id) ?? [];
    list.push(item);
    itemsBySection.set(item.section_id, list);
  }

  for (const day of groupByDay(data.sections)) {
    for (const section of day.sections) {
      // Section divider row — bold on a bone fill.
      const divider = sheet.addRow({ day: fmtDay(day.day), section: section.title });
      divider.font = { bold: true, color: { argb: GREEN } };
      divider.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BONE } };

      for (const item of sortItems(itemsBySection.get(section.id) ?? [])) {
        sheet.addRow({
          day: fmtDay(day.day),
          section: section.title,
          start: fmtTime(item.start_time),
          end: fmtTime(item.end_time),
          title: item.title,
          description: item.description ?? '',
          location: item.location ?? '',
          owner: item.owner ?? '',
          vendors: item.vendor_ids
            .map(id => vendorNameById.get(id))
            .filter(Boolean)
            .join(', '),
        });
      }
    }
  }

  // ── Sheet 2: vendor contacts ──
  const contactsSheet = workbook.addWorksheet('Contacts');
  contactsSheet.columns = [
    { header: 'Vendor', key: 'vendor', width: 30 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Contact', key: 'contact', width: 24 },
    { header: 'Phone', key: 'phone', width: 20 },
  ];
  const contactsHeader = contactsSheet.getRow(1);
  contactsHeader.font = { bold: true, color: { argb: BONE } };
  contactsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };

  for (const v of usedVendors(data)) {
    contactsSheet.addRow({
      vendor: v.supplier_name,
      category: v.category,
      contact: v.contact_name ?? '',
      phone: v.contact_phone ?? '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="run-sheet-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
