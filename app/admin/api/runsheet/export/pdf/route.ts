import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { getSettings } from '@/lib/supabase';
import { fetchRunsheetData, usedVendors } from '@/lib/runsheetData';
import { RunsheetPdf } from './RunsheetPdf';

// @react-pdf/renderer needs the Node runtime (streams, Buffer).
export const runtime = 'nodejs';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [data, settings] = await Promise.all([fetchRunsheetData(), getSettings()]);

  const versionLabel = `Version ${new Date(data.versionDate ?? Date.now()).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const vendorNameById = new Map(data.vendors.map(v => [v.id, v.supplier_name]));

  // RunsheetPdf returns the <Document> element; calling it directly keeps the
  // DocumentProps element type renderToBuffer expects.
  const buffer = await renderToBuffer(
    RunsheetPdf({
      coupleNames: settings.couple_names,
      versionLabel,
      sections: data.sections,
      items: data.items,
      contacts: usedVendors(data),
      vendorNameById,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="run-sheet-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
