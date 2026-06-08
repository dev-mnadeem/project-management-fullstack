import { idParam } from '../schemas/common';

/** App Router route context: params are a promise in Next 15. */
export interface RouteContext<T extends Record<string, string>> {
  params: Promise<T>;
}

export async function numericId(context: RouteContext<{ id: string }>): Promise<number> {
  const { id } = await context.params;
  return idParam.parse(id);
}

export function searchParamsToObject(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== '') result[key] = value;
  }
  return result;
}
