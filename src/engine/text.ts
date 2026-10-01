/** Split text into Unicode code points so surrogate-pair emoji count as one character. */
export function toCharacters(value: string): string[] {
  return Array.from(value);
}

/** Return the number of Unicode code points in a string. */
export function characterCount(value: string): number {
  return toCharacters(value).length;
}

/** Remove the final Unicode code point without splitting surrogate pairs. */
export function removeLastCharacter(value: string): string {
  return toCharacters(value).slice(0, -1).join("");
}

/** Determine whether a value is one printable, non-whitespace Unicode code point. */
export function isPrintableCharacter(value: string): boolean {
  return (
    toCharacters(value).length === 1 && !/[\s\u0000-\u001f\u007f]/u.test(value)
  );
}
