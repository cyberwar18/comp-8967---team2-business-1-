import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { LangProvider } from './app/i18n';
// Pitch redesign: fonts are bundled with the app (no Google Fonts call), so the demo works offline.
import '@fontsource-variable/public-sans';
import '@fontsource-variable/familjen-grotesk';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
);
