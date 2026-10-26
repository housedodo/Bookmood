import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import TabBar from './components/TabBar';
import LibraryPage from './pages/LibraryPage';
import PickPage from './pages/PickPage';
import SettingsPage from './pages/SettingsPage';

// The scanner pulls in ZXing (~400 kB), so it loads only when the Scan tab is opened.
const ScanPage = lazy(() => import('./pages/ScanPage'));

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<main className="page" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/pick" element={<PickPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
      <TabBar />
    </HashRouter>
  );
}
