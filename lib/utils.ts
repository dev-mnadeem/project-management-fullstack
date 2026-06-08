type ClassValue = string | number | null | undefined | false;

/** Join class names, dropping anything falsy. Deliberately not a Tailwind
 *  conflict resolver - components take a `className` that is appended last, and
 *  the later utility wins in the generated stylesheet. */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter((value): value is string | number => Boolean(value)).join(' ');
}
