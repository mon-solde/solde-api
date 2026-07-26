const UNICODE_ACCENT_MARKS_RANGE_START = 0x0300;
const UNICODE_ACCENT_MARKS_RANGE_END = 0x036f;
const EXTRA_SPACES = /\s+/g;

function removeAccents(text: string): string {
  const decomposed = text.normalize('NFD');
  let result = '';
  for (const char of decomposed) {
    const code = char.codePointAt(0) ?? 0;
    const isAccentMark =
      code >= UNICODE_ACCENT_MARKS_RANGE_START &&
      code <= UNICODE_ACCENT_MARKS_RANGE_END;
    if (!isAccentMark) result += char;
  }
  return result;
}

export function normalizeFullName(firstName: string, lastName?: string): string {
  const fullName = `${firstName} ${lastName ?? ''}`;
  return removeAccents(fullName.trim().toLowerCase()).replace(
    EXTRA_SPACES,
    ' ',
  );
}
