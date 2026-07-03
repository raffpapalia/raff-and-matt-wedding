const MERGE_TAG_PATTERN = /\{\{(\w+)\}\}/g;

// Keys in `preserveKeys` are left exactly as written (e.g. "{{cta_button}}") instead
// of being blanked out for having no entry in `values` — used for tokens that have
// special meaning to a caller (like a button placeholder) but aren't real merge data.
export function resolveMergeTags(
  text: string,
  values: Record<string, string>,
  preserveKeys: string[] = []
): string {
  return text.replace(MERGE_TAG_PATTERN, (match, key: string) =>
    preserveKeys.includes(key) ? match : values[key] ?? ''
  );
}
