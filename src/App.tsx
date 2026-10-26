import { HashRouter, Route, Routes } from 'react-router-dom';
import TabBar from './components/TabBar';
import LibraryPage from './pages/LibraryPage';
import PickPage from './pages/PickPage';
import ScanPage from './pages/ScanPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/pick" element={<PickPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <TabBar />
    </HashRouter>
  );
}
