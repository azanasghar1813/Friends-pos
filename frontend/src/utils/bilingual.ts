/**
 * Splits a bilingual dish/product name into separate English and Urdu components.
 * Example: "فریش اسپیشل بیف کڑاہی (Fresh Special Beef Karahi)"
 * => { english: "Fresh Special Beef Karahi", urdu: "فریش اسپیشل بیف کڑاہی" }
 */
export interface BilingualName {
  english: string;
  urdu: string;
  primary: string;
}

export function splitBilingualName(rawName: string | null | undefined): BilingualName {
  if (!rawName) return { english: '', urdu: '', primary: '' };
  const str = String(rawName).trim();

  // Pattern 1: Urdu (English) OR English (Urdu)
  const matchParentheses = str.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (matchParentheses) {
    const part1 = matchParentheses[1].trim();
    const part2 = matchParentheses[2].trim();
    const part1HasUrdu = /[\u0600-\u06FF]/.test(part1);
    const part2HasUrdu = /[\u0600-\u06FF]/.test(part2);

    if (part1HasUrdu && !part2HasUrdu) {
      return { english: part2, urdu: part1, primary: part2 };
    }
    if (!part1HasUrdu && part2HasUrdu) {
      return { english: part1, urdu: part2, primary: part1 };
    }
    // Both or neither: part1 as primary
    return { english: part1, urdu: part2, primary: part1 };
  }

  // Pattern 2: Separated by "/" or "|"
  const parts = str.split(/\s*[/|]\s*/);
  if (parts.length === 2) {
    const p0HasUrdu = /[\u0600-\u06FF]/.test(parts[0]);
    const p1HasUrdu = /[\u0600-\u06FF]/.test(parts[1]);
    if (p0HasUrdu && !p1HasUrdu) return { english: parts[1], urdu: parts[0], primary: parts[1] };
    if (!p0HasUrdu && p1HasUrdu) return { english: parts[0], urdu: parts[1], primary: parts[0] };
  }

  // Pattern 3: Separated by " - " where one part has Urdu
  const dashParts = str.split(/\s+-\s+/);
  if (dashParts.length === 2) {
    const d0HasUrdu = /[\u0600-\u06FF]/.test(dashParts[0]);
    const d1HasUrdu = /[\u0600-\u06FF]/.test(dashParts[1]);
    if (d0HasUrdu && !d1HasUrdu) return { english: dashParts[1], urdu: dashParts[0], primary: dashParts[1] };
    if (!d0HasUrdu && d1HasUrdu) return { english: dashParts[0], urdu: dashParts[1], primary: dashParts[0] };
  }

  // Only Urdu
  if (/[\u0600-\u06FF]/.test(str) && !/[a-zA-Z]/.test(str)) {
    return { english: '', urdu: str, primary: str };
  }

  // Only English or default
  return { english: str, urdu: '', primary: str };
}

export function formatBilingual(rawName: string | null | undefined): string {
  const { english, urdu, primary } = splitBilingualName(rawName);
  if (english && urdu) {
    return `${english} (${urdu})`;
  }
  return primary;
}
