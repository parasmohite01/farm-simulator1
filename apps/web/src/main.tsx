import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { I18nProvider } from './i18n/index.js';
import { App } from './ui/App.js';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
