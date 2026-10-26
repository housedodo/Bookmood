const builtAt = new Date(__BUILD_TIME__).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function SettingsPage() {
  return (
    <main className="page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">backups &amp; little things</p>
      <div className="placeholder">
        <p className="placeholder-text">Made with 💗 — all your data lives only on this device.</p>
        <p className="build-info">Version built {builtAt}</p>
      </div>
    </main>
  );
}
