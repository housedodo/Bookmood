import { useState } from 'react';
import { promptInstall, useCanInstall } from '../lib/install';
import { readPref, writePref } from '../lib/prefs';

/** One quiet line on the Shelf page while the app can be installed (Android). Dismissable for good. */
export default function InstallHint() {
  const canInstall = useCanInstall();
  const [dismissed, setDismissed] = useState(() => readPref('installHint', ['shown', 'dismissed'], 'shown') === 'dismissed');
  if (!canInstall || dismissed) return null;

  const dismiss = () => {
    writePref('installHint', 'dismissed');
    setDismissed(true);
  };

  return (
    <p className="backup-line" role="status">
      <span>Get ShelfScan on your home screen ·</span>
      <button type="button" className="link-button" onClick={() => void promptInstall()}>Install</button>
      <button type="button" className="backup-line-dismiss" aria-label="Don't show again" onClick={dismiss}>×</button>
    </p>
  );
}
