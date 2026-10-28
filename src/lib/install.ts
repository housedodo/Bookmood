import { useSyncExternalStore } from 'react';

// Android browsers (Chrome, Edge, Samsung Internet) fire `beforeinstallprompt` when the app can be
// installed. We keep that event so an "Install app" button can open the real install dialog later.
// iPhone Safari never fires it; there the user installs via Share → Add to Home Screen.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Call once at start-up, before React renders, so the early event isn't missed. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own button instead of the browser's mini bar
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Opens the browser's install dialog. Resolves true if the user installed the app. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // a prompt can only be used once
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}

/** True while the browser lets us show its install dialog. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => deferred !== null,
    () => false,
  );
}
