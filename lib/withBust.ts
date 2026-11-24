import { revalidateTag } from "next/cache";

/**
 * Wrap a mutating API handler (POST/PATCH/PUT/DELETE): after a successful change, the cached public
 * pages are cleared so staff see their edits straight away instead of after the 60s cache window.
 */
export function withBust<A extends any[]>(handler: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    const res = await handler(...args);
    if (res.status < 400) {
      try { revalidateTag("public"); } catch { /* never block the response */ }
    }
    return res;
  };
}
