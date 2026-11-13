import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './auth-pages.css';
import './storefront-reference.css';
import './storefront-performance.css';
import './buyer-orders-redesign.css';
import './buyer-order-detail-redesign.css';
import './buyer-reports-redesign.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
