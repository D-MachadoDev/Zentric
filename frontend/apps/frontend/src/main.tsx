import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { GlobalErrorBoundary } from './app/components/GlobalErrorBoundary';
import { AppQueryClientProvider } from './app/providers/AppQueryClientProvider';
import { AuthProvider } from './app/providers/AuthProvider';
import { AppRouterProvider } from './app/routes/AppRouter';
import { AlertHost } from './components/alert/AlertHost';
import './styles/global.css';

// Punto de entrada determinista (C4-4-Codigo-React.md sección 1).
// Orden estricto de proveedores:
// 1. React.StrictMode (detección de efectos secundarios en React 19)
// 2. GlobalErrorBoundary (captura fallos de renderizado y reinicio limpio)
// 3. AppQueryClientProvider (TanStack Query v5 caché e interceptores)
// 4. AuthProvider (sesión en RAM sin refresh tokens según ADR-0009)
// 5. AppRouterProvider (TanStack Router con contexto inyectado)
// 6. AlertHost (cola accesible de toasts y modales de confirmación)
const container = document.getElementById('root');

if (!container) {
  // Sin #root no hay app que montar: falla explícito en vez de un blanco eterno.
  throw new Error('No se encontro el elemento #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <AppQueryClientProvider>
        <AuthProvider>
          <AppRouterProvider />
        </AuthProvider>
        <AlertHost />
      </AppQueryClientProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);
