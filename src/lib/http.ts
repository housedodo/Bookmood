export interface LookupOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

/** GET with a timeout. Returns null on any failure (network, timeout, bad status). */
async function get<T>(url: string, read: (response: Response) => Promise<T>, options: LookupOptions): Promise<T | null> {
  const { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await read(response);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** GET + JSON parse. Returns null on any failure (network, timeout, bad status, bad JSON). */
export function fetchJson(url: string, options: LookupOptions = {}): Promise<unknown> {
  return get(url, (response) => response.json() as Promise<unknown>, options);
}

/** GET as text. Returns null on any failure. */
export function fetchText(url: string, options: LookupOptions = {}): Promise<string | null> {
  return get(url, (response) => response.text(), options);
}
