/**
 * Safe Cross-Browser Date Formatting Helper
 * 
 * Prevents "RangeError: Invalid time value" in Safari, iOS WebKit, and Firefox
 * when parsing dates or calling toLocaleDateString on unexpected formats.
 */

export function formatSafeDate(
  val: string | number | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-NG', options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

export function formatSafeDateTime(
  val: string | number | Date | undefined | null
): string {
  return formatSafeDate(val, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
