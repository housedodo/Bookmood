// Small per-device preferences (which library view, how the bookcase is arranged).
// localStorage can be blocked (private mode), so reads fall back and writes are best effort.

export function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(`shelfscan:${key}`);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(`shelfscan:${key}`, value);
  } catch {
    // not saved; the default comes back next time
  }
}
