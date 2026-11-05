import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { GlobalErrorBoundary } from './app/components/GlobalErrorBoundary';
import { AppQueryClientProvider } from './app/providers/AppQueryClientProvider';
import { AuthProvider } from './app/providers/AuthProvider';
import { AppRouterProvider } from './app/routes/AppRouter';
import { AlertHost } from './app/components/AlertHost';
import { ThemeProvider } from './app/providers/ThemeProvider';
import './styles/global.css';

// Punto de entrada de la aplicación.
// El orden de los proveedores es deliberado:
// 1. StrictMode: detecta posibles efectos secundarios durante el desarrollo.
// 2. GlobalErrorBoundary: si ocurre un fallo inesperado, muestra una pantalla de ayuda en vez de quedar en blanco.
// 3. AppQueryClientProvider: administra la memoria caché y peticiones hacia el servidor.
// 4. AuthProvider: protege la sesión manteniéndola en memoria RAM por seguridad.
// 5. ThemeProvider: recuerda la preferencia visual (modo claro u oscuro).
// 6. AppRouterProvider: muestra las pantallas permitidas según el rol del usuario.
// 7. AlertHost: ventana global para notificaciones y avisos importantes.
const container = document.getElementById('root');

if (!container) {
  // Sin el contenedor principal no podemos montar la app: avisamos con un error claro para resolverlo rápido.
  throw new Error('No se encontro el elemento #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <AppQueryClientProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppRouterProvider />
          </ThemeProvider>
        </AuthProvider>
        <AlertHost />
      </AppQueryClientProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);
