import { useState } from 'react';
import { promptInstall, useCanInstall } from '../lib/install';
import { isInstalledApp, isIos } from '../lib/safety';

/** Settings card: install button on Android, short instructions where there's no button. */
export default function InstallApp() {
  const canInstall = useCanInstall();
  const [installed, setInstalled] = useState(isInstalledApp);

  if (installed) {
    return <p>ShelfScan is installed on this phone ✓</p>;
  }
  if (canInstall) {
    return (
      <>
        <p>Put ShelfScan on your home screen: it opens full-screen like a normal app and works offline.</p>
        <button type="button" className="btn" onClick={async () => setInstalled(await promptInstall())}>
          Install ShelfScan
        </button>
      </>
    );
  }
  if (isIos()) {
    return <p>In Safari, tap the Share button, then <strong>Add to Home Screen</strong>.</p>;
  }
  return (
    <p>
      In <strong>Chrome</strong>: menu ⋮ → <strong>Install app</strong> (or <strong>Add to Home screen</strong>). In{' '}
      <strong>Samsung Internet</strong>: menu ☰ → <strong>Add page to</strong> → <strong>Home screen</strong>.
    </p>
  );
}
