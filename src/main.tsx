import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFrontendFetchInterceptor } from './utils/fetchMiddleware';

// Ativa o middleware de validação prévia de datas e finanças no frontend de forma segura
try {
  initFrontendFetchInterceptor();
} catch (err) {
  console.warn('[BOMProjeto] Inicialização segura do interceptor:', err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
