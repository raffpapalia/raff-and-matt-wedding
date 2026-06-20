const MERGE_TAG_PATTERN = /\{\{(\w+)\}\}/g;

export function resolveMergeTags(text: string, values: Record<string, string>): string {
  return text.replace(MERGE_TAG_PATTERN, (_match, key: string) => values[key] ?? '');
}
