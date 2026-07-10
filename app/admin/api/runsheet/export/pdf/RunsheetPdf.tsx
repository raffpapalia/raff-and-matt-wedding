import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { RunsheetItem, RunsheetSection } from '@/lib/supabase';
import type { RunsheetVendor } from '@/lib/runsheetData';
import { fmtDay, fmtTimeRange, groupByDay, sortItems } from '@/lib/runsheet';

// A4 vendor-facing run sheet. Built-in Helvetica only — no font registration.

const INK = '#0B2118';
const GREEN = '#0F7A52';
const MUTED = '#5C6B62';
const RULE = '#D8D2C4';
const BONE = '#F6EEDD';

const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 48, paddingHorizontal: 46, fontFamily: 'Helvetica', fontSize: 9.5, color: INK },
  header: { marginBottom: 18 },
  eyebrow: { fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase', color: GREEN, marginBottom: 4 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 4 },
  contactsBox: { backgroundColor: BONE, borderRadius: 6, padding: 10, marginBottom: 16 },
  contactsTitle: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GREEN, marginBottom: 6 },
  contactRow: { flexDirection: 'row', marginBottom: 3 },
  contactName: { width: '38%', fontFamily: 'Helvetica-Bold' },
  contactRole: { width: '30%', color: MUTED },
  contactPhone: { width: '32%' },
  dayHeader: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 8, color: INK },
  section: { marginBottom: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INK,
    color: BONE,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 5 },
  timeCell: { width: '20%', paddingRight: 8 },
  time: { fontFamily: 'Helvetica-Bold', color: GREEN },
  bodyCell: { width: '58%', paddingRight: 8 },
  itemTitle: { fontFamily: 'Helvetica-Bold' },
  itemDesc: { color: MUTED, marginTop: 1.5 },
  metaCell: { width: '22%' },
  metaLine: { color: MUTED, marginBottom: 1.5 },
  metaStrong: { color: INK },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 46,
    right: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: MUTED,
  },
});

export interface RunsheetPdfProps {
  coupleNames: string;
  versionLabel: string;
  sections: RunsheetSection[];
  items: RunsheetItem[];
  contacts: RunsheetVendor[];
  vendorNameById: Map<string, string>;
}

export function RunsheetPdf({ coupleNames, versionLabel, sections, items, contacts, vendorNameById }: RunsheetPdfProps) {
  const days = groupByDay(sections);
  const itemsBySection = new Map<string, RunsheetItem[]>();
  for (const item of items) {
    const list = itemsBySection.get(item.section_id) ?? [];
    list.push(item);
    itemsBySection.set(item.section_id, list);
  }

  return (
    <Document title={`${coupleNames} — Wedding Run Sheet`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Wedding Run Sheet</Text>
          <Text style={styles.title}>{coupleNames}</Text>
          <Text style={styles.meta}>{versionLabel}</Text>
        </View>

        {contacts.length > 0 && (
          <View style={styles.contactsBox}>
            <Text style={styles.contactsTitle}>Key contacts</Text>
            {contacts.map(v => (
              <View key={v.id} style={styles.contactRow}>
                <Text style={styles.contactName}>{v.supplier_name}</Text>
                <Text style={styles.contactRole}>
                  {v.category}
                  {v.contact_name ? ` — ${v.contact_name}` : ''}
                </Text>
                <Text style={styles.contactPhone}>{v.contact_phone ?? ''}</Text>
              </View>
            ))}
          </View>
        )}

        {days.map(day => (
          <View key={day.day ?? 'none'}>
            <Text style={styles.dayHeader}>{fmtDay(day.day)}</Text>
            {day.sections.map(section => {
              const sectionItems = sortItems(itemsBySection.get(section.id) ?? []);
              return (
                <View key={section.id} style={styles.section}>
                  <View style={styles.sectionHeader} wrap={false}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  {sectionItems.map(item => {
                    const vendorNames = item.vendor_ids
                      .map(id => vendorNameById.get(id))
                      .filter((n): n is string => !!n);
                    return (
                      <View key={item.id} style={styles.itemRow} wrap={false}>
                        <View style={styles.timeCell}>
                          <Text style={styles.time}>{fmtTimeRange(item.start_time, item.end_time) || '—'}</Text>
                        </View>
                        <View style={styles.bodyCell}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          {item.description && <Text style={styles.itemDesc}>{item.description}</Text>}
                        </View>
                        <View style={styles.metaCell}>
                          {item.location && (
                            <Text style={styles.metaLine}>
                              <Text style={styles.metaStrong}>Where </Text>
                              {item.location}
                            </Text>
                          )}
                          {item.owner && (
                            <Text style={styles.metaLine}>
                              <Text style={styles.metaStrong}>Who </Text>
                              {item.owner}
                            </Text>
                          )}
                          {vendorNames.length > 0 && (
                            <Text style={styles.metaLine}>
                              <Text style={styles.metaStrong}>Vendors </Text>
                              {vendorNames.join(', ')}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{coupleNames} — Wedding Run Sheet</Text>
          <Text render={({ pageNumber, totalPages }) => `${versionLabel} · Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
