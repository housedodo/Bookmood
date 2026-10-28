import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/quicksand/400.css';
import '@fontsource/quicksand/500.css';
import '@fontsource/quicksand/700.css';
import '@fontsource/caveat/600.css';
import './styles/theme.css';
import App from './App';
import { captureInstallPrompt } from './lib/install';
import { requestPersistentStorage } from './lib/safety';

// Ask the browser not to clear the library to free up space (no popup on iPhone or Chrome).
void requestPersistentStorage();
captureInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
